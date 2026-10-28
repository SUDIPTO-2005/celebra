"""
Budget app – BudgetCategory and Expense models.
"""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import TimestampedModel
from apps.events.models import Event


class BudgetCategory(TimestampedModel):
    """Category grouping budget estimates and actual expenses for an event."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="budget_categories")
    name = models.CharField(max_length=100)
    estimated_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ["name"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(estimated_amount__gte=0),
                name="budget_category_estimated_non_negative",
            )
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.event.name}): {self.estimated_amount}"

    def clean(self):
        super().clean()
        if self.estimated_amount is not None and self.estimated_amount < Decimal("0.00"):
            raise ValidationError({"estimated_amount": "Estimated amount cannot be negative."})


class Expense(TimestampedModel):
    """Individual recorded expense within a budget category."""

    category = models.ForeignKey(BudgetCategory, on_delete=models.CASCADE, related_name="expenses")
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=3, default="USD")
    date = models.DateField()

    class Meta:
        ordering = ["-date", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gte=0),
                name="expense_amount_non_negative",
            )
        ]
        indexes = [
            models.Index(fields=["category", "-date"], name="idx_expense_cat_date"),
        ]

    def __str__(self) -> str:
        return f"{self.description}: {self.amount} {self.currency}"

    def clean(self):
        super().clean()
        if self.amount is not None and self.amount < Decimal("0.00"):
            raise ValidationError({"amount": "Expense amount cannot be negative."})
