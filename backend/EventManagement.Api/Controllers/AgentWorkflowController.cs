using System.Text;
using System.Text.Json;
using EventManagement.Api.Data;
using EventManagement.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Api.Controllers;

// Agentic AI Subsystem — orchestrated by the internal Python agent service.
// ASP.NET Core is the ONLY caller of the agent service (React/Flutter never call it directly).
// This controller also turns the agents' final decision into real, durable rows
// (Event/VendorBooking/Expense) — not just a JSON blob — so the workflow's result
// is auditable the same way every other business operation in this API is.
[ApiController]
[Route("api/agent-workflows")]
[Authorize(Roles = "Organizer,Admin")]
public class AgentWorkflowController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpFactory;

    public AgentWorkflowController(AppDbContext db, IHttpClientFactory httpFactory)
    {
        _db = db;
        _httpFactory = httpFactory;
    }

    public record StartWorkflowRequest(string Objective, int Capacity, decimal Budget, DateTimeOffset EventDate, string? Location);

    // Kicks off the Planner Agent -> Domain Analysis -> Action -> Validation chain (Section 6 flow).
    // Creates a real Draft Event + Budget up front so the agents' output has something concrete to attach to.
    [HttpPost]
    public async Task<ActionResult> Start(StartWorkflowRequest req)
    {
        var organizerId = this.GetUserId();

        var budget = new Budget { TotalBudget = req.Budget };
        _db.Budgets.Add(budget);

        var ev = new Event
        {
            OrganizerId = organizerId,
            Title = req.Objective.Length > 120 ? req.Objective[..120] : req.Objective,
            Description = $"Draft created by the Agentic AI planning workflow. Objective: {req.Objective}",
            Location = req.Location,
            Capacity = req.Capacity,
            Status = EventStatus.Draft,
            StartDate = req.EventDate,
            EndDate = req.EventDate.AddHours(4),
        };
        _db.Events.Add(ev);
        await _db.SaveChangesAsync();

        ev.BudgetId = budget.Id;
        await _db.SaveChangesAsync();

        var workflow = new AgentWorkflow
        {
            EventId = ev.Id,
            Objective = req.Objective,
            Status = WorkflowStatus.Running,
            CurrentStep = "planning"
        };
        _db.AgentWorkflows.Add(workflow);
        await _db.SaveChangesAsync();

        var client = _httpFactory.CreateClient("AgentService");
        var payload = new
        {
            workflow_id = workflow.Id,
            objective = req.Objective,
            capacity = req.Capacity,
            budget = req.Budget,
            event_date = req.EventDate,
            location = req.Location
        };

        string resultJson;
        try
        {
            var response = await client.PostAsync("/workflow/run",
                new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));
            resultJson = await response.Content.ReadAsStringAsync();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            // Safe failure: the agent service is unreachable. Record it, don't crash.
            workflow.Status = WorkflowStatus.Failed;
            workflow.CurrentStep = "agent_service_unreachable";
            await _db.SaveChangesAsync();
            return StatusCode(502, new { message = "Agentic AI service is unavailable.", workflow.Id, workflow.Status });
        }

        using var doc = JsonDocument.Parse(resultJson);
        var root = doc.RootElement;
        var pausedForApproval = root.TryGetProperty("paused_for_approval", out var pfa) && pfa.ValueKind == JsonValueKind.True;
        var statusStr = root.TryGetProperty("status", out var st) ? st.GetString() : null;

        workflow.PlanJson = resultJson;
        workflow.CurrentStep = pausedForApproval ? "awaiting_approval" : statusStr ?? "completed";
        workflow.Status = pausedForApproval
            ? WorkflowStatus.PausedForApproval
            : statusStr == "failed" ? WorkflowStatus.Failed : WorkflowStatus.Completed;
        workflow.ApprovalStatus = pausedForApproval ? ApprovalStatus.Pending : ApprovalStatus.NotRequired;
        workflow.CompletedAt = workflow.Status == WorkflowStatus.Completed ? DateTimeOffset.UtcNow : null;

        await PersistNewLogsAsync(workflow.Id, root);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            workflow.Id,
            EventId = ev.Id,
            workflow.Status,
            plan = JsonSerializer.Deserialize<object>(resultJson)
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(Guid id)
    {
        var w = await _db.AgentWorkflows.Include(x => x.Logs).FirstOrDefaultAsync(x => x.Id == id);
        return w is null ? NotFound() : Ok(w);
    }

    [HttpGet]
    public async Task<ActionResult> Mine()
        => Ok(await _db.AgentWorkflows.OrderByDescending(w => w.CreatedAt).Take(50).ToListAsync());

    // Organizer approves/rejects a paused high-impact action (Validation Agent's gate).
    // On approval, turns the agents' proposed booking into a real VendorBooking + Expense row.
    [HttpPost("{id}/approve")]
    public async Task<ActionResult> Approve(Guid id, [FromQuery] bool approve)
    {
        var w = await _db.AgentWorkflows.FindAsync(id);
        if (w is null) return NotFound();
        if (w.Status != WorkflowStatus.PausedForApproval) return BadRequest("Workflow is not awaiting approval");

        w.ApprovalStatus = approve ? ApprovalStatus.Approved : ApprovalStatus.Rejected;

        var client = _httpFactory.CreateClient("AgentService");
        // Pass the durable state we already persisted back to the agent service —
        // it may have restarted and lost its in-memory dict since /workflow/run.
        var priorState = string.IsNullOrEmpty(w.PlanJson) ? null : JsonSerializer.Deserialize<object>(w.PlanJson);
        var payload = new { workflow_id = w.Id, approved = approve, prior_state = priorState };

        string resultJson;
        try
        {
            var response = await client.PostAsync("/workflow/resume",
                new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));
            resultJson = await response.Content.ReadAsStringAsync();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return StatusCode(502, new { message = "Agentic AI service is unavailable.", w.Id, w.Status });
        }

        using var doc = JsonDocument.Parse(resultJson);
        var root = doc.RootElement;

        w.PlanJson = resultJson;
        w.Status = approve ? WorkflowStatus.Completed : WorkflowStatus.Failed;
        w.CurrentStep = approve ? "completed" : "rejected";
        w.CompletedAt = DateTimeOffset.UtcNow;

        await PersistNewLogsAsync(w.Id, root);

        // Deterministic validation before writing anything: the booking must contain
        // a real venue id and a numeric cost, otherwise this is treated as a safe failure.
        if (approve && root.TryGetProperty("booking", out var booking) &&
            booking.TryGetProperty("venue_id", out var venueIdEl) &&
            Guid.TryParse(venueIdEl.GetString(), out var venueId) &&
            booking.TryGetProperty("cost", out var costEl) && costEl.TryGetDecimal(out var cost))
        {
            Guid? vendorId = booking.TryGetProperty("vendor_id", out var vendorIdEl) &&
                              Guid.TryParse(vendorIdEl.GetString(), out var parsedVendorId)
                ? parsedVendorId
                : null;

            _db.VendorBookings.Add(new VendorBooking
            {
                EventId = w.EventId ?? Guid.Empty,
                VenueId = venueId,
                VendorId = vendorId,
                Cost = cost,
                Status = BookingStatus.Confirmed
            });

            var ev = w.EventId.HasValue ? await _db.Events.FindAsync(w.EventId.Value) : null;
            if (ev?.BudgetId != null)
            {
                _db.Expenses.Add(new Expense
                {
                    BudgetId = ev.BudgetId.Value,
                    Category = "Agentic AI — Venue & Vendor Booking",
                    Amount = cost,
                    Status = ExpenseStatus.Approved,
                    ApprovedBy = this.GetUserId()
                });
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { w.Id, w.Status, result = JsonSerializer.Deserialize<object>(resultJson) });
    }

    [HttpGet("{id}/logs")]
    public async Task<ActionResult> Logs(Guid id)
        => Ok(await _db.AgentExecutionLogs.Where(l => l.WorkflowId == id).OrderBy(l => l.Timestamp).ToListAsync());

    // Deserializes the agents' "logs" array and persists any entries not already stored,
    // so re-running /run or /resume never creates duplicate audit rows.
    private async Task PersistNewLogsAsync(Guid workflowId, JsonElement root)
    {
        if (!root.TryGetProperty("logs", out var logsEl) || logsEl.ValueKind != JsonValueKind.Array) return;

        var existingIds = await _db.AgentExecutionLogs
            .Where(l => l.WorkflowId == workflowId)
            .Select(l => l.Id)
            .ToListAsync();
        var existing = new HashSet<Guid>(existingIds);

        foreach (var entry in logsEl.EnumerateArray())
        {
            var idStr = entry.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
            if (!Guid.TryParse(idStr, out var logId) || existing.Contains(logId)) continue;

            _db.AgentExecutionLogs.Add(new AgentExecutionLog
            {
                Id = logId,
                WorkflowId = workflowId,
                AgentName = entry.TryGetProperty("agent_name", out var an) ? an.GetString() ?? "Unknown" : "Unknown",
                Action = "execute",
                InputJson = entry.TryGetProperty("input", out var inp) ? inp.GetRawText() : null,
                OutputJson = entry.TryGetProperty("output", out var outp) ? outp.GetRawText() : null,
                ToolCallsJson = entry.TryGetProperty("tool_calls", out var tc) ? tc.GetRawText() : null,
                Timestamp = entry.TryGetProperty("timestamp", out var ts) && DateTimeOffset.TryParse(ts.GetString(), out var parsedTs)
                    ? parsedTs
                    : DateTimeOffset.UtcNow
            });
        }
    }
}
