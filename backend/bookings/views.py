from datetime import date
from django.db import transaction
from django.db.models import Count, Sum, Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from hotels.models import Room
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
                overlapping_room_ids = Booking.objects.filter(
                    hotel=hotel,
                    room_type=booking.room_type,
                    check_in__lt=booking.check_out,
                    check_out__gt=booking.check_in,
                    status__in=['confirmed', 'checked_in']
                ).exclude(id=booking.id).values_list('room_id', flat=True)

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

        if booking.status != 'checked_in':
            return Response(
                {'detail': f'Cannot check out booking with status "{booking.get_status_display()}". Must be checked in.'},
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
        # Find active occupants for each room
        active_bookings = Booking.objects.filter(
            hotel=hotel,
            status='checked_in'
        ).select_related('guest', 'room')

        occupants_by_room = {b.room_id: b for b in active_bookings if b.room_id}

        room_data = []
        for r in rooms:
            occ = occupants_by_room.get(r.id)
            room_data.append({
                'id': r.id,
                'room_number': r.room_number,
                'floor': r.floor,
                'status': r.status,
                'room_type_id': r.room_type.id,
                'room_type_name': r.room_type.name,
                'base_rate': r.room_type.base_rate,
                'occupant': {
                    'booking_id': occ.id,
                    'booking_reference': occ.booking_reference,
                    'guest_name': occ.guest_name,
                    'guest_phone': occ.guest_phone,
                    'check_in': occ.check_in,
                    'check_out': occ.check_out,
                } if occ else None
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

        room.status = new_status
        room.save()

        return Response({
            'message': f'Room {room.room_number} status updated to {new_status}.',
            'room_id': room.id,
            'status': room.status
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
