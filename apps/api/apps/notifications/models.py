"""
Notifications app – In-app notification model.
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimestampedModel
from apps.events.models import Event


class NotificationType(models.TextChoices):
    TASK_DUE = "task_due", _("Task Due")
    RSVP_UPDATE = "rsvp_update", _("RSVP Update")
    EVENT_UPDATE = "event_update", _("Event Update")
    GENERAL = "general", _("General Notification")


class Notification(TimestampedModel):
    """In-app notification for a user."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.GENERAL,
        db_index=True,
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read"], name="idx_notif_user_read"),
            models.Index(fields=["user", "-created_at"], name="idx_notif_user_created"),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.title} [Read: {self.is_read}]"
