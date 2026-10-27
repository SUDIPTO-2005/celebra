"""
Vendors app – business logic for vendor directory, quotes, and concurrency-safe bookings.
"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q

from apps.events.models import Event
from apps.events.services import EventService

from .models import Booking, BookingStatus, QuoteRequest, QuoteStatus, Vendor

logger = logging.getLogger(__name__)


class VendorService:
    """Service layer for Vendors, Quotes, and Bookings."""

    # ── Vendors ─────────────────────────────────

    @staticmethod
    def list_vendors(
        category: str | None = None,
        search: str | None = None,
    ) -> Any:
        """Query vendors with optional category and search filters."""
        qs = Vendor.objects.all()
        if category:
            qs = qs.filter(category=category)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        return qs

    # ── Quote Requests ──────────────────────────

    @staticmethod
    def create_quote_request(
        *,
        event: Event,
        vendor: Vendor,
        user: Any,
        details: str,
    ) -> QuoteRequest:
        """Create a quote request for a vendor."""
        EventService.check_member_permission(event, user)
        if not details.strip():
            raise ValidationError("Quote request details are required.")

        quote = QuoteRequest.objects.create(
            event=event,
            vendor=vendor,
            details=details.strip(),
            status=QuoteStatus.REQUESTED,
        )
        logger.info(
            "Created quote request %s for vendor %s by event %s", quote.id, vendor.id, event.id
        )
        return quote

    @staticmethod
    def update_quote_status(
        quote: QuoteRequest,
        user: Any,
        status: str,
        quoted_amount: Decimal | None = None,
    ) -> QuoteRequest:
        """Update quote request status and optional quoted amount."""
        EventService.check_member_permission(quote.event, user)
        if status not in QuoteStatus.values:
            raise ValidationError(f"Invalid quote status '{status}'.")

        quote.status = status
        if quoted_amount is not None:
            if quoted_amount < Decimal("0.00"):
                raise ValidationError("Quoted amount cannot be negative.")
            quote.quoted_amount = quoted_amount

        quote.save()
        logger.info("Updated quote %s status to %s", quote.id, status)
        return quote

    # ── Bookings & Concurrency Overlap Prevention ──

    @staticmethod
    @transaction.atomic
    def create_booking(
        *,
        event: Event,
        vendor: Vendor,
        user: Any,
        start_time: Any,
        end_time: Any,
        amount: Decimal = Decimal("0.00"),
        status: str = BookingStatus.DRAFT,
    ) -> Booking:
        """
        Create a booking.
        If status is CONFIRMED, atomically locks vendor and verifies no overlapping confirmed bookings exist.
        """
        EventService.check_member_permission(event, user)
        if end_time < start_time:
            raise ValidationError("End time cannot be earlier than start time.")
        if amount < Decimal("0.00"):
            raise ValidationError("Booking amount cannot be negative.")
        if status not in BookingStatus.values:
            raise ValidationError(f"Invalid booking status '{status}'.")

        # Concurrency-safe overlap check with row lock on vendor
        if status == BookingStatus.CONFIRMED:
            VendorService._verify_vendor_availability(vendor, start_time, end_time)

        booking = Booking.objects.create(
            event=event,
            vendor=vendor,
            start_time=start_time,
            end_time=end_time,
            amount=amount,
            status=status,
        )
        logger.info("Created booking %s (status: %s) for vendor %s", booking.id, status, vendor.id)
        return booking

    @staticmethod
    @transaction.atomic
    def update_booking(booking: Booking, user: Any, **fields: Any) -> Booking:
        """
        Update booking details or transition status.
        If confirming or modifying times of a confirmed booking, verifies availability atomically.
        """
        EventService.check_member_permission(booking.event, user)

        new_status = fields.get("status", booking.status)
        new_start = fields.get("start_time", booking.start_time)
        new_end = fields.get("end_time", booking.end_time)

        if new_end < new_start:
            raise ValidationError("End time cannot be earlier than start time.")

        if "amount" in fields and fields["amount"] < Decimal("0.00"):
            raise ValidationError("Booking amount cannot be negative.")

        # Check overlap if status is confirmed or transitioning to confirmed
        if new_status == BookingStatus.CONFIRMED:
            VendorService._verify_vendor_availability(
                booking.vendor, new_start, new_end, exclude_booking_id=booking.id
            )

        for attr, val in fields.items():
            setattr(booking, attr, val)

        booking.full_clean()
        booking.save()
        logger.info("Updated booking %s (status: %s)", booking.id, booking.status)
        return booking

    @staticmethod
    @transaction.atomic
    def cancel_booking(booking: Booking, user: Any) -> Booking:
        """Cancel a booking, releasing the vendor slot atomically."""
        return VendorService.update_booking(booking, user, status=BookingStatus.CANCELLED)

    @staticmethod
    def _verify_vendor_availability(
        vendor: Vendor,
        start_time: Any,
        end_time: Any,
        exclude_booking_id: Any = None,
    ) -> None:
        """
        Atomically lock the vendor and check for any overlapping confirmed bookings.
        Uses select_for_update to serialize concurrent booking attempts.
        """
        # Lock vendor row in current transaction
        Vendor.objects.select_for_update().get(id=vendor.id)

        qs = Booking.objects.filter(
            vendor=vendor,
            status=BookingStatus.CONFIRMED,
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if exclude_booking_id:
            qs = qs.exclude(id=exclude_booking_id)

        overlapping = qs.first()
        if overlapping:
            raise ValidationError(
                f"Vendor '{vendor.name}' is already booked for this time window "
                f"({overlapping.start_time} - {overlapping.end_time})."
            )
