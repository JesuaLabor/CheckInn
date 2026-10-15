import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { toast } from '../stores/toastStore';
import { Room } from '../types';
import { X, UserPlus, Check, Building2, CreditCard, Banknote, Calendar, Users, Sparkles } from 'lucide-react';

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bookingRef: string) => void;
}

export const WalkInModal: React.FC<WalkInModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    room_id: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_count: 1,
    check_in: today,
    check_out: tomorrow,
    special_requests: '',
    payment_method: 'cash',
    payment_status: 'paid',
  });

  useEffect(() => {
    if (isOpen) {
      fetchAvailableRooms();
    }
  }, [isOpen]);

  const fetchAvailableRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await api.get('/staff/rooms/status/');
      const availableOnly = (res.data.rooms || []).filter((r: Room) => r.status === 'available');
      setRooms(availableOnly);
      if (availableOnly.length > 0) {
        setFormData((prev) => ({ ...prev, room_id: String(availableOnly[0].id) }));
      }
    } catch {
      toast.error('Failed to load available rooms.');
    } finally {
      setLoadingRooms(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        room_id: Number(formData.room_id),
      };
      const res = await api.post('/bookings/walkin/', payload);
      toast.success('Walk-in guest registered successfully!');
      onSuccess(res.data.booking.booking_reference);
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      let msg = 'Failed to process walk-in registration.';
      if (typeof data === 'object') {
        const first = Object.values(data)[0];
        msg = Array.isArray(first) ? first[0] : String(first);
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-[#212529]/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 my-0 sm:my-8 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 pb-safe">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-[#212529] via-[#1E3A2B] to-[#3B5E43] text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D49B41]/20 text-[#D49B41] text-[10px] font-bold border border-[#D49B41]/30 mb-2">
            <Building2 className="w-3 h-3" />
            <span>Front Desk Direct Check-In</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white">Manual Walk-in Registration</h3>
          <p className="text-xs text-white/80 mt-0.5 font-medium">
            Immediate check-in for arriving walk-in guests • Skips marketplace approval
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-4 overflow-y-auto flex-1">
          {/* Room Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Available Room</label>
            {loadingRooms ? (
              <div className="text-xs text-slate-400 py-2">Loading available rooms...</div>
            ) : rooms.length === 0 ? (
              <div className="p-3 bg-[#FAF8F5] text-amber-800 text-xs font-bold rounded-xl border border-amber-200">
                No rooms currently marked "Available". Check Room Status Board.
              </div>
            ) : (
              <select
                required
                value={formData.room_id}
                onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E3A2B] outline-none bg-[#FAF8F5] cursor-pointer"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} — {r.room_type_name} ({r.floor}){r.base_rate ? ` • ₱${Number(r.base_rate).toLocaleString()}/night` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Guest Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Guest Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Roberto Santos"
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E3A2B] outline-none bg-[#FAF8F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                required
                placeholder="0917 123 4567"
                value={formData.guest_phone}
                onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E3A2B] outline-none bg-[#FAF8F5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Guest Email <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="email"
              placeholder="guest@example.com"
              value={formData.guest_email}
              onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E3A2B] outline-none bg-[#FAF8F5]"
            />
          </div>

          {/* Stay Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Check-in</label>
              <input
                type="date"
                required
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E3A2B] outline-none bg-[#FAF8F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Check-out</label>
              <input
                type="date"
                required
                min={formData.check_in}
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E3A2B] outline-none bg-[#FAF8F5]"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method & Status</label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`p-2.5 rounded-xl border text-center text-xs cursor-pointer font-bold transition-all ${
                  formData.payment_method === 'cash'
                    ? 'border-[#1E3A2B] bg-[#1E3A2B]/10 text-[#1E3A2B] shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-[#FAF8F5]'
                }`}
              >
                <input
                  type="radio"
                  name="walkinPay"
                  checked={formData.payment_method === 'cash'}
                  onChange={() => setFormData({ ...formData, payment_method: 'cash' })}
                  className="hidden"
                />
                Cash
              </label>

              <label
                className={`p-2.5 rounded-xl border text-center text-xs cursor-pointer font-bold transition-all ${
                  formData.payment_method === 'gcash'
                    ? 'border-[#1E3A2B] bg-[#1E3A2B]/10 text-[#1E3A2B] shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-[#FAF8F5]'
                }`}
              >
                <input
                  type="radio"
                  name="walkinPay"
                  checked={formData.payment_method === 'gcash'}
                  onChange={() => setFormData({ ...formData, payment_method: 'gcash' })}
                  className="hidden"
                />
                GCash
              </label>

              <label
                className={`p-2.5 rounded-xl border text-center text-xs cursor-pointer font-bold transition-all ${
                  formData.payment_method === 'card'
                    ? 'border-[#1E3A2B] bg-[#1E3A2B]/10 text-[#1E3A2B] shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-[#FAF8F5]'
                }`}
              >
                <input
                  type="radio"
                  name="walkinPay"
                  checked={formData.payment_method === 'card'}
                  onChange={() => setFormData({ ...formData, payment_method: 'card' })}
                  className="hidden"
                />
                Card
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || rooms.length === 0}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#1E3A2B] to-[#3B5E43] hover:from-[#162B20] hover:to-[#2F4C35] text-white font-black text-xs sm:text-sm shadow-md shadow-[#1E3A2B]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-[#D49B41]" />
              <span>{submitting ? 'Registering Guest...' : 'Complete Walk-in Check-in'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
