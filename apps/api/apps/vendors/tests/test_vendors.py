"""
Tests for Vendors, Quotes, Booking lifecycle, and concurrency-safe overlap prevention.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.events.services import EventService
from apps.vendors.models import BookingStatus, QuoteStatus, Vendor, VendorCategory
from apps.vendors.services import VendorService

User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(email="host@test.com", password="Password123!")


@pytest.fixture
def other_user():
    return User.objects.create_user(email="otherhost@test.com", password="Password123!")


@pytest.fixture
def event_1(user):
    now = timezone.now()
    return EventService.create_event(
        owner=user,
        name="Event 1",
        start_date=now + timedelta(days=5),
        end_date=now + timedelta(days=5, hours=5),
    )


@pytest.fixture
def event_2(other_user):
    now = timezone.now()
    return EventService.create_event(
        owner=other_user,
        name="Event 2",
        start_date=now + timedelta(days=5),
        end_date=now + timedelta(days=5, hours=5),
    )


@pytest.fixture
def sample_vendor():
    return Vendor.objects.create(
        name="Grand Ballroom [Sample]",
        category=VendorCategory.VENUE,
        contact_email="ballroom@sample.test",
        is_sample_data=True,
    )


@pytest.mark.django_db
class TestVendorsAndBookings:
    def test_vendor_search_and_filter(self, sample_vendor):
        results = VendorService.list_vendors(category=VendorCategory.VENUE, search="Grand")
        assert sample_vendor in results

        empty = VendorService.list_vendors(category=VendorCategory.FLORIST)
        assert sample_vendor not in empty

    def test_quote_request_workflow(self, event_1, sample_vendor, user):
        quote = VendorService.create_quote_request(
            event=event_1, vendor=sample_vendor, user=user, details="Full day venue rental"
        )
        assert quote.status == QuoteStatus.REQUESTED

        updated = VendorService.update_quote_status(
            quote=quote, user=user, status=QuoteStatus.QUOTED, quoted_amount=Decimal("2500.00")
        )
        assert updated.status == QuoteStatus.QUOTED
        assert updated.quoted_amount == Decimal("2500.00")

    def test_overlapping_confirmed_bookings_rejected(
        self, event_1, event_2, sample_vendor, user, other_user
    ):
        base_time = timezone.now() + timedelta(days=10)
        start1 = base_time.replace(hour=14, minute=0)
        end1 = base_time.replace(hour=20, minute=0)

        # Host 1 books vendor: 14:00 to 20:00 (CONFIRMED)
        b1 = VendorService.create_booking(
            event=event_1,
            vendor=sample_vendor,
            user=user,
            start_time=start1,
            end_time=end1,
            status=BookingStatus.CONFIRMED,
            amount=Decimal("1500.00"),
        )
        assert b1.status == BookingStatus.CONFIRMED

        # Host 2 attempts overlapping booking: 18:00 to 23:00 (CONFIRMED) -> MUST FAIL
        start2 = base_time.replace(hour=18, minute=0)
        end2 = base_time.replace(hour=23, minute=0)

        with pytest.raises(ValidationError, match="already booked"):
            VendorService.create_booking(
                event=event_2,
                vendor=sample_vendor,
                user=other_user,
                start_time=start2,
                end_time=end2,
                status=BookingStatus.CONFIRMED,
                amount=Decimal("1200.00"),
            )

    def test_cancellation_releases_vendor_slot(
        self, event_1, event_2, sample_vendor, user, other_user
    ):
        base_time = timezone.now() + timedelta(days=12)
        start = base_time.replace(hour=10, minute=0)
        end = base_time.replace(hour=16, minute=0)

        # Booking 1 confirmed
        b1 = VendorService.create_booking(
            event=event_1,
            vendor=sample_vendor,
            user=user,
            start_time=start,
            end_time=end,
            status=BookingStatus.CONFIRMED,
        )

        # Booking 1 cancelled
        VendorService.cancel_booking(b1, user)
        b1.refresh_from_db()
        assert b1.status == BookingStatus.CANCELLED

        # Now Host 2 can confirm booking for the released slot!
        b2 = VendorService.create_booking(
            event=event_2,
            vendor=sample_vendor,
            user=other_user,
            start_time=start,
            end_time=end,
            status=BookingStatus.CONFIRMED,
        )
        assert b2.status == BookingStatus.CONFIRMED
