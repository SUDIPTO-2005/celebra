"""
Celebra – root URL configuration with API versioning and database-aware health check.
"""

from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)


def health_check(request):
    """Database-aware health-check endpoint."""
    db_ok = True
    db_error = None
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as exc:
        db_ok = False
        db_error = str(exc)

    status_code = 200 if db_ok else 503
    return JsonResponse(
        {
            "status": "ok" if db_ok else "degraded",
            "database": "ok" if db_ok else "error",
            "error": db_error,
        },
        status=status_code,
    )


urlpatterns = [
    # ── Admin ──────────────────────────────────
    path("admin/", admin.site.urls),
    # ── Health / docs ──────────────────────────
    path("api/health/", health_check, name="health-check"),
    path("api/v1/health/", health_check, name="health-check-v1"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema-v1"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(url_name="schema-v1"),
        name="swagger-ui-v1",
    ),
    # ── API (Standard) ─────────────────────────
    path("api/auth/", include("apps.accounts.urls")),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/events/", include("apps.events.urls")),
    path("api/guests/", include("apps.guests.urls")),
    path("api/budget/", include("apps.budget.urls")),
    path("api/tasks/", include("apps.tasks.urls")),
    path("api/vendors/", include("apps.vendors.urls")),
    path("api/ai/", include("apps.ai.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    # ── API v1 ─────────────────────────────────
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/accounts/", include("apps.accounts.urls")),
    path("api/v1/events/", include("apps.events.urls")),
    path("api/v1/guests/", include("apps.guests.urls")),
    path("api/v1/budget/", include("apps.budget.urls")),
    path("api/v1/tasks/", include("apps.tasks.urls")),
    path("api/v1/vendors/", include("apps.vendors.urls")),
    path("api/v1/ai/", include("apps.ai.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
]
