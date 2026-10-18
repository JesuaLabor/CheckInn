from datetime import timedelta
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers
from hotels.models import Hotel, RoomType, Room
from .models import Booking, GuestRequest, Payment


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

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_reference', 'hotel', 'hotel_name', 'hotel_slug', 'hotel_address',
            'room_type', 'room_type_name', 'room', 'room_number',
            'guest', 'guest_name', 'guest_email', 'guest_phone', 'guest_count',
            'stay_type', 'duration_hours', 'check_in_datetime', 'check_out_datetime',
            'check_in', 'check_out', 'total_amount', 'currency', 'status', 'status_display',
            'source', 'source_display', 'hold_expires_at', 'is_hold_active',
            'qr_token', 'special_requests', 'rejection_reason',
            'reviewed_by', 'reviewed_at', 'checked_in_at', 'checked_out_at',
            'created_at', 'payment', 'service_requests'
        ]
        read_only_fields = [
            'id', 'booking_reference', 'status', 'source', 'hold_expires_at',
            'qr_token', 'reviewed_by', 'reviewed_at', 'checked_in_at', 'checked_out_at',
            'created_at'
        ]


class BookingCreateSerializer(serializers.ModelSerializer):
    payment_method = serializers.ChoiceField(
        choices=Payment.METHOD_CHOICES,
        default='pay_at_hotel',
        write_only=True
    )
    payment_reference = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        write_only=True,
        help_text='GCash or Bank transfer transaction reference number'
    )

    class Meta:
        model = Booking
        fields = [
            'id', 'hotel', 'room_type', 'guest_name', 'guest_email', 'guest_phone',
            'guest_count', 'check_in', 'check_out', 'special_requests',
            'payment_method', 'payment_reference',
            'booking_reference', 'total_amount', 'status', 'hold_expires_at'
        ]
        read_only_fields = ['id', 'booking_reference', 'total_amount', 'status', 'hold_expires_at']

    def validate(self, data):
        check_in = data.get('check_in')
        check_out = data.get('check_out')
        room_type = data.get('room_type')
        hotel = data.get('hotel')

        if check_in >= check_out:
            raise serializers.ValidationError({'check_out': 'Check-out date must be after check-in date.'})

        if room_type.hotel_id != hotel.id:
            raise serializers.ValidationError({'room_type': 'Selected room type does not belong to this hotel.'})

        # Availability check: count active holds and confirmed bookings
        now = timezone.now()
        total_rooms = room_type.rooms.filter(is_active=True).count()

        overlapping_count = Booking.objects.filter(
            hotel=hotel,
            room_type=room_type,
            check_in__lt=check_out,
            check_out__gt=check_in
        ).filter(
            Q(status__in=['confirmed', 'checked_in']) |
            Q(status='pending_approval', hold_expires_at__gt=now)
        ).count()

        if overlapping_count >= total_rooms:
            raise serializers.ValidationError(
                'Sorry, no rooms of this type are available for the selected dates (they may be booked or under a pending hold).'
            )

        return data

    @transaction.atomic
    def create(self, validated_data):
        payment_method = validated_data.pop('payment_method', 'pay_at_hotel')
        payment_reference = validated_data.pop('payment_reference', '').strip()
        check_in = validated_data['check_in']
        check_out = validated_data['check_out']
        room_type = validated_data['room_type']

        nights = (check_out - check_in).days
        total_amount = room_type.base_rate * nights

        # Set 45-minute soft hold
        now = timezone.now()
        hold_expires_at = now + timedelta(minutes=45)

        request = self.context.get('request')
        guest = request.user if request and request.user.is_authenticated else None

        booking = Booking.objects.create(
            **validated_data,
            guest=guest,
            total_amount=total_amount,
            status='pending_approval',
            source='marketplace',
            hold_expires_at=hold_expires_at
        )

        Payment.objects.create(
            booking=booking,
            amount=total_amount,
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

        staff_hotel = self.context['request'].user.hotel
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
            hotel=staff.hotel,
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
