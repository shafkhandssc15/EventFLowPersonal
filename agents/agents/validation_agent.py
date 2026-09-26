"""
Agent 4 - Validation/Safety Agent (owned by Student 4)

Input: Any proposed expense, vendor booking cost, or budget allocation from the workflow
Output: Approve automatically if within rules (e.g. under threshold and within
        budget), otherwise pause and request human approval from the Organizer
Tools allowed: validate_budget_rule, flag_for_approval (read-only on budget
        data, no direct spend authority)

This is the high-impact action gate — required by the spec (Section 9.1).
"""
from typing import Any, Dict

# Recalibrated to the LKR scale of the real venue/vendor catalog the Domain
# Analysis Agent now fetches from the backend (venues run ~65k-150k/hr,
# catering ~280k) — the original placeholder of 1000 made every real booking
# pause for approval, since nothing in the actual catalog could ever clear it.
AUTO_APPROVE_THRESHOLD = 600000.0


def validate_budget_rule(estimated_cost: float, total_budget: float) -> Dict[str, Any]:
    """Tool: read-only check against budget rules. No spend authority."""
    within_budget = estimated_cost <= total_budget
    under_threshold = estimated_cost <= AUTO_APPROVE_THRESHOLD
    return {
        "within_budget": within_budget,
        "under_threshold": under_threshold,
        "auto_approve": within_budget and under_threshold,
    }


def flag_for_approval(reason: str) -> Dict[str, Any]:
    """Tool: raises a human-approval flag. Does not itself approve/reject anything."""
    return {"flagged": True, "reason": reason}


def run(estimated_cost: float, total_budget: float) -> Dict[str, Any]:
    rule_result = validate_budget_rule(estimated_cost, total_budget)

    if rule_result["auto_approve"]:
        return {
            "agent": "ValidationSafetyAgent",
            "input": {"estimated_cost": estimated_cost, "total_budget": total_budget},
            "output": {"decision": "auto_approved", "rule_result": rule_result},
            "tool_calls": ["validate_budget_rule"],
            "paused_for_approval": False,
        }

    reason = (
        f"Estimated cost {estimated_cost:.2f} exceeds auto-approve threshold "
        f"{AUTO_APPROVE_THRESHOLD:.2f}" if not rule_result["under_threshold"]
        else f"Estimated cost {estimated_cost:.2f} exceeds remaining budget {total_budget:.2f}"
    )
    flag = flag_for_approval(reason)

    return {
        "agent": "ValidationSafetyAgent",
        "input": {"estimated_cost": estimated_cost, "total_budget": total_budget},
        "output": {"decision": "pending_human_approval", "rule_result": rule_result, "flag": flag},
        "tool_calls": ["validate_budget_rule", "flag_for_approval"],
        "paused_for_approval": True,
    }
