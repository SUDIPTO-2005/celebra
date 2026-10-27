"""
Tasks app – URL routing.
"""

from django.urls import path

from . import views

app_name = "tasks"

urlpatterns = [
    path("<uuid:event_id>/", views.TaskListCreateView.as_view(), name="task-list-create"),
    path("<uuid:event_id>/<uuid:pk>/", views.TaskDetailView.as_view(), name="task-detail"),
    path(
        "<uuid:event_id>/schedule/",
        views.ScheduleListCreateView.as_view(),
        name="schedule-list-create",
    ),
    path(
        "<uuid:event_id>/schedule/<uuid:pk>/",
        views.ScheduleDetailView.as_view(),
        name="schedule-detail",
    ),
    path(
        "<uuid:event_id>/schedule-conflicts/",
        views.ScheduleConflictView.as_view(),
        name="schedule-conflicts",
    ),
]
