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

    # Base calculated cost: 6 hours venue + vendor quote
    calculated_base_cost = (price_per_hour * 6.0) + vendor_price

    prompt = f"""You are the Action & Execution Agent in an autonomous Event Management platform.
Generate action execution records for reserving the top venue and configuring ticketing.

Venue Selected: {venue_name} (Rate: Rs. {price_per_hour:,.0f}/hr, Capacity: {top_venue.get('capacity', 500)})
Vendor Selected: {vendor_name} (Quote: Rs. {vendor_price:,.0f})
Event Budget: Rs. {budget:,.0f} LKR
Calculated Operations Baseline: Rs. {calculated_base_cost:,.0f} LKR

Generate a JSON object containing:
1. "estimated_cost": A realistic total cost number in LKR (including venue 6h hire, vendor quote, and technical setup).
2. "primary_ticket_name": Title for the primary attendee ticket tier (e.g. "Full Delegate Pass").
3. "ticket_tiers": An array of 3 realistic ticket tiers:
   [
     {{"name": "VIP All-Access Pass", "price": 25000, "allocation_pct": 20, "perks": "Front row seating & VIP dinner"}},
     {{"name": "Standard Delegate Pass", "price": 10000, "allocation_pct": 70, "perks": "Full access to keynote & exhibits"}},
     {{"name": "Student Pass", "price": 4000, "allocation_pct": 10, "perks": "General admission pass"}}
   ]
4. "notification_subject": Subject line for the organizer notification.
5. "notification_body": A 1-2 sentence professional notification body to the organizer.

Return STRICT JSON ONLY:"""

    raw_response, engine_name = call_llm(
        prompt,
        system_prompt="You are an expert AI event operations and ticketing agent. Return valid JSON only.",
        cache_key=f"action_{venue_id}_{int(budget)}"
    )

    parsed = parse_json_from_llm(raw_response) if raw_response else None

    if parsed and isinstance(parsed, dict):
        estimated_cost = float(parsed.get("estimated_cost", calculated_base_cost))
        ticket_name = parsed.get("primary_ticket_name", "General Admission Pass")
        ticket_tiers = parsed.get("ticket_tiers", [])
        notif_subject = parsed.get("notification_subject", f"Tentative Hold Placed: {venue_name}")
        notif_body = parsed.get("notification_body", f"Preliminary reservation placed at {venue_name}. Total cost estimated at Rs. {estimated_cost:,.0f} LKR.")
    else:
        estimated_cost = calculated_base_cost
        ticket_name = "Standard Delegate Pass"
        ticket_tiers = [
            {"name": "VIP Summit Pass", "price": 25000, "allocation_pct": 20, "perks": "VIP lounge access"},
            {"name": "Standard Delegate Pass", "price": 10000, "allocation_pct": 70, "perks": "Main conference floor"},
            {"name": "Student Pass", "price": 4000, "allocation_pct": 10, "perks": "General admission"}
        ]
        notif_subject = f"Tentative Reservation: {venue_name}"
        notif_body = f"Venue hold initiated at {venue_name}. Pending financial safety review."

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
