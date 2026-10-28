"""
Guests app – business logic for guest management, RSVP, tokens, and CSV import.
"""

from __future__ import annotations

import csv
import hashlib
import io
import logging
import secrets
from datetime import timedelta
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.events.models import Event
from apps.events.services import EventService

from .models import RSVP, Guest, InviteToken, RSVPResponse

logger = logging.getLogger(__name__)

MAX_CSV_ROWS = 10_000
MAX_CSV_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def hash_token(raw_token: str) -> str:
    """Return SHA-256 hex digest of raw token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


class GuestService:
    """Service layer for Guest and RSVP workflows."""

    @staticmethod
    def add_guest(
        *,
        event: Event,
        user: Any,
        name: str,
        email: str = "",
        plus_ones: int = 0,
        dietary_requirements: str = "",
        accessibility_requirements: str = "",
    ) -> Guest:
        """Add a single guest to an event."""
        EventService.check_member_permission(event, user)
        guest = Guest.objects.create(
            event=event,
            name=name.strip(),
            email=email.strip().lower(),
            plus_ones=max(0, int(plus_ones)),
            dietary_requirements=dietary_requirements.strip(),
            accessibility_requirements=accessibility_requirements.strip(),
        )
        logger.info("Added guest %s to event %s", guest.id, event.id)
        return guest

    @staticmethod
    def update_guest(guest: Guest, user: Any, **fields: Any) -> Guest:
        """Update a guest record."""
        EventService.check_member_permission(guest.event, user)
        for attr, val in fields.items():
            if attr == "email" and val:
                val = val.strip().lower()
            elif attr == "plus_ones" and val is not None:
                val = max(0, int(val))
            setattr(guest, attr, val)
        guest.full_clean()
        guest.save()
        logger.info("Updated guest %s", guest.id)
        return guest

    @staticmethod
    def delete_guest(guest: Guest, user: Any) -> None:
        """Remove a guest."""
        EventService.check_member_permission(guest.event, user)
        guest_id = guest.id
        guest.delete()
        logger.info("Deleted guest %s", guest_id)

    @staticmethod
    def generate_invite_token(
        guest: Guest, user: Any, days_valid: int = 7
    ) -> tuple[InviteToken, str]:
        """
        Generate a cryptographically secure token.
        Returns (InviteToken model instance, raw_token_string).
        Only the raw token is returned to be shared; only the hash is persisted.
        """
        EventService.check_member_permission(guest.event, user)
        raw_token = secrets.token_urlsafe(32)
        thash = hash_token(raw_token)
        expires_at = timezone.now() + timedelta(days=days_valid)

        invite_token, _ = InviteToken.objects.update_or_create(
            guest=guest,
            defaults={
                "token_hash": thash,
                "expires_at": expires_at,
                "revoked": False,
            },
        )
        logger.info("Generated invite token for guest %s", guest.id)
        return invite_token, raw_token

    @staticmethod
    def revoke_invite_token(guest: Guest, user: Any) -> None:
        """Revoke a guest's invite token."""
        EventService.check_member_permission(guest.event, user)
        if hasattr(guest, "invite_token"):
            guest.invite_token.revoked = True
            guest.invite_token.save(update_fields=["revoked", "updated_at"])
            logger.info("Revoked invite token for guest %s", guest.id)

    @staticmethod
    def get_guest_by_raw_token(raw_token: str) -> Guest:
        """Validate an invite token and return the associated guest."""
        if not raw_token or not raw_token.strip():
            raise ValidationError("Invitation token is required.")

        thash = hash_token(raw_token.strip())
        try:
            invite_token = InviteToken.objects.select_related("guest__event").get(token_hash=thash)
        except InviteToken.DoesNotExist:
            raise ValidationError("Invalid or unrecognised invitation link.")

        if invite_token.revoked:
            raise ValidationError("This invitation link has been revoked.")

        if timezone.now() > invite_token.expires_at:
            raise ValidationError("This invitation link has expired.")

        return invite_token.guest

    @staticmethod
    @transaction.atomic
    def record_rsvp(
        *,
        raw_token: str,
        response: str,
        plus_ones: int | None = None,
        notes: str = "",
        dietary_requirements: str | None = None,
        accessibility_requirements: str | None = None,
    ) -> RSVP:
        """Process public RSVP via invite token."""
        guest = GuestService.get_guest_by_raw_token(raw_token)

        if response not in RSVPResponse.values:
            raise ValidationError(f"Invalid RSVP response. Must be one of: {RSVPResponse.values}")

        if plus_ones is not None:
            guest.plus_ones = max(0, int(plus_ones))
        if dietary_requirements is not None:
            guest.dietary_requirements = dietary_requirements.strip()
        if accessibility_requirements is not None:
            guest.accessibility_requirements = accessibility_requirements.strip()
        guest.save()

        rsvp, _ = RSVP.objects.update_or_create(
            guest=guest,
            defaults={
                "response": response,
                "notes": notes.strip(),
            },
        )
        logger.info("Recorded RSVP for guest %s: %s", guest.id, response)
        return rsvp

    @staticmethod
    @transaction.atomic
    def import_guests_csv(event: Event, user: Any, csv_file_or_content: Any) -> dict[str, Any]:
        """
        Import guests from a CSV with strict row-level validation.
        Enforces 5MB size limit and 10,000 row limit.
        Expected headers: name (required), email, plus_ones, dietary_requirements, accessibility_requirements.
        """
        EventService.check_member_permission(event, user)

        if hasattr(csv_file_or_content, "read"):
            content = csv_file_or_content.read()
            if len(content) > MAX_CSV_FILE_SIZE:
                raise ValidationError("CSV file exceeds maximum allowed size of 5 MB.")
            text = content.decode("utf-8-sig", errors="replace")
        else:
            text = str(csv_file_or_content)
            if len(text.encode("utf-8")) > MAX_CSV_FILE_SIZE:
                raise ValidationError("CSV data exceeds maximum allowed size of 5 MB.")

        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            raise ValidationError("CSV file is empty or has no header row.")

        # Normalize field names
        field_map = {fn.strip().lower(): fn for fn in reader.fieldnames}
        if "name" not in field_map:
            raise ValidationError("CSV header must contain a 'name' column.")

        created_guests: list[Guest] = []
        errors: list[dict[str, Any]] = []

        for row_idx, row in enumerate(reader, start=2):  # start=2 considering header is row 1
            if row_idx > MAX_CSV_ROWS + 1:
                errors.append(
                    {
                        "row": row_idx,
                        "error": f"Maximum row limit of {MAX_CSV_ROWS} exceeded. Remaining rows skipped.",
                    }
                )
                break

            name = (row.get(field_map.get("name", "name")) or "").strip()
            if not name:
                errors.append({"row": row_idx, "error": "Missing required field: 'name'"})
                continue

            email = (row.get(field_map.get("email", "email")) or "").strip().lower()
            raw_plus_ones = (row.get(field_map.get("plus_ones", "plus_ones")) or "0").strip()
            dietary = (
                row.get(field_map.get("dietary_requirements", "dietary_requirements")) or ""
            ).strip()
            accessibility = (
                row.get(field_map.get("accessibility_requirements", "accessibility_requirements"))
                or ""
            ).strip()

            try:
                plus_ones = max(0, int(raw_plus_ones))
            except ValueError:
                errors.append(
                    {"row": row_idx, "error": f"Invalid integer for plus_ones: '{raw_plus_ones}'"}
                )
                continue

            guest = Guest(
                event=event,
                name=name,
                email=email,
                plus_ones=plus_ones,
                dietary_requirements=dietary,
                accessibility_requirements=accessibility,
            )
            created_guests.append(guest)

        if created_guests:
            Guest.objects.bulk_create(created_guests)

        logger.info(
            "Imported %d guests to event %s with %d errors",
            len(created_guests),
            event.id,
            len(errors),
        )
        return {
            "imported_count": len(created_guests),
            "errors": errors,
        }

    @staticmethod
    def get_rsvp_summary(event: Event, user: Any) -> dict[str, Any]:
        """Return RSVP aggregate breakdown for an event using database aggregation."""
        EventService.check_member_permission(event, user)
        aggregates = event.guests.aggregate(
            total=Count("id"),
            pending=Count("id", filter=Q(rsvp__isnull=True)),
            attending=Count("id", filter=Q(rsvp__response=RSVPResponse.YES)),
            declined=Count("id", filter=Q(rsvp__response=RSVPResponse.NO)),
            maybe=Count("id", filter=Q(rsvp__response=RSVPResponse.MAYBE)),
            attending_plus_ones=Sum("plus_ones", filter=Q(rsvp__response=RSVPResponse.YES)),
        )
        attending = aggregates["attending"] or 0
        attending_plus_ones = aggregates["attending_plus_ones"] or 0

        return {
            "total_guests": aggregates["total"] or 0,
            "attending": attending,
            "declined": aggregates["declined"] or 0,
            "maybe": aggregates["maybe"] or 0,
            "pending": aggregates["pending"] or 0,
            "attending_plus_ones": attending_plus_ones,
            "total_headcount": attending + attending_plus_ones,
        }
