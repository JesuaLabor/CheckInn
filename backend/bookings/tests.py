from datetime import date, timedelta
from django.utils import timezone
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from hotels.models import Hotel, RoomType, Room
from bookings.models import Booking

User = get_user_model()


class LocalStayCoreTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Hotels
        self.hotel_a = Hotel.objects.create(name='Hotel Alpha', slug='hotel-alpha', address='Alpha St')
        self.hotel_b = Hotel.objects.create(name='Hotel Bravo', slug='hotel-bravo', address='Bravo St')

        # Room types
        self.rt_a = RoomType.objects.create(hotel=self.hotel_a, name='Alpha Room', base_rate=1000, capacity=2)
        self.room_a1 = Room.objects.create(hotel=self.hotel_a, room_type=self.rt_a, room_number='101')

        # Users
        self.guest = User.objects.create_user(username='guest1', email='g@test.com', password='password', role='guest')
        self.staff_a = User.objects.create_user(username='staff_a', email='sa@test.com', password='password', role='staff', hotel=self.hotel_a)
        self.staff_b = User.objects.create_user(username='staff_b', email='sb@test.com', password='password', role='staff', hotel=self.hotel_b)

    def test_soft_hold_prevents_double_booking(self):
        """A pending_approval booking places a soft hold preventing a second booking on same dates."""
        today = date.today()
        d1 = today + timedelta(days=1)
        d2 = today + timedelta(days=3)

        # 1. First guest creates request
        self.client.force_authenticate(user=self.guest)
        res1 = self.client.post('/api/v1/bookings/', {
            'hotel': self.hotel_a.id,
            'room_type': self.rt_a.id,
            'guest_name': 'First Guest',
            'guest_email': 'first@test.com',
            'guest_phone': '09111111111',
            'guest_count': 2,
            'check_in': d1.strftime('%Y-%m-%d'),
            'check_out': d2.strftime('%Y-%m-%d'),
            'payment_method': 'pay_at_hotel'
        })
        self.assertEqual(res1.status_code, 201)
        b1 = Booking.objects.get(id=res1.data['booking']['id'])
        self.assertEqual(b1.status, 'pending_approval')
        self.assertTrue(b1.is_hold_active)

        # 2. Second guest attempts to book exact same room type for overlapping dates
        guest2 = User.objects.create_user(username='guest2', email='g2@test.com', password='password', role='guest')
        self.client.force_authenticate(user=guest2)
        res2 = self.client.post('/api/v1/bookings/', {
            'hotel': self.hotel_a.id,
            'room_type': self.rt_a.id,
            'guest_name': 'Second Guest',
            'guest_email': 'second@test.com',
            'guest_phone': '09222222222',
            'guest_count': 2,
            'check_in': d1.strftime('%Y-%m-%d'),
            'check_out': d2.strftime('%Y-%m-%d'),
            'payment_method': 'pay_at_hotel'
        })
        # Should be rejected because room inventory is 1 and soft hold is active
        self.assertEqual(res2.status_code, 400)

    def test_tenant_isolation_staff_cannot_see_other_hotels_pending_requests(self):
        """Staff at Hotel B cannot access Hotel A's pending requests."""
        today = date.today()
        Booking.objects.create(
            hotel=self.hotel_a,
            room_type=self.rt_a,
            guest=self.guest,
            guest_name='Guest Alpha',
            guest_email='ga@test.com',
            check_in=today + timedelta(days=1),
            check_out=today + timedelta(days=2),
            total_amount=1000,
            status='pending_approval',
            hold_expires_at=timezone.now() + timedelta(minutes=45)
        )

        # Staff B requests pending requests
        self.client.force_authenticate(user=self.staff_b)
        res = self.client.get('/api/v1/staff/requests/pending/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 0)  # Hotel B has 0 requests

        # Staff A requests pending requests
        self.client.force_authenticate(user=self.staff_a)
        res_a = self.client.get('/api/v1/staff/requests/pending/')
        self.assertEqual(res_a.status_code, 200)
        self.assertEqual(res_a.data['count'], 1)

    def test_qr_token_generation_and_verification(self):
        """Approving a booking creates signed QR token verified at checkin."""
        today = date.today()
        b = Booking.objects.create(
            hotel=self.hotel_a,
            room_type=self.rt_a,
            guest=self.guest,
            guest_name='Guest QR',
            guest_email='qr@test.com',
            check_in=today,
            check_out=today + timedelta(days=1),
            total_amount=1000,
            status='pending_approval',
            hold_expires_at=timezone.now() + timedelta(minutes=45)
        )

        # Staff A approves request
        self.client.force_authenticate(user=self.staff_a)
        res = self.client.post(f'/api/v1/staff/requests/{b.id}/approve/')
        self.assertEqual(res.status_code, 200)
        b.refresh_from_db()
        self.assertEqual(b.status, 'confirmed')
        self.assertTrue(len(b.qr_token) > 0)
        self.assertTrue(b.verify_qr_token(b.qr_token))

        # Check-in with valid QR token
        checkin_res = self.client.post(f'/api/v1/bookings/{b.id}/checkin/', {'qr_token': b.qr_token})
        self.assertEqual(checkin_res.status_code, 200)
        b.refresh_from_db()
        self.assertEqual(b.status, 'checked_in')
        self.assertEqual(b.room.status, 'occupied')
