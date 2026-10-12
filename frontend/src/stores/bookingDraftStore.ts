import { create } from 'zustand';
import { Hotel, RoomType } from '../types';

export interface BookingDraft {
  hotel: Hotel | null;
  roomType: RoomType | null;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests: string;
  paymentMethod: 'pay_at_hotel' | 'gcash' | 'cash' | 'card';
}

interface BookingDraftState {
  draft: BookingDraft | null;
  isModalOpen: boolean;
  setDraft: (draft: Partial<BookingDraft>) => void;
  clearDraft: () => void;
  openBookingModal: (hotel: Hotel, roomType: RoomType, dates?: { checkIn: string; checkOut: string; guests: number }) => void;
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

  openBookingModal: (hotel, roomType, dates) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    set({
      isModalOpen: true,
      draft: {
        hotel,
        roomType,
        checkIn: dates?.checkIn || today,
        checkOut: dates?.checkOut || tomorrow,
        guestCount: dates?.guests || 1,
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        specialRequests: '',
        paymentMethod: 'pay_at_hotel',
      },
    });
  },

  closeBookingModal: () => set({ isModalOpen: false }),
}));
