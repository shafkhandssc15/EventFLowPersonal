"""
Business Component for Student 3 (IT24103127) - Attendee Registration & Check-in
Entities: Registration, CheckIn, Notification
Key Features:
- Registration with unique QR ticket code generation
- Ticket transfer workflow (transferring ticket to a new attendee with verification)
- QR Check-in processing with duplicate prevention (blocking duplicate scans)
- Confirmation Email & SMS notification log
- Attendee export (CSV formatted export of attendees, check-in timestamps, status)
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional


class Registration:
    def __init__(self, event_id: str, attendee_name: str, attendee_email: str, attendee_phone: str, ticket_type_id: Optional[str] = None, reg_id: Optional[str] = None):
        self.id = reg_id or f"reg-{uuid.uuid4().hex[:8]}"
        self.event_id = event_id
        self.attendee_name = attendee_name
        self.attendee_email = attendee_email
        self.attendee_phone = attendee_phone
        self.ticket_type_id = ticket_type_id or "tt-general"
        self.qr_code = f"QR-{uuid.uuid4().hex[:8].upper()}"
        self.status = "Registered"  # Registered, Confirmed, CheckedIn, Transferred, Cancelled
        self.created_at = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "attendee_name": self.attendee_name,
            "attendee_email": self.attendee_email,
            "attendee_phone": self.attendee_phone,
            "ticket_type_id": self.ticket_type_id,
            "qr_code": self.qr_code,
            "status": self.status,
            "created_at": self.created_at
        }


class CheckIn:
    def __init__(self, registration_id: str, event_id: str, scanned_by: str, status: str = "Success", checkin_id: Optional[str] = None):
        self.id = checkin_id or f"chk-{uuid.uuid4().hex[:8]}"
        self.registration_id = registration_id
        self.event_id = event_id
        self.scanned_by = scanned_by
        self.status = status  # Success, DuplicateBlocked
        self.scanned_at = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "registration_id": self.registration_id,
            "event_id": self.event_id,
            "scanned_by": self.scanned_by,
            "status": self.status,
            "scanned_at": self.scanned_at
        }


class Notification:
    def __init__(self, recipient: str, channel: str, subject: str, body: str, notif_id: Optional[str] = None):
        self.id = notif_id or f"notif-{uuid.uuid4().hex[:8]}"
        self.recipient = recipient
        self.channel = channel  # Email or SMS
        self.subject = subject
        self.body = body
        self.sent_at = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "recipient": self.recipient,
            "channel": self.channel,
            "subject": self.subject,
            "body": self.body,
            "sent_at": self.sent_at
        }


class AttendeeRegistrationManager:
    """Core Business Logic Component for Attendee Registration & Check-in (IT24103127)."""

    def __init__(self):
        self.registrations: Dict[str, Registration] = {}
        self.check_ins: List[CheckIn] = []
        self.notifications: List[Notification] = []

    # --- Registration & Confirmation ---
    def register_attendee(self, event_id: str, name: str, email: str, phone: str, ticket_type_id: str = "tt-general") -> Registration:
        reg = Registration(event_id, name, email, phone, ticket_type_id)
        self.registrations[reg.id] = reg

        # Dispatch Email & SMS Confirmation Notifications
        email_notif = Notification(
            recipient=email,
            channel="Email",
            subject=f"Registration Confirmed! Your QR Code Ticket: {reg.qr_code}",
            body=f"Hello {name}, your registration for event {event_id} is confirmed! QR Code: {reg.qr_code}."
        )
        sms_notif = Notification(
            recipient=phone,
            channel="SMS",
            subject="Ticket Confirmation",
            body=f"Ticket Confirmed! Event: {event_id}, QR Code: {reg.qr_code}."
        )
        self.notifications.extend([email_notif, sms_notif])
        return reg

    # --- Ticket Transfer ---
    def transfer_ticket(self, registration_id: str, new_name: str, new_email: str, new_phone: str) -> Registration:
        reg = self.registrations.get(registration_id)
        if not reg:
            raise ValueError(f"Registration '{registration_id}' not found.")
        if reg.status == "CheckedIn":
            raise ValueError("Cannot transfer ticket. Attendee has ALREADY checked in to the venue!")
        if reg.status == "Cancelled":
            raise ValueError("Cannot transfer a cancelled registration ticket.")

        old_name = reg.attendee_name
        reg.attendee_name = new_name
        reg.attendee_email = new_email
        reg.attendee_phone = new_phone
        reg.status = "Transferred"

        # Log notification for ticket transfer
        transfer_notif = Notification(
            recipient=new_email,
            channel="Email",
            subject=f"Ticket Transferred to You! QR Code: {reg.qr_code}",
            body=f"Hello {new_name}, ticket from {old_name} has been transferred to you. Present QR: {reg.qr_code} at entry."
        )
        self.notifications.append(transfer_notif)
        return reg

    # --- QR Check-in Processing & Duplicate Prevention ---
    def process_qr_checkin(self, qr_code: str, scanned_by: str = "Gate Steward 1") -> Dict[str, Any]:
        target_reg = None
        for r in self.registrations.values():
            if r.qr_code == qr_code:
                target_reg = r
                break

        if not target_reg:
            raise ValueError(f"INVALID QR CODE: Ticket QR '{qr_code}' does not match any valid registration.")

        # ENFORCE DUPLICATE CHECK-IN PREVENTION
        if target_reg.status == "CheckedIn":
            # Record duplicate scan attempt in check_ins security log
            dup_checkin = CheckIn(target_reg.id, target_reg.event_id, scanned_by, status="DuplicateBlocked")
            self.check_ins.append(dup_checkin)
            raise ValueError(f"SECURITY ALERT: Duplicate check-in detected! Ticket QR '{qr_code}' for {target_reg.attendee_name} was ALREADY scanned.")

        # Successful check-in
        target_reg.status = "CheckedIn"
        checkin_record = CheckIn(target_reg.id, target_reg.event_id, scanned_by, status="Success")
        self.check_ins.append(checkin_record)

        return {
            "registration_id": target_reg.id,
            "event_id": target_reg.event_id,
            "attendee_name": target_reg.attendee_name,
            "qr_code": target_reg.qr_code,
            "checkin_status": "SUCCESS",
            "scanned_by": scanned_by,
            "timestamp": checkin_record.scanned_at
        }

    # --- Attendee Export ---
    def export_attendee_roster(self, event_id: str) -> str:
        """Generates formatted CSV report of registered and checked-in attendees."""
        event_regs = [r for r in self.registrations.values() if r.event_id == event_id]
        csv_lines = ["Registration ID,Attendee Name,Email,Phone,QR Code,Status,Registered At"]
        for r in event_regs:
            csv_lines.append(f"{r.id},{r.attendee_name},{r.attendee_email},{r.attendee_phone},{r.qr_code},{r.status},{r.created_at}")
        return "\n".join(csv_lines)
