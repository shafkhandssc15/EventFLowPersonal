"""
Agent 3 - Action/Tool-use Agent (owned by Student 3)

Input: Confirmed venue/vendor + attendee registration events
Output: Executes real actions — reserve venue slot, generate QR tickets,
        trigger email/SMS confirmations
Tools allowed: reserve_venue, generate_qr_ticket, send_notification (via
        third-party email/SMS API)
Structured output logged: what was booked/sent, timestamp, success/failure
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict


def reserve_venue(venue_id: str, vendor_id: str | None, cost: float) -> Dict[str, Any]:
    """Tool: tentatively reserves venue + vendor (mocked — in production POST /api/vendor-bookings)."""
    return {
        "booking_id": str(uuid.uuid4()),
        "venue_id": venue_id,
        "vendor_id": vendor_id,
        "cost": cost,
        "status": "Requested",
        "success": True,
    }


def generate_qr_ticket(ticket_type: str) -> Dict[str, Any]:
    """Tool: generates a draft ticket type / QR scaffold (mocked)."""
    return {"ticket_type": ticket_type, "qr_prefix": f"QR-{uuid.uuid4().hex[:8]}", "success": True}


def send_notification(channel: str, subject: str) -> Dict[str, Any]:
    """Tool: sends via third-party email/SMS API (mocked — in production calls SendGrid/Twilio)."""
    return {"channel": channel, "subject": subject, "sent_at": datetime.now(timezone.utc).isoformat(), "success": True}


def run(top_venue: Dict[str, Any], vendors: list[Dict[str, Any]], budget: float) -> Dict[str, Any]:
    vendor_id = vendors[0]["id"] if vendors else None
    estimated_cost = 2500.0  # venue hours + vendor package, illustrative

    booking = reserve_venue(top_venue["venueId"], vendor_id, estimated_cost)
    ticket_draft = generate_qr_ticket("General Admission")
    notification = send_notification("Email", "Draft booking created — pending budget validation")

    return {
        "agent": "ActionToolUseAgent",
        "input": {"top_venue": top_venue, "vendors": vendors, "budget": budget},
        "output": {"booking": booking, "ticket_draft": ticket_draft, "notification": notification},
        "tool_calls": ["reserve_venue", "generate_qr_ticket", "send_notification"],
        "estimated_cost": estimated_cost,
    }
