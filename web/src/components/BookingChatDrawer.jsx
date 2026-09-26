import { useState, useEffect, useRef } from "react";
import {
  IcMail, IcCheck, IcX, IcClock, IcCheckCircle, IcAlert,
  IcShield, IcUser, IcPaperclip, IcSend, IcImage, IcEye
} from "./Icons.jsx";
import { formatLKR } from "../api/supabase.js";

/**
 * Two-way interactive messaging drawer between Attendee and Organizer
 * for Payment Slip review, inquiries, rejection reasons, and re-uploads.
 */
export default function BookingChatDrawer({
  booking,
  currentUser,
  onClose,
  onBookingUpdated
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [newSlip, setNewSlip] = useState(null);
  const [previewSlip, setPreviewSlip] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef(null);

  const isOrganizer = currentUser?.role === "Organizer" || currentUser?.role === "Admin";
  const bookingKey = `ef_booking_msgs_${booking?.bookingRef}`;

  // Load message thread
  function loadMessages() {
    try {
      const saved = JSON.parse(localStorage.getItem(bookingKey) || "[]");
      if (saved.length === 0) {
        // Initial automated message when booking was created
        const initial = [
          {
            id: `msg-init-${booking?.bookingRef}`,
            senderId: booking?.attendeeId,
            senderName: booking?.attendeeName || "Attendee",
            senderRole: "Attendee",
            text: `Submitted booking request for ${booking?.eventTitle || "Event"} (${booking?.passCount || 1} Passes · ${formatLKR(booking?.totalAmount)}). Bank payment slip attached for organizer verification.`,
            slipAttachment: booking?.paymentSlipUrl,
            createdAt: booking?.createdAt || new Date().toISOString()
          }
        ];
        localStorage.setItem(bookingKey, JSON.stringify(initial));
        setMessages(initial);
      } else {
        setMessages(saved);
      }
    } catch {
      setMessages([]);
    }
  }

  useEffect(() => {
    loadMessages();
  }, [booking?.bookingRef]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  function handleSendMessage(e) {
    e?.preventDefault();
    if (!text.trim() && !newSlip) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      bookingRef: booking?.bookingRef,
      senderId: currentUser?.id,
      senderName: currentUser?.name || (isOrganizer ? "Event Organizer" : "Attendee"),
      senderRole: isOrganizer ? "Organizer" : "Attendee",
      text: text.trim(),
      slipAttachment: newSlip,
      createdAt: new Date().toISOString()
    };

    const updated = [...messages, newMsg];
    localStorage.setItem(bookingKey, JSON.stringify(updated));
    setMessages(updated);
    setText("");

    // If attendee uploaded a new slip, update booking status back to PendingApproval
    if (!isOrganizer && newSlip) {
      updateBookingStatus("PendingApproval", newSlip);
      setNewSlip(null);
    }
  }

  // Update Booking Status in LocalStorage and sync
  function updateBookingStatus(newStatus, updatedSlipUrl = null, reason = null) {
    try {
      // 1. Update attendee's tickets
      const attendeeKey = `ef_tickets_${booking?.attendeeId}`;
      const attendeeTickets = JSON.parse(localStorage.getItem(attendeeKey) || "[]");
      const updatedTickets = attendeeTickets.map(tkt => {
        if (tkt.bookingRef === booking?.bookingRef || tkt.eventId === booking?.eventId) {
          return {
            ...tkt,
            paymentStatus: newStatus,
            paymentSlipUrl: updatedSlipUrl || tkt.paymentSlipUrl,
            rejectionReason: reason || (newStatus === "Confirmed" ? null : tkt.rejectionReason)
          };
        }
        return tkt;
      });
      localStorage.setItem(attendeeKey, JSON.stringify(updatedTickets));

      // 2. Update master bookings list
      const masterBookings = JSON.parse(localStorage.getItem("ef_master_bookings") || "[]");
      const updatedMaster = masterBookings.map(b => {
        if (b.bookingRef === booking?.bookingRef) {
          return {
            ...b,
            status: newStatus,
            paymentSlipUrl: updatedSlipUrl || b.paymentSlipUrl,
            rejectionReason: reason || (newStatus === "Confirmed" ? null : b.rejectionReason)
          };
        }
        return b;
      });
      localStorage.setItem("ef_master_bookings", JSON.stringify(updatedMaster));

      // Post status notification message in chat
      const statusNotice = {
        id: `msg-status-${Date.now()}`,
        bookingRef: booking?.bookingRef,
        senderId: currentUser?.id,
        senderName: "System · EventFlow",
        senderRole: "System",
        isStatusAlert: true,
        statusType: newStatus,
        text: newStatus === "Confirmed"
          ? `🎉 Organizer ${currentUser?.name || ""} verified the payment slip! Booking ${booking?.bookingRef} is now APPROVED. Entrance QR passes are active.`
          : `⚠️ Payment slip was marked as REJECTED by organizer. Reason: "${reason || "Please check slip details."}". Attendee can reply or re-upload a clear slip below.`,
        createdAt: new Date().toISOString()
      };
      const updatedChat = [...messages, statusNotice];
      localStorage.setItem(bookingKey, JSON.stringify(updatedChat));
      setMessages(updatedChat);

      if (onBookingUpdated) {
        onBookingUpdated({
          ...booking,
          status: newStatus,
          paymentSlipUrl: updatedSlipUrl || booking?.paymentSlipUrl,
          rejectionReason: reason
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Handle Organizer Approval
  function handleApprove() {
    setBusy(true);
    updateBookingStatus("Confirmed");
    setTimeout(() => {
      setBusy(false);
    }, 400);
  }

  // Handle Organizer Rejection with reason
  function handleRejectSubmit(e) {
    e.preventDefault();
    if (!rejectionReason.trim()) return;

    setBusy(true);
    updateBookingStatus("Rejected", null, rejectionReason.trim());
    setShowRejectModal(false);
    setRejectionReason("");
    setBusy(false);
  }

  // Handle File Input for slip re-upload
  function handleSlipFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewSlip(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 100000,
        display: "flex",
        justifyContent: "flex-end"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 580,
          height: "100vh",
          background: "#0a0f1d",
          borderLeft: "1px solid rgba(59, 130, 246, 0.3)",
          boxShadow: "-15px 0 50px rgba(0, 0, 0, 0.9)",
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "16px 20px",
            background: "rgba(15, 23, 42, 0.95)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>
                Payment Review &amp; Chat
              </span>
              <span className={`badge ${
                booking?.status === "Confirmed" ? "badge-green" :
                booking?.status === "Rejected" ? "badge-red" : "badge-amber"
              }`} style={{ fontSize: 11 }}>
                {booking?.status === "Confirmed" ? "● Approved" :
                 booking?.status === "Rejected" ? "● Action Required" : "● Under Review"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 2 }}>
              Booking: <strong style={{ color: "#ffffff", fontFamily: "monospace" }}>{booking?.bookingRef}</strong> · {booking?.eventTitle}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#ffffff",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <IcX style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Booking & Payment Summary Card */}
        <div style={{ padding: "12px 20px", background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, fontSize: 12 }}>
            <div>
              <div style={{ color: "var(--c-text-3)", fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>Attendee</div>
              <div style={{ fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {booking?.attendeeName || "Attendee"}
              </div>
              <div style={{ fontSize: 10, color: "#34d399", fontFamily: "monospace" }}>{booking?.attendeeNic || "199..."}</div>
            </div>

            <div>
              <div style={{ color: "var(--c-text-3)", fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>Passes / Amount</div>
              <div style={{ fontWeight: 800, color: "#60a5fa" }}>{formatLKR(booking?.totalAmount)}</div>
              <div style={{ fontSize: 10, color: "var(--c-text-3)" }}>{booking?.passCount || 1} Passes</div>
            </div>

            <div>
              <div style={{ color: "var(--c-text-3)", fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>Bank Slip</div>
              {booking?.paymentSlipUrl ? (
                <button
                  type="button"
                  onClick={() => setPreviewSlip(booking?.paymentSlipUrl)}
                  className="btn btn-secondary btn-sm"
                  style={{ height: 26, fontSize: 11, padding: "0 8px", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <IcEye style={{ width: 12, height: 12 }} /> View Slip
                </button>
              ) : (
                <span style={{ color: "var(--c-text-3)", fontSize: 11 }}>No Slip</span>
              )}
            </div>
          </div>

          {/* Organizer Approval Action Bar */}
          {isOrganizer && booking?.status !== "Confirmed" && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed rgba(255,255,255,0.1)", display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                onClick={handleApprove}
                disabled={busy}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, background: "linear-gradient(135deg, #16a34a, #15803d)", border: "none", fontWeight: 800 }}
              >
                <IcCheckCircle style={{ width: 14, height: 14 }} /> Approve Payment &amp; Issue Passes
              </button>

              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={busy}
                className="btn btn-danger btn-sm"
                style={{ fontWeight: 700 }}
              >
                <IcX style={{ width: 14, height: 14 }} /> Reject / Send Reason
              </button>
            </div>
          )}
        </div>

        {/* Messages List Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map(msg => {
            const isMe = msg.senderId === currentUser?.id || (isOrganizer && msg.senderRole === "Organizer") || (!isOrganizer && msg.senderRole === "Attendee");
            const isSystem = msg.senderRole === "System";

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: "center",
                    maxWidth: "90%",
                    padding: "10px 14px",
                    background: msg.statusType === "Confirmed" ? "rgba(22, 163, 74, 0.15)" : "rgba(220, 38, 38, 0.15)",
                    border: msg.statusType === "Confirmed" ? "1px solid rgba(22, 163, 74, 0.35)" : "1px solid rgba(220, 38, 38, 0.35)",
                    borderRadius: "12px",
                    textAlign: "center",
                    fontSize: 12,
                    color: msg.statusType === "Confirmed" ? "#86efac" : "#fca5a5"
                  }}
                >
                  <div>{msg.text}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isMe ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start"
                }}
              >
                <div style={{ fontSize: 10, color: "var(--c-text-3)", marginBottom: 3, fontWeight: 700 }}>
                  {msg.senderName} · <span style={{ color: msg.senderRole === "Organizer" ? "#60a5fa" : "#34d399" }}>{msg.senderRole}</span>
                </div>

                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    background: isMe
                      ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                      : "rgba(255, 255, 255, 0.06)",
                    border: isMe ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    fontSize: 13,
                    lineHeight: 1.5,
                    boxShadow: isMe ? "0 4px 15px rgba(37,99,235,0.3)" : "none"
                  }}
                >
                  <div>{msg.text}</div>

                  {/* Attached Slip Thumbnail */}
                  {msg.slipAttachment && (
                    <div style={{ marginTop: 8 }}>
                      <div
                        onClick={() => setPreviewSlip(msg.slipAttachment)}
                        style={{
                          cursor: "pointer",
                          borderRadius: 8,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.2)",
                          position: "relative",
                          maxHeight: 140
                        }}
                      >
                        <img
                          src={msg.slipAttachment}
                          alt="Bank Payment Slip"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.9 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#ffffff", background: "rgba(0,0,0,0.6)", padding: "2px 8px", borderRadius: 4 }}>
                            🔍 View Slip Attachment
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 9, color: "var(--c-text-3)", marginTop: 2 }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Selected Attachment Preview */}
        {newSlip && (
          <div style={{ padding: "8px 20px", background: "rgba(37,99,235,0.12)", borderTop: "1px solid rgba(37,99,235,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src={newSlip} alt="New Slip" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }} />
              <div style={{ fontSize: 12, color: "#93c5fd" }}>
                <strong>New Payment Slip Ready</strong> · Re-submits for verification
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewSlip(null)}
              style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: 4 }}
            >
              <IcX style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}

        {/* Chat Input Bar */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: "14px 20px",
            background: "rgba(15, 23, 42, 0.98)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: 10
          }}
        >
          {/* File Upload Button */}
          <label
            title="Attach / Re-upload Payment Slip"
            style={{
              width: 38,
              height: 38,
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--c-text-2)",
              flexShrink: 0
            }}
          >
            <IcPaperclip style={{ width: 18, height: 18 }} />
            <input
              type="file"
              accept="image/*,.pdf"
              style={{ display: "none" }}
              onChange={handleSlipFileChange}
            />
          </label>

          <input
            className="form-input"
            style={{ flex: 1, height: 38 }}
            placeholder={
              isOrganizer
                ? "Message attendee about payment slip…"
                : "Type message or attach updated payment slip…"
            }
            value={text}
            onChange={e => setText(e.target.value)}
          />

          <button
            type="submit"
            className="btn btn-primary"
            style={{ height: 38, width: 42, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            disabled={!text.trim() && !newSlip}
          >
            <IcSend style={{ width: 16, height: 16 }} />
          </button>
        </form>

        {/* ── Rejection Reason Modal (Organizer) ── */}
        {showRejectModal && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              zIndex: 10
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 440,
                background: "#0f172a",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "16px",
                padding: 24,
                boxShadow: "0 20px 50px rgba(0,0,0,0.8)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f87171", marginBottom: 10 }}>
                <IcAlert style={{ width: 20, height: 20 }} />
                <span style={{ fontSize: 16, fontWeight: 800 }}>Reject Payment Slip</span>
              </div>

              <p style={{ fontSize: 13, color: "var(--c-text-2)", marginBottom: 14 }}>
                Please specify the reason for rejecting this payment slip. The attendee will immediately receive your message and can reply or re-upload.
              </p>

              <form onSubmit={handleRejectSubmit}>
                <textarea
                  className="form-input"
                  rows="3"
                  required
                  placeholder="e.g. The transferred amount is missing the transaction reference number. Please upload the official bank receipt."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  style={{ width: "100%", marginBottom: 16 }}
                />

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowRejectModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger"
                    disabled={!rejectionReason.trim() || busy}
                  >
                    Submit Rejection &amp; Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Full Slip Zoom Modal ── */}
        {previewSlip && (
          <div
            onClick={() => setPreviewSlip(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.92)",
              backdropFilter: "blur(14px)",
              zIndex: 100001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              cursor: "zoom-out"
            }}
          >
            <div style={{ maxWidth: "90%", maxHeight: "90%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>Bank Payment Slip Document</span>
                <button
                  type="button"
                  onClick={() => setPreviewSlip(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Close ✕
                </button>
              </div>
              <img
                src={previewSlip}
                alt="Bank Transfer Slip"
                style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
