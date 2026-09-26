"""
Agent 2 - Domain Analysis Agent (owned by Student 2)

Input: Event requirements (capacity, budget, location, date) from the plan
Output: Ranked list of suitable venues/vendors with justification
        (structured JSON: {venueId, matchScore, reason})
Tools allowed: search_venues, search_vendors, check_availability
Validates inputs against schema before calling tools (e.g. capacity must be a
positive integer, date must be in the future).
"""
from datetime import datetime, timezone
from typing import Any, Dict, List

# Mocked venue/vendor catalog — in production these come from GET /api/venues, /api/vendors
_MOCK_VENUES = [
    {"id": "venue-1", "name": "Grand Hall", "capacity": 250, "price_per_hour": 120, "location": "Downtown"},
    {"id": "venue-2", "name": "Riverside Conference Center", "capacity": 200, "price_per_hour": 150, "location": "Riverside"},
    {"id": "venue-3", "name": "Community Pavilion", "capacity": 80, "price_per_hour": 60, "location": "Downtown"},
]

_MOCK_VENDORS = [
    {"id": "vendor-1", "name": "Prime Catering Co.", "service_type": "Catering", "price_per_service": 1800},
    {"id": "vendor-2", "name": "SoundWorks AV", "service_type": "Audio/Visual", "price_per_service": 900},
]


class ValidationError(Exception):
    pass


def validate_inputs(capacity: int, event_date: str) -> None:
    if not isinstance(capacity, int) or capacity <= 0:
        raise ValidationError("capacity must be a positive integer")
    try:
        parsed = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
    except ValueError as e:
        raise ValidationError("date must be a valid ISO-8601 date") from e
    if parsed < datetime.now(timezone.utc):
        raise ValidationError("date must be in the future")


def search_venues(capacity: int, location: str | None) -> List[Dict[str, Any]]:
    """Tool: search venues by capacity/location."""
    return [v for v in _MOCK_VENUES if v["capacity"] >= capacity and (not location or location.lower() in v["location"].lower())] \
        or [v for v in _MOCK_VENUES if v["capacity"] >= capacity]


def search_vendors(service_type: str | None = None) -> List[Dict[str, Any]]:
    """Tool: search vendors by service type."""
    return [v for v in _MOCK_VENDORS if not service_type or v["service_type"] == service_type]


def check_availability(venue_id: str, event_date: str) -> bool:
    """Tool: mock availability check — in production hits GET /api/venues/{id}/availability."""
    return True


def _score_venue(venue: Dict[str, Any], capacity: int, budget: float) -> Dict[str, Any]:
    fit = min(1.0, capacity / venue["capacity"]) if venue["capacity"] else 0
    price_fit = 1.0 if venue["price_per_hour"] * 6 <= budget else 0.5
    score = round((fit * 0.6 + price_fit * 0.4), 2)
    reason = f"Capacity fits ({venue['capacity']} >= {capacity}); est. cost {'within' if price_fit == 1.0 else 'above'} budget"
    return {"venueId": venue["id"], "name": venue["name"], "matchScore": score, "reason": reason}


def run(capacity: int, budget: float, event_date: str, location: str | None) -> Dict[str, Any]:
    validate_inputs(capacity, event_date)

    venues = search_venues(capacity, location)
    vendors = search_vendors("Catering")
    available_venues = [v for v in venues if check_availability(v["id"], event_date)]

    ranked = sorted(
        [_score_venue(v, capacity, budget) for v in available_venues],
        key=lambda x: x["matchScore"], reverse=True,
    )

    return {
        "agent": "DomainAnalysisAgent",
        "input": {"capacity": capacity, "budget": budget, "event_date": event_date, "location": location},
        "output": {"ranked_venues": ranked, "vendors": vendors},
        "tool_calls": ["search_venues", "search_vendors", "check_availability"],
    }
