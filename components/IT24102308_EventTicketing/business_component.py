"""
Business Component for Student 1 (IT24102308) - Event Creation & Ticketing
Entities: Event, TicketType, Ticket
Key Features:
- Event CRUD (Create, Read, Update status, Delete)
- Ticket Types (Early Bird, VIP, General) management
- Publish / Unpublish Event lifecycle
- Auto-close ticket sales when sold out (sold_count >= quantity)
- Waitlist management (auto-adding when sold out, notifying waitlist on cancellation)
- Per-event sales report generation (revenue breakdown, sales rate, tier summary)
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional


class Event:
    def __init__(self, title: str, description: str, category: str, capacity: int, location: str, start_date: str, end_date: str, event_id: Optional[str] = None):
        self.id = event_id or f"evt-{uuid.uuid4().hex[:8]}"
        self.title = title
        self.description = description
        self.category = category
        self.capacity = capacity
        self.location = location
        self.start_date = start_date
        self.end_date = end_date
        self.status = "Draft"  # Draft, Published, Ongoing, Completed, Cancelled
        self.created_at = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "capacity": self.capacity,
            "location": self.location,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "status": self.status,
            "created_at": self.created_at
        }


class TicketType:
    def __init__(self, event_id: str, name: str, price: float, quantity: int, type_id: Optional[str] = None):
        self.id = type_id or f"tt-{uuid.uuid4().hex[:8]}"
        self.event_id = event_id
        self.name = name  # Early Bird, VIP, General
        self.price = price
        self.quantity = quantity
        self.sold_count = 0
        self.is_active = True

    @property
    def remaining_tickets(self) -> int:
        return max(0, self.quantity - self.sold_count)

    @property
    def is_sold_out(self) -> bool:
        return self.sold_count >= self.quantity

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "name": self.name,
            "price": self.price,
            "quantity": self.quantity,
            "sold_count": self.sold_count,
            "remaining_tickets": self.remaining_tickets,
            "is_sold_out": self.is_sold_out,
            "is_active": self.is_active
        }


class Ticket:
    def __init__(self, event_id: str, ticket_type_id: str, attendee_name: str, price_paid: float, ticket_id: Optional[str] = None):
        self.id = ticket_id or f"tkt-{uuid.uuid4().hex[:8]}"
        self.event_id = event_id
        self.ticket_type_id = ticket_type_id
        self.attendee_name = attendee_name
        self.price_paid = price_paid
        self.status = "Valid"  # Valid, Cancelled, Used
        self.issued_at = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "ticket_type_id": self.ticket_type_id,
            "attendee_name": self.attendee_name,
            "price_paid": self.price_paid,
            "status": self.status,
            "issued_at": self.issued_at
        }


class EventTicketingManager:
    """Core Business Logic Component for Event Creation & Ticketing (IT24102308)."""

    def __init__(self):
        self.events: Dict[str, Event] = {}
        self.ticket_types: Dict[str, TicketType] = {}
        self.tickets: Dict[str, Ticket] = {}
        self.waitlists: Dict[str, List[Dict[str, str]]] = {}  # event_id -> list of attendee entries

    # --- Event CRUD & Lifecycle ---
    def create_event(self, title: str, description: str, category: str, capacity: int, location: str, start_date: str, end_date: str) -> Event:
        event = Event(title, description, category, capacity, location, start_date, end_date)
        self.events[event.id] = event
        self.waitlists[event.id] = []
        return event

    def get_event(self, event_id: str) -> Optional[Event]:
        return self.events.get(event_id)

    def publish_event(self, event_id: str) -> Event:
        event = self.get_event(event_id)
        if not event:
            raise ValueError(f"Event with ID {event_id} not found.")
        event.status = "Published"
        return event

    def unpublish_event(self, event_id: str) -> Event:
        event = self.get_event(event_id)
        if not event:
            raise ValueError(f"Event with ID {event_id} not found.")
        event.status = "Draft"
        return event

    def update_event_status(self, event_id: str, new_status: str) -> Event:
        event = self.get_event(event_id)
        if not event:
            raise ValueError(f"Event with ID {event_id} not found.")
        valid_statuses = ["Draft", "Published", "Ongoing", "Completed", "Cancelled"]
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid status '{new_status}'. Allowed: {valid_statuses}")
        event.status = new_status
        return event

    # --- Ticket Types & Pricing ---
    def add_ticket_type(self, event_id: str, name: str, price: float, quantity: int) -> TicketType:
        event = self.get_event(event_id)
        if not event:
            raise ValueError(f"Event with ID {event_id} not found.")
        
        # Enforce capacity check across total ticket quantities
        existing_total = sum(tt.quantity for tt in self.ticket_types.values() if tt.event_id == event_id)
        if existing_total + quantity > event.capacity:
            raise ValueError(f"Cannot allocate {quantity} tickets. Total ticket quantity ({existing_total + quantity}) would exceed event capacity ({event.capacity}).")

        tt = TicketType(event_id, name, price, quantity)
        self.ticket_types[tt.id] = tt
        return tt

    def get_event_ticket_types(self, event_id: str) -> List[TicketType]:
        return [tt for tt in self.ticket_types.values() if tt.event_id == event_id]

    # --- Ticket Purchase & Auto-Close ---
    def purchase_ticket(self, event_id: str, ticket_type_id: str, attendee_name: str) -> Ticket:
        event = self.get_event(event_id)
        if not event:
            raise ValueError(f"Event '{event_id}' does not exist.")
        if event.status != "Published":
            raise ValueError(f"Cannot purchase ticket. Event status is '{event.status}', must be 'Published'.")

        tt = self.ticket_types.get(ticket_type_id)
        if not tt or tt.event_id != event_id:
            raise ValueError(f"Ticket type '{ticket_type_id}' is invalid for event '{event_id}'.")

        if tt.is_sold_out:
            # Auto-close tier status and inform buyer to join waitlist
            tt.is_active = False
            raise ValueError(f"Ticket tier '{tt.name}' is SOLD OUT! Please join the event waitlist.")

        # Execute purchase
        tt.sold_count += 1
        if tt.is_sold_out:
            tt.is_active = False  # Auto-close tier when sold out limit reached

        ticket = Ticket(event_id, ticket_type_id, attendee_name, tt.price)
        self.tickets[ticket.id] = ticket
        return ticket

    # --- Waitlist Management ---
    def join_waitlist(self, event_id: str, attendee_name: str, attendee_email: str) -> Dict[str, Any]:
        event = self.get_event(event_id)
        if not event:
            raise ValueError(f"Event '{event_id}' not found.")
        
        entry = {
            "attendee_name": attendee_name,
            "attendee_email": attendee_email,
            "joined_at": datetime.utcnow().isoformat()
        }
        self.waitlists[event.id].append(entry)
        return {
            "event_id": event_id,
            "event_title": event.title,
            "attendee_name": attendee_name,
            "position": len(self.waitlists[event.id]),
            "message": f"Successfully added {attendee_name} to the waitlist (Position #{len(self.waitlists[event.id])})."
        }

    def cancel_ticket(self, ticket_id: str) -> Dict[str, Any]:
        ticket = self.tickets.get(ticket_id)
        if not ticket:
            raise ValueError(f"Ticket '{ticket_id}' not found.")
        
        ticket.status = "Cancelled"
        tt = self.ticket_types.get(ticket.ticket_type_id)
        if tt:
            tt.sold_count = max(0, tt.sold_count - 1)
            if not tt.is_sold_out:
                tt.is_active = True  # Re-open ticket sales

        # Check waitlist auto-allocation notification
        event_id = ticket.event_id
        waitlist_notify = None
        if self.waitlists.get(event_id):
            next_attendee = self.waitlists[event_id].pop(0)
            waitlist_notify = f"Waitlist spot offered to {next_attendee['attendee_name']} ({next_attendee['attendee_email']})."

        return {
            "ticket_id": ticket_id,
            "status": "Cancelled",
            "waitlist_notification": waitlist_notify
        }

    # --- Per-Event Sales Reporting ---
    def generate_sales_report(self, event_id: str) -> Dict[str, Any]:
        event = self.get_event(event_id)
        if not event:
            raise ValueError(f"Event '{event_id}' not found.")

        event_tts = self.get_event_ticket_types(event_id)
        total_revenue = 0.0
        total_tickets_offered = sum(tt.quantity for tt in event_tts)
        total_tickets_sold = sum(tt.sold_count for tt in event_tts)
        tier_breakdown = []

        for tt in event_tts:
            rev = tt.sold_count * tt.price
            total_revenue += rev
            tier_breakdown.append({
                "tier_name": tt.name,
                "price": tt.price,
                "quantity": tt.quantity,
                "sold": tt.sold_count,
                "remaining": tt.remaining_tickets,
                "revenue": rev,
                "is_sold_out": tt.is_sold_out
            })

        occupancy_rate = (total_tickets_sold / event.capacity * 100) if event.capacity > 0 else 0.0
        waitlist_count = len(self.waitlists.get(event_id, []))

        return {
            "event_id": event.id,
            "event_title": event.title,
            "status": event.status,
            "capacity": event.capacity,
            "total_tickets_offered": total_tickets_offered,
            "total_tickets_sold": total_tickets_sold,
            "occupancy_rate_pct": round(occupancy_rate, 2),
            "total_revenue": total_revenue,
            "waitlist_count": waitlist_count,
            "tier_breakdown": tier_breakdown
        }
