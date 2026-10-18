from datetime import date, timedelta
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Count, Sum, Q, Case, When, IntegerField
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from hotels.models import Room
from hotels.audit import log_hotel_activity
from .models import Booking, GuestRequest, Payment
from .permissions import IsHotelStaff, IsHotelAdmin
from .serializers import (
    BookingSerializer,
    BookingCreateSerializer,
    WalkInCreateSerializer,
    GuestRequestSerializer,
)


class BookingCreateView(generics.CreateAPIView):
    serializer_class = BookingCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        output_serializer = BookingSerializer(booking)
        return Response({
            'message': 'Booking request submitted! A 45-minute hold is placed while hotel staff reviews your request.',
            'booking': output_serializer.data
        }, status=status.HTTP_201_CREATED)


class MyBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Auto-expire holds that passed deadline
        now = timezone.now()
        Booking.objects.filter(
            guest=self.request.user,
            status='pending_approval',
            hold_expires_at__lt=now
        ).update(status='expired')

        return Booking.objects.filter(guest=self.request.user).select_related('hotel', 'room_type', 'room', 'payment')


class BookingDetailView(generics.RetrieveAPIView):
    queryset = Booking.objects.all().select_related('hotel', 'room_type', 'room', 'payment')
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        # Allow guest who booked, hotel staff for that hotel, or superadmin
        if user.is_superuser:
            return obj
        if obj.guest == user:
            return obj
        if user.is_hotel_staff and obj.hotel == user.hotel:
            return obj
        self.permission_denied(self.request, message='You do not have permission to view this booking.')


class StaffPendingRequestsView(APIView):
    permission_classes = [IsHotelStaff]

    def get(self, request):
        hotel = request.user.hotel
        now = timezone.now()

        # Expire past holds automatically
        Booking.objects.filter(
            hotel=hotel,
            status='pending_approval',
            hold_expires_at__lt=now
        ).update(status='expired')

        pending_bookings = Booking.objects.filter(
            hotel=hotel,
            status='pending_approval'
        ).select_related('room_type', 'guest').order_by('hold_expires_at')

        serializer = BookingSerializer(pending_bookings, many=True)
        return Response({
            'hotel_id': hotel.id,
            'hotel_name': hotel.name,
            'count': pending_bookings.count(),
            'requests': serializer.data
        })


class StaffAllBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = [IsHotelStaff]

    def get_queryset(self):
        hotel = self.request.user.hotel
        queryset = Booking.objects.filter(hotel=hotel).select_related('room_type', 'room', 'guest', 'payment')

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        source_param = self.request.query_params.get('source')
        if source_param:
            queryset = queryset.filter(source=source_param)

        return queryset.order_by('-created_at')


