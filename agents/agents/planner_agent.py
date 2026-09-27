"""
Agent 1 - Planner/Coordinator Agent (owned by Student 1)

Upgraded for AI Lab Architecture:
- LLM Reasoning Engine: Generates dynamic event blueprints, phase milestones, and strategic execution steps.
- High-Availability: Powered by shared LLM Client (Gemini 3.8 Flash primary with Groq Failover).
- Output: Structured multi-step plan, draft event specifications, milestone timeline, and budget allocations.
"""

from typing import Any, Dict, List, Optional
from agents.llm_client import call_llm, parse_json_from_llm


def create_event_draft(objective: str, capacity: int, budget: float, event_date: str, location: Optional[str]) -> Dict[str, Any]:
    """Tool: creates an event draft record with standardized metadata."""
    return {
        "title": objective[:80],
        "capacity": capacity,
        "budget": budget,
        "event_date": event_date,
        "location": location or "Sri Lanka",
        "status": "Draft",
    }


def create_plan_record(steps: List[str]) -> Dict[str, Any]:
    """Tool: persists the plan record."""
    return {"steps": steps, "step_count": len(steps)}


def run(objective: str, capacity: int, budget: float, event_date: str, location: Optional[str]) -> Dict[str, Any]:
    draft = create_event_draft(objective, capacity, budget, event_date, location)

    prompt = f"""You are the Planner / Coordinator Agent in an autonomous Event Management platform.
Analyze this event objective and architect an event execution blueprint.

Event Objective: "{objective}"
Target Capacity: {capacity} attendees
Total Budget: Rs. {budget:,.0f} LKR
Event Date: {event_date}
Target Location: {location or 'Flexible / Sri Lanka'}

Generate a JSON object with:
1. "title": A polished, professional event title.
2. "summary": A 1-2 sentence strategic overview.
3. "steps": An array of 5 exact operational action step codes (e.g. ["find_venue_and_vendor", "book_vendor", "create_ticket_types", "allocate_budget", "schedule_notifications"]).
4. "milestones": An array of 3 timeline phases with phase name and a list of key tasks:
   [
     {{"phase": "Phase 1: Pre-Event Logistics (T-60 Days)", "tasks": ["Task 1", "Task 2"]}},
     {{"phase": "Phase 2: Technical & AV Setup (T-14 Days)", "tasks": ["Task 1", "Task 2"]}},
     {{"phase": "Phase 3: Execution & Gate Operations (Day 0)", "tasks": ["Task 1", "Task 2"]}}
   ]
5. "budget_breakdown": An array of 4 budget categories with estimated allocations:
   [
     {{"category": "Venue & Stage Logistics", "allocated": {budget * 0.45}, "pct": "45%"}},
     {{"category": "Catering & Hospitality", "allocated": {budget * 0.30}, "pct": "30%"}},
     {{"category": "Audio/Visual & Lighting", "allocated": {budget * 0.15}, "pct": "15%"}},
     {{"category": "Contingency Reserve", "allocated": {budget * 0.10}, "pct": "10%"}}
   ]

Return STRICT JSON ONLY:"""

    raw_response, engine_name = call_llm(
        prompt,
        system_prompt="You are an expert AI event coordinator. Return valid JSON only.",
        cache_key=f"planner_{capacity}_{int(budget)}_{location}"
    )

    parsed = parse_json_from_llm(raw_response) if raw_response else None

    if parsed and isinstance(parsed, dict) and "steps" in parsed:
        steps = parsed.get("steps", [
            "find_venue_and_vendor", "book_vendor", "create_ticket_types", "allocate_budget", "schedule_notifications"
        ])
        milestones = parsed.get("milestones", [])
        budget_breakdown = parsed.get("budget_breakdown", [])
        if "title" in parsed:
            draft["title"] = parsed["title"]
        summary = parsed.get("summary", f"Autonomous event blueprint for {objective}")
    else:
        # Fallback plan
        steps = [
            "find_venue_and_vendor",
            "book_vendor",
            "create_ticket_types",
            "allocate_budget",
            "schedule_notifications",
        ]
        milestones = [
            {"phase": "Phase 1: Pre-Event Logistics (T-60 Days)", "tasks": ["Secure venue contract", "Early bird ticket rollout"]},
            {"phase": "Phase 2: Technical & AV Setup (T-14 Days)", "tasks": ["AV soundcheck", "Badge printer testing"]},
            {"phase": "Phase 3: Execution & Security (Day 0)", "tasks": ["QR gate verification", "VIP hospitality protocol"]}
        ]
        budget_breakdown = [
            {"category": "Venue & Stage Logistics", "allocated": budget * 0.45, "pct": "45%"},
            {"category": "Catering & Hospitality", "allocated": budget * 0.30, "pct": "30%"},
            {"category": "AV & Production", "allocated": budget * 0.15, "pct": "15%"},
            {"category": "Contingency Reserve", "allocated": budget * 0.10, "pct": "10%"}
        ]
        summary = f"Event planning blueprint for {objective} ({capacity} attendees, Rs. {budget:,.0f} LKR)"

    plan_record = create_plan_record(steps)

    return {
        "agent": "PlannerCoordinatorAgent",
        "input": {"objective": objective, "capacity": capacity, "budget": budget, "event_date": event_date, "location": location},
        "output": {
            "draft_event": draft,
            "plan": plan_record,
            "summary": summary,
            "milestones": milestones,
            "budget_breakdown": budget_breakdown,
            "llm_engine": engine_name,
        },
        "tool_calls": ["create_event_draft", "create_plan_record", f"llm_plan_decomposition({engine_name})"],
    }
