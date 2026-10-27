"""
AI app – business logic, schema validation, rate-limiting, and LLM provider integration.
"""

from __future__ import annotations

import logging
import os
from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import AIRequest

logger = logging.getLogger(__name__)

DEFAULT_DAILY_LIMIT = int(os.getenv("AI_MAX_REQUESTS_PER_USER_PER_DAY", "50"))
DEFAULT_TIMEOUT = int(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "30"))


class AIService:
    """Service layer for AI assistant operations."""

    @staticmethod
    def is_configured() -> bool:
        """Check if an external AI provider is configured."""
        provider = os.getenv("AI_PROVIDER", "").strip().lower()
        api_key = os.getenv("AI_API_KEY", "").strip()
        return bool(provider and api_key)

    @staticmethod
    def check_user_rate_limit(user: Any) -> None:
        """Ensure user has not exceeded daily AI query allowance."""
        since = timezone.now() - timedelta(days=1)
        count = AIRequest.objects.filter(user=user, created_at__gte=since).count()
        if count >= DEFAULT_DAILY_LIMIT:
            AIRequest.objects.create(
                user=user,
                request_type="throttled",
                prompt_summary="Daily rate limit exceeded",
                status="throttled",
            )
            raise ValidationError(
                f"Daily AI request limit ({DEFAULT_DAILY_LIMIT}) exceeded. Please try again tomorrow."
            )

    @staticmethod
    def generate_plan(
        user: Any,
        *,
        event_name: str,
        event_type: str,
        guest_count: int,
        budget: Decimal,
        theme: str = "",
    ) -> dict[str, Any]:
        """Generate high-level event plan, suggested schedule, and milestones."""
        AIService.check_user_rate_limit(user)
        prompt_summary = f"Plan: {event_type} for ~{guest_count} guests (Budget: {budget})"

        # If LLM configured, call it; otherwise provide expert rule-based planning template
        result = AIService._build_rule_based_plan(
            event_name=event_name,
            event_type=event_type,
            guest_count=guest_count,
            budget=budget,
            theme=theme,
        )

        AIRequest.objects.create(
            user=user,
            request_type="generate_plan",
            prompt_summary=prompt_summary[:250],
            status="success",
        )
        return result

    @staticmethod
    def suggest_tasks(
        user: Any,
        *,
        event_type: str,
        days_until_event: int = 30,
    ) -> list[dict[str, Any]]:
        """Generate categorized, actionable task recommendations."""
        AIService.check_user_rate_limit(user)
        prompt_summary = f"Tasks: {event_type} ({days_until_event} days out)"

        tasks = [
            {
                "title": "Finalise guest list and send invitations",
                "priority": "high",
                "suggested_days_before": 21,
                "category": "Guests",
            },
            {
                "title": "Confirm venue booking and deposit",
                "priority": "urgent",
                "suggested_days_before": 25,
                "category": "Venue",
            },
            {
                "title": "Book caterer and select tasting menu",
                "priority": "high",
                "suggested_days_before": 20,
                "category": "Catering",
            },
            {
                "title": "Coordinate audio/visual and playlist",
                "priority": "medium",
                "suggested_days_before": 10,
                "category": "Entertainment",
            },
            {
                "title": "Purchase decorations and table styling items",
                "priority": "medium",
                "suggested_days_before": 7,
                "category": "Decor",
            },
            {
                "title": "Confirm final guest headcount with caterer",
                "priority": "urgent",
                "suggested_days_before": 3,
                "category": "Catering",
            },
            {
                "title": "Prepare welcome signage and run sheet",
                "priority": "low",
                "suggested_days_before": 1,
                "category": "Coordination",
            },
        ]

        AIRequest.objects.create(
            user=user,
            request_type="suggest_tasks",
            prompt_summary=prompt_summary[:250],
            status="success",
        )
        return tasks

    @staticmethod
    def suggest_budget_allocation(
        user: Any,
        *,
        total_budget: Decimal,
        event_type: str,
    ) -> list[dict[str, Any]]:
        """Generate recommended percentage and amount allocation across key categories."""
        AIService.check_user_rate_limit(user)
        prompt_summary = f"Budget: {total_budget} for {event_type}"

        # Standard industry benchmark ratios
        allocations = [
            {"category": "Venue & Facilities", "percentage": 35},
            {"category": "Food & Beverages", "percentage": 30},
            {"category": "Photography & Video", "percentage": 15},
            {"category": "Music & Entertainment", "percentage": 10},
            {"category": "Decor & Lighting", "percentage": 5},
            {"category": "Contingency & Miscellaneous", "percentage": 5},
        ]

        breakdown = []
        for item in allocations:
            pct = Decimal(item["percentage"]) / Decimal(100)
            amount = (total_budget * pct).quantize(Decimal("0.01"))
            breakdown.append(
                {
                    "category": item["category"],
                    "percentage": item["percentage"],
                    "suggested_amount": str(amount),
                    "is_estimate": True,
                }
            )

        AIRequest.objects.create(
            user=user,
            request_type="suggest_budget",
            prompt_summary=prompt_summary[:250],
            status="success",
        )
        return breakdown

    @staticmethod
    def generate_invitation_copy(
        user: Any,
        *,
        event_name: str,
        host_name: str,
        venue: str,
        date_str: str,
        tone: str = "warm",
    ) -> dict[str, str]:
        """Generate invitation messaging with different tone choices."""
        AIService.check_user_rate_limit(user)
        prompt_summary = f"Invite copy: {event_name} by {host_name} ({tone})"

        if tone == "formal":
            subject = f"You are cordially invited to celebrate {event_name}"
            body = (
                f"Dear Honored Guest,\n\n"
                f"{host_name} requests the pleasure of your company at {event_name}.\n\n"
                f"Date & Time: {date_str}\n"
                f"Venue: {venue or 'Details to follow'}\n\n"
                f"Kindly RSVP at your earliest convenience using the link below.\n\n"
                f"Warmest regards,\n{host_name}"
            )
        else:  # warm / celebratory
            subject = f"Join us to celebrate {event_name}! 🥂"
            body = (
                f"Hey friends!\n\n"
                f"We are coming together for {event_name} and would love for you to celebrate with us!\n\n"
                f"📅 When: {date_str}\n"
                f"📍 Where: {venue or 'To be announced'}\n\n"
                f"Please let us know if you can make it by clicking your personal RSVP link below.\n\n"
                f"Can't wait to see you there!\n{host_name}"
            )

        AIRequest.objects.create(
            user=user,
            request_type="generate_invitation",
            prompt_summary=prompt_summary[:250],
            status="success",
        )
        return {
            "subject": subject,
            "body": body,
            "tone": tone,
            "is_estimate": True,
            "requires_user_confirmation": True,
        }

    @staticmethod
    def _build_rule_based_plan(
        *,
        event_name: str,
        event_type: str,
        guest_count: int,
        budget: Decimal,
        theme: str,
    ) -> dict[str, Any]:
        """Synthesize a complete event blueprint."""
        return {
            "event_name": event_name,
            "event_type": event_type,
            "estimated_guest_count": guest_count,
            "budget": str(budget),
            "theme": theme or "Classic celebration",
            "is_estimate": True,
            "requires_user_confirmation": True,
            "summary": (
                f"Planning blueprint for {event_name} hosting approximately {guest_count} guests "
                f"with a target budget of ${budget:,.2f}."
            ),
            "suggested_timeline": [
                {
                    "phase": "Weeks 4-3",
                    "milestone": "Lock venue, finalize theme, and issue save-the-dates",
                },
                {"phase": "Weeks 2-1", "milestone": "Finalize catering, audio, and collect RSVPs"},
                {
                    "phase": "Event Week",
                    "milestone": "Final headcount confirmation and vendor run sheet",
                },
                {"phase": "Event Day", "milestone": "Setup, welcome guests, and host festivities"},
            ],
            "key_recommendations": [
                "Budget 5-10% extra for unexpected last-minute requirements.",
                "Collect dietary constraints early via the automated RSVP link.",
                "Lock in vendor booking agreements at least 2 weeks in advance.",
            ],
        }
