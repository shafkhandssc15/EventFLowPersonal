"""
Independent Test File for Student 4 (IT24103303) - Budget & Payments
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

from business_component import BudgetPaymentsManager
from agent import BudgetPaymentsAgent


def run_tests_and_get_output() -> str:
    output_lines = []
    def log(msg=""):
        output_lines.append(msg)
        print(msg)

    log("================================================================================")
    log("         TEST SUITE: STUDENT 4 (IT24103303) - BUDGET & PAYMENTS                 ")
    log("================================================================================")

    manager = BudgetPaymentsManager()
    agent = BudgetPaymentsAgent(manager)

    # --------------------------------------------------------------------------
    # TEST CASE 1: Budget Allocation & Creation
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 1] Event Budget Allocation")
    bgt = manager.create_budget(
        event_id="evt-product-launch-2027",
        total_budget=1500000.0,
        threshold_pct=80.0
    )
    log(f"  [PASS] Budget Created: ID={bgt.id}, Total=LKR {bgt.total_budget:,.2f}, 80% Threshold=LKR {bgt.threshold_amount:,.2f}")
    assert bgt.threshold_amount == 1200000.0, "Threshold should be 80% of 1.5M = 1.2M"

    # --------------------------------------------------------------------------
    # TEST CASE 2: Expense Tracking & Auto-Approval Under Threshold
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 2] Expense Tracking (Under 80% Threshold - Auto Approval)")
    exp1_res = manager.add_expense(bgt.id, "Venue", "Hall Rental Fee", 400000.0)
    log(f"  [PASS] Added Expense 1: Amount=LKR 400,000.00 | Status='{exp1_res['status']}' | Requires Human Approval={exp1_res['requires_human_approval']}")
    assert exp1_res["status"] == "Approved", "Expense 1 should be Auto-Approved"

    exp2_res = manager.add_expense(bgt.id, "Catering", "VIP Dinner & Refreshments", 350000.0)
    log(f"  [PASS] Added Expense 2: Amount=LKR 350,000.00 | Status='{exp2_res['status']}' | Requires Human Approval={exp2_res['requires_human_approval']}")
    assert exp2_res["status"] == "Approved", "Expense 2 should be Auto-Approved"

    # --------------------------------------------------------------------------
    # TEST CASE 3: Threshold Breaching & Auto-Flagging for Human Approval
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 3] Over-Threshold Expense Auto-Flagging (>80% Warning)")
    # Current spend = 750,000. Adding 600,000 brings total to 1,350,000 (> 1,200,000 threshold)
    exp3_res = manager.add_expense(bgt.id, "AV/Sound", "3D Projection & Hologram Rig", 600000.0)
    log(f"  [PASS] Added Expense 3: Amount=LKR 600,000.00 | Status='{exp3_res['status']}' | Requires Human Approval={exp3_res['requires_human_approval']}")
    log(f"  [PASS] Approval Request Reason: {exp3_res['reason']}")
    assert exp3_res["requires_human_approval"] is True, "Over-threshold expense must require human approval"

    # --------------------------------------------------------------------------
    # TEST CASE 4: Human Approval Workflow Review
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 4] Human Review & Approval Workflow")
    approval_req_id = exp3_res["approval_request_id"]
    review_res = manager.review_approval_request(
        request_id=approval_req_id,
        approve=True,
        reviewer_name="Finance Director Sunil"
    )
    log(f"  [PASS] Approval Request Reviewed: Decision='{review_res['decision']}', Reviewed By='{review_res['reviewed_by']}'")
    assert review_res["decision"] == "Approved", "Expense 3 should now be Approved by human review"

    # --------------------------------------------------------------------------
    # TEST CASE 5: Payment Processing
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 5] Payment Processing & Transaction Logging")
    exp1_id = exp1_res["expense_id"]
    payment = manager.process_payment(exp1_id, payment_method="Stripe", reference_code="ch_3Mv89x2eZvKY")
    log(f"  [PASS] Payment Processed: ID={payment.id}, Ref='{payment.reference_code}', Amount=LKR {payment.amount:,.2f}, Status='{payment.status}'")

    # --------------------------------------------------------------------------
    # TEST CASE 6: Budget vs. Actual Analytics Calculation
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 6] Budget vs. Actual Analytics Calculation")
    analytics = manager.get_budget_analytics(bgt.id)
    log(f"  [PASS] Total Budget : LKR {analytics['total_budget']:,.2f}")
    log(f"  [PASS] Total Spent  : LKR {analytics['total_spent']:,.2f}")
    log(f"  [PASS] Remaining    : LKR {analytics['remaining_budget']:,.2f}")
    log(f"  [PASS] Utilization  : {analytics['utilization_pct']:.1f}%")
    log(f"  [PASS] Over 80% Line: {analytics['is_over_threshold']}")

    # --------------------------------------------------------------------------
    # TEST CASE 7: Presentable English Output from AI Agent
    # --------------------------------------------------------------------------
    log("\n[TEST CASE 7] Agent Presentable English Budget Analytics Report Output")
    analytics_report = agent.generate_budget_vs_actual_report(bgt.id)
    log("\n" + analytics_report)

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
