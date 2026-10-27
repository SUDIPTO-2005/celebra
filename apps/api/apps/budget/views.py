"""
Budget app – API views.
"""

from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.views import get_user_event

from .models import BudgetCategory, Expense
from .serializers import (
    BudgetCategoryCreateUpdateSerializer,
    BudgetCategorySerializer,
    ExpenseCreateUpdateSerializer,
    ExpenseSerializer,
)
from .services import BudgetService


class BudgetCategoryListCreateView(APIView):
    """GET /api/budget/{event_id}/categories/ and POST /api/budget/{event_id}/categories/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        categories = event.budget_categories.prefetch_related("expenses").all()
        return Response(BudgetCategorySerializer(categories, many=True).data)

    def post(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        serializer = BudgetCategoryCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = BudgetService.create_category(
            event=event,
            user=request.user,
            **serializer.validated_data,
        )
        return Response(BudgetCategorySerializer(category).data, status=status.HTTP_201_CREATED)


class BudgetCategoryDetailView(APIView):
    """GET, PATCH, DELETE /api/budget/{event_id}/categories/{pk}/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            category = event.budget_categories.prefetch_related("expenses").get(id=pk)
        except BudgetCategory.DoesNotExist:
            raise NotFound("Budget category not found.")
        return Response(BudgetCategorySerializer(category).data)

    def patch(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            category = event.budget_categories.get(id=pk)
        except BudgetCategory.DoesNotExist:
            raise NotFound("Budget category not found.")

        serializer = BudgetCategoryCreateUpdateSerializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = BudgetService.update_category(category, request.user, **serializer.validated_data)
        return Response(BudgetCategorySerializer(updated).data)

    def delete(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            category = event.budget_categories.get(id=pk)
        except BudgetCategory.DoesNotExist:
            raise NotFound("Budget category not found.")

        BudgetService.delete_category(category, request.user)
        return Response(
            {"detail": "Category deleted successfully."}, status=status.HTTP_204_NO_CONTENT
        )


class ExpenseListCreateView(APIView):
    """GET /api/budget/{event_id}/expenses/ and POST /api/budget/{event_id}/expenses/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        expenses = (
            Expense.objects.filter(category__event=event)
            .select_related("category")
            .order_by("-date", "-created_at")
        )
        category_id = request.query_params.get("category")
        if category_id:
            expenses = expenses.filter(category_id=category_id)
        return Response(ExpenseSerializer(expenses, many=True).data)

    def post(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        serializer = ExpenseCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cat_id = serializer.validated_data.pop("category_id")

        try:
            category = event.budget_categories.get(id=cat_id)
        except BudgetCategory.DoesNotExist:
            raise NotFound("Target budget category not found in this event.")

        expense = BudgetService.add_expense(
            category=category,
            user=request.user,
            **serializer.validated_data,
        )
        return Response(ExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)


class ExpenseDetailView(APIView):
    """GET, PATCH, DELETE /api/budget/{event_id}/expenses/{pk}/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            expense = Expense.objects.select_related("category").get(id=pk, category__event=event)
        except Expense.DoesNotExist:
            raise NotFound("Expense not found.")
        return Response(ExpenseSerializer(expense).data)

    def patch(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            expense = Expense.objects.select_related("category").get(id=pk, category__event=event)
        except Expense.DoesNotExist:
            raise NotFound("Expense not found.")

        serializer = ExpenseCreateUpdateSerializer(expense, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = BudgetService.update_expense(expense, request.user, **serializer.validated_data)
        return Response(ExpenseSerializer(updated).data)

    def delete(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            expense = Expense.objects.get(id=pk, category__event=event)
        except Expense.DoesNotExist:
            raise NotFound("Expense not found.")

        BudgetService.delete_expense(expense, request.user)
        return Response(
            {"detail": "Expense deleted successfully."}, status=status.HTTP_204_NO_CONTENT
        )


class BudgetSummaryView(APIView):
    """GET /api/budget/{event_id}/summary/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        summary = BudgetService.get_budget_summary(event, request.user)
        return Response(summary)
