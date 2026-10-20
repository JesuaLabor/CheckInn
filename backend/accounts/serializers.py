from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    hotel = serializers.SerializerMethodField()
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)
    hotel_slug = serializers.CharField(source='hotel.slug', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'hotel', 'hotel_name', 'hotel_slug', 'phone_number'
        ]
        read_only_fields = ['id', 'role', 'hotel', 'hotel_name', 'hotel_slug']

    def get_id(self, obj):
        return str(obj.id) if obj.id is not None else None

    def get_hotel(self, obj):
        try:
            if obj.hotel_id:
                return str(obj.hotel_id)
        except Exception:
            pass
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone_number']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            role='guest'
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['role'] = user.role
        token['email'] = user.email
        try:
            hotel = getattr(user, 'effective_hotel', None) or getattr(user, 'hotel', None)
            if hotel:
                token['hotel_id'] = str(hotel.id)
                token['hotel_name'] = str(hotel.name)
                token['hotel_slug'] = str(hotel.slug)
        except Exception:
            pass
        return token

    def validate(self, attrs):
        # Allow users to log in with either their username OR their email address
        username_or_email = attrs.get('username', '')
        if '@' in username_or_email:
            matched_user = User.objects.filter(email__iexact=username_or_email.strip()).first()
            if matched_user:
                attrs['username'] = matched_user.username

        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data
