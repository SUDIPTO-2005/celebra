"""
Tests for Tasks, assignments, completion logic, schedule items, and conflict detection.
"""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.events.services import EventService
from apps.tasks.models import TaskStatus
from apps.tasks.services import ScheduleService, TaskService

User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(email="organizer@test.com", password="Password123!")


@pytest.fixture
def event(user):
    now = timezone.now()
    return EventService.create_event(
        owner=user,
        name="Conference Event",
        start_date=now + timedelta(days=10),
        end_date=now + timedelta(days=10, hours=8),
    )


@pytest.mark.django_db
class TestTasksAndScheduling:
    def test_task_completion_timestamp(self, event, user):
        task = TaskService.create_task(
            event=event,
            user=user,
            title="Book keynote speaker",
            status=TaskStatus.TODO,
        )
        assert task.completed_at is None

        TaskService.update_task(task, user, status=TaskStatus.COMPLETED)
        task.refresh_from_db()
        assert task.completed_at is not None

        # Reopening task clears completed_at
        TaskService.update_task(task, user, status=TaskStatus.IN_PROGRESS)
        task.refresh_from_db()
        assert task.completed_at is None

    def test_schedule_item_invalid_times_rejected(self, event, user):
        now = timezone.now()
        with pytest.raises(ValidationError):
            ScheduleService.create_schedule_item(
                event=event,
                user=user,
                title="Invalid Item",
                start_time=now + timedelta(hours=2),
                end_time=now + timedelta(hours=1),  # ends before start
            )

    def test_schedule_conflict_detection(self, event, user):
        base = timezone.now() + timedelta(days=1)
        # Item 1: 10:00 to 12:00
        ScheduleService.create_schedule_item(
            event=event,
            user=user,
            title="Keynote",
            start_time=base.replace(hour=10, minute=0),
            end_time=base.replace(hour=12, minute=0),
        )
        # Item 2: 11:30 to 13:00 (overlaps with Keynote by 30 mins)
        ScheduleService.create_schedule_item(
            event=event,
            user=user,
            title="Workshop A",
            start_time=base.replace(hour=11, minute=30),
            end_time=base.replace(hour=13, minute=0),
        )
        # Item 3: 14:00 to 15:00 (no overlap)
        ScheduleService.create_schedule_item(
            event=event,
            user=user,
            title="Closing Remarks",
            start_time=base.replace(hour=14, minute=0),
            end_time=base.replace(hour=15, minute=0),
        )

        conflicts = ScheduleService.detect_conflicts(event, user)
        assert len(conflicts) == 1
        assert conflicts[0]["item_a_title"] == "Keynote"
        assert conflicts[0]["item_b_title"] == "Workshop A"
