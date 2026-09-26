"""
Tests for the Domain Analysis Agent's allow-listed backend calls and input
validation. HTTP calls to the shared ASP.NET Core API are mocked here so
these tests never require a live backend — the real end-to-end integration
is exercised separately (see the assignment's Agent Evaluation report).
"""
from datetime import datetime, timedelta, timezone

import pytest

from agents import domain_analysis_agent as daa


class _FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


FUTURE_DATE = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()


def test_validate_inputs_rejects_non_positive_capacity():
    with pytest.raises(daa.ValidationError):
        daa.validate_inputs(0, FUTURE_DATE)


def test_validate_inputs_rejects_past_date():
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    with pytest.raises(daa.ValidationError):
        daa.validate_inputs(50, past)


def test_validate_inputs_accepts_valid_future_request():
    daa.validate_inputs(50, FUTURE_DATE)  # should not raise


def test_search_venues_calls_shared_backend_and_maps_fields(monkeypatch):
    captured = {}

    def fake_get(url, params=None, timeout=None):
        captured["url"] = url
        captured["params"] = params
        return _FakeResponse({"items": [
            {"id": "11111111-0000-0000-0000-000000000001", "name": "Test Hall",
             "capacity": 500, "pricePerHour": 10000, "location": "Colombo"},
        ]})

    monkeypatch.setattr(daa.httpx, "get", fake_get)

    venues = daa.search_venues(capacity=100, location="Colombo")

    assert captured["url"].endswith("/api/venues")
    assert captured["params"]["minCapacity"] == 100
    assert venues == [{
        "id": "11111111-0000-0000-0000-000000000001",
        "name": "Test Hall",
        "capacity": 500,
        "price_per_hour": 10000,
        "location": "Colombo",
    }]


def test_search_venues_fails_safe_to_empty_list_on_backend_error(monkeypatch):
    def fake_get(url, params=None, timeout=None):
        raise daa.httpx.ConnectError("backend unreachable")

    monkeypatch.setattr(daa.httpx, "get", fake_get)

    assert daa.search_venues(capacity=100, location=None) == []


def test_check_availability_fails_safe_to_unavailable_on_error(monkeypatch):
    def fake_get(url, params=None, timeout=None):
        raise daa.httpx.ConnectError("backend unreachable")

    monkeypatch.setattr(daa.httpx, "get", fake_get)

    assert daa.check_availability("some-venue-id", FUTURE_DATE) is False


def test_run_ranks_venues_by_capacity_and_price_fit(monkeypatch):
    def fake_search_venues(capacity, location):
        return [
            {"id": "v-big-expensive", "name": "Big", "capacity": 1000, "price_per_hour": 500000, "location": "Colombo"},
            {"id": "v-small-cheap", "name": "Small", "capacity": 60, "price_per_hour": 5000, "location": "Colombo"},
        ]

    def fake_search_vendors(service_type=None):
        return []

    def fake_check_availability(venue_id, event_date):
        return True

    monkeypatch.setattr(daa, "search_venues", fake_search_venues)
    monkeypatch.setattr(daa, "search_vendors", fake_search_vendors)
    monkeypatch.setattr(daa, "check_availability", fake_check_availability)

    result = daa.run(capacity=50, budget=100_000.0, event_date=FUTURE_DATE, location="Colombo")

    ranked = result["output"]["ranked_venues"]
    assert len(ranked) == 2
    # The cheap-enough small venue should outrank the expensive big one on this budget.
    assert ranked[0]["venueId"] == "v-small-cheap"
