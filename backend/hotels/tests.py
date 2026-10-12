from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from hotels.models import Hotel, RoomType, Room

User = get_user_model()


class MultiTenantSaaSTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Superadmin
        self.superadmin = User.objects.create_superuser(
            username='platform_admin',
            email='platform@localstay.ph',
            password='Password123!',
            role='superadmin'
        )

        # Existing Approved Hotel & Owner
        self.hotel_a = Hotel.objects.create(
            name='Bukidnon Pine Lodge',
            address='Sayre Highway, Malaybalay',
            city='Malaybalay City',
            status='approved',
            is_active=True
        )
        self.owner_a = User.objects.create_user(
            username='owner_a',
            email='ownera@pinelodge.ph',
            password='Password123!',
            role='admin',
            hotel=self.hotel_a
        )
        self.hotel_a.owner = self.owner_a
        self.hotel_a.save()

    def test_partner_registration_creates_pending_hotel(self):
        """Testing vendor application: creates pending hotel and hotel admin user."""
        payload = {
            'username': 'new_vendor',
            'email': 'vendor@highlands.ph',
            'password': 'SecurePassword123!',
            'first_name': 'Rico',
            'last_name': 'Santos',
            'phone_number': '+63 917 111 2233',
            'hotel_name': 'Highlands View Inn',
            'address': 'Barangay Canayan, Malaybalay City',
            'city': 'Malaybalay City',
            'province': 'Bukidnon',
            'business_permit_number': 'BP-2026-9912',
            'payout_method': 'GCash',
            'payout_account_number': '09171112233'
        }

        response = self.client.post('/api/v1/inns/partner-register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)

        # Verify database state
        hotel = Hotel.objects.get(name='Highlands View Inn')
        self.assertEqual(hotel.status, 'pending')
        self.assertEqual(hotel.owner.username, 'new_vendor')
        self.assertEqual(hotel.owner.role, 'admin')
        self.assertEqual(hotel.business_permit_number, 'BP-2026-9912')

        # Verify that pending hotel is NOT visible on public marketplace
        public_resp = self.client.get('/api/v1/inns/')
        self.assertEqual(public_resp.status_code, status.HTTP_200_OK)
        slugs = [h['slug'] for h in public_resp.data]
        self.assertNotIn(hotel.slug, slugs)
        self.assertIn(self.hotel_a.slug, slugs)

    def test_superadmin_approval_lifecycle(self):
        """Superadmin can review pending application, approve it, and make it live on marketplace."""
        # Create pending hotel
        pending_hotel = Hotel.objects.create(
            name='Pending Green Resort',
            address='Malaybalay City',
            status='pending',
            is_active=True
        )

        # Non-superadmin cannot access platform review
        self.client.force_authenticate(user=self.owner_a)
        fail_review = self.client.post(f'/api/v1/platform/hotels/{pending_hotel.id}/review/', {'action': 'approve'})
        self.assertEqual(fail_review.status_code, status.HTTP_403_FORBIDDEN)

        # Superadmin can approve
        self.client.force_authenticate(user=self.superadmin)
        stats_resp = self.client.get('/api/v1/platform/stats/')
        self.assertEqual(stats_resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(stats_resp.data['pending_hotels'], 1)

        approve_resp = self.client.post(f'/api/v1/platform/hotels/{pending_hotel.id}/review/', {'action': 'approve'})
        self.assertEqual(approve_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_resp.data['hotel']['status'], 'approved')

        # Now pending hotel should appear on public marketplace
        self.client.logout()
        market_resp = self.client.get('/api/v1/inns/')
        slugs = [h['slug'] for h in market_resp.data]
        self.assertIn(pending_hotel.slug, slugs)

    def test_hotel_owner_manages_staff_and_rooms(self):
        """Hotel Owner can register front desk staff under their property."""
        self.client.force_authenticate(user=self.owner_a)

        # 1. Add staff
        staff_payload = {
            'username': 'frontdesk_marie',
            'password': 'StaffPassword123!',
            'first_name': 'Marie',
            'last_name': 'Cruz',
            'email': 'marie@pinelodge.ph',
            'phone_number': '+63 920 123 4567'
        }
        staff_resp = self.client.post('/api/v1/hotel-manage/staff/', staff_payload, format='json')
        self.assertEqual(staff_resp.status_code, status.HTTP_201_CREATED)

        staff_user = User.objects.get(username='frontdesk_marie')
        self.assertEqual(staff_user.role, 'staff')
        self.assertEqual(staff_user.hotel, self.hotel_a)

        # 2. Add Room Type
        rt_payload = {
            'name': 'Executive Mountain Suite',
            'base_rate': 2800.00,
            'capacity': 3,
            'amenities': ['Wi-Fi', 'Balcony', 'King Bed'],
            'description': 'Luxurious suite with private veranda.'
        }
        rt_resp = self.client.post('/api/v1/hotel-manage/room-types/', rt_payload, format='json')
        self.assertEqual(rt_resp.status_code, status.HTTP_201_CREATED)

        rt_id = rt_resp.data['room_type']['id']
        room_resp = self.client.post('/api/v1/hotel-manage/rooms/', {
            'room_number': '301',
            'floor': '3rd Floor',
            'room_type_id': rt_id
        }, format='json')
        self.assertEqual(room_resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Room.objects.filter(hotel=self.hotel_a, room_number='301').exists())
