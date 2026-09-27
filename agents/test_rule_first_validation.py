from agents import validation_agent


def test_validation_rules_decide_approval(monkeypatch):
    def fake_call_llm(prompt, system_prompt="", cache_key=None):
        return (
            '{"decision":"auto_approved","risk_level":"LOW","requires_human_approval":false,"audit_summary":"Looks safe","recommended_action":"Approve immediately"}',
            "Gemini (test)",
        )

    monkeypatch.setattr(validation_agent, "call_llm", fake_call_llm)
    monkeypatch.setattr(
        validation_agent,
        "parse_json_from_llm",
        lambda raw: {
            "decision": "auto_approved",
            "risk_level": "LOW",
            "requires_human_approval": False,
            "audit_summary": "Looks safe",
            "recommended_action": "Approve immediately",
        },
    )

    result = validation_agent.run(600000.0, 1600000.0)

    assert result["paused_for_approval"] is True
    assert result["output"]["requires_human_approval"] is True
    assert result["output"]["rule_result"]["auto_approve"] is False
