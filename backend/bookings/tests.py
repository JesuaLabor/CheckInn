from datetime import date, timedelta
from django.utils import timezone
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from hotels.models import Hotel, RoomType, Room
from bookings.models import Booking, GuestRequest, Payment

User = get_user_model()


class LocalStayCoreTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Hotels
        self.hotel_a = Hotel.objects.create(
            name='Hotel Alpha',
            slug='hotel-alpha',
            address='Alpha St, Malaybalay City',
            city='Malaybalay City',
            status='approved',
            is_active=True
        )
        self.hotel_b = Hotel.objects.create(
            name='Hotel Bravo',
            slug='hotel-bravo',
            address='Bravo St, General Luna',
            city='General Luna',
            status='approved',
            is_active=True
        )

        # Room types
        self.rt_a = RoomType.objects.create(
            hotel=self.hotel_a,
            name='Alpha Standard Room',
            base_rate=1200.00,
            capacity=2
        )
        self.room_a1 = Room.objects.create(
            hotel=self.hotel_a,
            room_type=self.rt_a,
            room_number='101',
            status='available'
        )

        # Users
        self.guest = User.objects.create_user(
            username='guest1',
            email='g1@test.com',
            password='password123',
            role='guest'
        )
        self.guest2 = User.objects.create_user(
            username='guest2',
            email='g2@test.com',
            password='password123',
            role='guest'
        )
        self.staff_a = User.objects.create_user(
            username='staff_a',
            email='sa@test.com',
            password='password123',
            role='staff',
            hotel=self.hotel_a
        )
        self.staff_b = User.objects.create_user(
            username='staff_b',
            email='sb@test.com',
            password='password123',
            role='staff',
            hotel=self.hotel_b
        )

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
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        b1 = Booking.objects.get(id=res1.data['booking']['id'])
        self.assertEqual(b1.status, 'pending_approval')
        self.assertTrue(b1.is_hold_active)

        # 2. Second guest attempts to book exact same room type for overlapping dates
        self.client.force_authenticate(user=self.guest2)
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
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_soft_hold_expiration_allows_rebooking(self):
        """Expired hold prevents approval and allows new guest reservation."""
        today = date.today()
        d1 = today + timedelta(days=5)
        d2 = today + timedelta(days=7)

        # Create booking with an expired hold timestamp
        b = Booking.objects.create(
            hotel=self.hotel_a,
            room_type=self.rt_a,
            guest=self.guest,
            guest_name='Expired Hold Guest',
            guest_email='expired@test.com',
            check_in=d1,
            check_out=d2,
            total_amount=2400,
            status='pending_approval',
            hold_expires_at=timezone.now() - timedelta(minutes=15)
        )

        # Staff attempts to approve expired request -> 400 Bad Request
        self.client.force_authenticate(user=self.staff_a)
        approve_res = self.client.post(f'/api/v1/staff/requests/{b.id}/approve/')
        self.assertEqual(approve_res.status_code, status.HTTP_400_BAD_REQUEST)
        b.refresh_from_db()
        self.assertEqual(b.status, 'expired')

        # Another guest can now reserve the same dates
        self.client.force_authenticate(user=self.guest2)
        res_new = self.client.post('/api/v1/bookings/', {
            'hotel': self.hotel_a.id,
            'room_type': self.rt_a.id,
            'guest_name': 'New Guest',
            'guest_email': 'new@test.com',
            'guest_phone': '09333333333',
            'guest_count': 2,
            'check_in': d1.strftime('%Y-%m-%d'),
            'check_out': d2.strftime('%Y-%m-%d'),
            'payment_method': 'pay_at_hotel'
        })
        self.assertEqual(res_new.status_code, status.HTTP_201_CREATED)

    def test_staff_rejection_releases_hold(self):
        """Staff rejection updates status to rejected, saves reason, and frees room inventory."""
        today = date.today()
        d1 = today + timedelta(days=1)
        d2 = today + timedelta(days=3)

        b = Booking.objects.create(
            hotel=self.hotel_a,
            room_type=self.rt_a,
            guest=self.guest,
            guest_name='Rejected Guest',
            guest_email='rej@test.com',
            check_in=d1,
            check_out=d2,
            total_amount=2400,
            status='pending_approval',
            hold_expires_at=timezone.now() + timedelta(minutes=45)
        )

        # Staff rejects request
        self.client.force_authenticate(user=self.staff_a)
        rej_res = self.client.post(f'/api/v1/staff/requests/{b.id}/reject/', {
            'reason': 'Maintenance scheduled during selected dates.'
        }, format='json')
        self.assertEqual(rej_res.status_code, status.HTTP_200_OK)

        b.refresh_from_db()
        self.assertEqual(b.status, 'rejected')
        self.assertEqual(b.rejection_reason, 'Maintenance scheduled during selected dates.')
        self.assertEqual(b.reviewed_by, self.staff_a)

        # Now second guest can book the dates
        self.client.force_authenticate(user=self.guest2)
        res2 = self.client.post('/api/v1/bookings/', {
            'hotel': self.hotel_a.id,
            'room_type': self.rt_a.id,
            'guest_name': 'Replacement Guest',
            'guest_email': 'replace@test.com',
            'guest_phone': '09444444444',
            'guest_count': 2,
            'check_in': d1.strftime('%Y-%m-%d'),
            'check_out': d2.strftime('%Y-%m-%d'),
            'payment_method': 'pay_at_hotel'
        })
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

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
            total_amount=1200,
            status='pending_approval',
            hold_expires_at=timezone.now() + timedelta(minutes=45)
        )

        # Staff B requests pending requests
        self.client.force_authenticate(user=self.staff_b)
        res = self.client.get('/api/v1/staff/requests/pending/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 0)  # Hotel B has 0 requests

        # Staff A requests pending requests
        self.client.force_authenticate(user=self.staff_a)
        res_a = self.client.get('/api/v1/staff/requests/pending/')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
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
            total_amount=1200,
            status='pending_approval',
            hold_expires_at=timezone.now() + timedelta(minutes=45)
        )

        # Staff A approves request
        self.client.force_authenticate(user=self.staff_a)
        res = self.client.post(f'/api/v1/staff/requests/{b.id}/approve/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        b.refresh_from_db()
        self.assertEqual(b.status, 'confirmed')
        self.assertTrue(len(b.qr_token) > 0)
        self.assertTrue(b.verify_qr_token(b.qr_token))

        # Check-in with valid QR token
        checkin_res = self.client.post(f'/api/v1/bookings/{b.id}/checkin/', {'qr_token': b.qr_token})
        self.assertEqual(checkin_res.status_code, status.HTTP_200_OK)
        b.refresh_from_db()
        self.assertEqual(b.status, 'checked_in')
        self.assertEqual(b.room.status, 'occupied')

    def test_tampered_qr_token_rejected_at_checkin(self):
        """Forged or altered QR check-in token is rejected with 400 Bad Request."""
        today = date.today()
        b = Booking.objects.create(
            hotel=self.hotel_a,
            room_type=self.rt_a,
            room=self.room_a1,
            guest=self.guest,
            guest_name='Fake Token Guest',
            guest_email='fake@test.com',
            check_in=today,
            check_out=today + timedelta(days=1),
            total_amount=1200,
            status='confirmed'
        )
        b.generate_qr_token()
        b.save()

        self.client.force_authenticate(user=self.staff_a)
        fake_token = "999:CHK-INVALID:tampered_signature"
        bad_checkin = self.client.post(f'/api/v1/bookings/{b.id}/checkin/', {'qr_token': fake_token})
        self.assertEqual(bad_checkin.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid or expired QR check-in token', bad_checkin.data['detail'])

    def test_walkin_booking_direct_checkin_flow(self):
        """Staff can create direct walk-in reservation without marketplace approval."""
        today = date.today()
        self.client.force_authenticate(user=self.staff_a)

        payload = {
            'room_id': self.room_a1.id,
            'guest_name': 'Walk-in Traveler',
            'guest_email': 'walkin@example.com',
            'guest_phone': '09555555555',
            'guest_count': 1,
            'check_in': today.strftime('%Y-%m-%d'),
            'check_out': (today + timedelta(days=2)).strftime('%Y-%m-%d'),
            'payment_method': 'cash',
            'payment_status': 'paid'
        }

        walkin_resp = self.client.post('/api/v1/bookings/walkin/', payload, format='json')
        self.assertEqual(walkin_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(walkin_resp.data['booking']['status'], 'checked_in')
        self.assertEqual(walkin_resp.data['booking']['source'], 'walk_in')

        self.room_a1.refresh_from_db()
        self.assertEqual(self.room_a1.status, 'occupied')

        # Verify payment created and marked paid
        b_id = walkin_resp.data['booking']['id']
        payment = Payment.objects.get(booking_id=b_id)
        self.assertEqual(payment.status, 'paid')
        self.assertEqual(payment.method, 'cash')

    def test_walkin_booking_forbidden_for_regular_guest(self):
        """Regular guests cannot call the staff walk-in endpoint."""
        self.client.force_authenticate(user=self.guest)
        resp = self.client.post('/api/v1/bookings/walkin/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_checkout_workflow_marks_cleaning_and_paid(self):
        """Checking out updates booking status to checked_out and sets room to cleaning."""
        today = date.today()
        b = Booking.objects.create(
            hotel=self.hotel_a,
            room_type=self.rt_a,
            room=self.room_a1,
            guest=self.guest,
            guest_name='Checkout Guest',
            guest_email='co@test.com',
            check_in=today,
            check_out=today + timedelta(days=1),
            total_amount=1200,
            status='checked_in',
            checked_in_at=timezone.now()
        )
        self.room_a1.status = 'occupied'
        self.room_a1.save()

        Payment.objects.create(
            booking=b,
            amount=1200,
            method='pay_at_hotel',
            status='unpaid'
        )

        self.client.force_authenticate(user=self.staff_a)
        co_resp = self.client.post(f'/api/v1/bookings/{b.id}/checkout/')
        self.assertEqual(co_resp.status_code, status.HTTP_200_OK)

        b.refresh_from_db()
        self.assertEqual(b.status, 'checked_out')
        self.assertIsNotNone(b.checked_out_at)

        self.room_a1.refresh_from_db()
        self.assertEqual(self.room_a1.status, 'cleaning')

        b.payment.refresh_from_db()
        self.assertEqual(b.payment.status, 'paid')

    def test_room_status_board_and_status_patch(self):
        """Staff can view live room status board and patch room status from cleaning to available."""
        self.room_a1.status = 'cleaning'
        self.room_a1.save()

        self.client.force_authenticate(user=self.staff_a)

        # 1. Fetch room status board
        board_resp = self.client.get('/api/v1/staff/rooms/status/')
        self.assertEqual(board_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(board_resp.data['summary']['cleaning'], 1)
        self.assertEqual(board_resp.data['summary']['total'], 1)

        # 2. Patch room status to available
        patch_resp = self.client.patch('/api/v1/staff/rooms/status/', {
            'room_id': self.room_a1.id,
            'status': 'available'
        }, format='json')
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)

        self.room_a1.refresh_from_db()
        self.assertEqual(self.room_a1.status, 'available')

    def test_service_requests_guest_submission_and_staff_resolution(self):
        """Guest submits request for active booking; staff views and updates to resolved."""
        today = date.today()
        b = Booking.objects.create(
            hotel=self.hotel_a,
            room_type=self.rt_a,
            room=self.room_a1,
            guest=self.guest,
            guest_name='Service Guest',
            guest_email='service@test.com',
            check_in=today,
            check_out=today + timedelta(days=2),
            total_amount=2400,
            status='checked_in'
        )

        # Guest submits service request
        self.client.force_authenticate(user=self.guest)
        req_resp = self.client.post('/api/v1/service-requests/', {
            'booking': b.id,
            'request_type': 'towels',
            'message': 'Please bring 2 extra bath towels.'
        }, format='json')
        self.assertEqual(req_resp.status_code, status.HTTP_201_CREATED)
        req_id = req_resp.data['id']

        # Guest 2 attempts to submit request for Guest 1's booking -> 403 Forbidden
        self.client.force_authenticate(user=self.guest2)
        forbidden_resp = self.client.post('/api/v1/service-requests/', {
            'booking': b.id,
            'request_type': 'housekeeping',
            'message': 'Clean room please.'
        }, format='json')
        self.assertEqual(forbidden_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Staff A marks request resolved
        self.client.force_authenticate(user=self.staff_a)
        patch_resp = self.client.patch(f'/api/v1/staff/service-requests/{req_id}/', {
            'status': 'resolved'
        }, format='json')
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data['status'], 'resolved')
        self.assertIsNotNone(patch_resp.data['resolved_at'])

    def test_admin_occupancy_report(self):
        """Staff can fetch occupancy report with calculated rate and revenue."""
        today = date.today()
        # Create checked-in booking
        b = Booking.objects.create(
            hotel=self.hotel_a,
            room_type=self.rt_a,
            room=self.room_a1,
            guest=self.guest,
            guest_name='Report Guest',
            guest_email='rep@test.com',
            check_in=today,
            check_out=today + timedelta(days=1),
            total_amount=1200,
            status='checked_in'
        )
        self.room_a1.status = 'occupied'
        self.room_a1.save()

        self.client.force_authenticate(user=self.staff_a)
        rep_resp = self.client.get('/api/v1/admin/reports/occupancy/')
        self.assertEqual(rep_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(rep_resp.data['total_rooms'], 1)
        self.assertEqual(rep_resp.data['occupied_rooms'], 1)
        self.assertEqual(rep_resp.data['occupancy_rate'], 100.0)
        self.assertEqual(float(rep_resp.data['total_revenue']), 1200.00)
        self.assertEqual(rep_resp.data['stats']['confirmed_bookings'], 1)

    def test_gcash_booking_with_reference_number_and_staff_verification(self):
        """Guest reserves with GCash and inputs reference number; staff approval confirms booking and marks payment paid."""
        today = date.today()
        d1 = today + timedelta(days=1)
        d2 = today + timedelta(days=2)

        self.client.force_authenticate(user=self.guest)
        res = self.client.post('/api/v1/bookings/', {
            'hotel': self.hotel_a.id,
            'room_type': self.rt_a.id,
            'guest_name': 'GCash Guest',
            'guest_email': 'gcash@test.com',
            'guest_phone': '09171234567',
            'guest_count': 1,
            'check_in': d1.strftime('%Y-%m-%d'),
            'check_out': d2.strftime('%Y-%m-%d'),
            'payment_method': 'gcash',
            'payment_reference': '100298451204',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        b_id = res.data['booking']['id']
        b = Booking.objects.get(id=b_id)
        self.assertEqual(b.payment.method, 'gcash')
        self.assertEqual(b.payment.reference_number, '100298451204')
        self.assertEqual(b.payment.status, 'unpaid')

        # Staff approves booking -> payment is automatically verified and marked paid
        self.client.force_authenticate(user=self.staff_a)
        app_res = self.client.post(f'/api/v1/staff/requests/{b.id}/approve/')
        self.assertEqual(app_res.status_code, status.HTTP_200_OK)
        b.refresh_from_db()
        self.assertEqual(b.status, 'confirmed')
        b.payment.refresh_from_db()
        self.assertEqual(b.payment.status, 'paid')
        self.assertIsNotNone(b.payment.paid_at)

    def test_assigned_room_is_occupied_on_approval_and_reflected_on_board(self):
        """When staff assigns a guest to a room upon approval, the room status must be occupied."""
        today = date.today()
        b = Booking.objects.create(
            hotel=self.hotel_a,
            room_type=self.rt_a,
            guest=self.guest,
            guest_name='Assigned Guest',
            guest_email='assigned@test.com',
            guest_phone='09179998888',
            check_in=today,
            check_out=today + timedelta(days=2),
            total_amount=2400,
            status='pending_approval',
            hold_expires_at=timezone.now() + timedelta(minutes=45)
        )

        self.assertEqual(self.room_a1.status, 'available')

        # Staff approves and assigns room_a1
        self.client.force_authenticate(user=self.staff_a)
        res = self.client.post(f'/api/v1/staff/requests/{b.id}/approve/', {
            'room_id': self.room_a1.id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Room must now be occupied
        self.room_a1.refresh_from_db()
        self.assertEqual(self.room_a1.status, 'occupied')

        # Room Status Board must show the room as occupied with occupant details
        board_res = self.client.get('/api/v1/staff/rooms/status/')
        self.assertEqual(board_res.status_code, status.HTTP_200_OK)
        self.assertEqual(board_res.data['summary']['occupied'], 1)
        self.assertEqual(board_res.data['summary']['available'], 0)

        room_entry = next(r for r in board_res.data['rooms'] if r['id'] == self.room_a1.id)
        self.assertEqual(room_entry['status'], 'occupied')
        self.assertIsNotNone(room_entry['occupant'])
        self.assertEqual(room_entry['occupant']['guest_name'], 'Assigned Guest')
        self.assertEqual(room_entry['occupant']['status'], 'confirmed')
