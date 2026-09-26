"""
Deterministic-validation tests for the Validation/Safety Agent (Section 9.1's
"deterministic checks such as schema or business-rule validation" requirement).
No mocking needed — this agent is pure business logic, no I/O.
"""
from agents import validation_agent as va


def test_auto_approves_when_within_budget_and_under_threshold():
    result = va.run(estimated_cost=200_000.0, total_budget=1_000_000.0)

    assert result["paused_for_approval"] is False
    assert result["output"]["decision"] == "auto_approved"
    assert result["output"]["rule_result"]["auto_approve"] is True


def test_pauses_for_approval_when_over_threshold_even_if_within_budget():
    result = va.run(estimated_cost=va.AUTO_APPROVE_THRESHOLD + 1, total_budget=10_000_000.0)

    assert result["paused_for_approval"] is True
    assert result["output"]["decision"] == "pending_human_approval"
    assert result["output"]["rule_result"]["within_budget"] is True
    assert result["output"]["rule_result"]["under_threshold"] is False
    assert "exceeds auto-approve threshold" in result["output"]["flag"]["reason"]


def test_pauses_for_approval_when_over_budget_even_if_under_threshold():
    result = va.run(estimated_cost=500.0, total_budget=100.0)

    assert result["paused_for_approval"] is True
    assert result["output"]["rule_result"]["within_budget"] is False
    assert "exceeds remaining budget" in result["output"]["flag"]["reason"]


def test_agent_identity_and_tool_calls_are_recorded_for_audit():
    result = va.run(estimated_cost=1.0, total_budget=1.0)

    assert result["agent"] == "ValidationSafetyAgent"
    assert "validate_budget_rule" in result["tool_calls"]
