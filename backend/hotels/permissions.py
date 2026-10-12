from rest_framework import permissions


class IsPlatformSuperAdmin(permissions.BasePermission):
    """
    Allows access only to LocalStay platform superadmins.
    """
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and
            user.is_authenticated and
            (user.role == 'superadmin' or user.is_superuser)
        )


class IsHotelOwnerOrAdmin(permissions.BasePermission):
    """
    Allows access only to hotel owners (admin role) for their assigned hotel,
    or platform superadmins.
    """
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.role == 'superadmin' or user.is_superuser:
            return True
        return user.role == 'admin' and user.hotel is not None

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == 'superadmin' or user.is_superuser:
            return True
        hotel = getattr(obj, 'hotel', obj)
        return hotel == user.hotel
