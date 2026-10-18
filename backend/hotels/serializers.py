from rest_framework import serializers
from .models import Hotel, RoomType, Room


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
        if not data.get('image_url'):
            first_rt = instance.room_types.first()
            if first_rt and first_rt.photos and len(first_rt.photos) > 0:
                data['image_url'] = first_rt.photos[0]
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


class HotelManageSerializer(serializers.ModelSerializer):
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


class StaffMemberSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    is_active = serializers.BooleanField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)
