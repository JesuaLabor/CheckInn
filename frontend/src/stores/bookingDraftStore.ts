import { create } from 'zustand';
import { Hotel, RoomType } from '../types';

export interface BookingDraft {
  hotel: Hotel | null;
  roomType: RoomType | null;
  stayType: 'nightly' | 'hourly';
  durationHours: number; // 3, 6, 12, or 24
  checkInTime: string; // e.g. "14:00"
  checkIn: string;
  checkOut: string;
  guestCount: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests: string;
  paymentMethod: 'pay_at_hotel' | 'gcash' | 'cash' | 'card';
  paymentReference?: string;
}

interface BookingDraftState {
  draft: BookingDraft | null;
  isModalOpen: boolean;
  setDraft: (draft: Partial<BookingDraft>) => void;
  clearDraft: () => void;
  openBookingModal: (
    hotel: Hotel,
    roomType: RoomType,
    options?: {
      checkIn?: string;
      checkOut?: string;
      guests?: number;
      stayType?: 'nightly' | 'hourly';
      durationHours?: number;
      checkInTime?: string;
    }
  ) => void;
  closeBookingModal: () => void;
}

export const useBookingDraftStore = create<BookingDraftState>((set) => ({
  draft: null,
  isModalOpen: false,

  setDraft: (partialDraft) =>
    set((state) => ({
      draft: state.draft ? { ...state.draft, ...partialDraft } : (partialDraft as BookingDraft),
    })),

  clearDraft: () => set({ draft: null, isModalOpen: false }),

  openBookingModal: (hotel, roomType, options) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMin = now.getMinutes() < 30 ? '30' : '00';
    const defaultTime = `${currentHour}:${currentMin}`;

    set({
      isModalOpen: true,
      draft: {
        hotel,
        roomType,
        stayType: options?.stayType || 'nightly',
        durationHours: options?.durationHours || 3,
        checkInTime: options?.checkInTime || defaultTime,
        checkIn: options?.checkIn || today,
        checkOut: options?.checkOut || tomorrow,
        guestCount: options?.guests || 1,
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        specialRequests: '',
        paymentMethod: 'pay_at_hotel',
        paymentReference: '',
      },
    });
  },

  closeBookingModal: () => set({ isModalOpen: false }),
}));
