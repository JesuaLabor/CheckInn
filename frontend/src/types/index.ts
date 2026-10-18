export type UserRole = 'guest' | 'staff' | 'admin' | 'superadmin';

export interface User {
  id: number | string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  hotel?: number | string | null;
  hotel_name?: string | null;
  hotel_slug?: string | null;
  phone_number?: string;
}

export type HotelStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Hotel {
  id: number | string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  address: string;
  city: string;
  province: string;
  country?: string;
  country_name?: string;
  postal_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  currency?: string;
  timezone?: string;
  category?: string;
  contact_phone: string;
  contact_email: string;
  image_url: string;
  amenities: string[];
  rating: number;
  review_count: number;
  min_rate: number | null;
  room_types_count?: number;
  available_rooms_count?: number;
  room_types?: RoomType[];
  room_types_summary?: Array<{
    id: number | string;
    name: string;
    base_rate: number | string;
    capacity: number;
    photo?: string | null;
  }>;
  status?: HotelStatus;
  rejection_reason?: string;
  business_permit_number?: string;
  bir_tin?: string;
  payout_method?: string;
  payout_account_name?: string;
  payout_account_number?: string;
  commission_rate?: number | string;
  owner_username?: string;
  owner_email?: string;
  owner_name?: string;
  owner_phone?: string;
  total_rooms?: number;
  total_room_types?: number;
  total_bookings?: number;
  created_at?: string;
}

export interface PlatformStats {
  total_hotels: number;
  pending_hotels: number;
  approved_hotels: number;
  rejected_hotels: number;
  suspended_hotels: number;
  total_rooms: number;
  total_bookings: number;
  confirmed_bookings: number;
  total_gmv: number;
  estimated_commission: number;
}

export interface StaffMember {
  id: number | string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  role: 'staff' | 'admin';
  phone_number?: string;
  is_active: boolean;
  date_joined: string;
}

export interface RoomType {
  id: number | string;
  hotel: number | string;
  hotel_name?: string;
  name: string;
  description: string;
  base_rate: number | string;
  currency?: string;
  capacity: number;
  amenities: string[];
  photos: string[];
  short_stay_enabled?: boolean;
  rate_3h?: number | string | null;
  rate_6h?: number | string | null;
  rate_12h?: number | string | null;
  rate_24h?: number | string | null;
  total_rooms?: number;
  available_count?: number;
  rooms?: Room[];
}

export interface Room {
  id: number | string;
  room_number: string;
  floor: string;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  is_active: boolean;
  room_type: number | string;
  room_type_name?: string;
  base_rate?: number | string;
  short_stay_enabled?: boolean;
  rate_3h?: number | string | null;
  rate_6h?: number | string | null;
  rate_12h?: number | string | null;
  rate_24h?: number | string | null;
  occupant?: {
    booking_id: number | string;
    booking_reference: string;
    guest_name: string;
    guest_phone: string;
    check_in: string;
    check_out: string;
    status?: string;
    status_display?: string;
    stay_type?: 'nightly' | 'hourly';
    duration_hours?: number;
    check_in_datetime?: string;
    check_out_datetime?: string;
    remaining_seconds?: number | null;
    is_expired?: boolean;
    total_amount?: number | string;
    deposit_amount?: number | string;
    balance_due?: number | string;
    deposit_type?: 'fifty_percent' | 'full';
    payment_status?: string;
  } | null;
}

export type BookingStatus =
  | 'pending_approval'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'rejected'
  | 'cancelled'
  | 'no_show'
  | 'expired';

export interface Payment {
  id: number | string;
  amount: number | string;
  method: 'pay_at_hotel' | 'gcash' | 'cash' | 'card';
  status: 'unpaid' | 'paid' | 'refunded';
  reference_number?: string;
  paid_at?: string | null;
  created_at: string;
}

export interface Review {
  id: number | string;
  hotel?: number | string;
  hotel_name?: string;
  booking?: number | string;
  booking_reference?: string;
  guest?: number | string;
  guest_name?: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at?: string;
}

export interface GuestRequest {
  id: number | string;
  booking: number | string;
  request_type: string;
  request_type_display: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved';
  status_display: string;
  room_number?: string;
  created_at: string;
  resolved_at?: string | null;
}

export interface Booking {
  id: number | string;
  booking_reference: string;
  hotel: number | string;
  hotel_name: string;
  hotel_slug: string;
  hotel_address: string;
  room_type: number | string;
  room_type_name: string;
  room?: number | string | null;
  room_number?: string;
  guest?: number | string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_count: number;
  stay_type?: 'nightly' | 'hourly';
  duration_hours?: number | null;
  check_in_datetime?: string | null;
  check_out_datetime?: string | null;
  check_in: string;
  check_out: string;
  total_amount: number | string;
  currency?: string;
  deposit_type?: 'fifty_percent' | 'full';
  deposit_amount?: number | string;
  balance_due?: number | string;
  is_non_refundable?: boolean;
  cancellation_policy?: string;
  status: BookingStatus;
  status_display: string;
  source: 'marketplace' | 'walk_in';
  source_display: string;
  hold_expires_at?: string | null;
  is_hold_active: boolean;
  qr_token?: string;
  special_requests?: string;
  rejection_reason?: string;
  reviewed_by?: number | string | null;
  reviewed_at?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  created_at: string;
  payment?: Payment;
  service_requests?: GuestRequest[];
  review?: Review | null;
}

export type AuditLogCategory = 'all' | 'booking' | 'inventory' | 'housekeeping' | 'staff' | 'settings';
export type AuditLogSeverity = 'all' | 'info' | 'warning' | 'critical';

export interface HotelAuditLog {
  id: number | string;
  hotel: number | string;
  hotel_name: string;
  actor?: number | string | null;
  actor_name: string;
  actor_role: string;
  actor_email?: string;
  category: 'booking' | 'inventory' | 'housekeeping' | 'staff' | 'settings';
  action: string;
  severity: 'info' | 'warning' | 'critical';
  summary: string;
  details: Record<string, any>;
  ip_address?: string | null;
  created_at: string;
}
