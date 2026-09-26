"""
Agent 2 - Domain Analysis Agent (owned by Student 2)

Input: Event requirements (capacity, budget, location, date) from the plan
Output: Ranked list of suitable venues/vendors with justification
        (structured JSON: {venueId, matchScore, reason})
Tools allowed: search_venues, search_vendors, check_availability — each is an
        allow-listed HTTP call to the shared ASP.NET Core Web API (the same
        backend React/Flutter use), never a direct database call and never
        fabricated data. Validates inputs against schema before calling tools
        (e.g. capacity must be a positive integer, date must be in the future).
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

import httpx

# The Python service is an internal tool-caller of the ASP.NET Core API — the
# same "single source of truth" React/Flutter use. Never queries Postgres directly.
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:5000")
_HTTP_TIMEOUT = 5.0
_ASSUMED_EVENT_HOURS = 4.0


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
    """Tool: GET /api/venues on the shared backend. Safe failure -> empty list."""
    params: Dict[str, Any] = {"minCapacity": capacity, "pageSize": 10}
    if location:
        params["location"] = location
    try:
        resp = httpx.get(f"{API_BASE_URL}/api/venues", params=params, timeout=_HTTP_TIMEOUT)
        resp.raise_for_status()
        items = resp.json().get("items", [])
    except (httpx.HTTPError, ValueError, KeyError):
        items = []
    return [
        {
            "id": str(v["id"]),
            "name": v["name"],
            "capacity": v["capacity"],
            "price_per_hour": v["pricePerHour"],
            "location": v.get("location"),
        }
        for v in items
    ]


def search_vendors(service_type: str | None = None) -> List[Dict[str, Any]]:
    """Tool: GET /api/vendors on the shared backend. Safe failure -> empty list."""
    params: Dict[str, Any] = {}
    if service_type:
        params["serviceType"] = service_type
    try:
        resp = httpx.get(f"{API_BASE_URL}/api/vendors", params=params, timeout=_HTTP_TIMEOUT)
        resp.raise_for_status()
        items = resp.json()
    except (httpx.HTTPError, ValueError):
        items = []
    return [
        {
            "id": str(v["id"]),
            "name": v["name"],
            "service_type": v.get("serviceType"),
            "price_per_service": v["pricePerService"],
        }
        for v in items
    ]


def check_availability(venue_id: str, event_date: str) -> bool:
    """Tool: GET /api/venues/{id}/availability on the shared backend. Fails safe -> unavailable."""
    try:
        start = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
        end = start + timedelta(hours=_ASSUMED_EVENT_HOURS)
        resp = httpx.get(
            f"{API_BASE_URL}/api/venues/{venue_id}/availability",
            params={"start": start.isoformat(), "end": end.isoformat()},
            timeout=_HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        return bool(resp.json().get("available", False))
    except (httpx.HTTPError, ValueError, KeyError):
        return False


def _score_venue(venue: Dict[str, Any], capacity: int, budget: float) -> Dict[str, Any]:
    fit = min(1.0, capacity / venue["capacity"]) if venue["capacity"] else 0
    price_fit = 1.0 if venue["price_per_hour"] * _ASSUMED_EVENT_HOURS <= budget else 0.5
    score = round((fit * 0.6 + price_fit * 0.4), 2)
    reason = f"Capacity fits ({venue['capacity']} >= {capacity}); est. cost {'within' if price_fit == 1.0 else 'above'} budget"
    return {
        "venueId": venue["id"],
        "name": venue["name"],
        "matchScore": score,
        "reason": reason,
        # carried forward so the Action Agent can compute a real cost instead of a guess
        "price_per_hour": venue["price_per_hour"],
        "capacity": venue["capacity"],
    }


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
