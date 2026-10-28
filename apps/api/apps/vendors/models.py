"""
Vendors app – Vendor, QuoteRequest, and Booking models.
"""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimestampedModel
from apps.events.models import Event


class VendorCategory(models.TextChoices):
    VENUE = "venue", _("Venue")
    CATERING = "catering", _("Catering")
    PHOTOGRAPHY = "photography", _("Photography")
    MUSIC = "music", _("Music / DJ")
    DECOR = "decor", _("Decor & Styling")
    FLORIST = "florist", _("Florist")
    OTHER = "other", _("Other Services")


class QuoteStatus(models.TextChoices):
    REQUESTED = "requested", _("Requested")
    QUOTED = "quoted", _("Quoted")
    CONFIRMED = "confirmed", _("Confirmed")
    CANCELLED = "cancelled", _("Cancelled")


class BookingStatus(models.TextChoices):
    DRAFT = "draft", _("Draft")
    CONFIRMED = "confirmed", _("Confirmed")
    CANCELLED = "cancelled", _("Cancelled")


class Vendor(TimestampedModel):
    """Vendor directory record with clear sample data labelling."""

    name = models.CharField(max_length=200)
    category = models.CharField(
        max_length=50,
        choices=VendorCategory.choices,
        default=VendorCategory.OTHER,
        db_index=True,
    )
    description = models.TextField(blank=True)
    contact_email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    is_sample_data = models.BooleanField(
        default=True,
        help_text="Indicates sample directory data; not an external real provider.",
    )

    class Meta:
        ordering = ["category", "name"]
        indexes = [
            models.Index(fields=["category", "name"], name="idx_vendor_cat_name"),
        ]

    def __str__(self) -> str:
        tag = " [Sample]" if self.is_sample_data else ""
        return f"{self.name} ({self.category}){tag}"


class QuoteRequest(TimestampedModel):
    """Quote request sent by an event host to a vendor."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="quote_requests")
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="quote_requests")
    details = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=QuoteStatus.choices,
        default=QuoteStatus.REQUESTED,
        db_index=True,
    )
    quoted_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quoted_amount__isnull=True) | models.Q(quoted_amount__gte=0),
                name="quote_amount_non_negative",
            )
        ]
        indexes = [
            models.Index(fields=["event", "status"], name="idx_quote_event_status"),
            models.Index(fields=["vendor", "status"], name="idx_quote_vendor_status"),
        ]

    def __str__(self) -> str:
        return f"Quote from {self.vendor.name} for {self.event.name}: {self.status}"


class Booking(TimestampedModel):
    """
    Vendor booking for an event.
    Only CONFIRMED bookings lock vendor time slots.
    """

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="bookings")
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="bookings")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.DRAFT,
        db_index=True,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ["start_time"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gte=0),
                name="booking_amount_non_negative",
            ),
        ]
        indexes = [
            models.Index(fields=["vendor", "status", "start_time", "end_time"], name="idx_book_v_stat_time"),
            models.Index(fields=["event", "status"], name="idx_book_event_status"),
        ]

    def __str__(self) -> str:
        return f"Booking: {self.vendor.name} ({self.start_time} - {self.end_time}) [{self.status}]"

    def clean(self):
        super().clean()
        if self.start_time and self.end_time and self.end_time < self.start_time:
            raise ValidationError({"end_time": "End time cannot be earlier than start time."})
