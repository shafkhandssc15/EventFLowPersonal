"""
Agent 4 - Validation/Safety Agent (owned by Student 4)

Upgraded for AI Lab Architecture:
- LLM Compliance & Safety Auditor: Assesses proposed expenses, budget variance, and spending risk.
- High-Impact Safety Gate: Enforces mandatory human approval when expenses exceed risk thresholds or budget limits.
- High-Availability: Powered by shared LLM Client (Gemini 3.8 Flash primary with Groq Failover).
- Tools: validate_budget_rule, flag_for_approval, llm_audit_compliance
"""

from typing import Any, Dict
from agents.llm_client import call_llm, parse_json_from_llm
from agents.policy import AUTO_APPROVE_THRESHOLD_LKR, evaluate_policy

# Sri Lankan Rupee standard spending threshold (over Rs. 500,000 requires human oversight)
AUTO_APPROVE_THRESHOLD_LKR = 500000.0


def validate_budget_rule(estimated_cost: float, total_budget: float) -> Dict[str, Any]:
    """Tool: read-only check against budget rules."""
    within_budget = estimated_cost <= total_budget if total_budget > 0 else True
    under_threshold = estimated_cost <= AUTO_APPROVE_THRESHOLD_LKR
    return {
        "within_budget": within_budget,
        "under_threshold": under_threshold,
        "auto_approve": within_budget and under_threshold,
    }


def flag_for_approval(reason: str) -> Dict[str, Any]:
    """Tool: raises human-approval gate flag."""
    return {"flagged": True, "reason": reason}


def run(estimated_cost: float, total_budget: float) -> Dict[str, Any]:
    rule_result = validate_budget_rule(estimated_cost, total_budget)
    policy_result = evaluate_policy(
        estimated_cost=estimated_cost,
        total_budget=total_budget,
        capacity=350,
        event_date="2027-11-20T09:00:00Z",
        location="Colombo",
    )
    requires_approval = policy_result["requires_human_approval"]
    decision = policy_result["decision"]
    risk_level = policy_result["risk_level"]

    audit_summary = (
        f"Proposed cost Rs. {estimated_cost:,.0f} exceeds the approved budget or policy threshold, so human approval is required."
        if requires_approval
        else f"Proposed cost Rs. {estimated_cost:,.0f} is within budget and below the auto-approval threshold."
    )
    recommended_action = "Organizer sign-off required prior to locking venue reservation." if requires_approval else "Auto-approved for booking."

    prompt = f"""You are the Validation & Safety Agent in an autonomous Event Management platform.
Provide a human-friendly explanation of this compliance result.

Financial Metrics:
- Proposed Commitment: Rs. {estimated_cost:,.0f} LKR
- Total Allocated Budget: Rs. {total_budget:,.0f} LKR
- Auto-Approval Policy Threshold: Rs. {AUTO_APPROVE_THRESHOLD_LKR:,.0f} LKR
- Budget Variance: Rs. {(total_budget - estimated_cost):,.0f} LKR
- Deterministic Rule Result: {rule_result}

Rules are authoritative. Explain the rule-based outcome clearly.
Return a JSON object with:
1. "explanation": 1-2 sentence business-friendly explanation.
2. "summary": a concise summary for the organizer.
Return STRICT JSON ONLY:"""

    raw_response, engine_name = call_llm(
        prompt,
        system_prompt="You are an expert AI financial compliance and safety auditor. Explain the rule result, but do not decide compliance.",
        cache_key=f"val_{int(estimated_cost)}_{int(total_budget)}"
    )

    parsed = parse_json_from_llm(raw_response) if raw_response else None
    explanation = parsed.get("explanation") if isinstance(parsed, dict) else None
    summary = parsed.get("summary") if isinstance(parsed, dict) else None

    if not explanation:
        explanation = audit_summary
    if not summary:
        summary = recommended_action

    flag = flag_for_approval(audit_summary) if requires_approval else None

    return {
        "agent": "ValidationSafetyAgent",
        "input": {"estimated_cost": estimated_cost, "total_budget": total_budget},
        "output": {
            "decision": decision,
            "requires_human_approval": requires_approval,
            "rule_result": rule_result,
            "risk_level": risk_level,
            "audit_summary": audit_summary,
            "recommended_action": recommended_action,
            "explanation": explanation,
            "summary": summary,
            "flag": flag,
            "llm_engine": engine_name,
        },
        "tool_calls": [
            "validate_budget_rule",
            *(["flag_for_approval"] if requires_approval else []),
            f"llm_audit_compliance({engine_name})"
        ],
        "paused_for_approval": requires_approval,
    }
