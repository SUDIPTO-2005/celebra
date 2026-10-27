"""
Events app – DRF serializers.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.serializers import UserSerializer

from .models import Event, EventMember, EventStatus, MemberRole

User = get_user_model()


class EventMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = EventMember
        fields = ("id", "user", "user_id", "role", "created_at")
        read_only_fields = ("id", "created_at")


class AddMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=[(MemberRole.COHOST, "Co-Host")],
        default=MemberRole.COHOST,
    )


class EventSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    user_role = serializers.SerializerMethodField()
    guests_count = serializers.SerializerMethodField()
    attending_count = serializers.SerializerMethodField()
    pending_rsvp_count = serializers.SerializerMethodField()
    tasks_count = serializers.SerializerMethodField()
    completed_tasks_count = serializers.SerializerMethodField()
    actual_spent = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            "id",
            "name",
            "description",
            "event_type",
            "venue",
            "start_date",
            "end_date",
            "timezone",
            "budget",
            "currency",
            "status",
            "owner",
            "user_role",
            "guests_count",
            "attending_count",
            "pending_rsvp_count",
            "tasks_count",
            "completed_tasks_count",
            "actual_spent",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "owner",
            "created_at",
            "updated_at",
        )

    def get_user_role(self, obj: Event) -> str:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return ""
        if obj.owner == request.user:
            return "owner"
        membership = obj.memberships.filter(user=request.user).first()
        return membership.role if membership else ""

    def get_guests_count(self, obj: Event) -> int:
        return getattr(obj, "guests_count_val", obj.guests.count() if hasattr(obj, "guests") else 0)

    def get_attending_count(self, obj: Event) -> int:
        if hasattr(obj, "guests"):
            return obj.guests.filter(rsvp__response="yes").count()
        return 0

    def get_pending_rsvp_count(self, obj: Event) -> int:
        if hasattr(obj, "guests"):
            return obj.guests.filter(rsvp__isnull=True).count()
        return 0

    def get_tasks_count(self, obj: Event) -> int:
        return obj.tasks.count() if hasattr(obj, "tasks") else 0

    def get_completed_tasks_count(self, obj: Event) -> int:
        return obj.tasks.filter(status="completed").count() if hasattr(obj, "tasks") else 0

    def get_actual_spent(self, obj: Event) -> str:
        if hasattr(obj, "budget_categories"):
            total = sum(
                (exp.amount for cat in obj.budget_categories.all() for exp in cat.expenses.all()),
                Decimal("0.00"),
            )
            return str(total)
        return "0.00"


class EventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = (
            "name",
            "description",
            "event_type",
            "venue",
            "start_date",
            "end_date",
            "timezone",
            "budget",
            "currency",
            "status",
        )

    def validate_budget(self, value: Decimal) -> Decimal:
        if value < Decimal("0.00"):
            raise serializers.ValidationError("Budget cannot be negative.")
        return value

    def validate(self, attrs: dict) -> dict:
        start = attrs.get("start_date")
        end = attrs.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "End date cannot be earlier than start date."}
            )
        return attrs


class EventUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = (
            "name",
            "description",
            "event_type",
            "venue",
            "start_date",
            "end_date",
            "timezone",
            "budget",
            "currency",
            "status",
        )
        extra_kwargs = {field: {"required": False} for field in fields}

    def validate_budget(self, value: Decimal) -> Decimal:
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError("Budget cannot be negative.")
        return value

    def validate(self, attrs: dict) -> dict:
        instance = getattr(self, "instance", None)
        start = attrs.get("start_date", instance.start_date if instance else None)
        end = attrs.get("end_date", instance.end_date if instance else None)
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "End date cannot be earlier than start date."}
            )
        return attrs


class TransitionStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=EventStatus.choices)


class DuplicateEventSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=False, allow_blank=True)
