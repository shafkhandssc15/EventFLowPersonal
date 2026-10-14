import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { supabase } from "../api/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { IcRefresh, IcCheck, IcX, IcShield } from "../components/Icons.jsx";

function AlertIcon(p) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}

export default function ApprovalQueue() {
  const { user } = useAuth();
  const [queue, setQueue]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [deciding, setDec]    = useState(null);

  // Hard block — non-Admins should never reach this page but guard anyway
  if (user?.role !== "Admin") {
    return (
      <>
        
        <div className="topbar">
          <span className="topbar-title">Approvals</span>
        </div>
        
        <div className="page-head">
          <h1 className="page-title">Access Denied</h1>
        </div>
        
        <div className="page-body">
          <div className="empty" style={{ paddingTop: 60 }}>
            <IcShield style={{ width: 48, height: 48, color: "var(--c-danger)", opacity: 0.7, marginBottom: 16 }} />
            <div className="empty-title" style={{ color: "var(--c-danger)" }}>Admin Access Only</div>
            <div className="empty-desc">
              The Approval Queue is restricted to Platform Administrators.<br />
              Your role (<strong>{user?.role || "Unknown"}</strong>) does not have permission to view or action approvals.
            </div>
          </div>
        </div>
      </>
    );
  }

  async function load() {
    setLoading(true);
    let localPending = [];
    
    try {
      localPending = JSON.parse(localStorage.getItem("ef_pending_approvals") || "[]").filter(p => p.status === "Pending" || p.status === "PendingAdminApproval");
    } catch {}

    let dbPending = [];
    try {
      const { data: dbReqs, error: sbErr } = await supabase
        .from("ApprovalRequests")
        .select("*")
        .eq("Status", "Pending")
        .order("CreatedAt", { ascending: false });

      if (!sbErr && dbReqs) {
        dbPending = dbReqs.map(r => {
          try {
            const parsed = JSON.parse(r.Reason || "{}");
            const targetId = parsed.targetId || parsed.entityId || parsed.id;
            return {
              id: r.Id,
              targetId,
              type: parsed.type || "USER_REGISTRATION",
              reason: parsed.type === "EVENT_DELETION" ? `Event Deletion Request: "${parsed.details?.title || parsed.name || 'Event'}" (by ${parsed.requestedBy || 'Organizer'})` :
                      parsed.type === "VENUE_DELETION" ? `Venue Deletion Request: "${parsed.details?.name || parsed.name || 'Venue'}" (by ${parsed.requestedBy || 'Vendor'})` :
                      `Account Verification: ${parsed.name || 'User'} (${parsed.role || 'Organizer'})`,
              status: "PendingApproval",
              createdAt: r.CreatedAt || new Date().toISOString(),
              isLocal: true,
              rawItem: {
                id: r.Id,
                targetId,
                type: parsed.type || "USER_REGISTRATION",
                name: parsed.name,
                email: parsed.email || parsed.applicantEmail,
                role: parsed.role,
                details: parsed.details || parsed,
                requestedBy: parsed.requestedBy
              }
            };
          } catch {
            return null;
          }
        }).filter(Boolean);
      }
    } catch {}

      // Auto-detect venues that are pending deletion in Supabase Venues table
      try {
        const { data: pendingVenues } = await supabase
          .from("Venues")
          .select("*")
          .eq("IsPendingDeletion", true);

        if (pendingVenues && pendingVenues.length > 0) {
          for (const pv of pendingVenues) {
            const pvId = pv.Id || pv.id;
            const cleanPvId = String(pvId).toLowerCase();
            const alreadyInList = dbPending.some(c => 
              String(c.targetId || c.rawItem?.targetId || c.id).toLowerCase() === cleanPvId
            );
            if (!alreadyInList) {
              const autoApprovalId = crypto.randomUUID();
              const autoItem = {
                id: autoApprovalId,
                targetId: pvId,
                type: "VENUE_DELETION",
                reason: `Venue Deletion Request: "${pv.Name || pv.name || 'Venue'}" (by Venue Manager)`,
                status: "PendingApproval",
                createdAt: pv.CreatedAt || new Date().toISOString(),
                isLocal: true,
                rawItem: {
                  id: autoApprovalId,
                  targetId: pvId,
                  name: `Venue Deletion: ${pv.Name || pv.name || 'Venue'}`,
                  managerEmail: "vendor.eventflow@gmail.com",
                  role: "VendorVenueManager",
                  nic: "—",
                  contact: "—",
                  type: "VENUE_DELETION",
                  requestedBy: "Venue Manager",
                  status: "PendingAdminApproval",
                  submittedAt: pv.CreatedAt || new Date().toISOString(),
                  details: {
                    targetId: pvId,
                    name: pv.Name || pv.name,
                    location: pv.Location || pv.location,
                    city: pv.City || pv.city,
                    capacity: pv.Capacity || pv.capacity
                  }
                }
              };
              dbPending.push(autoItem);
              supabase.from("ApprovalRequests").insert({
                Id: autoApprovalId,
                Status: "Pending",
                Reason: JSON.stringify(autoItem.rawItem),
                CreatedAt: new Date().toISOString()
              }).catch(() => {});
            }
          }
        }
      } catch {}

      // Auto-detect events that are pending deletion in Supabase Events table
      try {
        const { data: pendingEvents } = await supabase
          .from("Events")
          .select("*")
          .eq("Status", "PendingDeletion");

        if (pendingEvents && pendingEvents.length > 0) {
          for (const pe of pendingEvents) {
            const peId = pe.Id || pe.id;
            const cleanPeId = String(peId).toLowerCase();
            const alreadyInList = dbPending.some(c => 
              String(c.targetId || c.rawItem?.targetId || c.id).toLowerCase() === cleanPeId
            );
            if (!alreadyInList) {
              const autoApprovalId = crypto.randomUUID();
              const autoItem = {
                id: autoApprovalId,
                targetId: peId,
                type: "EVENT_DELETION",
                reason: `Event Deletion Request: "${pe.Title || pe.title || 'Event'}" (by Event Organizer)`,
                status: "PendingApproval",
                createdAt: pe.CreatedAt || new Date().toISOString(),
                isLocal: true,
                rawItem: {
                  id: autoApprovalId,
                  targetId: peId,
                  name: `Event Deletion: ${pe.Title || pe.title || 'Event'}`,
                  organizerEmail: "organizer.eventflow@gmail.com",
                  role: "Organizer",
                  nic: "—",
                  contact: "—",
                  type: "EVENT_DELETION",
                  requestedBy: "Event Organizer",
                  status: "PendingAdminApproval",
                  submittedAt: pe.CreatedAt || new Date().toISOString(),
                  details: {
                    targetId: peId,
                    title: pe.Title || pe.title,
                    category: pe.Category || pe.category,
                    location: pe.Location || pe.location
                  }
                }
              };
              dbPending.push(autoItem);
              supabase.from("ApprovalRequests").insert({
                Id: autoApprovalId,
                Status: "Pending",
                Reason: JSON.stringify(autoItem.rawItem),
                CreatedAt: new Date().toISOString()
              }).catch(() => {});
            }
          }
        }
      } catch {}

    try {
      const d = await api.approvalQueue().catch(() => []);
      const apiItems = Array.isArray(d) ? d : d.items || [];

      const formattedLocal = localPending.map(lp => ({
        id: lp.id,
        targetId: lp.targetId || lp.details?.targetId || lp.id,
        reason: lp.type === "EVENT_DELETION" ? `Event Deletion Request: "${lp.details?.title || lp.name}" (by ${lp.requestedBy})` :
                lp.type === "VENUE_DELETION" ? `Venue Deletion Request: "${lp.details?.name || lp.name}" (by ${lp.requestedBy})` :
                `Account Verification: ${lp.name} (${lp.role})`,
        status: lp.status || "PendingApproval",
        createdAt: lp.submittedAt || new Date().toISOString(),
        isLocal: true,
        rawItem: lp
      }));

      const combined = [...dbPending];
      formattedLocal.forEach(fl => {
        if (!combined.some(c => c.id === fl.id || (fl.targetId && c.targetId === fl.targetId))) {
          combined.push(fl);
        }
      });
      setQueue([...combined, ...apiItems]);
    } catch {
      setQueue(dbPending);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    window.addEventListener("storage", load);

    const channel = supabase
      .channel("approval-queue-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ApprovalRequests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "Venues" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "Events" }, () => load())
      .subscribe();

    return () => {
      window.removeEventListener("storage", load);
      supabase.removeChannel(channel);
    };
  }, []);

  async function decide(id, approve) {
    setDec(id);
    
    try {
      const target = queue.find(q => q.id === id);
      if (target?.isLocal && target.rawItem) {
        const lp = target.rawItem;
        const targetId = lp.targetId || lp.details?.targetId || lp.details?.id || lp.id;
        if (lp.type === "EVENT_DELETION") {
          if (approve) {
            api.adminDeleteEvent(targetId).catch(() => {});

            // Delete dependent records first to avoid foreign key violations
            try { await supabase.from("TicketTypes").delete().eq("EventId", targetId); } catch {}
            try { await supabase.from("Registrations").delete().eq("EventId", targetId); } catch {}
            try { await supabase.from("VendorBookings").delete().eq("EventId", targetId); } catch {}
            try { await supabase.from("Expenses").delete().eq("EventId", targetId); } catch {}

            try {
              const { error: delErr } = await supabase.from("Events").delete().eq("Id", targetId);
              if (delErr) {
                await supabase.from("Events").update({ Status: "Cancelled" }).eq("Id", targetId);
              }
            } catch {
              await supabase.from("Events").update({ Status: "Cancelled" }).eq("Id", targetId).catch(() => {});
            }
            try {
              const saved = JSON.parse(localStorage.getItem("ef_events") || "[]");
              localStorage.setItem("ef_events", JSON.stringify(saved.filter(e => e.id !== targetId && e.Id !== targetId && String(e.id || e.Id).toLowerCase() !== String(targetId).toLowerCase())));
            } catch {}
          } else {
            try {
              await supabase.from("Events").update({ Status: "Published" }).eq("Id", targetId);
            } catch {}
            try {
              const saved = JSON.parse(localStorage.getItem("ef_events") || "[]");
              localStorage.setItem("ef_events", JSON.stringify(saved.map(e => (e.id === targetId || e.Id === targetId || String(e.id || e.Id).toLowerCase() === String(targetId).toLowerCase()) ? { ...e, status: "Published", deletionPending: false } : e)));
            } catch {}
          }
        } else if (lp.type === "VENUE_DELETION") {
          if (approve) {
            api.adminDeleteVenue(targetId).catch(() => {});

            // 1. Delete dependent bookings in Supabase to avoid FK constraints
            try {
              await supabase.from("VendorBookings").delete().eq("VenueId", targetId);
            } catch {}

            // 2. Delete or soft-deactivate venue in Supabase
            try {
              const { error: delErr } = await supabase.from("Venues").delete().eq("Id", targetId);
              if (delErr) {
                await supabase.from("Venues").update({ IsActive: false, IsPendingDeletion: false }).eq("Id", targetId);
              }
            } catch {
              await supabase.from("Venues").update({ IsActive: false, IsPendingDeletion: false }).eq("Id", targetId).catch(() => {});
            }

            // 3. Remove from all local caches
            try {
              const savedReg = JSON.parse(localStorage.getItem("ef_registered_venues") || "[]");
              localStorage.setItem("ef_registered_venues", JSON.stringify(savedReg.filter(v => v.id !== targetId && v.Id !== targetId && String(v.id || v.Id).toLowerCase() !== String(targetId).toLowerCase())));
            } catch {}
            try {
              const savedVen = JSON.parse(localStorage.getItem("ef_venues") || "[]");
              localStorage.setItem("ef_venues", JSON.stringify(savedVen.filter(v => v.id !== targetId && v.Id !== targetId && String(v.id || v.Id).toLowerCase() !== String(targetId).toLowerCase())));
            } catch {}
          } else {
            try {
              await supabase.from("Venues").update({ IsPendingDeletion: false, IsActive: true }).eq("Id", targetId);
            } catch {}
            try {
              const saved = JSON.parse(localStorage.getItem("ef_registered_venues") || "[]");
              localStorage.setItem("ef_registered_venues", JSON.stringify(saved.map(v => (v.id === targetId || v.Id === targetId || String(v.id || v.Id).toLowerCase() === String(targetId).toLowerCase()) ? { ...v, isDeletionPending: false, status: "Active", isActive: true } : v)));
            } catch {}
            try {
              const savedVen = JSON.parse(localStorage.getItem("ef_venues") || "[]");
              localStorage.setItem("ef_venues", JSON.stringify(savedVen.map(v => (v.id === targetId || v.Id === targetId || String(v.id || v.Id).toLowerCase() === String(targetId).toLowerCase()) ? { ...v, isDeletionPending: false, isActive: true } : v)));
            } catch {}
          }
        } else if (approve) {
          // Account Verification approval
          try {
            const approvedList = JSON.parse(localStorage.getItem("ef_approved_users") || "[]");
            const newActive = {
              id: lp.userId || lp.id,
              name: lp.name,
              email: lp.email,
              role: lp.role,
              nic: lp.nic,
              contact: lp.contact,
              status: "Active",
              isApproved: true
            };
            localStorage.setItem("ef_approved_users", JSON.stringify([newActive, ...approvedList.filter(u => u.email?.toLowerCase() !== lp.email?.toLowerCase())]));

            const regList = JSON.parse(localStorage.getItem("ef_registered_users") || "[]");
            localStorage.setItem("ef_registered_users", JSON.stringify(regList.map(u => u.email?.toLowerCase() === lp.email?.toLowerCase() ? { ...u, isApproved: true } : u)));
          } catch {}
        }

        // Sync Supabase ApprovalRequests table if matching row exists
        const reqId = lp.id || id;
        if (reqId) {
          try {
            await supabase.from("ApprovalRequests").update({ Status: approve ? "Approved" : "Rejected", ResolvedAt: new Date().toISOString() }).eq("Id", reqId);
          } catch {}
        }
        if (targetId) {
          try {
            await supabase.from("ApprovalRequests").update({ Status: approve ? "Approved" : "Rejected", ResolvedAt: new Date().toISOString() }).ilike("Reason", `%${targetId}%`);
          } catch {}
        }
        
        // Remove from ef_pending_approvals
        try {
          const allPending = JSON.parse(localStorage.getItem("ef_pending_approvals") || "[]");
          localStorage.setItem("ef_pending_approvals", JSON.stringify(allPending.filter(p => p.id !== id && (p.targetId || p.details?.targetId) !== targetId && (!lp.email || p.email?.toLowerCase() !== lp.email?.toLowerCase()))));
          window.dispatchEvent(new Event("storage"));
        } catch {}
      } else {
        await api.decideApproval(id, approve);
      }
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDec(null);
    }
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Approvals</span>
        <div className="topbar-actions">
          {queue.length > 0 && <span className="badge badge-amber">{queue.length} pending</span>}
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <IcRefresh style={{ width: 13, height: 13 }} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-head">
        <h1 className="page-title">Approval Queue</h1>
        <p className="page-sub">Review pending deletion requests and threshold items requiring Platform Administrator sign-off.</p>
      </div>

      <div className="page-body">
        {error && (
          <div className="alert alert-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : queue.length === 0 ? (
          <div className="empty">
            <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div className="empty-title">All clear</div>
            <div className="empty-desc">No items are pending approval right now.</div>
          </div>
        ) : (
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {queue.map(item => {
              const isDeletion = item.rawItem?.type === "EVENT_DELETION" || item.rawItem?.type === "VENUE_DELETION";
              const canApprove = user?.role === "Admin"; // STRICTLY Admin-only

              return (
                <div key={item.id} className="approval-item" style={{ border: isDeletion ? "1px solid rgba(239, 68, 68, 0.3)" : undefined }}>
                  <div className="approval-icon">
                    <AlertIcon style={{ width: 18, height: 18, color: isDeletion ? "#f87171" : "#fbbf24" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)", marginBottom: 3, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{item.reason || "Approval required"}</span>
                      {isDeletion && <span className="badge badge-red" style={{ fontSize: 10 }}>Deletion Request</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 12 }}>
                      Submitted {new Date(item.createdAt).toLocaleString()} ·{" "}
                      <span className="badge badge-amber">{item.status}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {canApprove ? (
                        <>
                          <button className="btn btn-success btn-sm" disabled={deciding === item.id}
                            onClick={() => decide(item.id, true)}>
                            <IcCheck style={{ width: 12, height: 12 }} /> Approve
                          </button>
                          <button className="btn btn-danger btn-sm" disabled={deciding === item.id}
                            onClick={() => decide(item.id, false)}>
                            <IcX style={{ width: 12, height: 12 }} /> Reject
                          </button>
                        </>
                      ) : (
                        <span className="badge badge-amber" style={{ fontSize: 11 }}>
                          Platform Admin Decision Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
