import { useState } from "react";
import { api } from "../api/client.js";
import {
  IcZap, IcShield, IcTarget, IcSearch, IcCpu,
  IcCheck, IcX, IcCheckCircle,
  IcAlert
} from "../components/Icons.jsx";
import { formatLKR } from "../api/supabase.js";

const AGENTS = [
  { key: "PlannerCoordinatorAgent", label: "1. Planner Coordinator", Icon: IcTarget, desc: "Deconstructs objectives, architects timeline & milestones" },
  { key: "DomainAnalysisAgent",     label: "2. Domain Analysis",     Icon: IcSearch, desc: "Evaluates registered venues & vendors with fit scoring" },
  { key: "ActionToolUseAgent",      label: "3. Action & Execution",   Icon: IcZap,    desc: "Proposes ticket tiers, capacity splits & booking actions" },
  { key: "ValidationSafetyAgent",   label: "4. Validation & Safety", Icon: IcShield, desc: "Audits budget limits, compliance & human approval gates" },
  { key: "HumanApprovalGate",       label: "5. Human Approval Gate", Icon: IcCheckCircle, desc: "Records the organizer's approve/reject decision" },
];

function agentMeta(name) {
  return AGENTS.find(a => a.key === name) || { label: name, Icon: IcCpu };
}

// Logs entries carry arbitrary JSON for input/output/tool_calls — render them
// defensively without assuming a specific shape.
function prettyJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function toolCallSummary(tc) {
  if (!tc) return "—";
  if (Array.isArray(tc)) {
    return tc.map(t => (typeof t === "string" ? t : t?.name || t?.tool || JSON.stringify(t))).join(", ");
  }
  if (typeof tc === "string") {
    try {
      const parsed = JSON.parse(tc);
      return toolCallSummary(parsed);
    } catch { return tc; }
  }
  return JSON.stringify(tc);
}

