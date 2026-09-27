from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Tuple

AUTO_APPROVE_THRESHOLD_LKR = 500000.0


def validate_event_input(payload: Dict[str, Any]) -> Tuple[bool, str]:
    """Strict deterministic validation. Returns (is_valid, message)."""
    capacity = payload.get("capacity")
    budget = payload.get("budget")
    event_date = payload.get("event_date")
    location = payload.get("location")

    if capacity is None or not isinstance(capacity, int) or capacity <= 0:
        return False, "capacity must be a positive integer"

    if budget is None or not isinstance(budget, (int, float)) or budget <= 0:
        return False, "budget must be a positive number"

    if not event_date:
        return False, "event_date is required"

    try:
        parsed = datetime.fromisoformat(str(event_date).replace("Z", "+00:00"))
    except ValueError:
        return False, "event_date must be a valid ISO-8601 datetime"

    if parsed < datetime.now(timezone.utc):
        return False, "event_date must be in the future"

    if not location or not str(location).strip():
        return False, "location is required"

    return True, "valid"


def evaluate_policy(
    estimated_cost: float,
    total_budget: float,
    capacity: int,
    event_date: str,
    location: str,
) -> Dict[str, Any]:
    """Deterministic policy evaluation used by validation and orchestrator."""
    within_budget = estimated_cost <= total_budget if total_budget > 0 else True
    under_threshold = estimated_cost <= AUTO_APPROVE_THRESHOLD_LKR
    auto_approve = within_budget and under_threshold

    rule_result = {
        "within_budget": within_budget,
        "under_threshold": under_threshold,
        "auto_approve": auto_approve,
        "estimated_cost": estimated_cost,
        "total_budget": total_budget,
        "capacity": capacity,
        "event_date": event_date,
        "location": location,
    }

    requires_human_approval = not auto_approve

    return {
        "requires_human_approval": requires_human_approval,
        "rule_result": rule_result,
        "decision": "pending_human_approval" if requires_human_approval else "auto_approved",
        "risk_level": "HIGH" if not within_budget else ("MEDIUM" if requires_human_approval else "LOW"),
    }
