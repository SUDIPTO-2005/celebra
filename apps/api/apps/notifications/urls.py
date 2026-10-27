"""
Notifications app – URL routing.
"""

from django.urls import path

from . import views

app_name = "notifications"

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="notification-list"),
    path("<uuid:pk>/", views.NotificationDetailView.as_view(), name="notification-detail"),
    path(
        "mark-all-read/",
        views.NotificationMarkAllReadView.as_view(),
        name="notification-mark-all-read",
    ),
    path(
        "unread-count/",
        views.NotificationUnreadCountView.as_view(),
        name="notification-unread-count",
    ),
]
