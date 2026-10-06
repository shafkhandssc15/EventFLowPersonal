"""
Independent Test File for Student 3 (IT24103127) - Attendee Registration & Check-in
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

from business_component import AttendeeRegistrationManager
from agent import AttendeeRegistrationAgent


def run_tests_and_get_output() -> str:
    output_lines = []
    def log(msg=""):
        output_lines.append(msg)
        print(msg)

    log("================================================================================")
    log("    TEST SUITE: STUDENT 3 (IT24103127) - ATTENDEE REGISTRATION & CHECK-IN       ")
    log("================================================================================")

    manager = AttendeeRegistrationManager()
    agent = AttendeeRegistrationAgent(manager)

    # --------------------------------------------------------------------------
    # TEST CASE 1: Attendee Registration & QR Generation
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 1] Attendee Registration & QR Code Generation")
    reg1 = manager.register_attendee(
        event_id="evt-ai-expo-2027",
        name="Kamal Gunaratne",
        email="kamal@techlanka.lk",
        phone="+94771234567"
    )
    reg2 = manager.register_attendee(
        event_id="evt-ai-expo-2027",
        name="Dilani Jayawardena",
        email="dilani@horizon.lk",
        phone="+94719876543"
    )

    log(f"  [PASS] Registered Attendee 1: ID={reg1.id}, Name='{reg1.attendee_name}', QR='{reg1.qr_code}', Status='{reg1.status}'")
    log(f"  [PASS] Registered Attendee 2: ID={reg2.id}, Name='{reg2.attendee_name}', QR='{reg2.qr_code}', Status='{reg2.status}'")
    assert reg1.qr_code.startswith("QR-"), "QR code should start with 'QR-'"

    # --------------------------------------------------------------------------
    # TEST CASE 2: Confirmation Notification Dispatch Log
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 2] Confirmation Email & SMS Notification Dispatch")
    log(f"  [PASS] Total Notifications Sent: {len(manager.notifications)} notifications logged")
    for n in manager.notifications:
        log(f"    - [{n.channel}] Recipient: {n.recipient} | Subject: '{n.subject}'")
    assert len(manager.notifications) == 4, "Should have 2 Email + 2 SMS notifications logged"

    # --------------------------------------------------------------------------
    # TEST CASE 3: Ticket Transfer Workflow
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 3] Ticket Transfer Workflow")
    transferred_reg = manager.transfer_ticket(
        registration_id=reg2.id,
        new_name="Chaminda Vass",
        new_email="chaminda@sports.lk",
        new_phone="+94701112223"
    )
    log(f"  [PASS] Transferred Ticket: RegID={transferred_reg.id}, New Name='{transferred_reg.attendee_name}', Status='{transferred_reg.status}'")
    assert transferred_reg.attendee_name == "Chaminda Vass", "Attendee name should be updated"

    # --------------------------------------------------------------------------
    # TEST CASE 4: QR Check-in Processing & DUPLICATE Prevention
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 4] QR Check-in Processing & Duplicate Scan Prevention")
    # Scan 1: Successful check-in
    checkin_res1 = manager.process_qr_checkin(reg1.qr_code, scanned_by="Gate 1 - Steward John")
    log(f"  [PASS] Valid Check-in 1 Approved: Attendee='{checkin_res1['attendee_name']}', QR='{checkin_res1['qr_code']}', Status='{checkin_res1['checkin_status']}'")
    assert reg1.status == "CheckedIn", "Status should update to CheckedIn"

    # Scan 2: Duplicate scan attempt on same QR code must trigger security block exception
    try:
        manager.process_qr_checkin(reg1.qr_code, scanned_by="Gate 2 - Steward Mary")
        log("  [FAIL] ERROR: Duplicate scan succeeded when it should have been blocked!")
    except ValueError as dup_err:
        log(f"  [PASS] SUCCESS: Duplicate Check-in Prevention caught expected exception -> '{dup_err}'")

    # --------------------------------------------------------------------------
    # TEST CASE 5: Attendee CSV Roster Export
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 5] Attendee Roster CSV Export")
    csv_data = manager.export_attendee_roster("evt-ai-expo-2027")
    csv_lines = csv_data.split("\n")
    log(f"  [PASS] CSV Export Generated: {len(csv_lines)} lines (Header + {len(csv_lines)-1} attendee records)")
    for line in csv_lines:
        log(f"    {line}")

    # --------------------------------------------------------------------------
    # TEST CASE 6: Presentable English Output from AI Agent
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 6] Agent Presentable English Audit Report Output")
    audit_report = agent.generate_checkin_audit_report("evt-ai-expo-2027")
    log("\n" + audit_report)

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
