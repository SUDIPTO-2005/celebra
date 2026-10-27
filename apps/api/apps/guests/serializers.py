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

    class Meta:
        model = Guest
        fields = (
            "id",
            "event_id",
            "name",
            "email",
            "plus_ones",
            "dietary_requirements",
            "accessibility_requirements",
            "rsvp",
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


class GuestCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = (
            "name",
            "email",
            "plus_ones",
            "dietary_requirements",
            "accessibility_requirements",
        )

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
