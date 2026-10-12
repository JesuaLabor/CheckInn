from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
from .serializers import RegisterSerializer, UserSerializer, CustomTokenObtainPairSerializer

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user_data = UserSerializer(user).data
        return Response({
            'message': 'Registration successful. You can now log in to reserve your stay.',
            'user': user_data
        }, status=status.HTTP_201_CREATED)


class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class GoogleAuthView(APIView):
    """
    Exchange Google OAuth ID token for CheckInn SimpleJWT tokens.
    Automatically provisions guest account if user does not exist yet.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('id_token') or request.data.get('credential')
        if not token:
            return Response(
                {'error': 'Google token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = None
        first_name = ''
        last_name = ''

        # Support simulated demo Google tokens for local testing
        if token.startswith('demo_google_token') or token == 'demo':
            email = request.data.get('email', 'guest.google@checkinn.local')
            first_name = request.data.get('first_name', 'Google')
            last_name = request.data.get('last_name', 'Traveler')
        else:
            try:
                from google.oauth2 import id_token
                from google.auth.transport import requests as google_requests

                client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
                id_info = id_token.verify_oauth2_token(
                    token,
                    google_requests.Request(),
                    client_id
                )
                email = id_info.get('email')
                first_name = id_info.get('given_name', '')
                last_name = id_info.get('family_name', '')
            except Exception as e:
                return Response(
                    {'error': f'Failed to verify Google token: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if not email:
            return Response(
                {'error': 'Email address was not provided by Google account.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create guest user
        user = User.objects.filter(email=email).first()
        created = False
        if not user:
            base_username = email.split('@')[0].replace('.', '_').replace('+', '_')
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                password=None,
                first_name=first_name,
                last_name=last_name,
                role='guest'
            )
            created = True

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'message': 'Signed in with Google successfully!',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'is_new_user': created
        }, status=status.HTTP_200_OK)
