import { useEffect, useState } from "react";
import { api } from "../api/client.js";
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

  function load() {
    setLoading(true);
    let localPending = [];
    try {
      localPending = JSON.parse(localStorage.getItem("ef_pending_approvals") || "[]");
    } catch {}

    api.approvalQueue()
      .then(d => {
        const apiItems = Array.isArray(d) ? d : d.items || [];
        // Map local deletion approvals to queue format
        const formattedLocal = localPending.map(lp => ({
          id: lp.id,
          reason: lp.type === "EVENT_DELETION" ? `Event Deletion Request: "${lp.details?.title || lp.name}" (by ${lp.requestedBy})` :
                  lp.type === "VENUE_DELETION" ? `Venue Deletion Request: "${lp.details?.name || lp.name}" (by ${lp.requestedBy})` :
                  `Account Verification: ${lp.name} (${lp.role})`,
          status: lp.status || "PendingApproval",
          createdAt: lp.submittedAt || new Date().toISOString(),
          isLocal: true,
          rawItem: lp
        }));
        setQueue([...formattedLocal, ...apiItems]);
      })
      .catch(() => {
        const formattedLocal = localPending.map(lp => ({
          id: lp.id,
          reason: lp.type === "EVENT_DELETION" ? `Event Deletion Request: "${lp.details?.title || lp.name}" (by ${lp.requestedBy})` :
                  lp.type === "VENUE_DELETION" ? `Venue Deletion Request: "${lp.details?.name || lp.name}" (by ${lp.requestedBy})` :
                  `Account Verification: ${lp.name} (${lp.role})`,
          status: lp.status || "PendingApproval",
          createdAt: lp.submittedAt || new Date().toISOString(),
          isLocal: true,
          rawItem: lp
        }));
        setQueue(formattedLocal);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function decide(id, approve) {
    setDec(id);
    try {
      const target = queue.find(q => q.id === id);
      if (target?.isLocal && target.rawItem) {
        const lp = target.rawItem;
        if (lp.type === "EVENT_DELETION") {
          if (approve) {
            api.adminDeleteEvent(lp.targetId).catch(() => {});
            try {
              const saved = JSON.parse(localStorage.getItem("ef_events") || "[]");
              localStorage.setItem("ef_events", JSON.stringify(saved.filter(e => e.id !== lp.targetId)));
            } catch {}
          } else {
            try {
              const saved = JSON.parse(localStorage.getItem("ef_events") || "[]");
              localStorage.setItem("ef_events", JSON.stringify(saved.map(e => e.id === lp.targetId ? { ...e, status: "Published", deletionPending: false } : e)));
            } catch {}
          }
        } else if (lp.type === "VENUE_DELETION") {
          if (approve) {
            api.adminDeleteVenue(lp.targetId).catch(() => {});
            try {
              const saved = JSON.parse(localStorage.getItem("ef_registered_venues") || "[]");
              localStorage.setItem("ef_registered_venues", JSON.stringify(saved.filter(v => v.id !== lp.targetId)));
            } catch {}
          } else {
            try {
              const saved = JSON.parse(localStorage.getItem("ef_registered_venues") || "[]");
              localStorage.setItem("ef_registered_venues", JSON.stringify(saved.map(v => v.id === lp.targetId ? { ...v, isDeletionPending: false, status: "Active" } : v)));
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
        // Remove from ef_pending_approvals
        try {
          const allPending = JSON.parse(localStorage.getItem("ef_pending_approvals") || "[]");
          localStorage.setItem("ef_pending_approvals", JSON.stringify(allPending.filter(p => p.id !== id && (!lp.email || p.email?.toLowerCase() !== lp.email?.toLowerCase()))));
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
