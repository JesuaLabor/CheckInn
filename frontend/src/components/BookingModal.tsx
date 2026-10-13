import React, { useState } from 'react';
import { useBookingDraftStore } from '../stores/bookingDraftStore';
import { useAuthStore } from '../stores/authStore';
import { useCurrencyStore } from '../stores/currencyStore';
import { api } from '../api/client';
import confetti from 'canvas-confetti';
import {
  X,
  Calendar,
  Users,
  ShieldCheck,
  CreditCard,
  Building,
  Clock,
  Sparkles,
  ChevronRight,
  Receipt,
} from 'lucide-react';

interface BookingModalProps {
  onSuccess: (bookingRef: string) => void;
  onOpenAuth: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ onSuccess, onOpenAuth }) => {
  const { draft, isModalOpen, closeBookingModal, setDraft } = useBookingDraftStore();
  const { user } = useAuthStore();
  const { formatPrice, currency } = useCurrencyStore();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isModalOpen || !draft || !draft.hotel || !draft.roomType) return null;

  const { hotel, roomType } = draft;

  const calculateNights = () => {
    if (!draft.checkIn || !draft.checkOut) return 1;
    const start = new Date(draft.checkIn).getTime();
    const end = new Date(draft.checkOut).getTime();
    const diff = (end - start) / (1000 * 3600 * 24);
    return diff > 0 ? Math.round(diff) : 1;
  };

  const nights = calculateNights();
  const baseRate = Number(roomType.base_rate);
  const totalAmount = nights * baseRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        hotel: hotel.id,
        room_type: roomType.id,
        guest_name: user.first_name ? `${user.first_name} ${user.last_name}` : user.username,
        guest_email: user.email || `${user.username}@localstay.local`,
        guest_phone: user.phone_number || '+63 917 123 4567',
        guest_count: draft.guestCount,
        check_in: draft.checkIn,
        check_out: draft.checkOut,
        special_requests: draft.specialRequests,
        payment_method: draft.paymentMethod,
        currency: currency,
      };

      const res = await api.post('/bookings/', payload);
      const bookingData = res.data.booking;

      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      closeBookingModal();
      onSuccess(bookingData.booking_reference);
    } catch (err: any) {
      const data = err.response?.data;
      if (typeof data === 'string') {
        setErrorMsg(data);
      } else if (data?.detail) {
        setErrorMsg(data.detail);
      } else if (Array.isArray(data)) {
        setErrorMsg(data[0]);
      } else if (typeof data === 'object') {
        const first = Object.values(data)[0];
        setErrorMsg(Array.isArray(first) ? first[0] : String(first));
      } else {
        setErrorMsg('Failed to submit booking request. Please check room availability.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#E8E2D8] my-8 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-[#212529] via-[#1E3A2B] to-[#12241A] text-white p-6 relative">
          <button
            onClick={closeBookingModal}
            className="absolute top-4 right-4 p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#3B5E43]/30 text-[#E2AE55] text-[10px] font-bold border border-[#D49B41]/35 mb-2">
            <Building className="w-3 h-3" />
            <span>{hotel.name}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{roomType.name}</h2>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            ₱{Number(roomType.base_rate).toLocaleString()} / night • Max {roomType.capacity} guests
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-shake">
              {errorMsg}
            </div>
          )}

          {/* Soft Hold Alert Badge */}
          <div className="p-3.5 rounded-2xl bg-[#D49B41]/10 border border-[#D49B41]/35 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#D49B41] border border-[#E8E2D8] flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4 text-[#D49B41]" />
            </div>
            <div className="text-xs text-[#212529]">
              <span className="font-extrabold text-[#8F611A]">45-Minute Soft Hold Guarantee:</span> Submitting immediately locks room inventory for you. Other travelers cannot book these dates while hotel staff reviews your stay.
            </div>
          </div>

          {/* Dates Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Check-in</label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={draft.checkIn}
                onChange={(e) => setDraft({ checkIn: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Check-out</label>
              <input
                type="date"
                required
                min={draft.checkIn}
                value={draft.checkOut}
                onChange={(e) => setDraft({ checkOut: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
              />
            </div>
          </div>

          {/* Number of Guests */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Number of Guests</label>
            <div className="relative">
              <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <select
                value={draft.guestCount}
                onChange={(e) => setDraft({ guestCount: Number(e.target.value) })}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-bold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5] cursor-pointer"
              >
                {Array.from({ length: roomType.capacity }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Guest' : 'Guests'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Method Radio Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Payment Preference</label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  draft.paymentMethod === 'pay_at_hotel'
                    ? 'border-[#1E3A2B] bg-[#FAF8F5] text-[#1E3A2B] font-bold shadow-2xs'
                    : 'border-[#E8E2D8] text-slate-700 hover:bg-[#FAF8F5] font-medium'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={draft.paymentMethod === 'pay_at_hotel'}
                  onChange={() => setDraft({ paymentMethod: 'pay_at_hotel' })}
                  className="hidden"
                />
                <Building className="w-4 h-4 text-[#1E3A2B] shrink-0" />
                <span>Pay at Hotel Desk</span>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  draft.paymentMethod === 'gcash'
                    ? 'border-[#1E3A2B] bg-[#FAF8F5] text-[#1E3A2B] font-bold shadow-2xs'
                    : 'border-[#E8E2D8] text-slate-700 hover:bg-[#FAF8F5] font-medium'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={draft.paymentMethod === 'gcash'}
                  onChange={() => setDraft({ paymentMethod: 'gcash' })}
                  className="hidden"
                />
                <CreditCard className="w-4 h-4 text-[#3B5E43] shrink-0" />
                <span>GCash (QR at Arrival)</span>
              </label>
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Guest Notes & Requests <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Expected arrival at 2:00 PM, quiet room preference"
              value={draft.specialRequests}
              onChange={(e) => setDraft({ specialRequests: e.target.value })}
              className="w-full px-3.5 py-2 text-xs font-medium border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
            />
          </div>

          {/* Price Receipt Box */}
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D8] space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>
                {formatPrice(baseRate)} × {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
              <span className="font-bold text-[#212529]">{formatPrice(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Hospitality & Service Tax</span>
              <span className="text-[#3B5E43] font-bold">Included</span>
            </div>
            <div className="pt-2 border-t border-[#E8E2D8] flex justify-between items-baseline">
              <span className="text-xs font-black text-[#212529]">Total Rate Due</span>
              <span className="text-xl font-black text-[#1E3A2B]">{formatPrice(totalAmount)}</span>
            </div>
          </div>

          {/* Submit Action */}
          {user ? (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#1E3A2B] to-[#3B5E43] hover:from-[#162C20] hover:to-[#2F4D36] text-white font-black text-xs sm:text-sm shadow-md shadow-[#1E3A2B]/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Securing 45-Min Hold...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#E2AE55]" />
                  <span>Request Booking & Lock 45-Min Hold</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full py-3.5 rounded-xl bg-[#212529] hover:bg-[#16191D] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Sign In to Complete Reservation</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
