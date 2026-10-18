import logging
from .models import HotelAuditLog

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Safely extracts client IP address from HttpRequest."""
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_hotel_activity(
    hotel,
    category: str,
    action: str,
    summary: str,
    actor=None,
    request=None,
    severity: str = 'info',
    details: dict = None
):
    """
    Safely records an audit log entry for a hotel.
    Wrapped in try/except to ensure operational transactions are never interrupted.
    """
    try:
        if not hotel:
            return None

        actor_name = ''
        actor_role = ''
        user_obj = None

        if actor and getattr(actor, 'is_authenticated', False):
            user_obj = actor
            first = getattr(actor, 'first_name', '')
            last = getattr(actor, 'last_name', '')
            full = f"{first} {last}".strip()
            actor_name = full or getattr(actor, 'username', 'User')
            actor_role = getattr(actor, 'role', '')
        elif request and getattr(request, 'user', None) and request.user.is_authenticated:
            user_obj = request.user
            first = getattr(user_obj, 'first_name', '')
            last = getattr(user_obj, 'last_name', '')
            full = f"{first} {last}".strip()
            actor_name = full or getattr(user_obj, 'username', 'User')
            actor_role = getattr(user_obj, 'role', '')
        else:
            actor_name = 'System'
            actor_role = 'system'

        ip = get_client_ip(request)

        return HotelAuditLog.objects.create(
            hotel=hotel,
            actor=user_obj,
            actor_name=actor_name,
            actor_role=actor_role,
            category=category,
            action=action,
            severity=severity,
            summary=summary,
            details=details or {},
            ip_address=ip
        )
    except Exception as exc:
        logger.exception("Failed to write hotel audit log: %s", exc)
        return None
