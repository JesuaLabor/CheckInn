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
    print("🌱 Seeding LocalStay database for nationwide and international lodging...")

    # 1. Platform Superadmin
    if not User.objects.filter(username='superadmin').exists():
        admin = User.objects.create_superuser(
            username='superadmin',
            email='admin@localstay.local',
            password='admin123',
            first_name='Platform',
            last_name='Admin',
            role='superadmin'
        )
        print("✓ Created Superadmin: admin@localstay.local (pass: admin123)")

    # 2. Demo Guest User
    guest_user, created = User.objects.get_or_create(
        username='juandelacruz',
        defaults={
            'email': 'guest@localstay.local',
            'first_name': 'Juan',
            'last_name': 'Dela Cruz',
            'phone_number': '+63 917 123 4567',
            'role': 'guest'
        }
    )
    if created:
        guest_user.set_password('guest123')
        guest_user.save()
        print("✓ Created Demo Guest: guest@localstay.local (pass: guest123)")

    # 3. Pine Hills Hotel (Malaybalay, Bukidnon) - Highland/Mountain
    pine_hills, _ = Hotel.objects.get_or_create(
        slug='pine-hills-hotel',
        defaults={
            'name': 'Pine Hills Hotel',
            'tagline': 'Historic elegance & cool mountain breeze in the heart of Bukidnon',
            'description': 'Pine Hills Hotel is Malaybalay City’s premier historic retreat, surrounded by lush pine trees with comfortable air-conditioned rooms, an on-site restaurant serving Northern Mindanao delicacies, and full conference facilities.',
            'address': 'Sayre Highway, Malaybalay City, Bukidnon',
            'city': 'Malaybalay City',
            'province': 'Bukidnon',
            'country': 'PH',
            'country_name': 'Philippines',
            'category': 'mountain',
            'currency': 'PHP',
            'timezone': 'Asia/Manila',
            'latitude': 8.1575,
            'longitude': 125.1278,
            'contact_phone': '+63 88 813 2215',
            'contact_email': 'reservations@pinehillshotel.ph',
            'image_url': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Free High-Speed Wi-Fi', 'Ample Free Parking', 'Complimentary Breakfast', '24/7 Front Desk', 'Air Conditioning', 'On-site Café & Bar', 'Hot Shower'],
            'rating': 4.7,
            'review_count': 42,
            'is_active': True,
        }
    )
    # Ensure attributes are updated if already exists
    pine_hills.country = 'PH'
    pine_hills.country_name = 'Philippines'
    pine_hills.category = 'mountain'
    pine_hills.currency = 'PHP'
    pine_hills.timezone = 'Asia/Manila'
    pine_hills.latitude = 8.1575
    pine_hills.longitude = 125.1278
    pine_hills.save()

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

    pine_hills.owner = pine_admin
    pine_hills.status = 'approved'
    pine_hills.business_permit_number = 'BP-2026-MALAY-0812'
    pine_hills.bir_tin = '123-456-789-000'
    pine_hills.payout_method = 'GCash'
    pine_hills.payout_account_name = 'Pine Hills Hotel Inc.'
    pine_hills.payout_account_number = '09185551002'
    pine_hills.save()

    # Pine Hills Room Types
    rt_ph_standard, _ = RoomType.objects.get_or_create(
        hotel=pine_hills,
        name='Pine View Standard Room',
        defaults={
            'description': 'Comfortable room overlooking pine trees with 1 queen bed, en-suite hot shower, and work desk.',
            'base_rate': 1600.00,
            'currency': 'PHP',
            'capacity': 2,
            'amenities': ['1 Queen Bed', 'Hot Shower', 'Cable TV', 'Work Desk', 'Free Wi-Fi'],
            'photos': ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80']
        }
    )
    rt_ph_deluxe, _ = RoomType.objects.get_or_create(
        hotel=pine_hills,
        name='Highland Deluxe Room',
        defaults={
            'description': 'Spacious room with private balcony, mini-fridge, tea/coffee station, and mountain breeze.',
            'base_rate': 2400.00,
            'currency': 'PHP',
            'capacity': 3,
            'amenities': ['1 King Bed or 2 Twin Beds', 'Private Balcony', 'Mini Refrigerator', 'Coffee & Tea Maker', 'Hot Shower', 'Free Wi-Fi'],
            'photos': ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80']
        }
    )
    rt_ph_suite, _ = RoomType.objects.get_or_create(
        hotel=pine_hills,
        name='Executive Pine Suite',
        defaults={
            'description': 'Luxury suite with living area, panoramic pine canopy view, bathtub, and complimentary breakfast.',
            'base_rate': 3800.00,
            'currency': 'PHP',
            'capacity': 4,
            'amenities': ['1 King Bed + Sofa Bed', 'Separate Living Area', 'Bathtub & Rain Shower', 'Free Breakfast for 2', 'Smart TV with Netflix', 'Executive Lounge Access'],
            'photos': ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80']
        }
    )

    # Physical rooms for Pine Hills
    for i in range(101, 105):
        Room.objects.get_or_create(hotel=pine_hills, room_number=str(i), defaults={'room_type': rt_ph_standard, 'floor': '1st Floor'})
    for i in range(201, 205):
        Room.objects.get_or_create(hotel=pine_hills, room_number=str(i), defaults={'room_type': rt_ph_deluxe, 'floor': '2nd Floor'})
    for i in range(301, 304):
        Room.objects.get_or_create(hotel=pine_hills, room_number=str(i), defaults={'room_type': rt_ph_suite, 'floor': '3rd Floor'})

    # 4. 1st Inn Malaybalay (Malaybalay, Bukidnon) - Downtown/City
    first_inn, _ = Hotel.objects.get_or_create(
        slug='1st-inn-malaybalay',
        defaults={
            'name': '1st Inn Malaybalay',
            'tagline': 'Affordable, clean, and central transit lodging for travelers',
            'description': 'Conveniently situated along Fortich Street steps from commercial banks, food hubs, and the provincial Capitol Grounds. The top choice for value-focused travelers.',
            'address': 'Fortich Street, Poblacion, Malaybalay City, Bukidnon',
            'city': 'Malaybalay City',
            'province': 'Bukidnon',
            'country': 'PH',
            'country_name': 'Philippines',
            'category': 'city',
            'currency': 'PHP',
            'timezone': 'Asia/Manila',
            'latitude': 8.1550,
            'longitude': 125.1320,
            'contact_phone': '+63 88 813 4900',
            'contact_email': 'info@1stinnmalaybalay.ph',
            'image_url': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Free Wi-Fi', 'Air Conditioning', '24/7 Front Desk', 'Keycard Access', 'CCTV Security', 'Standby Generator'],
            'rating': 4.3,
            'review_count': 56,
            'is_active': True,
        }
    )
    first_inn.category = 'city'
    first_inn.country = 'PH'
    first_inn.country_name = 'Philippines'
    first_inn.currency = 'PHP'
    first_inn.save()

    rt_fi_single, _ = RoomType.objects.get_or_create(
        hotel=first_inn,
        name='Compact Single Room',
        defaults={
            'description': 'Efficient private room with single bed, desk, hot shower, and high-speed Wi-Fi.',
            'base_rate': 850.00,
            'currency': 'PHP',
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
            'currency': 'PHP',
            'capacity': 2,
            'amenities': ['1 Double Bed', 'Air Conditioning', 'Cable TV', 'Hot Shower', 'Wi-Fi'],
            'photos': ['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80']
        }
    )
    for i in range(11, 15):
        Room.objects.get_or_create(hotel=first_inn, room_number=f"Room {i}", defaults={'room_type': rt_fi_single, 'floor': '1st Floor'})
    for i in range(21, 25):
        Room.objects.get_or_create(hotel=first_inn, room_number=f"Room {i}", defaults={'room_type': rt_fi_double, 'floor': '2nd Floor'})

    # 5. Bukidnon Mountain View Inn (Malaybalay, Bukidnon)
    mountain_view, _ = Hotel.objects.get_or_create(
        slug='bukidnon-mountain-view-inn',
        defaults={
            'name': 'Bukidnon Mountain View Inn',
            'tagline': 'Peaceful hillside escape with sweeping views of Mt. Kitanglad Range',
            'description': 'A quiet sanctuary away from the city traffic, offering panoramic mountain sunrises, pine-scented breezes, and organic garden surroundings.',
            'address': 'Barangay Casisang, Malaybalay City, Bukidnon',
            'city': 'Malaybalay City',
            'province': 'Bukidnon',
            'country': 'PH',
            'country_name': 'Philippines',
            'category': 'mountain',
            'currency': 'PHP',
            'timezone': 'Asia/Manila',
            'latitude': 8.1420,
            'longitude': 125.1350,
            'contact_phone': '+63 917 889 3321',
            'contact_email': 'contact@bukidnonmountainview.ph',
            'image_url': 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Free Wi-Fi', 'Garden Terrace', 'Free Parking', 'Hot Shower', 'Campfire Grounds', 'Coffee Lounge'],
            'rating': 4.8,
            'review_count': 31,
            'is_active': True,
        }
    )
    mountain_view.category = 'mountain'
    mountain_view.country = 'PH'
    mountain_view.country_name = 'Philippines'
    mountain_view.currency = 'PHP'
    mountain_view.save()

    rt_mv_std, _ = RoomType.objects.get_or_create(
        hotel=mountain_view,
        name='Hillside Standard Cottage',
        defaults={
            'description': 'Charming cottage room overlooking native pine groves and Mt. Kitanglad.',
            'base_rate': 1750.00,
            'currency': 'PHP',
            'capacity': 2,
            'amenities': ['1 Queen Bed', 'Veranda Seating', 'Hot Shower', 'Complimentary Bukidnon Brewed Coffee'],
            'photos': ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80']
        }
    )
    for i in range(1, 5):
        Room.objects.get_or_create(hotel=mountain_view, room_number=f"Cottage {i}", defaults={'room_type': rt_mv_std, 'floor': 'Ground'})

    # 6. Kitanglad Breeze Eco Lodge (Pending Approval Demo)
    breeze_owner, created = User.objects.get_or_create(
        username='breeze_owner',
        defaults={
            'email': 'owner@kitangladbreeze.ph',
            'first_name': 'Rogelio',
            'last_name': 'Dela Torre',
            'role': 'admin',
            'phone_number': '+63 920 444 8899'
        }
    )
    if created:
        breeze_owner.set_password('breeze123')
        breeze_owner.save()

    kitanglad_breeze, _ = Hotel.objects.get_or_create(
        slug='kitanglad-breeze-eco-lodge',
        defaults={
            'name': 'Kitanglad Breeze Eco Lodge',
            'tagline': 'Serene agro-tourism stay with panoramic canyon ridge views',
            'description': 'A new eco-resort nestled along the foothills of Mount Kitanglad featuring rustic wooden cabins, strawberry picking, and fresh mountain spring water.',
            'address': 'Sitio Kaatuan, Lantapan / Malaybalay Border, Bukidnon',
            'city': 'Malaybalay City',
            'province': 'Bukidnon',
            'country': 'PH',
            'country_name': 'Philippines',
            'category': 'eco',
            'currency': 'PHP',
            'timezone': 'Asia/Manila',
            'latitude': 8.1100,
            'longitude': 125.0100,
            'contact_phone': '+63 920 444 8899',
            'contact_email': 'stay@kitangladbreeze.ph',
            'image_url': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Free Wi-Fi', 'Mountain Trekking Guides', 'Bonfire Pit', 'Solar Powered Hot Showers'],
            'rating': 5.0,
            'review_count': 4,
            'status': 'pending',
            'business_permit_number': 'BP-2026-MALAY-9941',
            'bir_tin': '987-654-321-000',
            'payout_method': 'GCash',
            'payout_account_name': 'Rogelio Dela Torre',
            'payout_account_number': '09204448899',
            'owner': breeze_owner,
            'is_active': True,
        }
    )
    breeze_owner.hotel = kitanglad_breeze
    breeze_owner.save()

    rt_breeze_cabin, _ = RoomType.objects.get_or_create(
        hotel=kitanglad_breeze,
        name='Pine Ridge Wooden Cabin',
        defaults={
            'description': 'Cozy A-frame cabin surrounded by native pine trees and birdsong.',
            'base_rate': 2100.00,
            'currency': 'PHP',
            'capacity': 2,
            'amenities': ['1 Queen Bed', 'Balcony Deck', 'Hot Shower', 'Complimentary Breakfast'],
            'photos': ['https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80']
        }
    )
    for i in range(1, 4):
        Room.objects.get_or_create(hotel=kitanglad_breeze, room_number=f"Cabin {i}", defaults={'room_type': rt_breeze_cabin, 'floor': 'Ground'})

    # ================================================================
    # 7. NATIONWIDE EXPANSION (PHILIPPINES DESTINATIONS)
    # ================================================================

    # 7A. Boracay Island, Aklan (Beach & Island)
    boracay_resort, _ = Hotel.objects.get_or_create(
        slug='white-beach-sands-boracay',
        defaults={
            'name': 'White Beach Sands Boutique Resort',
            'tagline': 'Pristine beachfront sanctuary on Boracay’s powdery white coast',
            'description': 'Located along Station 1, steps away from the crystal clear turquoise waters. Features island architectural elements, artisan breakfast, and sunset paddleboarding.',
            'address': 'Station 1, White Beach, Boracay Island, Malay',
            'city': 'Boracay Island',
            'province': 'Aklan',
            'country': 'PH',
            'country_name': 'Philippines',
            'category': 'beach',
            'currency': 'PHP',
            'timezone': 'Asia/Manila',
            'latitude': 11.9674,
            'longitude': 121.9248,
            'contact_phone': '+63 36 288 3344',
            'contact_email': 'aloha@boracaysands.ph',
            'image_url': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Beachfront Access', 'Paddleboard Rental', 'Free Breakfast', 'High-Speed Wi-Fi', 'Sunset Cocktail Lounge', 'Air Conditioning'],
            'rating': 4.9,
            'review_count': 84,
            'status': 'approved',
            'is_active': True,
        }
    )
    rt_boracay_dlx, _ = RoomType.objects.get_or_create(
        hotel=boracay_resort,
        name='Oceanfront Sunrise Suite',
        defaults={
            'description': 'Unobstructed white sand beach views with private hammock balcony.',
            'base_rate': 3600.00,
            'currency': 'PHP',
            'capacity': 2,
            'amenities': ['1 King Bed', 'Private Ocean Balcony', 'Rain Shower', 'Espresso Machine'],
            'photos': ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80']
        }
    )
    for i in range(1, 4):
        Room.objects.get_or_create(hotel=boracay_resort, room_number=f"Suite 10{i}", defaults={'room_type': rt_boracay_dlx, 'floor': '1st Floor'})

    # 7B. Siargao Island (Island / Eco Surf)
    siargao_inn, _ = Hotel.objects.get_or_create(
        slug='cloud9-surf-heritage-inn',
        defaults={
            'name': 'Cloud 9 Surf & Heritage Inn',
            'tagline': 'Authentic island eco-lodge steps from world-famous surf breaks',
            'description': 'A sustainable bamboo and teakwood retreat in General Luna. Includes surfboard storage, coconut cafe, and daily guided surf safaris.',
            'address': 'Tourism Road, General Luna, Siargao Island',
            'city': 'General Luna, Siargao',
            'province': 'Surigao del Norte',
            'country': 'PH',
            'country_name': 'Philippines',
            'category': 'beach',
            'currency': 'PHP',
            'timezone': 'Asia/Manila',
            'latitude': 9.8037,
            'longitude': 126.1627,
            'contact_phone': '+63 919 777 2200',
            'contact_email': 'surf@cloud9heritage.ph',
            'image_url': 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Surfboard Locker', 'Motorbike Rental', 'Yoga Shala', 'Solar Hot Shower', 'Organic Smoothie Bar'],
            'rating': 4.8,
            'review_count': 62,
            'status': 'approved',
            'is_active': True,
        }
    )
    rt_siargao_bungalow, _ = RoomType.objects.get_or_create(
        hotel=siargao_inn,
        name='Bamboo Garden Bungalow',
        defaults={
            'description': 'Traditional tropical bungalow with open-air garden shower.',
            'base_rate': 2200.00,
            'currency': 'PHP',
            'capacity': 2,
            'amenities': ['1 Queen Bed', 'Open-Air Shower', 'Veranda Seating', 'Wi-Fi'],
            'photos': ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80']
        }
    )
    for i in range(1, 4):
        Room.objects.get_or_create(hotel=siargao_inn, room_number=f"Bungalow {i}", defaults={'room_type': rt_siargao_bungalow, 'floor': 'Ground'})

    # 7C. Baguio City, Benguet (Highland / Mountain)
    baguio_lodge, _ = Hotel.objects.get_or_create(
        slug='camp-john-hay-pine-lodge',
        defaults={
            'name': 'Camp John Hay Heritage Pine Lodge',
            'tagline': 'Crisp mountain pine scents & cozy stone fireplace charm',
            'description': 'Perched at 1,500 meters altitude in Baguio City. Enjoy log cabin interiors, hot highland cocoa, and walking trails through old-growth pine forests.',
            'address': 'Loakan Road, Camp John Hay, Baguio City',
            'city': 'Baguio City',
            'province': 'Benguet',
            'country': 'PH',
            'country_name': 'Philippines',
            'category': 'mountain',
            'currency': 'PHP',
            'timezone': 'Asia/Manila',
            'latitude': 16.4023,
            'longitude': 120.5960,
            'contact_phone': '+63 74 442 8899',
            'contact_email': 'stay@baguiopinelodge.ph',
            'image_url': 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Stone Fireplace Lounge', 'Pine Forest Trails', 'Free Parking', 'Artisan Bakery', 'Hot Water Bath'],
            'rating': 4.7,
            'review_count': 110,
            'status': 'approved',
            'is_active': True,
        }
    )
    rt_baguio_cabin, _ = RoomType.objects.get_or_create(
        hotel=baguio_lodge,
        name='Highland Pine Cabin Room',
        defaults={
            'description': 'Wood-paneled mountain retreat with warm feather duvets.',
            'base_rate': 2800.00,
            'currency': 'PHP',
            'capacity': 2,
            'amenities': ['1 Queen Bed', 'Mountain View', 'Heated Shower', 'Complimentary Hot Cocoa'],
            'photos': ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80']
        }
    )
    for i in range(1, 4):
        Room.objects.get_or_create(hotel=baguio_lodge, room_number=f"Room {200 + i}", defaults={'room_type': rt_baguio_cabin, 'floor': '2nd Floor'})

    # 7D. Lapu-Lapu City / Cebu (City & Coastal)
    cebu_inn, _ = Hotel.objects.get_or_create(
        slug='mactan-seaside-heritage-inn',
        defaults={
            'name': 'Mactan Seaside Heritage Inn',
            'tagline': 'Coastal tranquility meets vibrant Queen City hospitality',
            'description': 'A boutique coastal inn in Mactan Island, Cebu. Perfect for island hopping departures, diving excursions, and fresh seafood dining.',
            'address': 'Punta Engaño Road, Lapu-Lapu City, Cebu',
            'city': 'Lapu-Lapu City, Cebu',
            'province': 'Cebu',
            'country': 'PH',
            'country_name': 'Philippines',
            'category': 'city',
            'currency': 'PHP',
            'timezone': 'Asia/Manila',
            'latitude': 10.3157,
            'longitude': 123.8854,
            'contact_phone': '+63 32 340 7711',
            'contact_email': 'welcome@mactanseaside.ph',
            'image_url': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Rooftop Harbor Terrace', 'Airport Shuttle', 'Island Hopping Desk', 'Free Wi-Fi', 'Swimming Pool'],
            'rating': 4.6,
            'review_count': 47,
            'status': 'approved',
            'is_active': True,
        }
    )
    rt_cebu_room, _ = RoomType.objects.get_or_create(
        hotel=cebu_inn,
        name='Harbor Breeze Premier Room',
        defaults={
            'description': 'Modern coastal room with private balcony overlooking the marina.',
            'base_rate': 2500.00,
            'currency': 'PHP',
            'capacity': 2,
            'amenities': ['1 Queen Bed', 'Marina View', 'Air Conditioning', 'Free Wi-Fi'],
            'photos': ['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80']
        }
    )
    for i in range(1, 4):
        Room.objects.get_or_create(hotel=cebu_inn, room_number=f"Room {300 + i}", defaults={'room_type': rt_cebu_room, 'floor': '3rd Floor'})

    # 7E. Intramuros, Manila (Heritage & Cultural)
    manila_hotel, _ = Hotel.objects.get_or_create(
        slug='intramuros-courtyard-hotel',
        defaults={
            'name': 'Intramuros Heritage Courtyard Hotel',
            'tagline': 'Step inside the historic 16th-century walled city of Old Manila',
            'description': 'Restored Spanish colonial mansion featuring cobblestone courtyards, capiz shell windows, antique wooden furnishings, and fine Filipino gastronomy.',
            'address': 'General Luna Street, Intramuros, Manila',
            'city': 'Manila',
            'province': 'Metro Manila',
            'country': 'PH',
            'country_name': 'Philippines',
            'category': 'heritage',
            'currency': 'PHP',
            'timezone': 'Asia/Manila',
            'latitude': 14.5895,
            'longitude': 120.9752,
            'contact_phone': '+63 2 8527 4488',
            'contact_email': 'reservations@intramuroscourtyard.ph',
            'image_url': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Courtyard Garden', 'Spanish-Filipino Restaurant', 'Historical Walking Tours', 'Free Wi-Fi', 'Library Lounge'],
            'rating': 4.8,
            'review_count': 73,
            'status': 'approved',
            'is_active': True,
        }
    )
    rt_manila_room, _ = RoomType.objects.get_or_create(
        hotel=manila_hotel,
        name='Colonial Capiz Deluxe Room',
        defaults={
            'description': 'Authentic hardwood floors, high ceilings, and antique Philippine craftsmanship.',
            'base_rate': 2900.00,
            'currency': 'PHP',
            'capacity': 2,
            'amenities': ['1 Four-Poster Queen Bed', 'Capiz Window Views', 'Clawfoot Tub', 'Complimentary Heritage Breakfast'],
            'photos': ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80']
        }
    )
    for i in range(1, 4):
        Room.objects.get_or_create(hotel=manila_hotel, room_number=f"Suite {400 + i}", defaults={'room_type': rt_manila_room, 'floor': '2nd Floor'})

    # ================================================================
    # 8. INTERNATIONAL EXPANSION PILOT DESTINATIONS
    # ================================================================

    # 8A. Tokyo, Japan (Heritage & Culture)
    tokyo_ryokan, _ = Hotel.objects.get_or_create(
        slug='asakusa-machiya-ryokan-tokyo',
        defaults={
            'name': 'Asakusa Traditional Machiya Ryokan',
            'tagline': 'Serene tatami living & aromatic cypress bath near Senso-ji Temple',
            'description': 'An authentic Edo-style townhouse nestled in a tranquil alley of Asakusa, Tokyo. Experience hand-woven tatami mats, paper shoji screens, green tea ceremonies, and hot cypress onsen baths.',
            'address': '2-Chome Asakusa, Taito City, Tokyo',
            'city': 'Tokyo',
            'province': 'Kanto',
            'country': 'JP',
            'country_name': 'Japan',
            'category': 'heritage',
            'currency': 'JPY',
            'timezone': 'Asia/Tokyo',
            'latitude': 35.7148,
            'longitude': 139.7967,
            'contact_phone': '+81 3 5800 1234',
            'contact_email': 'welcome@asakusaryokan.jp',
            'image_url': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Hot Hinoki Cypress Bath', 'Japanese Tea Ceremony', 'Yukata Robes Provided', 'High-Speed Wi-Fi', 'Traditional Breakfast'],
            'rating': 4.9,
            'review_count': 95,
            'status': 'approved',
            'is_active': True,
        }
    )
    rt_tokyo_tatami, _ = RoomType.objects.get_or_create(
        hotel=tokyo_ryokan,
        name='Tatami Zen Garden Room',
        defaults={
            'description': 'Natural rush grass tatami mats with premium futon bedding and private bonsai garden view.',
            'base_rate': 3700.00,  # Stored in base PHP equivalent (~9,800 JPY)
            'currency': 'JPY',
            'capacity': 2,
            'amenities': ['Traditional Futon Bedding', 'Private Hinoki Tub', 'Green Tea Set', 'Air Conditioning'],
            'photos': ['https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80']
        }
    )
    for i in range(1, 4):
        Room.objects.get_or_create(hotel=tokyo_ryokan, room_number=f"Room {i}01", defaults={'room_type': rt_tokyo_tatami, 'floor': '1st Floor'})

    # 8B. Ubud, Bali, Indonesia (Eco & Nature)
    bali_villa, _ = Hotel.objects.get_or_create(
        slug='ubud-rice-terrace-eco-villa',
        defaults={
            'name': 'Ubud Tropical Rice Terrace Eco-Villa',
            'tagline': 'Panoramic jungle ridge infinity views & traditional Balinese open living',
            'description': 'Perched above the sacred Campuhan valley in Ubud, Bali. Surrounded by cascading emerald rice terraces, tropical orchids, and yoga open-air pavilions.',
            'address': 'Jalan Raya Sanggingan, Ubud, Gianyar, Bali',
            'city': 'Ubud, Bali',
            'province': 'Bali',
            'country': 'ID',
            'country_name': 'Indonesia',
            'category': 'eco',
            'currency': 'USD',
            'timezone': 'Asia/Makassar',
            'latitude': -8.5069,
            'longitude': 115.2625,
            'contact_phone': '+62 361 977 8899',
            'contact_email': 'stay@ubudecovilla.id',
            'image_url': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
            'amenities': ['Infinity Plunge Pool', 'Daily Yoga Class', 'Organic Farm-to-Table Breakfast', 'Ayurvedic Spa', 'High-Speed Wi-Fi'],
            'rating': 4.9,
            'review_count': 88,
            'status': 'approved',
            'is_active': True,
        }
    )
    rt_bali_suite, _ = RoomType.objects.get_or_create(
        hotel=bali_villa,
        name='Jungle Canopy Open-Air Suite',
        defaults={
            'description': 'Teakwood villa suite with king bed draped in netting, private plunge pool, and valley views.',
            'base_rate': 3200.00,  # Base PHP equivalent (~$55 USD)
            'currency': 'USD',
            'capacity': 2,
            'amenities': ['1 King Bed', 'Private Plunge Pool', 'Jungle Valley View', 'Organic Breakfast Included'],
            'photos': ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80']
        }
    )
    for i in range(1, 4):
        Room.objects.get_or_create(hotel=bali_villa, room_number=f"Villa {i}", defaults={'room_type': rt_bali_suite, 'floor': 'Ground'})

    # 9. Sample Bookings for Pine Hills Hotel (preserves existing demo flows)
    now = timezone.now()
    today = date.today()

    b_pending, created = Booking.objects.get_or_create(
        booking_reference='CHK-DEMO-PENDING',
        defaults={
            'hotel': pine_hills,
            'room_type': rt_ph_deluxe,
            'guest': guest_user,
            'guest_name': 'Juan Dela Cruz',
            'guest_email': 'guest@localstay.local',
            'guest_phone': '+63 917 123 4567',
            'guest_count': 2,
            'check_in': today + timedelta(days=2),
            'check_out': today + timedelta(days=4),
            'total_amount': 4800.00,
            'currency': 'PHP',
            'status': 'pending_approval',
            'source': 'marketplace',
            'hold_expires_at': now + timedelta(minutes=40),
            'special_requests': 'Please provide extra pillows and quiet room facing the pine garden.'
        }
    )
    if created:
        Payment.objects.get_or_create(booking=b_pending, defaults={'amount': 4800.00, 'method': 'pay_at_hotel', 'status': 'unpaid'})

    room_201 = Room.objects.get(hotel=pine_hills, room_number='201')
    b_confirmed, created = Booking.objects.get_or_create(
        booking_reference='CHK-DEMO-CONFIRMED',
        defaults={
            'hotel': pine_hills,
            'room_type': rt_ph_deluxe,
            'room': room_201,
            'guest': guest_user,
            'guest_name': 'Juan Dela Cruz',
            'guest_email': 'guest@localstay.local',
            'guest_phone': '+63 917 123 4567',
            'guest_count': 2,
            'check_in': today,
            'check_out': today + timedelta(days=2),
            'total_amount': 4800.00,
            'currency': 'PHP',
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
            'currency': 'PHP',
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
        GuestRequest.objects.get_or_create(
            booking=b_checked_in,
            request_type='towels',
            defaults={
                'message': 'Could we please request two extra fresh bath towels and bottled water?',
                'status': 'pending'
            }
        )

    print("🎉 Seeding complete! LocalStay now features premier properties across the Philippines & internationally!")


if __name__ == '__main__':
    run()
