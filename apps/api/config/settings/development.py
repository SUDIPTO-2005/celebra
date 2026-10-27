"""
Celebra – development settings.
"""

from .base import *  # noqa: F401, F403

# ──────────────────────────────────────────────
# Core
# ──────────────────────────────────────────────
DEBUG = True

# Accept any host in development
ALLOWED_HOSTS = ["*"]

# ──────────────────────────────────────────────
# Email – console backend for dev
# ──────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# ──────────────────────────────────────────────
# CORS & CSRF – allow local front-end by default
# ──────────────────────────────────────────────
_default_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

CORS_ALLOWED_ORIGINS = (  # type: ignore[assignment]
    CORS_ALLOWED_ORIGINS or _default_origins  # noqa: F405
)

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# ──────────────────────────────────────────────
# Throttling – relaxed for development
# ──────────────────────────────────────────────
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "anon": "200/minute",
    "user": "600/minute",
    "auth": "60/minute",
}

# ──────────────────────────────────────────────
# Rate-limit overrides
# ──────────────────────────────────────────────
RATELIMIT_AUTH_REGISTER = "60/m"  # noqa: F811
RATELIMIT_AUTH_LOGIN = "60/m"  # noqa: F811
RATELIMIT_AUTH_PASSWORD_RESET = "60/m"  # noqa: F811
