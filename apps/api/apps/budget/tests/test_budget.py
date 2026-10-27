"""
Tests for Budget calculations, fixed-precision decimal arithmetic, currency integrity, and edge cases.
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.budget.services import BudgetService
from apps.events.services import EventService
from apps.guests.services import GuestService

User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(email="budgeteer@test.com", password="Password123!")


@pytest.fixture
def event(user):
    now = timezone.now()
    return EventService.create_event(
        owner=user,
        name="Budgeted Event",
        start_date=now + timedelta(days=20),
        end_date=now + timedelta(days=20, hours=4),
        budget=Decimal("3000.00"),
        currency="USD",
    )


@pytest.mark.django_db
class TestBudgetCalculations:
    def test_decimal_precision_and_variance(self, event, user):
        cat1 = BudgetService.create_category(
            event=event, user=user, name="Catering", estimated_amount=Decimal("1500.50")
        )
        BudgetService.create_category(
            event=event, user=user, name="Music", estimated_amount=Decimal("500.25")
        )

        BudgetService.add_expense(
            category=cat1,
            user=user,
            description="Appetizers",
            amount=Decimal("750.20"),
            currency="USD",
            date=date.today(),
        )
        BudgetService.add_expense(
            category=cat1,
            user=user,
            description="Drinks",
            amount=Decimal("300.30"),
            currency="USD",
            date=date.today(),
        )

        summary = BudgetService.get_budget_summary(event, user)
        # Total estimated = 1500.50 + 500.25 = 2000.75
        assert summary["total_estimated"] == "2000.75"
        # Total actual = 750.20 + 300.30 = 1050.50
        assert summary["total_actual"] == "1050.50"
        # Remaining budget = 3000.00 - 1050.50 = 1949.50
        assert summary["remaining_budget"] == "1949.50"
        # Variance = 2000.75 - 1050.50 = 950.25 (positive means under estimate)
        assert summary["budget_variance"] == "950.25"

    def test_negative_values_rejected(self, event, user):
        with pytest.raises(ValidationError):
            BudgetService.create_category(
                event=event, user=user, name="Bad", estimated_amount=Decimal("-10.00")
            )

        cat = BudgetService.create_category(
            event=event, user=user, name="Good", estimated_amount=100
        )
        with pytest.raises(ValidationError):
            BudgetService.add_expense(
                category=cat,
                user=user,
                description="Negative",
                amount=Decimal("-5.00"),
                currency="USD",
                date=date.today(),
            )

    def test_mixed_currency_rejected(self, event, user):
        cat = BudgetService.create_category(
            event=event, user=user, name="Decor", estimated_amount=200
        )
        # Event is USD, try adding EUR
        with pytest.raises(ValidationError, match="Mixed-currency"):
            BudgetService.add_expense(
                category=cat,
                user=user,
                description="Euro candles",
                amount=Decimal("50.00"),
                currency="EUR",
                date=date.today(),
            )

    def test_zero_guests_cost_per_guest_sentinel(self, event, user):
        cat = BudgetService.create_category(
            event=event, user=user, name="General", estimated_amount=100
        )
        BudgetService.add_expense(
            category=cat,
            user=user,
            description="Item",
            amount=Decimal("150.00"),
            currency="USD",
            date=date.today(),
        )
        # Zero attending guests
        summary = BudgetService.get_budget_summary(event, user)
        assert summary["attending_guests"] == 0
        assert summary["cost_per_guest"] == "0.00"

    def test_cost_per_guest_with_attendees(self, event, user):
        cat = BudgetService.create_category(
            event=event, user=user, name="General", estimated_amount=1000
        )
        BudgetService.add_expense(
            category=cat,
            user=user,
            description="Catering",
            amount=Decimal("300.00"),
            currency="USD",
            date=date.today(),
        )
        # Add 3 attending guests
        for i in range(3):
            g = GuestService.add_guest(event=event, user=user, name=f"Guest {i}")
            _, tok = GuestService.generate_invite_token(g, user)
            GuestService.record_rsvp(raw_token=tok, response="yes")

        summary = BudgetService.get_budget_summary(event, user)
        assert summary["attending_guests"] == 3
        # 300.00 / 3 = 100.00
        assert summary["cost_per_guest"] == "100.00"
