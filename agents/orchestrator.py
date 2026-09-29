"""
Orchestrates the 4 agents through the minimum assessed workflow (Section 6).
Updated to persist AgentWorkflow and AgentExecutionLog directly to Supabase.
"""
import uuid
import os
import json
import httpx
from datetime import datetime, timezone
from typing import Any, Dict

from dotenv import load_dotenv

from agents import planner_agent, domain_analysis_agent, action_agent, validation_agent
from agents.policy import evaluate_policy
from agents.state_machine import transition, workflow_summary

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://fndjylgegtzjxdkkqjql.supabase.co").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY", "sb_publishable_e1z-H7yT8G90cUwHcEKvWQ_t5-MpoPg")

def _get_supabase_headers() -> Dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

def _log(workflow_id: str, agent_result: Dict[str, Any]) -> Dict[str, Any]:
    entry = {
        "id": str(uuid.uuid4()),
        "workflow_id": workflow_id,
        "agent_name": agent_result["agent"],
        "action": agent_result.get("action", "execute"),
        "input": agent_result["input"],
        "output": agent_result["output"],
        "tool_calls": agent_result.get("tool_calls", []),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    
    url = f"{SUPABASE_URL}/rest/v1/agent_execution_logs"
    with httpx.Client(timeout=10.0) as client:
        try:
            client.post(url, headers=_get_supabase_headers(), json=entry)
        except Exception as e:
            print(f"[Orchestrator] Error saving log to Supabase: {e}")
            
    return entry

def _update_workflow(workflow_id: str, data: Dict[str, Any]):
    url = f"{SUPABASE_URL}/rest/v1/agent_workflows?id=eq.{workflow_id}"
    with httpx.Client(timeout=10.0) as client:
        try:
            client.patch(url, headers=_get_supabase_headers(), json=data)
        except Exception as e:
            print(f"[Orchestrator] Error updating workflow in Supabase: {e}")

def run_workflow(workflow_id: str, objective: str, capacity: int, budget: float,
                  event_date: str, location: str | None) -> Dict[str, Any]:
    
    state = "Running"
    logs = []

    # Step 1 — Planner/Coordinator Agent
    plan_result = planner_agent.run(objective, capacity, budget, event_date, location)
    logs.append(_log(workflow_id, plan_result))
    _update_workflow(workflow_id, {"plan": plan_result["output"], "current_step": "plan"})

    # Step 2 — Domain Analysis Agent
    domain_result = domain_analysis_agent.run(capacity, budget, event_date, location)
    logs.append(_log(workflow_id, domain_result))
    ranked_venues = domain_result["output"]["ranked_venues"]
    vendors = domain_result["output"]["vendors"]
    _update_workflow(workflow_id, {"current_step": "domain"})

    if not ranked_venues:
        state = "Failed"
        _update_workflow(workflow_id, {"status": state})
        return {
            "workflow_id": workflow_id, "status": state,
            "reason": "no matching venue found", "logs": logs,
            "paused_for_approval": False,
        }

    top_venue = ranked_venues[0]

    # Step 3 — Action/Tool-use Agent (tentative reservation)
    action_result = action_agent.run(top_venue, vendors, budget)
    logs.append(_log(workflow_id, action_result))
    estimated_cost = action_result["estimated_cost"]
    booking = action_result["output"]["booking"]
    _update_workflow(workflow_id, {"current_step": "action"})

    # Step 4 — Validation/Safety Agent (rule-first approval gate)
    validation_result = validation_agent.run(estimated_cost, budget)
    logs.append(_log(workflow_id, validation_result))
    paused = bool(validation_result.get("output", {}).get("requires_human_approval", validation_result.get("paused_for_approval", False)))

    if paused:
        state = "PausedForApproval"
        _update_workflow(workflow_id, {"status": state, "approval_status": "Pending", "current_step": "validation"})
    else:
        state = "Completed"
        _update_workflow(workflow_id, {"status": state, "approval_status": "NotRequired", "current_step": "completed", "completed_at": datetime.now(timezone.utc).isoformat()})

    return {
        "workflow_id": workflow_id,
        "status": state,
        "plan": plan_result["output"],
        "ranked_venues": ranked_venues,
        "booking": booking,
        "validation": validation_result["output"],
        "paused_for_approval": paused,
        "logs": logs,
    }


def resume_workflow(workflow_id: str, approved: bool) -> Dict[str, Any]:
    url = f"{SUPABASE_URL}/rest/v1/agent_workflows?id=eq.{workflow_id}&select=*"
    state_doc = None
    with httpx.Client(timeout=10.0) as client:
        res = client.get(url, headers=_get_supabase_headers())
        if res.status_code == 200 and len(res.json()) > 0:
            state_doc = res.json()[0]

    if not state_doc:
        return {"error": "workflow not found"}

    if approved:
        _update_workflow(workflow_id, {
            "status": "Completed", 
            "approval_status": "Approved",
            "current_step": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        })
        outcome = "booking_confirmed"
        final_state = "Completed"
    else:
        _update_workflow(workflow_id, {
            "status": "Failed", 
            "approval_status": "Rejected",
            "current_step": "failed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        })
        outcome = "booking_rejected"
        final_state = "Failed"

    return {
        "workflow_id": workflow_id,
        "status": final_state,
        "outcome": outcome,
        # We fake the booking info since we only store plan in agent_workflows DB schema.
        # But this suffices to remove the mock memory persistence.
        "booking": {"status": "Confirmed" if approved else "Rejected"},
        "paused_for_approval": False,
    }
