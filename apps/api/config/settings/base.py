"""
Celebra – base Django settings.

Environment variables are loaded from the project-root .env file.
Every deployment layer (development / production) imports * from here
and overrides what it needs.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# ──────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────
# BASE_DIR  → apps/api/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# .env lives at the repo root (four levels up from this file)
_env_path = BASE_DIR.parent.parent / ".env"
load_dotenv(_env_path)

# ──────────────────────────────────────────────
# Core
# ──────────────────────────────────────────────
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    raise ValueError(
        "DJANGO_SECRET_KEY is not set. "
        "Add it to your .env or export it as an environment variable."
    )

DEBUG = False  # overridden per-environment

ALLOWED_HOSTS: list[str] = os.getenv("DJANGO_ALLOWED_HOSTS", "*").split(",")

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"

# ──────────────────────────────────────────────
# Applications
# ──────────────────────────────────────────────
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    "django_filters",
]

CELEBRA_APPS = [
    "apps.core",
    "apps.accounts",
    "apps.events",
    "apps.guests",
    "apps.budget",
    "apps.tasks",
    "apps.vendors",
    "apps.ai",
    "apps.notifications",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + CELEBRA_APPS

# ──────────────────────────────────────────────
# Middleware
# ──────────────────────────────────────────────
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ──────────────────────────────────────────────
# Custom user model
# ──────────────────────────────────────────────
AUTH_USER_MODEL = "accounts.User"

# ──────────────────────────────────────────────
# Database (PostgreSQL via psycopg 3 or SQLite for test/local)
# ──────────────────────────────────────────────
USE_SQLITE = os.getenv("USE_SQLITE", "False").lower() in ("true", "1", "yes")

if USE_SQLITE:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
elif os.getenv("DATABASE_URL"):
    try:
        import dj_database_url
        DATABASES = {
            "default": dj_database_url.config(
                default=os.getenv("DATABASE_URL"),
                conn_max_age=600,
            )
        }
    except ImportError:
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": BASE_DIR / "db.sqlite3",
            }
        }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "celebra"),
            "USER": os.getenv("POSTGRES_USER", "celebra"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "celebra"),
            "HOST": os.getenv("POSTGRES_HOST", "localhost"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
            "OPTIONS": {
                "connect_timeout": 5,
            },
        }
    }

# ──────────────────────────────────────────────
# Password validation
# ──────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ──────────────────────────────────────────────
# Internationalisation / timezone
# ──────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ──────────────────────────────────────────────
# Static files
# ──────────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ──────────────────────────────────────────────
# Templates
# ──────────────────────────────────────────────
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ──────────────────────────────────────────────
# Django REST Framework
# ──────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.core.authentication.CsrfExemptSessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "30/minute",
        "user": "120/minute",
        "auth": "5/minute",
    },
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "rest_framework.views.exception_handler",
}

# ──────────────────────────────────────────────
# drf-spectacular (OpenAPI)
# ──────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    "TITLE": "Celebra API",
    "DESCRIPTION": "Event planning platform – backend API.",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": "/api/",
}

# ──────────────────────────────────────────────
# CORS / CSRF
# ──────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
CORS_ALLOWED_ORIGINS = [o.strip() for o in CORS_ALLOWED_ORIGINS if o.strip()]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",")
CSRF_TRUSTED_ORIGINS = [o.strip() for o in CSRF_TRUSTED_ORIGINS if o.strip()]

# ──────────────────────────────────────────────
# Email
# ──────────────────────────────────────────────
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@celebra.app")

# ──────────────────────────────────────────────
# Rate-limit keys for django-ratelimit
# ──────────────────────────────────────────────
RATELIMIT_AUTH_REGISTER = os.getenv("RATELIMIT_AUTH_REGISTER", "5/m")
RATELIMIT_AUTH_LOGIN = os.getenv("RATELIMIT_AUTH_LOGIN", "10/m")
RATELIMIT_AUTH_PASSWORD_RESET = os.getenv("RATELIMIT_AUTH_PASSWORD_RESET", "3/m")
