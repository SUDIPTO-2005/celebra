"""
Guests app – DRF serializers.
"""

from rest_framework import serializers

from .models import RSVP, Guest, RSVPResponse


class RSVPSerializer(serializers.ModelSerializer):
    class Meta:
        model = RSVP
        fields = ("id", "response", "notes", "responded_at")
        read_only_fields = ("id", "responded_at")


class GuestSerializer(serializers.ModelSerializer):
    rsvp = RSVPSerializer(read_only=True)
    has_invite_token = serializers.SerializerMethodField()
    token_revoked = serializers.SerializerMethodField()
    full_name = serializers.CharField(source="name", read_only=True)
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    plus_one_count = serializers.IntegerField(source="plus_ones", read_only=True)
    rsvp_status = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = (
            "id",
            "event_id",
            "name",
            "full_name",
            "first_name",
            "last_name",
            "email",
            "plus_ones",
            "plus_one_count",
            "dietary_requirements",
            "accessibility_requirements",
            "rsvp",
            "rsvp_status",
            "has_invite_token",
            "token_revoked",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "event_id", "created_at", "updated_at")

    def get_has_invite_token(self, obj: Guest) -> bool:
        return hasattr(obj, "invite_token") and obj.invite_token is not None

    def get_token_revoked(self, obj: Guest) -> bool:
        if hasattr(obj, "invite_token") and obj.invite_token:
            return obj.invite_token.revoked
        return False

    def get_first_name(self, obj: Guest) -> str:
        parts = (obj.name or "").split(" ", 1)
        return parts[0] if parts else ""

    def get_last_name(self, obj: Guest) -> str:
        parts = (obj.name or "").split(" ", 1)
        return parts[1] if len(parts) > 1 else ""

    def get_rsvp_status(self, obj: Guest) -> str:
        if hasattr(obj, "rsvp") and obj.rsvp:
            return obj.rsvp.response
        return "pending"


class GuestCreateUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(required=False, write_only=True, allow_blank=True)
    last_name = serializers.CharField(required=False, write_only=True, allow_blank=True)
    plus_one_count = serializers.IntegerField(required=False, write_only=True, min_value=0)
    name = serializers.CharField(required=False)

    class Meta:
        model = Guest
        fields = (
            "name",
            "first_name",
            "last_name",
            "email",
            "plus_ones",
            "plus_one_count",
            "dietary_requirements",
            "accessibility_requirements",
        )

    def validate(self, attrs):
        first_name = attrs.pop("first_name", "")
        last_name = attrs.pop("last_name", "")
        if first_name or last_name:
            full = f"{first_name or ''} {last_name or ''}".strip()
            if full:
                attrs["name"] = full

        if "plus_one_count" in attrs:
            attrs["plus_ones"] = attrs.pop("plus_one_count")

        if not attrs.get("name") and self.instance is None:
            raise serializers.ValidationError({"name": "This field is required."})

        return super().validate(attrs)

    def validate_plus_ones(self, value: int) -> int:
        if value < 0:
            raise serializers.ValidationError("Plus ones cannot be negative.")
        return value


class PublicRSVPSubmitSerializer(serializers.Serializer):
    token = serializers.CharField()
    response = serializers.ChoiceField(choices=RSVPResponse.choices)
    plus_ones = serializers.IntegerField(min_value=0, required=False, default=0)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    dietary_requirements = serializers.CharField(required=False, allow_blank=True, default="")
    accessibility_requirements = serializers.CharField(required=False, allow_blank=True, default="")


class PublicRSVPDetailsSerializer(serializers.Serializer):
    guest_name = serializers.CharField()
    event_name = serializers.CharField()
    event_venue = serializers.CharField()
    event_start_date = serializers.DateTimeField()
    event_end_date = serializers.DateTimeField()
    event_timezone = serializers.CharField()
    plus_ones = serializers.IntegerField()
    dietary_requirements = serializers.CharField()
    accessibility_requirements = serializers.CharField()
    current_response = serializers.CharField(allow_null=True)
    notes = serializers.CharField(allow_blank=True)
