import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Booking, Room, GuestRequest } from '../types';
import { useAuthStore } from '../stores/authStore';
import { WalkInModal } from '../components/WalkInModal';
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
  UserPlus,
  Bed,
  RefreshCw,
  Search,
  BellRing,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  LogOut,
  Calendar,
  Check,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const StaffDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'rooms' | 'checkin' | 'requests' | 'reports'>('pending');

  const [pendingRequests, setPendingRequests] = useState<Booking[]>([]);
  const [roomBoard, setRoomBoard] = useState<{ rooms: Room[]; summary: any } | null>(null);
  const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);
  const [occupancyReport, setOccupancyReport] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Modals & form states
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [verifyingQr, setVerifyingQr] = useState(false);

  // Selected room assignments for approval: { [bookingId]: roomId }
  const [selectedRoomsForApproval, setSelectedRoomsForApproval] = useState<Record<number, number>>({});

  // Rejection modal
  const [rejectingBookingId, setRejectingBookingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('No rooms available for requested dates.');

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setActionError('');
    try {
      const [pendingRes, roomsRes, reqRes, reportRes] = await Promise.allSettled([
        api.get('/staff/requests/pending/'),
        api.get('/staff/rooms/status/'),
        api.get('/service-requests/'),
        api.get('/admin/reports/occupancy/'),
      ]);

      if (pendingRes.status === 'fulfilled') {
        setPendingRequests(pendingRes.value.data.requests || []);
      }
      if (roomsRes.status === 'fulfilled') {
        setRoomBoard(roomsRes.value.data);
      }
      if (reqRes.status === 'fulfilled') {
        setGuestRequests(reqRes.value.data.results || reqRes.value.data || []);
      }
      if (reportRes.status === 'fulfilled') {
        setOccupancyReport(reportRes.value.data);
      }
    } catch {
      setActionError('Failed to load front desk data.');
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

  const handleApprove = async (bookingId: number) => {
    setActionError('');
    setActionSuccess('');
    try {
      const assignedRoomId = selectedRoomsForApproval[bookingId];
      const res = await api.post(`/staff/requests/${bookingId}/approve/`, {
        room_id: assignedRoomId || undefined,
      });
      setActionSuccess(res.data.message || 'Booking approved and QR check-in token generated!');
      fetchDashboardData();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Approval failed.');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBookingId) return;
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.post(`/staff/requests/${rejectingBookingId}/reject/`, {
        reason: rejectionReason,
      });
      setActionSuccess(res.data.message || 'Booking rejected. Soft hold released.');
      setRejectingBookingId(null);
      fetchDashboardData();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Rejection failed.');
    }
  };

  const handleQRCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput) return;
    setVerifyingQr(true);
    setActionError('');
    setActionSuccess('');

    try {
      const allRes = await api.get('/staff/bookings/');
      const allBookings: Booking[] = allRes.data.results || allRes.data || [];
      const match = allBookings.find(
        (b) => b.booking_reference === qrInput.trim() || b.qr_token === qrInput.trim()
      );

      if (!match) {
        setActionError(`No reservation found matching reference "${qrInput}".`);
        return;
      }

      if (match.status !== 'confirmed') {
        setActionError(`Booking ${match.booking_reference} is ${match.status_display}. Only confirmed bookings can be checked in.`);
        return;
      }

      const res = await api.post(`/bookings/${match.id}/checkin/`, {
        qr_token: match.qr_token,
      });

      setActionSuccess(res.data.message || `Guest ${match.guest_name} checked in successfully!`);
      setQrInput('');
      fetchDashboardData();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Check-in validation failed.');
    } finally {
      setVerifyingQr(false);
    }
  };

  const handleCheckOut = async (bookingId: number) => {
    if (!window.confirm('Confirm checkout for this guest? Room will be flagged for cleaning.')) return;
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.post(`/bookings/${bookingId}/checkout/`);
      setActionSuccess(res.data.message || 'Guest checked out successfully.');
      fetchDashboardData();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Checkout failed.');
    }
  };

  const handleToggleRoomStatus = async (roomId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'cleaning' ? 'available' : 'cleaning';
    try {
      await api.patch('/staff/rooms/status/', {
        room_id: roomId,
        status: nextStatus,
      });
      fetchDashboardData();
    } catch {
      setActionError('Failed to update room housekeeping status.');
    }
  };

  const handleServiceRequestStatus = async (reqId: number, newStatus: string) => {
    try {
      await api.patch(`/service-requests/${reqId}/`, { status: newStatus });
      fetchDashboardData();
    } catch {
      setActionError('Failed to update request status.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-28 md:pb-20 space-y-6">
      
      {/* Top Front Desk Operations Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              {user?.hotel_name || 'Malaybalay Lodging'}
            </span>
            <span className="text-xs font-bold text-slate-500 capitalize px-2 py-0.5 rounded-md bg-slate-100">
              {user?.role} Portal
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Front Desk Operations Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage incoming booking requests, soft holds, room statuses, walk-in arrivals, and QR check-in passes.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsWalkInOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Direct Walk-in Check-in</span>
          </button>

          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-700 hover:text-emerald-950 font-black">
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-rose-700 hover:text-rose-950 font-black">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs Pill Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
            activeTab === 'pending'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Requests</span>
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('checkin')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
            activeTab === 'checkin'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>QR Arrival Check-in</span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
            activeTab === 'rooms'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          <Bed className="w-4 h-4" />
          <span>Room Board</span>
          {roomBoard && (
            <span className="text-[10px] text-slate-400 font-normal">
              ({roomBoard.summary?.occupied}/{roomBoard.summary?.total})
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
            activeTab === 'requests'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>Guest Requests</span>
          {guestRequests.filter((r) => r.status === 'pending').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-400 text-slate-950 font-black">
              {guestRequests.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
            activeTab === 'reports'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Occupancy Reports</span>
        </button>
      </div>

      {/* Tab 1: Pending Requests Queue */}
      {activeTab === 'pending' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">
              Incoming Marketplace Requests
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Automated 45-min soft hold protection active
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">All Requests Cleared</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                There are no pending booking requests awaiting review right now. New requests will appear here with live countdowns.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingRequests.map((b) => {
                const holdCountdown = calculateRemainingHold(b.hold_expires_at);

                const matchingRooms = (roomBoard?.rooms || []).filter(
                  (r) => r.room_type === b.room_type && r.status === 'available'
                );

                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-3xl border border-amber-200/90 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200">
                          {b.booking_reference}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full bg-amber-500/15 text-amber-900 border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                          <span>Soft Hold Active: {holdCountdown}</span>
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-slate-900">{b.guest_name}</h3>
                      <p className="text-xs font-bold text-emerald-800">
                        {b.room_type_name} • {b.guest_count} {b.guest_count === 1 ? 'Guest' : 'Guests'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                        <span>Check-in: <strong className="text-slate-900">{b.check_in}</strong></span>
                        <span>Check-out: <strong className="text-slate-900">{b.check_out}</strong></span>
                        <span>Total: <strong className="text-emerald-700">₱{Number(b.total_amount).toLocaleString()}</strong></span>
                        <span>Contact: <strong className="text-slate-900">{b.guest_phone || b.guest_email}</strong></span>
                      </div>

                      {b.special_requests && (
                        <div className="mt-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                          <span className="font-bold text-slate-900">Guest Note:</span> "{b.special_requests}"
                        </div>
                      )}
                    </div>

                    {/* Room Assignment & Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                      <div>
                        <select
                          value={selectedRoomsForApproval[b.id] || ''}
                          onChange={(e) =>
                            setSelectedRoomsForApproval({
                              ...selectedRoomsForApproval,
                              [b.id]: Number(e.target.value),
                            })
                          }
                          className="w-full sm:w-48 px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 cursor-pointer"
                        >
                          <option value="">Auto-Assign Room</option>
                          {matchingRooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              Room {r.room_number} ({r.floor})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(b.id)}
                          className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Issue QR</span>
                        </button>

                        <button
                          onClick={() => setRejectingBookingId(b.id)}
                          className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 active:scale-95 transition-all"
                          title="Decline request & release soft hold"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Tab 2: QR & Arrival Check-in */}
      {activeTab === 'checkin' && (
        <section className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm max-w-xl space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                Front Desk QR Check-in Terminal
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan guest QR pass or enter signed booking reference (e.g. CHK-XXXXXX) to complete instant check-in.
              </p>
            </div>

            <form onSubmit={handleQRCheckIn} className="space-y-4">
              <div className="relative">
                <QrCode className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Scan or paste reference / token..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  className="w-full pl-11 pr-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={verifyingQr}
                  className="flex-1 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{verifyingQr ? 'Validating Token...' : 'Verify Pass & Check In'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQrInput('CHK-DEMO-CONFIRMED')}
                  className="px-3.5 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-95 transition-all"
                >
                  Demo Ref
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* Tab 3: Room Status Board */}
      {activeTab === 'rooms' && (
        <section className="space-y-5">
          {/* Summary Metric Ribbon */}
          {roomBoard && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Rooms</span>
                <span className="text-lg font-black text-slate-900">{roomBoard.summary?.total}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600 block">Available</span>
                <span className="text-lg font-black text-emerald-700">{roomBoard.summary?.available}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-600 block">Occupied</span>
                <span className="text-lg font-black text-blue-700">{roomBoard.summary?.occupied}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-600 block">Cleaning</span>
                <span className="text-lg font-black text-amber-700">{roomBoard.summary?.cleaning}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Occupancy Rate</span>
                <span className="text-lg font-black text-slate-900">{roomBoard.summary?.occupancy_rate}%</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Physical Room Status & Housekeeping Board
              </h2>
              <p className="text-xs text-slate-500">
                Click room cards to toggle housekeeping cleaning state or review in-stay guests.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(roomBoard?.rooms || []).map((r) => {
              const isOccupied = r.status === 'occupied';
              const isAvailable = r.status === 'available';
              const isCleaning = r.status === 'cleaning';

              return (
                <div
                  key={r.id}
                  className={`rounded-2xl p-4 border transition-all ${
                    isOccupied
                      ? 'bg-blue-50/60 border-blue-200 shadow-2xs'
                      : isAvailable
                      ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs'
                      : 'bg-amber-50/60 border-amber-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-black text-slate-900">
                      Room {r.room_number}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full ${
                        isOccupied
                          ? 'bg-blue-600 text-white'
                          : isAvailable
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800">{r.room_type_name}</p>
                  <p className="text-[11px] text-slate-500">{r.floor}</p>

                  {r.occupant ? (
                    <div className="mt-3 pt-2.5 border-t border-blue-200/70 text-xs space-y-1">
                      <div className="font-extrabold text-slate-900">{r.occupant.guest_name}</div>
                      <div className="text-[11px] text-slate-600 font-medium">{r.occupant.guest_phone || 'No phone'}</div>
                      <div className="text-[10px] text-blue-900 font-bold">
                        Checkout: {r.occupant.check_out}
                      </div>

                      <button
                        onClick={() => handleCheckOut(r.occupant!.booking_id)}
                        className="mt-2.5 w-full py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-[11px] font-bold transition-all active:scale-95 flex items-center justify-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Check Out Guest</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/70">
                      <button
                        onClick={() => handleToggleRoomStatus(r.id, r.status)}
                        className="w-full py-1.5 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-white border border-slate-200/90 transition-all active:scale-95 shadow-2xs"
                      >
                        {isCleaning ? 'Mark Clean & Available' : 'Mark for Cleaning'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tab 4: In-House Guest Requests */}
      {activeTab === 'requests' && (
        <section className="space-y-4">
          <h2 className="text-base font-extrabold text-slate-900">
            Guest In-Stay Service Requests
          </h2>

          {guestRequests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Pending Requests</h3>
              <p className="text-xs text-slate-500">In-house guests currently have no pending service requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {guestRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-900 font-black text-xs">
                        Room {req.room_number || 'N/A'}
                      </span>
                      <span className="font-extrabold text-xs text-emerald-800">{req.request_type_display}</span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">"{req.message}"</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === 'pending' && (
                      <button
                        onClick={() => handleServiceRequestStatus(req.id, 'in_progress')}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold hover:bg-amber-100 active:scale-95 transition-all"
                      >
                        In Progress
                      </button>
                    )}
                    {req.status !== 'resolved' && (
                      <button
                        onClick={() => handleServiceRequestStatus(req.id, 'resolved')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                    )}
                    {req.status === 'resolved' && (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 5: Occupancy Reports */}
      {activeTab === 'reports' && (
        <section className="space-y-6">
          <h2 className="text-base font-extrabold text-slate-900">
            Property Performance & Analytics
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Booked Stay Revenue</span>
              <div className="text-3xl font-black text-emerald-700">
                ₱{Number(occupancyReport?.total_revenue || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">From confirmed & checked-in marketplace stays</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Stays Handled</span>
              <div className="text-3xl font-black text-slate-900">
                {occupancyReport?.stats?.total_bookings || 0}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {occupancyReport?.stats?.confirmed_bookings || 0} Confirmed • {occupancyReport?.stats?.rejected_bookings || 0} Declined
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Occupancy Rate</span>
              <div className="text-3xl font-black text-blue-700">
                {occupancyReport?.occupancy_rate || 0}%
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {occupancyReport?.occupied_rooms || 0} of {occupancyReport?.total_rooms || 0} physical rooms currently occupied
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Rejection Reason Modal */}
      {rejectingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-extrabold text-slate-900">Decline Reservation Request</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              The 45-minute soft hold will be immediately released, freeing room availability on the marketplace.
            </p>

            <form onSubmit={handleReject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Guest</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none bg-slate-50"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingBookingId(null)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md active:scale-95 transition-all"
                >
                  Confirm Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Walk-in Modal */}
      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        onSuccess={(ref) => {
          setActionSuccess(`Walk-in guest registered with reference ${ref}!`);
          fetchDashboardData();
        }}
      />
    </div>
  );
};
