"""
Comprehensive cross-user authorization denial tests.
A user must not be able to read, modify, delete, or enumerate another user's:
- Events
- Guests
- Budget categories / expenses
- Tasks / schedule
- Notifications
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.budget.services import BudgetService
from apps.events.services import EventService
from apps.guests.services import GuestService
from apps.notifications.services import NotificationService
from apps.tasks.services import TaskService

User = get_user_model()


@pytest.fixture
def victim():
    return User.objects.create_user(email="victim@test.com", password="Password123!")


@pytest.fixture
def attacker():
    return User.objects.create_user(email="attacker@test.com", password="Password123!")


@pytest.fixture
def victim_event(victim):
    now = timezone.now()
    return EventService.create_event(
        owner=victim,
        name="Private Event",
        start_date=now + timedelta(days=5),
        end_date=now + timedelta(days=5, hours=3),
        budget=Decimal("1000.00"),
    )


@pytest.mark.django_db
class TestCrossUserAuthorizationDenial:
    def test_attacker_cannot_read_victim_event(self, attacker, victim_event):
        client = APIClient()
        client.force_authenticate(user=attacker)
        url = reverse("events:event-detail", kwargs={"pk": victim_event.id})
        response = client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_attacker_cannot_modify_victim_event(self, attacker, victim_event):
        client = APIClient()
        client.force_authenticate(user=attacker)
        url = reverse("events:event-detail", kwargs={"pk": victim_event.id})
        response = client.patch(url, {"name": "Hacked Name"}, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        victim_event.refresh_from_db()
        assert victim_event.name == "Private Event"

    def test_attacker_cannot_delete_victim_event(self, attacker, victim_event):
        client = APIClient()
        client.force_authenticate(user=attacker)
        url = reverse("events:event-detail", kwargs={"pk": victim_event.id})
        response = client.delete(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        victim_event.refresh_from_db()
        assert victim_event.id is not None

    def test_attacker_cannot_read_victim_guests(self, attacker, victim, victim_event):
        GuestService.add_guest(event=victim_event, user=victim, name="Secret Guest")
        client = APIClient()
        client.force_authenticate(user=attacker)
        url = reverse("guests:guest-list-create", kwargs={"event_id": victim_event.id})
        response = client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_attacker_cannot_read_victim_budget(self, attacker, victim, victim_event):
        BudgetService.create_category(
            event=victim_event, user=victim, name="Confidential Budget", estimated_amount=500
        )
        client = APIClient()
        client.force_authenticate(user=attacker)
        url = reverse("budget:budget-summary", kwargs={"event_id": victim_event.id})
        response = client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_attacker_cannot_read_victim_tasks(self, attacker, victim, victim_event):
        TaskService.create_task(event=victim_event, user=victim, title="Private errand")
        client = APIClient()
        client.force_authenticate(user=attacker)
        url = reverse("tasks:task-list-create", kwargs={"event_id": victim_event.id})
        response = client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_attacker_cannot_read_victim_notifications(self, attacker, victim):
        NotificationService.notify_user(
            user=victim, title="Victim secret", message="Secret message"
        )
        client = APIClient()
        client.force_authenticate(user=attacker)
        url = reverse("notifications:notification-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0  # Attacker has 0 notifications
