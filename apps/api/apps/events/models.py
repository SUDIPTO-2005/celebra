"""
Events app – Event and EventMember models.
"""

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimestampedModel


class EventStatus(models.TextChoices):
    DRAFT = "draft", _("Draft")
    PLANNING = "planning", _("Planning")
    CONFIRMED = "confirmed", _("Confirmed")
    COMPLETED = "completed", _("Completed")
    CANCELLED = "cancelled", _("Cancelled")


class MemberRole(models.TextChoices):
    OWNER = "owner", _("Owner")
    COHOST = "cohost", _("Co-Host")


class Event(TimestampedModel):
    """Event model representing a planned celebration or event."""

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_type = models.CharField(max_length=50, default="celebration")
    venue = models.CharField(max_length=255, blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    timezone = models.CharField(max_length=50, default="UTC")
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(
        max_length=20,
        choices=EventStatus.choices,
        default=EventStatus.DRAFT,
        db_index=True,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_events",
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="EventMember",
        related_name="collaborating_events",
        blank=True,
    )

    class Meta:
        ordering = ["-start_date", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(budget__gte=0),
                name="event_budget_non_negative",
            ),
        ]

    def __str__(self) -> str:
        return self.name

    def clean(self):
        super().clean()
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "End date cannot be earlier than start date."})
        if self.budget is not None and self.budget < Decimal("0.00"):
            raise ValidationError({"budget": "Budget cannot be negative."})


class EventMember(TimestampedModel):
    """Membership of a user in an event (co-hosts and owner)."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_memberships",
    )
    role = models.CharField(
        max_length=20,
        choices=MemberRole.choices,
        default=MemberRole.COHOST,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["event", "user"],
                name="unique_event_membership",
            )
        ]
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.role} in {self.event.name}"
