"""
Tasks app – API views.
"""

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.views import get_user_event

from .models import ScheduleItem, Task
from .serializers import (
    ScheduleItemCreateUpdateSerializer,
    ScheduleItemSerializer,
    TaskCreateUpdateSerializer,
    TaskSerializer,
)
from .services import ScheduleService, TaskService

User = get_user_model()


class TaskListCreateView(APIView):
    """GET /api/tasks/{event_id}/ and POST /api/tasks/{event_id}/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        tasks = event.tasks.select_related("assigned_to").all()

        status_param = request.query_params.get("status")
        if status_param:
            tasks = tasks.filter(status=status_param)

        priority_param = request.query_params.get("priority")
        if priority_param:
            tasks = tasks.filter(priority=priority_param)

        search = request.query_params.get("search")
        if search:
            tasks = tasks.filter(Q(title__icontains=search) | Q(description__icontains=search))

        return Response(TaskSerializer(tasks, many=True).data)

    def post(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        serializer = TaskCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assigned_to = None
        assigned_to_id = serializer.validated_data.pop("assigned_to_id", None)
        if assigned_to_id:
            try:
                assigned_to = User.objects.get(id=assigned_to_id)
            except User.DoesNotExist:
                raise NotFound("Assigned user not found.")

        task = TaskService.create_task(
            event=event,
            user=request.user,
            assigned_to=assigned_to,
            **serializer.validated_data,
        )
        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)


class TaskDetailView(APIView):
    """GET, PATCH, DELETE /api/tasks/{event_id}/{pk}/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            task = event.tasks.select_related("assigned_to").get(id=pk)
        except Task.DoesNotExist:
            raise NotFound("Task not found.")
        return Response(TaskSerializer(task).data)

    def patch(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            task = event.tasks.get(id=pk)
        except Task.DoesNotExist:
            raise NotFound("Task not found.")

        serializer = TaskCreateUpdateSerializer(task, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        fields = dict(serializer.validated_data)
        if "assigned_to_id" in fields:
            aid = fields.pop("assigned_to_id")
            if aid:
                try:
                    fields["assigned_to"] = User.objects.get(id=aid)
                except User.DoesNotExist:
                    raise NotFound("Assigned user not found.")
            else:
                fields["assigned_to"] = None

        updated = TaskService.update_task(task, request.user, **fields)
        return Response(TaskSerializer(updated).data)

    def delete(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            task = event.tasks.get(id=pk)
        except Task.DoesNotExist:
            raise NotFound("Task not found.")

        TaskService.delete_task(task, request.user)
        return Response({"detail": "Task deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class ScheduleListCreateView(APIView):
    """GET /api/tasks/{event_id}/schedule/ and POST /api/tasks/{event_id}/schedule/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        items = event.schedule_items.all()
        return Response(ScheduleItemSerializer(items, many=True).data)

    def post(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        serializer = ScheduleItemCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = ScheduleService.create_schedule_item(
            event=event,
            user=request.user,
            title=serializer.validated_data["title"],
            start_time=serializer.validated_data["start_time"],
            end_time=serializer.validated_data["end_time"],
            timezone_str=serializer.validated_data.get("timezone", "UTC"),
            notes=serializer.validated_data.get("notes", ""),
        )
        return Response(ScheduleItemSerializer(item).data, status=status.HTTP_201_CREATED)


class ScheduleDetailView(APIView):
    """GET, PATCH, DELETE /api/tasks/{event_id}/schedule/{pk}/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            item = event.schedule_items.get(id=pk)
        except ScheduleItem.DoesNotExist:
            raise NotFound("Schedule item not found.")
        return Response(ScheduleItemSerializer(item).data)

    def patch(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            item = event.schedule_items.get(id=pk)
        except ScheduleItem.DoesNotExist:
            raise NotFound("Schedule item not found.")

        serializer = ScheduleItemCreateUpdateSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = ScheduleService.update_schedule_item(
            item, request.user, **serializer.validated_data
        )
        return Response(ScheduleItemSerializer(updated).data)

    def delete(self, request: Request, event_id: str, pk: str) -> Response:
        event = get_user_event(event_id, request.user)
        try:
            item = event.schedule_items.get(id=pk)
        except ScheduleItem.DoesNotExist:
            raise NotFound("Schedule item not found.")

        ScheduleService.delete_schedule_item(item, request.user)
        return Response(
            {"detail": "Schedule item deleted successfully."}, status=status.HTTP_204_NO_CONTENT
        )


class ScheduleConflictView(APIView):
    """GET /api/tasks/{event_id}/schedule/conflicts/"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, event_id: str) -> Response:
        event = get_user_event(event_id, request.user)
        conflicts = ScheduleService.detect_conflicts(event, request.user)
        return Response({"conflicts": conflicts, "conflict_count": len(conflicts)})
