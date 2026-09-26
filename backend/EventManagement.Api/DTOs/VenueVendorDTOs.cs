namespace EventManagement.Api.DTOs;

// ---- Student 2: Venue & Vendor Booking ----

public record CreateVenueRequest(
    Guid OwnerId,
    string Name,
    string? Location,
    int Capacity,
    decimal PricePerHour
);

public record CreateVendorRequest(
    Guid OwnerId,
    string Name,
    string? ServiceType,
    decimal PricePerService
);

public record CreateVendorBookingRequest(
    Guid EventId,
    Guid? VenueId,
    Guid? VendorId,
    decimal Cost
);

public record UpdateBookingStatusRequest(string Status);

public record VenueResponse(
    Guid Id,
    string Name,
    string? Location,
    int Capacity,
    decimal PricePerHour,
    bool IsActive,
    DateTimeOffset CreatedAt
);

public record VendorResponse(
    Guid Id,
    string Name,
    string? ServiceType,
    decimal PricePerService,
    bool IsActive,
    DateTimeOffset CreatedAt
);

public record VendorBookingResponse(
    Guid Id,
    Guid EventId,
    Guid? VenueId,
    string? VenueName,
    Guid? VendorId,
    string? VendorName,
    string Status,
    decimal Cost,
    DateTimeOffset CreatedAt
);
