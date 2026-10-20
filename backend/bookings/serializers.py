from datetime import timedelta
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers
from hotels.models import Hotel, RoomType, Room
from hotels.serializers import ReviewSerializer
from .models import Booking, GuestRequest, Payment
from .permissions import get_user_hotel


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'amount', 'method', 'status', 'reference_number', 'paid_at', 'created_at']
        read_only_fields = ['id', 'created_at']


class GuestRequestSerializer(serializers.ModelSerializer):
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    room_number = serializers.CharField(source='booking.room.room_number', read_only=True, default='')

    class Meta:
        model = GuestRequest
        fields = [
            'id', 'booking', 'request_type', 'request_type_display',
            'message', 'status', 'status_display', 'room_number', 'created_at', 'resolved_at'
        ]
        read_only_fields = ['id', 'created_at', 'resolved_at']


class BookingSerializer(serializers.ModelSerializer):
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)
    hotel_slug = serializers.CharField(source='hotel.slug', read_only=True)
    hotel_address = serializers.CharField(source='hotel.address', read_only=True)
    room_type_name = serializers.CharField(source='room_type.name', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True, default='')
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    is_hold_active = serializers.BooleanField(read_only=True)
    payment = PaymentSerializer(read_only=True)
    service_requests = GuestRequestSerializer(many=True, read_only=True)
    review = ReviewSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_reference', 'hotel', 'hotel_name', 'hotel_slug', 'hotel_address',
            'room_type', 'room_type_name', 'room', 'room_number',
            'guest', 'guest_name', 'guest_email', 'guest_phone', 'guest_count',
            'stay_type', 'duration_hours', 'check_in_datetime', 'check_out_datetime',
            'check_in', 'check_out', 'total_amount', 'deposit_type', 'deposit_amount', 'balance_due',
            'is_non_refundable', 'cancellation_policy',
            'currency', 'status', 'status_display',
            'source', 'source_display', 'hold_expires_at', 'is_hold_active',
            'qr_token', 'special_requests', 'rejection_reason',
            'reviewed_by', 'reviewed_at', 'checked_in_at', 'checked_out_at',
            'created_at', 'payment', 'service_requests', 'review'
        ]
        read_only_fields = [
            'id', 'booking_reference', 'status', 'source', 'hold_expires_at',
            'qr_token', 'reviewed_by', 'reviewed_at', 'checked_in_at', 'checked_out_at',
            'created_at'
        ]


