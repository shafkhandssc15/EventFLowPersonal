using System.Text;
using System.Text.Json;
using EventManagement.Api.Data;
using EventManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Api.Controllers;

// Agentic AI Subsystem — orchestrated by the internal Python agent service.
// ASP.NET Core is the ONLY caller of the agent service (React/Flutter never call it directly).
[ApiController]
[Route("api/agent-workflows")]
public class AgentWorkflowController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpFactory;

    public AgentWorkflowController(AppDbContext db, IHttpClientFactory httpFactory)
    {
        _db = db;
        _httpFactory = httpFactory;
    }

    public record StartWorkflowRequest(Guid OrganizerId, string Objective, int Capacity, decimal Budget, DateTimeOffset EventDate, string? Location);

    // Kicks off the Planner Agent -> Domain Analysis -> Action -> Validation chain (Section 6 flow)
    [HttpPost]
    public async Task<ActionResult> Start(StartWorkflowRequest req)
    {
        var workflow = new AgentWorkflow
        {
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

        var response = await client.PostAsync("/workflow/run",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

        var resultJson = await response.Content.ReadAsStringAsync();

        workflow.PlanJson = resultJson;
        workflow.Status = resultJson.Contains("\"paused_for_approval\":true")
            ? WorkflowStatus.PausedForApproval
            : WorkflowStatus.Completed;
        workflow.ApprovalStatus = workflow.Status == WorkflowStatus.PausedForApproval
            ? ApprovalStatus.Pending
            : ApprovalStatus.NotRequired;
        workflow.CompletedAt = workflow.Status == WorkflowStatus.Completed ? DateTimeOffset.UtcNow : null;

        await _db.SaveChangesAsync();

        return Ok(new { workflow.Id, workflow.Status, plan = resultJson });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(Guid id)
    {
        var w = await _db.AgentWorkflows.Include(x => x.Logs).FirstOrDefaultAsync(x => x.Id == id);
        return w is null ? NotFound() : Ok(w);
    }

    // Organizer approves/rejects a paused high-impact action (Agent 4's gate)
    [HttpPost("{id}/approve")]
    public async Task<ActionResult> Approve(Guid id, [FromQuery] bool approve)
    {
        var w = await _db.AgentWorkflows.FindAsync(id);
        if (w is null) return NotFound();
        if (w.Status != WorkflowStatus.PausedForApproval) return BadRequest("Workflow is not awaiting approval");

        w.ApprovalStatus = approve ? ApprovalStatus.Approved : ApprovalStatus.Rejected;

        var client = _httpFactory.CreateClient("AgentService");
        var payload = new { workflow_id = w.Id, approved = approve };
        var response = await client.PostAsync("/workflow/resume",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));
        var resultJson = await response.Content.ReadAsStringAsync();

        w.PlanJson = resultJson;
        w.Status = approve ? WorkflowStatus.Completed : WorkflowStatus.Failed;
        w.CompletedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { w.Id, w.Status, result = resultJson });
    }

    [HttpGet("{id}/logs")]
    public async Task<ActionResult> Logs(Guid id)
        => Ok(await _db.AgentExecutionLogs.Where(l => l.WorkflowId == id).OrderBy(l => l.Timestamp).ToListAsync());
}
