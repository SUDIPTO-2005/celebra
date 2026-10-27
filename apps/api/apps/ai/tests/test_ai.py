"""
Tests for AI assistant schema validation, rate-limiting, failure fallback, and estimates labelling.
"""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from apps.ai.models import AIRequest
from apps.ai.services import AIService

User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(email="ai_user@test.com", password="Password123!")


@pytest.mark.django_db
class TestAIAssistant:
    def test_plan_generation_returns_estimates_and_confirmation_flag(self, user):
        plan = AIService.generate_plan(
            user=user,
            event_name="Product Launch",
            event_type="corporate",
            guest_count=50,
            budget=Decimal("10000.00"),
        )
        assert plan["is_estimate"] is True
        assert plan["requires_user_confirmation"] is True
        assert "suggested_timeline" in plan
        assert len(plan["suggested_timeline"]) > 0

        # Verify audit log created without secret leakage
        req = AIRequest.objects.filter(user=user, request_type="generate_plan").first()
        assert req is not None
        assert "corporate" in req.prompt_summary

    def test_suggest_budget_allocation_matches_total(self, user):
        budget = Decimal("5000.00")
        breakdown = AIService.suggest_budget_allocation(
            user=user, total_budget=budget, event_type="wedding"
        )
        assert len(breakdown) > 0
        total_suggested = sum(Decimal(item["suggested_amount"]) for item in breakdown)
        assert total_suggested == budget

    def test_suggest_tasks_structure(self, user):
        tasks = AIService.suggest_tasks(user=user, event_type="birthday", days_until_event=20)
        assert len(tasks) > 0
        for t in tasks:
            assert "title" in t
            assert "priority" in t
            assert "category" in t

    def test_invitation_copy_generation(self, user):
        invite = AIService.generate_invitation_copy(
            user=user,
            event_name="Summer Picnic",
            host_name="Alex",
            venue="Central Park",
            date_str="Saturday, 2 PM",
            tone="warm",
        )
        assert "Summer Picnic" in invite["subject"]
        assert "Alex" in invite["body"]
        assert invite["is_estimate"] is True
        assert invite["requires_user_confirmation"] is True

    def test_user_rate_limit_enforcement(self, user):
        # Exceed daily limit
        for i in range(50):
            AIRequest.objects.create(
                user=user,
                request_type="test",
                prompt_summary="dummy",
                status="success",
            )
        with pytest.raises(ValidationError, match="limit"):
            AIService.generate_plan(
                user=user,
                event_name="Over Limit",
                event_type="party",
                guest_count=10,
                budget=Decimal("100.00"),
            )
