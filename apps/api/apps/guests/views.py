"""
Guests app – API views.
"""

from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.events.views import get_user_event

from .models import Guest
from .serializers import (
    GuestCreateUpdateSerializer,
    GuestSerializer,
    PublicRSVPSubmitSerializer,
    RSVPSerializer,
)
from .services import GuestService


class GuestListCreateView(APIView):
    """GET /api/events/{event_id}/guests/ and POST /api/events/{event_id}/guests/"""

    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        guests = event.guests.select_related("rsvp", "invite_token").all()

        search = request.query_params.get("search")
        if search:
            guests = guests.filter(Q(name__icontains=search) | Q(email__icontains=search))

        rsvp_status = request.query_params.get("rsvp")
        if rsvp_status == "pending":
            guests = guests.filter(rsvp__isnull=True)
        elif rsvp_status in ["yes", "no", "maybe"]:
            guests = guests.filter(rsvp__response=rsvp_status)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(guests, request)
        serializer = GuestSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        serializer = GuestCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        guest = GuestService.add_guest(
            event=event,
            user=request.user,
            **serializer.validated_data,
        )
        return Response(GuestSerializer(guest).data, status=status.HTTP_201_CREATED)


class GuestDetailView(APIView):
    """GET, PATCH, DELETE /api/events/{event_id}/guests/{pk}/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            guest = event.guests.select_related("rsvp", "invite_token").get(id=pk)
        except Guest.DoesNotExist:
            raise NotFound("Guest not found.")
        return Response(GuestSerializer(guest).data)

    def patch(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            guest = event.guests.get(id=pk)
        except Guest.DoesNotExist:
            raise NotFound("Guest not found.")

        serializer = GuestCreateUpdateSerializer(guest, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = GuestService.update_guest(guest, request.user, **serializer.validated_data)
        return Response(GuestSerializer(updated).data)

    def delete(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            guest = event.guests.get(id=pk)
        except Guest.DoesNotExist:
            raise NotFound("Guest not found.")

        GuestService.delete_guest(guest, request.user)
        return Response(
            {"detail": "Guest deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class GuestGenerateTokenView(APIView):
    """POST /api/events/{event_id}/guests/{pk}/invite-token/"""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            guest = event.guests.get(id=pk)
        except Guest.DoesNotExist:
            raise NotFound("Guest not found.")

        invite_token, raw_token = GuestService.generate_invite_token(guest, request.user)
        invite_url = f"/rsvp?token={raw_token}"
        return Response(
            {
                "token": raw_token,
                "invite_url": invite_url,
                "expires_at": invite_token.expires_at,
            },
            status=status.HTTP_200_OK,
        )


class GuestRevokeTokenView(APIView):
    """POST /api/events/{event_id}/guests/{pk}/revoke-token/"""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            guest = event.guests.select_related("invite_token").get(id=pk)
        except Guest.DoesNotExist:
            raise NotFound("Guest not found.")

        GuestService.revoke_invite_token(guest, request.user)
        return Response({"detail": "Invite token revoked successfully."}, status=status.HTTP_200_OK)


class GuestCSVImportView(APIView):
    """POST /api/events/{event_id}/guests/import-csv/"""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        csv_file = request.FILES.get("file")
        if not csv_file:
            raise ValidationError({"file": "No CSV file was uploaded."})

        result = GuestService.import_guests_csv(event, request.user, csv_file)
        return Response(result, status=status.HTTP_200_OK)


class EventRSVPSummaryView(APIView):
    """GET /api/events/{event_id}/rsvp-summary/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        summary = GuestService.get_rsvp_summary(event, request.user)
        return Response(summary)


class PublicRSVPView(APIView):
    """
    Public endpoint for guests responding to an invite.
    GET /api/guests/rsvp/?token=<raw_token> -> fetch event details & current rsvp
    POST /api/guests/rsvp/ -> submit rsvp
    """

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def get(self, request: Request) -> Response:
        raw_token = request.query_params.get("token")
        if not raw_token:
            return Response(
                {"detail": "Invitation token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        guest = GuestService.get_guest_by_raw_token(raw_token)
        event = guest.event
        rsvp = getattr(guest, "rsvp", None)

        data = {
            "guest_name": guest.name,
            "event_name": event.name,
            "event_venue": event.venue,
            "event_start_date": event.start_date,
            "event_end_date": event.end_date,
            "event_timezone": event.timezone,
            "plus_ones": guest.plus_ones,
            "dietary_requirements": guest.dietary_requirements,
            "accessibility_requirements": guest.accessibility_requirements,
            "current_response": rsvp.response if rsvp else None,
            "notes": rsvp.notes if rsvp else "",
        }
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        serializer = PublicRSVPSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rsvp = GuestService.record_rsvp(
            raw_token=serializer.validated_data["token"],
            response=serializer.validated_data["response"],
            plus_ones=serializer.validated_data.get("plus_ones"),
            notes=serializer.validated_data.get("notes", ""),
            dietary_requirements=serializer.validated_data.get("dietary_requirements"),
            accessibility_requirements=serializer.validated_data.get("accessibility_requirements"),
        )
        return Response(RSVPSerializer(rsvp).data, status=status.HTTP_200_OK)
