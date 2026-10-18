import React, { useState } from 'react';
import { useBookingDraftStore } from '../stores/bookingDraftStore';
import { useAuthStore } from '../stores/authStore';
import { useCurrencyStore } from '../stores/currencyStore';
import { toast } from '../stores/toastStore';
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
  Copy,
  Check,
  Smartphone,
  Info,
  Moon,
  Timer,
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
  const [copiedNumber, setCopiedNumber] = useState(false);

  if (!isModalOpen || !draft || !draft.hotel || !draft.roomType) return null;

  const { hotel, roomType } = draft;
  const isShortStay = draft.stayType === 'hourly';
  const baseRate = Number(roomType.base_rate);

  const calculateNights = () => {
    if (!draft.checkIn || !draft.checkOut) return 1;
    const start = new Date(draft.checkIn).getTime();
    const end = new Date(draft.checkOut).getTime();
    const diff = (end - start) / (1000 * 3600 * 24);
    return diff > 0 ? Math.round(diff) : 1;
  };

  const getTierRate = (hours: number): number => {
    if (hours === 3) {
      return Number(roomType.rate_3h || Math.round(baseRate * 0.3));
    } else if (hours === 6) {
      return Number(roomType.rate_6h || Math.round(baseRate * 0.5));
    } else if (hours === 12) {
      return Number(roomType.rate_12h || Math.round(baseRate * 0.75));
    } else {
      return Number(roomType.rate_24h || baseRate);
    }
  };

  const nights = calculateNights();
  const totalAmount = isShortStay ? getTierRate(draft.durationHours || 3) : nights * baseRate;
  const depositType = draft.depositType || 'fifty_percent';
  const depositAmount = depositType === 'full' ? totalAmount : Math.round(totalAmount * 0.5);
  const balanceDue = Math.max(0, totalAmount - depositAmount);

  const getExpectedCheckoutPreview = () => {
    if (!draft.checkIn || !draft.checkInTime) return '';
    try {
      const [h, m] = draft.checkInTime.split(':').map(Number);
      const dt = new Date(`${draft.checkIn}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
      dt.setHours(dt.getHours() + (draft.durationHours || 3));

      const timeStr = dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const startDate = new Date(`${draft.checkIn}T00:00:00`);
      const isNextDay = dt.getDate() !== startDate.getDate();
      return `${isNextDay ? 'Next Day' : 'Same Day'} at ${timeStr}`;
    } catch {
      return '';
    }
  };

  const payoutMethod = hotel.payout_method || 'GCash';
  const payoutName = hotel.payout_account_name || hotel.name;
  const payoutNumber = hotel.payout_account_number || '0917 555 8899';

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(payoutNumber.replace(/\s+/g, ''));
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!draft.agreedToNonRefundable) {
      toast.error('Please accept the non-refundable reservation deposit policy before reserving.');
      return;
    }

    if (!draft.paymentReference?.trim()) {
      toast.error('Please enter the payment transaction reference number for your reservation deposit.');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        hotel: hotel.id,
        room_type: roomType.id,
        guest_name: user.first_name ? `${user.first_name} ${user.last_name}` : user.username,
        guest_email: user.email || `${user.username}@localstay.local`,
        guest_phone: user.phone_number || '+63 917 123 4567',
        guest_count: draft.guestCount,
        special_requests: draft.specialRequests,
        deposit_type: depositType,
        payment_method: draft.paymentMethod || 'gcash',
        payment_reference: draft.paymentReference.trim(),
        terms_accepted: true,
        currency: currency,
        stay_type: draft.stayType,
      };

      if (isShortStay) {
        payload.duration_hours = draft.durationHours || 3;
        payload.check_in = draft.checkIn;
        payload.check_in_time = draft.checkInTime;
      } else {
        payload.check_in = draft.checkIn;
        payload.check_out = draft.checkOut;
      }

      const res = await api.post('/bookings/', payload);
      const bookingData = res.data.booking;

      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      toast.success(
        isShortStay
          ? `${draft.durationHours}-hour short-stay reservation confirmed! Deposit of ${formatPrice(depositAmount)} recorded.`
          : `Reservation confirmed! Deposit of ${formatPrice(depositAmount)} recorded.`
      );
      closeBookingModal();
      onSuccess(bookingData.booking_reference);
    } catch (err: any) {
      const data = err.response?.data;
      let msg = 'Failed to submit booking request. Please check room availability.';
      if (typeof data === 'string') {
        msg = data;
      } else if (data?.detail) {
        msg = data.detail;
      } else if (Array.isArray(data)) {
        msg = data[0];
      } else if (typeof data === 'object') {
        const first = Object.values(data)[0];
        msg = Array.isArray(first) ? first[0] : String(first);
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container: Bottom sheet on mobile / centered dialog on desktop */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[min(92vh,780px)] flex flex-col border border-[#E8E2D8] overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 pb-safe">
        
        {/* Header - Fixed & Pinned */}
        <div className="px-6 py-4 border-b border-[#E8E2D8]/80 shrink-0 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1E3A2B]/10 text-[#1E3A2B] text-[10px] font-black border border-[#1E3A2B]/20">
                <Building className="w-3 h-3 text-[#3B5E43]" />
                <span className="truncate max-w-[220px] sm:max-w-[280px]">{hotel.name}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#212529] tracking-tight leading-tight">
                {roomType.name}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                <span>{formatPrice(baseRate)} / night</span>
                {roomType.short_stay_enabled && (
                  <>
                    <span>•</span>
                    <span className="text-[#8F611A] font-bold">
                      Short-Stay from {formatPrice(getTierRate(3))} (3h)
                    </span>
                  </>
                )}
                <span>•</span>
                <span>Max {roomType.capacity} {roomType.capacity === 1 ? 'guest' : 'guests'}</span>
              </p>
            </div>

            <button
              onClick={closeBookingModal}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all active:scale-95 shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="booking-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4 overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300"
        >

          {/* Guaranteed Reservation with Mandatory Deposit Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1E3A2B]/10 via-[#FAF8F5] to-[#D49B41]/10 border border-[#1E3A2B]/20 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-white text-[#1E3A2B] border border-[#1E3A2B]/30 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              <ShieldCheck className="w-4 h-4 text-[#3B5E43]" />
            </div>
            <div className="text-xs text-[#212529]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-[#1E3A2B]">Guaranteed Reservation • Mandatory Deposit</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#1E3A2B]/15 text-[#1E3A2B] font-bold">
                  No Expiration Hold
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Your room inventory is locked immediately upon submitting your deposit. No 45-minute countdown—your booking stays reserved while hotel staff verifies your deposit payment.
              </p>
            </div>
          </div>

          {/* Stay Type Toggle (Overnight vs Short-Stay) */}
          {roomType.short_stay_enabled && (
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Stay Format
              </label>
              <div className="flex p-1 bg-[#FAF8F5] border border-[#E8E2D8] rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => setDraft({ stayType: 'nightly' })}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    !isShortStay
                      ? 'bg-[#1E3A2B] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Standard Overnight</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDraft({ stayType: 'hourly', durationHours: draft.durationHours || 3 })}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isShortStay
                      ? 'bg-[#1E3A2B] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Short-Stay (Wash & Go)</span>
                </button>
              </div>
            </div>
          )}

          {/* Short-Stay Hourly Selector */}
          {isShortStay ? (
            <div className="space-y-3 p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D8]">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Select Duration
                  </label>
                  <span className="text-[10px] text-[#8F611A] font-bold bg-[#D49B41]/15 px-2 py-0.5 rounded-full">
                    Fixed Hourly Slots
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { hours: 3, label: '3 Hours', sub: 'Wash & Go' },
                    { hours: 6, label: '6 Hours', sub: 'Half-Day' },
                    { hours: 12, label: '12 Hours', sub: 'Half-Day+' },
                    { hours: 24, label: '24 Hours', sub: 'Full Day' },
                  ].map((slot) => {
                    const rate = getTierRate(slot.hours);
                    const isSelected = draft.durationHours === slot.hours;
                    return (
                      <button
                        key={slot.hours}
                        type="button"
                        onClick={() => setDraft({ durationHours: slot.hours })}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#1E3A2B] bg-[#1E3A2B] text-white shadow-sm ring-1 ring-[#1E3A2B]'
                            : 'border-[#E8E2D8] bg-white text-slate-700 hover:border-[#1E3A2B]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-[#212529]'}`}>
                            {slot.label}
                          </span>
                          {isSelected && <Sparkles className="w-3 h-3 text-[#E2AE55]" />}
                        </div>
                        <div className={`text-[10px] ${isSelected ? 'text-slate-200' : 'text-slate-500'} font-medium truncate mt-0.5`}>
                          {slot.sub}
                        </div>
                        <div className={`text-xs font-black mt-1.5 ${isSelected ? 'text-[#E2AE55]' : 'text-[#1E3A2B]'}`}>
                          {formatPrice(rate)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Arrival Date and Time */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Arrival Date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={draft.checkIn}
                    onChange={(e) => setDraft({ checkIn: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Arrival Time
                  </label>
                  <input
                    type="time"
                    required
                    value={draft.checkInTime}
                    onChange={(e) => setDraft({ checkInTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-white"
                  />
                </div>
              </div>

              {/* Check-out Departure Preview */}
              <div className="p-2.5 rounded-xl bg-white border border-[#E8E2D8] flex items-center justify-between text-xs text-[#1E3A2B]">
                <div className="flex items-center gap-1.5 font-bold">
                  <Timer className="w-3.5 h-3.5 text-[#3B5E43]" />
                  <span>Estimated Checkout:</span>
                </div>
                <span className="font-extrabold text-[#212529]">
                  {getExpectedCheckoutPreview() || 'Specify arrival time'}
                </span>
              </div>
            </div>
          ) : (
            /* Standard Overnight Dates Selector */
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Stay Dates</label>
                <span className="text-[11px] font-bold text-[#1E3A2B] bg-[#1E3A2B]/10 px-2 py-0.5 rounded-full">
                  {nights} {nights === 1 ? 'night' : 'nights'} stay
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Check-in
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={draft.checkIn}
                      onChange={(e) => setDraft({ checkIn: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Check-out
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      min={draft.checkIn || new Date().toISOString().split('T')[0]}
                      value={draft.checkOut}
                      onChange={(e) => setDraft({ checkOut: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Number of Guests */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Number of Guests
            </label>
            <div className="relative">
              <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <select
                value={draft.guestCount}
                onChange={(e) => setDraft({ guestCount: Number(e.target.value) })}
                className="w-full pl-10 pr-3.5 py-2 text-xs font-bold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5] cursor-pointer"
              >
                {Array.from({ length: roomType.capacity }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Guest' : 'Guests'} (Room max: {roomType.capacity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mandatory Deposit Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Select Reservation Deposit
              </label>
              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Minimum 50% Required
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDraft({ depositType: 'fifty_percent' })}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  depositType === 'fifty_percent'
                    ? 'border-[#1E3A2B] bg-[#1E3A2B] text-white shadow-sm ring-1 ring-[#1E3A2B]'
                    : 'border-[#E8E2D8] bg-white text-slate-700 hover:border-[#1E3A2B]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${depositType === 'fifty_percent' ? 'text-white' : 'text-[#212529]'}`}>
                    50% Deposit
                  </span>
                  {depositType === 'fifty_percent' && <Sparkles className="w-3.5 h-3.5 text-[#E2AE55]" />}
                </div>
                <div className={`text-[10px] ${depositType === 'fifty_percent' ? 'text-slate-200' : 'text-slate-500'} font-medium mt-0.5`}>
                  Pay balance at check-in
                </div>
                <div className={`text-sm font-black mt-1.5 ${depositType === 'fifty_percent' ? 'text-[#E2AE55]' : 'text-[#1E3A2B]'}`}>
                  {formatPrice(Math.round(totalAmount * 0.5))}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDraft({ depositType: 'full' })}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  depositType === 'full'
                    ? 'border-[#1E3A2B] bg-[#1E3A2B] text-white shadow-sm ring-1 ring-[#1E3A2B]'
                    : 'border-[#E8E2D8] bg-white text-slate-700 hover:border-[#1E3A2B]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${depositType === 'full' ? 'text-white' : 'text-[#212529]'}`}>
                    100% Full Payment
                  </span>
                  {depositType === 'full' && <Sparkles className="w-3.5 h-3.5 text-[#E2AE55]" />}
                </div>
                <div className={`text-[10px] ${depositType === 'full' ? 'text-slate-200' : 'text-slate-500'} font-medium mt-0.5`}>
                  Zero balance at check-in
                </div>
                <div className={`text-sm font-black mt-1.5 ${depositType === 'full' ? 'text-[#E2AE55]' : 'text-[#1E3A2B]'}`}>
                  {formatPrice(totalAmount)}
                </div>
              </button>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Deposit Payment Channel</label>
              <span className="text-[10px] text-slate-400 font-medium">Direct lodging payout</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                  draft.paymentMethod === 'gcash'
                    ? 'border-[#1E3A2B] bg-[#FAF8F5] text-[#1E3A2B] font-bold shadow-2xs ring-1 ring-[#1E3A2B]/20'
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
                <CreditCard className="w-4 h-4 text-[#3B5E43] shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-[#212529] flex items-center gap-1.5">
                    <span>{payoutMethod} / E-Wallet</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#3B5E43]/15 text-[#1E3A2B] font-bold">Recommended</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5 leading-tight">
                    Instant GCash / Maya transfer
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                  draft.paymentMethod === 'card' || draft.paymentMethod === 'bank_transfer'
                    ? 'border-[#1E3A2B] bg-[#FAF8F5] text-[#1E3A2B] font-bold shadow-2xs ring-1 ring-[#1E3A2B]/20'
                    : 'border-[#E8E2D8] text-slate-700 hover:bg-[#FAF8F5] font-medium'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={draft.paymentMethod === 'card' || draft.paymentMethod === 'bank_transfer'}
                  onChange={() => setDraft({ paymentMethod: 'card' })}
                  className="hidden"
                />
                <Building className="w-4 h-4 text-[#1E3A2B] shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-[#212529] flex items-center gap-1.5">
                    <span>Bank Transfer / Card</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5 leading-tight">
                    Online bank transfer to lodging account
                  </div>
                </div>
              </label>
            </div>

            {/* Deposit Payment Instructions Card */}
            <div className="mt-2.5 p-3.5 rounded-2xl bg-gradient-to-br from-[#1E3A2B]/5 via-[#FAF8F5] to-[#FAF8F5] border border-[#1E3A2B]/20 space-y-3 animate-in fade-in zoom-in-98 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D8]/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1E3A2B] text-white flex items-center justify-center font-black text-xs shadow-2xs">
                    G
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#212529]">{hotel.name}</div>
                    <div className="text-[10px] text-[#3B5E43] font-bold">{payoutMethod} Merchant Account</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Deposit Due Now</span>
                  <span className="text-xs font-black text-[#1E3A2B]">{formatPrice(depositAmount)}</span>
                </div>
              </div>

              {/* Account Details Box with Copy */}
              <div className="bg-white p-2.5 rounded-xl border border-[#E8E2D8] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[9px] font-bold uppercase text-slate-400">Account Name & Number</div>
                  <div className="text-xs font-black text-[#212529]">{payoutName}</div>
                  <div className="text-xs font-mono font-bold text-[#1E3A2B] tracking-wide">{payoutNumber}</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#E8E2D8]/60 text-[#1E3A2B] border border-[#E8E2D8] text-[11px] font-bold transition-all flex items-center gap-1 active:scale-95 shrink-0 cursor-pointer"
                >
                  {copiedNumber ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#3B5E43]" />
                      <span className="text-[#3B5E43]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Reference Number Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#212529]">
                    Enter Payment Reference Number <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">From receipt / SMS</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1002 9845 1204"
                  value={draft.paymentReference || ''}
                  onChange={(e) => setDraft({ paymentReference: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-[#1E3A2B]/30 rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-white placeholder:text-slate-400 shadow-2xs"
                />
                <div className="flex items-start gap-1.5 pt-0.5 text-[10px] text-slate-500 leading-tight">
                  <Info className="w-3 h-3 text-[#3B5E43] shrink-0 mt-0.5" />
                  <span>Hotel staff will verify this payment reference before welcoming you at the front desk.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strict Non-Refundable Deposit Policy Agreement */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-950 font-black text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Strict Non-Refundable Reservation Policy</span>
            </div>
            <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
              The reservation deposit of <strong className="font-black text-amber-950">{formatPrice(depositAmount)}</strong> ({depositType === 'fifty_percent' ? '50%' : '100%'}) is <span className="font-black text-rose-700 underline">strictly non-refundable</span> upon guest cancellation, date modification, or no-show.
              {balanceDue > 0 && (
                <> The remaining balance of <strong className="font-black text-amber-950">{formatPrice(balanceDue)}</strong> will be collected upon physical check-in at the front desk.</>
              )}
            </p>
            <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={draft.agreedToNonRefundable || false}
                onChange={(e) => setDraft({ agreedToNonRefundable: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-[#1E3A2B] focus:ring-[#3B5E43] border-amber-400 cursor-pointer"
              />
              <span className="text-xs font-black text-slate-800 leading-tight">
                I understand and agree that this reservation deposit of {formatPrice(depositAmount)} is strictly non-refundable if I cancel this reservation. <span className="text-rose-600">*</span>
              </span>
            </label>
          </div>

          {/* Special Requests */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Guest Notes & Requests <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Expected arrival at 2:00 PM, quiet room preference"
              value={draft.specialRequests}
              onChange={(e) => setDraft({ specialRequests: e.target.value })}
              className="w-full px-3 py-2 text-xs font-medium border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
            />
          </div>

          {/* Itemized Price Receipt Card */}
          <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D8] space-y-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span>
                {isShortStay ? (
                  <>Short-Stay ({draft.durationHours || 3} Hours Fixed Slot)</>
                ) : (
                  <>{formatPrice(baseRate)} × {nights} {nights === 1 ? 'night' : 'nights'}</>
                )}
              </span>
              <span className="font-bold text-[#212529]">{formatPrice(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>
                Reservation Deposit ({depositType === 'fifty_percent' ? '50% Minimum' : '100% Full'})
              </span>
              <span className="font-bold text-emerald-800">{formatPrice(depositAmount)}</span>
            </div>
            {balanceDue > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>Remaining Balance Due at Front Desk</span>
                <span className="font-black text-[#8F611A]">{formatPrice(balanceDue)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-600">
              <span>Hospitality & Service Tax</span>
              <span className="text-[#3B5E43] font-bold">Included</span>
            </div>
          </div>
        </form>

        {/* Footer Action Bar - Fixed & Pinned */}
        <div className="px-6 py-4 border-t border-[#E8E2D8] bg-white shrink-0 shadow-lg shadow-black/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Deposit Due Now</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-[#1E3A2B] leading-none">
                  {formatPrice(depositAmount)}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {depositType === 'fifty_percent' ? '(50% deposit)' : '(full payment)'}
                </span>
              </div>
              {balanceDue > 0 && (
                <div className="text-[10px] text-[#8F611A] font-bold mt-0.5">
                  Balance {formatPrice(balanceDue)} payable at check-in
                </div>
              )}
            </div>

            <div className="flex-1 sm:max-w-[280px]">
              {user ? (
                <button
                  type="submit"
                  form="booking-form"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#1E3A2B] to-[#3B5E43] hover:from-[#162C20] hover:to-[#2F4D36] text-white font-black text-xs sm:text-sm shadow-md shadow-[#1E3A2B]/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {loading ? (
                    <span>Submitting Reservation...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#E2AE55] shrink-0" />
                      <span className="truncate">
                        Submit & Pay {formatPrice(depositAmount)}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="w-full py-3 px-4 rounded-xl bg-[#212529] hover:bg-[#16191D] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="truncate">Sign In to Reserve</span>
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
