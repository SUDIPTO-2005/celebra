"""
AI app – DRF input serializers.
"""

from decimal import Decimal

from rest_framework import serializers


class GeneratePlanInputSerializer(serializers.Serializer):
    event_name = serializers.CharField(max_length=200)
    event_type = serializers.CharField(max_length=50, default="celebration")
    guest_count = serializers.IntegerField(min_value=1, default=25)
    budget = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0.00"), default=Decimal("1000.00")
    )
    theme = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")


class SuggestTasksInputSerializer(serializers.Serializer):
    event_type = serializers.CharField(max_length=50, default="celebration")
    days_until_event = serializers.IntegerField(min_value=1, default=30)


class SuggestBudgetInputSerializer(serializers.Serializer):
    total_budget = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0.00")
    )
    event_type = serializers.CharField(max_length=50, default="celebration")


class GenerateInviteInputSerializer(serializers.Serializer):
    event_name = serializers.CharField(max_length=200)
    host_name = serializers.CharField(max_length=150)
    venue = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    date_str = serializers.CharField(max_length=100)
    tone = serializers.ChoiceField(choices=["warm", "formal"], default="warm")
