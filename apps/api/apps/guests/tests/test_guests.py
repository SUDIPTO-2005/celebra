"""
Tests for Guests, RSVPs, cryptographically hashed invite tokens, and CSV imports.
"""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.events.services import EventService
from apps.guests.models import RSVPResponse
from apps.guests.services import GuestService

User = get_user_model()


@pytest.fixture
def host():
    return User.objects.create_user(email="host@test.com", password="Password123!")


@pytest.fixture
def event(host):
    now = timezone.now()
    return EventService.create_event(
        owner=host,
        name="Birthday Bash",
        start_date=now + timedelta(days=15),
        end_date=now + timedelta(days=15, hours=4),
    )


@pytest.fixture
def guest(event, host):
    return GuestService.add_guest(
        event=event,
        user=host,
        name="Sam Taylor",
        email="sam@test.com",
        plus_ones=1,
    )


@pytest.mark.django_db
class TestGuestAndRSVPWorkflows:
    def test_invite_token_generation_and_hashing(self, guest, host):
        invite_token, raw_token = GuestService.generate_invite_token(guest, host)
        # Token in DB must be hashed, NOT equal to raw token
        assert invite_token.token_hash != raw_token
        assert len(invite_token.token_hash) == 64  # SHA-256 length

        # Fetching by raw token returns the right guest
        retrieved = GuestService.get_guest_by_raw_token(raw_token)
        assert retrieved.id == guest.id

    def test_revoked_token_is_rejected(self, guest, host):
        _, raw_token = GuestService.generate_invite_token(guest, host)
        GuestService.revoke_invite_token(guest, host)

        with pytest.raises(ValidationError, match="revoked"):
            GuestService.get_guest_by_raw_token(raw_token)

    def test_expired_token_is_rejected(self, guest, host):
        invite_token, raw_token = GuestService.generate_invite_token(guest, host, days_valid=-1)
        # Manually backdate expiry
        invite_token.expires_at = timezone.now() - timedelta(days=2)
        invite_token.save()

        with pytest.raises(ValidationError, match="expired"):
            GuestService.get_guest_by_raw_token(raw_token)

    def test_record_public_rsvp(self, guest, host):
        _, raw_token = GuestService.generate_invite_token(guest, host)

        client = APIClient()
        url = reverse("guests:public-rsvp")
        response = client.post(
            url,
            {
                "token": raw_token,
                "response": "yes",
                "plus_ones": 2,
                "notes": "Excited to celebrate!",
                "dietary_requirements": "Vegetarian",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["response"] == "yes"

        guest.refresh_from_db()
        assert guest.plus_ones == 2
        assert guest.dietary_requirements == "Vegetarian"
        assert guest.rsvp.response == RSVPResponse.YES

    def test_rsvp_summary_metrics(self, event, host):
        g1 = GuestService.add_guest(event=event, user=host, name="A", plus_ones=1)
        g2 = GuestService.add_guest(event=event, user=host, name="B", plus_ones=0)
        GuestService.add_guest(event=event, user=host, name="C", plus_ones=0)

        _, t1 = GuestService.generate_invite_token(g1, host)
        GuestService.record_rsvp(raw_token=t1, response="yes", plus_ones=1)

        _, t2 = GuestService.generate_invite_token(g2, host)
        GuestService.record_rsvp(raw_token=t2, response="no")

        # g3 is pending
        summary = GuestService.get_rsvp_summary(event, host)
        assert summary["total_guests"] == 3
        assert summary["attending"] == 1
        assert summary["declined"] == 1
        assert summary["pending"] == 1
        assert summary["attending_plus_ones"] == 1
        assert summary["total_headcount"] == 2

    def test_csv_import_success_and_row_level_errors(self, event, host):
        csv_data = (
            "name,email,plus_ones,dietary_requirements,accessibility_requirements\n"
            "Alice Green,alice@test.com,1,Vegan,\n"
            "Bob White,bob@test.com,invalid_num,,\n"  # row 3: bad plus_ones
            ",missing_name@test.com,0,,\n"  # row 4: missing name
            "Charlie Black,charlie@test.com,0,,\n"
        )
        result = GuestService.import_guests_csv(event, host, csv_data)
        assert result["imported_count"] == 2  # Alice and Charlie
        assert len(result["errors"]) == 2
        assert any(e["row"] == 3 for e in result["errors"])
        assert any(e["row"] == 4 for e in result["errors"])
