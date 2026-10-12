from rest_framework import permissions


class IsHotelStaff(permissions.BasePermission):
    """
    Allows access only to authenticated hotel staff or hotel admin.
    """
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and
            user.is_authenticated and
            (user.role in ['staff', 'admin'] and user.hotel is not None or user.is_superuser)
        )

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser:
            return True
        hotel = getattr(obj, 'hotel', None)
        if hotel is None and hasattr(obj, 'booking'):
            hotel = obj.booking.hotel
        return hotel == user.hotel


class IsHotelAdmin(permissions.BasePermission):
    """
    Allows access only to hotel admin or platform superadmin.
    """
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and
            user.is_authenticated and
            (user.role == 'admin' and user.hotel is not None or user.is_superuser)
        )

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser:
            return True
        hotel = getattr(obj, 'hotel', None)
        if hotel is None and hasattr(obj, 'booking'):
            hotel = obj.booking.hotel
        return hotel == user.hotel
