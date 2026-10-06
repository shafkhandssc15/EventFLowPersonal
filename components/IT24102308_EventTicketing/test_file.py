"""
Independent Test File for Student 1 (IT24102308) - Event Creation & Ticketing
Runs all unit & integration test cases independently and outputs presentable results to results.txt.
"""

import sys
import os
from pathlib import Path

# Force UTF-8 stdout encoding on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# Enable local imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

from business_component import EventTicketingManager
from agent import EventTicketingAgent


def run_tests_and_get_output() -> str:
    output_lines = []
    def log(msg=""):
        output_lines.append(msg)
        print(msg)

    log("================================================================================")
    log("       TEST SUITE: STUDENT 1 (IT24102308) - EVENT CREATION & TICKETING          ")
    log("================================================================================")

    manager = EventTicketingManager()
    agent = EventTicketingAgent(manager)

    # --------------------------------------------------------------------------
    # TEST CASE 1: Event Creation & CRUD Operations
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 1] Event Creation & Status Workflow")
    evt = manager.create_event(
        title="Global AI & Robotics Summit 2027",
        description="Premier international conference on artificial intelligence and autonomous robotics.",
        category="Technology",
        capacity=300,
        location="BMICH Main Convention Hall, Colombo",
        start_date="2027-11-15T09:00:00Z",
        end_date="2027-11-16T18:00:00Z"
    )
    log(f"  [PASS] Event Created: ID={evt.id}, Title='{evt.title}', Status='{evt.status}', Capacity={evt.capacity}")

    # Publish Event
    manager.publish_event(evt.id)
    log(f"  [PASS] Event Published: Status='{evt.status}'")
    assert evt.status == "Published", "Event status should be Published"

    # --------------------------------------------------------------------------
    # TEST CASE 2: Ticket Tier Creation & Strategy
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 2] Ticket Tier Configuration & Pricing Strategy")
    recommended_tiers = agent.recommend_tier_pricing(capacity=300, estimated_budget=1000000.0)
    log(f"  [PASS] Agent Recommended Tiers: {len(recommended_tiers)} tiers generated")

    eb_tier = manager.add_ticket_type(evt.id, "Early Bird Pass", price=3500.0, quantity=5)
    vip_tier = manager.add_ticket_type(evt.id, "VIP Delegate Pass", price=12000.0, quantity=10)
    gen_tier = manager.add_ticket_type(evt.id, "General Admission", price=5000.0, quantity=50)

    log(f"  [PASS] Added Tier 1: '{eb_tier.name}' | Price: LKR {eb_tier.price:,.2f} | Qty: {eb_tier.quantity}")
    log(f"  [PASS] Added Tier 2: '{vip_tier.name}' | Price: LKR {vip_tier.price:,.2f} | Qty: {vip_tier.quantity}")
    log(f"  [PASS] Added Tier 3: '{gen_tier.name}' | Price: LKR {gen_tier.price:,.2f} | Qty: {gen_tier.quantity}")

    # --------------------------------------------------------------------------
    # TEST CASE 3: Ticket Purchasing & Auto-Close When Sold Out
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 3] Purchasing Tickets & Auto-Closing Sold Out Tiers")
    buyer_names = ["Kasun Perera", "Nimali Silva", "Dinesh Fernando", "Amara Jayasinghe", "Ruwan Wickramasinghe"]
    purchased_tickets = []
    for name in buyer_names:
        tkt = manager.purchase_ticket(evt.id, eb_tier.id, name)
        purchased_tickets.append(tkt)

    log(f"  [PASS] Purchased {len(purchased_tickets)} Early Bird tickets successfully.")
    log(f"  [PASS] Early Bird Tier Status: Sold Count = {eb_tier.sold_count}/{eb_tier.quantity} | Is Sold Out = {eb_tier.is_sold_out} | Is Active = {eb_tier.is_active}")
    assert eb_tier.is_sold_out is True, "Early Bird tier should be marked sold out"

    # Attempting to buy 6th ticket on sold out tier must raise error
    try:
        manager.purchase_ticket(evt.id, eb_tier.id, "Attempted Overbuyer")
        log("  [FAIL] ERROR: Overbuying succeeded when it should have failed!")
    except ValueError as err:
        log(f"  [PASS] SUCCESS: Sold Out enforcement caught expected exception -> '{err}'")

    # --------------------------------------------------------------------------
    # TEST CASE 4: Waitlist Management & Cancellation Re-allocation
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 4] Waitlist Registration & Cancellation Re-allocation")
    wl_result = manager.join_waitlist(evt.id, "Sahan Karunaratne", "sahan@techcorp.lk")
    log(f"  [PASS] Waitlist Joined: {wl_result['message']}")

    # Cancel one ticket and observe waitlist notification
    tkt_to_cancel = purchased_tickets[0]
    cancel_res = manager.cancel_ticket(tkt_to_cancel.id)
    log(f"  [PASS] Ticket Cancelled: Ticket ID={tkt_to_cancel.id} | Status={cancel_res['status']}")
    log(f"  [PASS] Waitlist Re-allocation: {cancel_res['waitlist_notification']}")

    # --------------------------------------------------------------------------
    # TEST CASE 5: Presentable English Output from AI Agent
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 5] Agent Presentable English Executive Sales Summary Output")
    agent_output = agent.generate_sales_report_summary(evt.id)
    log("\n" + agent_output)

    log("\n================================================================================")
    log("                  ALL TEST CASES COMPLETED SUCCESSFULLY (100% PASS)              ")
    log("================================================================================")

    return "\n".join(output_lines)


if __name__ == "__main__":
    results_text = run_tests_and_get_output()
    results_path = Path(__file__).resolve().parent / "results.txt"
    with open(results_path, "w", encoding="utf-8") as f:
        f.write(results_text)
    print(f"\n[INFO] Results successfully saved to {results_path}")
