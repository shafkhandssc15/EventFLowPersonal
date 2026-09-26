import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  IcDatabase, IcCheckCircle, IcUsers, IcBuilding, IcTicket,
  IcCheck, IcRefresh, IcShield, IcZap, IcPlus, IcUser, IcX
} from "../components/Icons.jsx";
import { supabase, seedSupabaseDatabase, SUPABASE_URL, formatLKR } from "../api/supabase.js";
import { api } from "../api/client.js";

function getRegisteredUsers() {
  try {
    const reg = JSON.parse(localStorage.getItem("ef_registered_users") || "[]");
    const approved = JSON.parse(localStorage.getItem("ef_approved_users") || "[]");
    const merged = [...reg];
    approved.forEach(a => {
      if (!merged.some(m => m.email.toLowerCase() === a.email.toLowerCase())) {
        merged.push({ ...a, status: "Active" });
      }
    });
    return merged.map(u => ({ ...u, status: u.status || "Active" }));
  } catch {
    return [];
  }
}

export default function AdminDashboard() {
  const { user, login } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [users, setUsers] = useState(getRegisteredUsers);
  const [eventsCount, setEventsCount] = useState(0);
  const [venuesCount, setVenuesCount] = useState(0);
  const [promotionNotice, setPromotionNotice] = useState(null);
  const [adminTab, setAdminTab] = useState("approvals"); // "approvals" | "users" | "revenue" | "database" | "auditlog"
  const [modalError, setModalError] = useState(""); // FIX: was missing, caused crash
  const [userSearch, setUserSearch] = useState(""); // user table search
  const [auditLog, setAuditLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ef_audit_log") || "[]"); } catch { return []; }
  });

  // Pending Approvals Queue (only real requests from organizers and vendors)
  const [pendingApprovals, setPendingApprovals] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ef_pending_approvals") || "[]");
      const real = saved.filter(r => r.id !== "req-lk-101" && r.id !== "req-lk-102");
      if (real.length !== saved.length) {
        localStorage.setItem("ef_pending_approvals", JSON.stringify(real));
      }
      return real;
    } catch {
      return [];
    }
  });

  // New User / Role Assignment Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    nic: "",
    contact: "",
    address: "",
    role: "Organizer"
  });
  const [approvalFilter, setApprovalFilter] = useState("ALL"); // "ALL" | "EVENTS" | "VENUES" | "USERS"

  const filteredApprovals = pendingApprovals.filter(p => {
    if (approvalFilter === "ALL") return true;
    if (approvalFilter === "EVENTS") return p.type === "EVENT_DELETION";
    if (approvalFilter === "VENUES") return p.type === "VENUE_DELETION";
    if (approvalFilter === "USERS") return !p.type || p.type === "USER_REGISTRATION";
    return true;
  });

  async function syncWithSupabase() {
    // 1. Fetch real Users from Supabase
    try {
      const { data: dbUsers, error: uErr } = await supabase
        .from("Users")
        .select("*")
        .order("CreatedAt", { ascending: false });

      if (!uErr && dbUsers && dbUsers.length > 0) {
        const mapped = dbUsers.map(row => ({
          id: row.Id || row.id,
          name: row.Name || row.name || (row.Email ? row.Email.split("@")[0] : "User"),
          email: row.Email || row.email,
          role: row.Role || row.role || "Attendee",
          nic: row.Nic || row.nic || "199012304567",
          contact: row.Contact || row.contact || "+94 77 123 4567",
          address: row.Address || row.address || "Sri Lanka",
          status: row.IsApproved === false ? "Pending Verification" : "Active",
          isApproved: row.IsApproved !== false,
          createdAt: row.CreatedAt || row.createdAt
        }));

        const localReg = JSON.parse(localStorage.getItem("ef_registered_users") || "[]");
        const localAppr = JSON.parse(localStorage.getItem("ef_approved_users") || "[]");
        const combined = [...mapped];
        [...localReg, ...localAppr].forEach(loc => {
          if (loc.email && !combined.some(c => c.email?.toLowerCase() === loc.email.toLowerCase())) {
            combined.push({
              ...loc,
              status: loc.status || "Active"
            });
          }
        });

        setUsers(combined);
        localStorage.setItem("ef_registered_users", JSON.stringify(combined));
      }
    } catch (e) {
      console.warn("Supabase Users sync warning:", e);
    }

    // 2. Fetch real Events count from Supabase
    try {
      const { count: eCount, error: eErr } = await supabase
        .from("Events")
        .select("*", { count: "exact", head: true });
      if (!eErr && typeof eCount === "number") {
        setEventsCount(eCount);
      }
    } catch {}

    // 3. Fetch real Venues count from Supabase
    try {
      const { count: vCount, error: vErr } = await supabase
        .from("Venues")
        .select("*", { count: "exact", head: true });
      if (!vErr && typeof vCount === "number") {
        setVenuesCount(vCount);
      }
    } catch {}

    // 4. Fetch real Pending Approvals from Supabase ApprovalRequests table
    try {
      const { data: dbReqs, error: rErr } = await supabase
        .from("ApprovalRequests")
        .select("*")
        .order("CreatedAt", { ascending: false });

      if (!rErr && dbReqs) {
        const mappedReqs = dbReqs
          .map(r => {
            try {
              const parsed = JSON.parse(r.Reason || "{}");
              return {
                id: r.Id,
                name: parsed.name || r.EntityName || "Request",
                email: parsed.email || parsed.applicantEmail || "",
                role: parsed.role || r.Role || "Organizer",
                nic: parsed.nic || "—",
                contact: parsed.contact || "—",
                type: r.Type || parsed.type || "USER_REGISTRATION",
                status: r.Status === "Pending" ? "PendingAdminApproval" : r.Status,
                submittedAt: r.CreatedAt,
                details: parsed
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        const localSaved = JSON.parse(localStorage.getItem("ef_pending_approvals") || "[]");
        const mergedReqs = [...mappedReqs];
        localSaved.forEach(ls => {
          if (!mergedReqs.some(mr => mr.id === ls.id || (mr.email && mr.email === ls.email))) {
            mergedReqs.push(ls);
          }
        });
        const activeOnly = mergedReqs.filter(r => r.status === "Pending" || r.status === "PendingAdminApproval");
        setPendingApprovals(activeOnly);
        localStorage.setItem("ef_pending_approvals", JSON.stringify(activeOnly));
      }
    } catch {}
  }

  useEffect(() => {
    syncWithSupabase();

    // Fallback API counts if backend is up
    api.listEvents().then(r => {
      const len = r.items?.length || r?.length;
      if (typeof len === "number") setEventsCount(len);
    }).catch(() => {});
    api.searchVenues().then(r => {
      const len = r.items?.length || r?.length;
      if (typeof len === "number") setVenuesCount(len);
    }).catch(() => {});

    function syncPendingApprovals() {
      try {
        const saved = JSON.parse(localStorage.getItem("ef_pending_approvals") || "[]");
        setPendingApprovals(saved);
      } catch {}
    }

    window.addEventListener("storage", syncPendingApprovals);
    const interval = setInterval(syncPendingApprovals, 3000);

    // Supabase Realtime channel for live database updates
    const channel = supabase
      .channel("admin-realtime-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "Users" }, () => syncWithSupabase())
      .on("postgres_changes", { event: "*", schema: "public", table: "Events" }, () => syncWithSupabase())
      .on("postgres_changes", { event: "*", schema: "public", table: "Venues" }, () => syncWithSupabase())
      .on("postgres_changes", { event: "*", schema: "public", table: "ApprovalRequests" }, () => syncWithSupabase())
      .subscribe();

    return () => {
      window.removeEventListener("storage", syncPendingApprovals);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleSeedDatabase() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await seedSupabaseDatabase();
      setSeedResult(res);
    } catch (e) {
      setSeedResult({ supabaseSynced: false, message: e.message || "Seeding failed" });
    } finally {
      setSeeding(false);
    }
  }

  // Admin Approves a pending Organizer or Vendor registration
  function handleApproveRequest(req) {
    if (user?.role !== "Admin") {
      setPromotionNotice("⛔ Access Denied — Only Admins can approve requests.");
      return;
    }
    if (req.type === "EVENT_DELETION") {
      handleApproveEventDeletion(req);
      return;
    }
    if (req.type === "VENUE_DELETION") {
      handleApproveVenueDeletion(req);
      return;
    }

    // 1. Remove from pending approvals
    const updatedPending = pendingApprovals.filter(p => p.id !== req.id);
    setPendingApprovals(updatedPending);
    localStorage.setItem("ef_pending_approvals", JSON.stringify(updatedPending));

    // 2. Add to approved active users
    const newActiveUser = {
      id: req.userId || `usr-lk-${Date.now()}`,
      name: req.name,
      email: req.email,
      role: req.role,
      nic: req.nic,
      contact: req.contact,
      address: req.address,
      organization: req.organization,
      status: "Active",
      isApproved: true
    };

    setUsers(prev => [newActiveUser, ...prev]);

    // Save to approved users list for auth lookup
    const approvedList = JSON.parse(localStorage.getItem("ef_approved_users") || "[]");
    localStorage.setItem("ef_approved_users", JSON.stringify([newActiveUser, ...approvedList.filter(u => u.email !== req.email)]));

    // Also sync approval status to Supabase Users table
    try {
      supabase.from("Users").update({ Role: req.role, UpdatedAt: new Date().toISOString() }).ilike("Email", req.email).then(() => {});
    } catch (err) {}

    setPromotionNotice(`✓ Application for "${req.name}" (${req.role === 'VendorVenueManager' ? 'Vendor / Venue' : req.role}) APPROVED & ACTIVATED. They can now sign in.`);
  }

  // Admin Rejects a pending registration
  function handleRejectRequest(reqId, applicantName, req) {
    if (user?.role !== "Admin") {
      setPromotionNotice("⛔ Access Denied — Only Admins can reject requests.");
      return;
    }
    if (req?.type === "EVENT_DELETION") {
      handleRejectEventDeletion(req);
      return;
    }
    if (req?.type === "VENUE_DELETION") {
      handleRejectVenueDeletion(req);
      return;
    }

    const updatedPending = pendingApprovals.filter(p => p.id !== reqId);
    setPendingApprovals(updatedPending);
    localStorage.setItem("ef_pending_approvals", JSON.stringify(updatedPending));
    setPromotionNotice(`Application for "${applicantName}" rejected and removed from queue.`);
  }

  // Admin approves event deletion
  function handleApproveEventDeletion(req) {
    if (user?.role !== "Admin") return;
    // 1. Remove event from ef_events and sync API
    api.adminDeleteEvent(req.targetId).catch(() => {});
    try {
      const savedEvents = JSON.parse(localStorage.getItem("ef_events") || "[]");
      const filtered = savedEvents.filter(e => e.id !== req.targetId);
      localStorage.setItem("ef_events", JSON.stringify(filtered));
      setEventsCount(filtered.length);
    } catch {}

    // 2. Remove from pending approvals
    const updatedPending = pendingApprovals.filter(p => p.id !== req.id);
    setPendingApprovals(updatedPending);
    localStorage.setItem("ef_pending_approvals", JSON.stringify(updatedPending));
    window.dispatchEvent(new Event("storage"));

    setPromotionNotice(`✓ Event "${req.details?.title || req.name}" deletion APPROVED by Admin. Event permanently removed.`);
  }

  // Admin rejects event deletion (event stays active/published)
  function handleRejectEventDeletion(req) {
    if (user?.role !== "Admin") return;
    try {
      const savedEvents = JSON.parse(localStorage.getItem("ef_events") || "[]");
      const restored = savedEvents.map(e => e.id === req.targetId ? { ...e, status: "Published", deletionPending: false } : e);
      localStorage.setItem("ef_events", JSON.stringify(restored));
    } catch {}

    const updatedPending = pendingApprovals.filter(p => p.id !== req.id);
    setPendingApprovals(updatedPending);
    localStorage.setItem("ef_pending_approvals", JSON.stringify(updatedPending));
    window.dispatchEvent(new Event("storage"));

    setPromotionNotice(`Event deletion request for "${req.details?.title || req.name}" REJECTED. Event remains published.`);
  }

  // Admin approves venue deletion
  function handleApproveVenueDeletion(req) {
    if (user?.role !== "Admin") return;
    api.adminDeleteVenue(req.targetId).catch(() => {});
    try {
      const savedVenues = JSON.parse(localStorage.getItem("ef_registered_venues") || "[]");
      const filtered = savedVenues.filter(v => v.id !== req.targetId);
      localStorage.setItem("ef_registered_venues", JSON.stringify(filtered));
      setVenuesCount(filtered.length);
    } catch {}

    const updatedPending = pendingApprovals.filter(p => p.id !== req.id);
    setPendingApprovals(updatedPending);
    localStorage.setItem("ef_pending_approvals", JSON.stringify(updatedPending));
    window.dispatchEvent(new Event("storage"));

    setPromotionNotice(`✓ Venue "${req.details?.name || req.name}" deletion APPROVED by Admin. Venue removed from platform.`);
  }

  // Admin rejects venue deletion (venue stays active)
  function handleRejectVenueDeletion(req) {
    if (user?.role !== "Admin") return;
    try {
      const savedVenues = JSON.parse(localStorage.getItem("ef_registered_venues") || "[]");
      const restored = savedVenues.map(v => v.id === req.targetId ? { ...v, isDeletionPending: false, status: "Active" } : v);
      localStorage.setItem("ef_registered_venues", JSON.stringify(restored));
    } catch {}

    const updatedPending = pendingApprovals.filter(p => p.id !== req.id);
    setPendingApprovals(updatedPending);
    localStorage.setItem("ef_pending_approvals", JSON.stringify(updatedPending));
    window.dispatchEvent(new Event("storage"));

    setPromotionNotice(`Venue deletion request for "${req.details?.name || req.name}" REJECTED. Venue remains active.`);
  }

  function addAuditEntry(action, detail) {
    const entry = {
      id: `audit-${Date.now()}`,
      action,
      detail,
      performedBy: user?.name || "Admin",
      timestamp: new Date().toISOString()
    };
    setAuditLog(prev => {
      const updated = [entry, ...prev].slice(0, 100);
      localStorage.setItem("ef_audit_log", JSON.stringify(updated));
      return updated;
    });
  }

  // Admin Promotes / Changes Role of any user
  function promoteUserRole(userId, newRole) {
    if (user?.role !== "Admin") {
      setPromotionNotice("⛔ Access Denied — Only Admins can change user roles.");
      return;
    }
    const targetUser = users.find(u => u.id === userId);
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

    // Update ef_approved_users
    const approvedList = JSON.parse(localStorage.getItem("ef_approved_users") || "[]");
    const existing = approvedList.find(u => u.id === userId || (targetUser && u.email?.toLowerCase() === targetUser.email?.toLowerCase()));
    if (existing) {
      existing.role = newRole;
      existing.isApproved = true;
      localStorage.setItem("ef_approved_users", JSON.stringify(approvedList));
    } else if (targetUser) {
      approvedList.push({ ...targetUser, role: newRole, isApproved: true });
      localStorage.setItem("ef_approved_users", JSON.stringify(approvedList));
    }

    // Sync to Supabase Users table
    try {
      supabase.from("Users").update({ Role: newRole, UpdatedAt: new Date().toISOString() }).eq("Id", userId).then(() => {});
    } catch {}

    setPromotionNotice(`User "${targetUser?.name || 'User'}" promoted to "${newRole === 'VendorVenueManager' ? 'Vendor / Venue' : newRole}".`);
    addAuditEntry("ROLE_CHANGE", `Changed role of ${targetUser?.name} to ${newRole}`);
    if (user?.id === userId) {
      login({ ...user, role: newRole });
    }
  }

  function handleSuspendUser(userId) {
    if (user?.role !== "Admin") {
      setPromotionNotice("⛔ Access Denied — Only Admins can suspend users.");
      return;
    }
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const isSuspended = target.status === "Suspended";
    const newStatus = isSuspended ? "Active" : "Suspended";
    setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    const approvedList = JSON.parse(localStorage.getItem("ef_approved_users") || "[]");
    localStorage.setItem("ef_approved_users", JSON.stringify(approvedList.map(u => u.id === userId ? { ...u, status: newStatus } : u)));
    setPromotionNotice(`User "${target.name}" ${isSuspended ? "reactivated" : "suspended"}.`);
    addAuditEntry(isSuspended ? "USER_REACTIVATED" : "USER_SUSPENDED", `${isSuspended ? "Reactivated" : "Suspended"} account of ${target.name} (${target.email})`);
  }

  // Create & Assign User with compulsory fields
  function handleCreateUser(e) {
    e.preventDefault();
    setModalError("");
    if (user?.role !== "Admin") {
      setModalError("⛔ Access Denied — Only Admins can create users.");
      return;
    }

    if (!newUserForm.name.trim()) { setModalError("Full Name is compulsory."); return; }
    if (!newUserForm.nic.trim()) { setModalError("NIC number is compulsory."); return; }
    if (!newUserForm.email.trim()) { setModalError("Email address is compulsory."); return; }
    if (!newUserForm.contact.trim()) { setModalError("Contact number is compulsory."); return; }
    if (!newUserForm.address.trim()) { setModalError("Address is compulsory."); return; }

    const createdUser = {
      id: crypto.randomUUID(),
      name: newUserForm.name.trim(),
      email: newUserForm.email.trim().toLowerCase(),
      nic: newUserForm.nic.trim(),
      contact: newUserForm.contact.trim(),
      address: newUserForm.address.trim(),
      role: newUserForm.role,
      status: "Active",
      isApproved: true
    };

    setUsers(prev => [createdUser, ...prev]);

    const approvedList = JSON.parse(localStorage.getItem("ef_approved_users") || "[]");
    localStorage.setItem("ef_approved_users", JSON.stringify([createdUser, ...approvedList]));

    // Sync directly to Supabase Users table
    try {
      supabase.from("Users").upsert({
        Id: createdUser.id,
        Name: createdUser.name,
        Email: createdUser.email,
        PasswordHash: "Admin@123456",
        Role: createdUser.role,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      }).then(() => {});
    } catch (sbErr) {
      console.warn("Supabase user creation warning:", sbErr);
    }

    setPromotionNotice(`New verified user "${createdUser.name}" created with role "${createdUser.role}".`);
    setShowAddUserModal(false);
    setNewUserForm({ name: "", email: "", nic: "", contact: "", address: "", role: "Organizer" });
  }

  const activePendingCount = pendingApprovals.filter(p => p.status !== "Approved").length;
  const { totalRevenueLKR, totalPassesSold, organizerRevenueList, eventRevenueList } = (() => {
    try {
      const bookings = JSON.parse(localStorage.getItem("ef_master_bookings") || "[]");
      const confirmed = bookings.filter(b => b.status === "Confirmed");
      const rev = confirmed.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
      const passes = confirmed.reduce((s, b) => s + (b.passes?.length || b.passCount || 1), 0);

      const eventsList = JSON.parse(localStorage.getItem("ef_events") || "[]");

      const orgMap = {};
      confirmed.forEach(b => {
        const ev = eventsList.find(e => e.id === b.eventId);
        const orgName = ev?.organizerName || b.organizerName || "Alex Chen · Tech Lanka";
        const orgEmail = ev?.organizerEmail || "organizer@demo.com";
        if (!orgMap[orgName]) {
          orgMap[orgName] = {
            name: orgName,
            email: orgEmail,
            events: new Set(),
            passesSold: 0,
            revenue: 0,
            bookingCount: 0
          };
        }
        if (b.eventId) orgMap[orgName].events.add(b.eventId);
        orgMap[orgName].passesSold += (b.passes?.length || b.passCount || 1);
        orgMap[orgName].revenue += (Number(b.totalAmount) || 0);
        orgMap[orgName].bookingCount += 1;
      });

      const evMap = {};
      confirmed.forEach(b => {
        const title = b.eventTitle || "Event";
        if (!evMap[title]) {
          evMap[title] = {
            title,
            passesSold: 0,
            revenue: 0,
            bookingCount: 0,
            organizerName: b.organizerName || "Organizer"
          };
        }
        evMap[title].passesSold += (b.passes?.length || b.passCount || 1);
        evMap[title].revenue += (Number(b.totalAmount) || 0);
        evMap[title].bookingCount += 1;
      });

      return {
        totalRevenueLKR: rev,
        totalPassesSold: passes,
        organizerRevenueList: Object.values(orgMap).map(o => ({ ...o, eventsCount: o.events.size || 1 })),
        eventRevenueList: Object.values(evMap)
      };
    } catch {
      return { totalRevenueLKR: 0, totalPassesSold: 0, organizerRevenueList: [], eventRevenueList: [] };
    }
  })();
  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.nic?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Admin Command Center · Sri Lanka</span>
        <div className="topbar-actions">
          {activePendingCount > 0 && (
            <span className="badge badge-amber" style={{ marginRight: 8, cursor: "pointer" }} onClick={() => setAdminTab("approvals")}>
              {activePendingCount} Pending Verification{activePendingCount > 1 ? "s" : ""}
            </span>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddUserModal(true)}>
            <IcPlus style={{ width: 13, height: 13 }} /> Add &amp; Assign User
          </button>
        </div>
      </div>

      <div className="page-head">
        <h1 className="page-title">Platform Administration &amp; RBAC Control</h1>
        <p className="page-sub">
          Review and approve pending Organizer &amp; Vendor registrations, promote roles, verify compulsory Sri Lankan NICs, and synchronize database tables.
        </p>
      </div>

      <div className="page-body">
        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => setAdminTab("approvals")}>
            <div className="stat-label">Pending Verifications</div>
            <div className="stat-value" style={{ color: activePendingCount > 0 ? "#fbbf24" : "#34d399" }}>
              {activePendingCount}
            </div>
          </div>
          <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => setAdminTab("users")}>
            <div className="stat-label">Verified Users (NIC)</div>
            <div className="stat-value" style={{ color: "#60a5fa" }}>{users.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Venues Mapped (OSM)</div>
            <div className="stat-value" style={{ color: "#a78bfa" }}>{venuesCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Events Live</div>
            <div className="stat-value">{eventsCount}</div>
          </div>
          <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => setAdminTab("revenue")}>
            <div className="stat-label">Platform Revenue (LKR)</div>
            <div className="stat-value" style={{ color: "#34d399", fontSize: 18 }}>
              {totalRevenueLKR > 0 ? formatLKR(totalRevenueLKR) : "Rs. 0"}
            </div>
          </div>
        </div>

        {/* Promotion Toast */}
        {promotionNotice && (
          <div className="alert alert-success" style={{ marginBottom: 20 }}>
            <IcCheckCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
            {promotionNotice}
          </div>
        )}

        {/* High-Priority Deletion Requests Admin Notification Banner */}
        {(() => {
          const pendingDeletions = pendingApprovals.filter(p => (p.type === "EVENT_DELETION" || p.type === "VENUE_DELETION") && p.status !== "Approved");
          const evCount = pendingDeletions.filter(p => p.type === "EVENT_DELETION").length;
          const venCount = pendingDeletions.filter(p => p.type === "VENUE_DELETION").length;

          if (pendingDeletions.length === 0) return null;

          return (
            <div
              style={{
                background: "linear-gradient(90deg, rgba(239, 68, 68, 0.16), rgba(245, 158, 11, 0.16))",
                border: "1px solid rgba(239, 68, 68, 0.5)",
                borderRadius: "var(--radius-sm)",
                padding: "16px 20px",
                marginBottom: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                boxShadow: "0 4px 20px rgba(239, 68, 68, 0.12)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 26 }}>🚨</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>Admin Attention: {pendingDeletions.length} Deletion Request{pendingDeletions.length > 1 ? "s" : ""} Awaiting Review</span>
                    <span className="badge badge-red" style={{ fontSize: 10, fontWeight: 800 }}>Action Required</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--c-text-2)", marginTop: 4 }}>
                    {evCount > 0 && <span style={{ color: "#ffffff" }}><strong>{evCount} Event deletion request{evCount > 1 ? "s" : ""}</strong> (by Organizers) </span>}
                    {evCount > 0 && venCount > 0 && <span>· </span>}
                    {venCount > 0 && <span style={{ color: "#ffffff" }}><strong>{venCount} Venue deletion request{venCount > 1 ? "s" : ""}</strong> (by Venue Managers)</span>}
                    <div style={{ marginTop: 2, color: "#9ca3af" }}>
                      Organizers and Venue Managers cannot permanently delete events or venues without Platform Admin authorization.
                    </div>
                  </div>
                </div>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setAdminTab("approvals");
                  setApprovalFilter(evCount > 0 && venCount === 0 ? "EVENTS" : venCount > 0 && evCount === 0 ? "VENUES" : "ALL");
                }}
                style={{ fontWeight: 700, padding: "8px 14px" }}
              >
                Review &amp; Approve Deletions →
              </button>
            </div>
          );
        })()}

        {/* Navigation Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab ${adminTab === "approvals" ? "on" : ""}`} onClick={() => setAdminTab("approvals")}>
            <IcShield style={{ width: 13, height: 13, marginRight: 6 }} />
            Approvals &amp; Verifications ({activePendingCount})
          </button>
          <button className={`tab ${adminTab === "users" ? "on" : ""}`} onClick={() => setAdminTab("users")}>
            <IcUsers style={{ width: 13, height: 13, marginRight: 6 }} />
            Users &amp; Roles ({users.length})
          </button>
          <button className={`tab ${adminTab === "revenue" ? "on" : ""}`} onClick={() => setAdminTab("revenue")}>
            <span style={{ marginRight: 6 }}>💰</span>
            Platform Revenue
          </button>
          <button className={`tab ${adminTab === "database" ? "on" : ""}`} onClick={() => setAdminTab("database")}>
            <IcDatabase style={{ width: 13, height: 13, marginRight: 6 }} />
            Supabase Sync
          </button>
          <button className={`tab ${adminTab === "auditlog" ? "on" : ""}`} onClick={() => setAdminTab("auditlog")}>
            <IcCheckCircle style={{ width: 13, height: 13, marginRight: 6 }} />
            Audit Log ({auditLog.length})
          </button>
        </div>

        {/* TAB 1: Unified Approval Queue (Account, Event Deletions, Venue Deletions) */}
        {adminTab === "approvals" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>Platform Administration Approval Queue</div>
                <div style={{ fontSize: 12, color: "var(--c-text-2)" }}>
                  Review and give Admin approval for Organizer/Vendor account registrations, Event deletion requests, and Venue deletion requests.
                </div>
              </div>
              <span className="badge badge-amber">{activePendingCount} Pending Decision{activePendingCount === 1 ? "" : "s"}</span>
            </div>

            {/* Filter Chips */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { id: "ALL", label: `All Requests (${pendingApprovals.length})` },
                { id: "EVENTS", label: `Event Deletions (${pendingApprovals.filter(p => p.type === "EVENT_DELETION").length})` },
                { id: "VENUES", label: `Venue Deletions (${pendingApprovals.filter(p => p.type === "VENUE_DELETION").length})` },
                { id: "USERS", label: `Account Verifications (${pendingApprovals.filter(p => !p.type || p.type === "USER_REGISTRATION").length})` }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setApprovalFilter(f.id)}
                  className={`btn btn-sm ${approvalFilter === f.id ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: 12 }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredApprovals.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px", background: "var(--c-bg-1)" }}>
                <IcCheckCircle style={{ width: 40, height: 40, color: "#34d399", margin: "0 auto 12px" }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>Approval Queue is Clear</div>
                <div style={{ fontSize: 13, color: "var(--c-text-3)", marginTop: 4 }}>
                  There are no pending requests matching this filter awaiting Administrator decision.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {filteredApprovals.map(req => {
                  const isEventDel = req.type === "EVENT_DELETION";
                  const isVenueDel = req.type === "VENUE_DELETION";

                  return (
                    <div
                      key={req.id}
                      className="card"
                      style={{
                        background: "var(--c-bg-1)",
                        border: isEventDel || isVenueDel ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(251, 191, 36, 0.3)",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        padding: 18
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 280 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          {isEventDel && (
                            <span className="badge badge-red" style={{ fontSize: 11, fontWeight: 700 }}>
                              ● Event Deletion Request
                            </span>
                          )}
                          {isVenueDel && (
                            <span className="badge badge-red" style={{ fontSize: 11, fontWeight: 700 }}>
                              ● Venue Deletion Request
                            </span>
                          )}
                          {!isEventDel && !isVenueDel && (
                            <span className={`badge ${req.role === "Organizer" ? "badge-blue" : "badge-purple"}`}>
                              Account Verification: {req.role === "VendorVenueManager" ? "Vendor / Venue" : "Organizer"}
                            </span>
                          )}
                          <span className="badge badge-amber" style={{ fontSize: 10 }}>Admin Approval Required</span>
                        </div>

                        <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", marginBottom: 4 }}>
                          {isEventDel ? (req.details?.title || req.name) : isVenueDel ? (req.details?.name || req.name) : req.name}
                          {req.organization && <span style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text-2)", marginLeft: 6 }}>({req.organization})</span>}
                        </div>

                        {/* Metadata Details Grid */}
                        {isEventDel ? (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "6px 14px", fontSize: 12, marginTop: 8 }}>
                            <div><span style={{ color: "var(--c-text-3)" }}>Requested By: </span><strong style={{ color: "#60a5fa" }}>{req.requestedBy || "Organizer"}</strong></div>
                            <div><span style={{ color: "var(--c-text-3)" }}>Category: </span><span style={{ color: "#ffffff" }}>{req.details?.category || "Tech"}</span></div>
                            <div><span style={{ color: "var(--c-text-3)" }}>Location: </span><span style={{ color: "var(--c-text-2)" }}>{req.details?.location || "Sri Lanka"}</span></div>
                            <div><span style={{ color: "var(--c-text-3)" }}>Capacity: </span><span style={{ color: "#34d399" }}>{Number(req.details?.capacity || 1000).toLocaleString()} pax</span></div>
                          </div>
                        ) : isVenueDel ? (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "6px 14px", fontSize: 12, marginTop: 8 }}>
                            <div><span style={{ color: "var(--c-text-3)" }}>Requested By: </span><strong style={{ color: "#a78bfa" }}>{req.requestedBy || "Organizer / Vendor"}</strong></div>
                            <div><span style={{ color: "var(--c-text-3)" }}>City: </span><span style={{ color: "#ffffff" }}>{req.details?.city || "Colombo"}</span></div>
                            <div><span style={{ color: "var(--c-text-3)" }}>Address: </span><span style={{ color: "var(--c-text-2)" }}>{req.details?.location || "Sri Lanka"}</span></div>
                            <div><span style={{ color: "var(--c-text-3)" }}>Max Capacity: </span><span style={{ color: "#34d399" }}>{Number(req.details?.capacity || 1000).toLocaleString()} pax</span></div>
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "6px 14px", fontSize: 12, marginTop: 8 }}>
                            <div><span style={{ color: "var(--c-text-3)" }}>National ID (NIC): </span><strong style={{ color: "#34d399", fontFamily: "monospace" }}>{req.nic}</strong></div>
                            <div><span style={{ color: "var(--c-text-3)" }}>Email: </span><span style={{ color: "#93c5fd" }}>{req.email}</span></div>
                            <div><span style={{ color: "var(--c-text-3)" }}>Contact Phone: </span><span style={{ color: "#ffffff" }}>{req.contact}</span></div>
                            <div><span style={{ color: "var(--c-text-3)" }}>Address: </span><span style={{ color: "var(--c-text-2)" }}>{req.address}</span></div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: "#f87171" }}
                          onClick={() => handleRejectRequest(req.id, req.name, req)}
                        >
                          <IcX style={{ width: 13, height: 13 }} /> Reject Request
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{
                            background: isEventDel || isVenueDel ? "#ef4444" : "#10b981",
                            borderColor: isEventDel || isVenueDel ? "#ef4444" : "#10b981"
                          }}
                          onClick={() => handleApproveRequest(req)}
                        >
                          <IcCheck style={{ width: 14, height: 14 }} />
                          {isEventDel ? "Approve Event Deletion" : isVenueDel ? "Approve Venue Deletion" : "Approve & Activate Account"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Active User Directory & Role Promotion */}
        {adminTab === "users" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Active User Directory &amp; Role Authority</div>
                <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>
                  Promote or reassign roles, suspend accounts, and search by name, NIC or email.
                </div>
              </div>
              {/* Search bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  className="form-input"
                  style={{ height: 34, fontSize: 12, width: 240 }}
                  placeholder="Search by name / NIC / email / role…"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                {userSearch && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setUserSearch("")}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            {filteredUsers.length === 0 && (
              <div className="empty"><div className="empty-title">No users found matching "{userSearch}"</div></div>
            )}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>User &amp; Contact</th>
                    <th>NIC</th>
                    <th>Address</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Promote Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} style={{ opacity: u.status === "Suspended" ? 0.55 : 1 }}>
                      <td>
                        <div className="td-primary">{u.name}</div>
                        <div className="td-small">{u.email} · {u.contact}</div>
                      </td>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#93c5fd" }}>
                          {u.nic || "—"}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--c-text-2)", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.address || "Colombo, Sri Lanka"}
                      </td>
                      <td>
                        <span className={`badge ${
                          u.role === "Admin" ? "badge-amber" :
                          u.role === "Organizer" ? "badge-blue" :
                          u.role === "Attendee" ? "badge-green" : "badge-purple"
                        }`}>
                          {u.role === "VendorVenueManager" ? "Vendor / Venue" : u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.status === "Suspended" ? "badge-red" : u.status === "SuperAdmin" ? "badge-amber" : "badge-green"}`} style={{ fontSize: 10 }}>
                          {u.status || "Active"}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-input"
                          style={{ height: 32, fontSize: 12, width: 160, background: "var(--c-bg-1)" }}
                          value={u.role}
                          onChange={e => promoteUserRole(u.id, e.target.value)}
                          disabled={u.status === "Suspended"}
                        >
                          <option value="Admin">★ Promote to Admin</option>
                          <option value="Organizer">Organizer</option>
                          <option value="Attendee">Attendee</option>
                          <option value="VendorVenueManager">Vendor / Venue Manager</option>
                        </select>
                      </td>
                      <td>
                        {u.status !== "SuperAdmin" && (
                          <button
                            className="btn btn-sm btn-ghost"
                            style={{ fontSize: 11, color: u.status === "Suspended" ? "#34d399" : "#ef4444" }}
                            onClick={() => handleSuspendUser(u.id)}
                          >
                            {u.status === "Suspended" ? "Reactivate" : "Suspend"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Audit Log */}
        {adminTab === "auditlog" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Platform Audit Log</div>
                <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>Timestamped record of all admin actions — role changes, approvals, suspensions.</div>
              </div>
              {auditLog.length > 0 && (
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, color: "#f87171" }}
                  onClick={() => { setAuditLog([]); localStorage.removeItem("ef_audit_log"); }}>
                  Clear Log
                </button>
              )}
            </div>
            {auditLog.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px 24px", background: "var(--c-bg-1)" }}>
                <div style={{ fontSize: 14, color: "var(--c-text-3)" }}>No audit entries yet. Actions like role changes, approvals, and suspensions will appear here.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>#</th><th>Action</th><th>Details</th><th>Performed By</th><th>Timestamp</th></tr></thead>
                  <tbody>
                    {auditLog.map((entry, idx) => (
                      <tr key={entry.id}>
                        <td style={{ color: "var(--c-text-3)", fontSize: 11, fontFamily: "monospace" }}>{auditLog.length - idx}</td>
                        <td>
                          <span className={`badge ${
                            entry.action.includes("SUSPENDED") ? "badge-red" :
                            entry.action.includes("REACTIVATED") ? "badge-green" :
                            entry.action.includes("ROLE") ? "badge-blue" :
                            entry.action.includes("APPROVE") ? "badge-green" :
                            entry.action.includes("REJECT") ? "badge-red" : "badge-gray"
                          }`} style={{ fontSize: 10 }}>{entry.action.replace(/_/g, " ")}</span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--c-text-2)" }}>{entry.detail}</td>
                        <td style={{ fontSize: 12, color: "#60a5fa" }}>{entry.performedBy}</td>
                        <td style={{ fontSize: 11, color: "var(--c-text-3)", fontFamily: "monospace" }}>
                          {new Date(entry.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: Platform Revenue Breakdown */}
        {adminTab === "revenue" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>Platform Revenue &amp; Financial Analytics</div>
                <div style={{ fontSize: 12, color: "var(--c-text-2)" }}>
                  Combined financial metrics from verified attendee bank payments across all Sri Lankan events.
                </div>
              </div>
              <span className="badge badge-green" style={{ fontSize: 12, padding: "6px 12px" }}>
                Total Revenue: {totalRevenueLKR > 0 ? formatLKR(totalRevenueLKR) : "Rs. 0"}
              </span>
            </div>

            {/* Financial Overview Stat Cards */}
            <div className="stats-row" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-label">Total Verified Revenue</div>
                <div className="stat-value" style={{ color: "#34d399", fontSize: 20 }}>
                  {totalRevenueLKR > 0 ? formatLKR(totalRevenueLKR) : "Rs. 0"}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Confirmed Passes Sold</div>
                <div className="stat-value" style={{ color: "#60a5fa" }}>{totalPassesSold}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Active Organizers Generating Revenue</div>
                <div className="stat-value" style={{ color: "#a78bfa" }}>{organizerRevenueList.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Ticket Value</div>
                <div className="stat-value">
                  {totalRevenueLKR > 0 && totalPassesSold > 0 ? formatLKR(Math.round(totalRevenueLKR / totalPassesSold)) : "Rs. 0"}
                </div>
              </div>
            </div>

            {/* 1. Breakdown by Organizer */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <IcUsers style={{ width: 15, height: 15, color: "#60a5fa" }} />
                <span>Revenue Breakdown by Organizer</span>
              </div>

              {organizerRevenueList.length === 0 ? (
                <div className="empty" style={{ padding: "24px 20px" }}>
                  <div className="empty-title">No confirmed transactions yet</div>
                  <div className="empty-desc">Once organizers approve attendee payment slips, their financial totals will display here.</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Organizer</th>
                        <th>Contact Email</th>
                        <th>Events Hosted</th>
                        <th>Bookings</th>
                        <th>Passes Sold</th>
                        <th>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {organizerRevenueList.map((org, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700, color: "#ffffff" }}>{org.name}</td>
                          <td style={{ color: "var(--c-text-2)", fontSize: 12 }}>{org.email}</td>
                          <td>
                            <span className="badge badge-blue" style={{ fontSize: 11 }}>{org.eventsCount} Event{org.eventsCount > 1 ? "s" : ""}</span>
                          </td>
                          <td style={{ fontSize: 12 }}>{org.bookingCount}</td>
                          <td style={{ fontWeight: 700, color: "#60a5fa" }}>{org.passesSold}</td>
                          <td style={{ fontWeight: 800, color: "#34d399", fontSize: 13 }}>{formatLKR(org.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 2. Breakdown by Event */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <IcTicket style={{ width: 15, height: 15, color: "#a78bfa" }} />
                <span>Revenue Breakdown by Event</span>
              </div>

              {eventRevenueList.length === 0 ? (
                <div className="empty" style={{ padding: "24px 20px" }}>
                  <div className="empty-title">No event transactions yet</div>
                  <div className="empty-desc">Confirmed ticket sales will be listed here per event.</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Event Title</th>
                        <th>Organizer</th>
                        <th>Bookings Count</th>
                        <th>Passes Issued</th>
                        <th>Event Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventRevenueList.map((ev, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700, color: "#ffffff" }}>{ev.title}</td>
                          <td style={{ color: "var(--c-text-2)", fontSize: 12 }}>{ev.organizerName}</td>
                          <td style={{ fontSize: 12 }}>{ev.bookingCount}</td>
                          <td style={{ fontWeight: 700, color: "#60a5fa" }}>{ev.passesSold}</td>
                          <td style={{ fontWeight: 800, color: "#34d399", fontSize: 13 }}>{formatLKR(ev.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Supabase Database Synchronization */}
        {adminTab === "database" && (
          <div className="card" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.08) 100%)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IcDatabase style={{ width: 16, height: 16, color: "#ffffff" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>Supabase Database Synchronization</div>
                    <div style={{ fontSize: 12, color: "var(--c-text-2)" }}>Project: <code style={{ color: "#93c5fd" }}>{SUPABASE_URL}</code></div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "var(--c-text-2)", maxWidth: 640, margin: "8px 0 0" }}>
                  Push curated Sri Lankan venues (BMICH, Nelum Pokuna, Lighthouse Galle) with GPS coordinates for OpenStreetMap and ticket tiers directly to Supabase.
                </p>
              </div>

              <button
                className="btn btn-primary"
                disabled={seeding}
                onClick={handleSeedDatabase}
                style={{ display: "flex", alignItems: "center", gap: 8, height: 42, padding: "0 20px" }}
              >
                {seeding ? (
                  <>
                    <IcRefresh className="spin" style={{ width: 15, height: 15 }} />
                    Syncing Sri Lanka Data…
                  </>
                ) : (
                  <>
                    <IcZap style={{ width: 15, height: 15 }} />
                    Seed Supabase Database
                  </>
                )}
              </button>
            </div>

            {seedResult && (
              <div className={`alert ${seedResult.supabaseSynced ? "alert-success" : "alert-info"}`} style={{ marginTop: 16 }}>
                <IcCheckCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                <div>
                  <strong>{seedResult.message}</strong>
                  <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
                    Injected {seedResult.eventsCount || 6} Sri Lankan Events, {seedResult.venuesCount || 6} Venues, and {seedResult.vendorsCount || 5} Vendor packages.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add & Assign User Modal */}
      {showAddUserModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20
        }}>
          <div className="card" style={{
            width: "100%",
            maxWidth: 540,
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid var(--c-border)" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>Add &amp; Assign User (Compulsory Fields)</div>
                <div style={{ fontSize: 12, color: "var(--c-text-2)" }}>Register and promote a verified user with compulsory NIC.</div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--c-text-3)", cursor: "pointer" }}
              >
                <IcX style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {modalError && (
              <div className="alert alert-error" style={{ marginBottom: 14 }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Full Name * <span style={{ color: "#ef4444" }}>(Compulsory)</span></label>
                  <input
                    className="form-input"
                    required
                    placeholder="e.g. Dilshan Fernando"
                    value={newUserForm.name}
                    onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11 }}>NIC Number * <span style={{ color: "#ef4444" }}>(Compulsory)</span></label>
                  <input
                    className="form-input"
                    required
                    placeholder="199212345678"
                    value={newUserForm.nic}
                    onChange={e => setNewUserForm({ ...newUserForm, nic: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11 }}>Contact Mobile * <span style={{ color: "#ef4444" }}>(Compulsory)</span></label>
                  <input
                    className="form-input"
                    required
                    placeholder="+94 77 123 4567"
                    value={newUserForm.contact}
                    onChange={e => setNewUserForm({ ...newUserForm, contact: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Email Address * <span style={{ color: "#ef4444" }}>(Compulsory)</span></label>
                  <input
                    className="form-input"
                    type="email"
                    required
                    placeholder="dilshan@example.lk"
                    value={newUserForm.email}
                    onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Address * <span style={{ color: "#ef4444" }}>(Compulsory)</span></label>
                  <textarea
                    className="form-input"
                    rows="2"
                    required
                    placeholder="No 12, Havelock Road, Colombo 05"
                    value={newUserForm.address}
                    onChange={e => setNewUserForm({ ...newUserForm, address: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Assign Initial Role</label>
                  <select
                    className="form-input"
                    value={newUserForm.role}
                    onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  >
                    <option value="Organizer">Organizer</option>
                    <option value="Admin">Admin</option>
                    <option value="Attendee">Attendee</option>
                    <option value="VendorVenueManager">Vendor / Venue Manager</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create &amp; Assign Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
