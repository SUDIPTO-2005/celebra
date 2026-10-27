"""
Tests for Notifications and email dispatch.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core import mail

from apps.notifications.models import Notification, NotificationType
from apps.notifications.services import NotificationService

User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(email="notif_user@test.com", password="Password123!")


@pytest.mark.django_db
class TestNotifications:
    def test_create_in_app_notification(self, user):
        notif = NotificationService.notify_user(
            user=user,
            title="RSVP Confirmed",
            message="Marcus responded: Attending",
            notification_type=NotificationType.RSVP_UPDATE,
        )
        assert notif.is_read is False
        assert Notification.objects.filter(user=user, is_read=False).count() == 1

    def test_mark_as_read(self, user):
        notif = NotificationService.notify_user(
            user=user,
            title="Task Reminder",
            message="Decor purchase is due tomorrow",
        )
        NotificationService.mark_as_read(notif, user)
        notif.refresh_from_db()
        assert notif.is_read is True

    def test_mark_all_as_read(self, user):
        NotificationService.notify_user(user=user, title="N1", message="M1")
        NotificationService.notify_user(user=user, title="N2", message="M2")
        assert Notification.objects.filter(user=user, is_read=False).count() == 2

        count = NotificationService.mark_all_as_read(user)
        assert count == 2
        assert Notification.objects.filter(user=user, is_read=False).count() == 0

    def test_email_delivery_via_console_backend(self, user):
        NotificationService.notify_user(
            user=user,
            title="Important Update",
            message="Your booking was confirmed",
            send_email=True,
        )
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [user.email]
        assert "[Celebra] Important Update" in mail.outbox[0].subject
