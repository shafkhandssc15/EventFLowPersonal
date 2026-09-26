import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "../context/RealtimeContext.jsx";
import {
  IcCalendar, IcMapPin, IcUsers, IcArrowLeft, IcClock, IcTicket,
  IcCheckCircle, IcCompass, IcPlus, IcX, IcUser, IcShield
} from "../components/Icons.jsx";
import { supabase, SAMPLE_EVENTS, SAMPLE_VENUES, formatLKR, FALLBACK_IMAGE } from "../api/supabase.js";
import VenueMap from "../components/VenueMap.jsx";
import QRCodeVisual from "../components/QRCodeVisual.jsx";

const STATUS = {
  Draft:     "badge-gray",
  Published: "badge-green",
  Ongoing:   "badge-blue",
  Completed: "badge-purple",
  Cancelled: "badge-red",
};

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Primary source: live events from Realtime context ──────────────────────
  const { events: liveEvents } = useRealtime();

  const [event, setEvent] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [passCount, setPassCount] = useState(1);
  const [attendeeDetails, setAttendeeDetails] = useState([]);
  const [issuedPasses, setIssuedPasses] = useState([]);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [createdBookingRef, setCreatedBookingRef] = useState(null);
  const [paymentSlip, setPaymentSlip] = useState("");
  const [bankName, setBankName] = useState("Commercial Bank of Ceylon PLC");
  const [bankRefNo, setBankRefNo] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Sync event from Realtime context whenever the live events list changes
  useEffect(() => {
    const liveEvent = liveEvents.find(e => e.id === id);
    if (liveEvent) {
      setEvent(liveEvent);
      return;
    }
    // Fallback: check localStorage, then API, then SAMPLE_EVENTS
    try {
      const saved = JSON.parse(localStorage.getItem("ef_events") || "[]");
      const foundSaved = saved.find(e => e.id === id);
      if (foundSaved) { setEvent(foundSaved); return; }
    } catch {}

    api.getEvent(id)
      .then(res => setEvent(res))
      .catch(() => {
        const found = SAMPLE_EVENTS.find(e => e.id === id) || SAMPLE_EVENTS[0];
        setEvent(found);
      });
  }, [id, liveEvents]);

  // Open booking modal for a tier
  function openBooking(tier) {
    setSelectedTier(tier);
    setPassCount(1);
    setPaymentSlip("");
    setBankRefNo("");
    setCreatedBookingRef(null);
    setAttendeeDetails([
      {
        name: user?.name || "",
        idType: "NIC", // "NIC" | "Passport"
        idNumber: user?.nic || "",
        contact: user?.contact || "",
        email: user?.email || "",
        isChild: false,
        childAge: 3,
        parentName: user?.name || "",
        parentIdType: "NIC",
        parentIdNumber: user?.nic || "",
        parentContact: user?.contact || "",
        diet: "Standard",
        isPrimary: true
      }
    ]);
    setBookingSuccess(false);
    setIssuedPasses([]);
    setError(null);
    setBookingModal(true);
  }

  // Handle pass count change
  function handlePassCountChange(newCount) {
    const count = Math.max(1, Math.min(10, newCount));
    setPassCount(count);

    setAttendeeDetails(prev => {
      const updated = [...prev];
      while (updated.length < count) {
        updated.push({
          name: "",
          idType: "NIC",
          idNumber: "",
          contact: "",
          email: "",
          isChild: false,
          childAge: 3,
          parentName: "",
          parentIdType: "NIC",
          parentIdNumber: "",
          parentContact: "",
          diet: "Standard",
          isPrimary: false
        });
      }
      return updated.slice(0, count);
    });
  }

  function updateAttendeeField(index, field, value) {
    setAttendeeDetails(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  // Complete Multi-Pass Booking
  async function confirmBooking(e) {
    e.preventDefault();
    setError(null);

    // Validate compulsory fields for all ticket holders
    for (let i = 0; i < attendeeDetails.length; i++) {
      const a = attendeeDetails[i];
      const label = a.isPrimary ? "Primary Attendee" : `Guest Attendee #${i + 1}`;

      if (!a.name.trim()) { setError(`Full Name for ${label} is compulsory.`); return; }

      if (a.isChild) {
        // Child under 5 validations
        if (!a.parentName.trim()) { setError(`Parent / Guardian's Full Name for Child (${a.name}) is compulsory.`); return; }
        if (!a.parentIdNumber.trim()) { setError(`Parent / Guardian's ${a.parentIdType === 'Passport' ? 'Passport' : 'NIC'} for Child (${a.name}) is compulsory.`); return; }
        if (!a.parentContact.trim()) { setError(`Parent / Guardian's Contact Phone for Child (${a.name}) is compulsory.`); return; }
      } else {
        // Adult / regular attendee validation
        if (!a.idNumber.trim()) { setError(`${a.idType === 'Passport' ? 'Passport number' : 'National ID (NIC)'} for ${label} is compulsory.`); return; }
        if (!a.contact.trim()) { setError(`Mobile Contact number for ${label} is compulsory.`); return; }
      }
    }

    // Calculate total payable
    const freeChildCount = attendeeDetails.filter(a => a.isChild).length;
    const paidAdultCount = passCount - freeChildCount;
    const totalBookingAmount = paidAdultCount * selectedTier.price;

    // Payment slip validation if paid passes
    if (totalBookingAmount > 0 && !paymentSlip) {
      setError("Please upload your Bank Transfer / Deposit Payment Slip. The event organizer will verify the slip before issuing passes.");
      return;
    }

    setBusy(true);

    try {
      const bookingRef = `BK-LK-${Date.now().toString().slice(-6)}`;
      const isFree = totalBookingAmount === 0;
      const initialStatus = isFree ? "Confirmed" : "PendingApproval";
      const defaultSlipUrl = paymentSlip || (isFree ? null : "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80");

      const newPasses = attendeeDetails.map((holder, idx) => {
        const passId = `tkt-lk-${Date.now()}-${idx + 1}`;
        const shortEvent = (event.id || "EV").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
        const randHash = Math.random().toString(36).substring(2, 6).toUpperCase();
        const identCode = holder.isChild
          ? (holder.parentIdNumber || "KID").replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase()
          : (holder.idNumber || "LK").replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();

        const passPrice = holder.isChild ? 0 : selectedTier.price;
        const uniqueQrCode = `EVENTFLOW-LK-${shortEvent}-${identCode}-${randHash}-${String(idx + 1).padStart(2, "0")}`;

        return {
          id: passId,
          eventId: event.id,
          eventTitle: event.title,
          organizerId: event.organizerId || "00000000-0000-0000-0000-0000000000aa",
          tierName: holder.isChild ? `${selectedTier.name} (Child Under 5 - Free Admission)` : selectedTier.name,
          price: passPrice,
          location: event.location,
          startDate: event.startDate,
          holderName: holder.name.trim(),
          isChild: holder.isChild,
          childAge: holder.isChild ? holder.childAge : null,
          idType: holder.idType,
          holderNic: holder.isChild
            ? `Child (<5 yrs) · Guardian ${holder.parentIdType}: ${holder.parentIdNumber}`
            : `${holder.idType}: ${holder.idNumber.trim()}`,
          rawIdNumber: holder.isChild ? holder.parentIdNumber.trim() : holder.idNumber.trim(),
          holderContact: holder.isChild ? holder.parentContact.trim() : holder.contact.trim(),
          holderEmail: holder.email.trim() || user?.email,
          parentName: holder.isChild ? holder.parentName.trim() : null,
          diet: holder.diet,
          isPrimary: holder.isPrimary,
          qrCode: uniqueQrCode,
          passIndex: idx + 1,
          totalInBundle: attendeeDetails.length,
          bookingRef: bookingRef,
          status: initialStatus,
          paymentStatus: initialStatus,
          paymentMethod: isFree ? "Free Ticket" : "Bank Transfer",
          bankName: isFree ? null : bankName,
          bankRefNo: isFree ? null : bankRefNo.trim(),
          paymentSlipUrl: defaultSlipUrl,
          bookedAt: new Date().toISOString(),
          image: event.image || event.imageUrl || FALLBACK_IMAGE
        };
      });

      // 1. Save to user attendee wallet in localStorage
      try {
        const userWalletKey = `ef_tickets_${user?.id || user?.email || "guest"}`;
        const existing = JSON.parse(localStorage.getItem(userWalletKey) || "[]");
        localStorage.setItem(userWalletKey, JSON.stringify([...newPasses, ...existing]));
      } catch (err) {
        console.warn("Wallet storage error:", err);
      }

      // 2. Save master booking record for Organizer review
      try {
        const masterBookings = JSON.parse(localStorage.getItem("ef_master_bookings") || "[]");
        const masterRecord = {
          bookingRef: bookingRef,
          eventId: event.id,
          eventTitle: event.title,
          organizerId: event.organizerId || "00000000-0000-0000-0000-0000000000aa",
          attendeeId: user?.id || user?.email || "00000000-0000-0000-0000-000000000001",
          attendeeName: attendeeDetails[0]?.name || user?.name || "Attendee",
          attendeeEmail: attendeeDetails[0]?.email || user?.email || "attendee@demo.com",
          attendeeNic: attendeeDetails[0]?.idNumber || user?.nic || "199878901234",
          attendeeContact: attendeeDetails[0]?.contact || user?.contact || "+94 77 123 4567",
          totalAmount: totalBookingAmount,
          tierName: selectedTier.name,
          passCount: passCount,
          paymentMethod: isFree ? "Free Ticket" : "Bank Transfer",
          bankName: isFree ? null : bankName,
          bankRefNo: isFree ? null : bankRefNo.trim(),
          paymentSlipUrl: defaultSlipUrl,
          status: initialStatus,
          passes: newPasses,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem("ef_master_bookings", JSON.stringify([masterRecord, ...masterBookings]));
        window.dispatchEvent(new Event("storage"));

        // Direct write to Supabase Registrations and ApprovalRequests
        try {
          const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
          const validEventId = isUUID(event.id) ? event.id : "33333333-0000-0000-0000-000000000001";
          const validAttendeeId = (user?.id && isUUID(user.id)) ? user.id : "00000000-0000-0000-0000-000000000001";
          const now = new Date().toISOString();

          // 1. Insert into Registrations table
          await supabase.from("Registrations").insert({
            Id: crypto.randomUUID(),
            EventId: validEventId,
            AttendeeId: validAttendeeId,
            Status: initialStatus,
            CreatedAt: now,
            UpdatedAt: now
          });

          // 2. Insert into ApprovalRequests table (stores the slip data, organizer linkage, etc.)
          await supabase.from("ApprovalRequests").insert({
            Id: crypto.randomUUID(),
            Status: isFree ? "Approved" : "PendingOrganizerApproval",
            Reason: JSON.stringify(masterRecord),
            CreatedAt: now
          });
        } catch (sbErr) {
          console.warn("[EventDetail] Supabase booking sync warning:", sbErr);
        }

        // Initialize chat message
        const initialChat = [
          {
            id: `msg-init-${bookingRef}`,
            bookingRef: bookingRef,
            senderId: user?.id || user?.email || "00000000-0000-0000-0000-000000000001",
            senderName: attendeeDetails[0]?.name || user?.name || "Attendee",
            senderRole: "Attendee",
            text: isFree
              ? `Booked free admission child pass for ${event.title}.`
              : `Uploaded bank transfer slip of ${formatLKR(totalBookingAmount)} (${bankName}${bankRefNo ? ` · Ref: ${bankRefNo}` : ""}) for organizer verification.`,
            slipAttachment: defaultSlipUrl,
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem(`ef_booking_msgs_${bookingRef}`, JSON.stringify(initialChat));
      } catch {}

      setCreatedBookingRef(bookingRef);
      setIssuedPasses(newPasses);
      setBookingSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to process booking.");
    } finally {
      setBusy(false);
    }
  }

  if (!event) return <div className="spinner-wrap"><div className="spinner" /></div>;

  const cover = event.image || event.imageUrl || FALLBACK_IMAGE;
  const start = new Date(event.startDate || Date.now());
  const end   = new Date(event.endDate || Date.now() + 7200000);
  const hrs   = Math.max(1, Math.round((end - start) / 3600000));

  const venueLocation = SAMPLE_VENUES.find(v => v.id === event.venueId) || {
    id: "ven-lk-loc",
    name: event.location?.split(",")[0] || "Sri Lanka Event Venue",
    location: event.location || "Colombo, Sri Lanka",
    lat: event.lat || 6.9271,
    lng: event.lng || 79.8612,
    capacity: event.capacity || 2000,
    pricePerHour: 85000,
    image: cover
  };

  return (
    <>
      <div className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <IcArrowLeft style={{ width: 13, height: 13 }} /> Back
        </button>
        <div className="topbar-actions">
          <span className={`badge ${STATUS[event.status] || "badge-green"}`}>{event.status || "Published"}</span>
        </div>
      </div>

      {/* Hero Cover Banner */}
      <div style={{ position: "relative", height: 320, overflow: "hidden" }}>
        <img
          src={cover}
          alt={event.title}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(3,7,18,0.92) 100%)" }} />
        <div style={{ position: "absolute", bottom: 28, left: 32, right: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            {event.category || "Technology"} · Sri Lanka
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.7px", lineHeight: 1.2, color: "#fff", maxWidth: 800 }}>
            {event.title}
          </h1>
        </div>
      </div>

      <div className="page-body" style={{ paddingTop: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 28 }}>
          {/* Main Column */}
          <div>
            {/* Meta row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 24, padding: "18px 20px", background: "var(--c-bg-1)", border: "1px solid var(--c-border)", borderRadius: "var(--radius)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <IcCalendar style={{ width: 16, height: 16, color: "var(--c-blue)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, color: "var(--c-text-3)", fontWeight: 600, textTransform: "uppercase" }}>Date</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {start.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <IcClock style={{ width: 16, height: 16, color: "var(--c-blue)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, color: "var(--c-text-3)", fontWeight: 600, textTransform: "uppercase" }}>Time (IST)</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} ({hrs}h)
                  </div>
                </div>
              </div>
              {event.location && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <IcMapPin style={{ width: 16, height: 16, color: "var(--c-blue)", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "var(--c-text-3)", fontWeight: 600, textTransform: "uppercase" }}>Venue / City</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{event.location}</div>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <IcUsers style={{ width: 16, height: 16, color: "var(--c-blue)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, color: "var(--c-text-3)", fontWeight: 600, textTransform: "uppercase" }}>Capacity</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{Number(event.capacity || 2000).toLocaleString()} attendees</div>
                </div>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>About this experience</div>
                <p style={{ fontSize: 14, color: "var(--c-text-2)", lineHeight: 1.8 }}>{event.description}</p>
              </div>
            )}

            {/* OpenStreetMap Venue Map */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <IcCompass style={{ width: 18, height: 18, color: "var(--c-blue)" }} />
                Venue Location (OpenStreetMap Sri Lanka)
              </div>
              <VenueMap
                venues={[venueLocation]}
                center={[venueLocation.lat || 6.9271, venueLocation.lng || 79.8612]}
                zoom={14}
                height="320px"
              />
              <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 8 }}>
                Address: {event.location || venueLocation.location} · Coordinates: {venueLocation.lat}, {venueLocation.lng}
              </div>
            </div>
          </div>

          {/* Sidebar Ticket Types */}
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Available Passes (LKR)</div>
            {(!event.ticketTypes || event.ticketTypes.length === 0) ? (
              <div className="card" style={{ background: "var(--c-bg-1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>General Admission</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#34d399" }}>{formatLKR(15000)}</div>
                </div>
                <button
                  className="btn btn-primary btn-full"
                  onClick={() => openBooking({ id: "gen-lk-01", name: "General Admission", price: 15000, quantity: 500, sold: 120 })}>
                  Book Passes (Single or Multiple)
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {event.ticketTypes.map(tt => {
                  const qty = tt.quantity || 500;
                  const sold = tt.sold || 0;
                  const pct = Math.min(100, Math.round((sold / qty) * 100));
                  const soldOut = sold >= qty;

                  return (
                    <div key={tt.id} className="card" style={{ background: "var(--c-bg-1)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{tt.name}</div>
                          <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>
                            {sold} of {qty} passes sold
                          </div>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: tt.price === 0 ? "#34d399" : "var(--c-text)" }}>
                          {formatLKR(tt.price)}
                        </div>
                      </div>

                      <div className="progress" style={{ marginBottom: 12 }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${pct}%`, background: soldOut ? "#ef4444" : pct > 80 ? "#f59e0b" : "#2563eb" }}
                        />
                      </div>

                      <button
                        className={soldOut ? "btn btn-secondary btn-full btn-sm" : "btn btn-primary btn-full btn-sm"}
                        disabled={soldOut}
                        onClick={() => !soldOut && openBooking(tt)}
                      >
                        {soldOut ? "Sold Out" : `Select Tier · ${formatLKR(tt.price)}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Pass Registration Modal */}
      {bookingModal && selectedTier && (
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
            maxWidth: 640,
            maxHeight: "90vh",
            overflowY: "auto",
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid var(--c-border)" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff" }}>
                  {bookingSuccess ? "Booking Confirmed!" : "Book Event Passes"}
                </div>
                <div style={{ fontSize: 12, color: "var(--c-text-2)", marginTop: 2 }}>
                  {event.title} · <span style={{ color: "#60a5fa" }}>{selectedTier.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookingModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--c-text-3)", cursor: "pointer", padding: 4 }}
              >
                <IcX style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            {bookingSuccess ? (
              /* Success Step: Show Confirmation & Status */
              <div>
                <div style={{ textAlign: "center", padding: "12px 0 20px" }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: issuedPasses[0]?.paymentStatus === "Confirmed" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
                    border: `2px solid ${issuedPasses[0]?.paymentStatus === "Confirmed" ? "#10b981" : "#f59e0b"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px"
                  }}>
                    {issuedPasses[0]?.paymentStatus === "Confirmed" ? (
                      <IcCheckCircle style={{ width: 30, height: 30, color: "#10b981" }} />
                    ) : (
                      <IcClock style={{ width: 30, height: 30, color: "#f59e0b" }} />
                    )}
                  </div>

                  <div style={{ fontSize: 20, fontWeight: 800, color: "#ffffff" }}>
                    {issuedPasses[0]?.paymentStatus === "Confirmed"
                      ? "Booking Confirmed & Passes Issued!"
                      : "Payment Slip Submitted for Verification"}
                  </div>

                  <div style={{ fontSize: 13, color: "var(--c-text-2)", marginTop: 6, maxWidth: 440, margin: "6px auto 0", lineHeight: 1.5 }}>
                    {issuedPasses[0]?.paymentStatus === "Confirmed" ? (
                      <>Total: <strong style={{ color: "#34d399" }}>Free Admission</strong> · All gate QR codes active</>
                    ) : (
                      <>
                        Your payment slip of <strong style={{ color: "#60a5fa" }}>{formatLKR(selectedTier.price * issuedPasses.filter(p => !p.isChild).length)}</strong> has been sent to the event organizer for verification. Your passes will activate with scannable QR once approved.
                      </>
                    )}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "#93c5fd", background: "rgba(37,99,235,0.15)", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(37,99,235,0.3)" }}>
                      Booking Ref: {createdBookingRef || issuedPasses[0]?.bookingRef}
                    </span>
                  </div>
                </div>

                {/* Issued Passes list preview */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                  {issuedPasses.map((pass, i) => (
                    <div key={pass.id} style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "var(--radius-sm)",
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ background: "#ffffff", borderRadius: 8, padding: 3, flexShrink: 0 }}>
                          <QRCodeVisual value={pass.qrCode} size={48} showLabel={false} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 700, textTransform: "uppercase" }}>
                            Pass #{i + 1} · {pass.tierName}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginTop: 2 }}>{pass.holderName}</div>
                          <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>
                            NIC: <strong style={{ color: "var(--c-text-2)" }}>{pass.holderNic}</strong>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span className={`badge ${pass.paymentStatus === "Confirmed" ? "badge-green" : "badge-amber"}`} style={{ fontSize: 10 }}>
                          {pass.paymentStatus === "Confirmed" ? "● Active Pass" : "● Slip Under Review"}
                        </span>
                        <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--c-text-3)", marginTop: 4 }}>{pass.qrCode}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <Link to="/attendee" className="btn btn-primary btn-full">
                    View in Attendee Portal &amp; Chat with Organizer →
                  </Link>
                  <button className="btn btn-secondary" onClick={() => setBookingModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Booking Form: Select Count & Enter Details */
              <form onSubmit={confirmBooking}>
                {/* Step 1: Pass Quantity */}
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px 16px", borderRadius: "var(--radius-sm)", marginBottom: 18, border: "1px solid var(--c-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>Number of Passes</div>
                      <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>
                        {formatLKR(selectedTier.price)} per pass
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ width: 32, height: 32, padding: 0 }}
                        onClick={() => handlePassCountChange(passCount - 1)}
                      >
                        -
                      </button>
                      <span style={{ fontSize: 16, fontWeight: 800, width: 28, textAlign: "center" }}>{passCount}</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ width: 32, height: 32, padding: 0 }}
                        onClick={() => handlePassCountChange(passCount + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 2: Attendee & Guest Details Form */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
                  {attendeeDetails.map((holder, idx) => (
                    <div key={idx} style={{
                      background: holder.isChild ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)",
                      border: holder.isChild ? "1.5px solid rgba(16,185,129,0.35)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "var(--radius-sm)",
                      padding: "16px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: holder.isChild ? "#34d399" : (holder.isPrimary ? "#60a5fa" : "#ffffff"), display: "flex", alignItems: "center", gap: 6 }}>
                          <IcUser style={{ width: 14, height: 14 }} />
                          {holder.isChild
                            ? `Pass #${idx + 1} · Child (Under 5 Years - Free Ticket)`
                            : (holder.isPrimary ? "Pass #1 (Primary Attendee)" : `Pass #${idx + 1} (Guest Attendee)`)}
                        </div>

                        {/* Child Under 5 Free Toggle */}
                        <label style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          color: holder.isChild ? "#34d399" : "var(--c-text-3)",
                          background: holder.isChild ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: holder.isChild ? "1px solid #10b981" : "1px solid var(--c-border)"
                        }}>
                          <input
                            type="checkbox"
                            checked={holder.isChild}
                            onChange={e => updateAttendeeField(idx, "isChild", e.target.checked)}
                          />
                          👶 Child Under 5 (Free Pass)
                        </label>
                      </div>

                      {/* If Child Under 5 */}
                      {holder.isChild ? (
                        <div>
                          <div style={{ padding: "8px 12px", background: "rgba(16,185,129,0.12)", borderRadius: 6, border: "1px dashed rgba(16,185,129,0.35)", marginBottom: 14, fontSize: 12, color: "#a7f3d0" }}>
                            🎉 <strong>Child Under 5 Admission: 100% Free</strong>. Per venue regulations, the parent/guardian's National ID (NIC) or Passport is <strong>compulsory</strong> for child entry.
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: 11 }}>
                                Child's Full Name * <span style={{ color: "#ef4444" }}>(Compulsory)</span>
                              </label>
                              <input
                                className="form-input"
                                required
                                placeholder="e.g. Liam Jayawardena"
                                value={holder.name}
                                onChange={e => updateAttendeeField(idx, "name", e.target.value)}
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: 11 }}>
                                Child's Age (Under 5) * <span style={{ color: "#ef4444" }}>(Compulsory)</span>
                              </label>
                              <select
                                className="form-input"
                                value={holder.childAge || 3}
                                onChange={e => updateAttendeeField(idx, "childAge", Number(e.target.value))}
                              >
                                <option value={1}>1 Year Old (Infant)</option>
                                <option value={2}>2 Years Old (Toddler)</option>
                                <option value={3}>3 Years Old (Child)</option>
                                <option value={4}>4 Years Old (Pre-School)</option>
                              </select>
                            </div>

                            <div className="form-group" style={{ gridColumn: "1/-1" }}>
                              <label className="form-label" style={{ fontSize: 11 }}>
                                Accompanying Parent / Guardian Full Name * <span style={{ color: "#ef4444" }}>(Compulsory)</span>
                              </label>
                              <input
                                className="form-input"
                                required
                                placeholder="e.g. Kasun Jayawardena (Parent)"
                                value={holder.parentName}
                                onChange={e => updateAttendeeField(idx, "parentName", e.target.value)}
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                                <span>Parent ID Type *</span>
                                <span style={{ color: "var(--c-blue)", fontSize: 10 }}>NIC or Foreign Passport</span>
                              </label>
                              <select
                                className="form-input"
                                value={holder.parentIdType || "NIC"}
                                onChange={e => updateAttendeeField(idx, "parentIdType", e.target.value)}
                              >
                                <option value="NIC">🇱🇰 Sri Lankan National ID (NIC)</option>
                                <option value="Passport">🌐 Foreign Passport (International)</option>
                              </select>
                            </div>

                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: 11 }}>
                                Parent / Guardian {holder.parentIdType === "Passport" ? "Passport No." : "NIC No."} * <span style={{ color: "#ef4444" }}>(Compulsory)</span>
                              </label>
                              <input
                                className="form-input"
                                required
                                placeholder={holder.parentIdType === "Passport" ? "e.g. N12345678 (Country)" : "e.g. 199012345678 / 901234567V"}
                                value={holder.parentIdNumber}
                                onChange={e => updateAttendeeField(idx, "parentIdNumber", e.target.value)}
                              />
                            </div>

                            <div className="form-group" style={{ gridColumn: "1/-1" }}>
                              <label className="form-label" style={{ fontSize: 11 }}>
                                Parent / Guardian Mobile Contact * <span style={{ color: "#ef4444" }}>(Compulsory)</span>
                              </label>
                              <input
                                className="form-input"
                                required
                                placeholder="e.g. +94 77 123 4567"
                                value={holder.parentContact}
                                onChange={e => updateAttendeeField(idx, "parentContact", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Regular Adult Attendee Form */
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                          <div className="form-group" style={{ gridColumn: "1/-1" }}>
                            <label className="form-label" style={{ fontSize: 11 }}>
                              Full Name * <span style={{ color: "#ef4444" }}>(Compulsory)</span>
                            </label>
                            <input
                              className="form-input"
                              required
                              placeholder="e.g. Ruwan Silva"
                              value={holder.name}
                              onChange={e => updateAttendeeField(idx, "name", e.target.value)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                              <span>Identification Type *</span>
                              <span style={{ color: "#93c5fd", fontSize: 10 }}>NIC or Passport</span>
                            </label>
                            <select
                              className="form-input"
                              value={holder.idType || "NIC"}
                              onChange={e => updateAttendeeField(idx, "idType", e.target.value)}
                            >
                              <option value="NIC">🇱🇰 Sri Lankan Citizen (NIC)</option>
                              <option value="Passport">🌐 International / Foreigner (Passport)</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11 }}>
                              {holder.idType === "Passport" ? "Passport Number & Country *" : "National ID (NIC) *"} <span style={{ color: "#ef4444" }}>(Compulsory)</span>
                            </label>
                            <input
                              className="form-input"
                              required
                              placeholder={holder.idType === "Passport" ? "e.g. N98765432 (UK) / PA12345" : "e.g. 199512345678 / 951234567V"}
                              value={holder.idNumber}
                              onChange={e => updateAttendeeField(idx, "idNumber", e.target.value)}
                            />
                          </div>

                          <div className="form-group" style={{ gridColumn: "1/-1" }}>
                            <label className="form-label" style={{ fontSize: 11 }}>
                              Mobile / WhatsApp Contact * <span style={{ color: "#ef4444" }}>(Compulsory)</span>
                            </label>
                            <input
                              className="form-input"
                              required
                              placeholder="e.g. +94 77 123 4567"
                              value={holder.contact}
                              onChange={e => updateAttendeeField(idx, "contact", e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Step 3: Bank Transfer Payment Slip Upload (Required for paid passes) */}
                {(() => {
                  const freeChildCount = attendeeDetails.filter(a => a.isChild).length;
                  const paidAdultCount = passCount - freeChildCount;
                  const totalBookingAmount = paidAdultCount * selectedTier.price;

                  if (totalBookingAmount === 0) return null;

                  return (
                    <div style={{
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1.5px solid rgba(59, 130, 246, 0.35)",
                      borderRadius: "var(--radius-sm)",
                      padding: "16px",
                      marginBottom: 20
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 16 }}>🏦</span> Bank Transfer Payment &amp; Slip Upload
                        </div>
                        <span className="badge badge-amber" style={{ fontSize: 10 }}>Organizer Approval Required</span>
                      </div>

                      {/* Official Sri Lanka Bank Account Details */}
                      <div style={{
                        background: "rgba(0,0,0,0.35)",
                        border: "1px dashed rgba(255,255,255,0.12)",
                        borderRadius: "8px",
                        padding: "12px",
                        marginBottom: 14,
                        fontSize: 12
                      }}>
                        <div style={{ color: "#93c5fd", fontWeight: 700, marginBottom: 4 }}>
                          Deposit / Transfer to Official Organizer Account:
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", color: "var(--c-text-2)" }}>
                          <div>Bank: <strong style={{ color: "#ffffff" }}>Commercial Bank of Ceylon</strong></div>
                          <div>Branch: <strong style={{ color: "#ffffff" }}>Colombo Corporate (001)</strong></div>
                          <div>Account Name: <strong style={{ color: "#ffffff" }}>EventFlow LK (Pvt) Ltd</strong></div>
                          <div>Account No: <strong style={{ color: "#34d399", fontFamily: "monospace" }}>1000 4589 2310</strong></div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 11 }}>Transferred Bank *</label>
                          <select
                            className="form-input"
                            value={bankName}
                            onChange={e => setBankName(e.target.value)}
                          >
                            <option value="Commercial Bank of Ceylon PLC">Commercial Bank of Ceylon PLC</option>
                            <option value="Bank of Ceylon (BOC)">Bank of Ceylon (BOC)</option>
                            <option value="Hatton National Bank (HNB)">Hatton National Bank (HNB)</option>
                            <option value="Sampath Bank PLC">Sampath Bank PLC</option>
                            <option value="Nations Trust Bank (NTB)">Nations Trust Bank (NTB)</option>
                            <option value="Other Bank Transfer">Other Bank / Online Transfer</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 11 }}>
                            Bank Reference No. / Transaction ID
                          </label>
                          <input
                            className="form-input"
                            placeholder="e.g. REF-908214 / TXN-10293"
                            value={bankRefNo}
                            onChange={e => setBankRefNo(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Payment Slip File Uploader */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>
                          Upload Bank Payment Slip / Transfer Receipt * <span style={{ color: "#ef4444" }}>(Compulsory for Organizer Review)</span>
                        </label>

                        {paymentSlip ? (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "rgba(16,185,129,0.1)",
                            border: "1px solid rgba(16,185,129,0.35)",
                            borderRadius: "8px",
                            padding: "10px 14px"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <img src={paymentSlip} alt="Slip Preview" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6 }} />
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>✓ Payment Slip Attached</div>
                                <div style={{ fontSize: 10, color: "var(--c-text-3)" }}>Ready for organizer approval</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setPaymentSlip("")}
                              style={{ height: 28, fontSize: 11 }}
                            >
                              Change Slip
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div style={{
                              border: "2px dashed rgba(255,255,255,0.18)",
                              borderRadius: "10px",
                              padding: "20px 16px",
                              textAlign: "center",
                              background: "rgba(255,255,255,0.02)",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}>
                              <input
                                type="file"
                                id="slipFileInput"
                                accept="image/*,.pdf"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev) => setPaymentSlip(ev.target.result);
                                  reader.readAsDataURL(file);
                                }}
                              />
                              <label htmlFor="slipFileInput" style={{ cursor: "pointer" }}>
                                <div style={{ fontSize: 24, marginBottom: 4 }}>📄</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
                                  Click to browse or drag and drop your Bank Deposit Slip
                                </div>
                                <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>
                                  Supports JPG, PNG, PDF receipts (Max 10MB)
                                </div>
                              </label>
                            </div>

                            {/* Demo Sample Slip helper */}
                            <button
                              type="button"
                              onClick={() => setPaymentSlip("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80")}
                              style={{
                                marginTop: 8,
                                background: "none",
                                border: "none",
                                color: "#60a5fa",
                                fontSize: 11,
                                cursor: "pointer",
                                textDecoration: "underline"
                              }}
                            >
                              💡 Attach sample verified ComBank deposit slip (for quick testing)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Step 4: Order Summary with Child Free Ticket breakdown */}
                {(() => {
                  const freeChildCount = attendeeDetails.filter(a => a.isChild).length;
                  const paidAdultCount = passCount - freeChildCount;
                  const totalBookingAmount = paidAdultCount * selectedTier.price;

                  return (
                    <div style={{
                      padding: "14px 16px",
                      background: "rgba(37,99,235,0.08)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid rgba(37,99,235,0.25)",
                      marginBottom: 18
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: "var(--c-text-2)" }}>Standard Passes ({paidAdultCount} × {formatLKR(selectedTier.price)}):</span>
                        <strong style={{ color: "#ffffff" }}>{formatLKR(paidAdultCount * selectedTier.price)}</strong>
                      </div>

                      {freeChildCount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#34d399", marginBottom: 6 }}>
                          <span>👶 Child Passes under 5 years ({freeChildCount} × Free):</span>
                          <strong>Rs. 0 (Free)</strong>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                        <span>Total Payable:</span>
                        <span style={{ color: "#34d399" }}>{formatLKR(totalBookingAmount)}</span>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setBookingModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={busy} style={{ minWidth: 240, fontWeight: 800 }}>
                    {busy
                      ? "Submitting Booking…"
                      : (attendeeDetails.filter(a => !a.isChild).length * selectedTier.price === 0)
                        ? `Confirm Free Child Pass (${passCount})`
                        : `Submit Slip & Book Passes (${passCount})`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
