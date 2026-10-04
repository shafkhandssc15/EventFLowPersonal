import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "../context/RealtimeContext.jsx";
import { runAIAgentWorkflow } from "../api/aiAgent.js";
import {
  IcZap, IcShield, IcTarget, IcSearch, IcCpu,
  IcCheck, IcX, IcCalendar, IcMapPin, IcUsers, IcCheckCircle,
  IcAlert, IcBuilding, IcClock, IcSparkles, IcTag, IcPlus
} from "../components/Icons.jsx";
import { formatLKR, supabase } from "../api/supabase.js";

const AGENTS = [
  { key: "PlannerCoordinatorAgent", label: "1. Planner Coordinator", Icon: IcTarget, desc: "Deconstructs objectives, architects timeline & milestones" },
  { key: "DomainAnalysisAgent",     label: "2. Domain Analysis",     Icon: IcSearch, desc: "Evaluates registered venues & vendors with fit scoring" },
  { key: "ActionToolUseAgent",      label: "3. Action & Execution",   Icon: IcZap,    desc: "Proposes ticket tiers, capacity splits & booking actions" },
  { key: "ValidationSafetyAgent",   label: "4. Validation & Safety", Icon: IcShield, desc: "Audits budget limits, compliance & human approval gates" },
];

export default function AgentWorkflowRunner() {
  const { user } = useAuth();
  const { venues, saveEvent } = useRealtime();

  const [form, setForm] = useState({
    objective: "Host a 500-person high-tech musical in Galle with VIP networking dinner, keynote auditorium, catering, and livestreaming.",
    capacity: 500,
    budget: 15000000,
    location: "Galle / Southern Province",
    eventDate: "",
  });

  const [workflow, setWorkflow] = useState(null);
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [deployedEventId, setDeployedEventId] = useState(null);
  const [deploySuccess, setDeploySuccess] = useState(false);

  // Revision & Editing Studio State (Triggered by "Reject / Revise")
  const [isRevising, setIsRevising] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [editFields, setEditFields] = useState({
    title: "",
    capacity: 500,
    budget: 15000000,
    location: "",
    ticketTiers: []
  });

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  // Execute 4-Agent Pipeline
  async function start(e, overrideNotes = "") {
    e?.preventDefault();
    if (!form.objective.trim()) {
      setError("Please describe your event objective.");
      return;
    }

    setError(null);
    setWorkflow(null);
    setIsRevising(false);
    setBusy(true);
    setDeployedEventId(null);
    setDeploySuccess(false);
    setCurrentStepIdx(0);

    try {
      // Step 1: Planner Agent
      await new Promise(r => setTimeout(r, 450));
      setCurrentStepIdx(1);

      // Step 2: Domain Analysis Agent
      await new Promise(r => setTimeout(r, 450));
      setCurrentStepIdx(2);

      // Step 3: Action Agent
      await new Promise(r => setTimeout(r, 450));
      setCurrentStepIdx(3);

      // Step 4: Validation Agent
      await new Promise(r => setTimeout(r, 400));

      // Invoke real 4-agent workflow with Supabase + Live LLM
      const plan = await runAIAgentWorkflow({
        objective: form.objective,
        capacity: Number(form.capacity),
        budget: Number(form.budget),
        location: form.location,
        eventDate: form.eventDate,
        refinementNotes: overrideNotes || revisionNotes
      });

      setWorkflow(plan);
    } catch (err) {
      setError(err.message || "Failed to generate AI plan");
    } finally {
      setBusy(false);
      setCurrentStepIdx(-1);
    }
  }

  // Open the Revision & Editing Studio when Organizer clicks Reject / Revise
  function handleOpenRevision() {
    if (!workflow) return;
    setEditFields({
      title: workflow.title || "",
      capacity: form.capacity,
      budget: form.budget,
      location: form.location,
      ticketTiers: JSON.parse(JSON.stringify(workflow.ticketTiers || []))
    });
    setIsRevising(true);
  }

  // Apply manual edits directly to active blueprint
  function handleSaveManualEdits() {
    setWorkflow(prev => {
      if (!prev) return prev;
      const updatedTiers = (editFields.ticketTiers || []).map(t => ({
        ...t,
        price: Number(t.price) || 0,
        allocatedQty: Number(t.allocatedQty) || 0,
        projectedRevenue: (Number(t.price) || 0) * (Number(t.allocatedQty) || 0)
      }));

      return {
        ...prev,
        title: editFields.title || prev.title,
        status: "completed",
        paused_for_approval: false,
        approvalDecision: "Approved with Custom Organizer Revisions",
        ticketTiers: updatedTiers,
        summary: `Strategic event blueprint customized by Organizer. Configured for ${editFields.capacity} attendees with revised budget of ${formatLKR(editFields.budget)}.`
      };
    });

    setForm(f => ({
      ...f,
      capacity: editFields.capacity,
      budget: editFields.budget,
      location: editFields.location
    }));

    setIsRevising(false);
  }

  // Re-run the 4-agent pipeline with revised constraints and feedback notes
  function handleRerunWithRevisions(e) {
    e?.preventDefault();
    setForm(f => ({
      ...f,
      capacity: editFields.capacity,
      budget: editFields.budget,
      location: editFields.location
    }));
    start(e, revisionNotes);
  }

  // Organizer Direct Approval
  function decide(approve) {
    if (!approve) {
      handleOpenRevision();
      return;
    }

    setWorkflow(prev => ({
      ...prev,
      status: "completed",
      paused_for_approval: false,
      approvalDecision: "Approved & Greenlit by Organizer"
    }));
  }

  // Deploy this generated plan directly as a real event in Supabase
  async function handleDeployEvent() {
    if (!workflow) return;
    setBusy(true);
    setError(null);

    try {
      const topVenue = workflow.venueRecommendations?.[0];
      const targetDate = form.eventDate
        ? new Date(form.eventDate).toISOString()
        : new Date(Date.now() + 86400000 * 45).toISOString();
      const targetEndDate = new Date(new Date(targetDate).getTime() + 3600000 * 8).toISOString();

      // Form ticket types
      const mappedTicketTypes = (workflow.ticketTiers || []).map((t) => ({
        id: crypto.randomUUID(),
        name: t.name,
        price: Number(t.price) || 0,
        capacity: Number(t.allocatedQty) || 50,
        available: Number(t.allocatedQty) || 50,
      }));

      const newEvent = {
        id: crypto.randomUUID(),
        organizerId: user?.id || "00000000-0000-0000-0000-0000000000aa",
        organizerName: user?.name || user?.email || "EventFlow Organizer",
        organizerEmail: user?.email || "",
        title: workflow.title,
        description: workflow.summary,
        category: workflow.category || "Concert",
        location: topVenue ? `${topVenue.name}, ${topVenue.location}` : (form.location || "Galle, Sri Lanka"),
        venueId: topVenue?.id || "",
        capacity: Number(form.capacity) || 500,
        startDate: targetDate,
        endDate: targetEndDate,
        status: "Published",
        ticketTypes: mappedTicketTypes,
        createdAt: new Date().toISOString()
      };

      if (saveEvent) {
        await saveEvent(newEvent);
      } else {
        await supabase.from("Events").insert({
          Id: newEvent.id,
          OrganizerId: newEvent.organizerId,
          Title: newEvent.title,
          Description: newEvent.description,
          Category: newEvent.category,
          Location: newEvent.location,
          VenueId: newEvent.venueId,
          Capacity: newEvent.capacity,
          StartDate: newEvent.startDate,
          EndDate: newEvent.endDate,
          Status: newEvent.status,
          CreatedAt: newEvent.createdAt
        });
      }

      setDeployedEventId(newEvent.id);
      setDeploySuccess(true);
    } catch (err) {
      setError("Failed to deploy event: " + (err.message || String(err)));
    } finally {
      setBusy(false);
    }
  }

  const needsApproval = workflow?.paused_for_approval || workflow?.status === "PausedForApproval";

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">AI Event Planner</span>
        <div className="topbar-actions">
          <span className="badge badge-purple">4-Agent Autonomous Pipeline</span>
        </div>
      </div>

      <div className="page-head">
        <h1 className="page-title">AI Event Planner</h1>
        <p className="page-sub">
          Describe any event idea — the 4-agent pipeline queries real Supabase venues, synthesizes milestones, models ticket tiers, and provides interactive revision options.
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
          {/* Input Form */}
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
                  placeholder="e.g. Host a 500-person high-tech musical in Galle with VIP networking dinner, catering, and livestreaming."
                  onChange={e => setF("objective", e.target.value)} />
              </div>

              {/* Quick suggestions pills */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "var(--c-text-3)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <IcSparkles style={{ width: 11, height: 11, color: "var(--c-blue)" }} />
                  <span>Try popular prompts:</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { label: "Galle Musical", prompt: "Host a 500-person high-tech musical in Galle with VIP networking dinner, keynote auditorium, catering, and livestreaming.", cap: 500, bud: 15000000, loc: "Galle / Southern Province" },
                    { label: "Badminton Tournament", prompt: "Inter-school championship badminton tournament in Kandy with refereeing, player boxes, and trophies", cap: 300, bud: 1200000, loc: "Kandy" },
                    { label: "Medical Congress", prompt: "Annual pediatric medicine and surgical doctors conference in Colombo with research presentations", cap: 250, bud: 1800000, loc: "Colombo" },
                    { label: "Luxury Gala Banquet", prompt: "Grand corporate gala dinner & awards evening in Battaramulla with 5-course dining and champagne toast", cap: 200, bud: 2200000, loc: "Battaramulla" }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setForm({
                          objective: p.prompt,
                          capacity: p.cap,
                          budget: p.bud,
                          location: p.loc,
                          eventDate: ""
                        });
                      }}
                      style={{
                        fontSize: 11,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--c-border)",
                        borderRadius: 12,
                        padding: "3px 8px",
                        color: "var(--c-text-2)",
                        cursor: "pointer"
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
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
                <label className="form-label">Preferred Location / City</label>
                <input className="form-input" value={form.location}
                  placeholder="e.g. Galle, Kandy, Colombo, or Battaramulla"
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
                  Click &quot;Run AI Event Planner Pipeline&quot; to trigger the 4 specialized agents: Planner, Domain Analysis, Action, and Validation.
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                {/* Interactive Revision Studio (Shown when user clicks Reject / Revise) */}
                {isRevising && (
                  <div className="card" style={{ background:"rgba(245, 158, 11, 0.05)", border: "1px solid #f59e0b", padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <IcShield style={{ width: 18, height: 18, color: "#fbbf24" }} />
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#fbbf24" }}>
                          AI Agent Revision &amp; Customization Studio
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsRevising(false)}
                        style={{ background: "transparent", border: "none", color: "var(--c-text-3)", cursor: "pointer" }}
                      >
                        <IcX style={{ width: 16, height: 16 }} />
                      </button>
                    </div>

                    <div style={{ fontSize: 12, color: "var(--c-text-2)", marginBottom: 14 }}>
                      Provide specific feedback to guide the 4 agents in re-planning, or directly fine-tune the parameters below:
                    </div>

                    <div className="form-group">
                      <label className="form-label">Refinement Instructions for Agents</label>
                      <textarea
                        className="form-input"
                        style={{ minHeight: 65 }}
                        placeholder="e.g. Choose an oceanfront venue in Galle, reduce VIP ticket price, or add extra sound logistics..."
                        value={revisionNotes}
                        onChange={e => setRevisionNotes(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                      <div className="form-group">
                        <label className="form-label">Event Title Override</label>
                        <input
                          className="form-input"
                          value={editFields.title}
                          onChange={e => setEditFields(f => ({ ...f, title: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Target Location</label>
                        <input
                          className="form-input"
                          value={editFields.location}
                          onChange={e => setEditFields(f => ({ ...f, location: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                      <div className="form-group">
                        <label className="form-label">Capacity (Pax)</label>
                        <input
                          className="form-input"
                          type="number"
                          value={editFields.capacity}
                          onChange={e => setEditFields(f => ({ ...f, capacity: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Budget (LKR)</label>
                        <input
                          className="form-input"
                          type="number"
                          value={editFields.budget}
                          onChange={e => setEditFields(f => ({ ...f, budget: Number(e.target.value) }))}
                        />
                      </div>
                    </div>

                    {/* Inline Ticket Tier Editor */}
                    <div style={{ marginTop: 10, marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        <IcTag style={{ width: 13, height: 13, color: "#fbbf24" }} />
                        <span>Customize Ticket Tiers</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {editFields.ticketTiers.map((t, idx) => (
                          <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, padding: 8, background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                            <input
                              className="form-input"
                              placeholder="Tier Name"
                              value={t.name}
                              onChange={e => {
                                const val = e.target.value;
                                setEditFields(prev => {
                                  const updated = [...prev.ticketTiers];
                                  updated[idx].name = val;
                                  return { ...prev, ticketTiers: updated };
                                });
                              }}
                            />
                            <input
                              className="form-input"
                              type="number"
                              placeholder="Price"
                              value={t.price}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setEditFields(prev => {
                                  const updated = [...prev.ticketTiers];
                                  updated[idx].price = val;
                                  return { ...prev, ticketTiers: updated };
                                });
                              }}
                            />
                            <input
                              className="form-input"
                              type="number"
                              placeholder="Seats"
                              value={t.allocatedQty}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setEditFields(prev => {
                                  const updated = [...prev.ticketTiers];
                                  updated[idx].allocatedQty = val;
                                  return { ...prev, ticketTiers: updated };
                                });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setIsRevising(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ borderColor: "#10b981", color: "#34d399" }}
                        onClick={handleSaveManualEdits}
                      >
                        <IcCheck style={{ width: 12, height: 12 }} /> Save Manual Edits
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busy}
                        onClick={handleRerunWithRevisions}
                      >
                        <IcCpu style={{ width: 12, height: 12 }} /> Re-run 4-Agent Pipeline
                      </button>
                    </div>
                  </div>
                )}

                {/* Executive Summary & Status Card */}
                <div className="card" style={{ background:"var(--c-bg-1)", border: "1px solid var(--c-blue)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>
                        {workflow.title}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--c-text-2)", marginTop: 6, lineHeight: 1.5 }}>
                        {workflow.summary}
                      </div>
                      {workflow.llmEngine && (
                        <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                          <IcCpu style={{ width: 11, height: 11, color: "#60a5fa" }} />
                          <span>Generated by: {workflow.llmEngine}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <span className={`badge ${workflow.status === "completed" ? "badge-green" : needsApproval ? "badge-amber" : "badge-blue"}`} style={{ fontSize: 11 }}>
                        {workflow.status === "completed" ? "Pipeline Complete" : needsApproval ? "Paused for Approval" : workflow.status}
                      </span>
                      {workflow.category && (
                        <span className="badge badge-purple" style={{ fontSize: 10 }}>{workflow.category}</span>
                      )}
                    </div>
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
                      <div style={{ display:"flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => decide(true)}>
                          <IcCheck style={{ width: 12, height: 12 }} /> Approve &amp; Finalize Event
                        </button>
                        <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => decide(false)} style={{ color: "#fbbf24", borderColor: "rgba(245, 158, 11, 0.4)" }}>
                          <IcZap style={{ width: 12, height: 12 }} /> Reject &amp; Revise Constraints
                        </button>
                      </div>
                    </div>
                  )}

                  {workflow.approvalDecision && (
                    <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: 6, fontSize: 12, color: "#34d399", fontWeight: 700 }}>
                      Decision: {workflow.approvalDecision}
                    </div>
                  )}

                  {/* Deploy Event Action */}
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--c-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>
                      Satisfied with this agent plan? You can publish it directly to the platform as a live event.
                    </div>
                    {deploySuccess ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, color: "#34d399", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                          <IcCheckCircle style={{ width: 14, height: 14 }} /> Event Created in Supabase!
                        </span>
                        <Link to={`/events/${deployedEventId}`} className="btn btn-primary btn-sm">
                          View Live Event &rarr;
                        </Link>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        {!isRevising && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleOpenRevision}
                          >
                            Customize / Revise
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busy}
                          onClick={handleDeployEvent}
                        >
                          <IcSparkles style={{ width: 13, height: 13 }} /> Deploy as Live Event
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Agent 1: Milestone Roadmap */}
                {workflow.milestones && workflow.milestones.length > 0 && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                        <IcTarget style={{ width: 15, height: 15, color: "#60a5fa" }} />
                        <span>Agent 1: Milestone Roadmap &amp; Phased Execution</span>
                      </div>
                      {workflow.plannerStrategy && (
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <span className="badge badge-blue" style={{ fontSize: 10, textTransform: "capitalize" }}>
                            {workflow.plannerStrategy.domain} Domain
                          </span>
                          <span className="badge badge-purple" style={{ fontSize: 10 }}>
                            {workflow.plannerStrategy.complexity}
                          </span>
                        </div>
                      )}
                    </div>

                    {workflow.plannerStrategy?.criticalPath && (
                      <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, fontSize: 11, color: "#fca5a5", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 800, color: "#ef4444" }}>⚡ Critical Path:</span>
                        <span>{workflow.plannerStrategy.criticalPath}</span>
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {workflow.milestones.map((m, idx) => (
                        <div key={idx} style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--c-border)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd" }}>{m.phase}</div>
                            <span className="badge badge-gray" style={{ fontSize: 10, padding: "1px 6px" }}>
                              {(m.tasks || []).length} Action Items
                            </span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {(m.tasks || []).map((t, tIdx) => {
                              const isObj = typeof t === "object" && t !== null;
                              const taskText = isObj ? (t.task || t.name || JSON.stringify(t)) : String(t);
                              const owner = isObj ? t.owner : null;
                              const priority = isObj ? t.priority : null;
                              const count = isObj ? t.count : null;
                              const deliverable = isObj ? t.deliverable : null;
                              const isCrit = priority === "Critical Path";
                              const isHigh = priority === "High Priority";

                              return (
                                <div key={tIdx} style={{ padding: 10, background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                                    <div style={{ fontSize: 12, color: "#ffffff", flex: 1, minWidth: 200, lineHeight: 1.5 }}>
                                      {taskText}
                                    </div>
                                    <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                                      {priority && (
                                        <span className={`badge ${isCrit ? "badge-red" : isHigh ? "badge-amber" : "badge-blue"}`} style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
                                          {priority}
                                        </span>
                                      )}
                                      {count && (
                                        <span className="badge badge-purple" style={{ fontSize: 10, padding: "1px 6px" }}>
                                          {count}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {(owner || deliverable) && (
                                    <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11, color: "var(--c-text-3)", flexWrap: "wrap" }}>
                                      {owner && (
                                        <span>
                                          <strong style={{ color: "var(--c-text-2)" }}>Lead:</strong> {owner}
                                        </span>
                                      )}
                                      {deliverable && (
                                        <span>
                                          <strong style={{ color: "var(--c-text-2)" }}>Deliverable:</strong> {deliverable}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent 2: Recommended Venues with Fit Score */}
                {workflow.venueRecommendations && workflow.venueRecommendations.length > 0 && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <IcSearch style={{ width: 15, height: 15, color: "#34d399" }} />
                      <span>Agent 2: Registered Venue Fit Score &amp; Geospatial Analysis (from Supabase)</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                      {workflow.venueRecommendations.map((v, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--c-border)", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 220 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{v.name}</div>
                            <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>
                              <IcMapPin style={{ width: 11, height: 11, display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                              {v.location} · Max {Number(v.capacity).toLocaleString()} pax
                            </div>
                            <div style={{ fontSize: 11, color: "var(--c-text-2)", marginTop: 4 }}>{v.reason}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span className={`badge ${parseInt(v.fitScore, 10) >= 80 ? "badge-green" : parseInt(v.fitScore, 10) >= 70 ? "badge-blue" : "badge-amber"}`} style={{ fontSize: 11, fontWeight: 800 }}>{v.fitScore}</span>
                            <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 4 }}>{formatLKR(v.costPerHour)}/hr</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent 3: Ticket Pricing Matrix */}
                {workflow.ticketTiers && workflow.ticketTiers.length > 0 && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <IcZap style={{ width: 15, height: 15, color: "#fbbf24" }} />
                      <span>Agent 3: Dynamic Ticket Tiers &amp; Revenue Projection</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                      {workflow.ticketTiers.map((t, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--c-border)", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{t.name}</div>
                            <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>{t.perks}</div>
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

                {/* Budget Allocation Breakdown */}
                {workflow.budgetBreakdown && workflow.budgetBreakdown.length > 0 && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <IcTag style={{ width: 15, height: 15, color: "#a78bfa" }} />
                      <span>Budget Allocations ({formatLKR(form.budget)})</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                      {workflow.budgetBreakdown.map((b, idx) => (
                        <div key={idx} style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--c-border)" }}>
                          <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{b.category}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff", marginTop: 4 }}>
                            {formatLKR(b.allocated)}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--c-blue)", marginTop: 2 }}>
                            {b.pct} of budget
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent Tool Logs */}
                {workflow.logs && workflow.logs.length > 0 && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>4-Agent Execution Traces &amp; Tool Calls</div>
                    {workflow.logs.map((log, i) => {
                      const ag = AGENTS.find(a => a.key === (log.agent_name || log.agentName));
                      return (
                        <div key={i} style={{ display:"flex", gap:12, paddingBottom:10, marginBottom:10, borderBottom: i < workflow.logs.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                          <div style={{ width:26, height:26, borderRadius:6, background:"rgba(16, 185, 129, 0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            {ag ? <ag.Icon style={{ width:12, height:12, color:"#34d399" }} /> : <IcCheck style={{ width:12, height:12, color:"#34d399" }} />}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, fontWeight:700, color: "#ffffff" }}>{ag?.label || log.agentName || log.agent_name}</div>
                            <div style={{ fontSize:11, color:"var(--c-text-3)", marginTop:2, fontFamily: "monospace" }}>
                              Tools: {(log.toolCalls || log.tool_calls || []).map(tc => `${tc}()`).join(", ")}
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
