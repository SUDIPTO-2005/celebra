"""
Guests app – URL routing.
"""

from django.urls import path

from . import views

app_name = "guests"

urlpatterns = [
    # Public RSVP
    path("rsvp/", views.PublicRSVPView.as_view(), name="public-rsvp"),
    # Event-scoped guest endpoints
    path("<uuid:event_id>/", views.GuestListCreateView.as_view(), name="guest-list-create"),
    path("<uuid:event_id>/<uuid:pk>/", views.GuestDetailView.as_view(), name="guest-detail"),
    path(
        "<uuid:event_id>/<uuid:pk>/invite-token/",
        views.GuestGenerateTokenView.as_view(),
        name="guest-invite-token",
    ),
    path(
        "<uuid:event_id>/<uuid:pk>/revoke-token/",
        views.GuestRevokeTokenView.as_view(),
        name="guest-revoke-token",
    ),
    path(
        "<uuid:event_id>/import-csv/", views.GuestCSVImportView.as_view(), name="guest-import-csv"
    ),
    path(
        "<uuid:event_id>/summary/", views.EventRSVPSummaryView.as_view(), name="guest-rsvp-summary"
    ),
]
