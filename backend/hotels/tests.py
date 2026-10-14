from datetime import date, timedelta
from django.utils import timezone
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from hotels.models import Hotel, RoomType, Room
from bookings.models import Booking

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

        # Approved Hotel A & Owner
        self.hotel_a = Hotel.objects.create(
            name='Bukidnon Pine Lodge',
            slug='bukidnon-pine-lodge',
            address='Sayre Highway, Malaybalay',
            city='Malaybalay City',
            province='Bukidnon',
            country='PH',
            country_name='Philippines',
            category='mountain',
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

        # Approved Hotel B (Beach Resort in Siargao)
        self.hotel_b = Hotel.objects.create(
            name='Siargao Palm Haven',
            slug='siargao-palm-haven',
            address='General Luna',
            city='General Luna',
            province='Surigao del Norte',
            country='PH',
            country_name='Philippines',
            category='beach',
            status='approved',
            is_active=True
        )

        # Room types for Hotel A
        self.rt_a = RoomType.objects.create(
            hotel=self.hotel_a,
            name='Standard Cabin',
            base_rate=1500.00,
            capacity=2
        )
        self.room_a1 = Room.objects.create(
            hotel=self.hotel_a,
            room_type=self.rt_a,
            room_number='101',
            status='available'
        )
        self.room_a2 = Room.objects.create(
            hotel=self.hotel_a,
            room_type=self.rt_a,
            room_number='102',
            status='available'
        )

        # Standard Guest user
        self.guest = User.objects.create_user(
            username='guest_traveler',
            email='traveler@localstay.ph',
            password='Password123!',
            role='guest'
        )

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

    def test_public_hotel_filtering_by_category_and_location(self):
        """Public list endpoint filters properly by category and city query."""
        # Filter by category 'beach'
        beach_resp = self.client.get('/api/v1/inns/', {'category': 'beach'})
        self.assertEqual(beach_resp.status_code, status.HTTP_200_OK)
        beach_slugs = [h['slug'] for h in beach_resp.data]
        self.assertIn(self.hotel_b.slug, beach_slugs)
        self.assertNotIn(self.hotel_a.slug, beach_slugs)

        # Filter by city 'Malaybalay'
        city_resp = self.client.get('/api/v1/inns/', {'city': 'Malaybalay'})
        self.assertEqual(city_resp.status_code, status.HTTP_200_OK)
        city_slugs = [h['slug'] for h in city_resp.data]
        self.assertIn(self.hotel_a.slug, city_slugs)
        self.assertNotIn(self.hotel_b.slug, city_slugs)

    def test_destination_list_and_exchange_rates(self):
        """Public destinations and exchange rates endpoints return accurate structured data."""
        # Destinations
        dest_resp = self.client.get('/api/v1/inns/destinations/')
        self.assertEqual(dest_resp.status_code, status.HTTP_200_OK)
        cities = [d['city'] for d in dest_resp.data]
        self.assertIn('Malaybalay City', cities)
        self.assertIn('General Luna', cities)

        # Exchange rates
        rates_resp = self.client.get('/api/v1/inns/exchange-rates/')
        self.assertEqual(rates_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(rates_resp.data['base'], 'PHP')
        self.assertIn('USD', rates_resp.data['rates'])
        self.assertIn('JPY', rates_resp.data['rates'])

    def test_hotel_detail_and_invalid_slug_returns_404(self):
        """GET /api/v1/inns/{slug}/ returns complete hotel profile or 404 if not found."""
        valid_resp = self.client.get(f'/api/v1/inns/{self.hotel_a.slug}/')
        self.assertEqual(valid_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(valid_resp.data['name'], 'Bukidnon Pine Lodge')
        self.assertGreaterEqual(len(valid_resp.data['room_types']), 1)

        invalid_resp = self.client.get('/api/v1/inns/non-existent-hotel-slug-999/')
        self.assertEqual(invalid_resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_available_rooms_query_by_date_range(self):
        """Querying room availability takes existing confirmed bookings into account."""
        today = date.today()
        d1 = today + timedelta(days=2)
        d2 = today + timedelta(days=5)

        # Place confirmed booking on room_a1
        Booking.objects.create(
            hotel=self.hotel_a,
            room_type=self.rt_a,
            room=self.room_a1,
            guest=self.guest,
            guest_name='Confirmed Guest',
            guest_email='test@test.ph',
            check_in=d1,
            check_out=d2,
            total_amount=3000,
            status='confirmed'
        )

        # Check availability for overlapping range: total 2 rooms, 1 booked -> 1 available
        resp = self.client.get(f'/api/v1/inns/{self.hotel_a.slug}/rooms/available/', {
            'check_in': d1.strftime('%Y-%m-%d'),
            'check_out': d2.strftime('%Y-%m-%d')
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rt_info = resp.data['room_types'][0]
        self.assertEqual(rt_info['total_rooms'], 2)
        self.assertEqual(rt_info['available_count'], 1)

        # Check availability for non-overlapping future range: 2 available
        future_d1 = today + timedelta(days=10)
        future_d2 = today + timedelta(days=12)
        future_resp = self.client.get(f'/api/v1/inns/{self.hotel_a.slug}/rooms/available/', {
            'check_in': future_d1.strftime('%Y-%m-%d'),
            'check_out': future_d2.strftime('%Y-%m-%d')
        })
        self.assertEqual(future_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(future_resp.data['room_types'][0]['available_count'], 2)

    def test_unauthorized_access_to_hotel_manage_endpoints(self):
        """Unauthenticated guests or general users cannot access hotel management API."""
        # Unauthenticated
        unauth_resp = self.client.get('/api/v1/hotel-manage/rooms/')
        self.assertEqual(unauth_resp.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated as regular guest
        self.client.force_authenticate(user=self.guest)
        guest_resp = self.client.get('/api/v1/hotel-manage/rooms/')
        self.assertEqual(guest_resp.status_code, status.HTTP_403_FORBIDDEN)