class BookingCreateSerializer(serializers.ModelSerializer):
    deposit_type = serializers.ChoiceField(
        choices=Booking.DEPOSIT_TYPE_CHOICES,
        default='fifty_percent'
    )
    terms_accepted = serializers.BooleanField(
        write_only=True,
        default=True,
        help_text='Guest explicitly accepts that reservation deposit is strictly non-refundable upon cancellation.'
    )
    payment_method = serializers.ChoiceField(
        choices=Payment.METHOD_CHOICES,
        default='gcash',
        write_only=True
    )
    payment_reference = serializers.CharField(
        max_length=100,
        required=True,
        allow_blank=False,
        write_only=True,
        help_text='GCash or Bank transfer transaction reference number'
    )
    stay_type = serializers.ChoiceField(
        choices=Booking.STAY_TYPE_CHOICES,
        default='nightly'
    )
    duration_hours = serializers.IntegerField(
        required=False,
        allow_null=True
    )
    check_in_time = serializers.CharField(
        max_length=10,
        required=False,
        allow_blank=True,
        write_only=True,
        help_text='Arrival time for short stays, e.g. 14:00'
    )
    check_in = serializers.DateField(required=False)
    check_out = serializers.DateField(required=False)

    class Meta:
        model = Booking
        fields = [
            'id', 'hotel', 'room_type', 'guest_name', 'guest_email', 'guest_phone',
            'guest_count', 'stay_type', 'duration_hours', 'check_in_time',
            'deposit_type', 'deposit_amount', 'balance_due', 'is_non_refundable', 'cancellation_policy',
            'terms_accepted',
            'check_in_datetime', 'check_out_datetime', 'check_in', 'check_out',
            'special_requests', 'payment_method', 'payment_reference',
            'booking_reference', 'total_amount', 'status'
        ]
        read_only_fields = [
            'id', 'booking_reference', 'total_amount', 'deposit_amount', 'balance_due',
            'is_non_refundable', 'cancellation_policy', 'status',
            'check_in_datetime', 'check_out_datetime'
        ]

    def validate(self, data):
        stay_type = data.get('stay_type', 'nightly')
        room_type = data.get('room_type')
        hotel = data.get('hotel')

        if room_type.hotel_id != hotel.id:
            raise serializers.ValidationError({'room_type': 'Selected room type does not belong to this hotel.'})

        # Mandatory Terms agreement check
        terms_accepted = data.get('terms_accepted', False)
        if not terms_accepted:
            raise serializers.ValidationError({
                'terms_accepted': 'You must acknowledge and agree that the reservation deposit is strictly non-refundable upon cancellation.'
            })

        # Mandatory payment reference check
        payment_reference = data.get('payment_reference', '').strip()
        if not payment_reference:
            raise serializers.ValidationError({
                'payment_reference': 'A payment reference number is required to guarantee your reservation.'
            })

        now = timezone.now()
        tz = timezone.get_current_timezone()

        if stay_type == 'hourly':
            if not room_type.short_stay_enabled:
                raise serializers.ValidationError({'stay_type': 'This room category does not offer short-time hourly stays.'})

            duration_hours = data.get('duration_hours')
            if not duration_hours:
                raise serializers.ValidationError({'duration_hours': 'Please select a duration slot (3, 6, 12, or 24 hours).'})
            try:
                duration_hours = int(duration_hours)
            except (ValueError, TypeError):
                raise serializers.ValidationError({'duration_hours': 'Invalid duration specified.'})

            if duration_hours not in [3, 6, 12, 24]:
                raise serializers.ValidationError({'duration_hours': 'Duration must be 3, 6, 12, or 24 hours.'})

            check_in_date = data.get('check_in')
            if not check_in_date:
                check_in_date = timezone.localtime().date()

            check_in_time_str = data.get('check_in_time')
            if check_in_time_str and check_in_time_str.strip():
                try:
                    parts = [int(p) for p in check_in_time_str.strip().split(':')]
                    from datetime import time as dt_time
                    parsed_time = dt_time(parts[0], parts[1])
                except Exception:
                    raise serializers.ValidationError({'check_in_time': 'Invalid arrival time format. Use HH:MM.'})
            else:
                if check_in_date == timezone.localtime().date():
                    parsed_time = timezone.localtime().time().replace(second=0, microsecond=0)
                else:
                    from datetime import time as dt_time
                    parsed_time = dt_time(14, 0)

            from datetime import datetime
            naive_start = datetime.combine(check_in_date, parsed_time)
            start_dt = timezone.make_aware(naive_start, tz) if timezone.is_naive(naive_start) else naive_start

            # Allow 15-minute grace period if booking right now
            if start_dt < now - timedelta(minutes=15):
                raise serializers.ValidationError({'check_in_time': 'Check-in time cannot be in the past.'})

            end_dt = start_dt + timedelta(hours=duration_hours)

            data['duration_hours'] = duration_hours
            data['check_in_datetime'] = start_dt
            data['check_out_datetime'] = end_dt
            data['check_in'] = start_dt.date()
            data['check_out'] = end_dt.date()

            # Calculate total amount for hourly
            tier_rate = None
            if duration_hours == 3:
                tier_rate = room_type.rate_3h
            elif duration_hours == 6:
                tier_rate = room_type.rate_6h
            elif duration_hours == 12:
                tier_rate = room_type.rate_12h
            elif duration_hours == 24:
                tier_rate = room_type.rate_24h or room_type.base_rate

            if tier_rate is None or tier_rate <= 0:
                from decimal import Decimal
                if duration_hours == 3:
                    tier_rate = round(room_type.base_rate * Decimal('0.30'), 2)
                elif duration_hours == 6:
                    tier_rate = round(room_type.base_rate * Decimal('0.50'), 2)
                elif duration_hours == 12:
                    tier_rate = round(room_type.base_rate * Decimal('0.75'), 2)
                else:
                    tier_rate = room_type.base_rate

            total_amount = tier_rate
        else:
            check_in = data.get('check_in')
            check_out = data.get('check_out')
            if not check_in:
                raise serializers.ValidationError({'check_in': 'Check-in date is required for overnight stays.'})
            if not check_out:
                raise serializers.ValidationError({'check_out': 'Check-out date must be provided.'})
            if check_in >= check_out:
                raise serializers.ValidationError({'check_out': 'Check-out date must be after check-in date.'})

            from datetime import datetime, time as dt_time
            start_dt = timezone.make_aware(datetime.combine(check_in, dt_time(14, 0)), tz)
            end_dt = timezone.make_aware(datetime.combine(check_out, dt_time(12, 0)), tz)
            data['check_in_datetime'] = start_dt
            data['check_out_datetime'] = end_dt

            nights = (check_out - check_in).days
            total_amount = room_type.base_rate * nights

        # Calculate deposit amount (minimum 50% or 100%) and balance due
        from decimal import Decimal
        deposit_type = data.get('deposit_type', 'fifty_percent')
        if deposit_type == 'fifty_percent':
            deposit_amount = round(total_amount * Decimal('0.50'), 2)
            balance_due = total_amount - deposit_amount
        else:
            deposit_amount = total_amount
            balance_due = Decimal('0.00')

        data['total_amount'] = total_amount
        data['deposit_amount'] = deposit_amount
        data['balance_due'] = balance_due
        data['is_non_refundable'] = True
        data['cancellation_policy'] = 'Strict: 50% reservation deposit is non-refundable upon cancellation or no-show.'

        # Dynamic capacity & overlap check (deposit-backed bookings reserve inventory immediately)
        total_rooms = room_type.rooms.filter(is_active=True).count()
        if total_rooms == 0:
            raise serializers.ValidationError('Sorry, no active rooms are configured for this room category.')

        candidate_bookings = Booking.objects.filter(
            hotel=hotel,
            room_type=room_type,
            check_in__lte=data['check_out'],
            check_out__gte=data['check_in'],
            status__in=['confirmed', 'checked_in', 'pending_approval']
        )

        overlap_count = 0
        from datetime import datetime, time as dt_time
        for b in candidate_bookings:
            if b.check_in_datetime and b.check_out_datetime:
                b_start = b.check_in_datetime
                b_end = b.check_out_datetime
            else:
                b_start = timezone.make_aware(datetime.combine(b.check_in, dt_time(14, 0)), tz)
                b_end = timezone.make_aware(datetime.combine(b.check_out, dt_time(12, 0)), tz)

            if b_start < end_dt and b_end > start_dt:
                overlap_count += 1

        if overlap_count >= total_rooms:
            raise serializers.ValidationError(
                'Sorry, no rooms of this type are available for the selected dates/times (they may be booked or under a pending hold).'
            )

        return data

    @transaction.atomic
    def create(self, validated_data):
        payment_method = validated_data.pop('payment_method', 'gcash')
        payment_reference = validated_data.pop('payment_reference', '').strip()
        validated_data.pop('check_in_time', None)
        validated_data.pop('terms_accepted', None)

        deposit_amount = validated_data['deposit_amount']

        request = self.context.get('request')
        guest = request.user if request and request.user.is_authenticated else None

        booking = Booking.objects.create(
            **validated_data,
            guest=guest,
            status='pending_approval',
            source='marketplace',
            hold_expires_at=None
        )

        Payment.objects.create(
            booking=booking,
            amount=deposit_amount,
            method=payment_method,
            status='unpaid',
            reference_number=payment_reference
        )

        return booking


