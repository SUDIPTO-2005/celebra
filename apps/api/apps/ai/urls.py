"""
AI app – URL routing.
"""

from django.urls import path

from . import views

app_name = "ai"

urlpatterns = [
    path("status/", views.AIStatusView.as_view(), name="ai-status"),
    path("plan/", views.AIGeneratePlanView.as_view(), name="ai-plan"),
    path("tasks/", views.AISuggestTasksView.as_view(), name="ai-tasks"),
    path("budget/", views.AISuggestBudgetView.as_view(), name="ai-budget"),
    path("invite/", views.AIGenerateInviteView.as_view(), name="ai-invite"),
]
