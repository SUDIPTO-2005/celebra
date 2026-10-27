"""
AI app – AIRequest logging model.
"""

from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class AIRequest(TimestampedModel):
    """Audit log of AI assistant requests without sensitive prompt data."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_requests",
    )
    request_type = models.CharField(max_length=50, db_index=True)
    prompt_summary = models.CharField(max_length=255)
    status = models.CharField(max_length=20, default="success")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.request_type} ({self.status}) at {self.created_at}"
