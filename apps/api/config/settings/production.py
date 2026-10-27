"""
Celebra – production settings.
"""

import os

from .base import *  # noqa: F401, F403

# ──────────────────────────────────────────────
# Core
# ──────────────────────────────────────────────
DEBUG = False

if not SECRET_KEY:  # noqa: F405
    raise ValueError("DJANGO_SECRET_KEY must be set in production.")

ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",")

# ──────────────────────────────────────────────
# CORS – strict in production
# ──────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = False

# ──────────────────────────────────────────────
# Secure cookies
# ──────────────────────────────────────────────
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# ──────────────────────────────────────────────
# HSTS
# ──────────────────────────────────────────────
SECURE_HSTS_SECONDS = 31_536_000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True").lower() in (
    "true",
    "1",
    "yes",
)

# ──────────────────────────────────────────────
# Security headers
# ──────────────────────────────────────────────
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

# Content-Security-Policy (applied via middleware or reverse-proxy)
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# ──────────────────────────────────────────────
# Logging (production-grade)
# ──────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
