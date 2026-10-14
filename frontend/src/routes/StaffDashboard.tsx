import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
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
  Users,
  Layers,
  Settings,
  Plus,
  Trash2,
  DollarSign,
  FileText,
  CreditCard,
  Copy,
  Building,
} from 'lucide-react';
import { Booking, Room, GuestRequest, Hotel, StaffMember, RoomType } from '../types';

export const StaffDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const isHotelAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  const [activeTab, setActiveTab] = useState<
    'pending' | 'rooms' | 'checkin' | 'requests' | 'reports' | 'staff_manage' | 'inventory_manage' | 'hotel_settings'
  >('pending');

  const [pendingRequests, setPendingRequests] = useState<Booking[]>([]);
  const [roomBoard, setRoomBoard] = useState<{ rooms: Room[]; summary: any } | null>(null);
  const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);
  const [occupancyReport, setOccupancyReport] = useState<any>(null);

  // Hotel Owner SaaS state
  const [hotelProfile, setHotelProfile] = useState<Hotel | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

  // Owner Modals
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
  });

  const [isAddRoomTypeOpen, setIsAddRoomTypeOpen] = useState(false);
  const [newRoomTypeData, setNewRoomTypeData] = useState({
    name: '',
    base_rate: '',
    capacity: 2,
    amenities: 'Wi-Fi, Air Conditioning, Hot Shower',
    description: '',
  });

  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({
    room_number: '',
    floor: '1st Floor',
    room_type_id: '',
  });

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    tagline: '',
    description: '',
    contact_phone: '',
    contact_email: '',
    payout_method: 'GCash',
    payout_account_name: '',
    payout_account_number: '',
  });

  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Modals & form states
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [verifyingQr, setVerifyingQr] = useState(false);

  // Selected room assignments for approval: { [bookingId]: roomId }
  const [selectedRoomsForApproval, setSelectedRoomsForApproval] = useState<Record<string | number, string | number>>({});

  // Rejection modal
  const [rejectingBookingId, setRejectingBookingId] = useState<number | string | null>(null);
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

      // Load Hotel Owner SaaS Data
      if (isHotelAdmin) {
        const [profileRes, staffRes, rtRes] = await Promise.allSettled([
          api.get('/hotel-manage/profile/'),
          api.get('/hotel-manage/staff/'),
          api.get('/hotel-manage/room-types/'),
        ]);

        if (profileRes.status === 'fulfilled') {
          setHotelProfile(profileRes.value.data);
          setProfileForm({
            tagline: profileRes.value.data.tagline || '',
            description: profileRes.value.data.description || '',
            contact_phone: profileRes.value.data.contact_phone || '',
            contact_email: profileRes.value.data.contact_email || '',
            payout_method: profileRes.value.data.payout_method || 'GCash',
            payout_account_name: profileRes.value.data.payout_account_name || '',
            payout_account_number: profileRes.value.data.payout_account_number || '',
          });
        }
        if (staffRes.status === 'fulfilled') {
          setStaffList(staffRes.value.data || []);
        }
        if (rtRes.status === 'fulfilled') {
          setRoomTypes(rtRes.value.data || []);
        }
      }
    } catch {
      setActionError('Failed to load front desk data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    try {
      await api.post('/hotel-manage/staff/', newStaffData);
      setActionSuccess(`Staff account "${newStaffData.username}" registered successfully!`);
      setIsAddStaffOpen(false);
      setNewStaffData({ username: '', password: '', first_name: '', last_name: '', email: '', phone_number: '' });
      fetchDashboardData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to create staff member.');
    }
  };

  const handleDeleteStaff = async (staffId: number | string) => {
    if (!confirm('Are you sure you want to deactivate this staff account?')) return;
    try {
      await api.delete(`/hotel-manage/staff/${staffId}/`);
      setActionSuccess('Staff member deactivated.');
      fetchDashboardData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to remove staff member.');
    }
  };

  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    try {
      await api.post('/hotel-manage/room-types/', newRoomTypeData);
      setActionSuccess(`Room category "${newRoomTypeData.name}" created!`);
      setIsAddRoomTypeOpen(false);
      setNewRoomTypeData({
        name: '',
        base_rate: '',
        capacity: 2,
        amenities: 'Wi-Fi, Air Conditioning, Hot Shower',
        description: '',
      });
      fetchDashboardData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to create room category.');
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    try {
      await api.post('/hotel-manage/rooms/', newRoomData);
      setActionSuccess(`Room "${newRoomData.room_number}" added to inventory!`);
      setIsAddRoomOpen(false);
      setNewRoomData({ room_number: '', floor: '1st Floor', room_type_id: '' });
      fetchDashboardData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to add physical room.');
    }
  };

  const handleSaveHotelProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setActionError('');
    try {
      await api.patch('/hotel-manage/profile/', profileForm);
      setActionSuccess('Property profile and payout settings updated successfully!');
      fetchDashboardData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setProfileSaving(false);
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

  const handleApprove = async (bookingId: number | string) => {
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

  const handleCheckOut = async (bookingId: number | string) => {
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

  const handleToggleRoomStatus = async (roomId: number | string, currentStatus: string) => {
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

  const handleServiceRequestStatus = async (reqId: number | string, newStatus: string) => {
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
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1E3A2B] bg-[#1E3A2B]/10 px-3 py-1 rounded-full border border-[#1E3A2B]/20">
              <Building2 className="w-3.5 h-3.5 text-[#1E3A2B]" />
              {user?.hotel_name || 'Hotel Front Desk'}
            </span>
            <span className="text-xs font-bold text-slate-500 capitalize px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-slate-200/60">
              {user?.role} Portal
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#212529] tracking-tight">
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
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1E3A2B] to-[#3B5E43] hover:from-[#162B20] hover:to-[#2F4C35] text-white font-extrabold text-xs shadow-md shadow-[#1E3A2B]/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-[#D49B41]" />
            <span>Direct Walk-in Check-in</span>
          </button>

          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl bg-[#FAF8F5] border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#1E3A2B]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Pending Approval Notice Banner */}
      {hotelProfile?.status === 'pending' && (
        <div className="p-5 rounded-3xl bg-[#D49B41]/10 border border-[#D49B41]/30 text-[#212529] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#D49B41]/20 flex items-center justify-center text-[#D49B41] shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#212529]">Property Application Under Review</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D49B41]/20 text-[#212529] border border-[#D49B41]/30 uppercase tracking-wider">
                  Pending Verification
                </span>
              </div>
              <p className="text-xs text-[#212529]/80 mt-1 max-w-2xl leading-relaxed">
                Your hotel profile is currently undergoing review by LocalStay Platform Admin. You can freely set up front desk staff accounts, configure room categories, and adjust nightly rates below. Once verified, your property will automatically become live on the public booking marketplace.
              </p>
            </div>
          </div>
          <div className="text-right text-xs font-bold text-[#212529] shrink-0 bg-white/70 px-3 py-2 rounded-2xl border border-[#D49B41]/30">
            Permit No: {hotelProfile.business_permit_number || 'Under Review'}
          </div>
        </div>
      )}

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-[#3B5E43]/10 border border-[#3B5E43]/30 text-[#1E3A2B] text-xs font-bold flex items-center justify-between shadow-2xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#3B5E43] shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-[#1E3A2B] hover:text-[#212529] font-black">
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
              ? 'bg-[#1E3A2B] text-white shadow-md shadow-[#1E3A2B]/20'
              : 'bg-white text-slate-600 hover:bg-[#FAF8F5] border border-slate-200/80'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Requests</span>
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#D49B41] text-[#212529] font-black">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('checkin')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
            activeTab === 'checkin'
              ? 'bg-[#1E3A2B] text-white shadow-md shadow-[#1E3A2B]/20'
              : 'bg-white text-slate-600 hover:bg-[#FAF8F5] border border-slate-200/80'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>QR Arrival Check-in</span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
            activeTab === 'rooms'
              ? 'bg-[#1E3A2B] text-white shadow-md shadow-[#1E3A2B]/20'
              : 'bg-white text-slate-600 hover:bg-[#FAF8F5] border border-slate-200/80'
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
              ? 'bg-[#1E3A2B] text-white shadow-md shadow-[#1E3A2B]/20'
              : 'bg-white text-slate-600 hover:bg-[#FAF8F5] border border-slate-200/80'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>Guest Requests</span>
          {guestRequests.filter((r) => r.status === 'pending').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#D49B41] text-[#212529] font-black">
              {guestRequests.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
            activeTab === 'reports'
              ? 'bg-[#1E3A2B] text-white shadow-md shadow-[#1E3A2B]/20'
              : 'bg-white text-slate-600 hover:bg-[#FAF8F5] border border-slate-200/80'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Occupancy Reports</span>
        </button>

        {/* Hotel Owner Tabs */}
        {isHotelAdmin && (
          <>
            <div className="h-6 w-px bg-slate-300 mx-1 shrink-0" />

            <button
              onClick={() => setActiveTab('staff_manage')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
                activeTab === 'staff_manage'
                  ? 'bg-[#212529] text-white shadow-md shadow-[#212529]/20'
                  : 'bg-white text-slate-600 hover:bg-[#FAF8F5] border border-slate-200/80'
              }`}
            >
              <Users className="w-4 h-4 text-[#D49B41]" />
              <span>Staff Team</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#FAF8F5] text-[#212529] border border-slate-200 font-black">
                {staffList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('inventory_manage')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
                activeTab === 'inventory_manage'
                  ? 'bg-[#3B5E43] text-white shadow-md shadow-[#3B5E43]/20'
                  : 'bg-white text-slate-600 hover:bg-[#FAF8F5] border border-slate-200/80'
              }`}
            >
              <Layers className="w-4 h-4 text-[#D49B41]" />
              <span>Rooms & Rates</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#FAF8F5] text-[#3B5E43] border border-slate-200 font-black">
                {roomTypes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('hotel_settings')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
                activeTab === 'hotel_settings'
                  ? 'bg-[#212529] text-white shadow-md shadow-[#212529]/20'
                  : 'bg-white text-slate-600 hover:bg-[#FAF8F5] border border-slate-200/80'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Property & Payout</span>
            </button>
          </>
        )}
      </div>

      {/* Tab 1: Pending Requests Queue */}
      {activeTab === 'pending' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#212529]">
              Incoming Marketplace Requests
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Automated 45-min soft hold protection active
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#1E3A2B]/10 text-[#1E3A2B] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-[#212529]">All Requests Cleared</h3>
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
                    className="bg-white rounded-3xl border border-[#D49B41]/40 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-[#FAF8F5] text-[#212529] px-2 py-0.5 rounded-lg border border-slate-200">
                          {b.booking_reference}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full bg-[#D49B41]/15 text-[#212529] border border-[#D49B41]/40">
                          <Clock className="w-3.5 h-3.5 text-[#D49B41] animate-spin" />
                          <span>Soft Hold Active: {holdCountdown}</span>
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-[#212529]">{b.guest_name}</h3>
                      <p className="text-xs font-bold text-[#1E3A2B]">
                        {b.room_type_name} • {b.guest_count} {b.guest_count === 1 ? 'Guest' : 'Guests'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                        <span>Check-in: <strong className="text-[#212529]">{b.check_in}</strong></span>
                        <span>Check-out: <strong className="text-[#212529]">{b.check_out}</strong></span>
                        <span>Total: <strong className="text-[#1E3A2B]">₱{Number(b.total_amount).toLocaleString()}</strong></span>
                        <span>Contact: <strong className="text-[#212529]">{b.guest_phone || b.guest_email}</strong></span>
                      </div>

                      {/* Payment Verification Info */}
                      <div className="pt-2">
                        {b.payment?.method === 'gcash' ? (
                          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-950 text-xs">
                            <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span className="font-bold">GCash / E-Wallet:</span>
                            {b.payment.reference_number ? (
                              <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 font-mono font-black text-emerald-900 shadow-2xs">
                                <span>Ref: #{b.payment.reference_number}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(b.payment?.reference_number || '');
                                    setActionSuccess(`Copied GCash Ref #${b.payment?.reference_number}`);
                                  }}
                                  className="text-emerald-700 hover:text-emerald-950 p-0.5 rounded hover:bg-emerald-100 transition-colors"
                                  title="Copy Reference Number"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-amber-700 font-medium italic">No Ref # Provided</span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              b.payment.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {b.payment.status === 'paid' ? 'Verified / Settled' : 'Verify in GCash SMS/App'}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                            <Building className="w-3.5 h-3.5 text-slate-500" />
                            <span>Payment Option: Pay at Front Desk ({b.payment?.status || 'unpaid'})</span>
                          </div>
                        )}
                      </div>

                      {b.special_requests && (
                        <div className="mt-2 text-xs text-slate-700 bg-[#FAF8F5] p-2.5 rounded-xl border border-slate-200/70">
                          <span className="font-bold text-[#212529]">Guest Note:</span> "{b.special_requests}"
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
                          className="w-full sm:w-48 px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E3A2B] outline-none bg-[#FAF8F5] cursor-pointer"
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
                          className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#1E3A2B] hover:bg-[#3B5E43] text-white font-extrabold text-xs shadow-md shadow-[#1E3A2B]/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#D49B41]" />
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
              <div className="w-10 h-10 rounded-xl bg-[#1E3A2B]/10 text-[#1E3A2B] flex items-center justify-center mb-2">
                <QrCode className="w-5 h-5 text-[#1E3A2B]" />
              </div>
              <h3 className="text-base font-black text-[#212529]">
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
                  className="w-full pl-11 pr-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E3A2B] outline-none bg-[#FAF8F5]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={verifyingQr}
                  className="flex-1 px-5 py-3 rounded-xl bg-[#1E3A2B] hover:bg-[#3B5E43] text-white font-extrabold text-xs shadow-md shadow-[#1E3A2B]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D49B41]" />
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
                <span className="text-lg font-black text-[#212529]">{roomBoard.summary?.total}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#1E3A2B] block">Available</span>
                <span className="text-lg font-black text-[#1E3A2B]">{roomBoard.summary?.available}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#D49B41] block">Occupied</span>
                <span className="text-lg font-black text-[#D49B41]">{roomBoard.summary?.occupied}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#3B5E43] block">Cleaning</span>
                <span className="text-lg font-black text-[#3B5E43]">{roomBoard.summary?.cleaning}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Occupancy Rate</span>
                <span className="text-lg font-black text-[#212529]">{roomBoard.summary?.occupancy_rate}%</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#212529]">
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
                      ? 'bg-[#FAF8F5] border-[#D49B41]/40 shadow-2xs'
                      : isAvailable
                      ? 'bg-white border-[#3B5E43]/30 shadow-2xs'
                      : 'bg-[#FAF8F5] border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-black text-[#212529]">
                      Room {r.room_number}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full ${
                        isOccupied
                          ? 'bg-[#D49B41] text-[#212529]'
                          : isAvailable
                          ? 'bg-[#1E3A2B] text-white'
                          : 'bg-[#3B5E43] text-white'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800">{r.room_type_name}</p>
                  <p className="text-[11px] text-slate-500">{r.floor}</p>

                  {r.occupant ? (
                    <div className="mt-3 pt-2.5 border-t border-[#D49B41]/30 text-xs space-y-1">
                      <div className="font-extrabold text-[#212529]">{r.occupant.guest_name}</div>
                      <div className="text-[11px] text-slate-600 font-medium">{r.occupant.guest_phone || 'No phone'}</div>
                      <div className="text-[10px] text-[#1E3A2B] font-bold">
                        Checkout: {r.occupant.check_out}
                      </div>

                      <button
                        onClick={() => handleCheckOut(r.occupant!.booking_id)}
                        className="mt-2.5 w-full py-1.5 rounded-xl bg-[#212529] hover:bg-[#1E3A2B] text-white text-[11px] font-bold transition-all active:scale-95 flex items-center justify-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Check Out Guest</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/70">
                      <button
                        onClick={() => handleToggleRoomStatus(r.id, r.status)}
                        className="w-full py-1.5 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-[#FAF8F5] border border-slate-200/90 transition-all active:scale-95 shadow-2xs"
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
          <h2 className="text-base font-extrabold text-[#212529]">
            Guest In-Stay Service Requests
          </h2>

          {guestRequests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[#3B5E43] mx-auto" />
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
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#FAF8F5] text-[#212529] font-black text-xs border border-slate-200/60">
                        Room {req.room_number || 'N/A'}
                      </span>
                      <span className="font-extrabold text-xs text-[#1E3A2B]">{req.request_type_display}</span>
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
                        className="px-3.5 py-1.5 rounded-xl bg-[#D49B41]/15 text-[#212529] border border-[#D49B41]/40 text-xs font-bold hover:bg-[#D49B41]/25 active:scale-95 transition-all"
                      >
                        In Progress
                      </button>
                    )}
                    {req.status !== 'resolved' && (
                      <button
                        onClick={() => handleServiceRequestStatus(req.id, 'resolved')}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1E3A2B] text-white text-xs font-bold hover:bg-[#3B5E43] active:scale-95 transition-all flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5 text-[#D49B41]" />
                        <span>Mark Resolved</span>
                      </button>
                    )}
                    {req.status === 'resolved' && (
                      <span className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] text-slate-600 text-xs font-bold border border-slate-200">
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
          <h2 className="text-base font-extrabold text-[#212529]">
            Property Performance & Analytics
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Booked Stay Revenue</span>
              <div className="text-3xl font-black text-[#1E3A2B]">
                ₱{Number(occupancyReport?.total_revenue || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">From confirmed & checked-in marketplace stays</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Stays Handled</span>
              <div className="text-3xl font-black text-[#212529]">
                {occupancyReport?.stats?.total_bookings || 0}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {occupancyReport?.stats?.confirmed_bookings || 0} Confirmed • {occupancyReport?.stats?.rejected_bookings || 0} Declined
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Occupancy Rate</span>
              <div className="text-3xl font-black text-[#D49B41]">
                {occupancyReport?.occupancy_rate || 0}%
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {occupancyReport?.occupied_rooms || 0} of {occupancyReport?.total_rooms || 0} physical rooms currently occupied
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Tab 6: Hotel Owner - Staff Management */}
      {isHotelAdmin && activeTab === 'staff_manage' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-[#212529]">
                Front Desk Staff & Receptionists
              </h2>
              <p className="text-xs text-slate-500">
                Staff accounts can access front desk operations, walk-ins, and guest check-ins for this hotel only.
              </p>
            </div>

            <button
              onClick={() => setIsAddStaffOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3A2B] hover:bg-[#3B5E43] text-white font-extrabold text-xs shadow-md shadow-[#1E3A2B]/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 text-[#D49B41]" />
              <span>Add Front Desk Staff</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs">
            {staffList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>No additional staff accounts created yet.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {staffList.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#FAF8F5] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#1E3A2B]/10 border border-[#1E3A2B]/20 flex items-center justify-center font-bold text-[#1E3A2B] text-xs">
                        {member.first_name ? member.first_name[0] : member.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#212529]">{member.full_name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF8F5] text-slate-600 border border-slate-200 uppercase">
                            {member.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>@{member.username}</span>
                          {member.phone_number && (
                            <>
                              <span>•</span>
                              <span>{member.phone_number}</span>
                            </>
                          )}
                          {member.email && (
                            <>
                              <span>•</span>
                              <span>{member.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {member.id !== user?.id && member.role === 'staff' && (
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Deactivate staff member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tab 7: Hotel Owner - Room Inventory & Rates */}
      {isHotelAdmin && activeTab === 'inventory_manage' && (
        <section className="space-y-8">
          {/* Room Categories */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-[#212529]">
                  Room Categories & Nightly Rates
                </h2>
                <p className="text-xs text-slate-500">
                  Define accommodation tiers, capacity, and rate per night in PHP.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddRoomTypeOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3A2B] hover:bg-[#3B5E43] text-white font-extrabold text-xs shadow-md shadow-[#1E3A2B]/20 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4 text-[#D49B41]" />
                  <span>Add Room Category</span>
                </button>
                <button
                  onClick={() => setIsAddRoomOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#212529] hover:bg-[#1E3A2B] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4 text-[#D49B41]" />
                  <span>Add Physical Room</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roomTypes.map((rt) => (
                <div
                  key={rt.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-[#212529]">{rt.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{rt.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-[#1E3A2B]">₱{Number(rt.base_rate).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 block">/ night</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Up to {rt.capacity} Guests</span>
                    <span>•</span>
                    <span>{rt.rooms?.length || 0} Physical Rooms</span>
                  </div>

                  {rt.amenities && rt.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {rt.amenities.slice(0, 3).map((amenity, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[10px] font-bold text-slate-700 border border-slate-200/60"
                        >
                          {amenity}
                        </span>
                      ))}
                      {rt.amenities.length > 3 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{rt.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Physical Rooms Grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-[#212529]">Physical Rooms On Property</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {(roomBoard?.rooms || []).map((rm) => (
                <div
                  key={rm.id}
                  className={`p-3 rounded-2xl border text-center space-y-1 ${
                    rm.status === 'available'
                      ? 'bg-white border-[#3B5E43]/30 text-[#1E3A2B]'
                      : rm.status === 'occupied'
                      ? 'bg-[#FAF8F5] border-[#D49B41]/40 text-[#212529]'
                      : rm.status === 'cleaning'
                      ? 'bg-[#FAF8F5] border-slate-200 text-[#3B5E43]'
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="text-sm font-black">{rm.room_number}</div>
                  <div className="text-[10px] font-bold text-slate-500 capitalize">{rm.status}</div>
                  <div className="text-[9px] text-slate-400 truncate">{rm.room_type_name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tab 8: Hotel Owner - Property Profile & Payout Settings */}
      {isHotelAdmin && activeTab === 'hotel_settings' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#212529]">
                Property Profile & Payout Settings
              </h2>
              <p className="text-xs text-slate-500">
                Update public listing information and disbursement accounts.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveHotelProfile} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-2xs space-y-5 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Tagline</label>
                <input
                  type="text"
                  value={profileForm.tagline}
                  onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={profileForm.description}
                  onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Front Desk Phone</label>
                <input
                  type="text"
                  value={profileForm.contact_phone}
                  onChange={(e) => setProfileForm({ ...profileForm, contact_phone: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Email</label>
                <input
                  type="email"
                  value={profileForm.contact_email}
                  onChange={(e) => setProfileForm({ ...profileForm, contact_email: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-black text-[#212529] mb-3 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#1E3A2B]" />
                  <span>Disbursement & Payout Account</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Method</label>
                    <select
                      value={profileForm.payout_method}
                      onChange={(e) => setProfileForm({ ...profileForm, payout_method: e.target.value })}
                      className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                    >
                      <option value="GCash">GCash</option>
                      <option value="Maya">Maya</option>
                      <option value="BDO">BDO Unibank</option>
                      <option value="BPI">BPI</option>
                      <option value="LandBank">LandBank</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={profileForm.payout_account_name}
                      onChange={(e) => setProfileForm({ ...profileForm, payout_account_name: e.target.value })}
                      className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={profileForm.payout_account_number}
                      onChange={(e) => setProfileForm({ ...profileForm, payout_account_number: e.target.value })}
                      className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-6 py-2.5 rounded-xl bg-[#1E3A2B] hover:bg-[#3B5E43] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all disabled:opacity-50"
              >
                {profileSaving ? 'Saving Changes...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Rejection Reason Modal */}
      {rejectingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212529]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-extrabold text-[#212529]">Decline Reservation Request</h3>
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
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none bg-[#FAF8F5]"
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

      {/* Add Staff Modal */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212529]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1E3A2B]/10 text-[#1E3A2B] flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#212529]">Add Front Desk Staff</h3>
                <p className="text-xs text-slate-400">Create employee credentials for your hotel.</p>
              </div>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Maria"
                    value={newStaffData.first_name}
                    onChange={(e) => setNewStaffData({ ...newStaffData, first_name: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Santos"
                    value={newStaffData.last_name}
                    onChange={(e) => setNewStaffData({ ...newStaffData, last_name: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. maria_frontdesk"
                  value={newStaffData.username}
                  onChange={(e) => setNewStaffData({ ...newStaffData, username: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newStaffData.password}
                  onChange={(e) => setNewStaffData({ ...newStaffData, password: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="0917 000 0000"
                    value={newStaffData.phone_number}
                    onChange={(e) => setNewStaffData({ ...newStaffData, phone_number: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="staff@hotel.ph"
                    value={newStaffData.email}
                    onChange={(e) => setNewStaffData({ ...newStaffData, email: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-extrabold text-white bg-[#1E3A2B] hover:bg-[#3B5E43] rounded-xl shadow-md active:scale-95 transition-all"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Type Modal */}
      {isAddRoomTypeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212529]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1E3A2B]/10 text-[#1E3A2B] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#212529]">Add Room Category</h3>
                <p className="text-xs text-slate-400">Configure accommodation tier and pricing.</p>
              </div>
            </div>

            <form onSubmit={handleAddRoomType} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deluxe Balcony Suite"
                  value={newRoomTypeData.name}
                  onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, name: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rate (₱ / night) *</label>
                  <input
                    type="number"
                    required
                    placeholder="2500"
                    value={newRoomTypeData.base_rate}
                    onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, base_rate: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Guests *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newRoomTypeData.capacity}
                    onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, capacity: parseInt(e.target.value) || 2 })}
                    className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amenities (comma-separated)</label>
                <input
                  type="text"
                  placeholder="1 Queen Bed, Hot Shower, High-Speed Wi-Fi"
                  value={newRoomTypeData.amenities}
                  onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, amenities: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Cozy room with mountain breeze and private bathroom."
                  value={newRoomTypeData.description}
                  onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, description: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoomTypeOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-extrabold text-white bg-[#1E3A2B] hover:bg-[#3B5E43] rounded-xl shadow-md active:scale-95 transition-all"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212529]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] text-[#212529] border border-slate-200 flex items-center justify-center">
                <Bed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#212529]">Add Physical Room</h3>
                <p className="text-xs text-slate-400">Assign a room number and category.</p>
              </div>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Room Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 105 or Cottage 4"
                  value={newRoomData.room_number}
                  onChange={(e) => setNewRoomData({ ...newRoomData, room_number: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Floor</label>
                <input
                  type="text"
                  placeholder="1st Floor, 2nd Floor, etc."
                  value={newRoomData.floor}
                  onChange={(e) => setNewRoomData({ ...newRoomData, floor: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Room Category *</label>
                <select
                  required
                  value={newRoomData.room_type_id}
                  onChange={(e) => setNewRoomData({ ...newRoomData, room_type_id: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                >
                  <option value="">Select category...</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} (₱{rt.base_rate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoomOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-extrabold text-white bg-[#212529] hover:bg-[#1E3A2B] rounded-xl shadow-md active:scale-95 transition-all"
                >
                  Add Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