export default function AgentWorkflowRunner() {
  const [form, setForm] = useState({
    objective: "Host a 250-person high-tech autonomous robotics & AI summit in Colombo with VIP networking dinner, keynote auditorium, catering, and livestreaming.",
    capacity: 250,
    budget: 1500000, // 1.5M LKR
    location: "Colombo / BMICH / Port City",
    eventDate: "",
  });

  // `workflow` holds the real backend shape: { id, eventId, status, plan }
  // where `plan` is the nested JSON object described by the API contract:
  // { workflow_id, status, plan:{draft_event, plan:{steps, step_count}},
  //   ranked_venues, booking, validation, paused_for_approval, logs }
  const [workflow, setWorkflow] = useState(null);
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function start(e) {
    e?.preventDefault();
    setError(null);
    setWorkflow(null);
    setBusy(true);

    try {
      const result = await api.startWorkflow({
        objective:  form.objective,
        capacity:   Number(form.capacity),
        budget:     Number(form.budget),
        eventDate:  new Date(form.eventDate || Date.now() + 86400000 * 60).toISOString(),
        location:   form.location,
      });
      setWorkflow(result);
    } catch (err) {
      if (err.status === 502) {
        setError("AI service unavailable — the planning agents could not be reached. Please try again shortly.");
      } else {
        setError(err.message || "Failed to run the AI Event Planner pipeline.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function decide(approve) {
    if (!workflow) return;
    setDecisionBusy(true);
    setError(null);
    try {
      const resp = await api.approveWorkflow(workflow.id, approve);
      // resp: { id, status, result } — `result` has the same shape as `plan`.
      setWorkflow(prev => ({ ...prev, id: resp.id, status: resp.status, plan: resp.result }));
    } catch (err) {
      if (err.status === 502) {
        setError("AI service unavailable while recording your decision. Please try again shortly.");
      } else {
        setError(err.message || "Failed to record the approval decision.");
      }
    } finally {
      setDecisionBusy(false);
    }
  }

  const plan = workflow?.plan || null;
  const logs = plan?.logs || [];
  const rankedVenues = plan?.ranked_venues || [];
  const booking = plan?.booking || null;
  const validation = plan?.validation || null;
  const draftEvent = plan?.plan?.draft_event || null;
  const steps = plan?.plan?.plan?.steps || [];
  const needsApproval = Boolean(plan?.paused_for_approval) || workflow?.status === "PausedForApproval";
  const noVenueFound = booking && booking.success === false;

  const statusBadge = (() => {
    if (!workflow) return null;
    if (needsApproval) return { cls: "badge-amber", label: "Paused for Approval" };
    if (workflow.status === "Completed" || plan?.status === "completed") return { cls: "badge-green", label: "Completed" };
    if (workflow.status === "Failed" || plan?.status === "failed") return { cls: "badge-red", label: "Failed" };
    return { cls: "badge-blue", label: workflow.status || "Running" };
  })();

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">AI Event Planner</span>
        <div className="topbar-actions">
          <span className="badge badge-purple">4-Agent Pipeline</span>
        </div>
      </div>

      <div className="page-head">
        <h1 className="page-title">AI Event Planner</h1>
        <p className="page-sub">
          Describe your event objective — four specialized agents will plan, analyze, execute, and validate against the real registered venues &amp; vendors.
        </p>
      </div>

      <div className="page-body">
        {/* Pipeline reference (labels only — real progress comes from the logs below) */}
        <div className="wf-steps" style={{ marginBottom: 28 }}>
          {AGENTS.slice(0, 4).map((a) => {
            const isDone = logs.some(l => (l.agent_name || l.agentName) === a.key);
            return (
              <div key={a.key} className={`wf-step ${isDone ? "done" : busy ? "active" : ""}`}>
                <div className="wf-step-idx">
                  {isDone
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : AGENTS.indexOf(a) + 1
                  }
                </div>
                <div className="wf-step-name">{a.label}</div>
                <div className="wf-step-desc">{a.desc}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 24, alignItems: "start" }}>
          {/* Input */}
          <div>
            <form onSubmit={start} className="card" style={{ background: "var(--c-bg-1)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <IcCpu style={{ width: 16, height: 16, color: "var(--c-blue)" }} />
                <span>Event Objective &amp; Constraints</span>
              </div>

              <div className="form-group">
                <label className="form-label">Describe your event objective *</label>
                <textarea className="form-input" value={form.objective}
                  style={{ minHeight: 95 }}
                  placeholder="e.g. Plan a 200-person tech summit with keynote speakers, catering, and AV in Colombo for Rs. 1,500,000"
                  onChange={e => setF("objective", e.target.value)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
                <div className="form-group">
                  <label className="form-label">Attendees (Pax)</label>
                  <input className="form-input" type="number" min="1" value={form.capacity}
                    onChange={e => setF("capacity", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Budget (LKR)</label>
                  <input className="form-input" type="number" min="0" value={form.budget}
                    onChange={e => setF("budget", e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Location / Province</label>
                <input className="form-input" value={form.location}
                  placeholder="e.g. Colombo / Western Province"
                  onChange={e => setF("location", e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Target Date (Optional)</label>
                <input className="form-input" type="datetime-local" value={form.eventDate}
                  onChange={e => setF("eventDate", e.target.value)} />
              </div>

              <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
                {busy ? (
                  <span style={{ display:"flex",alignItems:"center",gap:8, justifyContent: "center" }}>
                    <span style={{ width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.65s linear infinite",display:"inline-block" }} />
                    Running 4-Agent Pipeline…
                  </span>
                ) : (
                  <><IcCpu style={{ width: 14, height: 14 }} /> Run AI Event Planner Pipeline</>
                )}
              </button>
            </form>

            {error && (
              <div className="alert alert-error" style={{ marginTop: 12 }}>
                <IcAlert style={{ width: 14, height: 14, flexShrink: 0 }} />
                {error}
              </div>
            )}
          </div>

          {/* Output Blueprint */}
          <div>
            {!workflow ? (
              <div className="card" style={{ height: "100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", minHeight: 400, background:"var(--c-bg-1)" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(37, 99, 235, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <IcCpu style={{ width: 28, height: 28, color:"var(--c-blue)" }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color:"#ffffff", marginBottom: 6 }}>Ready for Multi-Agent Planning</div>
                <div style={{ fontSize: 13, color:"var(--c-text-3)", maxWidth: 360, lineHeight: 1.5 }}>
                  Click "Run AI Event Planner Pipeline" to trigger the 4 specialized agents against the real EventFlow backend and registered venues/vendors.
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {/* Executive Summary & Status Card */}
                <div className="card" style={{ background:"var(--c-bg-1)", border: "1px solid var(--c-blue)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize:16, fontWeight:800, color: "#ffffff" }}>
                        {draftEvent?.title || draftEvent?.Title || form.objective.slice(0, 60)}
                      </div>
                      <div style={{ fontSize:12, color:"var(--c-text-2)", marginTop: 4 }}>
                        Workflow ID: <code>{workflow.id}</code>{workflow.eventId ? <> · Event ID: <code>{workflow.eventId}</code></> : null}
                      </div>
                    </div>
                    {statusBadge && (
                      <span className={`badge ${statusBadge.cls}`} style={{ fontSize: 11, flexShrink: 0 }}>
                        {statusBadge.label}
                      </span>
                    )}
                  </div>

                  {/* Safety Gate Alert — real validation-driven human approval gate */}
                  {needsApproval && (
                    <div style={{ background:"rgba(245, 158, 11, 0.1)", border:"1px solid rgba(245, 158, 11, 0.3)", borderRadius:"var(--radius-sm)", padding: 14, marginTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <IcShield style={{ width: 16, height: 16, color: "#fbbf24" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>Validation &amp; Safety Agent: Human Approval Required</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--c-text-2)", marginBottom: 12, lineHeight: 1.5 }}>
                        {validation?.rule_result
                          ? <>Within budget: <strong>{String(validation.rule_result.within_budget)}</strong> · Under threshold: <strong>{String(validation.rule_result.under_threshold)}</strong> · Auto-approve: <strong>{String(validation.rule_result.auto_approve)}</strong>.</>
                          : "The Validation & Safety Agent flagged this plan for organizer sign-off before the booking is finalized."}
                      </div>
                      <div style={{ display:"flex", gap: 10 }}>
                        <button className="btn btn-primary btn-sm" disabled={decisionBusy} onClick={() => decide(true)}>
                          <IcCheck style={{ width: 12, height: 12 }} /> Approve &amp; Finalize Booking
                        </button>
                        <button className="btn btn-secondary btn-sm" disabled={decisionBusy} onClick={() => decide(false)} style={{ color: "#ef4444" }}>
                          <IcX style={{ width: 12, height: 12 }} /> Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {!needsApproval && validation && (
                    <div style={{ marginTop: 12, padding: "8px 12px", background: validation.decision === "auto_approved" ? "rgba(16, 185, 129, 0.1)" : "rgba(148,163,184,0.1)", borderRadius: 6, fontSize: 12, color: validation.decision === "auto_approved" ? "#34d399" : "var(--c-text-2)", fontWeight: 700 }}>
                      Validation decision: {validation.decision || "—"}
                      {booking?.status ? <> · Booking status: {booking.status}</> : null}
                    </div>
                  )}
                </div>

                {/* Safe-failure: no matching venue found */}
                {noVenueFound && (
                  <div className="alert alert-info">
                    <IcAlert style={{ width: 14, height: 14, flexShrink: 0 }} />
                    <div>
                      <strong>No bookable venue found.</strong> The Action &amp; Execution Agent could not complete a booking
                      {validation?.flag ? <> — flagged: {JSON.stringify(validation.flag)}</> : "."} This is an expected safe-failure outcome, not an error; try adjusting capacity, budget, or location.
                    </div>
                  </div>
                )}

                {/* Draft Event / Milestones */}
                {(draftEvent || steps.length > 0) && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <IcTarget style={{ width: 15, height: 15, color: "#60a5fa" }} />
                      <span>Planner Coordinator: Draft Event &amp; Plan Steps</span>
                    </div>
                    {draftEvent && (
                      <pre style={{ margin: "0 0 10px", fontSize: 11, color: "var(--c-text-2)", background: "rgba(255,255,255,0.03)", padding: 10, borderRadius: 8, border: "1px solid var(--c-border)", overflowX: "auto" }}>
{prettyJson(draftEvent)}
                      </pre>
                    )}
                    {steps.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--c-text-2)", lineHeight: 1.6 }}>
                        {steps.map((s, idx) => (
                          <li key={idx}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Ranked Venues (real registered venues, scored by Domain Analysis Agent) */}
                {rankedVenues.length > 0 && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <IcSearch style={{ width: 15, height: 15, color: "#34d399" }} />
                      <span>Domain Analysis Agent: Ranked Venues</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                      {rankedVenues.map((v, idx) => (
                        <div key={v.venueId || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--c-border)", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{v.name}</div>
                            <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>Max {Number(v.capacity || 0).toLocaleString()} pax</div>
                            {v.reason && <div style={{ fontSize: 11, color: "var(--c-text-2)", marginTop: 4 }}>{v.reason}</div>}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {v.matchScore != null && <span className="badge badge-green" style={{ fontSize: 11, fontWeight: 800 }}>{v.matchScore}% Fit</span>}
                            {v.price_per_hour != null && <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 4 }}>{formatLKR(v.price_per_hour)}/hr</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real Booking Outcome */}
                {booking && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <IcZap style={{ width: 15, height: 15, color: "#fbbf24" }} />
                      <span>Action &amp; Execution Agent: Booking</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px 14px", fontSize: 12 }}>
                      <div><span style={{ color: "var(--c-text-3)" }}>Booking ID: </span><span style={{ color: "#ffffff" }}>{booking.booking_id || "—"}</span></div>
                      <div><span style={{ color: "var(--c-text-3)" }}>Status: </span><span style={{ color: "#34d399", fontWeight: 700 }}>{booking.status || "—"}</span></div>
                      <div><span style={{ color: "var(--c-text-3)" }}>Cost: </span><span style={{ color: "#93c5fd" }}>{booking.cost != null ? formatLKR(booking.cost) : "—"}</span></div>
                      <div><span style={{ color: "var(--c-text-3)" }}>Success: </span><span>{String(Boolean(booking.success))}</span></div>
                    </div>
                  </div>
                )}

                {/* Real Agent Execution Logs — one entry per agent from the backend */}
                {logs.length > 0 && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>4-Agent Execution Log (real backend response)</div>
                    {logs.map((log, i) => {
                      const agentName = log.agent_name || log.agentName;
                      const meta = agentMeta(agentName);
                      return (
                        <div key={log.id || i} style={{ display:"flex", gap:12, paddingBottom:12, marginBottom:12, borderBottom: i < logs.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                          <div style={{ width:26, height:26, borderRadius:6, background:"rgba(16, 185, 129, 0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <meta.Icon style={{ width:12, height:12, color:"#34d399" }} />
                          </div>
                          <div style={{ flex:1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                              <div style={{ fontSize:12, fontWeight:700, color: "#ffffff" }}>{meta.label}</div>
                              {log.timestamp && <span style={{ fontSize: 10, color: "var(--c-text-3)" }}>{new Date(log.timestamp).toLocaleString()}</span>}
                            </div>
                            <div style={{ fontSize:11, color:"var(--c-text-3)", marginTop:4, fontFamily: "monospace" }}>
                              Tools: {toolCallSummary(log.tool_calls)}
                            </div>
                            {log.input != null && (
                              <details style={{ marginTop: 6 }}>
                                <summary style={{ fontSize: 11, color: "var(--c-text-3)", cursor: "pointer" }}>Input</summary>
                                <pre style={{ margin: "4px 0 0", fontSize: 10, color: "var(--c-text-2)", background: "rgba(255,255,255,0.03)", padding: 8, borderRadius: 6, overflowX: "auto" }}>{prettyJson(log.input)}</pre>
                              </details>
                            )}
                            {log.output != null && (
                              <details style={{ marginTop: 6 }}>
                                <summary style={{ fontSize: 11, color: "var(--c-text-3)", cursor: "pointer" }}>Output</summary>
                                <pre style={{ margin: "4px 0 0", fontSize: 10, color: "var(--c-text-2)", background: "rgba(255,255,255,0.03)", padding: 8, borderRadius: 6, overflowX: "auto" }}>{prettyJson(log.output)}</pre>
                              </details>
                            )}
                          </div>
                          <span className="badge badge-green" style={{ fontSize:9, alignSelf:"flex-start" }}>verified</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
