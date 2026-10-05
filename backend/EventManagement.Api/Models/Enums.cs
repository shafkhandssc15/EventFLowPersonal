namespace EventManagement.Api.Models;

public enum UserRole { Organizer, VendorVenueManager, Attendee, Admin }
public enum EventStatus { Draft, Published, Ongoing, Completed, Cancelled, PendingDeletion }
public enum BookingStatus { Requested, Confirmed, Rejected, Completed }
public enum RegistrationStatus { Registered, Confirmed, CheckedIn, NoShow }
public enum ExpenseStatus { Pending, Approved, Paid, Rejected }
public enum WorkflowStatus { Running, PausedForApproval, Completed, Failed }
public enum ApprovalStatus { NotRequired, Pending, Approved, Rejected }
public enum WaitlistStatus { Waiting, Notified, Registered, Expired }
