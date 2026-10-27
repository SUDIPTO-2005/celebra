"""
Events app – URL routing.
"""

from django.urls import path

from . import views

app_name = "events"

urlpatterns = [
    path("", views.EventListCreateView.as_view(), name="event-list-create"),
    path("<uuid:pk>/", views.EventDetailView.as_view(), name="event-detail"),
    path("<uuid:pk>/duplicate/", views.EventDuplicateView.as_view(), name="event-duplicate"),
    path("<uuid:pk>/cancel/", views.EventCancelView.as_view(), name="event-cancel"),
    path("<uuid:pk>/transition/", views.EventTransitionView.as_view(), name="event-transition"),
    path("<uuid:pk>/members/", views.EventMemberListCreateView.as_view(), name="event-members"),
    path(
        "<uuid:pk>/members/<uuid:member_id>/",
        views.EventMemberDeleteView.as_view(),
        name="event-member-delete",
    ),
]