class StaffApproveRequestView(APIView):
    permission_classes = [IsHotelStaff]

    def post(self, request, pk):
        hotel = request.user.hotel
        now = timezone.now()

        with transaction.atomic():
            try:
                booking = Booking.objects.select_for_update().get(id=pk, hotel=hotel)
            except Booking.DoesNotExist:
                return Response({'detail': 'Booking request not found.'}, status=status.HTTP_404_NOT_FOUND)

            if booking.status != 'pending_approval':
                return Response(
                    {'detail': f'Cannot approve booking with status "{booking.get_status_display()}".'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if booking.hold_expires_at and now > booking.hold_expires_at:
                booking.status = 'expired'
                booking.save()
                return Response(
                    {'detail': 'This reservation request hold has expired.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Assign room if specified by staff, or find first available room of matching room_type
            room_id = request.data.get('room_id')
            if room_id:
                try:
                    assigned_room = Room.objects.get(id=room_id, hotel=hotel, room_type=booking.room_type, is_active=True)
                except Room.DoesNotExist:
                    return Response({'detail': 'Invalid room selected.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Find available room of this type
                # Check rooms that don't have overlapping confirmed/checked_in bookings
                tz = timezone.get_current_timezone()
                if booking.check_in_datetime and booking.check_out_datetime:
                    b_start = booking.check_in_datetime
                    b_end = booking.check_out_datetime
                else:
                    from datetime import datetime, time as dt_time
                    b_start = timezone.make_aware(datetime.combine(booking.check_in, dt_time(14, 0)), tz)
                    b_end = timezone.make_aware(datetime.combine(booking.check_out, dt_time(12, 0)), tz)

                cand_bookings = Booking.objects.filter(
                    hotel=hotel,
                    room_type=booking.room_type,
                    status__in=['confirmed', 'checked_in'],
                    room__isnull=False,
                    check_in__lte=booking.check_out,
                    check_out__gte=booking.check_in
                ).exclude(id=booking.id)

                overlapping_room_ids = []
                from datetime import datetime, time as dt_time
                for other in cand_bookings:
                    if other.check_in_datetime and other.check_out_datetime:
                        o_start = other.check_in_datetime
                        o_end = other.check_out_datetime
                    else:
                        o_start = timezone.make_aware(datetime.combine(other.check_in, dt_time(14, 0)), tz)
                        o_end = timezone.make_aware(datetime.combine(other.check_out, dt_time(12, 0)), tz)
                    if o_start < b_end and o_end > b_start:
                        overlapping_room_ids.append(other.room_id)

                assigned_room = Room.objects.filter(
                    hotel=hotel,
                    room_type=booking.room_type,
                    is_active=True
                ).exclude(id__in=overlapping_room_ids).first()

            booking.room = assigned_room
            booking.status = 'confirmed'
            booking.reviewed_by = request.user
            booking.reviewed_at = now
            booking.generate_qr_token()
            booking.save()

            if assigned_room:
                assigned_room.status = 'occupied'
                assigned_room.save(update_fields=['status'])

            # If payment is via GCash with reference number or staff marks paid, update payment record
            if hasattr(booking, 'payment') and booking.payment:
                mark_paid = request.data.get(
                    'mark_paid',
                    True if (booking.payment.method == 'gcash' and booking.payment.reference_number) else False
                )
                if mark_paid:
                    booking.payment.status = 'paid'
                    booking.payment.paid_at = now
                    booking.payment.save()

            log_hotel_activity(
                hotel=hotel,
                actor=request.user,
                request=request,
                category='booking',
                action='booking_approved',
                severity='info',
                summary=f"Approved reservation {booking.booking_reference} for {booking.guest_name}" + (f" (Room {assigned_room.room_number})" if assigned_room else ""),
                details={
                    'booking_reference': booking.booking_reference,
                    'guest_name': booking.guest_name,
                    'room': assigned_room.room_number if assigned_room else None,
                    'total_amount': float(booking.total_amount)
                }
            )

            serializer = BookingSerializer(booking)
            return Response({
                'message': f'Booking {booking.booking_reference} confirmed successfully! QR check-in token generated.',
                'booking': serializer.data
            })


class StaffRejectRequestView(APIView):
    permission_classes = [IsHotelStaff]

    def post(self, request, pk):
        hotel = request.user.hotel
        try:
            booking = Booking.objects.get(id=pk, hotel=hotel)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking request not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status != 'pending_approval':
            return Response(
                {'detail': f'Cannot reject booking with status "{booking.get_status_display()}".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', 'Room unavailable for requested dates.')
        booking.status = 'rejected'
        booking.rejection_reason = reason
        booking.reviewed_by = request.user
        booking.reviewed_at = timezone.now()
        booking.save()

        if booking.room:
            old_room = booking.room
            other_active = Booking.objects.filter(
                room=old_room,
                status__in=['confirmed', 'checked_in']
            ).exclude(id=booking.id).exists()
            if not other_active:
                old_room.status = 'available'
                old_room.save(update_fields=['status'])

        log_hotel_activity(
            hotel=hotel,
            actor=request.user,
            request=request,
            category='booking',
            action='booking_rejected',
            severity='warning',
            summary=f"Rejected reservation {booking.booking_reference} for {booking.guest_name}: \"{reason}\"",
            details={
                'booking_reference': booking.booking_reference,
                'guest_name': booking.guest_name,
                'reason': reason
            }
        )

        serializer = BookingSerializer(booking)
        return Response({
            'message': f'Booking {booking.booking_reference} has been rejected. Soft hold released.',
            'booking': serializer.data
        })


class WalkInBookingView(generics.CreateAPIView):
    serializer_class = WalkInCreateSerializer
    permission_classes = [IsHotelStaff]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()

        log_hotel_activity(
            hotel=booking.hotel,
            actor=request.user,
            request=request,
            category='booking',
            action='walkin_registered',
            severity='info',
            summary=f"Walk-in guest {booking.guest_name} registered into Room {booking.room.room_number if booking.room else 'N/A'} (₱{float(booking.total_amount):,.2f})",
            details={
                'booking_reference': booking.booking_reference,
                'guest_name': booking.guest_name,
                'room': booking.room.room_number if booking.room else None,
                'amount': float(booking.total_amount)
            }
        )

        output_serializer = BookingSerializer(booking)
        return Response({
            'message': f'Walk-in guest checked into Room {booking.room.room_number} successfully!',
            'booking': output_serializer.data
        }, status=status.HTTP_201_CREATED)


class CheckInBookingView(APIView):
    permission_classes = [IsHotelStaff]

    def post(self, request, pk):
        hotel = request.user.hotel
        try:
            booking = Booking.objects.get(id=pk, hotel=hotel)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status != 'confirmed':
            return Response(
                {'detail': f'Cannot check in booking with status "{booking.get_status_display()}". Must be confirmed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        token = request.data.get('qr_token')
        if token and not booking.verify_qr_token(token):
            return Response({'detail': 'Invalid or expired QR check-in token.'}, status=status.HTTP_400_BAD_REQUEST)

        # If room not yet assigned, assign now
        if not booking.room:
            room_id = request.data.get('room_id')
            if room_id:
                room = Room.objects.filter(id=room_id, hotel=hotel, is_active=True).first()
            else:
                room = Room.objects.filter(hotel=hotel, room_type=booking.room_type, status='available').first()
            if not room:
                return Response({'detail': 'No physical room available to assign for this check-in.'}, status=status.HTTP_400_BAD_REQUEST)
            booking.room = room

        booking.status = 'checked_in'
        booking.checked_in_at = timezone.now()
        booking.save()

        if booking.room:
            booking.room.status = 'occupied'
            booking.room.save()

        log_hotel_activity(
            hotel=hotel,
            actor=request.user,
            request=request,
            category='booking',
            action='guest_checked_in',
            severity='info',
            summary=f"Checked in {booking.guest_name} ({booking.booking_reference}) into Room {booking.room.room_number if booking.room else 'N/A'}",
            details={
                'booking_reference': booking.booking_reference,
                'guest_name': booking.guest_name,
                'room': booking.room.room_number if booking.room else None
            }
        )

        serializer = BookingSerializer(booking)
        return Response({
            'message': f'Guest {booking.guest_name} successfully checked in to Room {booking.room.room_number if booking.room else "N/A"}!',
            'booking': serializer.data
        })


class CheckOutBookingView(APIView):
    permission_classes = [IsHotelStaff]

    def post(self, request, pk):
        hotel = request.user.hotel
        try:
            booking = Booking.objects.get(id=pk, hotel=hotel)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status not in ['checked_in', 'confirmed']:
            return Response(
                {'detail': f'Cannot check out booking with status "{booking.get_status_display()}". Must be checked in or confirmed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking.status = 'checked_out'
        booking.checked_out_at = timezone.now()
        booking.save()

        if booking.room:
            booking.room.status = 'cleaning'  # mark cleaning before ready
            booking.room.save()

        # Update payment to paid if not already
        if hasattr(booking, 'payment'):
            if booking.payment.status != 'paid':
                booking.payment.status = 'paid'
                booking.payment.paid_at = timezone.now()
                booking.payment.save()

        log_hotel_activity(
            hotel=hotel,
            actor=request.user,
            request=request,
            category='booking',
            action='guest_checked_out',
            severity='info',
            summary=f"Checked out {booking.guest_name} ({booking.booking_reference}). Room {booking.room.room_number if booking.room else 'N/A'} moved to cleaning.",
            details={
                'booking_reference': booking.booking_reference,
                'guest_name': booking.guest_name,
                'room': booking.room.room_number if booking.room else None
            }
        )

        serializer = BookingSerializer(booking)
        return Response({
            'message': f'Guest {booking.guest_name} checked out. Room {booking.room.room_number} set to cleaning status.',
            'booking': serializer.data
        })


class StaffRoomStatusBoardView(APIView):
    permission_classes = [IsHotelStaff]

    def get(self, request):
        hotel = request.user.hotel
        rooms = Room.objects.filter(hotel=hotel, is_active=True).select_related('room_type').order_by('room_number')

        today = date.today()
        # Find active occupants for each room (checked_in takes priority over confirmed)
        active_bookings = Booking.objects.filter(
            hotel=hotel,
            status__in=['checked_in', 'confirmed']
        ).exclude(room=None).select_related('guest', 'room').order_by(
            Case(
                When(status='checked_in', then=0),
                default=1,
                output_field=IntegerField(),
            ),
            '-check_in'
        )

        occupants_by_room = {}
        for b in active_bookings:
            if b.room_id and b.room_id not in occupants_by_room:
                occupants_by_room[b.room_id] = b

        now = timezone.now()
        room_data = []
        for r in rooms:
            occ = occupants_by_room.get(r.id)
            # If guest is assigned to the room, physical room status must be occupied
            if occ and r.status == 'available':
                r.status = 'occupied'
                r.save(update_fields=['status'])

            occupant_data = None
            if occ:
                remaining_seconds = None
                is_expired = False
                if occ.check_out_datetime:
                    diff = (occ.check_out_datetime - now).total_seconds()
                    remaining_seconds = max(0, int(diff))
                    is_expired = diff <= 0

                occupant_data = {
                    'booking_id': occ.id,
                    'booking_reference': occ.booking_reference,
                    'guest_name': occ.guest_name,
                    'guest_phone': occ.guest_phone,
                    'check_in': occ.check_in,
                    'check_out': occ.check_out,
                    'status': occ.status,
                    'status_display': occ.get_status_display(),
                    'stay_type': occ.stay_type,
                    'duration_hours': occ.duration_hours,
                    'check_in_datetime': occ.check_in_datetime.isoformat() if occ.check_in_datetime else None,
                    'check_out_datetime': occ.check_out_datetime.isoformat() if occ.check_out_datetime else None,
                    'remaining_seconds': remaining_seconds,
                    'is_expired': is_expired,
                }

            room_data.append({
                'id': r.id,
                'room_number': r.room_number,
                'floor': r.floor,
                'status': r.status,
                'room_type_id': r.room_type.id,
                'room_type': r.room_type.id,
                'room_type_name': r.room_type.name,
                'base_rate': r.room_type.base_rate,
                'short_stay_enabled': r.room_type.short_stay_enabled,
                'rate_3h': r.room_type.rate_3h,
                'rate_6h': r.room_type.rate_6h,
                'rate_12h': r.room_type.rate_12h,
                'rate_24h': r.room_type.rate_24h,
                'occupant': occupant_data
            })

        # Summary counts
        total = len(room_data)
        available = sum(1 for r in room_data if r['status'] == 'available')
        occupied = sum(1 for r in room_data if r['status'] == 'occupied')
        cleaning = sum(1 for r in room_data if r['status'] == 'cleaning')
        maintenance = sum(1 for r in room_data if r['status'] == 'maintenance')

        return Response({
            'hotel_id': hotel.id,
            'hotel_name': hotel.name,
            'summary': {
                'total': total,
                'available': available,
                'occupied': occupied,
                'cleaning': cleaning,
                'maintenance': maintenance,
                'occupancy_rate': round((occupied / total * 100) if total > 0 else 0, 1)
            },
            'rooms': room_data
        })

    def patch(self, request):
        """Allow staff to update room status (e.g. from cleaning to available)"""
        hotel = request.user.hotel
        room_id = request.data.get('room_id')
        new_status = request.data.get('status')

        if not room_id or not new_status:
            return Response({'detail': 'room_id and status are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            room = Room.objects.get(id=room_id, hotel=hotel)
        except Room.DoesNotExist:
            return Response({'detail': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        old_status = room.status
        room.status = new_status
        room.save()

        log_hotel_activity(
            hotel=hotel,
            actor=request.user,
            request=request,
            category='housekeeping',
            action='room_status_changed',
            severity='info' if new_status in ['available', 'cleaning'] else 'warning',
            summary=f"Room {room.room_number} ({room.room_type.name}) housekeeping status set to \"{new_status}\" (was {old_status})",
            details={'room_number': room.room_number, 'old_status': old_status, 'new_status': new_status}
        )

        return Response({
            'message': f'Room {room.room_number} status updated to {new_status}.',
            'room_id': room.id,
            'status': room.status
        })


class StaffExtendStayView(APIView):
    permission_classes = [IsHotelStaff]

    def post(self, request, pk):
        hotel = request.user.hotel
        booking = get_object_or_404(Booking, pk=pk, hotel=hotel)

        if booking.status != 'checked_in':
            return Response({'error': 'Only currently checked-in bookings can be extended.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            additional_hours = int(request.data.get('hours', 3))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid hours parameter.'}, status=status.HTTP_400_BAD_REQUEST)

        if additional_hours not in [3, 6, 12, 24]:
            return Response({'error': 'Extension slot must be 3, 6, 12, or 24 hours.'}, status=status.HTTP_400_BAD_REQUEST)

        rt = booking.room_type
        tier_rate = None
        if additional_hours == 3:
            tier_rate = rt.rate_3h
        elif additional_hours == 6:
            tier_rate = rt.rate_6h
        elif additional_hours == 12:
            tier_rate = rt.rate_12h
        elif additional_hours == 24:
            tier_rate = rt.rate_24h or rt.base_rate

        if tier_rate is None or tier_rate <= 0:
            from decimal import Decimal
            if additional_hours == 3:
                tier_rate = round(rt.base_rate * Decimal('0.30'), 2)
            elif additional_hours == 6:
                tier_rate = round(rt.base_rate * Decimal('0.50'), 2)
            elif additional_hours == 12:
                tier_rate = round(rt.base_rate * Decimal('0.75'), 2)
            else:
                tier_rate = rt.base_rate

        now = timezone.now()
        base_dt = booking.check_out_datetime if (booking.check_out_datetime and booking.check_out_datetime > now) else now
        booking.check_out_datetime = base_dt + timedelta(hours=additional_hours)
        booking.check_out = booking.check_out_datetime.date()
        booking.duration_hours = (booking.duration_hours or 0) + additional_hours
        booking.total_amount += tier_rate
        booking.save()

        if hasattr(booking, 'payment') and booking.payment:
            booking.payment.amount += tier_rate
            booking.payment.save()

        log_hotel_activity(
            hotel=hotel,
            actor=request.user,
            request=request,
            category='booking',
            action='stay_extended',
            severity='info',
            summary=f"Extended stay for {booking.guest_name} ({booking.booking_reference}) by {additional_hours}h (+₱{float(tier_rate):,.2f})",
            details={
                'booking_reference': booking.booking_reference,
                'guest_name': booking.guest_name,
                'additional_hours': additional_hours,
                'added_rate': float(tier_rate),
                'new_total': float(booking.total_amount)
            }
        )

        return Response({
            'message': f'Stay extended by {additional_hours}h until {booking.check_out_datetime.strftime("%I:%M %p")}. Added ₱{tier_rate:,.2f}.',
            'booking_id': booking.id,
            'check_out_datetime': booking.check_out_datetime.isoformat(),
            'total_amount': booking.total_amount
        })


class ServiceRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = GuestRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_hotel_staff:
            return GuestRequest.objects.filter(booking__hotel=user.hotel)
        return GuestRequest.objects.filter(booking__guest=user)

    def create(self, request, *args, **kwargs):
        booking_id = request.data.get('booking')
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_hotel_staff and booking.guest != request.user:
            return Response({'detail': 'You can only submit requests for your own booking.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        req_obj = serializer.save()
        return Response(GuestRequestSerializer(req_obj).data, status=status.HTTP_201_CREATED)


class ServiceRequestUpdateView(APIView):
    permission_classes = [IsHotelStaff]

    def patch(self, request, pk):
        hotel = request.user.hotel
        try:
            req_obj = GuestRequest.objects.get(id=pk, booking__hotel=hotel)
        except GuestRequest.DoesNotExist:
            return Response({'detail': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status in ['pending', 'in_progress', 'resolved']:
            req_obj.status = new_status
            if new_status == 'resolved':
                req_obj.resolved_at = timezone.now()
            req_obj.save()

        return Response(GuestRequestSerializer(req_obj).data)


class AdminOccupancyReportView(APIView):
    permission_classes = [IsHotelStaff]

    def get(self, request):
        hotel = request.user.hotel
        total_rooms = Room.objects.filter(hotel=hotel, is_active=True).count()
        occupied_rooms = Room.objects.filter(hotel=hotel, is_active=True, status='occupied').count()

        occupancy_pct = round((occupied_rooms / total_rooms * 100) if total_rooms > 0 else 0, 1)

        total_bookings = Booking.objects.filter(hotel=hotel).count()
        confirmed_count = Booking.objects.filter(hotel=hotel, status__in=['confirmed', 'checked_in', 'checked_out']).count()
        rejected_count = Booking.objects.filter(hotel=hotel, status='rejected').count()
        pending_count = Booking.objects.filter(hotel=hotel, status='pending_approval').count()

        total_revenue = Booking.objects.filter(
            hotel=hotel,
            status__in=['confirmed', 'checked_in', 'checked_out']
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        return Response({
            'hotel_name': hotel.name,
            'total_rooms': total_rooms,
            'occupied_rooms': occupied_rooms,
            'occupancy_rate': occupancy_pct,
            'total_revenue': total_revenue,
            'stats': {
                'total_bookings': total_bookings,
                'confirmed_bookings': confirmed_count,
                'rejected_bookings': rejected_count,
                'pending_requests': pending_count,
            }
        })
