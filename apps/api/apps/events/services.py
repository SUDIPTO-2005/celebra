"""
Events app – business logic and lifecycle service.
"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from .models import Event, EventMember, EventStatus, MemberRole

logger = logging.getLogger(__name__)

# Valid state transitions
VALID_TRANSITIONS: dict[str, set[str]] = {
    EventStatus.DRAFT: {EventStatus.PLANNING, EventStatus.CANCELLED},
    EventStatus.PLANNING: {EventStatus.CONFIRMED, EventStatus.CANCELLED, EventStatus.DRAFT},
    EventStatus.CONFIRMED: {EventStatus.COMPLETED, EventStatus.CANCELLED, EventStatus.PLANNING},
    EventStatus.COMPLETED: set(),  # terminal
    EventStatus.CANCELLED: {EventStatus.DRAFT},  # can reopen as draft
}


class EventService:
    """Service layer for Event management and lifecycle."""

    @staticmethod
    @transaction.atomic
    def create_event(
        *,
        owner: Any,
        name: str,
        start_date: Any,
        end_date: Any,
        description: str = "",
        event_type: str = "celebration",
        venue: str = "",
        timezone: str = "UTC",
        budget: Decimal = Decimal("0.00"),
        currency: str = "USD",
        status: str = EventStatus.DRAFT,
    ) -> Event:
        """Create a new event and register the owner as an EventMember."""
        if end_date < start_date:
            raise ValidationError("End date cannot be earlier than start date.")
        if budget < Decimal("0.00"):
            raise ValidationError("Budget cannot be negative.")

        event = Event.objects.create(
            owner=owner,
            name=name,
            description=description,
            event_type=event_type,
            venue=venue,
            start_date=start_date,
            end_date=end_date,
            timezone=timezone,
            budget=budget,
            currency=currency,
            status=status,
        )
        # Create owner membership
        EventMember.objects.create(
            event=event,
            user=owner,
            role=MemberRole.OWNER,
        )
        logger.info("Created event %s (id: %s) by %s", event.name, event.id, owner.email)
        return event

    @staticmethod
    def update_event(event: Event, user: Any, **fields: Any) -> Event:
        """Update event details. User must be owner or cohost."""
        EventService.check_member_permission(event, user)

        if "end_date" in fields or "start_date" in fields:
            start = fields.get("start_date", event.start_date)
            end = fields.get("end_date", event.end_date)
            if end < start:
                raise ValidationError("End date cannot be earlier than start date.")

        if "budget" in fields and fields["budget"] < Decimal("0.00"):
            raise ValidationError("Budget cannot be negative.")

        if "status" in fields:
            new_status = fields.pop("status")
            EventService.transition_status(event, new_status, user)

        for attr, val in fields.items():
            setattr(event, attr, val)

        event.full_clean()
        event.save()
        logger.info("Updated event %s by %s", event.id, user.email)
        return event

    @staticmethod
    def transition_status(event: Event, new_status: str, user: Any) -> Event:
        """Enforce server-side lifecycle state machine transitions."""
        EventService.check_member_permission(event, user)

        current = event.status
        if current == new_status:
            return event

        allowed = VALID_TRANSITIONS.get(current, set())
        if new_status not in allowed:
            raise ValidationError(
                f"Invalid transition from '{current}' to '{new_status}'. Allowed: {sorted(allowed)}"
            )

        event.status = new_status
        event.save(update_fields=["status", "updated_at"])
        logger.info(
            "Event %s transitioned from %s to %s by %s", event.id, current, new_status, user.email
        )
        return event

    @staticmethod
    def cancel_event(event: Event, user: Any) -> Event:
        """Cancel an event."""
        return EventService.transition_status(event, EventStatus.CANCELLED, user)

    @staticmethod
    def delete_event(event: Event, user: Any) -> None:
        """Only the owner can delete an event."""
        if event.owner != user:
            raise PermissionDenied("Only the event owner can delete this event.")
        event_id = event.id
        event.delete()
        logger.info("Deleted event %s by %s", event_id, user.email)

    @staticmethod
    @transaction.atomic
    def duplicate_event(event: Event, user: Any, new_name: str | None = None) -> Event:
        """Duplicate an existing event into a new draft event."""
        EventService.check_member_permission(event, user)

        clone = Event.objects.create(
            owner=user,
            name=new_name or f"Copy of {event.name}",
            description=event.description,
            event_type=event.event_type,
            venue=event.venue,
            start_date=event.start_date,
            end_date=event.end_date,
            timezone=event.timezone,
            budget=event.budget,
            currency=event.currency,
            status=EventStatus.DRAFT,
        )
        EventMember.objects.create(event=clone, user=user, role=MemberRole.OWNER)

        # Clone budget categories if present
        for cat in event.budget_categories.all():
            cat.__class__.objects.create(
                event=clone,
                name=cat.name,
                estimated_amount=cat.estimated_amount,
            )

        # Clone tasks without completion status
        for task in event.tasks.all():
            task.__class__.objects.create(
                event=clone,
                title=task.title,
                description=task.description,
                priority=task.priority,
                status="todo",
                due_date=task.due_date,
            )

        logger.info("Duplicated event %s -> %s by %s", event.id, clone.id, user.email)
        return clone

    @staticmethod
    def add_member(
        event: Event, owner: Any, user_to_add: Any, role: str = MemberRole.COHOST
    ) -> EventMember:
        """Add a cohost to an event. Only owner can add members."""
        if event.owner != owner:
            raise PermissionDenied("Only the event owner can add collaborators.")
        if EventMember.objects.filter(event=event, user=user_to_add).exists():
            raise ValidationError("This user is already a member of the event.")

        member = EventMember.objects.create(event=event, user=user_to_add, role=role)
        logger.info("Added member %s as %s to event %s", user_to_add.email, role, event.id)
        return member

    @staticmethod
    def remove_member(event: Event, owner: Any, member_id: Any) -> None:
        """Remove a collaborator from an event. Only owner can remove members."""
        if event.owner != owner:
            raise PermissionDenied("Only the event owner can remove collaborators.")
        member = EventMember.objects.get(id=member_id, event=event)
        if member.user == event.owner:
            raise ValidationError("Cannot remove the event owner.")
        member.delete()
        logger.info("Removed member %s from event %s", member_id, event.id)

    @staticmethod
    def check_member_permission(event: Event, user: Any) -> EventMember | None:
        """Verify the user is an owner or member of the event."""
        if event.owner == user:
            return None
        try:
            return EventMember.objects.get(event=event, user=user)
        except EventMember.DoesNotExist:
            raise PermissionDenied("You do not have access to this event.")
