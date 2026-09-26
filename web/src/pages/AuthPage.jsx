import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  IcMail, IcLock, IcUser, IcTarget, IcBuilding, IcShield,
  IcCheck, IcX, IcClock, IcSparkles, IcCheckCircle, IcChevronRight,
  IcMapPin, IcCalendar, IcTicket
} from "../components/Icons.jsx";
import { supabase, saveSupabaseProfile } from "../api/supabase.js";

const ROLE_OPTS = [
  {
    id: "Attendee",
    label: "Attendee",
    sub: "Instant Access · Multi-Pass Booking",
    badge: "Instant Approval",
    color: "#10b981",
    Icon: IcUser
  },
  {
    id: "Organizer",
    label: "Event Organizer",
    sub: "Publish Events · Ticket Tiers · Venues",
    badge: "Admin Verification",
    color: "#3b82f6",
    Icon: IcTarget
  },
  {
    id: "VendorVenueManager",
    label: "Vendor / Venue Partner",
    sub: "List Venues on OSM · Catering & Audio",
    badge: "Admin Verification",
    color: "#8b5cf6",
    Icon: IcBuilding
  },
  {
    id: "Admin",
    label: "Platform Admin",
    sub: "Manage Approvals · DB & Audit",
    badge: "System Admin",
    color: "#f59e0b",
    Icon: IcShield
  }
];

