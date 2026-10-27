"""
Core app – shared base models.
"""

import uuid

from django.db import models


class TimestampedModel(models.Model):
    """
    Abstract base that adds created_at / updated_at timestamps
    and a UUID primary key to every inheriting model.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]
