"""
Master Test Runner for ASP.NET Core Backend Files (Individual Controller Suites).
Executes test suites for each backend controller file independently and outputs
a detailed, presentable test report to results.txt.
"""

import subprocess
import sys
from pathlib import Path

# Force UTF-8 stdout encoding on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

BACKEND_TEST_SUITES = [
    (
        "Student 1 — Event Creation & Ticketing (EventsController.cs)",
        "FullyQualifiedName~EventsControllerTests",
        "EventsControllerTests"
    ),
    (
        "Student 2 — Venue & Vendor Booking (VenuesVendorsController.cs)",
        "FullyQualifiedName~VenuesVendorsControllerTests",
        "VenuesVendorsControllerTests"
    ),
    (
        "Student 3 — Attendee Registration & QR Check-in (RegistrationsController.cs)",
        "FullyQualifiedName~RegistrationsControllerTests",
        "RegistrationsControllerTests"
    ),
    (
        "Student 4 — Budget Allocation, Expenses & Approvals (BudgetsController.cs)",
        "FullyQualifiedName~BudgetsControllerTests",
        "BudgetsControllerTests"
    ),
    (
        "AI Subsystem — Agentic Orchestration & Approval Gate (AgentWorkflowController.cs)",
        "FullyQualifiedName~AgentWorkflowControllerTests",
        "AgentWorkflowControllerTests"
    ),
]


def run_all_backend_tests() -> str:
    base_dir = Path(__file__).resolve().parent
    tests_proj_dir = base_dir / "EventManagement.Tests"
    output_lines = []

    def log(msg=""):
        output_lines.append(msg)
        print(msg)

    log("================================================================================")
    log("     ASP.NET CORE BACKEND API — INDIVIDUAL TEST SUITE EXECUTION REPORT          ")
    log("================================================================================")
    log(f"Project Target : EventManagement.Tests (xUnit + EF Core In-Memory + Mock HTTP)")
    log(f"Working Directory: {tests_proj_dir}\n")

    total_suites = len(BACKEND_TEST_SUITES)
    passed_suites = 0

    for idx, (title, filter_expr, class_name) in enumerate(BACKEND_TEST_SUITES, start=1):
        log("--------------------------------------------------------------------------------")
        log(f"[SUITE {idx}/{total_suites}] {title}")
        log(f"  Target File : Controllers/{class_name}.cs")
        log(f"  Filter      : dotnet test --filter \"{filter_expr}\"")
        log("--------------------------------------------------------------------------------")

        cmd = ["dotnet", "test", "--filter", filter_expr, "--nologo", "-v", "minimal"]
        result = subprocess.run(cmd, cwd=tests_proj_dir, capture_output=True, text=True, encoding="utf-8")

        stdout_clean = result.stdout.strip()
        if result.returncode == 0:
            passed_suites += 1
            log("  [PASS] All test cases in suite passed successfully!")
            # Extract test summary lines
            summary_lines = [l for l in stdout_clean.splitlines() if "Passed!" in l or "Total:" in l]
            for sl in summary_lines:
                log(f"  [METRICS] {sl.strip()}")
            log()
        else:
            log(f"  [FAIL] Errors detected during suite execution:")
            log(result.stdout)
            log(result.stderr)
            log()

    log("================================================================================")
    if passed_suites == total_suites:
        log(f"  OVERALL RESULT: 100% PASS ({passed_suites}/{total_suites} Controller Test Suites Passed)")
        log("================================================================================")
    else:
        log(f"  OVERALL RESULT: INCOMPLETE ({passed_suites}/{total_suites} Controller Test Suites Passed)")
        log("================================================================================")

    return "\n".join(output_lines)


if __name__ == "__main__":
    report = run_all_backend_tests()
    results_file = Path(__file__).resolve().parent / "results.txt"
    with open(results_file, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"\n[INFO] Backend test results proof successfully saved to {results_file}")
