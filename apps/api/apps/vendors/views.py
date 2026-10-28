"""
Vendors app – API views.
"""

from django.core.cache import cache
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.views import get_user_event

from .models import Booking, QuoteRequest, Vendor
from .serializers import (
    BookingCreateSerializer,
    BookingSerializer,
    BookingUpdateSerializer,
    QuoteRequestSerializer,
    QuoteRequestUpdateSerializer,
    VendorSerializer,
)
from .services import VendorService


class VendorListView(APIView):
    """GET /api/vendors/ – list vendors directory with in-memory caching."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        category = request.query_params.get("category")
        search = request.query_params.get("search")

        cache_key = f"vendors_dir_{category or 'all'}_{search or 'all'}"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        vendors = VendorService.list_vendors(category=category, search=search)
        data = VendorSerializer(vendors, many=True).data
        cache.set(cache_key, data, timeout=60)
        return Response(data)


class VendorDetailView(APIView):
    """GET /api/vendors/{pk}/ – view vendor profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: str) -> Response:
        try:
            vendor = Vendor.objects.get(id=pk)
        except Vendor.DoesNotExist:
            raise NotFound("Vendor not found.")
        return Response(VendorSerializer(vendor).data)


class QuoteRequestListCreateView(APIView):
    """GET /api/vendors/events/{event_id}/quotes/ and POST /api/vendors/events/{event_id}/quotes/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        quotes = event.quote_requests.select_related("vendor").all()
        return Response(QuoteRequestSerializer(quotes, many=True).data)

    def post(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        vendor_id = request.data.get("vendor_id")
        details = request.data.get("details", "")
        try:
            vendor = Vendor.objects.get(id=vendor_id)
        except Vendor.DoesNotExist:
            raise NotFound("Vendor not found.")

        quote = VendorService.create_quote_request(
            event=event,
            vendor=vendor,
            user=request.user,
            details=details,
        )
        return Response(QuoteRequestSerializer(quote).data, status=status.HTTP_201_CREATED)


class QuoteRequestDetailView(APIView):
    """GET, PATCH, DELETE /api/vendors/events/{event_id}/quotes/{pk}/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            quote = event.quote_requests.select_related("vendor").get(id=pk)
        except QuoteRequest.DoesNotExist:
            raise NotFound("Quote request not found.")
        return Response(QuoteRequestSerializer(quote).data)

    def patch(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            quote = event.quote_requests.get(id=pk)
        except QuoteRequest.DoesNotExist:
            raise NotFound("Quote request not found.")

        serializer = QuoteRequestUpdateSerializer(quote, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = VendorService.update_quote_status(
            quote=quote,
            user=request.user,
            status=serializer.validated_data.get("status", quote.status),
            quoted_amount=serializer.validated_data.get("quoted_amount"),
        )
        return Response(QuoteRequestSerializer(updated).data)


class BookingListCreateView(APIView):
    """GET /api/vendors/events/{event_id}/bookings/ and POST /api/vendors/events/{event_id}/bookings/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        bookings = event.bookings.select_related("vendor").all()
        return Response(BookingSerializer(bookings, many=True).data)

    def post(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        vendor_id = serializer.validated_data["vendor_id"]
        try:
            vendor = Vendor.objects.get(id=vendor_id)
        except Vendor.DoesNotExist:
            raise NotFound("Vendor not found.")

        booking = VendorService.create_booking(
            event=event,
            vendor=vendor,
            user=request.user,
            start_time=serializer.validated_data["start_time"],
            end_time=serializer.validated_data["end_time"],
            amount=serializer.validated_data.get("amount", 0),
            status=serializer.validated_data.get("status", "draft"),
        )
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)


class BookingDetailView(APIView):
    """GET, PATCH, DELETE /api/vendors/events/{event_id}/bookings/{pk}/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            booking = event.bookings.select_related("vendor").get(id=pk)
        except Booking.DoesNotExist:
            raise NotFound("Booking not found.")
        return Response(BookingSerializer(booking).data)

    def patch(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            booking = event.bookings.get(id=pk)
        except Booking.DoesNotExist:
            raise NotFound("Booking not found.")

        serializer = BookingUpdateSerializer(booking, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = VendorService.update_booking(booking, request.user, **serializer.validated_data)
        return Response(BookingSerializer(updated).data)


class BookingCancelView(APIView):
    """POST /api/vendors/events/{event_id}/bookings/{pk}/cancel/"""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            booking = event.bookings.get(id=pk)
        except Booking.DoesNotExist:
            raise NotFound("Booking not found.")

        cancelled = VendorService.cancel_booking(booking, request.user)
        return Response(BookingSerializer(cancelled).data)
