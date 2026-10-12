import uuid
from django.conf import settings
from django.core.signing import Signer
from django.db import models
from django.utils import timezone


def generate_booking_ref():
    return f"CHK-{uuid.uuid4().hex[:8].upper()}"


class Booking(models.Model):
    STATUS_CHOICES = (
        ('pending_approval', 'Pending Approval'),
        ('confirmed', 'Confirmed'),
        ('checked_in', 'Checked In'),
        ('checked_out', 'Checked Out'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    )

    SOURCE_CHOICES = (
        ('marketplace', 'Marketplace'),
        ('walk_in', 'Walk-in'),
    )

    booking_reference = models.CharField(max_length=32, unique=True, default=generate_booking_ref)
    hotel = models.ForeignKey('hotels.Hotel', on_delete=models.CASCADE, related_name='bookings')
    room_type = models.ForeignKey('hotels.RoomType', on_delete=models.PROTECT, related_name='bookings')
    room = models.ForeignKey(
        'hotels.Room',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
        help_text='Physical room assigned to this booking (required for walk-in and checked-in bookings).'
    )
    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings'
    )
    guest_name = models.CharField(max_length=150)
    guest_email = models.EmailField()
    guest_phone = models.CharField(max_length=50, blank=True, default='')
    guest_count = models.PositiveIntegerField(default=1)

    check_in = models.DateField()
    check_out = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending_approval')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='marketplace')

    hold_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Soft hold expiration time while status is pending_approval.'
    )
    qr_token = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Cryptographically signed verification token for QR check-in.'
    )

    special_requests = models.TextField(blank=True, default='')
    rejection_reason = models.TextField(blank=True, default='')

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_bookings'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_out_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def is_hold_active(self):
        if self.status != 'pending_approval' or not self.hold_expires_at:
            return False
        return timezone.now() < self.hold_expires_at

    def generate_qr_token(self):
        signer = Signer(salt='checkinn-qr-checkin')
        token_payload = f"{self.id}:{self.booking_reference}:{self.hotel_id}:{self.check_in}"
        signed_token = signer.sign(token_payload)
        self.qr_token = signed_token
        return signed_token

    def verify_qr_token(self, token):
        signer = Signer(salt='checkinn-qr-checkin')
        try:
            val = signer.unsign(token)
            parts = val.split(':')
            return int(parts[0]) == self.id and parts[1] == self.booking_reference
        except Exception:
            return False

    def __str__(self):
        return f"{self.booking_reference} - {self.guest_name} ({self.get_status_display()})"


class GuestRequest(models.Model):
    REQUEST_TYPE_CHOICES = (
        ('towels', 'Extra Towels & Linens'),
        ('housekeeping', 'Housekeeping Service'),
        ('late_checkout', 'Late Checkout Request'),
        ('room_service', 'Room Refreshment'),
        ('maintenance', 'Room Maintenance'),
        ('other', 'Other Request'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
    )

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='service_requests')
    request_type = models.CharField(max_length=50, choices=REQUEST_TYPE_CHOICES, default='housekeeping')
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_request_type_display()} for {self.booking.booking_reference}"


class Payment(models.Model):
    METHOD_CHOICES = (
        ('pay_at_hotel', 'Pay at Hotel (Front Desk)'),
        ('gcash', 'GCash'),
        ('cash', 'Cash Walk-in'),
        ('card', 'Credit / Debit Card'),
    )

    STATUS_CHOICES = (
        ('unpaid', 'Unpaid'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),
    )

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='payment')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=30, choices=METHOD_CHOICES, default='pay_at_hotel')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unpaid')
    reference_number = models.CharField(max_length=100, blank=True, default='')
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment ₱{self.amount} ({self.get_status_display()}) - {self.booking.booking_reference}"
