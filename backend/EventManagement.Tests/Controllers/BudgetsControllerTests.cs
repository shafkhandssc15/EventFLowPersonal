using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EventManagement.Api.Controllers;
using EventManagement.Api.Models;
using EventManagement.Tests.Common;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EventManagement.Tests.Controllers;

public class BudgetsControllerTests
{
    // =========================================================================
    // BudgetsController Tests
    // =========================================================================

    [Fact]
    public async Task Budgets_Create_LinksBudgetToEventSuccessfully()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new BudgetsController(db);
        var ev = new Event { Title = "Gala Night" };
        db.Events.Add(ev);
        await db.SaveChangesAsync();

        var req = new BudgetsController.CreateBudgetRequest(ev.Id, 250000m);

        var result = await controller.Create(req);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var budget = Assert.IsType<Budget>(created.Value);
        Assert.Equal(250000m, budget.TotalBudget);

        var updatedEvent = await db.Events.FindAsync(ev.Id);
        Assert.Equal(budget.Id, updatedEvent!.BudgetId);
    }

    [Fact]
    public async Task Budgets_Summary_CalculatesSpentPendingAndRemainingAccurately()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new BudgetsController(db);
        var budget = new Budget { TotalBudget = 100000m };
        db.Budgets.Add(budget);

        db.Expenses.AddRange(
            new Expense { BudgetId = budget.Id, Category = "Catering", Amount = 30000m, Status = ExpenseStatus.Approved },
            new Expense { BudgetId = budget.Id, Category = "Venue", Amount = 20000m, Status = ExpenseStatus.Paid },
            new Expense { BudgetId = budget.Id, Category = "AV", Amount = 15000m, Status = ExpenseStatus.Pending },
            new Expense { BudgetId = budget.Id, Category = "Decor", Amount = 5000m, Status = ExpenseStatus.Rejected }
        );
        await db.SaveChangesAsync();

        var result = await controller.Summary(budget.Id);

        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic? summary = okResult.Value;
        Assert.NotNull(summary);

        decimal spent = (decimal)summary.GetType().GetProperty("Spent")!.GetValue(summary)!;
        decimal pending = (decimal)summary.GetType().GetProperty("Pending")!.GetValue(summary)!;
        decimal remaining = (decimal)summary.GetType().GetProperty("Remaining")!.GetValue(summary)!;

        // Spent = Approved(30k) + Paid(20k) = 50k
        // Pending = 15k
        // Remaining = 100k - 50k = 50k
        Assert.Equal(50000m, spent);
        Assert.Equal(15000m, pending);
        Assert.Equal(50000m, remaining);
    }

    // =========================================================================
    // ExpensesController Tests
    // =========================================================================

    [Fact]
    public async Task Expenses_Create_UnderThreshold_AutoApprovesExpense()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new ExpensesController(db);
        var budgetId = Guid.NewGuid();
        var req = new ExpensesController.CreateExpenseRequest(budgetId, "Stationery", 450m);

        var result = await controller.Create(req);

        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic? body = okResult.Value;
        Assert.NotNull(body);
        bool requiresApproval = (bool)body.GetType().GetProperty("requiresApproval")!.GetValue(body)!;
        Expense expense = (Expense)body.GetType().GetProperty("expense")!.GetValue(body)!;

        Assert.False(requiresApproval);
        Assert.Equal(ExpenseStatus.Approved, expense.Status);
    }

    [Fact]
    public async Task Expenses_Create_AboveThreshold_TriggersApprovalWorkflow()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new ExpensesController(db);
        var budgetId = Guid.NewGuid();
        var req = new ExpensesController.CreateExpenseRequest(budgetId, "Lighting System", 2500m);

        var result = await controller.Create(req);

        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic? body = okResult.Value;
        Assert.NotNull(body);
        bool requiresApproval = (bool)body.GetType().GetProperty("requiresApproval")!.GetValue(body)!;
        Expense expense = (Expense)body.GetType().GetProperty("expense")!.GetValue(body)!;
        ApprovalRequest approval = (ApprovalRequest)body.GetType().GetProperty("approval")!.GetValue(body)!;

        Assert.True(requiresApproval);
        Assert.Equal(ExpenseStatus.Pending, expense.Status);
        Assert.Equal(EventManagement.Api.Models.ApprovalStatus.Pending, approval.Status);
        Assert.Equal(expense.Id, approval.ExpenseId);
    }

    [Fact]
    public async Task Expenses_Approve_And_Reject_UpdatesStatusCorrectly()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new ExpensesController(db);
        var approverId = Guid.NewGuid();

        var exp1 = new Expense { Category = "AV Equipment", Amount = 1200m, Status = ExpenseStatus.Pending };
        var exp2 = new Expense { Category = "Catering Extra", Amount = 1800m, Status = ExpenseStatus.Pending };
        db.Expenses.AddRange(exp1, exp2);
        await db.SaveChangesAsync();

        // 1. Approve
        var appRes = await controller.Approve(exp1.Id, approverId);
        var okApp = Assert.IsType<OkObjectResult>(appRes);
        var approvedExp = Assert.IsType<Expense>(okApp.Value);
        Assert.Equal(ExpenseStatus.Approved, approvedExp.Status);
        Assert.Equal(approverId, approvedExp.ApprovedBy);

        // 2. Reject
        var rejRes = await controller.Reject(exp2.Id);
        var okRej = Assert.IsType<OkObjectResult>(rejRes);
        var rejectedExp = Assert.IsType<Expense>(okRej.Value);
        Assert.Equal(ExpenseStatus.Rejected, rejectedExp.Status);
    }

    [Fact]
    public async Task Expenses_Void_OnlyPendingAllowed()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new ExpensesController(db);
        var pendingExp = new Expense { Category = "Supplies", Amount = 500m, Status = ExpenseStatus.Pending };
        var approvedExp = new Expense { Category = "Supplies", Amount = 500m, Status = ExpenseStatus.Approved };
        db.Expenses.AddRange(pendingExp, approvedExp);
        await db.SaveChangesAsync();

        // Voiding approved expense returns BadRequest
        var badRes = await controller.Void(approvedExp.Id);
        Assert.IsType<BadRequestObjectResult>(badRes);

        // Voiding pending expense returns NoContent and removes record
        var goodRes = await controller.Void(pendingExp.Id);
        Assert.IsType<NoContentResult>(goodRes);
        Assert.Null(await db.Expenses.FindAsync(pendingExp.Id));
    }

    // =========================================================================
    // ApprovalsController Tests
    // =========================================================================

    [Fact]
    public async Task Approvals_Decide_CascadesStatusToAssociatedExpense()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new ApprovalsController(db);

        var expense = new Expense { Category = "Decorations", Amount = 3000m, Status = ExpenseStatus.Pending };
        db.Expenses.Add(expense);
        var approval = new ApprovalRequest
        {
            ExpenseId = expense.Id,
            Status = EventManagement.Api.Models.ApprovalStatus.Pending,
            Reason = "Exceeds auto-approval"
        };
        db.ApprovalRequests.Add(approval);
        await db.SaveChangesAsync();

        // Organizer decides: Approve
        var result = await controller.Decide(approval.Id, approve: true);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var decided = Assert.IsType<ApprovalRequest>(okResult.Value);
        Assert.Equal(EventManagement.Api.Models.ApprovalStatus.Approved, decided.Status);

        var updatedExpense = await db.Expenses.FindAsync(expense.Id);
        Assert.Equal(ExpenseStatus.Approved, updatedExpense!.Status);
    }
}
