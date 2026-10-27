"""
Vendors app – DRF serializers.
"""

from decimal import Decimal

from rest_framework import serializers

from .models import Booking, QuoteRequest, Vendor


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = (
            "id",
            "name",
            "category",
            "description",
            "contact_email",
            "phone",
            "is_sample_data",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "is_sample_data", "created_at", "updated_at")


class QuoteRequestSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)
    vendor_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = QuoteRequest
        fields = (
            "id",
            "event_id",
            "vendor",
            "vendor_id",
            "details",
            "status",
            "quoted_amount",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "event_id", "created_at", "updated_at")


class QuoteRequestUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuoteRequest
        fields = ("status", "quoted_amount")

    def validate_quoted_amount(self, value: Decimal) -> Decimal:
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError("Quoted amount cannot be negative.")
        return value


class BookingSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)
    vendor_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Booking
        fields = (
            "id",
            "event_id",
            "vendor",
            "vendor_id",
            "start_time",
            "end_time",
            "status",
            "amount",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "event_id", "created_at", "updated_at")


class BookingCreateSerializer(serializers.ModelSerializer):
    vendor_id = serializers.UUIDField()

    class Meta:
        model = Booking
        fields = (
            "vendor_id",
            "start_time",
            "end_time",
            "status",
            "amount",
        )

    def validate_amount(self, value: Decimal) -> Decimal:
        if value < Decimal("0.00"):
            raise serializers.ValidationError("Booking amount cannot be negative.")
        return value

    def validate(self, attrs: dict) -> dict:
        start = attrs.get("start_time")
        end = attrs.get("end_time")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_time": "End time cannot be earlier than start time."}
            )
        return attrs


class BookingUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ("start_time", "end_time", "status", "amount")
        extra_kwargs = {field: {"required": False} for field in fields}

    def validate_amount(self, value: Decimal) -> Decimal:
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError("Booking amount cannot be negative.")
        return value

    def validate(self, attrs: dict) -> dict:
        instance = getattr(self, "instance", None)
        start = attrs.get("start_time", instance.start_time if instance else None)
        end = attrs.get("end_time", instance.end_time if instance else None)
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_time": "End time cannot be earlier than start time."}
            )
        return attrs
