from rest_framework import serializers
from .models import Hotel, RoomType, Room, HotelAuditLog, Review

DEFAULT_HOTEL_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'
DEFAULT_ROOM_IMAGE = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'

CATEGORY_PRESETS = {
    'beach': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    'mountain': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
    'heritage': 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
    'city': 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=80',
    'eco': 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80',
}


def resolve_hotel_image_url(url, category=None):
    if not url or (isinstance(url, str) and url.startswith('/media/')):
        return CATEGORY_PRESETS.get(category, DEFAULT_HOTEL_IMAGE)
    return url


class RoomSerializer(serializers.ModelSerializer):
    room_type_name = serializers.CharField(source='room_type.name', read_only=True)

    class Meta:
        model = Room
        fields = ['id', 'room_number', 'floor', 'status', 'is_active', 'room_type', 'room_type_name']


class RoomTypeSerializer(serializers.ModelSerializer):
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)
    rooms = RoomSerializer(many=True, read_only=True)
    available_count = serializers.SerializerMethodField()

    class Meta:
        model = RoomType
        fields = [
            'id', 'hotel', 'hotel_name', 'name', 'description',
            'base_rate', 'currency', 'capacity', 'amenities', 'photos',
            'short_stay_enabled', 'rate_3h', 'rate_6h', 'rate_12h', 'rate_24h',
            'rooms', 'available_count'
        ]

    def get_available_count(self, obj):
        return obj.rooms.filter(is_active=True, status='available').count()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        photos = data.get('photos') or []
        cleaned_photos = []
        for p in photos:
            if p and isinstance(p, str) and p.startswith('/media/'):
                cleaned_photos.append(DEFAULT_ROOM_IMAGE)
            elif p:
                cleaned_photos.append(p)
        data['photos'] = cleaned_photos or [DEFAULT_ROOM_IMAGE]
        return data


