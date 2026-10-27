"""
Events app – API views.
"""

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination

from .models import Event
from .serializers import (
    AddMemberSerializer,
    DuplicateEventSerializer,
    EventCreateSerializer,
    EventMemberSerializer,
    EventSerializer,
    EventUpdateSerializer,
    TransitionStatusSerializer,
)
from .services import EventService

User = get_user_model()


def get_user_event(event_id: str, user) -> Event:
    """Retrieve event ensuring the user is either the owner or a member."""
    try:
        return (
            Event.objects.filter(Q(owner=user) | Q(memberships__user=user))
            .distinct()
            .get(id=event_id)
        )
    except (Event.DoesNotExist, ValueError):
        raise NotFound("Event not found or you do not have permission to access it.")


class EventListCreateView(APIView):
    """GET /api/events/ - list user's events; POST /api/events/ - create event."""

    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get(self, request: Request) -> Response:
        events = (
            Event.objects.filter(Q(owner=request.user) | Q(memberships__user=request.user))
            .distinct()
            .select_related("owner")
            .prefetch_related("memberships__user")
            .order_by("-start_date", "-created_at")
        )

        status_param = request.query_params.get("status")
        if status_param:
            events = events.filter(status=status_param)

        search_param = request.query_params.get("search")
        if search_param:
            events = events.filter(
                Q(name__icontains=search_param)
                | Q(description__icontains=search_param)
                | Q(venue__icontains=search_param)
            )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(events, request)
        serializer = EventSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request: Request) -> Response:
        serializer = EventCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = EventService.create_event(
            owner=request.user,
            **serializer.validated_data,
        )
        return Response(
            EventSerializer(event, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class EventDetailView(APIView):
    """GET /api/events/{id}/, PUT/PATCH /api/events/{id}/, DELETE /api/events/{id}/."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: str) -> Response:
        event = get_user_event(pk, request.user)
        serializer = EventSerializer(event, context={"request": request})
        return Response(serializer.data)

    def patch(self, request: Request, pk: str) -> Response:
        event = get_user_event(pk, request.user)
        serializer = EventUpdateSerializer(event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = EventService.update_event(
            event=event,
            user=request.user,
            **serializer.validated_data,
        )
        return Response(EventSerializer(updated, context={"request": request}).data)

    def put(self, request: Request, pk: str) -> Response:
        return self.patch(request, pk)

    def delete(self, request: Request, pk: str) -> Response:
        event = get_user_event(pk, request.user)
        EventService.delete_event(event=event, user=request.user)
        return Response(
            {"detail": "Event deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class EventDuplicateView(APIView):
    """POST /api/events/{id}/duplicate/"""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: str) -> Response:
        event = get_user_event(pk, request.user)
        serializer = DuplicateEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_name = serializer.validated_data.get("name") or None
        clone = EventService.duplicate_event(event, request.user, new_name=new_name)
        return Response(
            EventSerializer(clone, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class EventCancelView(APIView):
    """POST /api/events/{id}/cancel/"""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: str) -> Response:
        event = get_user_event(pk, request.user)
        cancelled = EventService.cancel_event(event, request.user)
        return Response(EventSerializer(cancelled, context={"request": request}).data)


class EventTransitionView(APIView):
    """POST /api/events/{id}/transition/"""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: str) -> Response:
        event = get_user_event(pk, request.user)
        serializer = TransitionStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = EventService.transition_status(
            event=event,
            new_status=serializer.validated_data["status"],
            user=request.user,
        )
        return Response(EventSerializer(updated, context={"request": request}).data)


class EventMemberListCreateView(APIView):
    """GET /api/events/{id}/members/ and POST /api/events/{id}/members/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: str) -> Response:
        event = get_user_event(pk, request.user)
        members = event.memberships.select_related("user").all()
        return Response(EventMemberSerializer(members, many=True).data)

    def post(self, request: Request, pk: str) -> Response:
        event = get_user_event(pk, request.user)
        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        role = serializer.validated_data.get("role", "cohost")
        try:
            target_user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise NotFound("No user found with this email address.")

        member = EventService.add_member(event, request.user, target_user, role=role)
        return Response(EventMemberSerializer(member).data, status=status.HTTP_201_CREATED)


class EventMemberDeleteView(APIView):
    """DELETE /api/events/{id}/members/{member_id}/"""

    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, pk: str, member_id: str) -> Response:
        event = get_user_event(pk, request.user)
        EventService.remove_member(event, request.user, member_id)
        return Response(
            {"detail": "Member removed successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )
