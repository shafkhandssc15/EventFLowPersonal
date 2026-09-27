"""
Agent 3 - Action/Tool-use Agent (owned by Student 3)

Upgraded for AI Lab Architecture:
- LLM Action Synthesizer: Dynamically calculates operational cost models, projects ticket tiers, and generates booking records & notifications.
- High-Availability: Powered by shared LLM Client (Gemini 3.8 Flash primary with Groq Failover).
- Tools: reserve_venue, generate_qr_ticket, send_notification, generate_ticket_tiers
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from agents.llm_client import call_llm, parse_json_from_llm


def reserve_venue(venue_id: str, vendor_id: Optional[str], cost: float, venue_name: str) -> Dict[str, Any]:
    """Tool: tentatively reserves venue slot + vendor package."""
    return {
        "booking_id": str(uuid.uuid4()),
        "venue_id": venue_id,
        "venue_name": venue_name,
        "vendor_id": vendor_id,
        "cost": cost,
        "status": "Requested",
        "hold_expires_at": datetime.now(timezone.utc).isoformat(),
        "success": True,
    }


def generate_qr_ticket(ticket_type: str) -> Dict[str, Any]:
    """Tool: generates ticket scaffold with secure QR verification prefix."""
    return {
        "ticket_type": ticket_type,
        "qr_prefix": f"QR-{uuid.uuid4().hex[:8].upper()}",
        "security_hash": uuid.uuid4().hex,
        "success": True
    }


def send_notification(channel: str, subject: str, message: str) -> Dict[str, Any]:
    """Tool: dispatches automated notifications via simulated email/SMS gateway."""
    return {
        "channel": channel,
        "subject": subject,
        "message": message,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "success": True
    }


def run(top_venue: Dict[str, Any], vendors: List[Dict[str, Any]], budget: float) -> Dict[str, Any]:
    vendor = vendors[0] if vendors else None
    vendor_id = vendor["id"] if vendor else None
    vendor_name = vendor.get("name", "Registered Vendor") if vendor else "Direct Venue Service"
    venue_name = top_venue.get("name", "Selected Venue")
    venue_id = top_venue.get("venueId") or top_venue.get("id", "ven-001")
    price_per_hour = float(top_venue.get("price_per_hour") or top_venue.get("PricePerHour") or 75000.0)
    vendor_price = float(vendor.get("price_per_service") or vendor.get("PricePerService") or 150000.0) if vendor else 0.0

    calculated_base_cost = (price_per_hour * 6.0) + vendor_price
    estimated_cost = max(calculated_base_cost, 0.0)
    if budget > 0:
        estimated_cost = min(estimated_cost, budget)

    ticket_name = "Standard Delegate Pass"
    ticket_tiers = [
        {"name": "VIP Summit Pass", "price": 25000, "allocation_pct": 20, "perks": "VIP lounge access"},
        {"name": "Standard Delegate Pass", "price": 10000, "allocation_pct": 70, "perks": "Main conference floor"},
        {"name": "Student Pass", "price": 4000, "allocation_pct": 10, "perks": "General admission"},
    ]
    notif_subject = f"Tentative Reservation: {venue_name}"
    notif_body = f"Venue hold initiated at {venue_name}. Pending financial safety review."

    prompt = f"""You are the Action & Execution Agent in an autonomous Event Management platform.
Generate human-readable operation summary only. Do not make approval decisions.

Venue Selected: {venue_name} (Rate: Rs. {price_per_hour:,.0f}/hr, Capacity: {top_venue.get('capacity', 500)})
Vendor Selected: {vendor_name} (Quote: Rs. {vendor_price:,.0f})
Event Budget: Rs. {budget:,.0f} LKR
Calculated Operations Baseline: Rs. {calculated_base_cost:,.0f} LKR

Return JSON with:
1. "notification_subject": subject line for organizer email
2. "notification_body": 1-2 sentence notification message
3. "primary_ticket_name": ticket tier name
4. "ticket_tiers": 3 ticket tiers with name, price, allocation_pct, perks
Return STRICT JSON ONLY:"""

    raw_response, engine_name = call_llm(
        prompt,
        system_prompt="You are an expert event operations agent. Produce structured JSON only; do not decide approvals.",
        cache_key=f"action_{venue_id}_{int(budget)}"
    )

    parsed = parse_json_from_llm(raw_response) if raw_response else None
    if isinstance(parsed, dict):
        if parsed.get("notification_subject"):
            notif_subject = parsed["notification_subject"]
        if parsed.get("notification_body"):
            notif_body = parsed["notification_body"]
        if parsed.get("primary_ticket_name"):
            ticket_name = parsed["primary_ticket_name"]
        if isinstance(parsed.get("ticket_tiers"), list) and parsed["ticket_tiers"]:
            ticket_tiers = parsed["ticket_tiers"]

    booking = reserve_venue(venue_id, vendor_id, estimated_cost, venue_name)
    ticket_draft = generate_qr_ticket(ticket_name)
    notification = send_notification("Email", notif_subject, notif_body)

    return {
        "agent": "ActionToolUseAgent",
        "input": {"top_venue": top_venue, "vendors": vendors, "budget": budget},
        "output": {
            "booking": booking,
            "ticket_draft": ticket_draft,
            "ticket_tiers": ticket_tiers,
            "notification": notification,
            "estimated_cost": estimated_cost,
            "budget": budget,
            "auto_approval_threshold": 500000.0,
            "llm_engine": engine_name,
        },
        "tool_calls": [
            "reserve_venue",
            "generate_qr_ticket",
            "send_notification",
            f"llm_synthesize_action_plan({engine_name})"
        ],
        "estimated_cost": estimated_cost,
    }
