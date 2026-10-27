"""
Accounts app – business logic (services layer).
"""

from __future__ import annotations

import logging
from typing import Any

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.http import HttpRequest
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

User = get_user_model()
logger = logging.getLogger(__name__)


class AuthService:
    """Encapsulates authentication-related business logic."""

    # ── Registration ────────────────────────────

    @staticmethod
    def register(*, email: str, password: str, **extra_fields: Any) -> User:
        """Create a new user account and return the user instance."""
        extra_fields.pop("password_confirm", None)
        user = User.objects.create_user(
            email=email,
            password=password,
            **extra_fields,
        )
        logger.info("New user registered: %s", user.email)
        return user

    # ── Login / Logout ──────────────────────────

    @staticmethod
    def login(request: HttpRequest, *, email: str, password: str) -> User | None:
        """
        Authenticate and log the user in via Django sessions.
        Returns the user on success, ``None`` on failure.
        """
        user = authenticate(request, email=email, password=password)
        if user is None:
            logger.warning("Failed login attempt for %s", email)
            return None
        login(request, user)
        logger.info("User logged in: %s", user.email)
        return user

    @staticmethod
    def logout(request: HttpRequest) -> None:
        """Log the current user out."""
        logout(request)

    # ── Password Reset ──────────────────────────

    @staticmethod
    def request_password_reset(*, email: str) -> None:
        """
        Send a password-reset email if the account exists.

        Always returns successfully to avoid leaking user-existence info.
        """
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Silently return – do not reveal whether the email exists.
            return

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # In a real deployment, build a front-end URL.
        reset_link = f"https://celebra.app/reset-password?uid={uid}&token={token}"

        send_mail(
            subject="Celebra – Password Reset",
            message=f"Use this link to reset your password:\n\n{reset_link}",
            from_email=None,  # uses DEFAULT_FROM_EMAIL
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info("Password-reset email sent to %s", user.email)

    @staticmethod
    def confirm_password_reset(*, uid: str, token: str, new_password: str) -> bool:
        """
        Verify the token and set the new password.
        Returns ``True`` on success, ``False`` on invalid token/uid.
        """
        try:
            user_pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_pk)
        except (User.DoesNotExist, ValueError, OverflowError):
            return False

        if not default_token_generator.check_token(user, token):
            return False

        user.set_password(new_password)
        user.save(update_fields=["password"])
        logger.info("Password reset for %s", user.email)
        return True
