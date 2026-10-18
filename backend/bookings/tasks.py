from celery import shared_task
from django.utils import timezone
from .models import Booking


@shared_task
def sweep_expired_holds():
    """
    Deprecated: 45-minute soft hold sweep has been retired since all reservations
    are now secured with a mandatory 50% reservation deposit.
    """
    return "Soft hold sweep retired; all online reservations are deposit-guaranteed."


@shared_task
def nudge_staff_unreviewed_requests():
    """
    Periodic task to check pending requests awaiting staff payment verification.
    """
    unreviewed = Booking.objects.filter(
        status='pending_approval'
    ).count()
    return f"{unreviewed} deposit-backed reservations awaiting staff payment verification."
