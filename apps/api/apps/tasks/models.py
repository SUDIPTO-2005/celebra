"""
Tasks app – Task and ScheduleItem models.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimestampedModel
from apps.events.models import Event


class TaskPriority(models.TextChoices):
    LOW = "low", _("Low")
    MEDIUM = "medium", _("Medium")
    HIGH = "high", _("High")
    URGENT = "urgent", _("Urgent")


class TaskStatus(models.TextChoices):
    TODO = "todo", _("To Do")
    IN_PROGRESS = "in_progress", _("In Progress")
    COMPLETED = "completed", _("Completed")


class Task(TimestampedModel):
    """Task item for an event."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="tasks")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.TODO,
        db_index=True,
    )
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["due_date", "-priority", "created_at"]
        indexes = [
            models.Index(fields=["event", "status"], name="idx_task_event_status"),
            models.Index(fields=["event", "due_date"], name="idx_task_event_duedate"),
        ]

    def __str__(self) -> str:
        return f"{self.title} [{self.status}]"


class ScheduleItem(TimestampedModel):
    """Timeline / agenda item for an event."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="schedule_items")
    title = models.CharField(max_length=200)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    timezone = models.CharField(max_length=50, default="UTC")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["start_time"]
        indexes = [
            models.Index(fields=["event", "start_time"], name="idx_sched_event_start"),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.start_time} - {self.end_time})"

    def clean(self):
        super().clean()
        if self.start_time and self.end_time and self.end_time < self.start_time:
            raise ValidationError({"end_time": "End time cannot be earlier than start time."})
