"""
Tests for the orchestrator's end-to-end plan -> delegate -> validate ->
pause/resume flow (the assignment's "minimum assessed workflow"), including
the safe-failure path and the durable-state-rehydration fix for /workflow/resume
surviving a process restart.
"""
import uuid

import pytest

import orchestrator
from agents import domain_analysis_agent


@pytest.fixture(autouse=True)
def _isolate_workflow_store():
    """Each test gets a clean in-memory workflow store."""
    orchestrator._WORKFLOWS.clear()
    yield
    orchestrator._WORKFLOWS.clear()


def _patch_no_venues(monkeypatch):
    monkeypatch.setattr(domain_analysis_agent, "search_venues", lambda capacity, location: [])
    monkeypatch.setattr(domain_analysis_agent, "search_vendors", lambda service_type=None: [])
    monkeypatch.setattr(domain_analysis_agent, "check_availability", lambda venue_id, event_date: True)


def _patch_one_cheap_venue(monkeypatch):
    monkeypatch.setattr(
        domain_analysis_agent, "search_venues",
        lambda capacity, location: [
            {"id": "venue-1", "name": "Cheap Hall", "capacity": 100, "price_per_hour": 1000, "location": "Colombo"},
        ],
    )
    monkeypatch.setattr(domain_analysis_agent, "search_vendors", lambda service_type=None: [])
    monkeypatch.setattr(domain_analysis_agent, "check_availability", lambda venue_id, event_date: True)


FUTURE_DATE = "2099-01-01T09:00:00+00:00"


def test_safe_failure_when_no_venue_matches(monkeypatch):
    _patch_no_venues(monkeypatch)
    workflow_id = str(uuid.uuid4())

    result = orchestrator.run_workflow(workflow_id, "Objective", 50, 10_000.0, FUTURE_DATE, "Colombo")

    assert result["status"] == "failed"
    assert result["reason"] == "no matching venue found"
    assert result["paused_for_approval"] is False


def test_cheap_booking_auto_completes_without_pausing(monkeypatch):
    _patch_one_cheap_venue(monkeypatch)
    workflow_id = str(uuid.uuid4())

    result = orchestrator.run_workflow(workflow_id, "Objective", 50, 10_000.0, FUTURE_DATE, "Colombo")

    assert result["status"] == "completed"
    assert result["paused_for_approval"] is False
    # All 4 distinct agents must have logged a step (Section 9.1: "at least four distinct agents").
    agent_names = {entry["agent_name"] for entry in result["logs"]}
    assert agent_names == {
        "PlannerCoordinatorAgent", "DomainAnalysisAgent", "ActionToolUseAgent", "ValidationSafetyAgent",
    }


def test_expensive_booking_pauses_then_resumes_on_approval(monkeypatch):
    # A venue priced well above the validation agent's auto-approve threshold.
    monkeypatch.setattr(
        domain_analysis_agent, "search_venues",
        lambda capacity, location: [
            {"id": "venue-1", "name": "Expensive Hall", "capacity": 100, "price_per_hour": 1_000_000, "location": "Colombo"},
        ],
    )
    monkeypatch.setattr(domain_analysis_agent, "search_vendors", lambda service_type=None: [])
    monkeypatch.setattr(domain_analysis_agent, "check_availability", lambda venue_id, event_date: True)

    workflow_id = str(uuid.uuid4())
    run_result = orchestrator.run_workflow(workflow_id, "Objective", 50, 100_000_000.0, FUTURE_DATE, "Colombo")
    assert run_result["paused_for_approval"] is True
    assert run_result["status"] == "paused_for_approval"

    resume_result = orchestrator.resume_workflow(workflow_id, approved=True)
    assert resume_result["status"] == "completed"
    assert resume_result["outcome"] == "booking_confirmed"
    assert resume_result["booking"]["status"] == "Confirmed"
    # The human-approval decision itself must be part of the auditable log.
    assert any(entry["agent_name"] == "HumanApprovalGate" for entry in resume_result["logs"])


def test_resume_rehydrates_from_prior_state_after_process_restart(monkeypatch):
    """
    Simulates the exact failure mode the durable-state fix addresses: the
    Python service restarts between /workflow/run and /workflow/resume, so
    its in-memory _WORKFLOWS dict is empty — ASP.NET Core must be able to
    replay the persisted run() response and still resolve the approval.
    """
    monkeypatch.setattr(
        domain_analysis_agent, "search_venues",
        lambda capacity, location: [
            {"id": "venue-1", "name": "Expensive Hall", "capacity": 100, "price_per_hour": 1_000_000, "location": "Colombo"},
        ],
    )
    monkeypatch.setattr(domain_analysis_agent, "search_vendors", lambda service_type=None: [])
    monkeypatch.setattr(domain_analysis_agent, "check_availability", lambda venue_id, event_date: True)

    workflow_id = str(uuid.uuid4())
    run_result = orchestrator.run_workflow(workflow_id, "Objective", 50, 100_000_000.0, FUTURE_DATE, "Colombo")
    assert run_result["paused_for_approval"] is True

    # Simulate a process restart: the in-memory store is gone.
    orchestrator._WORKFLOWS.clear()

    resume_result = orchestrator.resume_workflow(workflow_id, approved=True, prior_state=run_result)

    assert resume_result["status"] == "completed"
    assert resume_result["outcome"] == "booking_confirmed"


def test_resume_without_prior_run_or_state_is_a_safe_failure_not_a_crash():
    result = orchestrator.resume_workflow(str(uuid.uuid4()), approved=True, prior_state=None)

    assert "error" in result
    assert result["paused_for_approval"] is False
