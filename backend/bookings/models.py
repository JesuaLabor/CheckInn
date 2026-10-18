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
        ('no_show', 'No-Show'),
        ('expired', 'Expired'),
    )

    SOURCE_CHOICES = (
        ('marketplace', 'Marketplace'),
        ('walk_in', 'Walk-in'),
    )

    STAY_TYPE_CHOICES = (
        ('nightly', 'Standard Overnight'),
        ('hourly', 'Short-Stay (Hourly)'),
    )

    HOURLY_SLOT_CHOICES = (
        (3, '3 Hours (Wash-and-Go)'),
        (6, '6 Hours (Half-Day)'),
        (12, '12 Hours (Half-Day / Overnight)'),
        (24, '24 Hours (Full-Day Block)'),
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

    stay_type = models.CharField(
        max_length=20,
        choices=STAY_TYPE_CHOICES,
        default='nightly'
    )
    duration_hours = models.PositiveIntegerField(
        null=True,
        blank=True,
        choices=HOURLY_SLOT_CHOICES,
        help_text='Selected duration in hours for short-term stays (3, 6, 12, or 24).'
    )
    check_in_datetime = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Exact timestamp when the stay starts.'
    )
    check_out_datetime = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Exact timestamp when the stay ends.'
    )

    DEPOSIT_TYPE_CHOICES = (
        ('fifty_percent', '50% Downpayment Deposit'),
        ('full', '100% Full Payment'),
    )

    check_in = models.DateField()
    check_out = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    deposit_type = models.CharField(
        max_length=20,
        choices=DEPOSIT_TYPE_CHOICES,
        default='fifty_percent',
        help_text='Selected reservation payment type (50% deposit or 100% full payment).'
    )
    deposit_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text='Amount required/paid as reservation deposit to guarantee the booking.'
    )
    balance_due = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text='Remaining balance to be settled at the front desk upon physical check-in.'
    )
    is_non_refundable = models.BooleanField(
        default=True,
        help_text='Declares that the reservation deposit is strictly non-refundable upon cancellation.'
    )
    cancellation_policy = models.CharField(
        max_length=150,
        default='Strict: 50% reservation deposit is non-refundable upon cancellation or no-show.'
    )
    currency = models.CharField(max_length=3, default='PHP', help_text='ISO-4217 currency code')

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending_approval')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='marketplace')

    hold_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Soft hold expiration time while status is pending_approval (deprecated in favor of guaranteed deposits).'
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
        if self.status != 'pending_approval':
            return False
        if self.hold_expires_at:
            return timezone.now() < self.hold_expires_at
        return True

    def generate_qr_token(self):
        signer = Signer(salt='localstay-qr-checkin')
        token_payload = f"{self.id}:{self.booking_reference}:{self.hotel_id}:{self.check_in}"
        signed_token = signer.sign(token_payload)
        self.qr_token = signed_token
        return signed_token

    def verify_qr_token(self, token):
        for salt in ('localstay-qr-checkin', 'checkinn-qr-checkin'):
            signer = Signer(salt=salt)
            try:
                val = signer.unsign(token)
                parts = val.split(':')
                if int(parts[0]) == self.id and parts[1] == self.booking_reference:
                    return True
            except Exception:
                continue
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
