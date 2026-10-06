"""
Master Test Runner for all 4 Team Members / Component Folders.
Executes test_file.py for each member component independently and updates results.txt proof files.
"""

import os
import subprocess
import sys
from pathlib import Path

COMPONENTS = [
    ("Student 1 (IT24102308)", "IT24102308_EventTicketing"),
    ("Student 2 (IT24101737)", "IT24101737_VenueVendorBooking"),
    ("Student 3 (IT24103127)", "IT24103127_AttendeeRegistrationCheckIn"),
    ("Student 4 (IT24103303)", "IT24103303_BudgetPayments"),
]

def run_all():
    base_dir = Path(__file__).resolve().parent
    print("================================================================================")
    print("         RUNNING ALL 4 COMPONENT TEST SUITES INDEPENDENTLY                      ")
    print("================================================================================\n")

    for student_label, folder_name in COMPONENTS:
        folder_path = base_dir / folder_name
        test_script = folder_path / "test_file.py"
        print(f"[*] Running Test Suite for {student_label} in {folder_name}...")

        res = subprocess.run([sys.executable, "test_file.py"], cwd=folder_path, capture_output=True, text=True, encoding="utf-8")
        if res.returncode == 0:
            print(f"  [PASS] {student_label} tests completed successfully.")
            print(f"  [FILE] Results updated at: {folder_path / 'results.txt'}\n")
        else:
            print(f"  [FAIL] Error running tests for {student_label}:")
            print(res.stderr)
            sys.exit(1)

    print("================================================================================")
    print("  ALL 4 MEMBER COMPONENT TEST SUITES COMPLETED WITH 100% PASS PROOF!             ")
    print("================================================================================")

if __name__ == "__main__":
    run_all()
