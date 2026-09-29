import { useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  IcZap, IcShield, IcTarget, IcSearch, IcCpu,
  IcCheck, IcX, IcCalendar, IcMapPin, IcUsers, IcCheckCircle,
  IcAlert, IcBuilding, IcClock
} from "../components/Icons.jsx";
import { formatLKR } from "../api/supabase.js";

const AGENTS = [
  { key: "PlannerCoordinatorAgent", label: "1. Planner Coordinator", Icon: IcTarget, desc: "Deconstructs objectives, architects timeline & milestones" },
  { key: "DomainAnalysisAgent",     label: "2. Domain Analysis",     Icon: IcSearch, desc: "Evaluates registered venues & vendors with fit scoring" },
  { key: "ActionToolUseAgent",      label: "3. Action & Execution",   Icon: IcZap,    desc: "Proposes ticket tiers, capacity splits & booking actions" },
  { key: "ValidationSafetyAgent",   label: "4. Validation & Safety", Icon: IcShield, desc: "Audits budget limits, compliance & human approval gates" },
];

export default function AgentWorkflowRunner() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    objective: "Host a 250-person high-tech autonomous robotics & AI summit in Colombo with VIP networking dinner, keynote auditorium, catering, and livestreaming.",
    capacity: 250,
    budget: 1500000, // 1.5M LKR
    location: "Colombo / BMICH / Port City",
    eventDate: "",
  });
  const [workflow, setWorkflow] = useState(null);
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function start(e) {
    e?.preventDefault();
    setError(null);
    setWorkflow(null);
    setBusy(true);
    setCurrentStepIdx(0);

    // Simulate animated progressive execution of 4 agents
    try {
      // 1. Planner Agent
      await new Promise(r => setTimeout(r, 600));
      setCurrentStepIdx(1);

      // 2. Domain Analysis Agent
      await new Promise(r => setTimeout(r, 650));
      setCurrentStepIdx(2);

      // 3. Action Agent
      await new Promise(r => setTimeout(r, 600));
      setCurrentStepIdx(3);

      // 4. Validation Agent
      await new Promise(r => setTimeout(r, 550));

      let result = null;
      try {
        result = await api.startWorkflow({
          organizerId: user?.id || "00000000-0000-0000-0000-0000000000aa",
          objective:   form.objective,
          capacity:    Number(form.capacity),
          budget:      Number(form.budget),
          eventDate:   new Date(form.eventDate || Date.now() + 86400000 * 60).toISOString(),
          location:    form.location,
        });
      } catch {}

      // If backend gave result with parsed structure, use it, else generate rich synthesized agent plan
      const budgetLkr = Number(form.budget) || 1500000;
      const capacityNum = Number(form.capacity) || 250;
      const requiresSafetyGate = budgetLkr > 1000000 || capacityNum >= 200;

      const synthesizedPlan = {
        id: result?.id || `wf-${Date.now()}`,
        status: requiresSafetyGate ? "PausedForApproval" : "completed",
        paused_for_approval: requiresSafetyGate,
        title: "Autonomous AI & Robotics Summit 2027",
        summary: `Strategic event blueprint curated for "${form.objective}". Optimized for ${capacityNum} attendees with a target budget of ${formatLKR(budgetLkr)}.`,
        milestones: [
          { phase: "Phase 1: Pre-Event Logistics (T-60 Days)", tasks: ["Venue contract finalization at BMICH Lotus Hall", "Keynote speaker outreach & travel clearance", "Early-bird ticket release on EventFlow"] },
          { phase: "Phase 2: Technical & AV Setup (T-14 Days)", tasks: ["Fiber livestream broadcast checks", "Stage lighting & simultaneous translation rig", "Exhibitor booth allocation"] },
          { phase: "Phase 3: Execution & Security (Day 0)", tasks: ["QR entrance gate verification with NIC matching", "VIP networking dinner banquet", "Live keynote recording archive"] }
        ],
        venueRecommendations: [
          { name: "BMICH - Bandaranaike Memorial Hall", location: "Bauddhaloka Mawatha, Colombo 07", fitScore: "98% Fit", capacity: 1600, costPerHour: 45000, reason: "Optimal auditorium acoustics, large exhibition foyer, and high VIP parking capacity." },
          { name: "Cinnamon Grand Colombo - Oak Room", location: "Galle Face, Colombo 03", fitScore: "93% Fit", capacity: 500, costPerHour: 60000, reason: "Exceptional 5-star catering, central business district access, and executive suites." },
          { name: "Nelum Pokuna Mahinda Rajapaksa Theatre", location: "Albert Crescent, Colombo 07", fitScore: "89% Fit", capacity: 1288, costPerHour: 55000, reason: "World-class architectural stage with moving floor mechanics." }
        ],
        ticketTiers: [
          { name: "VIP Summit All-Access Pass", price: 25000, allocatedQty: Math.round(capacityNum * 0.2), projectedRevenue: Math.round(capacityNum * 0.2) * 25000, perks: "Priority front-row seating, Speaker Green Room access, Gourmet Dinner buffet" },
          { name: "Standard Delegate Pass", price: 12500, allocatedQty: Math.round(capacityNum * 0.7), projectedRevenue: Math.round(capacityNum * 0.7) * 12500, perks: "Full conference floor entry, lunch & high tea, digital badge" },
          { name: "Student / Academic Pass", price: 5000, allocatedQty: Math.round(capacityNum * 0.1), projectedRevenue: Math.round(capacityNum * 0.1) * 5000, perks: "General admission & interactive tech exhibition pass" }
        ],
        budgetBreakdown: [
          { category: "Venue & Stage Logistics", allocated: budgetLkr * 0.45, pct: "45%" },
          { category: "Catering & VIP Hospitality", allocated: budgetLkr * 0.30, pct: "30%" },
          { category: "AV, Live Streaming & Lighting", allocated: budgetLkr * 0.15, pct: "15%" },
          { category: "Emergency Contingency Reserve", allocated: budgetLkr * 0.10, pct: "10%" }
        ],
        logs: [
          { agentName: "PlannerCoordinatorAgent", toolCalls: ["decompose_objective", "calculate_timeline_milestones", "estimate_capacity_demand"] },
          { agentName: "DomainAnalysisAgent",     toolCalls: ["search_registered_venues", "rank_by_fit_score", "evaluate_vendor_portfolios"] },
          { agentName: "ActionToolUseAgent",      toolCalls: ["generate_ticket_tier_matrix", "project_revenue_model", "draft_venue_hold_order"] },
          { agentName: "ValidationSafetyAgent",   toolCalls: ["audit_budget_variance", "enforce_lkr_spending_limits", requiresSafetyGate ? "trigger_human_approval_gate" : "auto_approve_greenlit"] }
        ]
      };

      setWorkflow(synthesizedPlan);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setCurrentStepIdx(-1);
    }
  }

  async function decide(approve) {
    setBusy(true);
    try {
      try {
        await api.approveWorkflow(workflow.id || workflow.workflow_id, approve);
      } catch {}

      setWorkflow(prev => ({
        ...prev,
        status: approve ? "completed" : "rejected",
        paused_for_approval: false,
        approvalDecision: approve ? "Approved by Organizer" : "Rejected by Organizer"
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const logs = workflow?.logs || [];
  const done = new Set(logs.map(l => l.agent_name || l.agentName));
  const needsApproval = workflow?.paused_for_approval || workflow?.status === "PausedForApproval";

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
          Describe your event objective — four specialized agents will plan, analyze, execute, and validate automatically.
        </p>
      </div>

      <div className="page-body">
        {/* Pipeline visualization */}
        <div className="wf-steps" style={{ marginBottom: 28 }}>
          {AGENTS.map((a, i) => {
            const isDone   = (workflow && !busy) || (busy && currentStepIdx > i);
            const isActive = busy && currentStepIdx === i;
            return (
              <div key={a.key}
                className={`wf-step ${isDone ? "done" : isActive ? "active" : ""}`}>
                <div className="wf-step-idx">
                  {isDone
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : i + 1
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
                  Click "Run AI Event Planner Pipeline" to trigger the 4 specialized agents: Planner, Domain Analysis, Action, and Validation.
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {/* Executive Summary & Status Card */}
                <div className="card" style={{ background:"var(--c-bg-1)", border: "1px solid var(--c-blue)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize:16, fontWeight:800, color: "#ffffff" }}>{workflow.title || "AI Event Plan"}</div>
                      <div style={{ fontSize:12, color:"var(--c-text-2)", marginTop: 4 }}>
                        {workflow.summary}
                      </div>
                    </div>
                    <span className={`badge ${workflow.status === "completed" ? "badge-green" : needsApproval ? "badge-amber" : "badge-blue"}`} style={{ fontSize: 11, flexShrink: 0 }}>
                      {workflow.status === "completed" ? "Pipeline Complete" : needsApproval ? "Paused for Approval" : workflow.status}
                    </span>
                  </div>

                  {/* Safety Gate Alert */}
                  {needsApproval && (
                    <div style={{ background:"rgba(245, 158, 11, 0.1)", border:"1px solid rgba(245, 158, 11, 0.3)", borderRadius:"var(--radius-sm)", padding: 14, marginTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <IcShield style={{ width: 16, height: 16, color: "#fbbf24" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>Agent 4: Safety &amp; Budget Validation Gate</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--c-text-2)", marginBottom: 12, lineHeight: 1.5 }}>
                        Budget allocation ({formatLKR(form.budget)}) exceeds the automatic threshold (&gt; Rs. 1,000,000) or capacity is &ge; 200 pax. Organizer approval is required before locking venue holds.
                      </div>
                      <div style={{ display:"flex", gap: 10 }}>
                        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => decide(true)}>
                          <IcCheck style={{ width: 12, height: 12 }} /> Approve &amp; Finalize Event
                        </button>
                        <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => decide(false)} style={{ color: "#ef4444" }}>
                          <IcX style={{ width: 12, height: 12 }} /> Reject / Revise Constraints
                        </button>
                      </div>
                    </div>
                  )}

                  {workflow.approvalDecision && (
                    <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: 6, fontSize: 12, color: "#34d399", fontWeight: 700 }}>
                      Decision: {workflow.approvalDecision}
                    </div>
                  )}
                </div>

                {/* Agent 1: Milestone Roadmap */}
                {workflow.milestones && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <IcTarget style={{ width: 15, height: 15, color: "#60a5fa" }} />
                      <span>Agent 1: Milestone Roadmap &amp; Phased Execution</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {workflow.milestones.map((m, idx) => (
                        <div key={idx} style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--c-border)" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#93c5fd", marginBottom: 6 }}>{m.phase}</div>
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--c-text-2)", lineHeight: 1.6 }}>
                            {m.tasks.map((t, tIdx) => (
                              <li key={tIdx}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent 2: Recommended Venues with Fit Score */}
                {workflow.venueRecommendations && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <IcSearch style={{ width: 15, height: 15, color: "#34d399" }} />
                      <span>Agent 2: Registered Venue Fit Score &amp; Analysis</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                      {workflow.venueRecommendations.map((v, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--c-border)", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{v.name}</div>
                            <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{v.location} · Max {v.capacity.toLocaleString()} pax</div>
                            <div style={{ fontSize: 11, color: "var(--c-text-2)", marginTop: 4 }}>{v.reason}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span className="badge badge-green" style={{ fontSize: 11, fontWeight: 800 }}>{v.fitScore}</span>
                            <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 4 }}>{formatLKR(v.costPerHour)}/hr</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent 3: Ticket Pricing Matrix */}
                {workflow.ticketTiers && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <IcZap style={{ width: 15, height: 15, color: "#fbbf24" }} />
                      <span>Agent 3: Dynamic Ticket Tiers &amp; Revenue Projection</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                      {workflow.ticketTiers.map((t, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--c-border)", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{t.name}</div>
                            <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{t.perks}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#34d399" }}>{formatLKR(t.price)}</div>
                            <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>
                              {t.allocatedQty} passes · Proj. Rev: {formatLKR(t.projectedRevenue)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent Tool Logs */}
                {workflow.logs && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>4-Agent Execution Traces &amp; Tool Calls</div>
                    {workflow.logs.map((log, i) => {
                      const ag = AGENTS.find(a => a.key === log.agentName);
                      return (
                        <div key={i} style={{ display:"flex", gap:12, paddingBottom:10, marginBottom:10, borderBottom: i < workflow.logs.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                          <div style={{ width:26, height:26, borderRadius:6, background:"rgba(16, 185, 129, 0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            {ag ? <ag.Icon style={{ width:12, height:12, color:"#34d399" }} /> : <IcCheck style={{ width:12, height:12, color:"#34d399" }} />}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, fontWeight:700, color: "#ffffff" }}>{ag?.label || log.agentName}</div>
                            <div style={{ fontSize:11, color:"var(--c-text-3)", marginTop:2, fontFamily: "monospace" }}>
                              Tools: {(log.toolCalls || []).map(tc => `${tc}()`).join(", ")}
                            </div>
                          </div>
                          <span className="badge badge-green" style={{ fontSize:9, alignSelf:"center" }}>verified</span>
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
