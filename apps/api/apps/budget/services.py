"""
Budget app – decimal-safe arithmetic, currency validation, and budget summaries.
"""

from __future__ import annotations

import logging
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from django.core.exceptions import ValidationError

from apps.events.models import Event
from apps.events.services import EventService

from .models import BudgetCategory, Expense

logger = logging.getLogger(__name__)

TWO_PLACES = Decimal("0.01")


def to_decimal(val: Any) -> Decimal:
    """Safely convert any numeric value to a 2-decimal Decimal."""
    if isinstance(val, Decimal):
        return val.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    try:
        return Decimal(str(val)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    except Exception as e:
        raise ValidationError(f"Invalid monetary decimal value: '{val}'") from e


class BudgetService:
    """Service layer for Budget calculations and Expense management."""

    @staticmethod
    def create_category(
        *,
        event: Event,
        user: Any,
        name: str,
        estimated_amount: Any = Decimal("0.00"),
    ) -> BudgetCategory:
        """Create a new budget category."""
        EventService.check_member_permission(event, user)
        dec_est = to_decimal(estimated_amount)
        if dec_est < Decimal("0.00"):
            raise ValidationError("Estimated amount cannot be negative.")

        cat = BudgetCategory.objects.create(
            event=event,
            name=name.strip(),
            estimated_amount=dec_est,
        )
        logger.info("Created budget category %s for event %s", cat.id, event.id)
        return cat

    @staticmethod
    def update_category(category: BudgetCategory, user: Any, **fields: Any) -> BudgetCategory:
        """Update a budget category."""
        EventService.check_member_permission(category.event, user)
        if "name" in fields:
            category.name = fields["name"].strip()
        if "estimated_amount" in fields:
            dec_est = to_decimal(fields["estimated_amount"])
            if dec_est < Decimal("0.00"):
                raise ValidationError("Estimated amount cannot be negative.")
            category.estimated_amount = dec_est

        category.full_clean()
        category.save()
        logger.info("Updated budget category %s", category.id)
        return category

    @staticmethod
    def delete_category(category: BudgetCategory, user: Any) -> None:
        """Delete a budget category and its associated expenses."""
        EventService.check_member_permission(category.event, user)
        cat_id = category.id
        category.delete()
        logger.info("Deleted budget category %s", cat_id)

    @staticmethod
    def add_expense(
        *,
        category: BudgetCategory,
        user: Any,
        description: str,
        amount: Any,
        currency: str,
        date: Any,
    ) -> Expense:
        """Add an expense under a category with currency and amount validation."""
        EventService.check_member_permission(category.event, user)
        dec_amount = to_decimal(amount)
        if dec_amount < Decimal("0.00"):
            raise ValidationError("Expense amount cannot be negative.")

        # Reject mixed currencies
        event_currency = category.event.currency.upper()
        clean_currency = currency.strip().upper()
        if clean_currency != event_currency:
            raise ValidationError(
                f"Mixed-currency calculations are not supported. "
                f"Expense currency '{clean_currency}' does not match event currency '{event_currency}'."
            )

        expense = Expense.objects.create(
            category=category,
            description=description.strip(),
            amount=dec_amount,
            currency=clean_currency,
            date=date,
        )
        logger.info(
            "Created expense %s (amount: %s) for category %s", expense.id, dec_amount, category.id
        )
        return expense

    @staticmethod
    def update_expense(expense: Expense, user: Any, **fields: Any) -> Expense:
        """Update an existing expense."""
        EventService.check_member_permission(expense.category.event, user)
        event_currency = expense.category.event.currency.upper()

        if "amount" in fields:
            dec_amount = to_decimal(fields["amount"])
            if dec_amount < Decimal("0.00"):
                raise ValidationError("Expense amount cannot be negative.")
            expense.amount = dec_amount

        if "currency" in fields:
            clean_curr = fields["currency"].strip().upper()
            if clean_curr != event_currency:
                raise ValidationError(
                    f"Expense currency '{clean_curr}' must match event currency '{event_currency}'."
                )
            expense.currency = clean_curr

        if "description" in fields:
            expense.description = fields["description"].strip()

        if "date" in fields:
            expense.date = fields["date"]

        if "category_id" in fields:
            new_cat = BudgetCategory.objects.get(
                id=fields["category_id"], event=expense.category.event
            )
            expense.category = new_cat

        expense.full_clean()
        expense.save()
        logger.info("Updated expense %s", expense.id)
        return expense

    @staticmethod
    def delete_expense(expense: Expense, user: Any) -> None:
        """Delete an expense."""
        EventService.check_member_permission(expense.category.event, user)
        exp_id = expense.id
        expense.delete()
        logger.info("Deleted expense %s", exp_id)

    @staticmethod
    def get_budget_summary(event: Event, user: Any) -> dict[str, Any]:
        """
        Calculate total budget metrics:
        - Total budget limit
        - Total estimated cost (sum of category estimates)
        - Total actual cost (sum of all expenses)
        - Remaining budget (budget limit - actual cost)
        - Budget variance (estimated cost - actual cost)
        - Cost per guest (actual cost / attending guests, 0.00 if 0 attending)
        - Breakdown per category
        """
        EventService.check_member_permission(event, user)
        categories = event.budget_categories.prefetch_related("expenses").all()

        total_budget = to_decimal(event.budget)
        total_estimated = Decimal("0.00")
        total_actual = Decimal("0.00")

        category_summaries: list[dict[str, Any]] = []

        for cat in categories:
            cat_est = to_decimal(cat.estimated_amount)
            total_estimated += cat_est

            cat_actual = Decimal("0.00")
            expenses_list = []
            for exp in cat.expenses.all():
                # Enforce currency integrity
                if exp.currency.upper() != event.currency.upper():
                    raise ValidationError(
                        f"Database integrity error: expense {exp.id} has currency {exp.currency} "
                        f"which doesn't match event currency {event.currency}"
                    )
                exp_amount = to_decimal(exp.amount)
                cat_actual += exp_amount
                expenses_list.append(
                    {
                        "id": str(exp.id),
                        "description": exp.description,
                        "amount": str(exp_amount),
                        "currency": exp.currency,
                        "date": str(exp.date),
                    }
                )

            total_actual += cat_actual
            cat_variance = cat_est - cat_actual

            category_summaries.append(
                {
                    "id": str(cat.id),
                    "name": cat.name,
                    "estimated_amount": str(cat_est),
                    "actual_amount": str(cat_actual),
                    "variance": str(cat_variance),
                    "expenses_count": len(expenses_list),
                    "expenses": expenses_list,
                }
            )

        remaining_budget = total_budget - total_actual
        variance = total_estimated - total_actual

        # Count attending guests
        attending_guests = event.guests.filter(rsvp__response="yes").count()
        if attending_guests > 0:
            cost_per_guest = (total_actual / Decimal(attending_guests)).quantize(
                TWO_PLACES, rounding=ROUND_HALF_UP
            )
        else:
            cost_per_guest = Decimal("0.00")  # Documented sentinel value for 0 guests

        return {
            "currency": event.currency,
            "budget_limit": str(total_budget),
            "total_estimated": str(total_estimated),
            "total_actual": str(total_actual),
            "remaining_budget": str(remaining_budget),
            "budget_variance": str(variance),
            "variance_formula": "total_estimated - total_actual (positive = under estimate)",
            "attending_guests": attending_guests,
            "cost_per_guest": str(cost_per_guest),
            "categories": category_summaries,
        }
