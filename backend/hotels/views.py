import os
import uuid
import base64
from datetime import datetime
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Q, Count, Sum
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.serializers import UserSerializer
from bookings.models import Booking
from .models import Hotel, RoomType, Room
from .permissions import IsPlatformSuperAdmin, IsHotelOwnerOrAdmin
from .serializers import (
    HotelListSerializer,
    HotelDetailSerializer,
    RoomTypeSerializer,
    RoomSerializer,
    PlatformHotelSerializer,
    HotelManageSerializer,
    StaffMemberSerializer,
)

User = get_user_model()


class HotelListView(generics.ListAPIView):
    serializer_class = HotelListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Public marketplace exposes approved, active properties
        queryset = Hotel.objects.filter(is_active=True, status='approved').prefetch_related('room_types', 'rooms')
        
        q = self.request.query_params.get('q')
        if q:
            queryset = queryset.filter(
                Q(name__icontains=q) |
                Q(address__icontains=q) |
                Q(city__icontains=q) |
                Q(province__icontains=q) |
                Q(country_name__icontains=q) |
                Q(country__iexact=q) |
                Q(description__icontains=q) |
                Q(tagline__icontains=q)
            )

        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__icontains=city)

        province = self.request.query_params.get('province')
        if province:
            queryset = queryset.filter(province__icontains=province)

        country = self.request.query_params.get('country')
        if country:
            queryset = queryset.filter(Q(country__iexact=country) | Q(country_name__icontains=country))

        category = self.request.query_params.get('category')
        if category and category.lower() != 'all':
            queryset = queryset.filter(category__iexact=category)

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


class DestinationListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Returns popular destinations across Philippines and internationally with active lodging counts."""
        hotels = Hotel.objects.filter(is_active=True, status='approved')
        destinations = []
        seen = set()
        for h in hotels:
            key = (h.city, h.country)
            if key not in seen:
                seen.add(key)
                count = hotels.filter(city=h.city, country=h.country).count()
                destinations.append({
                    'city': h.city,
                    'province': h.province,
                    'country': h.country,
                    'country_name': h.country_name,
                    'category': h.category,
                    'count': count,
                    'image_url': h.image_url,
                })
        return Response(destinations)


class ExchangeRatesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Returns live multi-currency exchange rates relative to PHP."""
        rates = {
            'PHP': 1.0,
            'USD': 0.0175,
            'EUR': 0.0162,
            'JPY': 2.65,
            'SGD': 0.0234,
            'AUD': 0.0268,
            'GBP': 0.0138,
        }
        symbols = {
            'PHP': '₱',
            'USD': '$',
            'EUR': '€',
            'JPY': '¥',
            'SGD': 'S$',
            'AUD': 'A$',
            'GBP': '£',
        }
        return Response({
            'base': 'PHP',
            'rates': rates,
            'symbols': symbols,
        })


class HotelDetailView(generics.RetrieveAPIView):
    serializer_class = HotelDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and (user.role == 'superadmin' or user.is_superuser):
            return Hotel.objects.all().prefetch_related('room_types__rooms')
        if user.is_authenticated and user.hotel:
            # Allow staff and admin to view their own property even if pending
            return Hotel.objects.filter(
                Q(status='approved') | Q(id=user.hotel_id)
            ).prefetch_related('room_types__rooms')
        return Hotel.objects.filter(is_active=True, status='approved').prefetch_related('room_types__rooms')


class AvailableRoomsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        user = request.user
        hotel_qs = Hotel.objects.filter(slug=slug, is_active=True)
        if not (user.is_authenticated and (user.role == 'superadmin' or (user.hotel and user.hotel.slug == slug))):
            hotel_qs = hotel_qs.filter(status='approved')

        try:
            hotel = hotel_qs.get()
        except Hotel.DoesNotExist:
            return Response({'detail': 'Hotel not found or not currently available.'}, status=status.HTTP_404_NOT_FOUND)

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

                    overlapping = Booking.objects.filter(
                        hotel=hotel,
                        room_type=rt,
                        check_in__lt=check_out,
                        check_out__gt=check_in
                    ).filter(
                        Q(status__in=['confirmed', 'checked_in']) |
                        Q(status='pending_approval', hold_expires_at__gt=now)
                    )

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


# ==========================================
# PARTNER REGISTRATION VIEW
# ==========================================

class PartnerRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        data = request.data

        # 1. Validate required owner fields
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        phone_number = data.get('phone_number', '').strip()

        if not username or not password or not email:
            return Response(
                {'error': 'Username, email, and password are required for the owner account.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {'error': f'Username "{username}" is already taken. Please choose another.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {'error': f'Email "{email}" is already registered. Please sign in or use another email.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Validate required hotel fields
        hotel_name = data.get('hotel_name', '').strip()
        address = data.get('address', '').strip()
        city = data.get('city', '').strip() or 'Malaybalay City'
        province = data.get('province', '').strip() or 'Bukidnon'
        country = data.get('country', 'PH').strip().upper()
        country_name = data.get('country_name', 'Philippines').strip()
        postal_code = data.get('postal_code', '').strip()
        currency = data.get('currency', 'PHP').strip().upper()
        timezone_val = data.get('timezone', 'Asia/Manila').strip()
        category = data.get('category', 'mountain').strip().lower()

        if not hotel_name or not address:
            return Response(
                {'error': 'Property name and complete address are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Create Owner User
        owner_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            role='admin'  # Hotel Owner / Admin
        )

        # Coordinates (optional from map pin picker)
        raw_lat = data.get('latitude')
        raw_lng = data.get('longitude')
        lat = None
        lng = None
        try:
            if raw_lat is not None and str(raw_lat).strip() != '':
                lat = float(raw_lat)
            if raw_lng is not None and str(raw_lng).strip() != '':
                lng = float(raw_lng)
        except (ValueError, TypeError):
            lat = None
            lng = None

        # 4. Process Cover Photo (supports attached file, base64 data URI, or preset/external URL)
        default_cover = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'
        final_image_url = default_cover

        uploaded_image = request.FILES.get('image') or request.FILES.get('cover_photo') or request.FILES.get('image_url')
        if uploaded_image:
            ext = os.path.splitext(uploaded_image.name)[1].lower() or '.jpg'
            if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.avif']:
                ext = '.jpg'
            filename = f"hotels/{uuid.uuid4().hex}{ext}"
            file_path = default_storage.save(filename, uploaded_image)
            final_image_url = f"/media/{file_path}"
        else:
            raw_image = data.get('image_url', '')
            if isinstance(raw_image, str) and raw_image.strip():
                raw_image = raw_image.strip()
                if raw_image.startswith('data:image/') and ';base64,' in raw_image:
                    try:
                        header, b64data = raw_image.split(';base64,', 1)
                        mime = header.split(';')[0].replace('data:image/', '')
                        ext = 'png' if 'png' in mime else 'webp' if 'webp' in mime else 'jpg'
                        filename = f"hotels/{uuid.uuid4().hex}.{ext}"
                        file_path = default_storage.save(filename, ContentFile(base64.b64decode(b64data)))
                        final_image_url = f"/media/{file_path}"
                    except Exception:
                        final_image_url = default_cover
                else:
                    final_image_url = raw_image

        # 5. Create Hotel Entity with pending status
        hotel = Hotel.objects.create(
            name=hotel_name,
            tagline=data.get('tagline', '').strip(),
            description=data.get('description', '').strip(),
            address=address,
            city=city,
            province=province,
            country=country,
            country_name=country_name,
            postal_code=postal_code,
            latitude=lat,
            longitude=lng,
            currency=currency,
            timezone=timezone_val,
            category=category,
            contact_phone=data.get('contact_phone', phone_number),
            contact_email=data.get('contact_email', email),
            image_url=final_image_url,
            amenities=data.get('amenities', ['Wi-Fi', 'Air Conditioning', 'Hot Shower']),
            business_permit_number=data.get('business_permit_number', '').strip(),
            bir_tin=data.get('bir_tin', '').strip(),
            payout_method=data.get('payout_method', 'GCash'),
            payout_account_name=data.get('payout_account_name', f"{first_name} {last_name}".strip()),
            payout_account_number=data.get('payout_account_number', '').strip(),
            owner=owner_user,
            status='pending',
            is_active=True
        )

        # Link owner to the new hotel
        owner_user.hotel = hotel
        owner_user.save()

        # Generate JWT tokens for auto-login
        refresh = RefreshToken.for_user(owner_user)

        return Response({
            'message': 'Partnership application submitted successfully! Your property is in review by LocalStay Admin.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(owner_user).data,
            'hotel': HotelManageSerializer(hotel).data
        }, status=status.HTTP_201_CREATED)


# ==========================================
# PLATFORM SUPER ADMIN VIEWS
# ==========================================

class PlatformStatsView(APIView):
    permission_classes = [IsPlatformSuperAdmin]

    def get(self, request):
        total_hotels = Hotel.objects.count()
        pending_hotels = Hotel.objects.filter(status='pending').count()
        approved_hotels = Hotel.objects.filter(status='approved').count()
        rejected_hotels = Hotel.objects.filter(status='rejected').count()
        suspended_hotels = Hotel.objects.filter(status='suspended').count()

        total_rooms = Room.objects.count()
        total_bookings = Booking.objects.count()
        confirmed_bookings = Booking.objects.filter(status__in=['confirmed', 'checked_in', 'checked_out']).count()

        gmv_agg = Booking.objects.filter(
            status__in=['confirmed', 'checked_in', 'checked_out']
        ).aggregate(total=Sum('total_amount'))
        total_gmv = float(gmv_agg['total'] or 0.0)

        # Average platform commission 10%
        estimated_commission = round(total_gmv * 0.10, 2)

        return Response({
            'total_hotels': total_hotels,
            'pending_hotels': pending_hotels,
            'approved_hotels': approved_hotels,
            'rejected_hotels': rejected_hotels,
            'suspended_hotels': suspended_hotels,
            'total_rooms': total_rooms,
            'total_bookings': total_bookings,
            'confirmed_bookings': confirmed_bookings,
            'total_gmv': total_gmv,
            'estimated_commission': estimated_commission,
        })


class PlatformHotelListView(generics.ListAPIView):
    serializer_class = PlatformHotelSerializer
    permission_classes = [IsPlatformSuperAdmin]

    def get_queryset(self):
        queryset = Hotel.objects.all().select_related('owner').prefetch_related('rooms', 'room_types', 'bookings')
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            queryset = queryset.filter(status=status_filter)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(business_permit_number__icontains=search) |
                Q(owner__username__icontains=search) |
                Q(owner__email__icontains=search)
            )

        return queryset.order_by('-created_at')


class PlatformHotelReviewView(APIView):
    permission_classes = [IsPlatformSuperAdmin]

    def post(self, request, pk):
        try:
            hotel = Hotel.objects.get(pk=pk)
        except Hotel.DoesNotExist:
            return Response({'error': 'Hotel not found.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')  # approve, reject, suspend, reactivate
        reason = request.data.get('rejection_reason', '').strip()

        if action == 'approve':
            hotel.status = 'approved'
            hotel.rejection_reason = ''
            hotel.is_active = True
        elif action == 'reject':
            hotel.status = 'rejected'
            hotel.rejection_reason = reason or 'Application did not meet requirements.'
        elif action == 'suspend':
            hotel.status = 'suspended'
            hotel.rejection_reason = reason or 'Property temporarily suspended by platform administrator.'
        elif action == 'reactivate':
            hotel.status = 'approved'
            hotel.rejection_reason = ''
            hotel.is_active = True
        else:
            return Response({'error': f'Invalid action "{action}". Must be approve, reject, suspend, or reactivate.'}, status=status.HTTP_400_BAD_REQUEST)

        hotel.save()
        serializer = PlatformHotelSerializer(hotel)
        return Response({
            'message': f'Property "{hotel.name}" has been successfully updated to {hotel.get_status_display()}.',
            'hotel': serializer.data
        })


# ==========================================
# HOTEL OWNER MANAGEMENT VIEWS
# ==========================================

class HotelManageProfileView(APIView):
    permission_classes = [IsHotelOwnerOrAdmin]

    def get(self, request):
        hotel = request.user.hotel
        if not hotel:
            return Response({'error': 'No hotel assigned to this account.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = HotelManageSerializer(hotel)
        return Response(serializer.data)

    def patch(self, request):
        hotel = request.user.hotel
        if not hotel:
            return Response({'error': 'No hotel assigned to this account.'}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        uploaded_image = request.FILES.get('image') or request.FILES.get('cover_photo') or request.FILES.get('image_url')
        if uploaded_image:
            ext = os.path.splitext(uploaded_image.name)[1].lower() or '.jpg'
            if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.avif']:
                ext = '.jpg'
            filename = f"hotels/{uuid.uuid4().hex}{ext}"
            file_path = default_storage.save(filename, uploaded_image)
            data['image_url'] = f"/media/{file_path}"
        elif 'image_url' in data and isinstance(data['image_url'], str):
            raw_image = data['image_url'].strip()
            if raw_image.startswith('data:image/') and ';base64,' in raw_image:
                try:
                    header, b64data = raw_image.split(';base64,', 1)
                    mime = header.split(';')[0].replace('data:image/', '')
                    ext = 'png' if 'png' in mime else 'webp' if 'webp' in mime else 'jpg'
                    filename = f"hotels/{uuid.uuid4().hex}.{ext}"
                    file_path = default_storage.save(filename, ContentFile(base64.b64decode(b64data)))
                    data['image_url'] = f"/media/{file_path}"
                except Exception:
                    pass

        serializer = HotelManageSerializer(hotel, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'message': 'Hotel settings saved successfully.',
            'hotel': serializer.data
        })


class HotelManageStaffView(APIView):
    permission_classes = [IsHotelOwnerOrAdmin]

    def get(self, request):
        hotel = request.user.hotel
        if not hotel:
            return Response({'error': 'No hotel assigned.'}, status=status.HTTP_400_BAD_REQUEST)

        staff_users = User.objects.filter(hotel=hotel, role__in=['staff', 'admin']).order_by('-date_joined')
        data = [
            {
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'full_name': f"{u.first_name} {u.last_name}".strip() or u.username,
                'role': u.role,
                'phone_number': u.phone_number,
                'is_active': u.is_active,
                'date_joined': u.date_joined,
            }
            for u in staff_users
        ]
        return Response(data)

    def post(self, request):
        hotel = request.user.hotel
        if not hotel:
            return Response({'error': 'No hotel assigned.'}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        username = data.get('username', '').strip()
        password = data.get('password', '')
        email = data.get('email', '').strip()
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        phone_number = data.get('phone_number', '').strip()

        if not username or not password:
            return Response({'error': 'Username and password are required for staff account.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': f'Username "{username}" is already in use.'}, status=status.HTTP_400_BAD_REQUEST)

        staff_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            role='staff',
            hotel=hotel
        )

        return Response({
            'message': f'Staff member "{staff_user.username}" registered successfully.',
            'staff': {
                'id': staff_user.id,
                'username': staff_user.username,
                'email': staff_user.email,
                'first_name': staff_user.first_name,
                'last_name': staff_user.last_name,
                'full_name': f"{staff_user.first_name} {staff_user.last_name}".strip() or staff_user.username,
                'role': staff_user.role,
                'phone_number': staff_user.phone_number,
                'is_active': staff_user.is_active,
                'date_joined': staff_user.date_joined,
            }
        }, status=status.HTTP_201_CREATED)


class HotelManageStaffDetailView(APIView):
    permission_classes = [IsHotelOwnerOrAdmin]

    def delete(self, request, pk):
        hotel = request.user.hotel
        try:
            staff_user = User.objects.get(pk=pk, hotel=hotel)
        except User.DoesNotExist:
            return Response({'error': 'Staff member not found under your hotel.'}, status=status.HTTP_404_NOT_FOUND)

        if staff_user == request.user:
            return Response({'error': 'You cannot remove your own administrator account.'}, status=status.HTTP_400_BAD_REQUEST)

        # Deactivate staff user
        staff_user.is_active = False
        staff_user.save()
        return Response({'message': f'Staff member "{staff_user.username}" deactivated.'})


class HotelManageRoomTypeView(APIView):
    permission_classes = [IsHotelOwnerOrAdmin]

    def get(self, request):
        hotel = request.user.hotel
        room_types = RoomType.objects.filter(hotel=hotel).prefetch_related('rooms')
        serializer = RoomTypeSerializer(room_types, many=True)
        return Response(serializer.data)

    def post(self, request):
        hotel = request.user.hotel
        data = request.data

        name = data.get('name', '').strip()
        base_rate = data.get('base_rate')
        capacity = data.get('capacity', 2)

        if not name or not base_rate:
            return Response({'error': 'Room category name and base rate (₱) are required.'}, status=status.HTTP_400_BAD_REQUEST)

        amenities = data.get('amenities', [])
        if isinstance(amenities, str):
            amenities = [a.strip() for a in amenities.split(',') if a.strip()]

        saved_photos = []

        # 1. Handle multipart uploaded file(s) from local device
        uploaded_files = request.FILES.getlist('photos') or ([request.FILES.get('photo')] if request.FILES.get('photo') else [])
        for f in uploaded_files:
            if f:
                ext = os.path.splitext(f.name)[1].lower() or '.jpg'
                if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.avif']:
                    ext = '.jpg'
                filename = f"rooms/{uuid.uuid4().hex}{ext}"
                file_path = default_storage.save(filename, f)
                saved_photos.append(f"/media/{file_path}")

        # 2. Handle base64 encoded photo or photo list
        raw_photos = data.get('photos', [])
        if isinstance(raw_photos, str):
            raw_photos = [p.strip() for p in raw_photos.split(',') if p.strip()]

        if data.get('photo') and isinstance(data.get('photo'), str):
            raw_photos.append(data.get('photo'))

        for p in raw_photos:
            if not p:
                continue
            if p.startswith('data:image/') and ';base64,' in p:
                try:
                    header, b64data = p.split(';base64,', 1)
                    mime = header.split(';')[0].replace('data:image/', '')
                    ext = 'png' if 'png' in mime else 'webp' if 'webp' in mime else 'jpg'
                    filename = f"rooms/{uuid.uuid4().hex}.{ext}"
                    file_path = default_storage.save(filename, ContentFile(base64.b64decode(b64data)))
                    saved_photos.append(f"/media/{file_path}")
                except Exception:
                    pass
            elif p.startswith('http://') or p.startswith('https://') or p.startswith('/media/'):
                saved_photos.append(p)

        if not saved_photos:
            saved_photos = ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80']

        rt = RoomType.objects.create(
            hotel=hotel,
            name=name,
            description=data.get('description', ''),
            base_rate=base_rate,
            capacity=capacity,
            amenities=amenities,
            photos=saved_photos
        )
        serializer = RoomTypeSerializer(rt)
        return Response({
            'message': f'Room category "{rt.name}" added successfully.',
            'room_type': serializer.data
        }, status=status.HTTP_201_CREATED)


class HotelManageRoomView(APIView):
    permission_classes = [IsHotelOwnerOrAdmin]

    def get(self, request):
        hotel = request.user.hotel
        rooms = Room.objects.filter(hotel=hotel).select_related('room_type').order_by('floor', 'room_number')
        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data)

    def post(self, request):
        hotel = request.user.hotel
        data = request.data

        room_number = data.get('room_number', '').strip()
        floor = data.get('floor', '1st Floor').strip()
        room_type_id = data.get('room_type_id')

        if not room_number or not room_type_id:
            return Response({'error': 'Room number and Room Category are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            room_type = RoomType.objects.get(id=room_type_id, hotel=hotel)
        except RoomType.DoesNotExist:
            return Response({'error': 'Invalid Room Category selected.'}, status=status.HTTP_400_BAD_REQUEST)

        if Room.objects.filter(hotel=hotel, room_number=room_number).exists():
            return Response({'error': f'Room number "{room_number}" already exists in this hotel.'}, status=status.HTTP_400_BAD_REQUEST)

        room = Room.objects.create(
            hotel=hotel,
            room_type=room_type,
            room_number=room_number,
            floor=floor,
            status='available',
            is_active=True
        )

        serializer = RoomSerializer(room)
        return Response({
            'message': f'Room "{room.room_number}" added successfully.',
            'room': serializer.data
        }, status=status.HTTP_201_CREATED)


class HotelManageRoomTypeDetailView(APIView):
    permission_classes = [IsHotelOwnerOrAdmin]

    def patch(self, request, pk):
        hotel = request.user.hotel
        try:
            rt = RoomType.objects.get(pk=pk, hotel=hotel)
        except RoomType.DoesNotExist:
            return Response({'error': 'Room category not found under your hotel.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        if 'name' in data:
            name = str(data.get('name', '')).strip()
            if not name:
                return Response({'error': 'Room category name cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
            rt.name = name

        if 'base_rate' in data:
            try:
                base_rate = float(data.get('base_rate'))
                if base_rate <= 0:
                    return Response({'error': 'Base rate must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)
                rt.base_rate = base_rate
            except (ValueError, TypeError):
                return Response({'error': 'Invalid base rate format.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'capacity' in data:
            try:
                rt.capacity = max(1, int(data.get('capacity', 2)))
            except (ValueError, TypeError):
                pass

        if 'description' in data:
            rt.description = str(data.get('description', '')).strip()

        if 'amenities' in data:
            amenities = data.get('amenities')
            if isinstance(amenities, str):
                amenities = [a.strip() for a in amenities.split(',') if a.strip()]
            if isinstance(amenities, list):
                rt.amenities = amenities

        # Handle uploaded photo from local device
        new_photos = []
        uploaded_files = request.FILES.getlist('photos') or ([request.FILES.get('photo')] if request.FILES.get('photo') else [])
        for f in uploaded_files:
            if f:
                ext = os.path.splitext(f.name)[1].lower() or '.jpg'
                if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.avif']:
                    ext = '.jpg'
                filename = f"rooms/{uuid.uuid4().hex}{ext}"
                file_path = default_storage.save(filename, f)
                new_photos.append(f"/media/{file_path}")

        raw_photos = data.get('photos', [])
        if isinstance(raw_photos, str):
            raw_photos = [p.strip() for p in raw_photos.split(',') if p.strip()]

        if data.get('photo') and isinstance(data.get('photo'), str):
            raw_photos.append(data.get('photo'))

        for p in raw_photos:
            if not p:
                continue
            if p.startswith('data:image/') and ';base64,' in p:
                try:
                    header, b64data = p.split(';base64,', 1)
                    mime = header.split(';')[0].replace('data:image/', '')
                    ext = 'png' if 'png' in mime else 'webp' if 'webp' in mime else 'jpg'
                    filename = f"rooms/{uuid.uuid4().hex}.{ext}"
                    file_path = default_storage.save(filename, ContentFile(base64.b64decode(b64data)))
                    new_photos.append(f"/media/{file_path}")
                except Exception:
                    pass
            elif p.startswith('http://') or p.startswith('https://') or p.startswith('/media/'):
                new_photos.append(p)

        if new_photos:
            rt.photos = new_photos

        rt.save()
        serializer = RoomTypeSerializer(rt)
        return Response({
            'message': f'Room category "{rt.name}" updated successfully.',
            'room_type': serializer.data
        })

    def delete(self, request, pk):
        hotel = request.user.hotel
        try:
            rt = RoomType.objects.get(pk=pk, hotel=hotel)
        except RoomType.DoesNotExist:
            return Response({'error': 'Room category not found under your hotel.'}, status=status.HTTP_404_NOT_FOUND)

        # Check for active reservations
        has_active_bookings = Booking.objects.filter(
            room_type=rt,
            status__in=['pending_approval', 'confirmed', 'checked_in']
        ).exists()

        if has_active_bookings:
            return Response({
                'error': f'Cannot delete room category "{rt.name}" because active or pending reservations exist for it.'
            }, status=status.HTTP_400_BAD_REQUEST)

        category_name = rt.name
        rt.delete()
        return Response({'message': f'Room category "{category_name}" has been deleted.'})


class HotelManageRoomDetailView(APIView):
    permission_classes = [IsHotelOwnerOrAdmin]

    def patch(self, request, pk):
        hotel = request.user.hotel
        try:
            room = Room.objects.get(pk=pk, hotel=hotel)
        except Room.DoesNotExist:
            return Response({'error': 'Physical room not found under your hotel.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        if 'room_number' in data:
            room_number = str(data.get('room_number', '')).strip()
            if not room_number:
                return Response({'error': 'Room number cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
            if Room.objects.filter(hotel=hotel, room_number=room_number).exclude(pk=room.pk).exists():
                return Response({'error': f'Room number "{room_number}" is already used by another room in your hotel.'}, status=status.HTTP_400_BAD_REQUEST)
            room.room_number = room_number

        if 'floor' in data:
            room.floor = str(data.get('floor', '1st Floor')).strip()

        if 'room_type_id' in data:
            try:
                room_type = RoomType.objects.get(id=data.get('room_type_id'), hotel=hotel)
                room.room_type = room_type
            except RoomType.DoesNotExist:
                return Response({'error': 'Selected room category is invalid.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'status' in data:
            valid_statuses = [choice[0] for choice in Room.STATUS_CHOICES]
            status_val = data.get('status')
            if status_val in valid_statuses:
                room.status = status_val

        if 'is_active' in data:
            room.is_active = bool(data.get('is_active'))

        room.save()
        serializer = RoomSerializer(room)
        return Response({
            'message': f'Room "{room.room_number}" updated successfully.',
            'room': serializer.data
        })

    def delete(self, request, pk):
        hotel = request.user.hotel
        try:
            room = Room.objects.get(pk=pk, hotel=hotel)
        except Room.DoesNotExist:
            return Response({'error': 'Physical room not found under your hotel.'}, status=status.HTTP_404_NOT_FOUND)

        has_active_stay = Booking.objects.filter(
            room=room,
            status__in=['pending_approval', 'confirmed', 'checked_in']
        ).exists()

        if has_active_stay:
            return Response({
                'error': f'Cannot delete Room "{room.room_number}" because an active or pending booking is assigned to it.'
            }, status=status.HTTP_400_BAD_REQUEST)

        room_num = room.room_number
        room.delete()
        return Response({'message': f'Room "{room_num}" deleted successfully.'})

