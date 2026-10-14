from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from hotels.models import Hotel

User = get_user_model()


class AccountsAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.hotel = Hotel.objects.create(
            name='Highland Pine Suites',
            slug='highland-pine-suites',
            address='Fortich St, Malaybalay City',
            city='Malaybalay City',
            status='approved'
        )
        self.staff_user = User.objects.create_user(
            username='staff_john',
            email='john@highlandpine.ph',
            password='StaffPassword123!',
            role='staff',
            hotel=self.hotel
        )

    def test_guest_registration_success(self):
        """Self-registration creates guest user and returns success message."""
        payload = {
            'username': 'traveler_juan',
            'email': 'juan@example.ph',
            'password': 'SecurePassword123!',
            'first_name': 'Juan',
            'last_name': 'Dela Cruz',
            'phone_number': '+63 917 555 4321'
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'traveler_juan')
        self.assertEqual(response.data['user']['role'], 'guest')

        created = User.objects.get(username='traveler_juan')
        self.assertEqual(created.email, 'juan@example.ph')
        self.assertTrue(created.check_password('SecurePassword123!'))

    def test_registration_duplicate_username_fails(self):
        """Registration with existing username is rejected with 400."""
        User.objects.create_user(username='existing_user', password='Password123!')
        payload = {
            'username': 'existing_user',
            'email': 'different@example.com',
            'password': 'Password123!'
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_registration_short_password_fails(self):
        """Password under minimum length requirement is rejected."""
        payload = {
            'username': 'short_pass_user',
            'email': 'short@example.com',
            'password': '123'
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_login_success_and_jwt_payload(self):
        """Successful login returns access, refresh, and user metadata with hotel scoping."""
        payload = {
            'username': 'staff_john',
            'password': 'StaffPassword123!'
        }
        response = self.client.post('/api/v1/auth/login/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['role'], 'staff')
        self.assertEqual(response.data['user']['hotel_name'], 'Highland Pine Suites')

    def test_login_invalid_password_fails(self):
        """Login with incorrect password returns 401 unauthorized."""
        payload = {
            'username': 'staff_john',
            'password': 'WrongPassword999'
        }
        response = self.client.post('/api/v1/auth/login/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_current_user_me_endpoint(self):
        """GET /api/v1/auth/me/ requires auth and returns current user details."""
        # Unauthenticated
        unauth_resp = self.client.get('/api/v1/auth/me/')
        self.assertEqual(unauth_resp.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated
        self.client.force_authenticate(user=self.staff_user)
        auth_resp = self.client.get('/api/v1/auth/me/')
        self.assertEqual(auth_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(auth_resp.data['username'], 'staff_john')
        self.assertEqual(auth_resp.data['role'], 'staff')

    def test_token_refresh_endpoint(self):
        """POST /api/v1/auth/refresh/ provides a new access token using a valid refresh token."""
        login_resp = self.client.post('/api/v1/auth/login/', {
            'username': 'staff_john',
            'password': 'StaffPassword123!'
        }, format='json')
        refresh_token = login_resp.data['refresh']

        refresh_resp = self.client.post('/api/v1/auth/refresh/', {
            'refresh': refresh_token
        }, format='json')
        self.assertEqual(refresh_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_resp.data)


class GoogleAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_google_login_provisions_guest_user(self):
        """Simulated Google token provisions a new guest user and returns JWT."""
        payload = {
            'id_token': 'demo_google_token_123',
            'email': 'maria.traveler@gmail.com',
            'first_name': 'Maria',
            'last_name': 'Traveler'
        }

        response = self.client.post('/api/v1/auth/google/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertTrue(response.data['is_new_user'])

        user = User.objects.get(email='maria.traveler@gmail.com')
        self.assertEqual(user.role, 'guest')
        self.assertEqual(user.first_name, 'Maria')

        # Test subsequent login with same Google account (not new user)
        second_resp = self.client.post('/api/v1/auth/google/', payload, format='json')
        self.assertEqual(second_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(second_resp.data['is_new_user'])
        self.assertEqual(second_resp.data['user']['email'], 'maria.traveler@gmail.com')

    def test_google_login_missing_token_returns_400(self):
        """Google auth without id_token or credential returns 400 Bad Request."""
        response = self.client.post('/api/v1/auth/google/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
