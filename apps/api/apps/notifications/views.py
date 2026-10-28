"""
Notifications app – API views.
"""

from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer
from .services import NotificationService


class NotificationListView(APIView):
    """GET /api/notifications/ – list user notifications."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        qs = Notification.objects.filter(user=request.user).select_related("event")
        unread_only = request.query_params.get("unread")
        if unread_only and unread_only.lower() in ("true", "1"):
            qs = qs.filter(is_read=False)
        return Response(NotificationSerializer(qs[:50], many=True).data)


class NotificationDetailView(APIView):
    """PATCH /api/notifications/{pk}/ – mark as read; DELETE /api/notifications/{pk}/"""

    permission_classes = [IsAuthenticated]

    def patch(self, request: Request, pk: str) -> Response:
        try:
            notif = Notification.objects.get(id=pk, user=request.user)
        except Notification.DoesNotExist:
            raise NotFound("Notification not found.")

        updated = NotificationService.mark_as_read(notif, request.user)
        return Response(NotificationSerializer(updated).data)

    def delete(self, request: Request, pk: str) -> Response:
        try:
            notif = Notification.objects.get(id=pk, user=request.user)
        except Notification.DoesNotExist:
            raise NotFound("Notification not found.")

        notif.delete()
        return Response({"detail": "Notification removed."}, status=status.HTTP_204_NO_CONTENT)


class NotificationMarkAllReadView(APIView):
    """POST /api/notifications/mark-all-read/"""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        count = NotificationService.mark_all_as_read(request.user)
        return Response({"marked_read_count": count}, status=status.HTTP_200_OK)


class NotificationUnreadCountView(APIView):
    """GET /api/notifications/unread-count/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread_count": count})
