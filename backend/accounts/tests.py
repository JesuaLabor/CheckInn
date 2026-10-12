from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


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
