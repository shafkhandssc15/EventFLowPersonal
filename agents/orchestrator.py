"""
Orchestrates the 4 agents through the minimum assessed workflow (Section 6):

1. Organizer enters objective -> 2. Planner Agent creates plan -> 3. Domain
Analysis Agent ranks venues/vendors -> 4. Action Agent tentatively reserves
top choice -> 5. Validation/Safety Agent checks cost vs budget; pauses for
human approval if over threshold -> 6. Organizer approves/rejects ->
7. Workflow resumes, booking confirmed.

State (workflow + step-by-step execution log) is kept in-memory here, mirroring
the AgentWorkflow / AgentExecutionLog tables that the real system persists in
PostgreSQL. Never stores secrets, tokens, or raw model reasoning — only
structured input/output/tool-call/validation records, per spec.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from agents import planner_agent, domain_analysis_agent, action_agent, validation_agent

# workflow_id -> workflow state (mocked persistence layer)
_WORKFLOWS: Dict[str, Dict[str, Any]] = {}


def _log(workflow_id: str, agent_result: Dict[str, Any]) -> Dict[str, Any]:
    entry = {
        "id": str(uuid.uuid4()),
        "workflow_id": workflow_id,
        "agent_name": agent_result["agent"],
        "input": agent_result["input"],
        "output": agent_result["output"],
        "tool_calls": agent_result["tool_calls"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _WORKFLOWS[workflow_id]["logs"].append(entry)
    return entry


def run_workflow(workflow_id: str, objective: str, capacity: int, budget: float,
                  event_date: str, location: str | None) -> Dict[str, Any]:
    _WORKFLOWS[workflow_id] = {"logs": [], "status": "running"}

    # Step 1 — Planner/Coordinator Agent
    plan_result = planner_agent.run(objective, capacity, budget, event_date, location)
    _log(workflow_id, plan_result)

    # Step 2 — Domain Analysis Agent
    domain_result = domain_analysis_agent.run(capacity, budget, event_date, location)
    _log(workflow_id, domain_result)
    ranked_venues = domain_result["output"]["ranked_venues"]
    vendors = domain_result["output"]["vendors"]

    if not ranked_venues:
        _WORKFLOWS[workflow_id]["status"] = "failed"
        return {
            "workflow_id": workflow_id, "status": "failed",
            "reason": "no matching venue found", "logs": _WORKFLOWS[workflow_id]["logs"],
            "paused_for_approval": False,
        }

    top_venue = ranked_venues[0]

    # Step 3 — Action/Tool-use Agent (tentative reservation)
    action_result = action_agent.run(top_venue, vendors, budget)
    _log(workflow_id, action_result)
    estimated_cost = action_result["estimated_cost"]
    booking = action_result["output"]["booking"]

    # Step 4 — Validation/Safety Agent (the high-impact action gate)
    validation_result = validation_agent.run(estimated_cost, budget)
    _log(workflow_id, validation_result)

    paused = validation_result["paused_for_approval"]
    _WORKFLOWS[workflow_id].update({
        "status": "paused_for_approval" if paused else "completed",
        "top_venue": top_venue,
        "booking": booking,
        "estimated_cost": estimated_cost,
        "budget": budget,
    })

    return {
        "workflow_id": workflow_id,
        "status": _WORKFLOWS[workflow_id]["status"],
        "plan": plan_result["output"],
        "ranked_venues": ranked_venues,
        "booking": booking,
        "validation": validation_result["output"],
        "paused_for_approval": paused,
        "logs": _WORKFLOWS[workflow_id]["logs"],
    }


def resume_workflow(workflow_id: str, approved: bool) -> Dict[str, Any]:
    state = _WORKFLOWS.get(workflow_id)
    if state is None:
        return {"error": "workflow not found"}

    if approved:
        state["booking"]["status"] = "Confirmed"
        state["status"] = "completed"
        outcome = "booking_confirmed"
    else:
        state["booking"]["status"] = "Rejected"
        state["status"] = "failed"
        outcome = "booking_rejected"

    return {
        "workflow_id": workflow_id,
        "status": state["status"],
        "outcome": outcome,
        "booking": state["booking"],
        "paused_for_approval": False,
    }
