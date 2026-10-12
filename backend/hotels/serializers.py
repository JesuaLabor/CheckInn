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
            'base_rate', 'capacity', 'amenities', 'photos', 'rooms', 'available_count'
        ]

    def get_available_count(self, obj):
        return obj.rooms.filter(is_active=True, status='available').count()


class HotelListSerializer(serializers.ModelSerializer):
    min_rate = serializers.SerializerMethodField()
    room_types_count = serializers.SerializerMethodField()
    available_rooms_count = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = [
            'id', 'name', 'slug', 'tagline', 'description', 'address',
            'city', 'province', 'contact_phone', 'contact_email', 'image_url',
            'amenities', 'rating', 'review_count', 'min_rate',
            'room_types_count', 'available_rooms_count'
        ]

    def get_min_rate(self, obj):
        rates = [rt.base_rate for rt in obj.room_types.all()]
        return min(rates) if rates else None

    def get_room_types_count(self, obj):
        return obj.room_types.count()

    def get_available_rooms_count(self, obj):
        return obj.rooms.filter(is_active=True, status='available').count()


class HotelDetailSerializer(serializers.ModelSerializer):
    room_types = RoomTypeSerializer(many=True, read_only=True)
    min_rate = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = [
            'id', 'name', 'slug', 'tagline', 'description', 'address',
            'city', 'province', 'contact_phone', 'contact_email', 'image_url',
            'amenities', 'rating', 'review_count', 'room_types', 'min_rate'
        ]

    def get_min_rate(self, obj):
        rates = [rt.base_rate for rt in obj.room_types.all()]
        return min(rates) if rates else None
