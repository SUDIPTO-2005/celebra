"""
Tests for the custom User model and manager.
"""

import uuid

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    """Tests for User model creation and properties."""

    def test_create_user_with_email(self):
        """A regular user can be created with email + password."""
        user = User.objects.create_user(
            email="alice@example.com",
            password="SecurePass1!",
            first_name="Alice",
            last_name="Smith",
        )
        assert user.email == "alice@example.com"
        assert user.first_name == "Alice"
        assert user.last_name == "Smith"
        assert user.is_active is True
        assert user.is_staff is False
        assert user.is_superuser is False
        assert user.check_password("SecurePass1!")

    def test_create_user_normalizes_email(self):
        """Email domain is lowercased on creation."""
        user = User.objects.create_user(
            email="Bob@EXAMPLE.COM",
            password="SecurePass1!",
        )
        assert user.email == "Bob@example.com"

    def test_create_user_without_email_raises(self):
        """Creating a user without an email must raise ValueError."""
        with pytest.raises(ValueError, match="email"):
            User.objects.create_user(email="", password="SecurePass1!")

    def test_create_superuser(self):
        """Superuser gets is_staff=True and is_superuser=True."""
        admin = User.objects.create_superuser(
            email="admin@example.com",
            password="AdminPass1!",
        )
        assert admin.is_staff is True
        assert admin.is_superuser is True

    def test_create_superuser_without_is_staff_raises(self):
        """Superuser with is_staff=False must raise ValueError."""
        with pytest.raises(ValueError, match="is_staff"):
            User.objects.create_superuser(
                email="bad@example.com",
                password="AdminPass1!",
                is_staff=False,
            )

    def test_create_superuser_without_is_superuser_raises(self):
        """Superuser with is_superuser=False must raise ValueError."""
        with pytest.raises(ValueError, match="is_superuser"):
            User.objects.create_superuser(
                email="bad@example.com",
                password="AdminPass1!",
                is_superuser=False,
            )

    def test_uuid_primary_key(self):
        """User.pk is a UUID."""
        user = User.objects.create_user(email="uuid@example.com", password="SecurePass1!")
        assert isinstance(user.pk, uuid.UUID)

    def test_str_returns_email(self):
        """__str__ returns the email."""
        user = User.objects.create_user(email="str@example.com", password="SecurePass1!")
        assert str(user) == "str@example.com"

    def test_full_name_property(self):
        """full_name joins first and last name."""
        user = User.objects.create_user(
            email="name@example.com",
            password="SecurePass1!",
            first_name="Jane",
            last_name="Doe",
        )
        assert user.full_name == "Jane Doe"

    def test_full_name_when_blank(self):
        """full_name is empty string when names are blank."""
        user = User.objects.create_user(email="blank@example.com", password="SecurePass1!")
        assert user.full_name == ""
