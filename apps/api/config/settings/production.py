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

# Parse ALLOWED_HOSTS from env, plus automatic Render hostname support
_raw_hosts = os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",")
ALLOWED_HOSTS = [h.strip() for h in _raw_hosts if h.strip()]

render_host = os.getenv("RENDER_EXTERNAL_HOSTNAME")
if render_host and render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_host)

if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = [".onrender.com", "localhost", "127.0.0.1"]

# ──────────────────────────────────────────────
# Reverse Proxy & SSL (Crucial for Render load balancer)
# ──────────────────────────────────────────────
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True").lower() in (
    "true",
    "1",
    "yes",
)

# ──────────────────────────────────────────────
# CORS & CSRF (Configured for cross-origin Vercel frontend)
# ──────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL_ORIGINS", "False").lower() in (
    "true",
    "1",
    "yes",
)
CORS_ALLOW_CREDENTIALS = True

# Allow all Vercel deployment preview URLs by regex
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https:\/\/.*\.vercel\.app$",
]

# Ensure Vercel domains are trusted for CSRF and CORS
for default_vercel_origin in ["https://*.vercel.app", "https://celebra-eight.vercel.app"]:
    if default_vercel_origin not in CSRF_TRUSTED_ORIGINS:  # noqa: F405
        CSRF_TRUSTED_ORIGINS.append(default_vercel_origin)  # noqa: F405
    if default_vercel_origin not in CORS_ALLOWED_ORIGINS:  # noqa: F405
        CORS_ALLOWED_ORIGINS.append(default_vercel_origin)  # noqa: F405

# Ensure Render host is in CSRF trusted origins
if render_host:
    render_origin = f"https://{render_host}"
    if render_origin not in CSRF_TRUSTED_ORIGINS:  # noqa: F405
        CSRF_TRUSTED_ORIGINS.append(render_origin)  # noqa: F405

# ──────────────────────────────────────────────
# Secure cookies (SameSite=None required for cross-domain Vercel <-> Render)
# ──────────────────────────────────────────────
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False  # False so frontend can read CSRF token
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "None")
CSRF_COOKIE_SAMESITE = os.getenv("CSRF_COOKIE_SAMESITE", "None")

# ──────────────────────────────────────────────
# Static files (WhiteNoise)
# ──────────────────────────────────────────────
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

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
