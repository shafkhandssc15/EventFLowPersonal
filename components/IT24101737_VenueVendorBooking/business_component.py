"""
Business Component for Student 2 (IT24101737) - Venue & Vendor Booking
Entities: Venue, Vendor, VendorBooking
Key Features:
- Listings with availability calendar tracking
- Search & filter venues/vendors by capacity, price, location, service category
- Booking workflow (Requested -> Confirmed -> Rejected -> Completed)
- Double-booking conflict check (ensuring no overlapping confirmed bookings)
- Alternate venue & vendor suggestion engine when requested resource is unavailable
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional


class Venue:
    def __init__(self, name: str, location: str, capacity: int, price_per_hour: float, amenities: List[str], availability_dates: List[str], venue_id: Optional[str] = None):
        self.id = venue_id or f"vnu-{uuid.uuid4().hex[:8]}"
        self.name = name
        self.location = location
        self.capacity = capacity
        self.price_per_hour = price_per_hour
        self.amenities = amenities or []
        self.availability_dates = availability_dates or []  # Format: "YYYY-MM-DD"
        self.is_active = True

    def is_available_on(self, date_str: str) -> bool:
        # Date string format: YYYY-MM-DD or ISO timestamp starting with YYYY-MM-DD
        d = date_str[:10]
        return d in self.availability_dates

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "capacity": self.capacity,
            "price_per_hour": self.price_per_hour,
            "amenities": self.amenities,
            "availability_dates": self.availability_dates,
            "is_active": self.is_active
        }


class Vendor:
    def __init__(self, name: str, category: str, hourly_rate: float, rating: float, availability_dates: List[str], vendor_id: Optional[str] = None):
        self.id = vendor_id or f"vnd-{uuid.uuid4().hex[:8]}"
        self.name = name
        self.category = category  # Catering, Sound/AV, Security, Decoration, Photography
        self.hourly_rate = hourly_rate
        self.rating = rating
        self.availability_dates = availability_dates or []
        self.is_active = True

    def is_available_on(self, date_str: str) -> bool:
        d = date_str[:10]
        return d in self.availability_dates

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "hourly_rate": self.hourly_rate,
            "rating": self.rating,
            "availability_dates": self.availability_dates,
            "is_active": self.is_active
        }


class VendorBooking:
    def __init__(self, event_id: str, resource_id: str, resource_type: str, booking_date: str, duration_hours: int, total_cost: float, booking_id: Optional[str] = None):
        self.id = booking_id or f"bk-{uuid.uuid4().hex[:8]}"
        self.event_id = event_id
        self.resource_id = resource_id
        self.resource_type = resource_type  # "Venue" or "Vendor"
        self.booking_date = booking_date[:10]
        self.duration_hours = duration_hours
        self.total_cost = total_cost
        self.status = "Requested"  # Requested, Confirmed, Rejected, Completed
        self.created_at = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "resource_id": self.resource_id,
            "resource_type": self.resource_type,
            "booking_date": self.booking_date,
            "duration_hours": self.duration_hours,
            "total_cost": self.total_cost,
            "status": self.status,
            "created_at": self.created_at
        }


class VenueVendorManager:
    """Core Business Logic Component for Venue & Vendor Booking (IT24101737)."""

    def __init__(self):
        self.venues: Dict[str, Venue] = {}
        self.vendors: Dict[str, Vendor] = {}
        self.bookings: Dict[str, VendorBooking] = {}

    # --- Resource Registration & Listing ---
    def register_venue(self, name: str, location: str, capacity: int, price_per_hour: float, amenities: List[str], availability_dates: List[str]) -> Venue:
        venue = Venue(name, location, capacity, price_per_hour, amenities, availability_dates)
        self.venues[venue.id] = venue
        return venue

    def register_vendor(self, name: str, category: str, hourly_rate: float, rating: float, availability_dates: List[str]) -> Vendor:
        vendor = Vendor(name, category, hourly_rate, rating, availability_dates)
        self.vendors[vendor.id] = vendor
        return vendor

    # --- Search & Filtering ---
    def search_venues(self, location: str = None, min_capacity: int = 0, max_price_per_hour: float = float('inf'), date_str: str = None) -> List[Venue]:
        results = []
        for v in self.venues.values():
            if not v.is_active:
                continue
            if location and location.lower() not in v.location.lower():
                continue
            if v.capacity < min_capacity:
                continue
            if v.price_per_hour > max_price_per_hour:
                continue
            if date_str and not v.is_available_on(date_str):
                continue
            results.append(v)
        return results

    def search_vendors(self, category: str = None, max_hourly_rate: float = float('inf'), date_str: str = None) -> List[Vendor]:
        results = []
        for vnd in self.vendors.values():
            if not vnd.is_active:
                continue
            if category and category.lower() != vnd.category.lower():
                continue
            if vnd.hourly_rate > max_hourly_rate:
                continue
            if date_str and not vnd.is_available_on(date_str):
                continue
            results.append(vnd)
        return sorted(results, key=lambda x: x.rating, reverse=True)

    # --- Booking Workflow & Double-Booking Conflict Prevention ---
    def create_booking(self, event_id: str, resource_id: str, resource_type: str, booking_date: str, duration_hours: int) -> VendorBooking:
        b_date = booking_date[:10]
        if resource_type.lower() == "venue":
            resource = self.venues.get(resource_id)
            if not resource:
                raise ValueError(f"Venue '{resource_id}' not found.")
            cost = resource.price_per_hour * duration_hours
        elif resource_type.lower() == "vendor":
            resource = self.vendors.get(resource_id)
            if not resource:
                raise ValueError(f"Vendor '{resource_id}' not found.")
            cost = resource.hourly_rate * duration_hours
        else:
            raise ValueError("resource_type must be either 'Venue' or 'Vendor'.")

        # Check calendar availability
        if not resource.is_available_on(b_date):
            raise ValueError(f"Resource '{resource.name}' is NOT available on date {b_date}.")

        booking = VendorBooking(event_id, resource_id, resource_type.title(), b_date, duration_hours, cost)
        self.bookings[booking.id] = booking
        return booking

    def confirm_booking(self, booking_id: str) -> VendorBooking:
        booking = self.bookings.get(booking_id)
        if not booking:
            raise ValueError(f"Booking '{booking_id}' not found.")

        # ENFORCE DOUBLE-BOOKING CONFLICT CHECK
        # Search all confirmed bookings for the exact same resource on the exact same date
        for existing in self.bookings.values():
            if existing.id != booking.id and existing.resource_id == booking.resource_id and existing.status == "Confirmed" and existing.booking_date == booking.booking_date:
                booking.status = "Rejected"
                raise ValueError(f"DOUBLE-BOOKING CONFLICT: Resource '{booking.resource_id}' already has a Confirmed booking on {booking.booking_date}. Booking request REJECTED.")

        booking.status = "Confirmed"
        return booking

    # --- Alternate Venue Suggestions ---
    def suggest_alternate_venues(self, required_capacity: int, location: str, booking_date: str, exclude_venue_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Finds available alternate venues if primary venue suffers a conflict or is unavailable."""
        alternates = []
        for v in self.venues.values():
            if exclude_venue_id and v.id == exclude_venue_id:
                continue
            if v.capacity >= required_capacity and v.is_available_on(booking_date):
                # Check no existing confirmed booking conflict on that date
                has_conflict = any(b.resource_id == v.id and b.status == "Confirmed" and b.booking_date == booking_date[:10] for b in self.bookings.values())
                if not has_conflict:
                    alternates.append({
                        "venue_id": v.id,
                        "name": v.name,
                        "location": v.location,
                        "capacity": v.capacity,
                        "price_per_hour": v.price_per_hour,
                        "fit_score": min(99, int(80 + (v.capacity - required_capacity) * 0.05)),
                        "reason": f"Sufficient capacity ({v.capacity} >= {required_capacity}), located in {v.location}, fully available on {booking_date[:10]}."
                    })

        return sorted(alternates, key=lambda x: x["fit_score"], reverse=True)
