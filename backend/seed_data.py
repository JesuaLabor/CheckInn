import os
import django
from datetime import date, timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from hotels.models import Hotel, RoomType, Room
from bookings.models import Booking, GuestRequest, Payment

User = get_user_model()


def run():
    print("🌱 Seeding CheckInn database for Malaybalay City lodging...")

    # 1. Platform Superadmin
    if not User.objects.filter(username='superadmin').exists():
        admin = User.objects.create_superuser(
            username='superadmin',
            email='admin@checkinn.local',
            password='admin123',
            first_name='Platform',
            last_name='Admin',
            role='superadmin'
        )
        print("✓ Created Superadmin: admin@checkinn.local (pass: admin123)")

    # 2. Demo Guest User
    guest_user, created = User.objects.get_or_create(
        username='juandelacruz',
        defaults={
            'email': 'guest@checkinn.local',
            'first_name': 'Juan',
            'last_name': 'Dela Cruz',
            'phone_number': '+63 917 123 4567',
            'role': 'guest'
        }
    )
    if created:
        guest_user.set_password('guest123')
        guest_user.save()
        print("✓ Created Demo Guest: guest@checkinn.local (pass: guest123)")

    # 3. Pine Hills Hotel
    pine_hills, _ = Hotel.objects.get_or_create(
        slug='pine-hills-hotel',
        defaults={
            'name': 'Pine Hills Hotel',
            'tagline': 'Historic elegance & cool mountain breeze in the heart of Bukidnon',
            'description': 'Pine Hills Hotel is Malaybalay City’s premier historic retreat, surrounded by lush pine trees with comfortable air-conditioned rooms, an on-site restaurant serving Northern Mindanao delicacies, and full conference facilities.',
            'address': 'Sayre Highway, Malaybalay City, Bukidnon',
            'city': 'Malaybalay City',
            'province': 'Bukidnon',
            'contact_phone': '+63 88 813 2215',
            'contact_email': 'reservations@pinehillshotel.ph',
            'image_url': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Free High-Speed Wi-Fi', 'Ample Free Parking', 'Complimentary Breakfast', '24/7 Front Desk', 'Air Conditioning', 'On-site Café & Bar', 'Hot Shower'],
            'rating': 4.7,
            'review_count': 42,
            'is_active': True,
        }
    )

    # Pine Hills Staff & Admin
    pine_staff, created = User.objects.get_or_create(
        username='pine_staff',
        defaults={
            'email': 'staff@pinehills.local',
            'first_name': 'Maria',
            'last_name': 'Santos',
            'role': 'staff',
            'hotel': pine_hills,
            'phone_number': '+63 918 555 1001'
        }
    )
    if created:
        pine_staff.set_password('staff123')
        pine_staff.save()
        print("✓ Created Pine Hills Staff: staff@pinehills.local (pass: staff123)")

    pine_admin, created = User.objects.get_or_create(
        username='pine_admin',
        defaults={
            'email': 'admin@pinehills.local',
            'first_name': 'Eduardo',
            'last_name': 'Lim',
            'role': 'admin',
            'hotel': pine_hills,
            'phone_number': '+63 918 555 1002'
        }
    )
    if created:
        pine_admin.set_password('admin123')
        pine_admin.save()
        print("✓ Created Pine Hills Admin: admin@pinehills.local (pass: admin123)")

    # Pine Hills Room Types
    rt_ph_standard, _ = RoomType.objects.get_or_create(
        hotel=pine_hills,
        name='Standard Twin Room',
        defaults={
            'description': 'Cozy twin beds with views of the hotel pine garden, private bath with hot shower, work desk, and flat screen TV.',
            'base_rate': 1600.00,
            'capacity': 2,
            'amenities': ['2 Single Beds', 'Air Conditioning', 'En-suite Hot Shower', 'High-Speed Wi-Fi', 'Electric Kettle', 'Work Desk'],
            'photos': [
                'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
            ]
        }
    )
    rt_ph_deluxe, _ = RoomType.objects.get_or_create(
        hotel=pine_hills,
        name='Deluxe Queen Room',
        defaults={
            'description': 'Spacious queen room with premium orthopedic mattress, private balcony, mini-refrigerator, and vanity corner.',
            'base_rate': 2400.00,
            'capacity': 2,
            'amenities': ['1 Queen Bed', 'Private Balcony', 'Mini Fridge', 'Smart TV', 'Hot & Cold Shower', 'Complimentary Breakfast'],
            'photos': [
                'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80'
            ]
        }
    )
    rt_ph_suite, _ = RoomType.objects.get_or_create(
        hotel=pine_hills,
        name='Pine Mountain Suite',
        defaults={
            'description': 'Our most distinguished suite with a separate seating lounge, king-sized bed, panoramic mountain view, and soaking bathtub.',
            'base_rate': 3800.00,
            'capacity': 3,
            'amenities': ['1 King Bed + Daybed', 'Living Area', 'Soaking Bathtub', 'Mountain View', 'Complimentary Breakfast for 2', 'Nespresso Coffee Bar'],
            'photos': [
                'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80'
            ]
        }
    )

    # Physical rooms for Pine Hills
    for i in range(101, 105):
        Room.objects.get_or_create(hotel=pine_hills, room_number=str(i), defaults={'room_type': rt_ph_standard, 'floor': '1st Floor'})
    for i in range(201, 205):
        Room.objects.get_or_create(hotel=pine_hills, room_number=str(i), defaults={'room_type': rt_ph_deluxe, 'floor': '2nd Floor'})
    for i in range(301, 304):
        Room.objects.get_or_create(hotel=pine_hills, room_number=str(i), defaults={'room_type': rt_ph_suite, 'floor': '3rd Floor'})

    # 4. 1st Inn Malaybalay
    first_inn, _ = Hotel.objects.get_or_create(
        slug='1st-inn-malaybalay',
        defaults={
            'name': '1st Inn Malaybalay',
            'tagline': 'Affordable, clean, and central transit lodging for travelers',
            'description': 'Conveniently situated along Fortich Street steps from commercial banks, food hubs, and the provincial Capitol Grounds. The top choice for value-focused travelers.',
            'address': 'Fortich Street, Poblacion, Malaybalay City, Bukidnon',
            'city': 'Malaybalay City',
            'province': 'Bukidnon',
            'contact_phone': '+63 88 813 4900',
            'contact_email': 'info@1stinnmalaybalay.ph',
            'image_url': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Free Wi-Fi', 'Air Conditioning', '24/7 Front Desk', 'Keycard Access', 'CCTV Security', 'Standby Generator'],
            'rating': 4.3,
            'review_count': 56,
            'is_active': True,
        }
    )

    first_inn_staff, created = User.objects.get_or_create(
        username='firstinn_staff',
        defaults={
            'email': 'staff@1stinn.local',
            'first_name': 'Ramil',
            'last_name': 'Navarro',
            'role': 'staff',
            'hotel': first_inn,
            'phone_number': '+63 920 444 8811'
        }
    )
    if created:
        first_inn_staff.set_password('staff123')
        first_inn_staff.save()
        print("✓ Created 1st Inn Staff: staff@1stinn.local (pass: staff123)")

    rt_fi_single, _ = RoomType.objects.get_or_create(
        hotel=first_inn,
        name='Compact Single Room',
        defaults={
            'description': 'Efficient private room with single bed, desk, hot shower, and high-speed Wi-Fi.',
            'base_rate': 850.00,
            'capacity': 1,
            'amenities': ['1 Single Bed', 'Air Conditioning', 'Private Bathroom', 'High-Speed Wi-Fi'],
            'photos': ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80']
        }
    )
    rt_fi_double, _ = RoomType.objects.get_or_create(
        hotel=first_inn,
        name='Superior Double Room',
        defaults={
            'description': 'Full-sized double bed for up to 2 guests, cable TV, and en-suite bath.',
            'base_rate': 1350.00,
            'capacity': 2,
            'amenities': ['1 Double Bed', 'Air Conditioning', 'Cable TV', 'Hot Shower', 'Wi-Fi'],
            'photos': ['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80']
        }
    )

    for i in range(11, 15):
        Room.objects.get_or_create(hotel=first_inn, room_number=f"Room {i}", defaults={'room_type': rt_fi_single, 'floor': '1st Floor'})
    for i in range(21, 25):
        Room.objects.get_or_create(hotel=first_inn, room_number=f"Room {i}", defaults={'room_type': rt_fi_double, 'floor': '2nd Floor'})

    # 5. Bukidnon Mountain View Inn
    mountain_view, _ = Hotel.objects.get_or_create(
        slug='bukidnon-mountain-view-inn',
        defaults={
            'name': 'Bukidnon Mountain View Inn',
            'tagline': 'Peaceful hillside escape with sweeping views of Mt. Kitanglad Range',
            'description': 'A quiet sanctuary away from the city traffic, offering panoramic mountain sunrises, pine-scented breezes, and organic garden surroundings.',
            'address': 'Barangay Casisang, Malaybalay City, Bukidnon',
            'city': 'Malaybalay City',
            'province': 'Bukidnon',
            'contact_phone': '+63 917 889 3321',
            'contact_email': 'contact@bukidnonmountainview.ph',
            'image_url': 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Free Wi-Fi', 'Garden Terrace', 'Free Parking', 'Hot Shower', 'Campfire Grounds', 'Coffee Lounge'],
            'rating': 4.8,
            'review_count': 31,
            'is_active': True,
        }
    )

    rt_mv_std, _ = RoomType.objects.get_or_create(
        hotel=mountain_view,
        name='Hillside Standard Cottage',
        defaults={
            'description': 'Charming cottage room overlooking native pine groves and Mt. Kitanglad.',
            'base_rate': 1750.00,
            'capacity': 2,
            'amenities': ['1 Queen Bed', 'Veranda Seating', 'Hot Shower', 'Complimentary Bukidnon Brewed Coffee'],
            'photos': ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80']
        }
    )

    for i in range(1, 5):
        Room.objects.get_or_create(hotel=mountain_view, room_number=f"Cottage {i}", defaults={'room_type': rt_mv_std, 'floor': 'Ground'})

    # 6. Sample Bookings for Pine Hills Hotel
    now = timezone.now()
    today = date.today()

    # (A) Pending approval booking (soft hold active for demonstration)
    b_pending, created = Booking.objects.get_or_create(
        booking_reference='CHK-DEMO-PENDING',
        defaults={
            'hotel': pine_hills,
            'room_type': rt_ph_deluxe,
            'guest': guest_user,
            'guest_name': 'Juan Dela Cruz',
            'guest_email': 'guest@checkinn.local',
            'guest_phone': '+63 917 123 4567',
            'guest_count': 2,
            'check_in': today + timedelta(days=2),
            'check_out': today + timedelta(days=4),
            'total_amount': 4800.00,
            'status': 'pending_approval',
            'source': 'marketplace',
            'hold_expires_at': now + timedelta(minutes=40),
            'special_requests': 'Please provide extra pillows and quiet room facing the pine garden.'
        }
    )
    if created:
        Payment.objects.get_or_create(booking=b_pending, defaults={'amount': 4800.00, 'method': 'pay_at_hotel', 'status': 'unpaid'})

    # (B) Confirmed booking ready for check-in with signed QR token
    room_201 = Room.objects.get(hotel=pine_hills, room_number='201')
    b_confirmed, created = Booking.objects.get_or_create(
        booking_reference='CHK-DEMO-CONFIRMED',
        defaults={
            'hotel': pine_hills,
            'room_type': rt_ph_deluxe,
            'room': room_201,
            'guest': guest_user,
            'guest_name': 'Juan Dela Cruz',
            'guest_email': 'guest@checkinn.local',
            'guest_phone': '+63 917 123 4567',
            'guest_count': 2,
            'check_in': today,
            'check_out': today + timedelta(days=2),
            'total_amount': 4800.00,
            'status': 'confirmed',
            'source': 'marketplace',
            'reviewed_by': pine_staff,
            'reviewed_at': now - timedelta(hours=2),
            'special_requests': 'Late arrival around 6:00 PM.'
        }
    )
    if created:
        b_confirmed.generate_qr_token()
        b_confirmed.save()
        Payment.objects.get_or_create(booking=b_confirmed, defaults={'amount': 4800.00, 'method': 'pay_at_hotel', 'status': 'unpaid'})

    # (C) Currently Checked-In Guest with Service Request
    room_101 = Room.objects.get(hotel=pine_hills, room_number='101')
    room_101.status = 'occupied'
    room_101.save()

    b_checked_in, created = Booking.objects.get_or_create(
        booking_reference='CHK-DEMO-CHECKEDIN',
        defaults={
            'hotel': pine_hills,
            'room_type': rt_ph_standard,
            'room': room_101,
            'guest': guest_user,
            'guest_name': 'Ana Patricia Reyes',
            'guest_email': 'patricia.reyes@example.com',
            'guest_phone': '+63 919 888 2345',
            'guest_count': 2,
            'check_in': today - timedelta(days=1),
            'check_out': today + timedelta(days=1),
            'total_amount': 3200.00,
            'status': 'checked_in',
            'source': 'marketplace',
            'reviewed_by': pine_staff,
            'reviewed_at': now - timedelta(days=1),
            'checked_in_at': now - timedelta(days=1),
        }
    )
    if created:
        b_checked_in.generate_qr_token()
        b_checked_in.save()
        Payment.objects.get_or_create(booking=b_checked_in, defaults={'amount': 3200.00, 'method': 'pay_at_hotel', 'status': 'paid', 'paid_at': now - timedelta(days=1)})
        # Create service request
        GuestRequest.objects.get_or_create(
            booking=b_checked_in,
            request_type='towels',
            defaults={
                'message': 'Could we please request two extra fresh bath towels and bottled water?',
                'status': 'pending'
            }
        )

    print("🎉 Seeding complete! CheckInn backend is ready for Malaybalay City lodging.")


if __name__ == '__main__':
    run()
