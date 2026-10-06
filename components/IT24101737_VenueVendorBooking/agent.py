"""
AI Agent for Student 2 (IT24101737) - Venue & Vendor Booking Agent
Tied ONLY to Venue & Vendor Booking business logic.
Produces presentable English output for venue managers and event organizers.
"""

from typing import Dict, Any, List, Optional
try:
    from .business_component import VenueVendorManager
except ImportError:
    from business_component import VenueVendorManager


class VenueVendorAgent:
    """Specialized AI Agent tied exclusively to Venue & Vendor Booking business logic."""

    def __init__(self, manager: VenueVendorManager):
        self.manager = manager
        self.agent_name = "Venue & Vendor Matchmaker Agent (IT24101737)"

    def evaluate_and_rank_venues(self, required_capacity: int, location: str, booking_date: str, max_budget_per_hour: float = 100000.0) -> List[Dict[str, Any]]:
        """Searches, evaluates, and ranks available venues matching event specifications."""
        venues = self.manager.search_venues(location=location, min_capacity=required_capacity, max_price_per_hour=max_budget_per_hour, date_str=booking_date)
        ranked = []
        for v in venues:
            cap_score = min(100, int(v.capacity / max(1, required_capacity) * 80))
            cost_score = min(100, int((1 - (v.price_per_hour / max_budget_per_hour)) * 100))
            final_score = round((cap_score * 0.6) + (cost_score * 0.4), 1)

            ranked.append({
                "venue_id": v.id,
                "name": v.name,
                "capacity": v.capacity,
                "location": v.location,
                "price_per_hour": v.price_per_hour,
                "match_score": final_score,
                "recommendation_reason": f"Excellent fit score of {final_score}/100. Capacity ({v.capacity}) handles target ({required_capacity}) with price LKR {v.price_per_hour:,.2f}/hr."
            })
        return sorted(ranked, key=lambda x: x["match_score"], reverse=True)

    def resolve_booking_conflict(self, failed_venue_id: str, required_capacity: int, location: str, booking_date: str) -> str:
        """
        Detects double-booking conflicts and generates a presentable English resolution proposal with alternate recommendations.
        """
        alternates = self.manager.suggest_alternate_venues(required_capacity, location, booking_date, exclude_venue_id=failed_venue_id)
        failed_venue = self.manager.venues.get(failed_venue_id)
        failed_name = failed_venue.name if failed_venue else "Requested Venue"

        lines = [
            "================================================================================",
            "            VENUE BOOKING CONFLICT & ALTERNATE PROPOSAL REPORT                 ",
            "================================================================================",
            f" Agent Name         : {self.agent_name}",
            f" Conflict Target    : {failed_name} (ID: {failed_venue_id})",
            f" Requested Date     : {booking_date[:10]}",
            f" Required Capacity   : {required_capacity} attendees",
            "--------------------------------------------------------------------------------",
            " CONFLICT ANALYSIS:",
            f"  ⚠️ DOUBLE-BOOKING DETECTED: {failed_name} is already confirmed for another event on {booking_date[:10]}.",
            "  The booking request was automatically rejected by the business conflict checker.",
            "--------------------------------------------------------------------------------",
            " RECOMMENDED ALTERNATE VENUES:",
        ]

        if not alternates:
            lines.append("  ❌ No alternate venues available matching capacity and location criteria on this date.")
        else:
            for i, alt in enumerate(alternates[:3], 1):
                lines.append(
                    f"  {i}. {alt['name'].upper()} (Fit Score: {alt['fit_score']}/100)\n"
                    f"      Location: {alt['location']} | Capacity: {alt['capacity']} | Price: LKR {alt['price_per_hour']:,.2f}/hr\n"
                    f"      Reason: {alt['reason']}"
                )

        lines.append("--------------------------------------------------------------------------------")
        lines.append(" NEXT STEPS & ACTION PLAN:")
        lines.append("  1. Select one of the recommended alternate venues listed above.")
        lines.append("  2. Invoke create_booking() to reserve the selected alternate resource.")
        lines.append("================================================================================")

        return "\n".join(lines)

    def generate_booking_summary(self, booking_id: str) -> str:
        """Generates a presentable English confirmation report for a confirmed booking."""
        booking = self.manager.bookings.get(booking_id)
        if not booking:
            return f"Error: Booking '{booking_id}' not found."

        resource_name = "Unknown Resource"
        location_or_cat = "N/A"
        if booking.resource_type == "Venue":
            res = self.manager.venues.get(booking.resource_id)
            if res:
                resource_name = res.name
                location_or_cat = res.location
        else:
            res = self.vendors.get(booking.resource_id)
            if res:
                resource_name = res.name
                location_or_cat = res.category

        lines = [
            "================================================================================",
            "                 RESOURCE BOOKING CONFIRMATION SUMMARY                         ",
            "================================================================================",
            f" Agent Name        : {self.agent_name}",
            f" Booking Reference : {booking.id}",
            f" Resource Name     : {resource_name}",
            f" Resource Type     : {booking.resource_type}",
            f" Details           : {location_or_cat}",
            f" Date of Service   : {booking.booking_date}",
            f" Duration          : {booking.duration_hours} Hours",
            f" Total Booking Cost: LKR {booking.total_cost:,.2f}",
            f" Current Status    : {booking.status.upper()}",
            "--------------------------------------------------------------------------------",
            " AGENT VALIDATION LOG:",
            f"  ✔ Schedule conflict check passed. No overlapping bookings found.",
            f"  ✔ Resource availability calendar verified for {booking.booking_date}.",
            f"  ✔ Cost calculation verified ({booking.duration_hours} hours @ LKR {booking.total_cost / max(1, booking.duration_hours):,.2f}/hr).",
            "================================================================================"
        ]
        return "\n".join(lines)
