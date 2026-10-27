"""
Tests for Event management, lifecycle state transitions, permissions, and invariants.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.events.models import Event, EventMember, EventStatus, MemberRole
from apps.events.services import EventService

User = get_user_model()


@pytest.fixture
def owner():
    return User.objects.create_user(email="owner@test.com", password="Password123!")


@pytest.fixture
def cohost():
    return User.objects.create_user(email="cohost@test.com", password="Password123!")


@pytest.fixture
def stranger():
    return User.objects.create_user(email="stranger@test.com", password="Password123!")


@pytest.fixture
def sample_event(owner):
    now = timezone.now()
    return EventService.create_event(
        owner=owner,
        name="Annual Gala",
        start_date=now + timedelta(days=10),
        end_date=now + timedelta(days=10, hours=4),
        budget=Decimal("5000.00"),
        currency="USD",
    )


@pytest.mark.django_db
class TestEventLifecycleAndServices:
    def test_create_event_creates_owner_membership(self, owner):
        now = timezone.now()
        event = EventService.create_event(
            owner=owner,
            name="Launch Party",
            start_date=now + timedelta(days=5),
            end_date=now + timedelta(days=5, hours=3),
            budget=Decimal("2000.00"),
        )
        assert event.owner == owner
        assert EventMember.objects.filter(event=event, user=owner, role=MemberRole.OWNER).exists()

    def test_invalid_dates_rejected(self, owner):
        now = timezone.now()
        with pytest.raises(ValidationError):
            EventService.create_event(
                owner=owner,
                name="Time Warp",
                start_date=now + timedelta(days=5),
                end_date=now + timedelta(days=4),  # before start!
            )

    def test_negative_budget_rejected(self, owner):
        now = timezone.now()
        with pytest.raises(ValidationError):
            EventService.create_event(
                owner=owner,
                name="Debt Party",
                start_date=now + timedelta(days=1),
                end_date=now + timedelta(days=1, hours=2),
                budget=Decimal("-500.00"),
            )

    def test_valid_lifecycle_transitions(self, sample_event, owner):
        assert sample_event.status == EventStatus.DRAFT
        # draft -> planning
        EventService.transition_status(sample_event, EventStatus.PLANNING, owner)
        assert sample_event.status == EventStatus.PLANNING
        # planning -> confirmed
        EventService.transition_status(sample_event, EventStatus.CONFIRMED, owner)
        assert sample_event.status == EventStatus.CONFIRMED
        # confirmed -> completed
        EventService.transition_status(sample_event, EventStatus.COMPLETED, owner)
        assert sample_event.status == EventStatus.COMPLETED

    def test_invalid_lifecycle_transition_raises_validation_error(self, sample_event, owner):
        assert sample_event.status == EventStatus.DRAFT
        # draft cannot jump straight to completed!
        with pytest.raises(ValidationError):
            EventService.transition_status(sample_event, EventStatus.COMPLETED, owner)

    def test_duplicate_event(self, sample_event, owner):
        clone = EventService.duplicate_event(sample_event, owner, new_name="Annual Gala Clone")
        assert clone.id != sample_event.id
        assert clone.name == "Annual Gala Clone"
        assert clone.status == EventStatus.DRAFT
        assert clone.owner == owner

    def test_delete_event_allowed_for_owner_only(self, sample_event, cohost, stranger):
        EventService.add_member(sample_event, sample_event.owner, cohost)
        with pytest.raises(PermissionDenied):
            EventService.delete_event(sample_event, cohost)
        with pytest.raises(PermissionDenied):
            EventService.delete_event(sample_event, stranger)
        EventService.delete_event(sample_event, sample_event.owner)
        assert not Event.objects.filter(id=sample_event.id).exists()


@pytest.mark.django_db
class TestEventAPIEndpoints:
    def test_event_list_returns_only_user_events(self, owner, stranger):
        now = timezone.now()
        EventService.create_event(
            owner=owner,
            name="Owner Event",
            start_date=now + timedelta(days=1),
            end_date=now + timedelta(days=1, hours=2),
        )
        EventService.create_event(
            owner=stranger,
            name="Stranger Event",
            start_date=now + timedelta(days=2),
            end_date=now + timedelta(days=2, hours=2),
        )

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("events:event-list-create")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        assert len(results) == 1
        assert results[0]["name"] == "Owner Event"

    def test_stranger_cannot_access_event_detail(self, sample_event, stranger):
        client = APIClient()
        client.force_authenticate(user=stranger)
        url = reverse("events:event-detail", kwargs={"pk": sample_event.id})
        response = client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
