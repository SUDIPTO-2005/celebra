"""
Tasks app – business logic for tasks, assignments, deadlines, schedule items, and conflict detection.
"""

from __future__ import annotations

import logging
from typing import Any

from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.events.models import Event
from apps.events.services import EventService

from .models import ScheduleItem, Task, TaskPriority, TaskStatus

logger = logging.getLogger(__name__)


class TaskService:
    """Service layer for Task management."""

    @staticmethod
    def create_task(
        *,
        event: Event,
        user: Any,
        title: str,
        description: str = "",
        priority: str = TaskPriority.MEDIUM,
        status: str = TaskStatus.TODO,
        due_date: Any = None,
        assigned_to: Any = None,
    ) -> Task:
        """Create a new task."""
        EventService.check_member_permission(event, user)
        completed_at = timezone.now() if status == TaskStatus.COMPLETED else None

        task = Task.objects.create(
            event=event,
            assigned_to=assigned_to,
            title=title.strip(),
            description=description.strip(),
            priority=priority,
            status=status,
            due_date=due_date,
            completed_at=completed_at,
        )
        logger.info("Created task %s for event %s", task.id, event.id)
        return task

    @staticmethod
    def update_task(task: Task, user: Any, **fields: Any) -> Task:
        """Update task properties and handle completion timestamp."""
        EventService.check_member_permission(task.event, user)

        if "status" in fields:
            new_status = fields["status"]
            if new_status == TaskStatus.COMPLETED and task.status != TaskStatus.COMPLETED:
                task.completed_at = timezone.now()
            elif new_status != TaskStatus.COMPLETED:
                task.completed_at = None
            task.status = new_status

        for attr in ["title", "description", "priority", "due_date", "assigned_to"]:
            if attr in fields:
                val = fields[attr]
                if isinstance(val, str) and attr in ["title", "description"]:
                    val = val.strip()
                setattr(task, attr, val)

        task.full_clean()
        task.save()
        logger.info("Updated task %s", task.id)
        return task

    @staticmethod
    def delete_task(task: Task, user: Any) -> None:
        """Delete a task."""
        EventService.check_member_permission(task.event, user)
        task_id = task.id
        task.delete()
        logger.info("Deleted task %s", task_id)


class ScheduleService:
    """Service layer for Schedule Items and conflict detection."""

    @staticmethod
    def create_schedule_item(
        *,
        event: Event,
        user: Any,
        title: str,
        start_time: Any,
        end_time: Any,
        timezone_str: str = "UTC",
        notes: str = "",
    ) -> ScheduleItem:
        """Create a schedule item, validating time interval."""
        EventService.check_member_permission(event, user)
        if end_time < start_time:
            raise ValidationError("End time cannot be earlier than start time.")

        item = ScheduleItem.objects.create(
            event=event,
            title=title.strip(),
            start_time=start_time,
            end_time=end_time,
            timezone=timezone_str,
            notes=notes.strip(),
        )
        logger.info("Created schedule item %s for event %s", item.id, event.id)
        return item

    @staticmethod
    def update_schedule_item(item: ScheduleItem, user: Any, **fields: Any) -> ScheduleItem:
        """Update a schedule item."""
        EventService.check_member_permission(item.event, user)

        start = fields.get("start_time", item.start_time)
        end = fields.get("end_time", item.end_time)
        if end < start:
            raise ValidationError("End time cannot be earlier than start time.")

        for attr, val in fields.items():
            if isinstance(val, str) and attr in ["title", "notes"]:
                val = val.strip()
            setattr(item, attr, val)

        item.full_clean()
        item.save()
        logger.info("Updated schedule item %s", item.id)
        return item

    @staticmethod
    def delete_schedule_item(item: ScheduleItem, user: Any) -> None:
        """Delete a schedule item."""
        EventService.check_member_permission(item.event, user)
        item_id = item.id
        item.delete()
        logger.info("Deleted schedule item %s", item_id)

    @staticmethod
    def detect_conflicts(event: Event, user: Any) -> list[dict[str, Any]]:
        """
        Detect overlapping schedule items for the event.
        Two items overlap if item1.start_time < item2.end_time and item2.start_time < item1.end_time.
        """
        EventService.check_member_permission(event, user)
        items = list(event.schedule_items.order_by("start_time"))
        conflicts: list[dict[str, Any]] = []

        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                item_a = items[i]
                item_b = items[j]

                # If item_b starts after or when item_a ends, no overlap with subsequent items
                if item_b.start_time >= item_a.end_time:
                    continue

                if item_a.start_time < item_b.end_time and item_b.start_time < item_a.end_time:
                    conflicts.append(
                        {
                            "item_a_id": str(item_a.id),
                            "item_a_title": item_a.title,
                            "item_b_id": str(item_b.id),
                            "item_b_title": item_b.title,
                            "overlap_start": str(max(item_a.start_time, item_b.start_time)),
                            "overlap_end": str(min(item_a.end_time, item_b.end_time)),
                        }
                    )

        return conflicts
