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

    prompt = f"""You are the Validation & Safety Agent in an autonomous Event Management platform.
Conduct a financial safety audit and risk evaluation on the proposed event booking.

Financial Metrics:
- Proposed Commitment: Rs. {estimated_cost:,.0f} LKR
- Total Allocated Budget: Rs. {total_budget:,.0f} LKR
- Auto-Approval Policy Threshold: Rs. {AUTO_APPROVE_THRESHOLD_LKR:,.0f} LKR
- Budget Variance: Rs. {(total_budget - estimated_cost):,.0f} LKR

Safety Rules:
1. If proposed cost exceeds total budget, it is HIGH RISK and CANNOT be auto-approved.
2. If proposed cost exceeds the policy threshold (Rs. 500,000 LKR), human organizer approval is MANDATORY (high-impact action gate).
3. If within budget and under threshold, it can be AUTO-APPROVED.

Generate a JSON object with:
1. "decision": "auto_approved" OR "pending_human_approval"
2. "risk_level": "LOW", "MEDIUM", or "HIGH"
3. "requires_human_approval": true or false
4. "audit_summary": A 1-2 sentence compliance explanation detailing budget variance and safety checks.
5. "recommended_action": A concise recommendation for the organizer.

Return STRICT JSON ONLY:"""

    raw_response, engine_name = call_llm(
        prompt,
        system_prompt="You are an expert AI financial compliance and safety auditor. Return valid JSON only.",
        cache_key=f"val_{int(estimated_cost)}_{int(total_budget)}"
    )

    parsed = parse_json_from_llm(raw_response) if raw_response else None

    if parsed and isinstance(parsed, dict) and "requires_human_approval" in parsed:
        requires_approval = bool(parsed["requires_human_approval"])
        decision = parsed.get("decision", "pending_human_approval" if requires_approval else "auto_approved")
        risk_level = parsed.get("risk_level", "MEDIUM" if requires_approval else "LOW")
        audit_summary = parsed.get("audit_summary", f"Commitment of Rs. {estimated_cost:,.0f} LKR audited against budget.")
        recommended_action = parsed.get("recommended_action", "Review and authorize booking.")
    else:
        # Fallback to rule engine
        requires_approval = not rule_result["auto_approve"]
        decision = "pending_human_approval" if requires_approval else "auto_approved"
        risk_level = "HIGH" if not rule_result["within_budget"] else ("MEDIUM" if requires_approval else "LOW")
        audit_summary = (
            f"Proposed cost Rs. {estimated_cost:,.0f} exceeds auto-approval threshold Rs. {AUTO_APPROVE_THRESHOLD_LKR:,.0f} LKR."
            if requires_approval
            else f"Proposed cost Rs. {estimated_cost:,.0f} is within budget and policy limits."
        )
        recommended_action = "Organizer sign-off required prior to locking venue reservation." if requires_approval else "Auto-approved for booking."

    flag = flag_for_approval(audit_summary) if requires_approval else None

    return {
        "agent": "ValidationSafetyAgent",
        "input": {"estimated_cost": estimated_cost, "total_budget": total_budget},
        "output": {
            "decision": decision,
            "rule_result": rule_result,
            "risk_level": risk_level,
            "audit_summary": audit_summary,
            "recommended_action": recommended_action,
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
