from datetime import datetime
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Hotel, RoomType, Room
from .serializers import HotelListSerializer, HotelDetailSerializer, RoomTypeSerializer, RoomSerializer


class HotelListView(generics.ListAPIView):
    serializer_class = HotelListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Hotel.objects.filter(is_active=True).prefetch_related('room_types', 'rooms')
        q = self.request.query_params.get('q')
        if q:
            queryset = queryset.filter(
                Q(name__icontains=q) |
                Q(address__icontains=q) |
                Q(description__icontains=q) |
                Q(tagline__icontains=q)
            )

        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__icontains=city)

        min_price = self.request.query_params.get('min_price')
        if min_price:
            queryset = queryset.filter(room_types__base_rate__gte=min_price)

        max_price = self.request.query_params.get('max_price')
        if max_price:
            queryset = queryset.filter(room_types__base_rate__lte=max_price)

        guests = self.request.query_params.get('guests')
        if guests:
            queryset = queryset.filter(room_types__capacity__gte=guests)

        return queryset.distinct()


class HotelDetailView(generics.RetrieveAPIView):
    queryset = Hotel.objects.filter(is_active=True).prefetch_related('room_types__rooms')
    serializer_class = HotelDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'


class AvailableRoomsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            hotel = Hotel.objects.get(slug=slug, is_active=True)
        except Hotel.DoesNotExist:
            return Response({'detail': 'Hotel not found.'}, status=status.HTTP_404_NOT_FOUND)

        check_in_str = request.query_params.get('check_in')
        check_out_str = request.query_params.get('check_out')

        now = timezone.now()

        room_types = hotel.room_types.all()
        results = []

        for rt in room_types:
            rooms = rt.rooms.filter(is_active=True)
            total_rooms = rooms.count()

            if check_in_str and check_out_str:
                try:
                    check_in = datetime.strptime(check_in_str, '%Y-%m-%d').date()
                    check_out = datetime.strptime(check_out_str, '%Y-%m-%d').date()

                    # Find active overlapping bookings or valid soft holds
                    from bookings.models import Booking
                    overlapping = Booking.objects.filter(
                        hotel=hotel,
                        room_type=rt,
                        check_in__lt=check_out,
                        check_out__gt=check_in
                    ).filter(
                        Q(status__in=['confirmed', 'checked_in']) |
                        Q(status='pending_approval', hold_expires_at__gt=now)
                    )

                    # Number of blocked rooms
                    booked_count = overlapping.count()
                    available_count = max(0, total_rooms - booked_count)
                except ValueError:
                    available_count = rooms.filter(status='available').count()
            else:
                available_count = rooms.filter(status='available').count()

            results.append({
                'id': rt.id,
                'name': rt.name,
                'description': rt.description,
                'base_rate': rt.base_rate,
                'capacity': rt.capacity,
                'amenities': rt.amenities,
                'photos': rt.photos,
                'total_rooms': total_rooms,
                'available_count': available_count,
            })

        return Response({
            'hotel_id': hotel.id,
            'hotel_name': hotel.name,
            'hotel_slug': hotel.slug,
            'room_types': results
        })
