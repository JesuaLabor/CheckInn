from rest_framework import permissions


def get_user_hotel(user):
    if not user or not user.is_authenticated:
        return None
    return getattr(user, 'effective_hotel', None) or getattr(user, 'hotel', None)


class IsHotelStaff(permissions.BasePermission):
    """
    Allows access only to authenticated hotel staff or hotel admin/owner.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        hotel = get_user_hotel(user)
        return user.role in ['staff', 'admin'] and hotel is not None

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser:
            return True
        hotel = getattr(obj, 'hotel', None)
        if hotel is None and hasattr(obj, 'booking'):
            hotel = obj.booking.hotel
        user_hotel = get_user_hotel(user)
        return hotel == user_hotel


class IsHotelAdmin(permissions.BasePermission):
    """
    Allows access only to hotel admin/owner or platform superadmin.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        hotel = get_user_hotel(user)
        return user.role == 'admin' and hotel is not None

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser:
            return True
        hotel = getattr(obj, 'hotel', None)
        if hotel is None and hasattr(obj, 'booking'):
            hotel = obj.booking.hotel
        user_hotel = get_user_hotel(user)
        return hotel == user_hotel
