"""
Core app – object-level permissions.
"""

from rest_framework.permissions import BasePermission


class IsEventOwner(BasePermission):
    """
    Allow access only if the requesting user owns the event.

    Expects the view's ``get_object()`` to return an object with an
    ``owner`` or ``created_by`` FK pointing to the user.
    """

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, "owner", None) or getattr(obj, "created_by", None)
        return owner == request.user


class IsEventMember(BasePermission):
    """
    Allow access if the user is a member (owner *or* collaborator) of the
    event related to the object.

    The object must expose an ``event`` FK whose model has a
    ``members`` M2M or an ``owner`` FK.
    """

    def has_object_permission(self, request, view, obj):
        event = getattr(obj, "event", None)
        if event is None:
            return False

        # Owner always has access
        if getattr(event, "owner", None) == request.user:
            return True

        # Check M2M members relation
        members = getattr(event, "members", None)
        if members is not None and members.filter(pk=request.user.pk).exists():
            return True

        return False
