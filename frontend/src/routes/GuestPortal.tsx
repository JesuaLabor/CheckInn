import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Booking, GuestRequest } from '../types';
import { useAuthStore } from '../stores/authStore';
import { QRCodeModal } from '../components/QRCodeModal';
import {
  CalendarCheck,
  Clock,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Building,
  Calendar,
  Sparkles,
  MessageSquarePlus,
  RefreshCw,
  BellRing,
  XCircle,
  MapPin,
  ChevronRight,
  Bed,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';

export const GuestPortal: React.FC = () => {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingForQR, setSelectedBookingForQR] = useState<Booking | null>(null);

  // Cancellation state
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // In-Stay Service Request state
  const [serviceModalBooking, setServiceModalBooking] = useState<Booking | null>(null);
  const [requestType, setRequestType] = useState('towels');
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingService, setSubmittingService] = useState(false);
  const [serviceSuccessMsg, setServiceSuccessMsg] = useState('');

  // Ticking state for countdowns
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetchMyBookings();
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchMyBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/my/');
      setBookings(res.data.results || res.data || []);
    } catch {
      console.error('Failed to load guest bookings');
    } finally {
      setLoading(false);
    }
  };

  const calculateRemainingHold = (expiresAtStr?: string | null) => {
    if (!expiresAtStr) return null;
    const expiresAt = new Date(expiresAtStr).getTime();
    const diff = expiresAt - now;
    if (diff <= 0) return 'Hold Expired';

    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceModalBooking) return;
    setSubmittingService(true);
    try {
      await api.post('/service-requests/', {
        booking: serviceModalBooking.id,
        request_type: requestType,
        message: requestMessage,
      });
      setServiceSuccessMsg('Service request successfully sent to the front desk!');
      setRequestMessage('');
      setTimeout(() => {
        setServiceModalBooking(null);
        setServiceSuccessMsg('');
        fetchMyBookings();
      }, 1500);
    } catch {
      alert('Failed to submit service request.');
    } finally {
      setSubmittingService(false);
    }
  };

  const getStatusBadge = (b: Booking) => {
    switch (b.status) {
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#D49B41]/15 text-[#8F611A] border border-[#D49B41]/35">
            <span className="w-2 h-2 rounded-full bg-[#D49B41] animate-ping"></span>
            Awaiting Staff Review
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#3B5E43]/15 text-[#1E3A2B] border border-[#3B5E43]/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#3B5E43]" />
            Approved • Ready for QR Check-In
          </span>
        );
      case 'checked_in':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1E3A2B]/10 text-[#1E3A2B] border border-[#1E3A2B]/20">
            <Building className="w-3.5 h-3.5 text-[#1E3A2B]" />
            Checked In • Active Stay
          </span>
        );
      case 'checked_out':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-slate-700 border border-[#E8E2D8]">
            Completed Stay
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-900 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Declined
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Cancelled (Deposit Forfeited)
          </span>
        );
      case 'no_show':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
            No-Show (Deposit Forfeited)
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-slate-500 border border-[#E8E2D8]">
            Hold Expired
          </span>
        );
      default:
        return <span className="text-xs px-2.5 py-1 rounded bg-[#FAF8F5] border border-[#E8E2D8] font-bold">{b.status_display}</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-28 md:pb-20 space-y-6">
      
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E8E2D8] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[#1E3A2B] text-xs font-extrabold uppercase tracking-wider mb-1">
            <CalendarCheck className="w-4 h-4 text-[#3B5E43]" />
            <span>Digital Guest Pass & Reservations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#212529] tracking-tight">
            My Stay Itinerary
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Hello, <span className="font-bold text-[#212529]">{user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}</span> • Track approval status, retrieve QR passes, and request amenities.
          </p>
        </div>

        <button
          onClick={fetchMyBookings}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-[#FAF8F5] border border-[#E8E2D8] hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Bookings Itinerary List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-56 bg-white rounded-3xl border border-[#E8E2D8] p-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/3 mb-4 animate-shimmer"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E8E2D8] p-8 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF8F5] text-[#1E3A2B] border border-[#E8E2D8] flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8 text-[#1E3A2B]" />
          </div>
          <h3 className="text-lg font-extrabold text-[#212529]">No Reservations Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            You don't have any bookings in your itinerary yet. Explore our verified lodgings to create a reservation with guaranteed room inventory.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => {

            return (
              <div
                key={booking.id}
                className="bg-white rounded-3xl border border-[#E8E2D8] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* Boarding Pass Header */}
                <div className="bg-[#FAF8F5] px-6 py-4 border-b border-[#E8E2D8]/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-[#E8E2D8] text-[#212529] font-extrabold shadow-2xs">
                      {booking.booking_reference}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-medium">Source: {booking.source_display}</span>
                  </div>

                  <div>{getStatusBadge(booking)}</div>
                </div>

                {/* Main Pass Body */}
                <div className="p-6 sm:p-7 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Hotel & Room Details */}
                    <div className="md:col-span-2 space-y-2">
                      <h3 className="text-xl font-black text-[#212529] leading-tight">
                        {booking.hotel_name}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-xs font-bold text-[#1E3A2B] flex-wrap">
                        <Bed className="w-4 h-4 text-[#3B5E43]" />
                        <span>{booking.room_type_name}</span>
                        {booking.stay_type === 'hourly' && (
                          <span className="bg-[#D49B41]/15 text-[#8F611A] px-2 py-0.5 rounded-md text-[10px] font-black border border-[#D49B41]/30 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#D49B41]" />
                            <span>{booking.duration_hours}h Short-Stay</span>
                          </span>
                        )}
                        {booking.room_number && (
                          <span className="bg-[#3B5E43]/15 text-[#1E3A2B] px-2 py-0.5 rounded-md text-[11px] font-extrabold border border-[#3B5E43]/30">
                            Room {booking.room_number}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-[#3B5E43] shrink-0" />
                        <span>{booking.hotel_address}</span>
                      </div>

                      {/* Date & Guest Info Grid */}
                      <div className="pt-3 grid grid-cols-3 gap-2 p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D8] text-center">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Check-in</span>
                          <span className="text-xs font-black text-[#212529]">
                            {booking.stay_type === 'hourly' && booking.check_in_datetime
                              ? new Date(booking.check_in_datetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                              : booking.check_in}
                          </span>
                          {booking.stay_type === 'hourly' && (
                            <span className="text-[9px] text-slate-400 block font-medium">{booking.check_in}</span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Check-out</span>
                          <span className="text-xs font-black text-[#212529]">
                            {booking.stay_type === 'hourly' && booking.check_out_datetime
                              ? new Date(booking.check_out_datetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                              : booking.check_out}
                          </span>
                          {booking.stay_type === 'hourly' && (
                            <span className="text-[9px] text-slate-400 block font-medium">{booking.check_out}</span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Guests</span>
                          <span className="text-xs font-black text-[#212529]">{booking.guest_count}</span>
                          {booking.stay_type === 'hourly' && (
                            <span className="text-[9px] text-[#8F611A] block font-bold">{booking.duration_hours}h slot</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price and Action Section */}
                    <div className="md:text-right flex flex-col justify-between md:items-end space-y-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          Total Stay Amount
                        </span>
                        <div className="text-2xl font-black text-[#1E3A2B]">
                          ₱{Number(booking.total_amount).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-600 font-bold mt-0.5">
                          Deposit Paid: <span className="text-emerald-700">₱{Number(booking.deposit_amount || Number(booking.total_amount) * 0.5).toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            ({booking.deposit_type === 'full' ? 'Full' : '50%'})
                          </span>
                        </div>
                        {Number(booking.balance_due) > 0 && (
                          <div className="text-xs text-[#8F611A] font-bold">
                            Balance at Check-in: ₱{Number(booking.balance_due).toLocaleString()}
                          </div>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1 md:justify-end">
                          <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold">
                            Non-Refundable Policy
                          </span>
                          {booking.payment?.reference_number && (
                            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                              Ref: #{booking.payment.reference_number}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status-specific action buttons */}
                      <div className="w-full sm:w-auto space-y-2">
                        {booking.status === 'pending_approval' && (
                          <div className="bg-emerald-50/90 p-3.5 rounded-2xl border border-emerald-200 text-left md:text-right space-y-1">
                            <div className="text-xs text-emerald-900 font-extrabold flex items-center md:justify-end gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-700" />
                              <span>Reservation Deposit Submitted</span>
                            </div>
                            <p className="text-[11px] text-emerald-800 leading-tight">
                              Deposit of ₱{Number(booking.deposit_amount || Number(booking.total_amount) * 0.5).toLocaleString()} recorded. Your room is reserved while staff verifies your payment.
                            </p>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:justify-end">
                          {(booking.status === 'confirmed' || booking.status === 'checked_in') && (
                            <button
                              onClick={() => setSelectedBookingForQR(booking)}
                              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1E3A2B] hover:bg-[#3B5E43] text-white font-extrabold text-xs shadow-md shadow-[#1E3A2B]/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <QrCode className="w-4 h-4 text-[#D49B41]" />
                              <span>Digital QR Pass</span>
                            </button>
                          )}

                          {(booking.status === 'confirmed' || booking.status === 'pending_approval') && (
                            <button
                              onClick={() => setCancellingBooking(booking)}
                              className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center"
                              title="Cancel this reservation (deposit is non-refundable)"
                            >
                              Cancel Booking
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* In-Stay Service Request Banner if Checked-In */}
                  {booking.status === 'checked_in' && (
                    <div className="pt-4 border-t border-[#E8E2D8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E2D8]">
                      <div className="flex items-center gap-2.5 text-xs text-[#1E3A2B] font-semibold">
                        <BellRing className="w-4 h-4 text-[#3B5E43] shrink-0" />
                        <span>Need extra towels, housekeeping, or room refreshments?</span>
                      </div>
                      <button
                        onClick={() => setServiceModalBooking(booking)}
                        className="px-3.5 py-2 rounded-xl bg-[#3B5E43] hover:bg-[#2F4D36] text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        <span>Request Service</span>
                      </button>
                    </div>
                  )}

                  {/* Existing Service Requests List */}
                  {booking.service_requests && booking.service_requests.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                      <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                        Recent In-Stay Service Requests
                      </span>
                      {booking.service_requests.map((sr) => (
                        <div key={sr.id} className="text-xs flex items-center justify-between text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                          <span>
                            • <span className="font-bold text-slate-800">{sr.request_type_display}:</span> "{sr.message}"
                          </span>
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                            sr.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {sr.status_display}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Pass Viewer Modal */}
      <QRCodeModal
        booking={selectedBookingForQR}
        isOpen={Boolean(selectedBookingForQR)}
        onClose={() => setSelectedBookingForQR(null)}
      />

      {/* Guest Service Request Modal */}
      {serviceModalBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#212529]/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-md w-full max-h-[92vh] overflow-y-auto border border-[#E8E2D8] p-6 sm:p-7 space-y-4 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 pb-safe">
            <div>
              <span className="text-[10px] font-bold text-[#1E3A2B] uppercase tracking-wider">
                Direct to Front Desk
              </span>
              <h3 className="text-lg font-black text-[#212529]">Request Guest Service</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Room {serviceModalBooking.room_number || 'Assigned'} • {serviceModalBooking.hotel_name}
              </p>
            </div>

            {serviceSuccessMsg ? (
              <div className="p-4 bg-[#3B5E43]/15 border border-[#3B5E43]/30 text-[#1E3A2B] text-xs font-bold rounded-2xl text-center space-y-1">
                <Check className="w-5 h-5 text-[#3B5E43] mx-auto" />
                <p>{serviceSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleServiceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Service Category</label>
                  <select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-bold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5] cursor-pointer"
                  >
                    <option value="towels">Extra Towels & Linens</option>
                    <option value="housekeeping">Room Housekeeping / Cleaning</option>
                    <option value="late_checkout">Late Checkout Request</option>
                    <option value="room_service">Room Refreshments / Bottled Water</option>
                    <option value="maintenance">Maintenance Assistance</option>
                    <option value="other">Other Special Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Note for Front Desk</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Please send 2 fresh bath towels and bottled water."
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setServiceModalBooking(null)}
                    className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingService}
                    className="flex-1 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-[#1E3A2B] to-[#3B5E43] hover:from-[#162C20] hover:to-[#2F4D36] rounded-xl shadow-md active:scale-95 transition-all"
                  >
                    {submittingService ? 'Sending...' : 'Send to Front Desk'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Guest Cancellation Confirmation Modal */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212529]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-extrabold text-[#212529]">Cancel Reservation</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 space-y-2 text-xs">
              <div className="font-bold text-rose-950 flex items-center gap-1.5">
                <span>Non-Refundable Deposit Forfeiture Notice</span>
              </div>
              <p className="text-rose-900 leading-relaxed font-medium">
                As agreed during booking, your reservation deposit of{' '}
                <strong className="font-black text-rose-950">
                  ₱{Number(cancellingBooking.deposit_amount || Number(cancellingBooking.total_amount) * 0.5).toLocaleString()}
                </strong>{' '}
                is <span className="font-black underline">strictly non-refundable</span> and will be forfeited to the hotel.
              </p>
              <div className="text-slate-600 text-[11px] pt-1 border-t border-rose-200/60">
                <span>Property: </span>
                <strong className="text-slate-800">{cancellingBooking.hotel_name}</strong> ({cancellingBooking.room_type_name})
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setCancelLoading(true);
                try {
                  const res = await api.post(`/bookings/${cancellingBooking.id}/cancel/`, {
                    reason: cancelReason || 'Personal cancellation by guest.',
                  });
                  alert(res.data.message || 'Reservation cancelled.');
                  setCancellingBooking(null);
                  setCancelReason('');
                  fetchMyBookings();
                } catch (err: any) {
                  alert(err.response?.data?.detail || 'Failed to cancel reservation.');
                } finally {
                  setCancelLoading(false);
                }
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for cancellation <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule change, unexpected emergency"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none bg-[#FAF8F5]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingBooking(null)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                >
                  Keep Reservation
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
                >
                  {cancelLoading ? 'Cancelling...' : 'Confirm & Forfeit Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
