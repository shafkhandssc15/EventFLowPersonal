using EventManagement.Api.Data;
using EventManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Api.Controllers;

// Student 4 — Budget & Payments
[ApiController]
[Route("api/budgets")]
public class BudgetsController : ControllerBase
{
    private readonly AppDbContext _db;
    public BudgetsController(AppDbContext db) => _db = db;

    public record CreateBudgetRequest(Guid EventId, decimal TotalBudget);

    [HttpPost]
    public async Task<ActionResult<Budget>> Create(CreateBudgetRequest req)
    {
        var budget = new Budget { EventId = req.EventId, TotalBudget = req.TotalBudget };
        _db.Budgets.Add(budget);
        await _db.SaveChangesAsync();

        var ev = await _db.Events.FindAsync(req.EventId);
        if (ev != null) { ev.BudgetId = budget.Id; await _db.SaveChangesAsync(); }

        return CreatedAtAction(nameof(GetById), new { id = budget.Id }, budget);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Budget>> GetById(Guid id)
    {
        var b = await _db.Budgets.Include(x => x.Expenses).FirstOrDefaultAsync(x => x.Id == id);
        return b is null ? NotFound() : Ok(b);
    }

    // READ — budget vs actual spend
    [HttpGet("{id}/summary")]
    public async Task<ActionResult> Summary(Guid id)
    {
        var b = await _db.Budgets.Include(x => x.Expenses).FirstOrDefaultAsync(x => x.Id == id);
        if (b is null) return NotFound();

        var spent = b.Expenses.Where(e => e.Status is ExpenseStatus.Approved or ExpenseStatus.Paid).Sum(e => e.Amount);
        var pending = b.Expenses.Where(e => e.Status == ExpenseStatus.Pending).Sum(e => e.Amount);

        return Ok(new
        {
            b.TotalBudget,
            Spent = spent,
            Pending = pending,
            Remaining = b.TotalBudget - spent,
            ByCategory = b.Expenses.GroupBy(e => e.Category)
                .Select(g => new { Category = g.Key, Total = g.Sum(e => e.Amount) })
        });
    }

    // UPDATE — adjust budget allocation
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromQuery] decimal totalBudget)
    {
        var b = await _db.Budgets.FindAsync(id);
        if (b is null) return NotFound();
        b.TotalBudget = totalBudget;
        b.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(b);
    }
}

[ApiController]
[Route("api/expenses")]
public class ExpensesController : ControllerBase
{
    private readonly AppDbContext _db;
    private const decimal AutoApproveThreshold = 1000m; // business rule: Section 5, Agent 4

    public ExpensesController(AppDbContext db) => _db = db;

    public record CreateExpenseRequest(Guid BudgetId, string Category, decimal Amount);

    // CREATE — logs expense; auto-flags above threshold for approval
    [HttpPost]
    public async Task<ActionResult> Create(CreateExpenseRequest req)
    {
        var expense = new Expense
        {
            BudgetId = req.BudgetId, Category = req.Category, Amount = req.Amount,
            Status = ExpenseStatus.Pending
        };
        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync();

        if (req.Amount > AutoApproveThreshold)
        {
            var approval = new ApprovalRequest
            {
                ExpenseId = expense.Id,
                Status = Models.ApprovalStatus.Pending,
                Reason = $"Amount {req.Amount:C} exceeds auto-approve threshold {AutoApproveThreshold:C}"
            };
            _db.ApprovalRequests.Add(approval);
            await _db.SaveChangesAsync();
            return Ok(new { expense, requiresApproval = true, approval });
        }

        expense.Status = ExpenseStatus.Approved;
        await _db.SaveChangesAsync();
        return Ok(new { expense, requiresApproval = false });
    }

    [HttpGet]
    public async Task<ActionResult> List([FromQuery] string? category, [FromQuery] ExpenseStatus? status, [FromQuery] string sortBy = "date")
    {
        var query = _db.Expenses.AsQueryable();
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(e => e.Category == category);
        if (status.HasValue) query = query.Where(e => e.Status == status);
        query = sortBy == "amount" ? query.OrderByDescending(e => e.Amount) : query.OrderByDescending(e => e.CreatedAt);
        return Ok(await query.ToListAsync());
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromQuery] Guid approvedBy)
    {
        var e = await _db.Expenses.FindAsync(id);
        if (e is null) return NotFound();
        e.Status = ExpenseStatus.Approved;
        e.ApprovedBy = approvedBy;
        e.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(e);
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(Guid id)
    {
        var e = await _db.Expenses.FindAsync(id);
        if (e is null) return NotFound();
        e.Status = ExpenseStatus.Rejected;
        e.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(e);
    }

    // DELETE — void a pending expense
    [HttpDelete("{id}")]
    public async Task<IActionResult> Void(Guid id)
    {
        var e = await _db.Expenses.FindAsync(id);
        if (e is null) return NotFound();
        if (e.Status != ExpenseStatus.Pending) return BadRequest("Only pending expenses can be voided");
        _db.Expenses.Remove(e);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/approvals")]
public class ApprovalsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ApprovalsController(AppDbContext db) => _db = db;

    // READ — approval queue for organizer
    [HttpGet("queue")]
    public async Task<ActionResult> Queue()
        => Ok(await _db.ApprovalRequests.Where(a => a.Status == Models.ApprovalStatus.Pending).ToListAsync());

    [HttpPost("{id}/decide")]
    public async Task<IActionResult> Decide(Guid id, [FromQuery] bool approve)
    {
        var approval = await _db.ApprovalRequests.FindAsync(id);
        if (approval is null) return NotFound();

        approval.Status = approve ? Models.ApprovalStatus.Approved : Models.ApprovalStatus.Rejected;
        approval.ResolvedAt = DateTimeOffset.UtcNow;

        if (approval.ExpenseId.HasValue)
        {
            var expense = await _db.Expenses.FindAsync(approval.ExpenseId);
            if (expense != null) expense.Status = approve ? ExpenseStatus.Approved : ExpenseStatus.Rejected;
        }
        if (approval.VendorBookingId.HasValue)
        {
            var booking = await _db.VendorBookings.FindAsync(approval.VendorBookingId);
            if (booking != null) booking.Status = approve ? BookingStatus.Confirmed : BookingStatus.Rejected;
        }

        await _db.SaveChangesAsync();
        return Ok(approval);
    }
}
