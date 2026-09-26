"""
Agent 1 - Planner/Coordinator Agent (owned by Student 1)

Input: Organizer's objective, e.g. "Set up a 200-person tech conference on Oct 15, budget $5000"
Output: Structured multi-step plan (JSON): steps = [find venue, book vendors,
        create ticket types, set budget allocation, schedule notifications]
Tools allowed: create_event_draft, create_plan_record
Delegates each step to the relevant agent below.
"""
from typing import Any, Dict


def create_event_draft(objective: str, capacity: int, budget: float, event_date: str, location: str | None) -> Dict[str, Any]:
    """Tool: creates a draft event record (mocked — in production calls ASP.NET Core /api/events)."""
    return {
        "title": objective[:80],
        "capacity": capacity,
        "budget": budget,
        "event_date": event_date,
        "location": location,
        "status": "Draft",
    }


def create_plan_record(steps: list[str]) -> Dict[str, Any]:
    """Tool: persists the plan (mocked — in production written to AgentWorkflow.plan)."""
    return {"steps": steps, "step_count": len(steps)}


def run(objective: str, capacity: int, budget: float, event_date: str, location: str | None) -> Dict[str, Any]:
    draft = create_event_draft(objective, capacity, budget, event_date, location)

    steps = [
        "find_venue_and_vendor",
        "book_vendor",
        "create_ticket_types",
        "allocate_budget",
        "schedule_notifications",
    ]
    plan_record = create_plan_record(steps)

    return {
        "agent": "PlannerCoordinatorAgent",
        "input": {"objective": objective, "capacity": capacity, "budget": budget, "event_date": event_date, "location": location},
        "output": {"draft_event": draft, "plan": plan_record},
        "tool_calls": ["create_event_draft", "create_plan_record"],
    }
