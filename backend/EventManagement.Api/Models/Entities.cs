namespace EventManagement.Api.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public UserRole Role { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

// ---- Student 1: Event Creation & Ticketing ----
public class Event
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizerId { get; set; }
    public User? Organizer { get; set; }
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public DateTimeOffset StartDate { get; set; }
    public DateTimeOffset EndDate { get; set; }
    public string? Location { get; set; }
    public int Capacity { get; set; }
    public EventStatus Status { get; set; } = EventStatus.Draft;
    public Guid? BudgetId { get; set; }
    public Budget? Budget { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<TicketType> TicketTypes { get; set; } = new();
    public List<VendorBooking> VendorBookings { get; set; } = new();
}

public class TicketType
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EventId { get; set; }
    public Event? Event { get; set; }
    public string Name { get; set; } = default!;
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public int Sold { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class Ticket
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TicketTypeId { get; set; }
    public TicketType? TicketType { get; set; }
    public Guid AttendeeId { get; set; }
    public User? Attendee { get; set; }
    public string QrCode { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class WaitlistEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TicketTypeId { get; set; }
    public TicketType? TicketType { get; set; }
    public Guid AttendeeId { get; set; }
    public User? Attendee { get; set; }
    public WaitlistStatus Status { get; set; } = WaitlistStatus.Waiting;
    public int Position { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? NotifiedAt { get; set; }
}

// ---- Student 2: Venue & Vendor Booking ----
public class Venue
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OwnerId { get; set; }
    public string Name { get; set; } = default!;
    public string? Location { get; set; }
    public int Capacity { get; set; }
    public decimal PricePerHour { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsPendingDeletion { get; set; } = false;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class Vendor
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OwnerId { get; set; }
    public string Name { get; set; } = default!;
    public string? ServiceType { get; set; }
    public decimal PricePerService { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsPendingDeletion { get; set; } = false;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class VendorBooking
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EventId { get; set; }
    public Event? Event { get; set; }
    public Guid? VendorId { get; set; }
    public Vendor? Vendor { get; set; }
    public Guid? VenueId { get; set; }
    public Venue? Venue { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Requested;
    public decimal Cost { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

// ---- Student 3: Attendee Registration & Check-in ----
public class Registration
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EventId { get; set; }
    public Event? Event { get; set; }
    public Guid AttendeeId { get; set; }
    public User? Attendee { get; set; }
    public Guid? TicketId { get; set; }
    public Ticket? Ticket { get; set; }
    public RegistrationStatus Status { get; set; } = RegistrationStatus.Registered;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class CheckIn
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RegistrationId { get; set; }
    public Registration? Registration { get; set; }
    public DateTimeOffset CheckedInAt { get; set; } = DateTimeOffset.UtcNow;
    public string Method { get; set; } = "QR";
}

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Channel { get; set; } = "Email";
    public string? Subject { get; set; }
    public string? Body { get; set; }
    public DateTimeOffset? SentAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

// ---- Student 4: Budget & Payments ----
public class Budget
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? EventId { get; set; }
    public decimal TotalBudget { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<Expense> Expenses { get; set; } = new();
}

public class Expense
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BudgetId { get; set; }
    public Budget? Budget { get; set; }
    public string Category { get; set; } = default!;
    public decimal Amount { get; set; }
    public ExpenseStatus Status { get; set; } = ExpenseStatus.Pending;
    public Guid? ApprovedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ExpenseId { get; set; }
    public Guid? TicketId { get; set; }
    public decimal Amount { get; set; }
    public string Provider { get; set; } = "StripeTest";
    public string? ProviderRef { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class ApprovalRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ExpenseId { get; set; }
    public Guid? VendorBookingId { get; set; }
    public Guid? RequestedBy { get; set; }
    public ApprovalStatus Status { get; set; } = ApprovalStatus.Pending;
    public string? Reason { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ResolvedAt { get; set; }
}

// ---- Agentic AI Subsystem shared state ----
public class AgentWorkflow
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? EventId { get; set; }
    public string Objective { get; set; } = default!;
    public string? PlanJson { get; set; } // JSON-serialized plan
    public WorkflowStatus Status { get; set; } = WorkflowStatus.Running;
    public string? CurrentStep { get; set; }
    public ApprovalStatus ApprovalStatus { get; set; } = ApprovalStatus.NotRequired;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }

    public List<AgentExecutionLog> Logs { get; set; } = new();
}

public class AgentExecutionLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkflowId { get; set; }
    public AgentWorkflow? Workflow { get; set; }
    public string AgentName { get; set; } = default!;
    public string Action { get; set; } = default!;
    public string? InputJson { get; set; }
    public string? OutputJson { get; set; }
    public string? ToolCallsJson { get; set; }
    public string? ValidationResultJson { get; set; }
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}
