"""
Budget app – URL routing.
"""

from django.urls import path

from . import views

app_name = "budget"

urlpatterns = [
    path(
        "<uuid:event_id>/categories/",
        views.BudgetCategoryListCreateView.as_view(),
        name="category-list-create",
    ),
    path(
        "<uuid:event_id>/categories/<uuid:pk>/",
        views.BudgetCategoryDetailView.as_view(),
        name="category-detail",
    ),
    path(
        "<uuid:event_id>/expenses/",
        views.ExpenseListCreateView.as_view(),
        name="expense-list-create",
    ),
    path(
        "<uuid:event_id>/expenses/<uuid:pk>/",
        views.ExpenseDetailView.as_view(),
        name="expense-detail",
    ),
    path("<uuid:event_id>/summary/", views.BudgetSummaryView.as_view(), name="budget-summary"),
]
