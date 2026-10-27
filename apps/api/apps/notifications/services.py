"""
Notifications app – in-app notifications and email dispatch.
"""

from __future__ import annotations

import logging
from typing import Any

from django.core.mail import send_mail

from apps.events.models import Event

from .models import Notification, NotificationType

logger = logging.getLogger(__name__)


class NotificationService:
    """Service layer for in-app notifications and outbound notifications."""

    @staticmethod
    def notify_user(
        *,
        user: Any,
        title: str,
        message: str,
        notification_type: str = NotificationType.GENERAL,
        event: Event | None = None,
        send_email: bool = False,
    ) -> Notification:
        """Create an in-app notification record and optionally deliver email."""
        notif = Notification.objects.create(
            user=user,
            event=event,
            title=title.strip(),
            message=message.strip(),
            notification_type=notification_type,
            is_read=False,
        )
        logger.info(
            "Notification %s created for user %s (%s)", notif.id, user.email, notification_type
        )

        if send_email and user.email:
            try:
                send_mail(
                    subject=f"[Celebra] {title}",
                    message=message,
                    from_email=None,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                logger.info("Email sent to %s for notification %s", user.email, notif.id)
            except Exception as e:
                logger.warning("Email delivery failed for user %s: %s", user.email, e)

        return notif

    @staticmethod
    def mark_as_read(notification: Notification, user: Any) -> Notification:
        """Mark a single notification as read."""
        if notification.user != user:
            raise PermissionError("Cannot access notification belonging to another user.")
        notification.is_read = True
        notification.save(update_fields=["is_read", "updated_at"])
        return notification

    @staticmethod
    def mark_all_as_read(user: Any) -> int:
        """Mark all unread notifications as read for the user."""
        updated = Notification.objects.filter(user=user, is_read=False).update(is_read=True)
        logger.info("Marked %d notifications as read for user %s", updated, user.email)
        return updated
