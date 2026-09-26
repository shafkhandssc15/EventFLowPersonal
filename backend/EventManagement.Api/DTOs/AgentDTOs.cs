namespace EventManagement.Api.DTOs;

// ---- Agentic AI Workflow ----

public record StartWorkflowRequest(
    Guid OrganizerId,
    string Objective,
    int Capacity,
    decimal Budget,
    DateTimeOffset EventDate,
    string? Location
);

public record ApproveWorkflowRequest(bool Approve);

public record WorkflowResponse(
    Guid Id,
    string Status,
    string? Plan,
    bool PausedForApproval,
    string ApprovalStatus,
    DateTimeOffset CreatedAt,
    DateTimeOffset? CompletedAt,
    List<AgentLogResponse> Logs
);

public record AgentLogResponse(
    Guid Id,
    string AgentName,
    string Action,
    object? Input,
    object? Output,
    List<string>? ToolCalls,
    DateTimeOffset Timestamp
);
