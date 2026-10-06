"""
AI Agent for Student 3 (IT24103127) - Attendee Registration & Check-in Agent
Tied ONLY to Attendee Registration & Check-in business logic.
Produces presentable English output for event organizers and gate stewards.
"""

from typing import Dict, Any, List
try:
    from .business_component import AttendeeRegistrationManager
except ImportError:
    from business_component import AttendeeRegistrationManager


class AttendeeRegistrationAgent:
    """Specialized AI Agent tied exclusively to Attendee Registration & Check-in business logic."""

    def __init__(self, manager: AttendeeRegistrationManager):
        self.manager = manager
        self.agent_name = "Attendee Check-in & Security Specialist Agent (IT24103127)"

    def generate_registration_confirmation(self, registration_id: str) -> str:
        """Produces a presentable English registration confirmation pass with arrival instructions."""
        reg = self.manager.registrations.get(registration_id)
        if not reg:
            return f"Error: Registration '{registration_id}' not found."

        lines = [
            "================================================================================",
            "                 OFFICIAL EVENT ADMISSION PASS & QR TICKET                      ",
            "================================================================================",
            f" Agent Name        : {self.agent_name}",
            f" Registration Reference: {reg.id}",
            f" Attendee Name     : {reg.attendee_name}",
            f" Contact Email     : {reg.attendee_email}",
            f" Contact Phone     : {reg.attendee_phone}",
            f" Event Identifier  : {reg.event_id}",
            f" Unique Ticket QR  : {reg.qr_code}",
            f" Ticket Status     : {reg.status.upper()}",
            "--------------------------------------------------------------------------------",
            " ENTRY INSTRUCTIONS & GATE PROCEDURES:",
            "  1. Present this digital ticket or printed QR code at the event turnstile.",
            "  2. Security stewards will scan the QR code to grant immediate entry.",
            "  3. IMPORTANT: Each QR code is strictly single-use. Duplicate scan attempts will be flagged.",
            "================================================================================"
        ]
        return "\n".join(lines)

    def generate_checkin_audit_report(self, event_id: str) -> str:
        """
        Produces a presentable English audit report summarizing check-in turnout, valid scans, and duplicate security flags.
        """
        regs = [r for r in self.manager.registrations.values() if r.event_id == event_id]
        total_registered = len(regs)
        checked_in = sum(1 for r in regs if r.status == "CheckedIn")
        transferred = sum(1 for r in regs if r.status == "Transferred")

        event_checkins = [c for c in self.manager.check_ins if c.event_id == event_id]
        successful_scans = sum(1 for c in event_checkins if c.status == "Success")
        duplicate_blocks = sum(1 for c in event_checkins if c.status == "DuplicateBlocked")

        turnout_rate = (checked_in / max(1, total_registered)) * 100

        lines = [
            "================================================================================",
            "             ATTENDEE CHECK-IN & GATE SECURITY AUDIT REPORT                     ",
            "================================================================================",
            f" Agent Name        : {self.agent_name}",
            f" Event Reference   : {event_id}",
            "--------------------------------------------------------------------------------",
            " ATTENDANCE METRICS & TURNOUT SUMMARY:",
            f"  • Total Registered Attendees : {total_registered:,}",
            f"  • Successfully Checked-In    : {checked_in:,}",
            f"  • Tickets Transferred        : {transferred:,}",
            f"  • Real-Time Turnout Rate     : {turnout_rate:.1f}%",
            "--------------------------------------------------------------------------------",
            " GATE SCAN SECURITY LOG:",
            f"  ✔ Valid Scans Approved       : {successful_scans:,}",
            f"  ⚠️ Duplicate Scans Blocked   : {duplicate_blocks:,}",
            "--------------------------------------------------------------------------------",
            " SECURITY EVALUATION & AGENT REMARKS:"
        ]

        if duplicate_blocks > 0:
            lines.append(f"  ⚠️ SECURITY NOTICE: {duplicate_blocks} duplicate QR scan attempt(s) were caught and blocked at turnstiles.")
            lines.append("  ACTION ITEM: Security stewards acted correctly in enforcing anti-passback duplicate protection.")
        else:
            lines.append("  ✔ ZERO SECURITY BREACHES: All scanned QR tickets were authentic and valid.")

        lines.append("================================================================================")
        return "\n".join(lines)
