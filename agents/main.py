"""
Internal Agentic AI service. Run only as a service called by ASP.NET Core —
never exposed to React/Flutter directly (per Section 7 of the plan).

    uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from pydantic import BaseModel

import orchestrator

app = FastAPI(title="Event Management — Agentic AI Service")


class RunWorkflowRequest(BaseModel):
    workflow_id: str
    objective: str
    capacity: int
    budget: float
    event_date: str
    location: str | None = None


class ResumeWorkflowRequest(BaseModel):
    workflow_id: str
    approved: bool


@app.post("/workflow/run")
def run_workflow(req: RunWorkflowRequest):
    return orchestrator.run_workflow(
        workflow_id=req.workflow_id,
        objective=req.objective,
        capacity=req.capacity,
        budget=req.budget,
        event_date=req.event_date,
        location=req.location,
    )


@app.post("/workflow/resume")
def resume_workflow(req: ResumeWorkflowRequest):
    return orchestrator.resume_workflow(req.workflow_id, req.approved)


@app.get("/health")
def health():
    return {"status": "ok"}
