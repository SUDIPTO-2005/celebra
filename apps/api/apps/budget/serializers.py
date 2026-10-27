"""
Budget app – DRF serializers.
"""

from decimal import Decimal

from rest_framework import serializers

from .models import BudgetCategory, Expense


class ExpenseSerializer(serializers.ModelSerializer):
    category_id = serializers.UUIDField(source="category.id", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Expense
        fields = (
            "id",
            "category_id",
            "category_name",
            "description",
            "amount",
            "currency",
            "date",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class ExpenseCreateUpdateSerializer(serializers.ModelSerializer):
    category_id = serializers.UUIDField()

    class Meta:
        model = Expense
        fields = (
            "category_id",
            "description",
            "amount",
            "currency",
            "date",
        )

    def validate_amount(self, value: Decimal) -> Decimal:
        if value < Decimal("0.00"):
            raise serializers.ValidationError("Expense amount cannot be negative.")
        return value


class BudgetCategorySerializer(serializers.ModelSerializer):
    actual_amount = serializers.SerializerMethodField()
    variance = serializers.SerializerMethodField()
    expenses = ExpenseSerializer(many=True, read_only=True)

    class Meta:
        model = BudgetCategory
        fields = (
            "id",
            "event_id",
            "name",
            "estimated_amount",
            "actual_amount",
            "variance",
            "expenses",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "event_id", "created_at", "updated_at")

    def get_actual_amount(self, obj: BudgetCategory) -> str:
        total = sum((exp.amount for exp in obj.expenses.all()), Decimal("0.00"))
        return str(total)

    def get_variance(self, obj: BudgetCategory) -> str:
        actual = sum((exp.amount for exp in obj.expenses.all()), Decimal("0.00"))
        return str(obj.estimated_amount - actual)


class BudgetCategoryCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetCategory
        fields = ("name", "estimated_amount")

    def validate_estimated_amount(self, value: Decimal) -> Decimal:
        if value < Decimal("0.00"):
            raise serializers.ValidationError("Estimated amount cannot be negative.")
        return value
