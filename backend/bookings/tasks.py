from celery import shared_task
from django.utils import timezone
from .models import Booking


@shared_task
def sweep_expired_holds():
    """
    Periodic task to sweep unapproved holds that have expired past their 45-minute window.
    Frees the room inventory so other guests can book.
    """
    now = timezone.now()
    expired_count = Booking.objects.filter(
        status='pending_approval',
        hold_expires_at__lt=now
    ).update(status='expired')
    return f"Swept and released {expired_count} expired pending holds at {now}."


@shared_task
def nudge_staff_unreviewed_requests():
    """
    Periodic task to check pending requests that have been unreviewed for > 15 minutes.
    """
    now = timezone.now()
    unreviewed = Booking.objects.filter(
        status='pending_approval',
        hold_expires_at__gt=now
    ).count()
    return f"{unreviewed} active pending requests awaiting staff action."
