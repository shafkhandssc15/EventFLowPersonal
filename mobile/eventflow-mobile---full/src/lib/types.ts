export type UserRole = 'Organizer' | 'VendorVenueManager' | 'Attendee' | 'Admin';

export interface User {
  Id: string;
  Name: string;
  Email: string;
  PasswordHash?: string;
  Role: UserRole;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface EventItem {
  Id: string;
  OrganizerId: string;
  Title: string;
  Description?: string;
  Category?: string;
  StartDate: string;
  EndDate: string;
  Location?: string;
  Capacity: number;
  Status: 'Draft' | 'Published' | 'Ongoing' | 'Completed' | 'Cancelled';
  BudgetId?: string | null;
  CreatedAt?: string;
  UpdatedAt?: string;
  // Computed / joined fields
  ticketTypes?: TicketType[];
  venueName?: string;
}

export interface TicketType {
  Id: string;
  EventId: string;
  Name: string;
  Price: number;
  Quantity: number;
  Sold: number;
  CreatedAt?: string;
}

export interface Ticket {
  Id: string;
  TicketTypeId: string;
  AttendeeId: string;
  QrCode: string;
  CreatedAt: string;
}

export interface Registration {
  Id: string;
  EventId: string;
  AttendeeId: string;
  TicketId?: string | null;
  Status: 'Registered' | 'Confirmed' | 'CheckedIn' | 'NoShow';
  CreatedAt: string;
  UpdatedAt?: string;
  // Joined fields for display
  event?: EventItem;
  ticket?: Ticket;
  ticketType?: TicketType;
  attendee?: User;
  checkedInAt?: string;
}

export interface CheckInRecord {
  Id: string;
  RegistrationId: string;
  CheckedInAt: string;
  Method: string;
}

export interface Venue {
  Id: string;
  OwnerId: string;
  Name: string;
  Location?: string;
  Capacity: number;
  PricePerHour: number;
  IsActive: boolean;
  CreatedAt?: string;
  IsPendingDeletion?: boolean;
}

export interface Vendor {
  Id: string;
  OwnerId: string;
  Name: string;
  ServiceType?: string;
  PricePerService: number;
  IsActive: boolean;
  CreatedAt?: string;
  IsPendingDeletion?: boolean;
}

export interface ScanResult {
  success: boolean;
  alreadyCheckedIn?: boolean;
  message: string;
  ticket?: Ticket;
  registration?: Registration;
  event?: EventItem;
  attendeeName?: string;
  attendeeEmail?: string;
  ticketTypeName?: string;
  ticketTypePrice?: number;
  bookingRef?: string;
  checkedInAt?: string;
}