class HotelListSerializer(serializers.ModelSerializer):
    min_rate = serializers.SerializerMethodField()
    room_types_count = serializers.SerializerMethodField()
    available_rooms_count = serializers.SerializerMethodField()
    room_types_summary = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = [
            'id', 'name', 'slug', 'tagline', 'description', 'address',
            'city', 'province', 'country', 'country_name', 'postal_code',
            'latitude', 'longitude', 'currency', 'timezone', 'category',
            'contact_phone', 'contact_email', 'image_url',
            'amenities', 'rating', 'review_count', 'min_rate',
            'room_types_count', 'available_rooms_count', 'room_types_summary', 'status',
            'payout_method', 'payout_account_name', 'payout_account_number'
        ]

    def get_min_rate(self, obj):
        rates = [rt.base_rate for rt in obj.room_types.all()]
        return min(rates) if rates else None

    def get_room_types_count(self, obj):
        return obj.room_types.count()

    def get_available_rooms_count(self, obj):
        return obj.rooms.filter(is_active=True, status='available').count()

    def get_room_types_summary(self, obj):
        return [
            {
                'id': rt.id,
                'name': rt.name,
                'base_rate': rt.base_rate,
                'short_stay_enabled': rt.short_stay_enabled,
                'rate_3h': rt.rate_3h,
                'rate_6h': rt.rate_6h,
                'rate_12h': rt.rate_12h,
                'rate_24h': rt.rate_24h,
                'capacity': rt.capacity,
                'photo': rt.photos[0] if (rt.photos and len(rt.photos) > 0) else None,
            }
            for rt in obj.room_types.all()
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        url = data.get('image_url')
        if not url:
            first_rt = instance.room_types.first()
            if first_rt and first_rt.photos and len(first_rt.photos) > 0:
                url = first_rt.photos[0]
        data['image_url'] = resolve_hotel_image_url(url, instance.category)
        return data


class HotelDetailSerializer(serializers.ModelSerializer):
    room_types = RoomTypeSerializer(many=True, read_only=True)
    min_rate = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = [
            'id', 'name', 'slug', 'tagline', 'description', 'address',
            'city', 'province', 'country', 'country_name', 'postal_code',
            'latitude', 'longitude', 'currency', 'timezone', 'category',
            'contact_phone', 'contact_email', 'image_url',
            'amenities', 'rating', 'review_count', 'room_types', 'min_rate',
            'status', 'rejection_reason',
            'payout_method', 'payout_account_name', 'payout_account_number'
        ]

    def get_min_rate(self, obj):
        rates = [rt.base_rate for rt in obj.room_types.all()]
        return min(rates) if rates else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        url = data.get('image_url')
        if not url:
            first_rt = instance.room_types.first()
            if first_rt and first_rt.photos and len(first_rt.photos) > 0:
                url = first_rt.photos[0]
        data['image_url'] = resolve_hotel_image_url(url, instance.category)
        return data


class PlatformHotelSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    owner_email = serializers.CharField(source='owner.email', read_only=True)
    owner_name = serializers.SerializerMethodField()
    owner_phone = serializers.CharField(source='owner.phone_number', read_only=True)
    total_rooms = serializers.SerializerMethodField()
    total_room_types = serializers.SerializerMethodField()
    total_bookings = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = [
            'id', 'name', 'slug', 'tagline', 'description', 'address',
            'city', 'province', 'country', 'country_name', 'postal_code',
            'latitude', 'longitude', 'currency', 'timezone', 'category',
            'contact_phone', 'contact_email', 'image_url',
            'amenities', 'status', 'rejection_reason', 'business_permit_number',
            'bir_tin', 'payout_method', 'payout_account_name', 'payout_account_number',
            'commission_rate', 'is_active', 'created_at', 'owner', 'owner_username',
            'owner_email', 'owner_name', 'owner_phone', 'total_rooms',
            'total_room_types', 'total_bookings', 'rating', 'review_count'
        ]

    def get_owner_name(self, obj):
        if obj.owner:
            full = f"{obj.owner.first_name} {obj.owner.last_name}".strip()
            return full or obj.owner.username
        return "Not Assigned"

    def get_total_rooms(self, obj):
        return obj.rooms.count()

    def get_total_room_types(self, obj):
        return obj.room_types.count()

    def get_total_bookings(self, obj):
        return obj.bookings.count() if hasattr(obj, 'bookings') else 0

    def to_representation(self, instance):
        data = super().to_representation(instance)
        url = data.get('image_url')
        if not url:
            first_rt = instance.room_types.first()
            if first_rt and first_rt.photos and len(first_rt.photos) > 0:
                url = first_rt.photos[0]
        data['image_url'] = resolve_hotel_image_url(url, instance.category)
        return data


class HotelManageSerializer(serializers.ModelSerializer):
    image_url = serializers.CharField(max_length=2000, required=False, allow_blank=True)

    class Meta:
        model = Hotel
        fields = [
            'id', 'name', 'slug', 'tagline', 'description', 'address',
            'city', 'province', 'country', 'country_name', 'postal_code',
            'latitude', 'longitude', 'currency', 'timezone', 'category',
            'contact_phone', 'contact_email', 'image_url',
            'amenities', 'status', 'rejection_reason', 'business_permit_number',
            'bir_tin', 'payout_method', 'payout_account_name', 'payout_account_number',
            'commission_rate'
        ]
        read_only_fields = ['id', 'slug', 'status', 'rejection_reason', 'commission_rate']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['image_url'] = resolve_hotel_image_url(data.get('image_url'), instance.category)
        return data


class StaffMemberSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    is_active = serializers.BooleanField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)


class HotelAuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source='actor.email', read_only=True)
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)

    class Meta:
        model = HotelAuditLog
        fields = [
            'id', 'hotel', 'hotel_name', 'actor', 'actor_name', 'actor_role', 'actor_email',
            'category', 'action', 'severity', 'summary', 'details', 'ip_address', 'created_at'
        ]
        read_only_fields = fields


class ReviewSerializer(serializers.ModelSerializer):
    guest_name = serializers.SerializerMethodField()
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)
    booking_reference = serializers.CharField(source='booking.booking_reference', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'hotel', 'hotel_name', 'booking', 'booking_reference',
            'guest', 'guest_name', 'rating', 'comment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'hotel', 'booking', 'guest', 'created_at', 'updated_at']

    def get_guest_name(self, obj):
        if obj.guest:
            full = f"{obj.guest.first_name} {obj.guest.last_name}".strip()
            return full or obj.guest.username
        return "Verified Guest"

