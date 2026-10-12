export type UserRole = 'guest' | 'staff' | 'admin' | 'superadmin';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  hotel?: number | null;
  hotel_name?: string | null;
  hotel_slug?: string | null;
  phone_number?: string;
}

export interface Hotel {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  address: string;
  city: string;
  province: string;
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
}

export interface RoomType {
  id: number;
  hotel: number;
  hotel_name?: string;
  name: string;
  description: string;
  base_rate: number | string;
  capacity: number;
  amenities: string[];
  photos: string[];
  total_rooms?: number;
  available_count?: number;
}

export interface Room {
  id: number;
  room_number: string;
  floor: string;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  is_active: boolean;
  room_type: number;
  room_type_name?: string;
  base_rate?: number | string;
  occupant?: {
    booking_id: number;
    booking_reference: string;
    guest_name: string;
    guest_phone: string;
    check_in: string;
    check_out: string;
  } | null;
}

export type BookingStatus =
  | 'pending_approval'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export interface Payment {
  id: number;
  amount: number | string;
  method: 'pay_at_hotel' | 'gcash' | 'cash' | 'card';
  status: 'unpaid' | 'paid' | 'refunded';
  reference_number?: string;
  paid_at?: string | null;
  created_at: string;
}

export interface GuestRequest {
  id: number;
  booking: number;
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
  id: number;
  booking_reference: string;
  hotel: number;
  hotel_name: string;
  hotel_slug: string;
  hotel_address: string;
  room_type: number;
  room_type_name: string;
  room?: number | null;
  room_number?: string;
  guest?: number | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_count: number;
  check_in: string;
  check_out: string;
  total_amount: number | string;
  status: BookingStatus;
  status_display: string;
  source: 'marketplace' | 'walk_in';
  source_display: string;
  hold_expires_at?: string | null;
  is_hold_active: boolean;
  qr_token?: string;
  special_requests?: string;
  rejection_reason?: string;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  created_at: string;
  payment?: Payment;
  service_requests?: GuestRequest[];
}
