import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  IcHome, IcLayout, IcCpu, IcCheckCircle, IcBuilding,
  IcLogOut, IcTicket, IcDatabase, IcChevronLeft, IcChevronRight, IcCompass,
  IcSettings, IcUser, IcCheck, IcX
} from "./Icons.jsx";

const NAV = [
  { to: "/",          Icon: IcHome,        label: "Discover Events", roles: ["Organizer", "Attendee", "Admin", "VendorVenueManager"] },
  { to: "/attendee",  Icon: IcTicket,      label: "My Passes & QR",  roles: ["Attendee", "Admin"] },
  { to: "/organizer", Icon: IcLayout,      label: "Dashboard",       roles: ["Organizer", "Admin"] },
  { to: "/vendor",    Icon: IcCompass,     label: "Venues & Map",    roles: ["VendorVenueManager", "Admin", "Organizer"] },
  { to: "/agent",     Icon: IcCpu,         label: "AI Planner",      roles: ["Organizer", "Admin"] },
  { to: "/approvals", Icon: IcCheckCircle, label: "Approvals",       roles: ["Admin"] },
  { to: "/admin",     Icon: IcDatabase,    label: "Admin & Supabase", roles: ["Admin"] },
];

const ROLE_COLOR = {
  Organizer: "#2563eb",
  Attendee: "#16a34a",
  VendorVenueManager: "#7c3aed",
  Admin: "#d97706",
};

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => localStorage.getItem("ef_theme") || "dark");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    contact: "",
    address: "",
    nic: ""
  });
  const [profileSuccess, setProfileSuccess] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ef_theme") || "dark";
    if (saved === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("ef_theme", next);
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function handleOpenProfile() {
    setProfileForm({
      name: user?.name || "",
      contact: user?.contact || "",
      address: user?.address || "",
      nic: user?.nic || ""
    });
    setProfileSuccess(false);
    setShowProfileModal(true);
  }

  function handleSaveProfile(e) {
    e.preventDefault();
    const updated = {
      ...user,
      name: profileForm.name.trim(),
      contact: profileForm.contact.trim(),
      address: profileForm.address.trim(),
      nic: profileForm.nic.trim()
    };
    login(updated);

    try {
      const list = JSON.parse(localStorage.getItem("ef_approved_users") || "[]");
      const mapped = list.map(u => (u.id === user?.id || u.email === user?.email) ? { ...u, ...updated } : u);
      localStorage.setItem("ef_approved_users", JSON.stringify(mapped));
      window.dispatchEvent(new Event("storage"));
    } catch {}

    setProfileSuccess(true);
    setTimeout(() => {
      setShowProfileModal(false);
      setProfileSuccess(false);
    }, 1000);
  }

  const links = NAV.filter(n => (n.roles || []).includes(user?.role || "Organizer"));
  const initials = (user?.name || user?.email || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => (w && w[0]) || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingDeletionsCount, setPendingDeletionsCount] = useState(0);

  useEffect(() => {
    function checkApprovals() {
      try {
        const list = JSON.parse(localStorage.getItem("ef_pending_approvals") || "[]");
        const pending = list.filter(p => p.status !== "Approved");
        setPendingApprovalsCount(pending.length);
        const deletions = pending.filter(p => p.type === "EVENT_DELETION" || p.type === "VENUE_DELETION");
        setPendingDeletionsCount(deletions.length);
      } catch {
        setPendingApprovalsCount(0);
        setPendingDeletionsCount(0);
      }
    }

    checkApprovals();
    window.addEventListener("storage", checkApprovals);
    const interval = setInterval(checkApprovals, 2000);
    return () => {
      window.removeEventListener("storage", checkApprovals);
      clearInterval(interval);
    };
  }, []);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Header with Logo and Collapse Toggle */}
      <div className="sb-logo" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div className="sb-logo-mark">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {!collapsed && <span className="sb-logo-text">Eventflow</span>}
        </div>

        <button
          className="sb-toggle-btn"
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid var(--c-border)",
            borderRadius: 6,
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--c-text-2)",
            padding: 0,
            flexShrink: 0
          }}
        >
          {collapsed ? <IcChevronRight style={{ width: 13, height: 13 }} /> : <IcChevronLeft style={{ width: 13, height: 13 }} />}
        </button>
      </div>

      {!collapsed && <span className="sb-section">Navigation</span>}

      <nav className="sb-nav">
        {links.map(({ to, Icon, label }) => {
          const isAdminTab = to === "/admin";
          const isApprovalsTab = to === "/approvals";
          const showAdminBadge = user?.role === "Admin" && isAdminTab && pendingApprovalsCount > 0;
          const showApprovalsBadge = user?.role === "Admin" && isApprovalsTab && pendingApprovalsCount > 0;
          const badgeCount = showAdminBadge || showApprovalsBadge ? pendingApprovalsCount : 0;
          const hasDeletions = pendingDeletionsCount > 0;

          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => `sb-link ${isActive ? "active" : ""}`}
              title={collapsed ? (badgeCount > 0 ? `${label} (${badgeCount} pending approval)` : label) : undefined}
              style={{ position: "relative" }}
            >
              <div style={{ position: "relative", display: "inline-flex" }}>
                <Icon className="sb-link-icon" />
                {collapsed && badgeCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -3,
                      right: -3,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: hasDeletions ? "#ef4444" : "#f59e0b",
                      border: "2px solid #000"
                    }}
                  />
                )}
              </div>
              {!collapsed && (
                <>
                  <span style={{ flex: 1 }}>{label}</span>
                  {badgeCount > 0 && (
                    <span
                      style={{
                        background: hasDeletions ? "#ef4444" : "#f59e0b",
                        color: "#ffffff",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 10,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        lineHeight: 1.4
                      }}
                      title={hasDeletions ? `${pendingDeletionsCount} Deletion Request(s) awaiting Admin approval` : `${badgeCount} Pending approvals`}
                    >
                      {hasDeletions && <span>⚠️</span>}
                      {badgeCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile, Theme Toggle & Sign Out */}
      <div className="sb-user">
        <div
          className="sb-user-card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(255, 255, 255, 0.02)"
          }}
        >
          <div
            className="sb-avatar"
            style={{ background: ROLE_COLOR[user?.role] || "#2563eb", cursor: "pointer" }}
            onClick={handleOpenProfile}
            title="Click to view & edit Profile"
          >
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="sb-user-info" style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={handleOpenProfile} title="Click to view & edit Profile">
                <div className="sb-user-name" title={user?.name}>{user?.name}</div>
                <div className="sb-user-role">{user?.role === "VendorVenueManager" ? "Vendor / Venue" : user?.role}</div>
              </div>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid var(--c-border)",
                  borderRadius: 6,
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 12
                }}
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>

              {/* Profile Edit Button */}
              <button
                type="button"
                onClick={handleOpenProfile}
                title="Edit My Profile"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid var(--c-border)",
                  borderRadius: 6,
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--c-text-2)",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                <IcSettings style={{ width: 13, height: 13 }} />
              </button>

              {/* Sign Out Button */}
              <button
                type="button"
                className="sb-logout-icon-btn"
                onClick={() => { if (window.confirm("Are you sure you want to sign out?")) { logout(); navigate("/login"); } }}
                title="Sign out"
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: 6,
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f87171",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.28)"; e.currentTarget.style.color = "#ffffff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)"; e.currentTarget.style.color = "#f87171"; }}
              >
                <IcLogOut style={{ width: 13, height: 13 }} />
              </button>
            </>
          )}
        </div>

        {collapsed && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", marginTop: 8 }}>
            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid var(--c-border)",
                borderRadius: 6,
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                fontSize: 12
              }}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              type="button"
              onClick={handleOpenProfile}
              title="My Profile"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid var(--c-border)",
                borderRadius: 6,
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--c-text-2)",
                cursor: "pointer",
                padding: 0
              }}
            >
              <IcSettings style={{ width: 13, height: 13 }} />
            </button>
            <button
              type="button"
              className="sb-logout-icon-btn"
              onClick={() => { if (window.confirm("Are you sure you want to sign out?")) { logout(); navigate("/login"); } }}
              title="Sign out"
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: 6,
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f87171",
                cursor: "pointer",
                padding: 0
              }}
            >
              <IcLogOut style={{ width: 13, height: 13 }} />
            </button>
          </div>
        )}
      </div>

      {/* My Profile Modal */}
      {showProfileModal && (
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
            maxWidth: 500,
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
            padding: 24
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid var(--c-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="sb-avatar" style={{ background: ROLE_COLOR[user?.role] || "#2563eb", width: 36, height: 36, fontSize: 14 }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>My User Profile</div>
                  <div style={{ fontSize: 12, color: "var(--c-text-2)" }}>Update contact information and Sri Lanka address.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--c-text-3)", cursor: "pointer" }}
              >
                <IcX style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {profileSuccess && (
              <div className="alert alert-success" style={{ marginBottom: 16 }}>
                <IcCheck style={{ width: 15, height: 15, flexShrink: 0 }} /> Profile updated successfully!
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Full Name *</label>
                  <input
                    className="form-input"
                    required
                    value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Sri Lankan NIC *</label>
                    <input
                      className="form-input"
                      required
                      value={profileForm.nic}
                      onChange={e => setProfileForm({ ...profileForm, nic: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Mobile Contact *</label>
                    <input
                      className="form-input"
                      required
                      placeholder="+94 77 123 4567"
                      value={profileForm.contact}
                      onChange={e => setProfileForm({ ...profileForm, contact: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Email Address (Account ID)</label>
                  <input
                    className="form-input"
                    disabled
                    value={user?.email || ""}
                    style={{ opacity: 0.6, cursor: "not-allowed" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Permanent Address *</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    required
                    value={profileForm.address}
                    onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--c-border)" }}>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--c-text-3)", textTransform: "uppercase", fontWeight: 700 }}>Account Role</span>
                    <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13 }}>{user?.role === "VendorVenueManager" ? "Vendor & Venue Manager" : user?.role}</div>
                  </div>
                  <span className="badge badge-blue">Verified Member</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
