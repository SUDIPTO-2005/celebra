"""
AI app – API views.
"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    GenerateInviteInputSerializer,
    GeneratePlanInputSerializer,
    SuggestBudgetInputSerializer,
    SuggestTasksInputSerializer,
)
from .services import AIService


class AIStatusView(APIView):
    """GET /api/ai/status/ – check assistant readiness and operational status."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        configured = AIService.is_configured()
        return Response(
            {
                "is_configured": configured,
                "mode": "external_provider" if configured else "template_engine",
                "message": (
                    "AI external provider active."
                    if configured
                    else "Built-in expert planning templates active (core application works without external AI)."
                ),
            }
        )


class AIGeneratePlanView(APIView):
    """POST /api/ai/plan/ – generate strategic blueprint for an event."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = GeneratePlanInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = AIService.generate_plan(
            user=request.user,
            **serializer.validated_data,
        )
        return Response(plan, status=status.HTTP_200_OK)


class AISuggestTasksView(APIView):
    """POST /api/ai/tasks/ – suggest prioritized checklist."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = SuggestTasksInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tasks = AIService.suggest_tasks(
            user=request.user,
            **serializer.validated_data,
        )
        return Response({"tasks": tasks, "is_estimate": True}, status=status.HTTP_200_OK)


class AISuggestBudgetView(APIView):
    """POST /api/ai/budget/ – suggest categorical budget allocation breakdown."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = SuggestBudgetInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        breakdown = AIService.suggest_budget_allocation(
            user=request.user,
            **serializer.validated_data,
        )
        return Response(
            {
                "categories": breakdown,
                "is_estimate": True,
                "requires_user_confirmation": True,
            },
            status=status.HTTP_200_OK,
        )


class AIGenerateInviteView(APIView):
    """POST /api/ai/invite/ – generate invitation text and subject lines."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = GenerateInviteInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        copy = AIService.generate_invitation_copy(
            user=request.user,
            **serializer.validated_data,
        )
        return Response(copy, status=status.HTTP_200_OK)
