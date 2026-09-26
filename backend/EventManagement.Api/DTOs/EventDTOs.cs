namespace EventManagement.Api.DTOs;

// ---- Student 1: Event Creation & Ticketing ----

public record CreateEventRequest(
    Guid OrganizerId,
    string Title,
    string? Description,
    string? Category,
    DateTimeOffset StartDate,
    DateTimeOffset EndDate,
    string? Location,
    int Capacity
);

public record UpdateEventStatusRequest(string Status);

public record CreateTicketTypeRequest(
    string Name,
    decimal Price,
    int Quantity
);

public record PurchaseTicketRequest(
    Guid AttendeeId
);

public record EventResponse(
    Guid Id,
    string Title,
    string? Description,
    string? Category,
    string? Location,
    int Capacity,
    string Status,
    DateTimeOffset StartDate,
    DateTimeOffset EndDate,
    DateTimeOffset CreatedAt,
    List<TicketTypeResponse> TicketTypes
);

public record TicketTypeResponse(
    Guid Id,
    string Name,
    decimal Price,
    int Quantity,
    int Sold,
    int Available,
    bool IsSoldOut
);

public record TicketResponse(
    Guid Id,
    Guid TicketTypeId,
    Guid AttendeeId,
    string QrCode,
    DateTimeOffset CreatedAt
);

public record SalesReportResponse(
    Guid EventId,
    string Title,
    int TotalTicketsSold,
    decimal TotalRevenue,
    List<TicketTypeSalesRow> ByType
);

public record TicketTypeSalesRow(
    string Name,
    int Sold,
    int Available,
    decimal Revenue
);
