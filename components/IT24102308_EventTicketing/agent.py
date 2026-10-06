"""
AI Agent for Student 1 (IT24102308) - Event Creation & Ticketing Agent
Tied ONLY to Event Creation & Ticketing business logic.
Produces presentable English output for event organizers.
"""

from typing import Dict, Any, List
try:
    from .business_component import EventTicketingManager
except ImportError:
    from business_component import EventTicketingManager


class EventTicketingAgent:
    """Specialized AI Agent tied exclusively to Event Creation & Ticketing business logic."""

    def __init__(self, manager: EventTicketingManager):
        self.manager = manager
        self.agent_name = "Event & Ticketing Specialist Agent (IT24102308)"

    def recommend_tier_pricing(self, capacity: int, estimated_budget: float, domain: str = "general") -> List[Dict[str, Any]]:
        """
        Calculates optimal ticket tier strategy (Early Bird, VIP, General) tied to event capacity and budget goals.
        """
        eb_qty = int(capacity * 0.25)
        vip_qty = int(capacity * 0.15)
        gen_qty = capacity - (eb_qty + vip_qty)

        base_target_revenue = estimated_budget * 1.25  # 25% profit margin
        avg_price = base_target_revenue / max(1, capacity)

        eb_price = round(avg_price * 0.75, 2)
        vip_price = round(avg_price * 2.20, 2)
        gen_price = round(avg_price * 1.05, 2)

        return [
            {"name": "Early Bird Ticket", "price": eb_price, "quantity": eb_qty, "description": "Discounted 25% for early adopters"},
            {"name": "VIP Pass", "price": vip_price, "quantity": vip_qty, "description": "Includes priority seating, lounge access & exclusive gift bag"},
            {"name": "General Admission", "price": gen_price, "quantity": gen_qty, "description": "Standard event access tier"}
        ]

    def generate_sales_report_summary(self, event_id: str) -> str:
        """
        Produces a presentable, executive English summary report for the event sales and ticketing performance.
        Tied ONLY to EventTicketingManager data.
        """
        report = self.manager.generate_sales_report(event_id)
        event = self.manager.get_event(event_id)

        title = report["event_title"]
        status = report["status"]
        cap = report["capacity"]
        sold = report["total_tickets_sold"]
        occ = report["occupancy_rate_pct"]
        rev = report["total_revenue"]
        waitlist = report["waitlist_count"]

        lines = [
            "================================================================================",
            "                 EVENT TICKETING & EXECUTIVE SALES REPORT                      ",
            "================================================================================",
            f" Agent Name        : {self.agent_name}",
            f" Event Title       : {title} (ID: {event_id})",
            f" Current Status    : {status.upper()}",
            f" Location          : {event.location if event else 'N/A'}",
            f" Event Dates       : {event.start_date if event else 'N/A'} to {event.end_date if event else 'N/A'}",
            "--------------------------------------------------------------------------------",
            " KEY PERFORMANCE INDICATORS (KPIs):",
            f"  • Venue Capacity             : {cap:,} attendees",
            f"  • Total Tickets Sold        : {sold:,} / {report['total_tickets_offered']:,}",
            f"  • Venue Occupancy Rate       : {occ:.1f}%",
            f"  • Gross Ticket Revenue       : LKR {rev:,.2f}",
            f"  • Active Waitlist Count      : {waitlist} interested attendees",
            "--------------------------------------------------------------------------------",
            " TICKET TIER PERFORMANCE BREAKDOWN:",
        ]

        for tier in report["tier_breakdown"]:
            tier_status = "CLOSED (SOLD OUT)" if tier["is_sold_out"] else "ACTIVE (OPEN)"
            lines.append(
                f"  - [{tier['tier_name'].upper()}]\n"
                f"      Price: LKR {tier['price']:,.2f} | Quantity: {tier['quantity']} | Sold: {tier['sold']} | Remaining: {tier['remaining']}\n"
                f"      Tier Revenue: LKR {tier['revenue']:,.2f} | Status: {tier_status}"
            )

        lines.append("--------------------------------------------------------------------------------")
        lines.append(" STRATEGIC RECOMMENDATIONS & AGENT INSIGHTS:")
        if occ >= 90.0:
            lines.append("  ✔ EXCELLENT DEMAND: Event is operating at high occupancy capacity.")
            if waitlist > 0:
                lines.append(f"  ACTION ITEM: {waitlist} attendees on waitlist. Consider expanding venue capacity or adding extra seating.")
        elif occ >= 50.0:
            lines.append("  ✔ STABLE SALES PROGRESS: Ticket sales are steadily advancing toward venue capacity.")
            lines.append("  ACTION ITEM: Boost promotional campaigns for remaining General Admission tickets.")
        else:
            lines.append("  ⚠️ LOW TICKET ADOPTION: Occupancy is below 50%.")
            lines.append("  ACTION ITEM: Consider launching flash discounts or targeted social media advertising.")

        lines.append("================================================================================")
        return "\n".join(lines)
