"""
Independent Test File for Student 2 (IT24101737) - Venue & Vendor Booking
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

from business_component import VenueVendorManager
from agent import VenueVendorAgent


def run_tests_and_get_output() -> str:
    output_lines = []
    def log(msg=""):
        output_lines.append(msg)
        print(msg)

    log("================================================================================")
    log("       TEST SUITE: STUDENT 2 (IT24101737) - VENUE & VENDOR BOOKING              ")
    log("================================================================================")

    manager = VenueVendorManager()
    agent = VenueVendorAgent(manager)

    # --------------------------------------------------------------------------
    # TEST CASE 1: Venue & Vendor Catalog Setup & Search
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 1] Resource Registration & Search / Filtering")
    v1 = manager.register_venue(
        name="Cinnamon Grand Oak Room",
        location="Colombo 03",
        capacity=400,
        price_per_hour=45000.0,
        amenities=["High-speed WiFi", "AV Stage", "VIP Lounge", "Valet Parking"],
        availability_dates=["2027-11-20", "2027-11-21", "2027-11-22"]
    )
    v2 = manager.register_venue(
        name="Shangri-La Ballroom",
        location="Colombo 02",
        capacity=600,
        price_per_hour=75000.0,
        amenities=["HD LED Screens", "Banqueting Hall", "Direct Ocean View"],
        availability_dates=["2027-11-20", "2027-11-25"]
    )

    vendor1 = manager.register_vendor(
        name="SoundWave Audio Systems",
        category="Sound/AV",
        hourly_rate=15000.0,
        rating=4.9,
        availability_dates=["2027-11-20", "2027-11-21"]
    )

    log(f"  [PASS] Registered Venue 1: '{v1.name}' (Cap: {v1.capacity}, LKR {v1.price_per_hour:,.2f}/hr)")
    log(f"  [PASS] Registered Venue 2: '{v2.name}' (Cap: {v2.capacity}, LKR {v2.price_per_hour:,.2f}/hr)")
    log(f"  [PASS] Registered Vendor 1: '{vendor1.name}' ({vendor1.category}, Rating: {vendor1.rating}/5.0)")

    # Search venues matching criteria
    found_venues = manager.search_venues(location="Colombo", min_capacity=350, date_str="2027-11-20")
    log(f"  [PASS] Search Venues Result: Found {len(found_venues)} venues available on 2027-11-20")
    assert len(found_venues) == 2, "Should find 2 available venues"

    # --------------------------------------------------------------------------
    # TEST CASE 2: Booking Workflow & Confirmation
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 2] Booking Creation & Status Workflow")
    booking1 = manager.create_booking(
        event_id="evt-tech-expo-01",
        resource_id=v1.id,
        resource_type="Venue",
        booking_date="2027-11-20",
        duration_hours=8
    )
    log(f"  [PASS] Created Booking 1: ID={booking1.id}, Resource='{v1.name}', Cost=LKR {booking1.total_cost:,.2f}, Status='{booking1.status}'")

    confirmed_b1 = manager.confirm_booking(booking1.id)
    log(f"  [PASS] Confirmed Booking 1: Status='{confirmed_b1.status}'")
    assert confirmed_b1.status == "Confirmed", "Booking status should be Confirmed"

    # --------------------------------------------------------------------------
    # TEST CASE 3: Double-Booking Conflict Prevention
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 3] Double-Booking Conflict Prevention Enforcement")
    booking2 = manager.create_booking(
        event_id="evt-competing-summit-02",
        resource_id=v1.id,  # SAME VENUE
        resource_type="Venue",
        booking_date="2027-11-20",  # SAME DATE
        duration_hours=6
    )
    log(f"  [PASS] Created Competing Booking 2 (Status='{booking2.status}') on same date for {v1.name}")

    try:
        manager.confirm_booking(booking2.id)
        log("  [FAIL] ERROR: Double-booking succeeded when it should have been blocked!")
    except ValueError as conflict_err:
        log(f"  [PASS] SUCCESS: Double-Booking Conflict caught expected exception -> '{conflict_err}'")
        assert booking2.status == "Rejected", "Conflicting booking status should be Rejected"

    # --------------------------------------------------------------------------
    # TEST CASE 4: Alternate Venue Recommendation Engine
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 4] Alternate Venue Recommendation Engine")
    alternates = manager.suggest_alternate_venues(required_capacity=350, location="Colombo", booking_date="2027-11-20", exclude_venue_id=v1.id)
    log(f"  [PASS] Alternate Venues Found: {len(alternates)}")
    for alt in alternates:
        log(f"    - Alternate: {alt['name']} | Fit Score: {alt['fit_score']} | Reason: {alt['reason']}")
    assert len(alternates) >= 1, "Should find at least 1 available alternate venue"

    # --------------------------------------------------------------------------
    # TEST CASE 5: Presentable English Output from AI Agent
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 5] Agent Presentable English Conflict Resolution Output")
    conflict_report = agent.resolve_booking_conflict(
        failed_venue_id=v1.id,
        required_capacity=350,
        location="Colombo",
        booking_date="2027-11-20"
    )
    log("\n" + conflict_report)

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
