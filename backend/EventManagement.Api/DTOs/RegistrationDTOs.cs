namespace EventManagement.Api.DTOs;

// ---- Student 3: Attendee Registration & Check-in ----

public record CreateRegistrationRequest(
    Guid EventId,
    Guid AttendeeId,
    Guid TicketTypeId
);

public record CheckInRequest(
    string QrCode
);


public record RegistrationResponse(
    Guid Id,
    Guid EventId,
    Guid AttendeeId,
    Guid? TicketId,
    string Status,
    DateTimeOffset CreatedAt
);


public record CheckInResponse(
    Guid CheckInId,
    Guid RegistrationId,
    DateTimeOffset CheckedInAt,
    string Method
);
