"""
Tasks app – DRF serializers.
"""

from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from apps.accounts.serializers import UserSerializer

from .models import ScheduleItem, Task, TaskStatus


class TaskSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    is_overdue = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            "id",
            "event_id",
            "assigned_to",
            "assigned_to_id",
            "title",
            "description",
            "priority",
            "status",
            "due_date",
            "completed_at",
            "is_overdue",
            "is_upcoming",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "event_id", "completed_at", "created_at", "updated_at")

    def get_is_overdue(self, obj: Task) -> bool:
        if obj.status == TaskStatus.COMPLETED or not obj.due_date:
            return False
        return obj.due_date < timezone.now()

    def get_is_upcoming(self, obj: Task) -> bool:
        if obj.status == TaskStatus.COMPLETED or not obj.due_date:
            return False
        now = timezone.now()
        return now <= obj.due_date <= now + timedelta(days=7)


class TaskCreateUpdateSerializer(serializers.ModelSerializer):
    assigned_to_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = Task
        fields = (
            "title",
            "description",
            "priority",
            "status",
            "due_date",
            "assigned_to_id",
        )


class ScheduleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleItem
        fields = (
            "id",
            "event_id",
            "title",
            "start_time",
            "end_time",
            "timezone",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "event_id", "created_at", "updated_at")


class ScheduleItemCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleItem
        fields = (
            "title",
            "start_time",
            "end_time",
            "timezone",
            "notes",
        )

    def validate(self, attrs: dict) -> dict:
        start = attrs.get("start_time")
        end = attrs.get("end_time")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_time": "End time cannot be earlier than start time."}
            )
        return attrs
