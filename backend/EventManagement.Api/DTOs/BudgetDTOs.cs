namespace EventManagement.Api.DTOs;

// ---- Student 4: Budget & Payments ----


public record CreateBudgetRequest(
    Guid EventId,
    decimal TotalBudget
);

public record CreateExpenseRequest(
    Guid BudgetId,
    string Category,
    decimal Amount
);

public record UpdateExpenseStatusRequest(string Status);

public record DecideApprovalRequest(bool Approve, string? Reason);

public record BudgetSummaryResponse(
    Guid Id,
    Guid? EventId,
    decimal TotalBudget,
    decimal TotalSpent,
    decimal Remaining,
    List<ExpenseResponse> Expenses
);

public record ExpenseResponse(
    Guid Id,
    string Category,
    decimal Amount,
    string Status,
    DateTimeOffset CreatedAt
);

public record ApprovalRequestResponse(
    Guid Id,
    Guid? ExpenseId,
    Guid? VendorBookingId,
    string Status,
    string? Reason,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ResolvedAt
);
