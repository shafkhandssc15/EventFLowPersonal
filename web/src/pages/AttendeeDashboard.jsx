import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  IcCalendar, IcMapPin, IcTicket, IcCheckCircle, IcSearch,
  IcUser, IcShield, IcChevronRight, IcClock, IcX, IcCheck,
  IcMail, IcImage, IcAlert, IcSend
} from "../components/Icons.jsx";
import { SAMPLE_EVENTS, formatLKR, FALLBACK_IMAGE } from "../api/supabase.js";
import QRCodeVisual from "../components/QRCodeVisual.jsx";
import BookingChatDrawer from "../components/BookingChatDrawer.jsx";

export default function AttendeeDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedChatBooking, setSelectedChatBooking] = useState(null);

  useEffect(() => {
    try {
      const rawSaved = JSON.parse(localStorage.getItem(`ef_tickets_${user?.id}`) || "[]");
      let initialList = [];

      if (rawSaved.length > 0) {
        // Sanitize existing tickets to ensure 100% uniqueness and valid metadata
        const seenQr = new Set();
        initialList = rawSaved.map((tkt, idx) => {
          const pIndex = tkt.passIndex || (idx + 1);
          const shortEvent = (tkt.eventId || tkt.eventTitle || "EV").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
          const fallbackNic = idx === 0 ? (user?.nic || "199878901234") : `199${(45678900 + idx * 1234).toString().slice(0, 9)}`;
          const cleanNic = (tkt.holderNic && tkt.holderNic.trim() && !tkt.holderNic.includes("undefined"))
            ? tkt.holderNic
            : fallbackNic;

          const rawClean = cleanNic.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "LK01";
          const uniqueSalt = (idx * 137 + 101).toString(16).toUpperCase();

          let qCode = tkt.qrCode;
          if (!qCode || qCode.includes("000000") || seenQr.has(qCode)) {
            qCode = `EVENTFLOW-LK-${shortEvent}-${rawClean}-${uniqueSalt}-${String(pIndex).padStart(2, "0")}`;
          }
          seenQr.add(qCode);

          return {
            ...tkt,
            id: tkt.id || `tkt-${tkt.eventId}-${idx + 1}-${Date.now()}`,
            holderName: (tkt.holderName && tkt.holderName.trim()) ? tkt.holderName : (idx === 0 ? (user?.name || "Sam Taylor") : `Guest Delegate #${idx + 1}`),
            holderNic: cleanNic,
            qrCode: qCode,
            passIndex: pIndex
          };
        });

        localStorage.setItem(`ef_tickets_${user?.id}`, JSON.stringify(initialList));
        setTickets(initialList);
        setSelectedTicket(initialList[0]);
        setExpandedBookingId(initialList[0].bookingRef || initialList[0].eventId);
      } else {
        // Initial sample tickets including a 10-pass bundle for an event
        const sample10Passes = Array.from({ length: 10 }, (_, i) => ({
          id: `tkt-lk-10p-${i + 1}`,
          eventId: "ev-lk-001",
          eventTitle: SAMPLE_EVENTS[0].title,
          bookingRef: "BK-LK-908214",
          tierName: i === 0 ? "VIP Summit All-Access" : "Standard Delegate Pass",
          price: i === 0 ? 30000 : 15000,
          location: SAMPLE_EVENTS[0].location,
          startDate: SAMPLE_EVENTS[0].startDate,
          holderName: i === 0 ? (user?.name || "Sam Taylor") : `Guest Delegate #${i + 1} (${["Kasun", "Niroshan", "Dilshan", "Chathuri", "Amara", "Praveen", "Kavindi", "Sahan", "Anuki"][i - 1]} Perera)`,
          holderNic: i === 0 ? (user?.nic || "199878901234") : `199${(45678900 + i * 1234).toString().slice(0, 9)}`,
          holderContact: i === 0 ? (user?.contact || "+94 71 987 6543") : `+94 77 ${100 + i * 11} ${2000 + i * 111}`,
          qrCode: `EVENTFLOW-LK-SLAS27-${String(i + 1).padStart(2, "0")}-${(1234 + i * 77).toString(16).toUpperCase()}`,
          status: "Confirmed",
          passIndex: i + 1,
          totalInBundle: 10,
          image: SAMPLE_EVENTS[0].image
        }));

        const singlePass = {
          id: "tkt-lk-single-02",
          eventId: "ev-lk-002",
          eventTitle: SAMPLE_EVENTS[1].title,
          bookingRef: "BK-LK-774102",
          tierName: "VIP Royal Balcony Lounge",
          price: 20000,
          location: SAMPLE_EVENTS[1].location,
          startDate: SAMPLE_EVENTS[1].startDate,
          holderName: user?.name || "Sam Taylor",
          holderNic: user?.nic || "199878901234",
          holderContact: user?.contact || "+94 71 987 6543",
          qrCode: `EVENTFLOW-LK-CMF27-01-987A`,
          status: "Confirmed",
          passIndex: 1,
          totalInBundle: 1,
          image: SAMPLE_EVENTS[1].image
        };

        const initial = [...sample10Passes, singlePass];
        setTickets(initial);
        setSelectedTicket(initial[0]);
        setExpandedBookingId("BK-LK-908214");
      }
    } catch {}
  }, [user]);

  // Refresh tickets from localStorage
  function refreshTickets() {
    try {
      const rawSaved = JSON.parse(localStorage.getItem(`ef_tickets_${user?.id}`) || "[]");
      if (rawSaved.length > 0) {
        setTickets(rawSaved);
        if (selectedTicket) {
          const updatedSelected = rawSaved.find(t => t.id === selectedTicket.id) || rawSaved[0];
          setSelectedTicket(updatedSelected);
        }
      }
    } catch {}
  }

  // Cancel a pending booking (removes from the organizer's queue too)
  function cancelBooking(bookingRef) {
    if (!window.confirm("Cancel this booking? This will withdraw your payment slip from the organizer's review queue.")) return;
    try {
      // Remove from attendee tickets
      const updated = tickets.filter(t => t.bookingRef !== bookingRef);
      setTickets(updated);
      localStorage.setItem(`ef_tickets_${user?.id}`, JSON.stringify(updated));
      if (selectedTicket?.bookingRef === bookingRef) setSelectedTicket(updated[0] || null);
      if (expandedBookingId === bookingRef) setExpandedBookingId(null);

      // Remove from master bookings queue
      const masterBookings = JSON.parse(localStorage.getItem("ef_master_bookings") || "[]");
      const updatedMaster = masterBookings.filter(b => b.bookingRef !== bookingRef);
      localStorage.setItem("ef_master_bookings", JSON.stringify(updatedMaster));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }

  // Group tickets by Booking Reference / Event
  const groupedBookings = tickets.reduce((acc, tkt) => {
    const key = tkt.bookingRef || tkt.eventId;
    if (!acc[key]) {
      acc[key] = {
        bookingRef: tkt.bookingRef || key,
        eventId: tkt.eventId,
        eventTitle: tkt.eventTitle,
        image: tkt.image,
        location: tkt.location,
        startDate: tkt.startDate,
        paymentStatus: tkt.paymentStatus || tkt.status || "Confirmed",
        paymentSlipUrl: tkt.paymentSlipUrl || null,
        rejectionReason: tkt.rejectionReason || null,
        bankName: tkt.bankName || "Commercial Bank",
        bankRefNo: tkt.bankRefNo || "TXN-DIRECT",
        passes: []
      };
    }
    acc[key].passes.push(tkt);
    // Keep most recent status
    if (tkt.paymentStatus) acc[key].paymentStatus = tkt.paymentStatus;
    if (tkt.rejectionReason) acc[key].rejectionReason = tkt.rejectionReason;
    if (tkt.paymentSlipUrl) acc[key].paymentSlipUrl = tkt.paymentSlipUrl;
    return acc;
  }, {});

  const bookingList = Object.values(groupedBookings);

  // Filter
  const filteredBookings = bookingList.filter(b => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      b.eventTitle?.toLowerCase().includes(q) ||
      b.bookingRef?.toLowerCase().includes(q) ||
      b.passes.some(p =>
        p.holderName?.toLowerCase().includes(q) ||
        p.holderNic?.toLowerCase().includes(q) ||
        p.qrCode?.toLowerCase().includes(q)
      )
    );
  });

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Attendee Portal · Sri Lanka</span>
        <div className="topbar-actions">
          <Link to="/" className="btn btn-primary btn-sm">
            <IcSearch style={{ width: 13, height: 13 }} /> Book More Passes
          </Link>
        </div>
      </div>

      <div className="page-head">
        <h1 className="page-title">My Event Passes &amp; QR Wallet</h1>
        <p className="page-sub">
          Manage your multi-pass bookings. If you booked multiple tickets (e.g. 10 passes for an event), each ticket holder has a verified NIC and a unique entrance QR badge.
        </p>
      </div>

      <div className="page-body">
        {/* Approval/Rejection Notification banners */}
        {bookingList.some(b => b.paymentStatus === "Confirmed") && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.35)", borderRadius: "var(--radius-sm)", marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div style={{ fontSize: 13, color: "#34d399", fontWeight: 600 }}>
              {bookingList.filter(b => b.paymentStatus === "Confirmed").length} booking{bookingList.filter(b => b.paymentStatus === "Confirmed").length > 1 ? "s" : ""} approved — your QR passes are active!
            </div>
          </div>
        )}
        {bookingList.some(b => b.paymentStatus === "Rejected") && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: "var(--radius-sm)", marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div style={{ fontSize: 13, color: "#f87171", fontWeight: 600 }}>
              {bookingList.filter(b => b.paymentStatus === "Rejected").length} payment slip{bookingList.filter(b => b.paymentStatus === "Rejected").length > 1 ? "s" : ""} rejected — open chat to re-upload a corrected slip.
            </div>
          </div>
        )}

        {tickets.length === 0 ? (
          <div className="empty">
            <IcTicket className="empty-icon" />
            <div className="empty-title">No passes found</div>
            <div className="empty-desc">You haven't registered for any Sri Lankan events yet. Explore upcoming experiences!</div>
            <Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Browse Events</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 24, alignItems: "start" }}>
            {/* Left: Master Event Bookings with Nested Passes */}
            <div>
              {/* Search & Stats bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Active Bookings ({bookingList.length}) · Total Issued Passes ({tickets.length})
                  </span>
                </div>
                <div className="input-wrap" style={{ width: 220 }}>
                  <IcSearch className="input-icon" />
                  <input
                    className="form-input"
                    style={{ height: 32, fontSize: 12, paddingLeft: 34 }}
                    placeholder="Search by name / NIC / Pass ID…"
                    value={filterQuery}
                    onChange={e => setFilterQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Master Booking Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {filteredBookings.map(bk => {
                  const isExpanded = expandedBookingId === bk.bookingRef;
                  const totalAmount = bk.passes.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
                  const primaryHolder = bk.passes[0]?.holderName || user?.name || "Attendee";
                  const isPending = bk.paymentStatus === "PendingApproval";
                  const isRejected = bk.paymentStatus === "Rejected";
                  const isConfirmed = bk.paymentStatus === "Confirmed" || (!isPending && !isRejected);

                  return (
                    <div
                      key={bk.bookingRef}
                      className="card"
                      style={{
                        padding: 0,
                        overflow: "hidden",
                        background: "var(--c-bg-1)",
                        border: isRejected
                          ? "1px solid #ef4444"
                          : isPending
                            ? "1px solid #f59e0b"
                            : isExpanded
                              ? "1px solid var(--c-blue)"
                              : "1px solid var(--c-border)",
                        boxShadow: isExpanded ? "0 8px 30px rgba(0,0,0,0.5)" : "none",
                        transition: "all 0.2s"
                      }}
                    >
                      {/* Master Booking Header */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "16px 20px",
                        background: "var(--c-surface-h)",
                        borderBottom: "1px solid var(--c-border)",
                        cursor: "pointer"
                      }}
                      onClick={() => setExpandedBookingId(isExpanded ? null : bk.bookingRef)}
                      >
                        <img
                          src={bk.image || FALLBACK_IMAGE}
                          alt={bk.eventTitle}
                          style={{ width: 80, height: 64, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                          onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            {isConfirmed && (
                              <span className="badge badge-green" style={{ fontSize: 10 }}>
                                <IcCheckCircle style={{ width: 11, height: 11 }} /> Passes Approved &amp; Active
                              </span>
                            )}
                            {isPending && (
                              <span className="badge badge-amber" style={{ fontSize: 10 }}>
                                <IcClock style={{ width: 11, height: 11 }} /> Slip Under Review (Pending Organizer)
                              </span>
                            )}
                            {isRejected && (
                              <span className="badge badge-red" style={{ fontSize: 10 }}>
                                <IcAlert style={{ width: 11, height: 11 }} /> Slip Rejected · Action Needed
                              </span>
                            )}
                            <span className="badge badge-blue" style={{ fontSize: 10 }}>
                              {bk.passes.length} {bk.passes.length === 1 ? "Pass" : "Passes Bundle"}
                            </span>
                            <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--c-text-3)", marginLeft: "auto" }}>
                              Ref: {bk.bookingRef}
                            </span>
                          </div>

                          <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {bk.eventTitle}
                          </div>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 11, color: "var(--c-text-2)", marginTop: 4 }}>
                            <span>Booked by: <strong style={{ color: "#ffffff" }}>{primaryHolder}</strong></span>
                            <span>Total Amount: <strong style={{ color: "#34d399" }}>{formatLKR(totalAmount)}</strong></span>
                            <span>Venue: <strong>{bk.location?.split(",")[0]}</strong></span>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChatBooking({
                                bookingRef: bk.bookingRef,
                                eventId: bk.eventId,
                                eventTitle: bk.eventTitle,
                                attendeeId: user?.id,
                                attendeeName: user?.name,
                                totalAmount: totalAmount,
                                passCount: bk.passes.length,
                                paymentSlipUrl: bk.paymentSlipUrl,
                                bankName: bk.bankName,
                                bankRefNo: bk.bankRefNo,
                                status: bk.paymentStatus,
                                rejectionReason: bk.rejectionReason
                              });
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}
                          >
                            <IcMail style={{ width: 12, height: 12, color: "#60a5fa" }} />
                            <span>Slip &amp; Chat Organizer</span>
                          </button>

                          {/* Cancel Booking — only for PendingApproval */}
                          {isPending && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: 11, color: "#ef4444" }}
                              onClick={(e) => { e.stopPropagation(); cancelBooking(bk.bookingRef); }}
                            >
                              <IcX style={{ width: 11, height: 11 }} /> Cancel Booking
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: "var(--c-blue)", fontSize: 11, fontWeight: 700 }}
                          >
                            {isExpanded ? "Collapse ▲" : `View ${bk.passes.length} Passes ▼`}
                          </button>
                        </div>
                      </div>

                      {/* Rejection Alert Banner with Reply Button */}
                      {isRejected && (
                        <div style={{
                          padding: "12px 20px",
                          background: "rgba(239, 68, 68, 0.12)",
                          borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
                            <IcAlert style={{ width: 18, height: 18, color: "#ef4444", flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
                                Organizer Notice: Payment Slip Rejected
                              </div>
                              <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 2 }}>
                                "{bk.rejectionReason || "Please provide a clear bank transfer receipt."}"
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ background: "#ef4444", borderColor: "#dc2626", fontSize: 11 }}
                            onClick={() => {
                              setSelectedChatBooking({
                                bookingRef: bk.bookingRef,
                                eventId: bk.eventId,
                                eventTitle: bk.eventTitle,
                                attendeeId: user?.id,
                                attendeeName: user?.name,
                                totalAmount: totalAmount,
                                passCount: bk.passes.length,
                                paymentSlipUrl: bk.paymentSlipUrl,
                                bankName: bk.bankName,
                                bankRefNo: bk.bankRefNo,
                                status: bk.paymentStatus,
                                rejectionReason: bk.rejectionReason
                              });
                            }}
                          >
                            <IcSend style={{ width: 11, height: 11 }} /> Reply &amp; Re-Upload Slip
                          </button>
                        </div>
                      )}

                      {/* Bank Transfer Details & Pending Review Notice */}
                      {isPending && (
                        <div style={{
                          padding: "14px 20px",
                          background: "rgba(37, 99, 235, 0.08)",
                          borderBottom: "1px solid rgba(37, 99, 235, 0.2)"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 16 }}>🏦</span>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Organizer Bank Transfer Details — Transfer &amp; Verification
                            </div>
                          </div>
                          
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, fontSize: 12, background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                            <div>
                              <div style={{ color: "var(--c-text-3)", fontSize: 11 }}>Beneficiary Bank:</div>
                              <div style={{ color: "#ffffff", fontWeight: 600 }}>Commercial Bank of Ceylon PLC</div>
                            </div>
                            <div>
                              <div style={{ color: "var(--c-text-3)", fontSize: 11 }}>Account Name:</div>
                              <div style={{ color: "#ffffff", fontWeight: 600 }}>EventFlow Organizers LK</div>
                            </div>
                            <div>
                              <div style={{ color: "var(--c-text-3)", fontSize: 11 }}>Account Number:</div>
                              <div style={{ color: "#34d399", fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>1000-8849-2231-00</div>
                            </div>
                            <div>
                              <div style={{ color: "var(--c-text-3)", fontSize: 11 }}>Branch / Currency:</div>
                              <div style={{ color: "#ffffff", fontWeight: 600 }}>Colombo Fort Branch / LKR</div>
                            </div>
                            <div>
                              <div style={{ color: "var(--c-text-3)", fontSize: 11 }}>Total Amount Due:</div>
                              <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: 13 }}>{formatLKR(totalAmount)}</div>
                            </div>
                            <div>
                              <div style={{ color: "var(--c-text-3)", fontSize: 11 }}>Transfer Reference / Narration:</div>
                              <div style={{ color: "#60a5fa", fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>{bk.bookingRef}</div>
                            </div>
                          </div>

                          <div style={{
                            marginTop: 10,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 11,
                            color: "#fbbf24"
                          }}>
                            <IcClock style={{ width: 14, height: 14, flexShrink: 0 }} />
                            <span>
                              Your slip is currently pending organizer verification. The organizer will review your payment and approve your entrance passes with QR codes.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Nested Individual Passes Drawer */}
                      {isExpanded && (
                        <div style={{ padding: 18, background: "rgba(0,0,0,0.25)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Nested Individual Passes ({bk.passes.length}) — Each with Unique ID &amp; QR Badge
                            </div>
                            <span style={{ fontSize: 11, color: "var(--c-text-3)" }}>
                              Click any pass to inspect its QR entrance pass
                            </span>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                            {bk.passes.map((pass, pIdx) => {
                              const isPassSelected = selectedTicket?.id === pass.id;

                              return (
                                <div
                                  key={pass.id}
                                  onClick={() => setSelectedTicket(pass)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    padding: "12px 16px",
                                    borderRadius: "var(--radius-sm)",
                                    background: isPassSelected ? "rgba(37,99,235,0.14)" : "var(--c-bg-1)",
                                    border: isPassSelected ? "1.5px solid var(--c-blue)" : "1px solid var(--c-border)",
                                    cursor: "pointer",
                                    transition: "all 0.15s"
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                                    {/* Pass index badge */}
                                    <div style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: "50%",
                                      background: isPassSelected ? "var(--c-blue)" : "rgba(255,255,255,0.08)",
                                      color: "#ffffff",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 11,
                                      fontWeight: 800,
                                      flexShrink: 0
                                    }}>
                                      #{pIdx + 1}
                                    </div>

                                    {/* Unique Micro-QR thumbnail */}
                                    <div style={{ flexShrink: 0, background: "#ffffff", borderRadius: 6, padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      <QRCodeVisual value={pass.qrCode} size={32} showLabel={false} />
                                    </div>

                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: isPassSelected ? "#ffffff" : "var(--c-text)" }}>
                                          {pass.holderName}
                                        </div>
                                        {pass.isChild ? (
                                          <span className="badge badge-green" style={{ fontSize: 10, background: "rgba(16,185,129,0.2)", border: "1px solid #10b981", color: "#34d399" }}>
                                            {"👶 Child (<5 yrs · Free Ticket)"}
                                          </span>
                                        ) : null}
                                        <span className="badge badge-gray" style={{ fontSize: 9, fontFamily: "monospace" }}>
                                          {pass.holderNic}
                                        </span>
                                      </div>

                                      <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--c-text-3)", marginTop: 2, flexWrap: "wrap" }}>
                                        <span>Tier: <strong style={{ color: "#93c5fd" }}>{pass.tierName}</strong></span>
                                        <span>Pass ID: <code style={{ color: "#60a5fa", fontWeight: 700 }}>{pass.qrCode}</code></span>
                                        <span>Price: <strong style={{ color: pass.price === 0 ? "#34d399" : "#ffffff" }}>{pass.price === 0 ? "Rs. 0 (Free)" : formatLKR(pass.price)}</strong></span>
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span className="badge badge-green" style={{ fontSize: 10 }}>
                                      Ready for Entry
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTicket(pass);
                                      }}
                                      className={`btn btn-sm ${isPassSelected ? "btn-primary" : "btn-secondary"}`}
                                      style={{ fontSize: 11, minWidth: 80 }}
                                    >
                                      {isPassSelected ? "Viewing QR" : "Show QR"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Digital Pass Badge Card with Unique QR */}
            {selectedTicket && (
              <div
                className="card"
                style={{
                  background: "linear-gradient(145deg, #111827 0%, #030712 100%)",
                  border: "1px solid rgba(59, 130, 246, 0.4)",
                  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(37, 99, 235, 0.15)",
                  position: "sticky",
                  top: 80
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--c-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", color: "#93c5fd", textTransform: "uppercase" }}>
                      Unique Entrance Pass
                    </span>
                  </div>
                  <span className="badge badge-green">Valid &amp; Scannable</span>
                </div>

                <div style={{ position: "relative", height: 120, borderRadius: "var(--radius-sm)", overflow: "hidden", marginBottom: 14 }}>
                  <img
                    src={selectedTicket.image || FALLBACK_IMAGE}
                    alt={selectedTicket.eventTitle}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 80%)" }} />
                  <div style={{ position: "absolute", bottom: 8, left: 10, right: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff", lineHeight: 1.3 }}>{selectedTicket.eventTitle}</div>
                    <div style={{ fontSize: 10, color: "#93c5fd", marginTop: 2 }}>{selectedTicket.location}</div>
                  </div>
                </div>

                <div style={{ padding: "12px 0", borderTop: "1px dashed rgba(255,255,255,0.15)", borderBottom: "1px dashed rgba(255,255,255,0.15)", marginBottom: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                    <div>
                      <div style={{ color: "var(--c-text-3)", fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>Pass Holder</div>
                      <div style={{ fontWeight: 700, color: "#ffffff" }}>
                        {selectedTicket.holderName || user?.name || "Pass Holder"}
                        {selectedTicket.isChild && (
                          <span style={{ fontSize: 10, color: "#34d399", marginLeft: 4 }}>(Child)</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--c-text-3)", fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>
                        {selectedTicket.isChild ? "Guardian NIC / Passport" : "Identity (NIC / Passport)"}
                      </div>
                      <div style={{ fontWeight: 700, color: "#34d399", fontFamily: "monospace", fontSize: 11 }}>
                        {selectedTicket.holderNic || user?.nic || "199878901234"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--c-text-3)", fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>Pass Tier &amp; Price</div>
                      <div style={{ fontWeight: 700, color: "#60a5fa" }}>
                        {selectedTicket.tierName} · {selectedTicket.price === 0 ? "Rs. 0 (Free)" : formatLKR(selectedTicket.price)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--c-text-3)", fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>Pass Index &amp; Ref</div>
                      <div style={{ color: "var(--c-text-2)", fontFamily: "monospace" }}>
                        Pass #{selectedTicket.passIndex || 1} ({selectedTicket.bookingRef || selectedTicket.eventId || "BK-LK"})
                      </div>
                    </div>
                  </div>
                </div>

                {/* High-Definition Unique Deterministic QR Code Badge */}
                <div style={{
                  background: "#ffffff",
                  padding: "16px",
                  borderRadius: 14,
                  textAlign: "center",
                  marginBottom: 12,
                  position: "relative"
                }}>
                  <QRCodeVisual key={selectedTicket.qrCode || selectedTicket.id} value={selectedTicket.qrCode || `EVENTFLOW-LK-${selectedTicket.id}`} size={160} showLabel={true} />
                  
                  {selectedTicket.paymentStatus === "PendingApproval" && (
                    <div style={{
                      position: "absolute",
                      inset: 8,
                      background: "rgba(15, 23, 42, 0.88)",
                      borderRadius: 10,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 12,
                      color: "#fbbf24",
                      textAlign: "center"
                    }}>
                      <IcClock style={{ width: 26, height: 26, marginBottom: 6 }} />
                      <div style={{ fontSize: 12, fontWeight: 800 }}>Slip Under Review</div>
                      <div style={{ fontSize: 10, color: "#e2e8f0", marginTop: 4 }}>
                        QR badge activates once organizer verifies bank slip.
                      </div>
                    </div>
                  )}

                  {selectedTicket.paymentStatus === "Rejected" && (
                    <div style={{
                      position: "absolute",
                      inset: 8,
                      background: "rgba(15, 23, 42, 0.92)",
                      borderRadius: 10,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 12,
                      color: "#f87171",
                      textAlign: "center"
                    }}>
                      <IcAlert style={{ width: 26, height: 26, marginBottom: 6 }} />
                      <div style={{ fontSize: 12, fontWeight: 800 }}>Action Required</div>
                      <div style={{ fontSize: 10, color: "#e2e8f0", marginTop: 4 }}>
                        Slip was rejected. Please open chat to re-upload.
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 11, color: "var(--c-text-3)", textAlign: "center", marginBottom: 12 }}>
                  Official Entrance QR Code · Present with NIC ({selectedTicket.holderNic || user?.nic || "Verified"})
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-full btn-sm"
                    onClick={() => alert(`Downloading entrance pass PDF for ${selectedTicket.holderName} (Pass ID: ${selectedTicket.qrCode})`)}
                  >
                    Download Pass PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-full btn-sm"
                    onClick={() => alert(`Pass ${selectedTicket.qrCode} ready for Gate Scanner at ${selectedTicket.location}`)}
                  >
                    Scan Badge
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Two-Way Messaging & Payment Slip Review Drawer */}
        {selectedChatBooking && (
          <BookingChatDrawer
            booking={selectedChatBooking}
            currentUser={user}
            onClose={() => setSelectedChatBooking(null)}
            onBookingUpdated={(updated) => {
              refreshTickets();
              setSelectedChatBooking(updated);
            }}
          />
        )}
      </div>
    </>
  );
}

