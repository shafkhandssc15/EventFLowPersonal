import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "../context/RealtimeContext.jsx";
import {
  IcPlus, IcCalendar, IcMapPin, IcUsers, IcEye, IcCheck,
  IcAlert, IcBuilding, IcShield, IcCompass, IcMail, IcImage,
  IcCheckCircle, IcClock, IcX
} from "../components/Icons.jsx";
import { SAMPLE_VENUES, formatLKR, FALLBACK_IMAGE } from "../api/supabase.js";
import ImageUploader from "../components/ImageUploader.jsx";
import BookingChatDrawer from "../components/BookingChatDrawer.jsx";

const CATS = ["Technology", "Music", "Sports", "Art", "Food", "Business", "Health", "Education", "Other"];

const STATUS_BADGE = {
  Draft:                "badge-gray",
  Published:            "badge-green",
  Ongoing:              "badge-blue",
  Completed:            "badge-purple",
  Cancelled:            "badge-red",
  "Deletion Requested": "badge-amber",
  "Pending Deletion":   "badge-amber",
};

export default function OrganizerDashboard() {
  const { user } = useAuth();

  // ── Realtime: events & venues from central Supabase subscription ───────────
  const { events, venues: realtimeVenues, upsertEvent, deleteEvent: rtDeleteEvent, connected } = useRealtime();

  const [registeredVenues, setRegisteredVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [success, setSuccess]         = useState(null);
  const [error, setError]             = useState(null);
  const [busy, setBusy]               = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  // Payment Verification & Messaging state
  const [activeTab, setActiveTab]     = useState("events"); // "events" | "slips" | "tickets"
  const [eventFilter, setEventFilter] = useState("mine"); // "mine" | "all"
  const [masterBookings, setMasterBookings] = useState([]);
  const [selectedChatBooking, setSelectedChatBooking] = useState(null);
  const [slipFilter, setSlipFilter]   = useState("All"); // "All" | "PendingApproval" | "Confirmed" | "Rejected"

  // Direct Approve / Reject state
  const [rejectTarget, setRejectTarget]     = useState(null);  // booking being rejected
  const [rejectMsg, setRejectMsg]           = useState("");     // rejection message
  const [payBusy, setPayBusy]               = useState("");     // bookingRef being actioned

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Technology",
    venueId: "",
    startDate: "",
    endDate: "",
    capacity: 1000,
    price: 7500,
  });

  function loadAll() {
    setLoading(true);

    // 1. Load Registered Venues — prefer Realtime venues, fall back to localStorage + SAMPLE_VENUES
    const rtVenues = realtimeVenues.length > 0 ? realtimeVenues : null;
    let venueList = rtVenues || SAMPLE_VENUES;
    try {
      const custom = JSON.parse(localStorage.getItem("ef_registered_venues") || "[]");
      venueList = rtVenues || [...custom, ...SAMPLE_VENUES.filter(sv => !custom.some(cv => cv.id === sv.id))];
    } catch {}
    setRegisteredVenues(venueList);

    // 2. Check if a venue was pre-selected from the Venues page
    try {
      const preselected = JSON.parse(localStorage.getItem("ef_preselected_venue") || "null");
      if (preselected) {
        setSelectedVenue(preselected);
        setForm(f => ({
          ...f,
          venueId: preselected.id,
          capacity: preselected.capacity || 1000
        }));
        setShowForm(true);
        localStorage.removeItem("ef_preselected_venue");
      } else if (venueList.length > 0) {
        setSelectedVenue(venueList[0]);
        setForm(f => ({ ...f, venueId: venueList[0].id, capacity: venueList[0].capacity || 1000 }));
      }
    } catch {
      if (venueList.length > 0) {
        setSelectedVenue(venueList[0]);
        setForm(f => ({ ...f, venueId: venueList[0].id, capacity: venueList[0].capacity || 1000 }));
      }
    }

    // 3. Events are live via useRealtime() — no fetch needed here
    setLoading(false);

    // 4. Load Master Bookings for Slip Verification (Only real bookings from attendees)
    try {
      const savedBookings = JSON.parse(localStorage.getItem("ef_master_bookings") || "[]");
      // Filter out any legacy sample bookings
      const realBookings = savedBookings.filter(b =>
        b.bookingRef !== "BK-LK-883011" &&
        b.bookingRef !== "BK-LK-908214" &&
        b.bookingRef !== "BK-LK-441092"
      );
      if (realBookings.length !== savedBookings.length) {
        localStorage.setItem("ef_master_bookings", JSON.stringify(realBookings));
      }
      setMasterBookings(realBookings);
    } catch {
      setMasterBookings([]);
    }
  }

  // Refresh bookings from localStorage
  function refreshBookings() {
    try {
      const saved = JSON.parse(localStorage.getItem("ef_master_bookings") || "[]");
      setMasterBookings(saved);
    } catch {}
  }

  // Direct payment approval by organizer
  function handleApprovePayment(booking) {
    setPayBusy(booking.bookingRef);
    try {
      // 1. Update master bookings
      const master = JSON.parse(localStorage.getItem("ef_master_bookings") || "[]");
      const updated = master.map(b =>
        b.bookingRef === booking.bookingRef ? { ...b, status: "Confirmed", rejectionReason: null } : b
      );
      localStorage.setItem("ef_master_bookings", JSON.stringify(updated));
      setMasterBookings(updated);

      // 2. Update attendee tickets
      const attKey = `ef_tickets_${booking.attendeeId}`;
      const attTickets = JSON.parse(localStorage.getItem(attKey) || "[]");
      const updAttTickets = attTickets.map(t =>
        t.bookingRef === booking.bookingRef ? { ...t, paymentStatus: "Confirmed", rejectionReason: null } : t
      );
      localStorage.setItem(attKey, JSON.stringify(updAttTickets));

      // 3. Post system message in chat thread
      const chatKey = `ef_booking_msgs_${booking.bookingRef}`;
      const chatMsgs = JSON.parse(localStorage.getItem(chatKey) || "[]");
      const notice = {
        id: `msg-status-${Date.now()}`,
        senderId: user?.id,
        senderName: "System · EventFlow",
        senderRole: "System",
        isStatusAlert: true,
        statusType: "Confirmed",
        text: `🎉 Payment approved by organizer ${user?.name || ""}! Booking ${booking.bookingRef} is CONFIRMED. Entrance QR passes are now active.`,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(chatKey, JSON.stringify([...chatMsgs, notice]));
      window.dispatchEvent(new Event("storage"));

      setSuccess(`✅ Payment for ${booking.attendeeName} (${booking.bookingRef}) APPROVED — QR passes activated!`);
    } catch (err) {
      setError("Failed to approve: " + err.message);
    } finally {
      setPayBusy("");
    }
  }

  // Direct payment rejection with message
  function handleRejectPayment(e) {
    e.preventDefault();
    if (!rejectTarget || !rejectMsg.trim()) return;
    setPayBusy(rejectTarget.bookingRef);
    try {
      const reason = rejectMsg.trim();

      // 1. Update master bookings
      const master = JSON.parse(localStorage.getItem("ef_master_bookings") || "[]");
      const updated = master.map(b =>
        b.bookingRef === rejectTarget.bookingRef ? { ...b, status: "Rejected", rejectionReason: reason } : b
      );
      localStorage.setItem("ef_master_bookings", JSON.stringify(updated));
      setMasterBookings(updated);

      // 2. Update attendee tickets
      const attKey = `ef_tickets_${rejectTarget.attendeeId}`;
      const attTickets = JSON.parse(localStorage.getItem(attKey) || "[]");
      const updAttTickets = attTickets.map(t =>
        t.bookingRef === rejectTarget.bookingRef ? { ...t, paymentStatus: "Rejected", rejectionReason: reason } : t
      );
      localStorage.setItem(attKey, JSON.stringify(updAttTickets));

      // 3. Post rejection message in chat thread
      const chatKey = `ef_booking_msgs_${rejectTarget.bookingRef}`;
      const chatMsgs = JSON.parse(localStorage.getItem(chatKey) || "[]");
      const notice = {
        id: `msg-status-${Date.now()}`,
        senderId: user?.id,
        senderName: "System · EventFlow",
        senderRole: "System",
        isStatusAlert: true,
        statusType: "Rejected",
        text: `⚠️ Payment slip rejected by organizer. Reason: "${reason}". Attendee can re-upload a corrected slip.`,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(chatKey, JSON.stringify([...chatMsgs, notice]));
      window.dispatchEvent(new Event("storage"));

      setSuccess(`❌ Payment for ${rejectTarget.attendeeName} rejected. Reason sent to attendee.`);
      setRejectTarget(null);
      setRejectMsg("");
    } catch (err) {
      setError("Failed to reject: " + err.message);
    } finally {
      setPayBusy("");
    }
  }

  useEffect(loadAll, []);

  function handleVenueChange(venueId) {
    const v = registeredVenues.find(ven => ven.id === venueId);
    if (v) {
      setSelectedVenue(v);
      setForm(prev => ({
        ...prev,
        venueId: v.id,
        capacity: v.capacity || prev.capacity
      }));
    }
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Rule enforcement: Organizers can ONLY register events at verified registered venues
    if (!selectedVenue) {
      setError("Organizers can only host events at verified registered venues. Please select a registered venue.");
      return;
    }

    if (Number(form.capacity) > Number(selectedVenue.capacity)) {
      setError(`Event capacity (${form.capacity} pax) exceeds the registered capacity of ${selectedVenue.name} (${selectedVenue.capacity} pax).`);
      return;
    }

    setBusy(true);

    try {
      if (editingEventId) {
        const targetEvent = events.find(e => e.id === editingEventId);
        if (targetEvent && !isEventCreator(targetEvent, user)) {
          setError(`Permission denied: You can only edit events that you have created. "${targetEvent.title}" belongs to ${targetEvent.organizerName || 'another organizer'}.`);
          setBusy(false);
          return;
        }
      }

      const newEvent = {
        id: editingEventId || `ev-lk-${Date.now()}`,
        organizerId: user?.id || "00000000-0000-0000-0000-0000000000aa",
        organizerName: user?.name || "Alex Chen · Tech Lanka",
        organizerEmail: user?.email || "organizer@demo.com",
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        venueId: selectedVenue.id,
        location: `${selectedVenue.name}, ${selectedVenue.location}`,
        lat: selectedVenue.lat,
        lng: selectedVenue.lng,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : new Date().toISOString(),
        endDate:   form.endDate ? new Date(form.endDate).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        capacity:  Number(form.capacity),
        status:    "Published",
        image:     form.image || selectedVenue.image || FALLBACK_IMAGE,
        ticketTypes: [
          {
            id: `tt-lk-${Date.now()}-1`,
            name: "Standard Delegate Pass",
            price: Number(form.price) || 7500,
            quantity: Number(form.capacity),
            sold: 0
          }
        ]
      };

      // Use the Realtime mutator — writes to Supabase API + updates state + broadcasts to all clients
      const { event: savedEvent, error: apiError } = await upsertEvent(newEvent, !!editingEventId);

      if (apiError) {
        console.warn("[OrganizerDashboard] API error (saved locally):", apiError);
      }

      if (editingEventId) {
        setSuccess(`Event "${savedEvent.title}" successfully updated!`);
      } else {
        window.dispatchEvent(new Event("storage"));
        setSuccess(`Event "${savedEvent.title}" successfully hosted at registered venue "${selectedVenue.name}"! ${apiError ? "(saved locally – backend offline)" : "Saved to Supabase ✓"}`);
      }

      setShowForm(false);
      setEditingEventId(null);
      setForm({
        title: "", description: "", category: "Technology",
        venueId: registeredVenues[0]?.id || "",
        startDate: "", endDate: "", capacity: registeredVenues[0]?.capacity || 1000, price: 7500
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function isEventCreator(ev, currentUser) {
    if (!currentUser) return false;
    if (currentUser.role === "Admin") return true;
    if (currentUser.role !== "Organizer") return false;
    if (ev.organizerId && ev.organizerId === currentUser.id) return true;
    if (currentUser.email && ev.organizerEmail && ev.organizerEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (currentUser.name && ev.organizerName && ev.organizerName.toLowerCase().includes(currentUser.name.toLowerCase())) return true;
    if (!ev.organizerId && (currentUser.name === "Alex Chen" || currentUser.email === "organizer@demo.com")) return true;
    return false;
  }

  function handleEditClick(ev) {
    if (!isEventCreator(ev, user)) {
      setError(`Permission denied: You can only edit events that you have created. "${ev.title}" was created by ${ev.organizerName || 'another organizer'}.`);
      return;
    }

    setForm({
      title: ev.title,
      description: ev.description || "",
      category: ev.category || "Technology",
      venueId: ev.venueId || registeredVenues[0]?.id || "",
      startDate: ev.startDate ? ev.startDate.substring(0, 16) : "",
      endDate: ev.endDate ? ev.endDate.substring(0, 16) : "",
      capacity: ev.capacity || 1000,
      price: ev.ticketTypes?.[0]?.price || 7500,
      image: ev.image || ev.imageUrl || ""
    });
    const v = registeredVenues.find(ven => ven.id === (ev.venueId || registeredVenues[0]?.id));
    if (v) setSelectedVenue(v);
    setEditingEventId(ev.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function requestDeleteEvent(id) {
    const targetEvent = events.find(e => e.id === id);
    if (!isEventCreator(targetEvent, user)) {
      setError(`Permission denied: You can only delete events that you have created. "${targetEvent?.title || 'This event'}" belongs to ${targetEvent?.organizerName || 'another organizer'}.`);
      return;
    }

    if (!window.confirm(`Request deletion of event "${targetEvent?.title || 'this event'}"? Admin review and approval will be required before the event is permanently deleted.`)) return;
    
    try {
      api.requestDeleteEvent(id).catch(() => {});
      
      // 1. Update event status in state & localStorage
      const updatedEvents = events.map(e => e.id === id ? { ...e, status: "Deletion Requested", deletionPending: true } : e);
      setEvents(updatedEvents);
      localStorage.setItem("ef_events", JSON.stringify(updatedEvents));

      // 2. Add deletion approval request to ef_pending_approvals queue for Admin notification & action
      const pendingApprovalItem = {
        id: `del-ev-${Date.now()}`,
        type: "EVENT_DELETION",
        targetId: id,
        name: targetEvent?.title || "Event Deletion",
        role: "Organizer",
        requestedBy: user?.name || "Alex Chen",
        applicantEmail: user?.email || "organizer@demo.com",
        nic: user?.nic || "199234509876",
        contact: user?.contact || "+94 77 123 4567",
        status: "PendingAdminApproval",
        submittedAt: new Date().toISOString(),
        details: {
          title: targetEvent?.title,
          category: targetEvent?.category || "Technology",
          location: targetEvent?.location || "Sri Lanka",
          capacity: targetEvent?.capacity || 1000,
          startDate: targetEvent?.startDate || new Date().toISOString()
        }
      };

      const existingApprovals = JSON.parse(localStorage.getItem("ef_pending_approvals") || "[]");
      const updatedApprovals = [pendingApprovalItem, ...existingApprovals.filter(a => a.targetId !== id)];
      localStorage.setItem("ef_pending_approvals", JSON.stringify(updatedApprovals));
      window.dispatchEvent(new Event("storage"));

      setSuccess(`Deletion request for "${targetEvent?.title}" submitted! Platform Administrator has been notified to review and approve this deletion.`);
    } catch (err) {
      setError("Failed to request deletion: " + err.message);
    }
  }


  const stats = {
    total:     events.length,
    published: events.filter(e => e.status === "Published").length,
    draft:     events.filter(e => e.status === "Draft").length,
    capacity:  events.reduce((s, e) => s + (Number(e.capacity) || 0), 0),
  };

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Organizer Command (Sri Lanka)</span>
        <div className="topbar-actions">
          <Link to="/vendor" className="btn btn-secondary btn-sm" style={{ marginRight: 6 }}>
            <IcBuilding style={{ width: 13, height: 13 }} /> View Venue Directory
          </Link>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(v => !v); if(!showForm) setEditingEventId(null); }}>
            {showForm ? (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cancel</>
            ) : (
              <><IcPlus style={{ width: 13, height: 13 }} /> Create Event</>
            )}
          </button>
        </div>
      </div>

      <div className="page-head">
        <h1 className="page-title">Organizer Dashboard</h1>
        <p className="page-sub">
          Create and manage verified events at registered Sri Lankan venues with automated capacity checks and LKR ticketing.
        </p>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Managed Events</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Live Published</div>
            <div className="stat-value" style={{ color: "#34d399" }}>{stats.published}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Approved Venues Available</div>
            <div className="stat-value" style={{ color: "#60a5fa" }}>{registeredVenues.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Revenue Collected</div>
            <div className="stat-value" style={{ color: "#34d399", fontSize: 18 }}>
              {(() => {
                const myConfirmed = masterBookings.filter(b => {
                  if (b.status !== "Confirmed") return false;
                  const ev = events.find(e => e.id === b.eventId);
                  return isEventCreator(ev, user);
                });
                const totalRev = myConfirmed.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
                return totalRev > 0 ? formatLKR(totalRev) : "Rs. 0";
              })()}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Combined Capacity</div>
            <div className="stat-value">{stats.capacity.toLocaleString()}</div>
          </div>
        </div>

        {/* Pending Slip Notification Banner */}
        {masterBookings.filter(b => b.status === "PendingApproval").length > 0 && activeTab !== "slips" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 18px",
              background: "linear-gradient(90deg, rgba(245,158,11,0.14), rgba(245,158,11,0.06))",
              border: "1px solid rgba(245,158,11,0.45)",
              borderRadius: "var(--radius-sm)",
              marginBottom: 16,
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>🔔</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>
                  {masterBookings.filter(b => b.status === "PendingApproval").length} New Payment Slip{masterBookings.filter(b => b.status === "PendingApproval").length > 1 ? "s" : ""} Awaiting Your Review
                </div>
                <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>
                  Attendees are waiting for you to verify their bank transfer slips before their passes activate.
                </div>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              style={{ background: "#f59e0b", borderColor: "#d97706", color: "#000", fontWeight: 700 }}
              onClick={() => setActiveTab("slips")}
            >
              Review Slips Now →
            </button>
          </div>
        )}

        {/* Alerts */}
        {success && <div className="alert alert-success"><IcCheck style={{ width: 15, height: 15, flexShrink: 0 }} /> {success}</div>}
        {error   && <div className="alert alert-error"><IcAlert style={{ width: 15, height: 15, flexShrink: 0 }} /> {error}</div>}

        {/* Create Event Form (Enforces Registered Venue Rule) */}
        {showForm && (
          <div className="card" style={{ marginBottom: 24, background: "var(--c-bg-1)", border: "1px solid var(--c-blue)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                  {editingEventId ? "Edit Event Details" : "Host a New Event at a Registered Venue"}
                </div>
                <div style={{ fontSize: 13, color: "var(--c-text-2)", marginTop: 2 }}>
                  Organizers can only create and manage events at verified registered venues in Sri Lanka.
                </div>
              </div>
              <span className="badge badge-green">
                <IcShield style={{ width: 11, height: 11 }} /> Venue Verification Required
              </span>
            </div>

            <form onSubmit={submit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Event Title *</label>
                  <input className="form-input" required value={form.title}
                    placeholder="e.g. Sri Lanka Autonomous Systems Conference 2027"
                    onChange={e => setF("title", e.target.value)} />
                </div>

                {/* Registered Venue Selector */}
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Select Registered Venue * <strong style={{ color: "#60a5fa" }}>(Compulsory from Verified Directory)</strong></span>
                    <span style={{ fontSize: 11, color: "var(--c-text-3)", fontWeight: 500 }}>
                      Venues are registered &amp; managed exclusively by Venue Managers
                    </span>
                  </label>
                  <select
                    className="form-input"
                    required
                    style={{ background: "#0b0f19", border: "1px solid var(--c-blue)", fontWeight: 600 }}
                    value={form.venueId}
                    onChange={e => handleVenueChange(e.target.value)}
                  >
                    {registeredVenues.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.location}) — Max {Number(v.capacity).toLocaleString()} pax · {formatLKR(v.pricePerHour)}/hr
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Venue Preview Callout */}
                {selectedVenue && (
                  <div style={{
                    gridColumn: "1/-1",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: 12,
                    background: "rgba(37,99,235,0.08)",
                    border: "1px solid rgba(37,99,235,0.25)",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: 16
                  }}>
                    <img
                      src={selectedVenue.image || FALLBACK_IMAGE}
                      alt={selectedVenue.name}
                      style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{selectedVenue.name}</div>
                      <div style={{ fontSize: 11, color: "var(--c-text-2)" }}>{selectedVenue.location}</div>
                      <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#93c5fd", marginTop: 4 }}>
                        <span>Capacity: <strong>{Number(selectedVenue.capacity).toLocaleString()} pax</strong></span>
                        <span>Rate: <strong>{formatLKR(selectedVenue.pricePerHour)}/hr</strong></span>
                        <span>GPS: <strong>{selectedVenue.lat}, {selectedVenue.lng}</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Event Description &amp; Agenda</label>
                  <textarea className="form-input" rows="3" value={form.description}
                    placeholder="Describe keynote tracks, exhibition stages, networking sessions…"
                    onChange={e => setF("description", e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={form.category}
                    onChange={e => setF("category", e.target.value)}>
                    {CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Total Expected Capacity (Max {selectedVenue?.capacity || 1000})</label>
                  <input className="form-input" type="number" min="1" max={selectedVenue?.capacity || 10000} value={form.capacity}
                    onChange={e => setF("capacity", e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Start Date &amp; Time *</label>
                  <input className="form-input" type="datetime-local" required
                    value={form.startDate} onChange={e => setF("startDate", e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date &amp; Time *</label>
                  <input className="form-input" type="datetime-local" required
                    value={form.endDate} onChange={e => setF("endDate", e.target.value)} />
                </div>

                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Standard Ticket Price (LKR) *</label>
                  <input className="form-input" type="number" min="0" value={form.price}
                    onChange={e => setF("price", e.target.value)} />
                </div>

                {/* Cover Photo Drag & Drop / Device Upload */}
                <ImageUploader
                  label="Event Cover Photo (Upload or Drag & Drop)"
                  value={form.image || selectedVenue?.image || ""}
                  onChange={img => setF("image", img)}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingEventId(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
                  {busy ? "Saving…" : (editingEventId ? "Save Changes" : "Publish Live Event at Venue")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--c-border)", marginBottom: 20, paddingBottom: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className={`btn ${activeTab === "events" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: 13, fontWeight: 700 }}
          >
            <IcCalendar style={{ width: 14, height: 14 }} /> Managed Events ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("slips")}
            className={`btn ${activeTab === "slips" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: 13, fontWeight: 700, position: "relative" }}
          >
            <IcImage style={{ width: 14, height: 14 }} /> Payment Slip Verifications
            {masterBookings.filter(b => b.status === "PendingApproval").length > 0 && (
              <span
                style={{
                  background: "#f59e0b",
                  color: "#000",
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: 10,
                  marginLeft: 6
                }}
              >
                {masterBookings.filter(b => b.status === "PendingApproval").length} Pending
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`btn ${activeTab === "tickets" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: 13, fontWeight: 700, position: "relative" }}
          >
            <IcUsers style={{ width: 14, height: 14 }} /> Tickets Released &amp; Attendees
            {masterBookings.filter(b => b.status === "Confirmed" && isEventCreator(events.find(ev => ev.id === b.eventId), user)).length > 0 && (
              <span
                style={{
                  background: "#34d399",
                  color: "#000",
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: 10,
                  marginLeft: 6
                }}
              >
                {masterBookings.filter(b => b.status === "Confirmed" && isEventCreator(events.find(ev => ev.id === b.eventId), user)).length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: MANAGED EVENTS */}
        {activeTab === "events" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Managed Sri Lankan Events ({events.length})</div>
                <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 2 }}>
                  Organizers can only edit &amp; request deletion for events they have personally created.
                </div>
              </div>

              {/* Filter Tabs: My Events vs All Events */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setEventFilter("mine")}
                  className={`btn btn-sm ${eventFilter === "mine" ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: 12 }}
                >
                  My Created Events ({events.filter(e => isEventCreator(e, user)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setEventFilter("all")}
                  className={`btn btn-sm ${eventFilter === "all" ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: 12 }}
                >
                  All Platform Events ({events.length})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="spinner-wrap"><div className="spinner" /></div>
            ) : events.length === 0 ? (
              <div className="empty">
                <div className="empty-title">No events yet</div>
                <div className="empty-desc">Click "Create Event" to host your first event at a registered venue.</div>
              </div>
            ) : (events.filter(e => eventFilter === "all" || isEventCreator(e, user))).length === 0 ? (
              <div className="empty">
                <div className="empty-title">No events created by you yet</div>
                <div className="empty-desc">You have not created any events yet. Click "Create Event" above to host an event at an approved venue.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Event &amp; Venue</th>
                      <th>Category</th>
                      <th>Schedule</th>
                      <th>Capacity</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events
                      .filter(ev => eventFilter === "all" || isEventCreator(ev, user))
                      .map(ev => {
                        const isOwner = isEventCreator(ev, user);
                        const isDeletionPending = ev.status === "Deletion Requested" || ev.deletionPending;

                        return (
                          <tr key={ev.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <img
                                  src={ev.image || ev.imageUrl || FALLBACK_IMAGE}
                                  alt={ev.title}
                                  style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }}
                                  onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                                />
                                <div>
                                  <div className="td-primary" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                    <span>{ev.title}</span>
                                    {isOwner ? (
                                      <span className="badge badge-blue" style={{ fontSize: 10, padding: "1px 6px" }}>Created by You</span>
                                    ) : (
                                      <span className="badge badge-gray" style={{ fontSize: 10, padding: "1px 6px" }}>By: {ev.organizerName || "Organizer"}</span>
                                    )}
                                  </div>
                                  {ev.location && <div className="td-small">{ev.location}</div>}
                                </div>
                              </div>
                            </td>
                            <td><span className="badge badge-gray">{ev.category || "Tech"}</span></td>
                            <td style={{ fontSize: 13 }}>
                              {ev.startDate ? new Date(ev.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                            </td>
                            <td style={{ fontSize: 13 }}>{Number(ev.capacity || 1000).toLocaleString()} pax</td>
                            <td><span className={`badge ${STATUS_BADGE[ev.status] || "badge-green"}`}>{ev.status || "Published"}</span></td>
                            <td>
                              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <a href={`/events/${ev.id}`} className="btn btn-ghost btn-sm">
                                  <IcEye style={{ width: 13, height: 13 }} /> View Pass
                                </a>
                                {isOwner ? (
                                  <>
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleEditClick(ev)} style={{ color: "#60a5fa" }}>
                                      Edit
                                    </button>
                                    {!isDeletionPending && (
                                      <select
                                        className="form-input"
                                        style={{ height: 28, fontSize: 11, width: 116, background: "var(--c-bg-1)", padding: "0 4px" }}
                                        value={ev.status || "Published"}
                                        onChange={e => {
                                          const ns = e.target.value;
                                          const upd = events.map(x => x.id === ev.id ? { ...x, status: ns } : x);
                                          setEvents(upd);
                                          localStorage.setItem("ef_events", JSON.stringify(upd));
                                          window.dispatchEvent(new Event("storage"));
                                          setSuccess(`Event status set to "${ns}".`);
                                        }}
                                      >
                                        <option value="Draft">Draft</option>
                                        <option value="Published">Published</option>
                                        <option value="Ongoing">Ongoing</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                      </select>
                                    )}
                                    {isDeletionPending ? (
                                      <span className="badge badge-amber" style={{ fontSize: 10 }} title="Deletion request submitted and awaiting Admin review">
                                        Deletion Pending Approval
                                      </span>
                                    ) : (
                                      <button className="btn btn-ghost btn-sm" onClick={() => requestDeleteEvent(ev.id)} style={{ color: "#ef4444" }}>
                                        <IcX style={{ width: 13, height: 13 }} /> Request Delete
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span style={{ fontSize: 11, color: "var(--c-text-3)", padding: "4px 6px" }} title="Only the event creator can edit or delete this event">
                                    Creator Edit Only
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* TAB 2: ATTENDEE PAYMENT SLIP VERIFICATIONS */}
        {activeTab === "slips" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Attendee Payment Slip Verification Queue</div>
                <div style={{ fontSize: 13, color: "var(--c-text-2)", marginTop: 2 }}>
                  Verify bank deposit &amp; transfer slips uploaded by attendees before approving passes. If rejecting, state the reason — attendees can message back or re-upload corrected slips.
                </div>
              </div>

              {/* Filter Chips */}
              <div style={{ display: "flex", gap: 6 }}>
                {["All", "PendingApproval", "Confirmed", "Rejected"].map(filterKey => {
                  const count = filterKey === "All"
                    ? masterBookings.length
                    : masterBookings.filter(b => b.status === filterKey).length;
                  return (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setSlipFilter(filterKey)}
                      className={`btn btn-sm ${slipFilter === filterKey ? "btn-primary" : "btn-secondary"}`}
                      style={{ fontSize: 12 }}
                    >
                      {filterKey === "PendingApproval" ? "Pending Approval" : filterKey} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Verification Table */}
            {(() => {
              // Organizers only see and act on payment slips for their own events (Admins see all)
              const relevantBookings = user?.role === "Admin"
                ? masterBookings
                : masterBookings.filter(b => {
                    const matchedEvent = events.find(ev => ev.id === b.eventId || ev.title === b.eventTitle);
                    return matchedEvent ? isEventCreator(matchedEvent, user) : true;
                  });

              const filtered = relevantBookings.filter(b => slipFilter === "All" || b.status === slipFilter);

              if (filtered.length === 0) {
                return (
                  <div className="empty">
                    <div className="empty-title">No payment slips found in this view</div>
                    <div className="empty-desc">New attendee booking payment slips for your events will appear here for verification.</div>
                  </div>
                );
              }

              return (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Attendee &amp; Identity</th>
                        <th>Event &amp; Passes</th>
                        <th>Payment &amp; Bank Slip</th>
                        <th>Verification Status</th>
                        <th style={{ textAlign: "right" }}>Organizer Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(booking => {
                        const isPending = booking.status === "PendingApproval";
                        const isConfirmed = booking.status === "Confirmed";
                        const isRejected = booking.status === "Rejected";

                        return (
                          <tr key={booking.bookingRef}>
                            {/* Attendee Info */}
                            <td>
                              <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13 }}>{booking.attendeeName}</div>
                              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#60a5fa" }}>NIC: {booking.attendeeNic || "199878901234"}</div>
                              <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{booking.attendeeContact || "+94 7X XXX XXXX"}</div>
                              <div style={{ fontSize: 10, color: "var(--c-text-3)", marginTop: 2 }}>Ref: <code style={{ color: "var(--c-text-2)" }}>{booking.bookingRef}</code></div>
                            </td>

                            {/* Event & Pass Bundle */}
                            <td>
                              <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13 }}>{booking.eventTitle}</div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                                <span className="badge badge-blue" style={{ fontSize: 10 }}>
                                  {booking.passCount || 1} {Number(booking.passCount) === 1 ? "Pass" : "Passes Bundle"}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 800, color: "#34d399" }}>
                                  {formatLKR(booking.totalAmount)}
                                </span>
                              </div>
                            </td>

                            {/* Payment Slip Thumbnail & Bank Details */}
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                {booking.paymentSlipUrl ? (
                                  <div
                                    onClick={() => setSelectedChatBooking(booking)}
                                    title="Click to zoom & inspect slip"
                                    style={{
                                      position: "relative",
                                      width: 60,
                                      height: 50,
                                      borderRadius: 6,
                                      overflow: "hidden",
                                      border: "1.5px solid var(--c-blue)",
                                      cursor: "pointer",
                                      flexShrink: 0
                                    }}
                                  >
                                    <img
                                      src={booking.paymentSlipUrl}
                                      alt="Bank Slip"
                                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      <IcEye style={{ width: 14, height: 14, color: "#ffffff" }} />
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ width: 60, height: 50, borderRadius: 6, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--c-text-3)" }}>
                                    No Slip
                                  </div>
                                )}
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#ffffff" }}>{booking.bankName || "Commercial Bank"}</div>
                                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#93c5fd" }}>Ref: {booking.bankRefNo || "TXN-DIRECT-DEP"}</div>
                                  <div style={{ fontSize: 10, color: "var(--c-text-3)", marginTop: 2 }}>
                                    Uploaded: {new Date(booking.createdAt || Date.now()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td>
                              {isPending && (
                                <span className="badge badge-amber" style={{ fontSize: 11, padding: "4px 8px" }}>
                                  <IcClock style={{ width: 12, height: 12 }} /> Slip Under Review
                                </span>
                              )}
                              {isConfirmed && (
                                <span className="badge badge-green" style={{ fontSize: 11, padding: "4px 8px" }}>
                                  <IcCheckCircle style={{ width: 12, height: 12 }} /> Passes Approved &amp; Active
                                </span>
                              )}
                              {isRejected && (
                                <div>
                                  <span className="badge badge-red" style={{ fontSize: 11, padding: "4px 8px" }}>
                                    <IcAlert style={{ width: 12, height: 12 }} /> Slip Rejected
                                  </span>
                                  {booking.rejectionReason && (
                                    <div style={{ fontSize: 11, color: "#f87171", marginTop: 4, maxWidth: 200, lineHeight: 1.3 }}>
                                      "{booking.rejectionReason}"
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
                                {isPending && (
                                  <button
                                    type="button"
                                    className="btn btn-success btn-sm"
                                    style={{ fontSize: 11, background: "#059669", border: "1px solid #047857", color: "#ffffff", fontWeight: 700 }}
                                    disabled={payBusy === booking.bookingRef}
                                    onClick={() => handleApprovePayment(booking)}
                                  >
                                    <IcCheck style={{ width: 12, height: 12 }} />
                                    {payBusy === booking.bookingRef ? "…" : "Approve"}
                                  </button>
                                )}
                                {isPending && (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    style={{ fontSize: 11, background: "#dc2626", border: "1px solid #b91c1c", color: "#ffffff", fontWeight: 700 }}
                                    disabled={payBusy === booking.bookingRef}
                                    onClick={() => { setRejectTarget(booking); setRejectMsg(""); }}
                                  >
                                    <IcX style={{ width: 12, height: 12 }} /> Reject
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: 11 }}
                                  onClick={() => setSelectedChatBooking(booking)}
                                >
                                  <IcMail style={{ width: 12, height: 12 }} /> Chat
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* Reject Payment Modal */}
        {rejectTarget && (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(10px)", zIndex: 9999,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 20
            }}
            onClick={(e) => { if (e.target === e.currentTarget) { setRejectTarget(null); setRejectMsg(""); } }}
          >
            <div className="card" style={{ maxWidth: 480, width: "100%", padding: 28, background: "var(--c-bg-0)", border: "1.5px solid #ef4444" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IcX style={{ width: 20, height: 20, color: "#ef4444" }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#ef4444" }}>Reject Payment Slip</div>
                  <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 2 }}>
                    {rejectTarget.attendeeName} · {rejectTarget.bookingRef}
                  </div>
                </div>
              </div>

              {/* Booking summary */}
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, marginBottom: 18, fontSize: 12, color: "var(--c-text-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Event:</span><strong style={{ color: "#fff" }}>{rejectTarget.eventTitle}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Amount:</span><strong style={{ color: "#34d399" }}>{rejectTarget.totalAmount ? `LKR ${Number(rejectTarget.totalAmount).toLocaleString()}` : "—"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Bank Ref:</span><code style={{ color: "#93c5fd" }}>{rejectTarget.bankRefNo || "N/A"}</code>
                </div>
              </div>

              <form onSubmit={handleRejectPayment}>
                <div className="form-group">
                  <label className="form-label" style={{ color: "#fca5a5" }}>
                    Rejection Reason (sent to attendee) *
                  </label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="e.g. The bank transfer reference number is unclear. Please upload a clear screenshot of your e-banking receipt showing the transaction reference, date, and amount…"
                    value={rejectMsg}
                    onChange={e => setRejectMsg(e.target.value)}
                    required
                    style={{ resize: "vertical", minHeight: 100 }}
                  />
                  <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 4 }}>
                    This message will appear on the attendee's booking status and in the chat thread.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setRejectTarget(null); setRejectMsg(""); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger"
                    disabled={!rejectMsg.trim() || payBusy === rejectTarget?.bookingRef}
                    style={{ background: "#dc2626", borderColor: "#b91c1c" }}
                  >
                    <IcX style={{ width: 13, height: 13 }} />
                    Send Rejection &amp; Notify Attendee
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: TICKETS RELEASED & ATTENDEES */}
        {activeTab === "tickets" && (() => {
          // Only show events created by this organizer
          const myEvents = events.filter(ev => isEventCreator(ev, user));
          // All confirmed bookings for organizer's events
          const confirmedBookings = masterBookings.filter(b =>
            b.status === "Confirmed" && myEvents.some(ev => ev.id === b.eventId)
          );
          // All bookings (any status) for organizer's events — to count sold tickets
          const allMyBookings = masterBookings.filter(b =>
            myEvents.some(ev => ev.id === b.eventId)
          );

          return (
            <div>
              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>Tickets Released &amp; Approved Attendees</div>
                <div style={{ fontSize: 13, color: "var(--c-text-2)", marginTop: 4 }}>
                  Track ticket sales and capacity per event. Attendee details are only visible once payment has been approved.
                </div>
              </div>

              {myEvents.length === 0 ? (
                <div className="empty">
                  <div className="empty-title">No events created by you</div>
                  <div className="empty-desc">Create an event first to see ticket release details here.</div>
                </div>
              ) : (
                <>
                  {/* Per-event ticket stats cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginBottom: 28 }}>
                    {myEvents.map(ev => {
                      const evBookings = allMyBookings.filter(b => b.eventId === ev.id);
                      const confirmedEvBookings = evBookings.filter(b => b.status === "Confirmed");
                      const pendingEvBookings = evBookings.filter(b => b.status === "PendingApproval");
                      const totalPassesSold = confirmedEvBookings.reduce((s, b) => s + (Number(b.passCount) || 1), 0);
                      const capacity = Number(ev.capacity) || 1000;
                      const pct = Math.min(100, Math.round((totalPassesSold / capacity) * 100));
                      const revenue = confirmedEvBookings.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);

                      return (
                        <div key={ev.id} className="card" style={{ padding: 18, background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                            <img
                              src={ev.image || ev.imageUrl || ""}
                              alt={ev.title}
                              style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "var(--c-bg-2)" }}
                              onError={e => { e.currentTarget.style.background = "#1e293b"; e.currentTarget.src = ""; }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                              <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>{ev.category} · {ev.location || "Sri Lanka"}</div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--c-text-2)", marginBottom: 4 }}>
                              <span>Tickets Sold (Approved)</span>
                              <span style={{ fontWeight: 700, color: pct >= 80 ? "#f59e0b" : "#34d399" }}>{totalPassesSold} / {capacity.toLocaleString()}</span>
                            </div>
                            <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: pct >= 80 ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "linear-gradient(90deg,#34d399,#60a5fa)", borderRadius: 4, transition: "width 0.5s" }} />
                            </div>
                            <div style={{ fontSize: 10, color: "var(--c-text-3)", marginTop: 3 }}>{pct}% capacity filled</div>
                          </div>

                          {/* Stats row */}
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 90, padding: "8px 10px", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 8 }}>
                              <div style={{ fontSize: 10, color: "#34d399", fontWeight: 600 }}>Confirmed</div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: "#34d399" }}>{confirmedEvBookings.length}</div>
                              <div style={{ fontSize: 10, color: "var(--c-text-3)" }}>bookings</div>
                            </div>
                            <div style={{ flex: 1, minWidth: 90, padding: "8px 10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8 }}>
                              <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>Pending</div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>{pendingEvBookings.length}</div>
                              <div style={{ fontSize: 10, color: "var(--c-text-3)" }}>awaiting review</div>
                            </div>
                            <div style={{ flex: 1, minWidth: 90, padding: "8px 10px", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 8 }}>
                              <div style={{ fontSize: 10, color: "#60a5fa", fontWeight: 600 }}>Revenue</div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: "#60a5fa" }}>{formatLKR(revenue)}</div>
                              <div style={{ fontSize: 10, color: "var(--c-text-3)" }}>collected</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Approved Attendees Table */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>
                      Approved Attendees
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--c-text-3)", marginLeft: 10 }}>Only visible after payment approval</span>
                    </div>
                    {confirmedBookings.length > 0 && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 12 }}
                        onClick={() => {
                          const rows = [["Booking Ref","Name","Email","NIC","Contact","Event","Passes","Amount (LKR)","Bank","Ref No"].join(",")];
                          confirmedBookings.forEach(b => {
                            const evTitle = (myEvents.find(ev => ev.id === b.eventId)?.title || b.eventTitle || "").replace(/,/g, " ");
                            rows.push([
                              b.bookingRef, b.attendeeName, b.attendeeEmail, b.attendeeNic,
                              b.attendeeContact, evTitle, b.passCount || 1, b.totalAmount,
                              b.bankName, b.bankRefNo
                            ].join(","));
                          });
                          const csv = rows.join("\n");
                          const blob = new Blob([csv], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a"); a.href = url;
                          a.download = `attendees-${new Date().toISOString().slice(0,10)}.csv`;
                          a.click(); URL.revokeObjectURL(url);
                        }}
                      >
                        ⬇ Export CSV
                      </button>
                    )}
                  </div>

                  {confirmedBookings.length === 0 ? (
                    <div className="empty">
                      <div className="empty-title">No approved attendees yet</div>
                      <div className="empty-desc">Once you approve attendee payment slips in the Payment Verification tab, their details will appear here.</div>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Attendee</th>
                            <th>Contact &amp; NIC</th>
                            <th>Event</th>
                            <th>Passes</th>
                            <th>Amount Paid</th>
                            <th>Bank Ref</th>
                            <th>Approved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {confirmedBookings.map(b => {
                            const evTitle = myEvents.find(ev => ev.id === b.eventId)?.title || b.eventTitle;
                            return (
                              <tr key={b.bookingRef}>
                                <td>
                                  <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13 }}>{b.attendeeName}</div>
                                  <div style={{ fontSize: 11, color: "#60a5fa" }}>{b.attendeeEmail}</div>
                                  <div style={{ fontSize: 10, color: "var(--c-text-3)", fontFamily: "monospace" }}>Ref: {b.bookingRef}</div>
                                </td>
                                <td>
                                  <div style={{ fontSize: 12, color: "var(--c-text-2)" }}>{b.attendeeContact || "—"}</div>
                                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#93c5fd" }}>NIC: {b.attendeeNic || "—"}</div>
                                </td>
                                <td>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", maxWidth: 180 }}>{evTitle}</div>
                                </td>
                                <td>
                                  <span className="badge badge-blue" style={{ fontSize: 11 }}>
                                    {b.passCount || 1} {Number(b.passCount) === 1 ? "Pass" : "Passes"}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 800, color: "#34d399", fontSize: 13 }}>{formatLKR(b.totalAmount)}</td>
                                <td>
                                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#93c5fd" }}>{b.bankRefNo || "—"}</div>
                                  <div style={{ fontSize: 10, color: "var(--c-text-3)" }}>{b.bankName || ""}</div>
                                </td>
                                <td>
                                  <span className="badge badge-green" style={{ fontSize: 10 }}>
                                    <IcCheckCircle style={{ width: 10, height: 10 }} /> Approved
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* Interactive Chat & Slip Verification Drawer */}
        {selectedChatBooking && (
          <BookingChatDrawer
            booking={selectedChatBooking}
            currentUser={user}
            onClose={() => setSelectedChatBooking(null)}
            onBookingUpdated={(updated) => {
              refreshBookings();
              setSelectedChatBooking(updated);
            }}
          />
        )}
      </div>
    </>
  );
}

