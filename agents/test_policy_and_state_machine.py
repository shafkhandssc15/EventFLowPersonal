from agents.policy import evaluate_policy, validate_event_input


def test_rule_engine_auto_approves_under_threshold():
    result = evaluate_policy(
        estimated_cost=200000.0,
        total_budget=1600000.0,
        capacity=350,
        event_date="2027-11-20T09:00:00Z",
        location="Colombo",
    )
    assert result["requires_human_approval"] is False
    assert result["rule_result"]["auto_approve"] is True


def test_rule_engine_requires_human_approval_for_over_threshold():
    result = evaluate_policy(
        estimated_cost=800000.0,
        total_budget=1600000.0,
        capacity=350,
        event_date="2027-11-20T09:00:00Z",
        location="Colombo",
    )
    assert result["requires_human_approval"] is True
    assert result["rule_result"]["under_threshold"] is False


def test_rule_engine_rejects_over_budget():
    result = evaluate_policy(
        estimated_cost=1800000.0,
        total_budget=1600000.0,
        capacity=350,
        event_date="2027-11-20T09:00:00Z",
        location="Colombo",
    )
    assert result["requires_human_approval"] is True
    assert result["rule_result"]["within_budget"] is False


def test_invalid_event_input_is_rejected():
    ok, error = validate_event_input({
        "capacity": 0,
        "budget": -5,
        "event_date": "2020-01-01T00:00:00Z",
        "location": "",
    })
    assert ok is False
    assert "capacity" in error.lower() or "budget" in error.lower() or "event_date" in error.lower() or "location" in error.lower()
