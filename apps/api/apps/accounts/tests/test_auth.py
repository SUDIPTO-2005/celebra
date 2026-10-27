"""
Comprehensive authentication, registration, login, logout, password-reset, session, and CSRF tests.
"""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_data():
    return {
        "email": "tester@example.com",
        "password": "SuperSecretPassword123!",
        "password_confirm": "SuperSecretPassword123!",
        "first_name": "Test",
        "last_name": "User",
    }


@pytest.mark.django_db
class TestAuthenticationFlow:
    def test_registration_success(self, api_client, user_data):
        url = reverse("accounts:register")
        response = api_client.post(url, user_data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["email"] == "tester@example.com"
        assert User.objects.filter(email="tester@example.com").exists()

    def test_registration_duplicate_email_fails(self, api_client, user_data):
        url = reverse("accounts:register")
        api_client.post(url, user_data, format="json")
        response = api_client.post(url, user_data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data

    def test_registration_password_mismatch_fails(self, api_client, user_data):
        url = reverse("accounts:register")
        user_data["password_confirm"] = "DifferentPassword123!"
        response = api_client.post(url, user_data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_success(self, api_client, user_data):
        User.objects.create_user(
            email=user_data["email"],
            password=user_data["password"],
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
        )
        url = reverse("accounts:login")
        response = api_client.post(
            url,
            {"email": user_data["email"], "password": user_data["password"]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert "csrftoken" in response.data
        assert response.data["email"] == user_data["email"]

    def test_login_invalid_password_returns_generic_error(self, api_client, user_data):
        User.objects.create_user(
            email=user_data["email"],
            password=user_data["password"],
        )
        url = reverse("accounts:login")
        response = api_client.post(
            url,
            {"email": user_data["email"], "password": "WrongPassword123!"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["detail"] == "Invalid email or password."

    def test_login_nonexistent_email_returns_generic_error(self, api_client):
        url = reverse("accounts:login")
        response = api_client.post(
            url,
            {"email": "nobody@example.com", "password": "Password123!"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["detail"] == "Invalid email or password."

    def test_logout(self, api_client, user_data):
        user = User.objects.create_user(
            email=user_data["email"],
            password=user_data["password"],
        )
        api_client.force_authenticate(user=user)
        url = reverse("accounts:logout")
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK

    def test_me_endpoint_authenticated(self, api_client, user_data):
        user = User.objects.create_user(
            email=user_data["email"],
            password=user_data["password"],
            first_name="Jane",
            last_name="Doe",
        )
        api_client.force_authenticate(user=user)
        url = reverse("accounts:me")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == user.email
        assert response.data["full_name"] == "Jane Doe"

    def test_me_endpoint_unauthenticated_fails(self, api_client):
        url = reverse("accounts:me")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_password_reset_request_silent_on_nonexistent(self, api_client):
        url = reverse("accounts:password-reset")
        response = api_client.post(url, {"email": "ghost@example.com"}, format="json")
        assert response.status_code == status.HTTP_200_OK
