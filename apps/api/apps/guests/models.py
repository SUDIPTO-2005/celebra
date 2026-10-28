"""
Guests app – Guest, RSVP, and InviteToken models.
"""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimestampedModel
from apps.events.models import Event


class RSVPResponse(models.TextChoices):
    YES = "yes", _("Attending")
    NO = "no", _("Declined")
    MAYBE = "maybe", _("Maybe")


class Guest(TimestampedModel):
    """Guest invited to an event."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="guests")
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    plus_ones = models.PositiveSmallIntegerField(default=0)
    dietary_requirements = models.CharField(max_length=255, blank=True)
    accessibility_requirements = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["event", "name"], name="idx_guest_event_name"),
            models.Index(fields=["event", "-created_at"], name="idx_guest_event_created"),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.event.name})"


class RSVP(TimestampedModel):
    """RSVP record submitted by a guest."""

    guest = models.OneToOneField(Guest, on_delete=models.CASCADE, related_name="rsvp")
    response = models.CharField(
        max_length=10,
        choices=RSVPResponse.choices,
        default=RSVPResponse.MAYBE,
        db_index=True,
    )
    notes = models.TextField(blank=True)
    responded_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"RSVP: {self.guest.name} -> {self.response}"


class InviteToken(TimestampedModel):
    """
    Secure invitation token for a guest.
    Only the SHA-256 hash of the random token is stored.
    """

    guest = models.OneToOneField(Guest, on_delete=models.CASCADE, related_name="invite_token")
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    revoked = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"InviteToken for {self.guest.name} (Revoked: {self.revoked})"
