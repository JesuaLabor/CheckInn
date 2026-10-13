import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Hotel, PlatformStats } from '../types';
import {
  ShieldCheck,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  DollarSign,
  Bed,
  CalendarCheck,
  User,
  CreditCard,
  FileText,
  ExternalLink,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

export const PlatformAdmin: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Rejection modal
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectingHotelId, setRejectingHotelId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Business permit verification failed or incomplete lodging photos.');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    setFeedbackMessage(null);
    try {
      const [statsRes, hotelsRes] = await Promise.all([
        api.get('/platform/stats/'),
        api.get(`/platform/hotels/?status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`),
      ]);
      setStats(statsRes.data);
      setHotels(hotelsRes.data || []);
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Failed to load platform data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (hotelId: number, action: 'approve' | 'reject' | 'suspend' | 'reactivate', reason = '') => {
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await api.post(`/platform/hotels/${hotelId}/review/`, {
        action,
        rejection_reason: reason,
      });

      setFeedbackMessage({ type: 'success', text: res.data.message });
      setIsRejectOpen(false);
      setRejectingHotelId(null);
      if (selectedHotel?.id === hotelId) {
        setSelectedHotel(res.data.hotel);
      }
      fetchData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update hotel status.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#212529] text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D49B41]/15 border border-[#D49B41]/30 text-[#D49B41] text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Platform Super Administrator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              LocalStay SaaS Partner Management
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Review property applications, approve verified hotels, and oversee marketplace lodging.
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#D49B41]' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
              feedbackMessage.type === 'success'
                ? 'bg-[#3B5E43]/20 border border-[#3B5E43]/40 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Platform KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Properties</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-white">{stats?.total_hotels ?? '—'}</div>
            <div className="text-[11px] text-emerald-400">
              {stats?.approved_hotels ?? 0} Live on Marketplace
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#D49B41]/10 border border-[#D49B41]/30 space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-[#D49B41] text-xs font-medium">
              <span>Pending Review</span>
              <Clock className="w-4 h-4 text-[#D49B41]" />
            </div>
            <div className="text-2xl font-black text-[#D49B41]">
              {stats?.pending_hotels ?? 0}
            </div>
            <div className="text-[11px] text-[#D49B41]/80">Requires Verification</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Active Rooms</span>
              <Bed className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-white">{stats?.total_rooms ?? '—'}</div>
            <div className="text-[11px] text-slate-400">Total Physical Rooms</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Reservations</span>
              <CalendarCheck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-white">{stats?.total_bookings ?? '—'}</div>
            <div className="text-[11px] text-slate-400">Platform Bookings</div>
          </div>

          <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-[#1E3A2B] to-[#212529] border border-[#3B5E43]/40 space-y-1">
            <div className="flex items-center justify-between text-[#D49B41] text-xs font-medium">
              <span>Commission Est.</span>
              <DollarSign className="w-4 h-4 text-[#D49B41]" />
            </div>
            <div className="text-2xl font-black text-white">
              ₱{(stats?.estimated_commission ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-white/70">10% SaaS Service Rate</div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-[#D49B41] text-[#212529] shadow-md shadow-[#D49B41]/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>Pending Approval</span>
              {(stats?.pending_hotels ?? 0) > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#212529] text-[#D49B41] text-[10px] flex items-center justify-center font-black">
                  {stats?.pending_hotels}
                </span>
              )}
            </button>

            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === 'approved'
                  ? 'bg-[#1E3A2B] text-white shadow-md shadow-[#1E3A2B]/20 border border-[#3B5E43]/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Approved & Live
            </button>

            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === 'rejected'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Rejected
            </button>

            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-white/15 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              All
            </button>
          </div>

          {/* Search Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchData();
            }}
            className="relative"
          >
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search property or permit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#212529] border border-white/15 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D49B41] w-full sm:w-64"
            />
          </form>
        </div>

        {/* Properties Directory */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#D49B41]" />
              <span>Loading applications...</span>
            </div>
          ) : hotels.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white/5 border border-white/10 p-8">
              <CheckCircle2 className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-200">No properties in this category</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {statusFilter === 'pending'
                  ? 'Great job! There are no pending hotel applications waiting for review.'
                  : 'No properties matched your current filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {hotels.map((hotel) => (
                <div
                  key={hotel.id}
                  className="rounded-3xl bg-white/5 border border-white/10 p-5 sm:p-6 hover:border-white/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  {/* Left: Hotel Summary & Thumbnail */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <img
                      src={hotel.image_url}
                      alt={hotel.name}
                      className="w-full sm:w-28 h-24 sm:h-24 rounded-2xl object-cover border border-white/10 shrink-0"
                    />

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white">{hotel.name}</h3>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            hotel.status === 'approved'
                              ? 'bg-[#1E3A2B]/40 text-emerald-300 border border-[#3B5E43]/40'
                              : hotel.status === 'pending'
                              ? 'bg-[#D49B41]/20 text-[#D49B41] border border-[#D49B41]/30 animate-pulse'
                              : hotel.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {hotel.status === 'approved'
                            ? 'Approved / Live'
                            : hotel.status === 'pending'
                            ? 'Pending Review'
                            : hotel.status === 'rejected'
                            ? 'Rejected'
                            : 'Suspended'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{hotel.address}</span>
                      </div>

                      {/* Permit & Owner Credentials */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1 font-mono text-[#D49B41]">
                          <FileText className="w-3 h-3" />
                          Permit: {hotel.business_permit_number || 'Under Review'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          Owner: <strong className="text-white">{hotel.owner_name}</strong> ({hotel.owner_username})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-white/80 font-mono">
                          <CreditCard className="w-3 h-3 text-[#3B5E43]" />
                          {hotel.payout_method}: {hotel.payout_account_number || '—'}
                        </span>
                      </div>

                      {hotel.rejection_reason && (
                        <div className="text-[11px] text-rose-400 bg-rose-500/10 px-3 py-1 rounded-xl mt-1">
                          Rejection Note: {hotel.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10">
                    {hotel.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleReviewAction(hotel.id, 'approve')}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-[#D49B41] hover:bg-[#BF8832] text-[#212529] font-black text-xs shadow-lg shadow-[#D49B41]/20 transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#212529]" />
                          <span>Approve Property</span>
                        </button>

                        <button
                          onClick={() => {
                            setRejectingHotelId(hotel.id);
                            setIsRejectOpen(true);
                          }}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {hotel.status === 'approved' && (
                      <button
                        onClick={() => handleReviewAction(hotel.id, 'suspend')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-colors"
                      >
                        Suspend Listing
                      </button>
                    )}

                    {(hotel.status === 'rejected' || hotel.status === 'suspended') && (
                      <button
                        onClick={() => handleReviewAction(hotel.id, 'reactivate')}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-[#1E3A2B] hover:bg-[#3B5E43] border border-[#3B5E43]/40 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#D49B41]" />
                        <span>Reactivate & Approve</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rejection Modal */}
        {isRejectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212529]/80 backdrop-blur-md">
            <div className="bg-[#212529] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reject Property Application</h3>
                  <p className="text-xs text-slate-400">
                    Provide clear feedback so the hotel owner can reapply.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl p-3 text-xs text-[#212529] focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    rejectingHotelId &&
                    handleReviewAction(rejectingHotelId, 'reject', rejectionReason)
                  }
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-500/20"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
