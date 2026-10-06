"""
Business Component for Student 4 (IT24103303) - Budget & Payments
Entities: Budget, Expense, Payment, ApprovalRequest
Key Features:
- Budget allocation and expense tracking
- Auto-flagging expenses exceeding threshold (e.g. > 80% threshold) for human approval
- Human approval workflow for ApprovalRequest (Approved / Rejected)
- Payment processing (recording payment status & Stripe transaction reference)
- Budget vs. Actual analytics (variance calculation, spending breakdown, overrun risk)
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional


class Budget:
    def __init__(self, event_id: str, total_budget: float, auto_approval_threshold_pct: float = 80.0, budget_id: Optional[str] = None):
        self.id = budget_id or f"bgt-{uuid.uuid4().hex[:8]}"
        self.event_id = event_id
        self.total_budget = total_budget
        self.auto_approval_threshold_pct = auto_approval_threshold_pct
        self.threshold_amount = (total_budget * auto_approval_threshold_pct) / 100.0
        self.created_at = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "total_budget": self.total_budget,
            "auto_approval_threshold_pct": self.auto_approval_threshold_pct,
            "threshold_amount": self.threshold_amount,
            "created_at": self.created_at
        }


class Expense:
    def __init__(self, budget_id: str, category: str, description: str, amount: float, exp_id: Optional[str] = None):
        self.id = exp_id or f"exp-{uuid.uuid4().hex[:8]}"
        self.budget_id = budget_id
        self.category = category  # Venue, Catering, Marketing, AV/Sound, Logistics
        self.description = description
        self.amount = amount
        self.status = "Pending"  # Pending, Approved, Paid, Rejected
        self.created_at = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "budget_id": self.budget_id,
            "category": self.category,
            "description": self.description,
            "amount": self.amount,
            "status": self.status,
            "created_at": self.created_at
        }


class ApprovalRequest:
    def __init__(self, expense_id: str, budget_id: str, reason: str, requested_amount: float, threshold_amount: float, req_id: Optional[str] = None):
        self.id = req_id or f"app-{uuid.uuid4().hex[:8]}"
        self.expense_id = expense_id
        self.budget_id = budget_id
        self.reason = reason
        self.requested_amount = requested_amount
        self.threshold_amount = threshold_amount
        self.status = "Pending"  # Pending, Approved, Rejected
        self.reviewed_by = None
        self.reviewed_at = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "expense_id": self.expense_id,
            "budget_id": self.budget_id,
            "reason": self.reason,
            "requested_amount": self.requested_amount,
            "threshold_amount": self.threshold_amount,
            "status": self.status,
            "reviewed_by": self.reviewed_by,
            "reviewed_at": self.reviewed_at
        }


class Payment:
    def __init__(self, expense_id: str, payment_method: str, reference_code: str, amount: float, pay_id: Optional[str] = None):
        self.id = pay_id or f"pay-{uuid.uuid4().hex[:8]}"
        self.expense_id = expense_id
        self.payment_method = payment_method  # CreditCard, BankTransfer, Stripe
        self.reference_code = reference_code
        self.amount = amount
        self.status = "Completed"
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "expense_id": self.expense_id,
            "payment_method": self.payment_method,
            "reference_code": self.reference_code,
            "amount": self.amount,
            "status": self.status,
            "timestamp": self.timestamp
        }


class BudgetPaymentsManager:
    """Core Business Logic Component for Budget & Payments (IT24103303)."""

    def __init__(self):
        self.budgets: Dict[str, Budget] = {}
        self.expenses: Dict[str, Expense] = {}
        self.approval_requests: Dict[str, ApprovalRequest] = {}
        self.payments: Dict[str, Payment] = {}

    # --- Budget Allocation ---
    def create_budget(self, event_id: str, total_budget: float, threshold_pct: float = 80.0) -> Budget:
        budget = Budget(event_id, total_budget, threshold_pct)
        self.budgets[budget.id] = budget
        return budget

    def get_budget(self, budget_id: str) -> Optional[Budget]:
        return self.budgets.get(budget_id)

    # --- Expense Tracking & Auto-Threshold Approval Flagging ---
    def add_expense(self, budget_id: str, category: str, description: str, amount: float) -> Dict[str, Any]:
        budget = self.get_budget(budget_id)
        if not budget:
            raise ValueError(f"Budget '{budget_id}' not found.")

        expense = Expense(budget_id, category, description, amount)
        self.expenses[expense.id] = expense

        # Compute cumulative approved & pending expense total
        current_committed = sum(e.amount for e in self.expenses.values() if e.budget_id == budget_id and e.status in ["Approved", "Paid", "Pending"] and e.id != expense.id)
        new_total = current_committed + amount

        # CHECK AUTOMATIC THRESHOLD GOVERNANCE (e.g. cumulative > 80% threshold)
        if new_total > budget.threshold_amount or amount > (budget.total_budget * 0.5):
            expense.status = "Pending"
            reason = (
                f"Expense amount (LKR {amount:,.2f}) pushes total spending to LKR {new_total:,.2f}, "
                f"which breaches the {budget.auto_approval_threshold_pct}% threshold limit (LKR {budget.threshold_amount:,.2f})."
            )
            approval_req = ApprovalRequest(expense.id, budget_id, reason, amount, budget.threshold_amount)
            self.approval_requests[approval_req.id] = approval_req

            return {
                "expense_id": expense.id,
                "amount": amount,
                "status": "PendingForHumanApproval",
                "requires_human_approval": True,
                "approval_request_id": approval_req.id,
                "reason": reason
            }
        else:
            expense.status = "Approved"  # Auto-approved within safe threshold
            return {
                "expense_id": expense.id,
                "amount": amount,
                "status": "Approved",
                "requires_human_approval": False,
                "reason": f"Auto-approved within safe budget threshold limit ({budget.auto_approval_threshold_pct}%)."
            }

    # --- Human Approval Workflow ---
    def review_approval_request(self, request_id: str, approve: bool, reviewer_name: str) -> Dict[str, Any]:
        req = self.approval_requests.get(request_id)
        if not req:
            raise ValueError(f"Approval Request '{request_id}' not found.")

        expense = self.expenses.get(req.expense_id)
        if not expense:
            raise ValueError(f"Expense '{req.expense_id}' not found.")

        req.reviewed_by = reviewer_name
        req.reviewed_at = datetime.utcnow().isoformat()

        if approve:
            req.status = "Approved"
            expense.status = "Approved"
        else:
            req.status = "Rejected"
            expense.status = "Rejected"

        return {
            "approval_request_id": req.id,
            "expense_id": expense.id,
            "decision": req.status,
            "reviewed_by": reviewer_name,
            "reviewed_at": req.reviewed_at
        }

    # --- Payment Processing ---
    def process_payment(self, expense_id: str, payment_method: str, reference_code: str) -> Payment:
        expense = self.expenses.get(expense_id)
        if not expense:
            raise ValueError(f"Expense '{expense_id}' not found.")
        if expense.status not in ["Approved"]:
            raise ValueError(f"Cannot process payment. Expense status is '{expense.status}'. Must be 'Approved'.")

        payment = Payment(expense_id, payment_method, reference_code, expense.amount)
        self.payments[payment.id] = payment
        expense.status = "Paid"
        return payment

    # --- Budget vs Actual Analytics ---
    def get_budget_analytics(self, budget_id: str) -> Dict[str, Any]:
        budget = self.get_budget(budget_id)
        if not budget:
            raise ValueError(f"Budget '{budget_id}' not found.")

        budget_expenses = [e for e in self.expenses.values() if e.budget_id == budget_id]
        total_approved_spent = sum(e.amount for e in budget_expenses if e.status in ["Approved", "Paid"])
        total_pending = sum(e.amount for e in budget_expenses if e.status == "Pending")
        total_rejected = sum(e.amount for e in budget_expenses if e.status == "Rejected")

        remaining = budget.total_budget - total_approved_spent
        utilization_pct = (total_approved_spent / max(1, budget.total_budget)) * 100

        # Category breakdown
        category_spent: Dict[str, float] = {}
        for e in budget_expenses:
            if e.status in ["Approved", "Paid"]:
                category_spent[e.category] = category_spent.get(e.category, 0.0) + e.amount

        return {
            "budget_id": budget.id,
            "event_id": budget.event_id,
            "total_budget": budget.total_budget,
            "threshold_limit_80pct": budget.threshold_amount,
            "total_spent": total_approved_spent,
            "total_pending_approval": total_pending,
            "total_rejected": total_rejected,
            "remaining_budget": remaining,
            "utilization_pct": round(utilization_pct, 2),
            "is_over_threshold": total_approved_spent > budget.threshold_amount,
            "category_spent": category_spent
        }
