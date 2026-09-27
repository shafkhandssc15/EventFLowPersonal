from __future__ import annotations

from typing import Dict, Optional

VALID_STATES = {
    "draft",
    "validated",
    "planning",
    "domain_ranked",
    "reservation_ready",
    "pending_approval",
    "approved",
    "rejected",
    "failed",
    "cancelled",
}


def transition(current: str, event: str) -> Optional[str]:
    transitions: Dict[str, Dict[str, str]] = {
        "draft": {"validate": "validated", "fail": "failed"},
        "validated": {"plan": "planning", "fail": "failed"},
        "planning": {"domain": "domain_ranked", "fail": "failed"},
        "domain_ranked": {"action": "reservation_ready", "fail": "failed"},
        "reservation_ready": {"validate": "pending_approval", "fail": "failed"},
        "pending_approval": {"approve": "approved", "reject": "rejected", "fail": "failed"},
        "approved": {"cancel": "cancelled"},
        "rejected": {"retry": "draft"},
        "failed": {"retry": "draft"},
        "cancelled": {},
    }

    if current not in VALID_STATES:
        return None
    return transitions.get(current, {}).get(event)


def workflow_summary(state: str) -> str:
    summary = {
        "draft": "Input collected, waiting to be validated.",
        "validated": "Input passed validation checks.",
        "planning": "Plan generation in progress.",
        "domain_ranked": "Venue and vendor ranking completed.",
        "reservation_ready": "Reservation payload is ready.",
        "pending_approval": "Waiting for human approval.",
        "approved": "Workflow approved and completed.",
        "rejected": "Workflow rejected by human or policy.",
        "failed": "Workflow failed due to validation or runtime error.",
        "cancelled": "Workflow cancelled.",
    }
    return summary.get(state, "Unknown workflow state.")
