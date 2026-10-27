"""
Vendors app – URL routing.
"""

from django.urls import path

from . import views

app_name = "vendors"

urlpatterns = [
    # Global directory
    path("", views.VendorListView.as_view(), name="vendor-list"),
    path("<uuid:pk>/", views.VendorDetailView.as_view(), name="vendor-detail"),
    # Event-nested quotes
    path(
        "events/<uuid:event_id>/quotes/",
        views.QuoteRequestListCreateView.as_view(),
        name="quote-list-create",
    ),
    path(
        "events/<uuid:event_id>/quotes/<uuid:pk>/",
        views.QuoteRequestDetailView.as_view(),
        name="quote-detail",
    ),
    # Event-nested bookings
    path(
        "events/<uuid:event_id>/bookings/",
        views.BookingListCreateView.as_view(),
        name="booking-list-create",
    ),
    path(
        "events/<uuid:event_id>/bookings/<uuid:pk>/",
        views.BookingDetailView.as_view(),
        name="booking-detail",
    ),
    path(
        "events/<uuid:event_id>/bookings/<uuid:pk>/cancel/",
        views.BookingCancelView.as_view(),
        name="booking-cancel",
    ),
]