class WalkInCreateSerializer(serializers.ModelSerializer):
    room_id = serializers.IntegerField(write_only=True)
    check_in = serializers.DateField(required=False)
    check_out = serializers.DateField(required=False)
    stay_type = serializers.ChoiceField(
        choices=Booking.STAY_TYPE_CHOICES,
        default='nightly'
    )
    duration_hours = serializers.IntegerField(required=False, allow_null=True)
    payment_method = serializers.ChoiceField(
        choices=Payment.METHOD_CHOICES,
        default='cash',
        write_only=True
    )
    payment_status = serializers.ChoiceField(
        choices=Payment.STATUS_CHOICES,
        default='paid',
        write_only=True
    )

    class Meta:
        model = Booking
        fields = [
            'id', 'room_id', 'guest_name', 'guest_email', 'guest_phone',
            'guest_count', 'stay_type', 'duration_hours', 'check_in', 'check_out',
            'check_in_datetime', 'check_out_datetime', 'special_requests',
            'payment_method', 'payment_status', 'booking_reference', 'total_amount'
        ]
        read_only_fields = ['id', 'booking_reference', 'total_amount', 'check_in_datetime', 'check_out_datetime']

    def validate(self, data):
        stay_type = data.get('stay_type', 'nightly')
        duration_hours = data.get('duration_hours')

        now = timezone.now()

        if stay_type == 'hourly':
            if not duration_hours:
                raise serializers.ValidationError({'duration_hours': 'Please select a duration slot (3, 6, 12, or 24 hours).'})
            try:
                duration_hours = int(duration_hours)
            except (ValueError, TypeError):
                raise serializers.ValidationError({'duration_hours': 'Invalid duration specified.'})

            if duration_hours not in [3, 6, 12, 24]:
                raise serializers.ValidationError({'duration_hours': 'Duration must be 3, 6, 12, or 24 hours.'})

            check_in_dt = now
            check_out_dt = now + timedelta(hours=duration_hours)
            data['duration_hours'] = duration_hours
            data['check_in_datetime'] = check_in_dt
            data['check_out_datetime'] = check_out_dt
            data['check_in'] = check_in_dt.date()
            data['check_out'] = check_out_dt.date()
        else:
            check_in = data.get('check_in')
            check_out = data.get('check_out')
            if not check_in:
                raise serializers.ValidationError({'check_in': 'Check-in date is required for overnight stays.'})
            if not check_out:
                raise serializers.ValidationError({'check_out': 'Check-out date must be provided.'})
            if check_in >= check_out:
                raise serializers.ValidationError({'check_out': 'Check-out date must be after check-in date.'})

        staff_hotel = get_user_hotel(self.context['request'].user)
        room_id = data.get('room_id')

        try:
            room = Room.objects.get(id=room_id, hotel=staff_hotel, is_active=True)
        except Room.DoesNotExist:
            raise serializers.ValidationError({'room_id': 'Selected room was not found in your hotel.'})

        if room.status == 'occupied':
            raise serializers.ValidationError({'room_id': f'Room {room.room_number} is already occupied.'})

        self.context['room'] = room
        return data

    @transaction.atomic
    def create(self, validated_data):
        room = self.context['room']
        staff = self.context['request'].user
        hotel = get_user_hotel(staff)
        payment_method = validated_data.pop('payment_method', 'cash')
        payment_status = validated_data.pop('payment_status', 'paid')
        validated_data.pop('room_id')

        stay_type = validated_data.get('stay_type', 'nightly')
        duration_hours = validated_data.get('duration_hours')

        now = timezone.now()

        if stay_type == 'hourly':
            rt = room.room_type
            tier_rate = None
            if duration_hours == 3:
                tier_rate = rt.rate_3h
            elif duration_hours == 6:
                tier_rate = rt.rate_6h
            elif duration_hours == 12:
                tier_rate = rt.rate_12h
            elif duration_hours == 24:
                tier_rate = rt.rate_24h or rt.base_rate

            if tier_rate is None or tier_rate <= 0:
                from decimal import Decimal
                if duration_hours == 3:
                    tier_rate = round(rt.base_rate * Decimal('0.30'), 2)
                elif duration_hours == 6:
                    tier_rate = round(rt.base_rate * Decimal('0.50'), 2)
                elif duration_hours == 12:
                    tier_rate = round(rt.base_rate * Decimal('0.75'), 2)
                else:
                    tier_rate = rt.base_rate

            total_amount = tier_rate
        else:
            check_in = validated_data['check_in']
            check_out = validated_data['check_out']
            nights = (check_out - check_in).days
            total_amount = room.room_type.base_rate * nights

        booking = Booking.objects.create(
            hotel=hotel,
            room_type=room.room_type,
            room=room,
            guest=None,
            **validated_data,
            total_amount=total_amount,
            status='checked_in',
            source='walk_in',
            reviewed_by=staff,
            reviewed_at=now,
            checked_in_at=now
        )

        booking.generate_qr_token()
        booking.save()

        room.status = 'occupied'
        room.save()

        Payment.objects.create(
            booking=booking,
            amount=total_amount,
            method=payment_method,
            status=payment_status,
            paid_at=now if payment_status == 'paid' else None
        )

        return booking
