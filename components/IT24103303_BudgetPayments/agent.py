"""
AI Agent for Student 4 (IT24103303) - Budget & Payments Agent
Tied ONLY to Budget & Payments business logic.
Produces presentable English output for financial controllers and event organizers.
"""

from typing import Dict, Any, List
try:
    from .business_component import BudgetPaymentsManager
except ImportError:
    from business_component import BudgetPaymentsManager


class BudgetPaymentsAgent:
    """Specialized AI Agent tied exclusively to Budget & Payments business logic."""

    def __init__(self, manager: BudgetPaymentsManager):
        self.manager = manager
        self.agent_name = "Budget & Financial Controller Agent (IT24103303)"

    def audit_expense_risk(self, budget_id: str, expense_id: str) -> str:
        """Evaluates whether an expense poses financial overrun risk and triggers approval warnings."""
        budget = self.manager.get_budget(budget_id)
        expense = self.manager.expenses.get(expense_id)
        if not budget or not expense:
            return "Error: Budget or Expense record not found."

        analytics = self.manager.get_budget_analytics(budget_id)
        pct = analytics["utilization_pct"]

        lines = [
            "================================================================================",
            "                 EXPENSE FINANCIAL AUDIT & SAFETY COMPLIANCE                   ",
            "================================================================================",
            f" Agent Name        : {self.agent_name}",
            f" Expense Reference : {expense.id}",
            f" Description       : '{expense.description}' ({expense.category})",
            f" Amount Requested  : LKR {expense.amount:,.2f}",
            f" Budget Reference  : {budget.id}",
            f" Total Event Budget: LKR {budget.total_budget:,.2f}",
            f" Current Spend Pct : {pct:.1f}%",
            f" Approval Status   : {expense.status.upper()}",
            "--------------------------------------------------------------------------------",
            " FINANCIAL COMPLIANCE EVALUATION:",
        ]

        if expense.status == "Pending":
            lines.append("  ⚠️ HIGH THRESHOLD ALERT: Expense exceeds 80% safe budget threshold!")
            lines.append("  GOVERNANCE RULE ENFORCED: Automatic workflow paused for human manager approval.")
            lines.append("  ACTION ITEM: Human controller must review ApprovalRequest to approve or reject funds.")
        else:
            lines.append("  ✔ COMPLIANCE APPROVED: Expense is within safe threshold limits.")

        lines.append("================================================================================")
        return "\n".join(lines)

    def generate_budget_vs_actual_report(self, budget_id: str) -> str:
        """
        Produces a presentable English financial report showing Budget vs Actual analytics.
        """
        analytics = self.manager.get_budget_analytics(budget_id)
        budget = self.manager.get_budget(budget_id)

        lines = [
            "================================================================================",
            "               BUDGET VS. ACTUAL FINANCIAL ANALYTICS REPORT                     ",
            "================================================================================",
            f" Agent Name         : {self.agent_name}",
            f" Budget Reference   : {budget_id}",
            f" Event Identifier   : {analytics['event_id']}",
            "--------------------------------------------------------------------------------",
            " EXECUTIVE FINANCIAL SUMMARY:",
            f"  • Total Approved Budget      : LKR {analytics['total_budget']:,.2f}",
            f"  • Auto-Approval Threshold    : LKR {analytics['threshold_limit_80pct']:,.2f} (80.0%)",
            f"  • Total Committed Expenditure: LKR {analytics['total_spent']:,.2f}",
            f"  • Pending Human Approvals    : LKR {analytics['total_pending_approval']:,.2f}",
            f"  • Remaining Available Funds  : LKR {analytics['remaining_budget']:,.2f}",
            f"  • Budget Utilization Rate    : {analytics['utilization_pct']:.1f}%",
            "--------------------------------------------------------------------------------",
            " CATEGORY SPENDING BREAKDOWN:"
        ]

        for cat, spent in analytics["category_spent"].items():
            cat_pct = (spent / max(1, analytics["total_budget"])) * 100
            lines.append(f"  - [{cat.upper()}] : LKR {spent:,.2f} ({cat_pct:.1f}% of total budget)")

        lines.append("--------------------------------------------------------------------------------")
        lines.append(" STRATEGIC AGENT INSIGHTS & RISK ASSESSMENT:")
        if analytics["is_over_threshold"]:
            lines.append("  ⚠️ FINANCIAL RISK: Total spent has exceeded the 80% warning threshold.")
            lines.append("  RECOMMENDATION: Restrict further discretionary spending; enforce strict approval gates.")
        else:
            lines.append("  ✔ FINANCIAL HEALTH GOOD: Expenditures remain below the 80% threshold line.")

        lines.append("================================================================================")
        return "\n".join(lines)