export default function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode]                 = useState("login"); // "login" | "signup"
  const [email, setEmail]               = useState("");
  const [password, setPass]             = useState("");
  const [name, setName]                 = useState("");
  const [idType, setIdType]             = useState("NIC"); // "NIC" | "Passport"
  const [nic, setNic]                   = useState("");
  const [contact, setContact]           = useState("");
  const [address, setAddress]           = useState("");
  const [role, setRole]                 = useState("Attendee");
  const [organization, setOrg]          = useState("");
  const [error, setError]               = useState("");
  const [busy, setBusy]                 = useState(false);
  const [pendingModal, setPendingModal] = useState(null);

  // 3D Spatial Tilt Tracker
  const sceneRef = useRef(null);
  const [tilt, setTilt] = useState({ rotX: 4, rotY: -8, glowX: 50, glowY: 50 });

  function handleMouseMove(e) {
    if (!sceneRef.current) return;
    const rect = sceneRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -10;
    const rotY = ((x - centerX) / centerX) * 14;
    const glowX = (x / rect.width) * 100;
    const glowY = (y / rect.height) * 100;

    setTilt({ rotX, rotY, glowX, glowY });
  }

  function handleMouseLeave() {
    setTilt({ rotX: 4, rotY: -8, glowX: 50, glowY: 50 });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Check pending approval
      const pendingList = JSON.parse(localStorage.getItem("ef_pending_approvals") || "[]");
      const pendingUser = pendingList.find(p => p.email.toLowerCase() === cleanEmail && p.status !== "Approved");
      if (pendingUser) {
        setPendingModal(pendingUser);
        throw new Error(`Your ${pendingUser.role === 'VendorVenueManager' ? 'Vendor' : pendingUser.role} account is pending Admin Verification.`);
      }

      // Check approved custom users in localStorage
      const approvedUsers = JSON.parse(localStorage.getItem("ef_approved_users") || "[]");
      const approvedMatch = approvedUsers.find(u => u.email.toLowerCase() === cleanEmail);

      // 2. Authenticate with Supabase Auth
      let sbUser = null;
      let sbErrorMsg = null;
      try {
        const { data, error: sbError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });
        if (sbError) {
          sbErrorMsg = sbError.message;
        } else if (data?.user) {
          sbUser = data.user;
        }
      } catch (err) {
        sbErrorMsg = err.message;
      }

      if (sbUser) {
        const userMeta = sbUser.user_metadata || {};
        const userRole = userMeta.role || "Attendee";

        if (userRole !== "Attendee" && userRole !== "Admin" && !userMeta.isApproved && !approvedMatch) {
          const pInfo = {
            name: userMeta.name || email,
            email: cleanEmail,
            role: userRole,
            nic: userMeta.nic || "—",
            contact: userMeta.contact || "—",
            submittedAt: new Date().toISOString()
          };
          setPendingModal(pInfo);
          throw new Error(`Your ${userRole} account is pending Admin Verification.`);
        }

        login({
          id: sbUser.id,
          name: userMeta.name || cleanEmail.split("@")[0],
          role: userRole,
          email: sbUser.email,
          nic: userMeta.nic || "—",
          contact: userMeta.contact || "—",
          address: userMeta.address || "—"
        });
        return;
      }

      // 3. Authenticate with registered users in localStorage (registered via Sign Up form)
      const registeredUsers = JSON.parse(localStorage.getItem("ef_registered_users") || "[]");
      const registeredMatch = registeredUsers.find(
        u => u.email.toLowerCase() === cleanEmail && u.password === password
      );

      if (registeredMatch) {
        const isApproved =
          registeredMatch.role === "Attendee" ||
          registeredMatch.role === "Admin" ||
          registeredMatch.isApproved ||
          (approvedMatch && approvedMatch.status === "Approved");

        if (!isApproved) {
          setPendingModal(registeredMatch);
          throw new Error(`Your ${registeredMatch.role} account is pending Admin Verification.`);
        }

        login({
          id: registeredMatch.id,
          name: registeredMatch.name,
          role: registeredMatch.role,
          email: registeredMatch.email,
          nic: registeredMatch.nic,
          contact: registeredMatch.contact,
          address: registeredMatch.address
        });
        return;
      }

      // 4. No valid account found — reject login!
      throw new Error(
        sbErrorMsg ||
        "Invalid email or password. If you don't have an account yet, please click 'Create Account' above to sign up."
      );
    } catch (err) {
      setError(err.message || "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Full Name is compulsory."); return; }
    if (!email.trim()) { setError("Email Address is compulsory."); return; }
    if (!nic.trim()) {
      setError(`${idType === "Passport" ? "Passport Number & Country" : "National Identity Card (NIC)"} is compulsory.`);
      return;
    }
    if (!contact.trim()) { setError("Contact / Mobile Number is compulsory."); return; }
    if (!address.trim()) { setError("Residential / Business Address is compulsory."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setBusy(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const newUserId = crypto.randomUUID();
      const formattedId = `${idType}: ${nic.trim()}`;

      // Check if already registered
      const registeredUsers = JSON.parse(localStorage.getItem("ef_registered_users") || "[]");
      if (registeredUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
        setError("An account with this email already exists. Please sign in instead.");
        setBusy(false);
        return;
      }

      const requiresAdminApproval = (role === "Organizer" || role === "VendorVenueManager");

      const newUser = {
        id: newUserId,
        name: name.trim(),
        role: role,
        email: cleanEmail,
        password: password,
        idType: idType,
        nic: formattedId,
        contact: contact.trim(),
        address: address.trim(),
        organization: organization.trim() || `${name.trim()} Org`,
        isApproved: !requiresAdminApproval,
        createdAt: new Date().toISOString()
      };

      // Save user to registered accounts
      localStorage.setItem("ef_registered_users", JSON.stringify([newUser, ...registeredUsers]));

      // Create in Supabase Auth
      try {
        await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              name: newUser.name,
              role: newUser.role,
              idType: newUser.idType,
              nic: newUser.nic,
              contact: newUser.contact,
              address: newUser.address,
              isApproved: !requiresAdminApproval
            }
          }
        });
      } catch (sbErr) {
        console.warn("Supabase signup sync:", sbErr);
      }

      try {
        await saveSupabaseProfile({
          id: newUser.id,
          name: newUser.name,
          role: newUser.role,
          email: newUser.email,
          nic: newUser.nic,
          contact: newUser.contact,
          address: newUser.address,
          updated_at: new Date().toISOString()
        });
      } catch {}

      if (requiresAdminApproval) {
        const approvalRequest = {
          id: `req-${Date.now()}`,
          userId: newUserId,
          name: newUser.name,
          email: cleanEmail,
          role: role,
          idType: idType,
          nic: formattedId,
          contact: newUser.contact,
          address: newUser.address,
          organization: newUser.organization,
          status: "PendingAdminApproval",
          submittedAt: new Date().toISOString()
        };

        const existingReqs = JSON.parse(localStorage.getItem("ef_pending_approvals") || "[]");
        localStorage.setItem("ef_pending_approvals", JSON.stringify([approvalRequest, ...existingReqs.filter(r => r.email !== cleanEmail)]));

        setPendingModal(approvalRequest);
        setMode("login");
        return;
      }

      // Attendee or Admin: Immediate access
      login(newUser);
    } catch (err) {
      setError(err.message || "Registration encountered an issue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="auth-root"
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.15fr 1fr",
        background: "#040711",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background 3D Perspective Glow & Cosmic Aura */}
      <div style={{
        position: "absolute",
        top: "-15%",
        left: "25%",
        width: 650,
        height: 650,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(124,58,237,0.1) 45%, transparent 70%)",
        filter: "blur(70px)",
        pointerEvents: "none",
        zIndex: 0,
        animation: "rotateAura 20s linear infinite"
      }} />
      <div style={{
        position: "absolute",
        bottom: "-10%",
        right: "5%",
        width: 500,
        height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.08) 50%, transparent 70%)",
        filter: "blur(60px)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* Perspective 3D Grid Overlay on Floor */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "40vh",
        background: "linear-gradient(to top, rgba(37,99,235,0.06) 1px, transparent 1px), linear-gradient(to right, rgba(37,99,235,0.06) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        transform: "perspective(500px) rotateX(60deg)",
        transformOrigin: "bottom center",
        maskImage: "linear-gradient(to top, rgba(0,0,0,1), transparent 90%)",
        WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1), transparent 90%)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* ── Left Column: Form & Access Control ── */}
      <div
        className="auth-left"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "36px 32px",
          position: "relative",
          zIndex: 1
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: mode === "signup" ? 540 : 440,
            background: "rgba(11, 17, 33, 0.65)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.09)",
            borderRadius: "24px",
            padding: "32px 28px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(37, 99, 235, 0.08)",
            position: "relative"
          }}
        >
          {/* Subtle Top Glowing Line */}
          <div style={{
            position: "absolute",
            top: 0,
            left: "15%",
            right: "15%",
            height: "2px",
            background: "linear-gradient(90deg, transparent, #38bdf8, #818cf8, transparent)",
            borderRadius: "2px"
          }} />

          {/* Logo & Platform Tag */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 15px rgba(37,99,235,0.4)"
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em" }}>Eventflow</span>
                <span style={{ fontSize: 10, color: "#38bdf8", marginLeft: 6, fontWeight: 800, letterSpacing: "0.08em" }}>SRI LANKA</span>
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#34d399",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: 11,
                fontWeight: 700
              }}
            >
              <IcShield style={{ width: 12, height: 12 }} /> Sovereign Network
            </div>
          </div>

          {/* Headline */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em", color: "#ffffff", margin: 0 }}>
              {mode === "login" ? "Welcome back to EventFlow" : "Create your EventFlow Account"}
            </h1>
            <p style={{ fontSize: 13, color: "var(--c-text-2)", margin: "6px 0 0", lineHeight: 1.5 }}>
              {mode === "login"
                ? "Unified ticketing, registered venues, and multi-pass access."
                : "Instant attendee entry. Organizers & venue partners verified by Admin."}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: "flex",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: 4,
              marginBottom: 20
            }}
          >
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 13,
                fontWeight: 700,
                borderRadius: "8px",
                border: "none",
                background: mode === "login" ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "transparent",
                color: mode === "login" ? "#ffffff" : "var(--c-text-2)",
                boxShadow: mode === "login" ? "0 4px 14px rgba(37,99,235,0.4)" : "none",
                transition: "all 0.2s"
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(""); }}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 13,
                fontWeight: 700,
                borderRadius: "8px",
                border: "none",
                background: mode === "signup" ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "transparent",
                color: mode === "signup" ? "#ffffff" : "var(--c-text-2)",
                boxShadow: mode === "signup" ? "0 4px 14px rgba(37,99,235,0.4)" : "none",
                transition: "all 0.2s"
              }}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "10px",
                color: "#fca5a5",
                fontSize: 12,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              <IcX style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* ── Login Form ── */}
          {mode === "login" ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Email Address *</label>
                <div className="input-wrap">
                  <IcMail className="input-icon" />
                  <input
                    className="form-input"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Password *</label>
                <div className="input-wrap">
                  <IcLock className="input-icon" />
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPass(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                className="btn btn-primary btn-full btn-lg"
                disabled={busy}
                type="submit"
                style={{
                  height: 44,
                  fontWeight: 800,
                  fontSize: 14,
                  marginTop: 6,
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  boxShadow: "0 8px 25px rgba(37,99,235,0.35)",
                  border: "none",
                  borderRadius: "10px"
                }}
              >
                {busy ? "Authenticating…" : "Sign In to EventFlow"}
              </button>
            </form>
          ) : (
            /* ── Sign Up Form ── */
            <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Role Selection */}
              <div>
                <label className="form-label" style={{ fontSize: 11, marginBottom: 6, display: "block" }}>Select Account Type *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {ROLE_OPTS.map(r => {
                    const isSelected = role === r.id;
                    const Icon = r.Icon;
                    return (
                      <div
                        key={r.id}
                        className="auth-role-pill"
                        onClick={() => setRole(r.id)}
                        style={{
                          padding: "10px 8px",
                          borderRadius: "10px",
                          background: isSelected ? "rgba(37,99,235,0.18)" : "rgba(255,255,255,0.03)",
                          border: isSelected ? "1.5px solid #3b82f6" : "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                          textAlign: "center"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                          <Icon style={{ width: 18, height: 18, color: isSelected ? "#60a5fa" : "var(--c-text-3)" }} />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? "#ffffff" : "var(--c-text-2)" }}>{r.label}</div>
                        <div style={{ fontSize: 9, color: isSelected ? "#93c5fd" : "var(--c-text-3)", marginTop: 2 }}>{r.badge}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px" }}>
                <div className="form-group" style={{ gridColumn: "1/-1", marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Full Name * <span style={{ color: "#ef4444" }}>(Compulsory)</span></label>
                  <div className="input-wrap">
                    <IcUser className="input-icon" />
                    <input
                      className="form-input"
                      placeholder="e.g. Kasun Jayawardena"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                    <span>ID Type *</span>
                    <span style={{ color: "#38bdf8", fontSize: 10 }}>NIC / Passport</span>
                  </label>
                  <select
                    className="form-input"
                    value={idType}
                    onChange={e => setIdType(e.target.value)}
                  >
                    <option value="NIC">🇱🇰 Citizen (NIC)</option>
                    <option value="Passport">🌐 Foreigner (Passport)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>
                    {idType === "Passport" ? "Passport No. & Country *" : "National ID (NIC) *"} <span style={{ color: "#ef4444" }}>(Compulsory)</span>
                  </label>
                  <input
                    className="form-input"
                    placeholder={idType === "Passport" ? "e.g. N12345678 (UK)" : "e.g. 199512345678"}
                    value={nic}
                    onChange={e => setNic(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1/-1", marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Mobile / WhatsApp Contact * <span style={{ color: "#ef4444" }}>(Compulsory)</span></label>
                  <input
                    className="form-input"
                    placeholder="e.g. +94 77 123 4567"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1/-1", marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Email Address * <span style={{ color: "#ef4444" }}>(Compulsory)</span></label>
                  <div className="input-wrap">
                    <IcMail className="input-icon" />
                    <input
                      className="form-input"
                      type="email"
                      placeholder="you@domain.lk"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: "1/-1", marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Residential / Business Address * <span style={{ color: "#ef4444" }}>(Compulsory)</span></label>
                  <textarea
                    className="form-input"
                    rows="2"
                    placeholder="e.g. No. 45, Galle Road, Colombo 03"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    required
                  />
                </div>

                {role !== "Attendee" && (
                  <div className="form-group" style={{ gridColumn: "1/-1", marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Company / Organization Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Colombo Events & Media Ltd"
                      value={organization}
                      onChange={e => setOrg(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: "1/-1", marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Account Password *</label>
                  <div className="input-wrap">
                    <IcLock className="input-icon" />
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={e => setPass(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {role !== "Attendee" ? (
                <div style={{ padding: "10px 12px", background: "rgba(37,99,235,0.1)", border: "1px dashed rgba(37,99,235,0.4)", borderRadius: "10px", fontSize: 12, color: "#93c5fd" }}>
                  <strong style={{ color: "#ffffff" }}>Admin Verification Notice:</strong> As an <strong>{role === "VendorVenueManager" ? "Vendor / Venue Partner" : "Organizer"}</strong>, an administrator will review your NIC details before your account is activated.
                </div>
              ) : (
                <div style={{ padding: "8px 12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "10px", fontSize: 12, color: "#86efac" }}>
                  ✓ <strong>Instant Attendee Access:</strong> Multi-pass booking &amp; child free ticket enabled.
                </div>
              )}

              <button
                className="btn btn-primary btn-full btn-lg"
                disabled={busy}
                type="submit"
                style={{
                  height: 44,
                  fontWeight: 800,
                  fontSize: 14,
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  boxShadow: "0 8px 25px rgba(37,99,235,0.35)",
                  border: "none",
                  borderRadius: "10px"
                }}
              >
                {busy
                  ? "Processing Registration…"
                  : role === "Attendee"
                    ? "Create Account & Sign In"
                    : "Submit for Admin Approval"}
              </button>
            </form>
          )}

          {/* ── Security & Authentication Notice ── */}
          <div style={{ marginTop: 22, padding: "12px 14px", borderRadius: "10px", background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.18)", display: "flex", alignItems: "center", gap: 10 }}>
            <IcShield style={{ width: 18, height: 18, color: "#60a5fa", flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: "var(--c-text-2)", lineHeight: 1.4 }}>
              Protected by encrypted authentication. If you are new to EventFlow, click <strong style={{ color: "#93c5fd" }}>Create Account</strong> above to register.
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Column: Marvelous 3D Spatial Islandwide Venue & Security Ecosystem ── */}
      <div
        className="auth-right"
        ref={sceneRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          position: "relative",
          zIndex: 1,
          overflow: "visible"
        }}
      >
        {/* 3D Scene Viewport */}
        <div className="auth-3d-scene" style={{ width: "100%", maxWidth: 460 }}>
          {/* Main 3D Spatial Holographic Hub Card */}
          <div
            className="auth-3d-card"
            style={{
              transform: `perspective(1200px) rotateX(${tilt.rotX}deg) rotateY(${tilt.rotY}deg) translateZ(10px)`,
              position: "relative"
            }}
          >
            {/* The Main Holographic Glass Card */}
            <div
              className="holo-foil-border"
              style={{
                background: "linear-gradient(145deg, rgba(15, 23, 42, 0.92) 0%, rgba(3, 7, 18, 0.96) 100%)",
                boxShadow: `0 35px 80px -15px rgba(0,0,0,0.95), 0 0 50px rgba(37,99,235,0.25)`,
                backdropFilter: "blur(24px)",
                padding: "28px 24px",
                position: "relative",
                overflow: "hidden"
              }}
            >
              {/* Dynamic Iridescent Light Sheen */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(circle at ${tilt.glowX}% ${tilt.glowY}%, rgba(56, 189, 248, 0.16) 0%, rgba(139, 92, 246, 0.09) 40%, transparent 70%)`,
                  pointerEvents: "none"
                }}
              />

              {/* Hub Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "linear-gradient(135deg, #38bdf8, #2563eb)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 15px rgba(56,189,248,0.4)"
                    }}
                  >
                    <IcSparkles style={{ width: 16, height: 16, color: "#ffffff" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#ffffff", letterSpacing: "0.02em" }}>
                      SRI LANKA EVENT ECOSYSTEM
                    </div>
                    <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 800, letterSpacing: "0.08em" }}>
                      NEXT-GEN SMART VENUE &amp; PASS ENGINE
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    padding: "4px 10px",
                    borderRadius: 99,
                    color: "#34d399",
                    fontSize: 10,
                    fontWeight: 800
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
                  ONLINE &amp; SECURE
                </div>
              </div>

              {/* 3D Visual Stage Showcase: Registered Iconic Sri Lankan Venues */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(124,58,237,0.14) 100%)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "16px",
                  padding: "16px",
                  marginBottom: 16,
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, color: "#93c5fd", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Verified Venue Network
                  </span>
                  <span className="badge badge-blue" style={{ fontSize: 10 }}>OSM Geospatial</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "rgba(0,0,0,0.35)", padding: "10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#ffffff" }}>🏛️ BMICH Colombo</div>
                    <div style={{ fontSize: 10, color: "var(--c-text-3)", marginTop: 2 }}>Main Hall &amp; Convention Expo</div>
                    <div style={{ fontSize: 9, color: "#34d399", fontWeight: 700, marginTop: 4 }}>✓ Turnstiles Active</div>
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.35)", padding: "10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#ffffff" }}>🎭 Nelum Pokuna</div>
                    <div style={{ fontSize: 10, color: "var(--c-text-3)", marginTop: 2 }}>Lotus Theatre &amp; Auditorium</div>
                    <div style={{ fontSize: 9, color: "#34d399", fontWeight: 700, marginTop: 4 }}>✓ Multi-Tier Seating</div>
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.35)", padding: "10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#ffffff" }}>🏰 Jetwing Lighthouse</div>
                    <div style={{ fontSize: 10, color: "var(--c-text-3)", marginTop: 2 }}>Galle Fort Oceanfront</div>
                    <div style={{ fontSize: 9, color: "#34d399", fontWeight: 700, marginTop: 4 }}>✓ VIP &amp; Executive</div>
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.35)", padding: "10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#ffffff" }}>⛰️ Royal Grand Kandy</div>
                    <div style={{ fontSize: 10, color: "var(--c-text-3)", marginTop: 2 }}>Peradeniya Heritage Hall</div>
                    <div style={{ fontSize: 9, color: "#34d399", fontWeight: 700, marginTop: 4 }}>✓ Cultural Stages</div>
                  </div>
                </div>
              </div>

              {/* Security & Multi-Pass Architecture Matrix */}
              <div
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "14px",
                  padding: "14px",
                  marginBottom: 16
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: "#ffffff", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <IcShield style={{ width: 14, height: 14, color: "#38bdf8" }} />
                  Zero-Trust Identity &amp; Turnstile Security
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", fontSize: 11 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--c-text-2)" }}>
                    <span style={{ color: "#34d399", fontWeight: 800 }}>✓</span>
                    <span><strong>1–10 Unique Passes</strong> / Booking</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--c-text-2)" }}>
                    <span style={{ color: "#34d399", fontWeight: 800 }}>✓</span>
                    <span><strong>NIC / Passport</strong> Identification</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--c-text-2)" }}>
                    <span style={{ color: "#34d399", fontWeight: 800 }}>✓</span>
                    <span><strong>Child &lt;5 Yrs</strong> 100% Free Pass</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--c-text-2)" }}>
                    <span style={{ color: "#34d399", fontWeight: 800 }}>✓</span>
                    <span><strong>LKR (Rs.)</strong> Sovereign Currency</span>
                  </div>
                </div>
              </div>

              {/* Live Turnstile Radar Status */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 11
                }}
              >
                <div style={{ color: "var(--c-text-3)" }}>Turnstile Scanning Speed:</div>
                <div style={{ color: "#38bdf8", fontWeight: 800, fontFamily: "monospace" }}>&lt; 0.20s Per Pass Validation</div>
              </div>
            </div>

            {/* ── Orbiting 3D Floating Badges (Spatial Depth) ── */}
            {/* 1. Top Right: Instant Turnstile */}
            <div
              style={{
                position: "absolute",
                top: 40,
                right: -24,
                background: "rgba(15, 23, 42, 0.88)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                borderRadius: "12px",
                padding: "8px 12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.6), 0 0 15px rgba(56,189,248,0.2)",
                animation: "floatBadge1 4s ease-in-out infinite",
                zIndex: 20
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#ffffff" }}>Instant Turnstiles</div>
                  <div style={{ fontSize: 9, color: "#38bdf8" }}>0.2s QR Scan</div>
                </div>
              </div>
            </div>

            {/* 2. Bottom Left: Child Under 5 Free Ticket */}
            <div
              style={{
                position: "absolute",
                bottom: 60,
                left: -28,
                background: "rgba(15, 23, 42, 0.88)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                borderRadius: "12px",
                padding: "8px 12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.6), 0 0 15px rgba(16,185,129,0.2)",
                animation: "floatBadge2 4.5s ease-in-out infinite",
                zIndex: 20
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>👶</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#34d399" }}>Child Under 5: Free</div>
                  <div style={{ fontSize: 9, color: "var(--c-text-2)" }}>Parent NIC Verified</div>
                </div>
              </div>
            </div>

            {/* 3. Bottom Right: Registered Venues */}
            <div
              style={{
                position: "absolute",
                bottom: -15,
                right: -10,
                background: "rgba(15, 23, 42, 0.88)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(139, 92, 246, 0.4)",
                borderRadius: "12px",
                padding: "8px 12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.6), 0 0 15px rgba(139,92,246,0.2)",
                animation: "floatBadge3 5s ease-in-out infinite",
                zIndex: 20
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>🇱🇰</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#c084fc" }}>Registered Venues</div>
                  <div style={{ fontSize: 9, color: "var(--c-text-2)" }}>BMICH · Nelum Pokuna</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Admin Approval Pending Modal ── */}
      {pendingModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              background: "#0f172a",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              borderRadius: "20px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.9)",
              textAlign: "center",
              padding: 32
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(37,99,235,0.15)",
                border: "1px solid rgba(37,99,235,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <IcClock style={{ width: 28, height: 28, color: "#60a5fa" }} />
            </div>

            <div
              style={{
                display: "inline-block",
                padding: "3px 10px",
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.4)",
                borderRadius: 99,
                color: "#fbbf24",
                fontSize: 11,
                fontWeight: 800,
                marginBottom: 12
              }}
            >
              Verification Request Submitted
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#ffffff", marginBottom: 8 }}>
              Admin Approval Required
            </h2>

            <p style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.6, marginBottom: 20 }}>
              Your application as an <strong>{pendingModal.role === "VendorVenueManager" ? "Vendor / Venue Partner" : "Event Organizer"}</strong> has been received by EventFlow Sri Lanka Administration.
            </p>

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--c-border)", borderRadius: "10px", padding: 14, textAlign: "left", marginBottom: 20, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--c-text-3)" }}>Applicant:</span>
                <strong style={{ color: "#ffffff" }}>{pendingModal.name}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--c-text-3)" }}>Identity (NIC):</span>
                <strong style={{ color: "#34d399" }}>{pendingModal.nic}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--c-text-3)" }}>Email:</span>
                <span style={{ color: "#93c5fd" }}>{pendingModal.email}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--c-text-3)" }}>Status:</span>
                <span className="badge badge-amber" style={{ fontSize: 10 }}>Pending Review</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-full"
              style={{ height: 42, fontWeight: 700 }}
              onClick={() => setPendingModal(null)}
            >
              Understood, Return to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
