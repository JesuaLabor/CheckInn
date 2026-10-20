import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { Hotel, PlatformStats, HotelAuditLog } from '../types';
import { toast } from '../stores/toastStore';
import { resolveImageUrl } from '../utils/imageUrl';
import {
  ShieldCheck,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
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
  MapPin,
  Eye,
  Download,
  LayoutGrid,
  List,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  SlidersHorizontal,
  History,
  ShieldAlert,
} from 'lucide-react';

export type PlatformStatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended';
export type PlatformAdminView = 'verifications' | 'audit_trail';

interface PlatformAdminProps {
  initialStatus?: PlatformStatusFilter | 'audit_trail';
  /** Changes on every navbar deep-link so the same shortcut can be re-applied */
  deepLinkNonce?: number;
  onNavigate?: (tab: string, slug?: string) => void;
  onTabChange?: (tab: PlatformStatusFilter | 'audit_trail') => void;
}

export const PlatformAdmin: React.FC<PlatformAdminProps> = ({
  initialStatus,
  deepLinkNonce,
  onNavigate,
  onTabChange,
}) => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminView, setAdminView] = useState<PlatformAdminView>(
    initialStatus === 'audit_trail' ? 'audit_trail' : 'verifications'
  );
  const [statusFilter, setStatusFilter] = useState<PlatformStatusFilter>(
    initialStatus && initialStatus !== 'audit_trail' ? initialStatus : 'pending'
  );

  useEffect(() => {
    if (adminView === 'audit_trail') {
      onTabChange?.('audit_trail');
    } else {
      onTabChange?.(statusFilter);
    }
  }, [adminView, statusFilter, onTabChange]);

  // Apply navbar deep-links during render so repeated shortcut clicks re-apply the filter
  const [appliedDeepLink, setAppliedDeepLink] = useState(deepLinkNonce);
  if (deepLinkNonce !== appliedDeepLink) {
    setAppliedDeepLink(deepLinkNonce);
    if (initialStatus) {
      if (initialStatus === 'audit_trail') {
        setAdminView('audit_trail');
      } else {
        setAdminView('verifications');
        setStatusFilter(initialStatus);
      }
    }
  }

  // Global Platform Audit Trail State
  const [globalLogs, setGlobalLogs] = useState<HotelAuditLog[]>([]);
  const [globalLogsLoading, setGlobalLogsLoading] = useState(false);
  const [globalHotelFilter, setGlobalHotelFilter] = useState<string>('all');
  const [globalCategoryFilter, setGlobalCategoryFilter] = useState<string>('all');
  const [globalSeverityFilter, setGlobalSeverityFilter] = useState<string>('all');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [globalExpandedLogId, setGlobalExpandedLogId] = useState<number | string | null>(null);

  const fetchGlobalAuditLogs = async (
    hotelId = globalHotelFilter,
    cat = globalCategoryFilter,
    sev = globalSeverityFilter,
    search = globalSearch
  ) => {
    setGlobalLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (hotelId !== 'all') params.append('hotel_id', hotelId);
      if (cat !== 'all') params.append('category', cat);
      if (sev !== 'all') params.append('severity', sev);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/hotel-manage/audit-logs/?${params.toString()}`);
      setGlobalLogs(res.data || []);
    } catch (err: any) {
      console.error('Failed to load platform audit logs:', err);
    } finally {
      setGlobalLogsLoading(false);
    }
  };

  const handleExportGlobalAuditCSV = () => {
    if (!globalLogs.length) {
      toast.error('No audit logs available to export.', 'Export Failed');
      return;
    }
    const headers = ['Timestamp', 'Property Name', 'Category', 'Action', 'Severity', 'Actor', 'Role', 'Summary', 'IP Address', 'Details'];
    const rows = globalLogs.map((log) => [
      `"${new Date(log.created_at).toLocaleString()}"`,
      `"${(log.hotel_name || 'N/A').replace(/"/g, '""')}"`,
      `"${log.category}"`,
      `"${log.action}"`,
      `"${log.severity}"`,
      `"${(log.actor_name || 'System').replace(/"/g, '""')}"`,
      `"${log.actor_role || 'system'}"`,
      `"${(log.summary || '').replace(/"/g, '""')}"`,
      `"${log.ip_address || 'N/A'}"`,
      `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `localstay_platform_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Platform audit trail exported to CSV.', 'Export Complete');
  };

  useEffect(() => {
    if (adminView === 'audit_trail') {
      fetchGlobalAuditLogs(globalHotelFilter, globalCategoryFilter, globalSeverityFilter, globalSearch);
    }
  }, [adminView, globalHotelFilter, globalCategoryFilter, globalSeverityFilter, globalSearch]);

  // Interactive controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'rooms' | 'bookings'>('newest');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  // Modal & Drawer states
  const [inspectingHotel, setInspectingHotel] = useState<Hotel | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Rejection modal
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectingHotelId, setRejectingHotelId] = useState<number | string | null>(null);
  const [rejectionReason, setRejectionReason] = useState(
    'Business permit verification failed or incomplete lodging photos.'
  );

  // Superadmin Hotel Audit Log Inspection
  const [dossierLogs, setDossierLogs] = useState<HotelAuditLog[]>([]);
  const [dossierLogsLoading, setDossierLogsLoading] = useState(false);

  useEffect(() => {
    if (inspectingHotel) {
      setDossierLogsLoading(true);
      api
        .get(`/hotel-manage/audit-logs/?hotel_id=${inspectingHotel.id}`)
        .then((res) => setDossierLogs(res.data || []))
        .catch(() => setDossierLogs([]))
        .finally(() => setDossierLogsLoading(false));
    } else {
      setDossierLogs([]);
    }
  }, [inspectingHotel]);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    setFeedbackMessage(null);
    try {
      const [statsRes, hotelsRes] = await Promise.all([
        api.get('/platform/stats/'),
        api.get(
          `/platform/hotels/?status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`
        ),
      ]);
      setStats(statsRes.data);
      setHotels(hotelsRes.data || []);
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Failed to load platform data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (
    hotelId: number | string,
    action: 'approve' | 'reject' | 'suspend' | 'reactivate',
    reason = ''
  ) => {
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
      if (inspectingHotel?.id === hotelId) {
        setInspectingHotel(res.data.hotel);
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

  // Extract unique cities from data for quick dropdown filtering
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    hotels.forEach((h) => {
      if (h.city) set.add(h.city);
    });
    return Array.from(set).sort();
  }, [hotels]);

  // Client-side filtering & sorting for instantaneous UI responsiveness
  const filteredHotels = useMemo(() => {
    return hotels
      .filter((h) => {
        if (
          selectedCategory !== 'all' &&
          h.category?.toLowerCase() !== selectedCategory.toLowerCase()
        ) {
          return false;
        }
        if (selectedCity !== 'all' && h.city?.toLowerCase() !== selectedCity.toLowerCase()) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = h.name.toLowerCase().includes(q);
          const matchCity = h.city?.toLowerCase().includes(q);
          const matchPermit = h.business_permit_number?.toLowerCase().includes(q);
          const matchOwner =
            h.owner_name?.toLowerCase().includes(q) ||
            h.owner_username?.toLowerCase().includes(q);
          const matchEmail = h.owner_email?.toLowerCase().includes(q);
          if (!matchName && !matchCity && !matchPermit && !matchOwner && !matchEmail) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'rooms') return (b.total_rooms || 0) - (a.total_rooms || 0);
        if (sortBy === 'bookings') return (b.total_bookings || 0) - (a.total_bookings || 0);
        return Number(b.id) - Number(a.id);
      });
  }, [hotels, selectedCategory, selectedCity, searchQuery, sortBy]);

  // Export filtered lodgings to CSV
  const handleExportCSV = () => {
    if (!filteredHotels.length) return;
    const headers = [
      'ID',
      'Name',
      'Status',
      'Category',
      'City',
      'Province',
      'Owner Name',
      'Owner Username',
      'Owner Email',
      'Owner Phone',
      'Business Permit',
      'BIR TIN',
      'Rooms',
      'Bookings',
      'Payout Method',
      'Account Number',
    ];

    const rows = filteredHotels.map((h) => [
      h.id,
      `"${(h.name || '').replace(/"/g, '""')}"`,
      h.status || 'unknown',
      h.category || '',
      `"${(h.city || '').replace(/"/g, '""')}"`,
      `"${(h.province || '').replace(/"/g, '""')}"`,
      `"${(h.owner_name || '').replace(/"/g, '""')}"`,
      h.owner_username || '',
      h.owner_email || '',
      h.owner_phone || h.contact_phone || '',
      h.business_permit_number || '',
      h.bir_tin || '',
      h.total_rooms || 0,
      h.total_bookings || 0,
      h.payout_method || '',
      h.payout_account_number || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `localstay_lodgings_${statusFilter}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[calc(env(safe-area-inset-top,0px)+5.5rem)] sm:pt-28 pb-28 md:pb-20 space-y-6 text-[#212529]">
      {/* Executive Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E8E2D8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1E3A2B] bg-[#1E3A2B]/10 px-3 py-1 rounded-full border border-[#1E3A2B]/20">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1E3A2B]" />
              <span>Platform Partner Governance</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Operations</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#212529] tracking-tight">
            Root Administration & Verifications
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Verify lodging partner applications, audit business credentials, and oversee marketplace inventory across all registered Philippine destinations.
          </p>
        </div>

        {/* Header Action Toolbar */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportCSV}
            disabled={filteredHotels.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4EFEA] border border-[#E8E2D8] text-xs font-bold text-[#212529] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            title="Export filtered lodgings to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#D49B41]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3A2B] hover:bg-[#162B20] text-white text-xs font-extrabold transition-all active:scale-95 shadow-md shadow-[#1E3A2B]/20"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-white' : 'text-[#D49B41]'}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Primary Administration View Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-[#FAF8F5] border border-[#E8E2D8] rounded-2xl w-fit">
        <button
          onClick={() => setAdminView('verifications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            adminView === 'verifications'
              ? 'bg-[#1E3A2B] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#212529] hover:bg-white/60'
          }`}
        >
          <ShieldCheck
            className={`w-4 h-4 ${
              adminView === 'verifications' ? 'text-[#D49B41]' : 'text-slate-400'
            }`}
          />
          <span>Lodgings & Verifications</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              adminView === 'verifications' ? 'bg-white/20 text-white' : 'bg-[#E8E2D8] text-slate-700'
            }`}
          >
            {hotels.length}
          </span>
        </button>

        <button
          onClick={() => setAdminView('audit_trail')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            adminView === 'audit_trail'
              ? 'bg-[#1E3A2B] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#212529] hover:bg-white/60'
          }`}
        >
          <History
            className={`w-4 h-4 ${
              adminView === 'audit_trail' ? 'text-[#D49B41]' : 'text-[#D49B41]'
            }`}
          />
          <span>Platform Audit Trail</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              adminView === 'audit_trail' ? 'bg-white/20 text-white' : 'bg-[#E8E2D8] text-slate-700'
            }`}
          >
            {globalLogs.length}
          </span>
        </button>
      </div>

      {adminView === 'verifications' && (
        <div className="space-y-6">
          {/* Feedback Alert Toast */}
          {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 shadow-xs ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interactive KPI Command Center (Cards double as interactive quick filters) */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-0.5">
          <span>Platform Overview Metrics</span>
          <span className="text-[11px] text-slate-400 font-normal">Click card to filter lodgings</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: Total Properties */}
          <div
            onClick={() => {
              setStatusFilter('all');
              setSelectedCategory('all');
              setSelectedCity('all');
            }}
            className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer group select-none ${
              statusFilter === 'all'
                ? 'bg-white border-[#D49B41] shadow-md ring-2 ring-[#D49B41]/25'
                : 'bg-white hover:bg-[#FAF8F5]/60 border-[#E8E2D8] shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Properties</span>
              <Building2 className="w-4 h-4 text-slate-400 group-hover:text-[#1E3A2B] transition-colors" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#212529] mt-1">
              {stats?.total_hotels ?? hotels.length}
            </div>
            <div className="text-[11px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{stats?.approved_hotels ?? 0} Live on Marketplace</span>
            </div>
          </div>

          {/* Card 2: Pending Review (Hero Highlight) */}
          <div
            onClick={() => {
              setStatusFilter('pending');
              setSelectedCategory('all');
              setSelectedCity('all');
            }}
            className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer group select-none relative overflow-hidden ${
              statusFilter === 'pending'
                ? 'bg-amber-50/70 border-[#D49B41] shadow-md ring-2 ring-[#D49B41]/35'
                : (stats?.pending_hotels ?? 0) > 0
                ? 'bg-amber-50/40 border-[#D49B41]/40 hover:border-[#D49B41] shadow-xs'
                : 'bg-white hover:bg-[#FAF8F5]/60 border-[#E8E2D8] shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[#8F611A]">
              <span>Pending Review</span>
              <Clock className="w-4 h-4 text-[#D49B41] group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#8F611A] mt-1">
              {stats?.pending_hotels ?? 0}
            </div>
            <div className="text-[11px] font-bold mt-1">
              {(stats?.pending_hotels ?? 0) > 0 ? (
                <span className="text-[#8F611A] flex items-center gap-1 animate-pulse font-extrabold">
                  <span>⚡ Requires Verification</span>
                </span>
              ) : (
                <span className="text-emerald-700 flex items-center gap-1 font-bold">
                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                  <span>Inbox Zero • All Caught Up</span>
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Active Rooms */}
          <div
            onClick={() => setStatusFilter('approved')}
            className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer group select-none ${
              statusFilter === 'approved'
                ? 'bg-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20'
                : 'bg-white hover:bg-[#FAF8F5]/60 border-[#E8E2D8] shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Active Rooms</span>
              <Bed className="w-4 h-4 text-slate-400 group-hover:text-[#1E3A2B] transition-colors" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#212529] mt-1">
              {stats?.total_rooms ?? '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Total Physical Lodging Units
            </div>
          </div>

          {/* Card 4: Platform Reservations */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#E8E2D8] space-y-1 select-none shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Reservations</span>
              <CalendarCheck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#212529] mt-1">
              {stats?.total_bookings ?? '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              {stats?.confirmed_bookings ?? 0} Confirmed Stays
            </div>
          </div>

          {/* Card 5: Commission Revenue Est. */}
          <div className="col-span-2 lg:col-span-1 p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#1E3A2B] to-[#2B523D] text-white border border-[#1E3A2B] shadow-sm space-y-1 select-none">
            <div className="flex items-center justify-between text-amber-200 text-xs font-semibold">
              <span>Commission Est.</span>
              <DollarSign className="w-4 h-4 text-[#D49B41]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              ₱{(stats?.estimated_commission ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-100/90 mt-1 font-medium">
              10% of ₱{(stats?.total_gmv ?? 0).toLocaleString()} GMV
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E2D8] space-y-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Status Segmented Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-[#D49B41] text-white font-extrabold shadow-sm'
                  : 'text-slate-600 hover:text-[#212529] hover:bg-[#FAF8F5]'
              }`}
            >
              <span>Pending Approval</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === 'pending'
                    ? 'bg-black/20 text-white'
                    : 'bg-amber-100 text-[#8F611A]'
                }`}
              >
                {stats?.pending_hotels ?? 0}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'approved'
                  ? 'bg-[#1E3A2B] text-white font-extrabold shadow-sm'
                  : 'text-slate-600 hover:text-[#212529] hover:bg-[#FAF8F5]'
              }`}
            >
              <span>Approved & Live</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === 'approved'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {stats?.approved_hotels ?? 0}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'rejected'
                  ? 'bg-rose-600 text-white font-extrabold shadow-sm'
                  : 'text-slate-600 hover:text-[#212529] hover:bg-[#FAF8F5]'
              }`}
            >
              <span>Rejected</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === 'rejected'
                    ? 'bg-white/20 text-white'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {stats?.rejected_hotels ?? 0}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'suspended'
                  ? 'bg-slate-700 text-white font-extrabold shadow-sm'
                  : 'text-slate-600 hover:text-[#212529] hover:bg-[#FAF8F5]'
              }`}
            >
              <span>Suspended</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === 'suspended'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {stats?.suspended_hotels ?? 0}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-[#212529] text-white font-extrabold shadow-sm'
                  : 'text-slate-600 hover:text-[#212529] hover:bg-[#FAF8F5]'
              }`}
            >
              <span>All</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {stats?.total_hotels ?? hotels.length}
              </span>
            </button>
          </div>

          {/* Right: View Mode Toggle & Clear Button */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            {(selectedCategory !== 'all' || selectedCity !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedCity('all');
                  setSearchQuery('');
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-[#212529] hover:bg-[#FAF8F5] transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}

            {/* View Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D8]">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#212529] shadow-2xs border border-[#E8E2D8]'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-[#212529] shadow-2xs border border-[#E8E2D8]'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Dense Data Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Line: Live Search, City Dropdown, Category Dropdown, Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 border-t border-[#E8E2D8]">
          {/* Live Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, permit, owner, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl pl-9 pr-8 py-2 text-xs text-[#212529] placeholder-slate-400 focus:outline-none focus:border-[#D49B41] focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* City Dropdown */}
          <div className="relative">
            <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full appearance-none bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl pl-9 pr-8 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#D49B41] focus:bg-white cursor-pointer"
            >
              <option value="all">All Destinations ({hotels.length})</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <SlidersHorizontal className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl pl-9 pr-8 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#D49B41] focus:bg-white cursor-pointer"
            >
              <option value="all">All Stay Types</option>
              <option value="boutique">Boutique Stay</option>
              <option value="beach">Beach & Coastal</option>
              <option value="mountain">Highland & Mountain</option>
              <option value="heritage">Heritage & Villa</option>
              <option value="resort">Resort & Spa</option>
              <option value="eco">Eco Retreat</option>
              <option value="city">Urban Hotel</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort Order */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full appearance-none bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#D49B41] focus:bg-white cursor-pointer"
            >
              <option value="newest">Sort: Newest Applications</option>
              <option value="name">Sort: Name (A to Z)</option>
              <option value="rooms">Sort: Room Capacity (High-Low)</option>
              <option value="bookings">Sort: Total Bookings (High-Low)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Directory Content Area */}
      <div>
        {loading ? (
          <div className="py-24 text-center rounded-3xl bg-white border border-[#E8E2D8] p-8 shadow-xs">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#1E3A2B]" />
            <h3 className="text-sm font-bold text-[#212529]">Querying Platform Database...</h3>
            <p className="text-xs text-slate-500 mt-1">Fetching property verification dossiers.</p>
          </div>
        ) : filteredHotels.length === 0 ? (
          /* Empty States */
          statusFilter === 'pending' ? (
            /* Executive Inbox Zero Delight */
            <div className="py-20 text-center rounded-3xl bg-gradient-to-b from-white to-[#FAF8F5] border border-[#E8E2D8] p-8 space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-lg font-black text-[#212529]">All Caught Up • Inbox Zero</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  There are currently no partner onboarding applications pending verification. Every submitted lodging application has been reviewed.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setStatusFilter('approved')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E3A2B] hover:bg-[#162B20] text-white text-xs font-black shadow-md shadow-[#1E3A2B]/20 transition-all active:scale-95"
                >
                  <span>Browse {stats?.approved_hotels ?? 12} Active Marketplace Stays</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Filter empty state */
            <div className="py-20 text-center rounded-3xl bg-white border border-[#E8E2D8] p-8 space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D8] flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#212529]">No properties matched your criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try adjusting your search terms, changing the status tab, or clearing city/category filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedCity('all');
                }}
                className="px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F4EFEA] border border-[#E8E2D8] text-xs font-bold text-[#212529] transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )
        ) : viewMode === 'table' ? (
          /* DENSE DATA TABLE VIEW */
          <div className="bg-white rounded-3xl border border-[#E8E2D8] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] text-slate-500 uppercase font-black tracking-wider text-[10px] border-b border-[#E8E2D8]">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Property</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Host Credentials</th>
                    <th className="py-3.5 px-4">Permit & Tax</th>
                    <th className="py-3.5 px-4">Rooms</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D8]/70">
                  {filteredHotels.map((hotel) => (
                    <tr
                      key={hotel.id}
                      className="hover:bg-[#FAF8F5]/80 transition-colors group cursor-pointer"
                      onClick={() => setInspectingHotel(hotel)}
                    >
                      {/* Property Column */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveImageUrl(hotel.image_url)}
                            alt={hotel.name}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80';
                            }}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#E8E2D8]"
                          />
                          <div className="min-w-0">
                            <p className="font-extrabold text-[#212529] text-xs truncate group-hover:text-[#1E3A2B] transition-colors">
                              {hotel.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-bold text-slate-400">
                                {hotel.category || 'Boutique'}
                              </span>
                              {hotel.rating && (
                                <span className="text-[10px] text-[#D49B41] font-bold">
                                  ★ {Number(hotel.rating).toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px] font-medium text-[#212529]">
                            {hotel.city || 'Philippines'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                          {hotel.province || ''}
                        </span>
                      </td>

                      {/* Host Credentials */}
                      <td className="py-3.5 px-4">
                        <div className="text-[#212529] font-bold truncate max-w-[140px]">
                          {hotel.owner_name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                          {hotel.owner_email || `@${hotel.owner_username}`}
                        </div>
                      </td>

                      {/* Compliance (Permit & TIN) */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-[#8F611A] border border-[#D49B41]/30 font-mono text-[10px] font-bold">
                          {hotel.business_permit_number || 'No Permit'}
                        </span>
                        {hotel.bir_tin && (
                          <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                            TIN: {hotel.bir_tin}
                          </span>
                        )}
                      </td>

                      {/* Rooms */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[#212529] font-extrabold text-xs">
                          <Bed className="w-3.5 h-3.5 text-slate-400" />
                          <span>{hotel.total_rooms || 0}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            hotel.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : hotel.status === 'pending'
                              ? 'bg-amber-50 text-[#8F611A] border border-[#D49B41]/40 animate-pulse'
                              : hotel.status === 'rejected'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              hotel.status === 'approved'
                                ? 'bg-emerald-500'
                                : hotel.status === 'pending'
                                ? 'bg-[#D49B41]'
                                : hotel.status === 'rejected'
                                ? 'bg-rose-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span>{hotel.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInspectingHotel(hotel)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4EFEA] border border-[#E8E2D8] text-[#212529] hover:text-[#1E3A2B] font-bold text-[11px] transition-colors flex items-center gap-1"
                            title="Inspect Full Verification Dossier"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#D49B41]" />
                            <span>Inspect</span>
                          </button>

                          {hotel.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleReviewAction(hotel.id, 'approve')}
                                disabled={actionLoading}
                                className="p-1.5 rounded-xl bg-[#1E3A2B] hover:bg-[#162B20] text-white font-black transition-all active:scale-95 shadow-2xs"
                                title="Approve Property"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingHotelId(hotel.id);
                                  setIsRejectOpen(true);
                                }}
                                disabled={actionLoading}
                                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                                title="Reject Application"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {hotel.status === 'approved' && (
                            <button
                              onClick={() => handleReviewAction(hotel.id, 'suspend')}
                              disabled={actionLoading}
                              className="px-2 py-1 rounded-lg bg-[#FAF8F5] hover:bg-rose-50 border border-[#E8E2D8] text-slate-600 hover:text-rose-700 text-[10px] font-bold transition-colors"
                            >
                              Suspend
                            </button>
                          )}

                          {(hotel.status === 'rejected' || hotel.status === 'suspended') && (
                            <button
                              onClick={() => handleReviewAction(hotel.id, 'reactivate')}
                              disabled={actionLoading}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold transition-colors"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* VISUAL CARD GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredHotels.map((hotel) => (
              <div
                key={hotel.id}
                onClick={() => setInspectingHotel(hotel)}
                className="rounded-3xl bg-white border border-[#E8E2D8] hover:border-[#D49B41]/60 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between group cursor-pointer"
              >
                {/* Photo Header */}
                <div>
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={resolveImageUrl(hotel.image_url)}
                      alt={hotel.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

                    {/* Top Badges */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                        {hotel.category || 'Boutique Stay'}
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${
                          hotel.status === 'approved'
                            ? 'bg-emerald-600 text-white'
                            : hotel.status === 'pending'
                            ? 'bg-[#D49B41] text-white font-black'
                            : hotel.status === 'rejected'
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        {hotel.status}
                      </span>
                    </div>

                    {/* Bottom Image Info */}
                    <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-white text-xs">
                      <span className="flex items-center gap-1 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-[#D49B41]" />
                        <span className="truncate max-w-[180px]">
                          {hotel.city || 'Philippines'}
                        </span>
                      </span>

                      <span className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[10px] font-bold">
                        {hotel.total_rooms || 0} rooms
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-black text-base text-[#212529] group-hover:text-[#1E3A2B] transition-colors truncate">
                        {hotel.name}
                      </h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{hotel.address}</p>
                    </div>

                    {/* Legal Credentials Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-[#8F611A] border border-[#D49B41]/30 font-bold">
                        Permit: {hotel.business_permit_number || 'Pending'}
                      </span>
                      {hotel.bir_tin && (
                        <span className="px-2 py-0.5 rounded-lg bg-[#FAF8F5] text-slate-500 border border-[#E8E2D8]">
                          TIN: {hotel.bir_tin}
                        </span>
                      )}
                    </div>

                    {/* Owner Info */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[#E8E2D8] text-xs text-slate-500">
                      <div className="w-6 h-6 rounded-full bg-[#1E3A2B]/10 text-[#1E3A2B] text-[10px] font-black flex items-center justify-center uppercase shrink-0">
                        {hotel.owner_name?.charAt(0) || 'H'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#212529] truncate">
                          {hotel.owner_name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {hotel.owner_email || `@${hotel.owner_username}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div
                  className="p-3 bg-[#FAF8F5] border-t border-[#E8E2D8] flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setInspectingHotel(hotel)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4EFEA] border border-[#E8E2D8] text-[#212529] font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#D49B41]" />
                    <span>Inspect Dossier</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {hotel.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleReviewAction(hotel.id, 'approve')}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-xl bg-[#1E3A2B] hover:bg-[#162B20] text-white font-black text-xs shadow-xs transition-all active:scale-95"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectingHotelId(hotel.id);
                            setIsRejectOpen(true);
                          }}
                          disabled={actionLoading}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {hotel.status === 'approved' && (
                      <button
                        onClick={() => handleReviewAction(hotel.id, 'suspend')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-[#E8E2D8] text-slate-600 hover:text-rose-700 text-xs font-bold transition-colors"
                      >
                        Suspend
                      </button>
                    )}

                    {(hotel.status === 'rejected' || hotel.status === 'suspended') && (
                      <button
                        onClick={() => handleReviewAction(hotel.id, 'reactivate')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-colors"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )}

      {/* Primary Administration View 2: Platform Audit Trail */}
      {adminView === 'audit_trail' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E8E2D8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-[#1E3A2B]/10 text-[#1E3A2B] flex items-center justify-center">
                  <History className="w-4 h-4 text-[#D49B41]" />
                </div>
                <h2 className="text-xl font-black text-[#212529]">
                  Platform Audit Trail & Security Oversight
                </h2>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl">
                Real-time governance timeline recording operational decisions, room inventory changes, staff management, and disbursement payout updates across all partner hotels.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={handleExportGlobalAuditCSV}
                disabled={globalLogs.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4EFEA] border border-[#E8E2D8] text-xs font-bold text-[#212529] transition-all active:scale-95 disabled:opacity-50 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[#D49B41]" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => fetchGlobalAuditLogs()}
                disabled={globalLogsLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3A2B] hover:bg-[#162B20] text-white text-xs font-extrabold transition-all active:scale-95 shadow-md shadow-[#1E3A2B]/20"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${globalLogsLoading ? 'animate-spin text-white' : 'text-[#D49B41]'}`}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#E8E2D8] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Total Platform Events
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-[#212529]">
                  {globalLogs.length}
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] text-slate-600 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E8E2D8] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider block">
                Critical Security Events
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-rose-600">
                  {globalLogs.filter((l) => l.severity === 'critical').length}
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E8E2D8] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider block">
                Operational Warnings
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-amber-600">
                  {globalLogs.filter((l) => l.severity === 'warning').length}
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E8E2D8] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">
                Logged Today
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-emerald-700">
                  {
                    globalLogs.filter(
                      (l) => new Date(l.created_at).toDateString() === new Date().toDateString()
                    ).length
                  }
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Filter Toolbar */}
          <div className="bg-white rounded-3xl border border-[#E8E2D8] p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Live Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search logs by keyword, hotel name, action, or IP..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl pl-9 pr-9 py-2 text-xs text-[#212529] font-medium focus:outline-none focus:border-[#1E3A2B]"
                />
                {globalSearch && (
                  <button
                    onClick={() => setGlobalSearch('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Property Selector */}
              <div className="sm:w-56">
                <select
                  value={globalHotelFilter}
                  onChange={(e) => setGlobalHotelFilter(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs text-[#212529] font-bold focus:outline-none focus:border-[#1E3A2B]"
                >
                  <option value="all">All Registered Hotels ({hotels.length})</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity Selector */}
              <div className="sm:w-40">
                <select
                  value={globalSeverityFilter}
                  onChange={(e) => setGlobalSeverityFilter(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs text-[#212529] font-bold focus:outline-none focus:border-[#1E3A2B]"
                >
                  <option value="all">All Severities</option>
                  <option value="info">Info / Normal</option>
                  <option value="warning">Warnings</option>
                  <option value="critical">Critical Security</option>
                </select>
              </div>
            </div>

            {/* Category Segmented Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0">Category:</span>
              {[
                { id: 'all', label: 'All Events' },
                { id: 'booking', label: 'Bookings & Front Desk' },
                { id: 'inventory', label: 'Rooms & Rates' },
                { id: 'housekeeping', label: 'Housekeeping' },
                { id: 'staff', label: 'Staff Team' },
                { id: 'settings', label: 'Settings & Payout' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setGlobalCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 text-xs ${
                    globalCategoryFilter === cat.id
                      ? 'bg-[#1E3A2B] text-white shadow-xs'
                      : 'bg-[#FAF8F5] text-slate-600 hover:bg-[#F4EFEA] border border-[#E8E2D8]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Feed */}
          <div className="space-y-3">
            {globalLogsLoading && globalLogs.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#E8E2D8] space-y-3">
                <RefreshCw className="w-6 h-6 text-[#1E3A2B] animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">Loading platform audit logs...</p>
              </div>
            ) : globalLogs.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#E8E2D8] space-y-2">
                <History className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-[#212529]">No audit events found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No activity log entries match your selected criteria.
                </p>
                {(globalHotelFilter !== 'all' || globalCategoryFilter !== 'all' || globalSeverityFilter !== 'all' || globalSearch) && (
                  <button
                    onClick={() => {
                      setGlobalHotelFilter('all');
                      setGlobalCategoryFilter('all');
                      setGlobalSeverityFilter('all');
                      setGlobalSearch('');
                    }}
                    className="mt-2 text-xs font-bold text-[#1E3A2B] underline"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              globalLogs.map((log) => {
                const isExpanded = globalExpandedLogId === log.id;
                const hasDetails = log.details && Object.keys(log.details).length > 0;
                const logDate = new Date(log.created_at);
                const timeAgo = (() => {
                  const diff = Date.now() - logDate.getTime();
                  if (diff < 60000) return 'Just now';
                  const mins = Math.floor(diff / 60000);
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  const days = Math.floor(hrs / 24);
                  return `${days}d ago`;
                })();

                const severityStyles = {
                  critical: 'bg-rose-50 text-rose-700 border-rose-200',
                  warning: 'bg-amber-50 text-amber-700 border-amber-200',
                  info: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                }[log.severity] || 'bg-slate-50 text-slate-700 border-slate-200';

                return (
                  <div
                    key={log.id}
                    className="bg-white rounded-2xl border border-[#E8E2D8] hover:border-slate-300 shadow-2xs transition-all overflow-hidden"
                  >
                    <div className="p-4 sm:p-5 flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-[#E8E2D8] flex items-center justify-center shrink-0 mt-0.5">
                        <History className="w-4 h-4 text-[#D49B41]" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Property Name Badge */}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#1E3A2B]/10 text-[#1E3A2B] border border-[#1E3A2B]/20">
                            {log.hotel_name || 'System'}
                          </span>

                          {/* Severity Pill */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${severityStyles}`}>
                            {log.severity}
                          </span>

                          {/* Category Tag */}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-slate-600 border border-[#E8E2D8] capitalize">
                            {log.category}
                          </span>

                          {/* Action Code */}
                          <span className="text-[11px] font-mono font-medium text-slate-400">
                            {log.action}
                          </span>

                          <span className="text-slate-300 text-xs ml-auto hidden sm:inline">•</span>

                          {/* Timestamp */}
                          <span className="text-xs text-slate-400 ml-auto sm:ml-0 font-medium" title={logDate.toLocaleString()}>
                            {timeAgo}
                          </span>
                        </div>

                        {/* Summary */}
                        <p className="text-xs sm:text-sm font-bold text-[#212529] leading-snug">
                          {log.summary}
                        </p>

                        {/* Actor & Metadata Footer */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                          <span className="font-semibold text-slate-700">
                            Actor: <span className="text-[#1E3A2B] font-bold">{log.actor_name || 'System'}</span>
                          </span>

                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-bold uppercase">
                            {log.actor_role || 'system'}
                          </span>

                          {log.ip_address && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-[10px] text-slate-400">
                                IP: {log.ip_address}
                              </span>
                            </>
                          )}

                          <span className="text-slate-300">•</span>
                          <span className="text-slate-400 text-[10px]">
                            {logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {hasDetails && (
                        <button
                          type="button"
                          onClick={() => setGlobalExpandedLogId(isExpanded ? null : log.id)}
                          className={`p-1.5 rounded-xl border transition-all text-xs shrink-0 flex items-center gap-1 ${
                            isExpanded
                              ? 'bg-[#FAF8F5] text-[#1E3A2B] border-slate-300'
                              : 'bg-white text-slate-500 hover:bg-[#FAF8F5] border-[#E8E2D8]'
                          }`}
                          title="Inspect structured parameters"
                        >
                          <span className="text-[11px] font-bold hidden sm:inline">Details</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {isExpanded && hasDetails && (
                      <div className="bg-[#FAF8F5] border-t border-[#E8E2D8] p-4 sm:px-5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                          Structured Event Payload & Changes
                        </span>
                        <div className="bg-white rounded-xl p-3 border border-[#E8E2D8] text-xs font-mono text-slate-800 overflow-x-auto space-y-1">
                          {Object.entries(log.details).map(([key, val]) => (
                            <div key={key} className="flex items-start gap-2">
                              <span className="text-[#1E3A2B] font-bold shrink-0">{key}:</span>
                              <span className="text-slate-700 break-all">
                                {typeof val === 'object' && val !== null
                                  ? JSON.stringify(val)
                                  : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      {inspectingHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setInspectingHotel(null)}
          />

          <div className="bg-white border border-[#E8E2D8] rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col text-[#212529] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            {/* Header Hero Banner */}
            <div className="relative h-48 sm:h-56 w-full bg-slate-900 overflow-hidden shrink-0">
              <img
                src={resolveImageUrl(inspectingHotel.image_url)}
                alt={inspectingHotel.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />

              <button
                onClick={() => setInspectingHotel(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all shadow-md"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-[#D49B41] text-white shadow-md uppercase tracking-wider">
                  {inspectingHotel.category || 'Boutique Stay'}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    inspectingHotel.status === 'approved'
                      ? 'bg-emerald-600 text-white'
                      : inspectingHotel.status === 'pending'
                      ? 'bg-[#D49B41] text-white font-black'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {inspectingHotel.status}
                </span>
              </div>

              <div className="absolute bottom-3 inset-x-4">
                <h2 className="text-xl sm:text-2xl font-black text-white truncate">
                  {inspectingHotel.name}
                </h2>
                <p className="text-xs text-amber-200 font-semibold truncate">
                  {inspectingHotel.tagline || inspectingHotel.city}
                </p>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Rejection Note Alert if rejected */}
              {inspectingHotel.rejection_reason && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                  <span className="font-bold uppercase tracking-wider text-[10px] block text-rose-700">
                    Rejection Reason on Record:
                  </span>
                  <p className="mt-0.5">{inspectingHotel.rejection_reason}</p>
                </div>
              )}

              {/* Section 1: Legal Compliance & Tax Checklist */}
              <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-2xl p-4 space-y-3">
                <div className="text-xs font-black text-[#1E3A2B] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#1E3A2B]" />
                  <span>Legal Compliance & Tax Verification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white border border-[#E8E2D8]">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      LGU Business Permit No.
                    </span>
                    <span className="text-xs font-mono font-bold text-[#212529] mt-0.5 block">
                      {inspectingHotel.business_permit_number || '⚠️ Under Submission'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#E8E2D8]">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      BIR Tax Identification (TIN)
                    </span>
                    <span className="text-xs font-mono font-bold text-[#212529] mt-0.5 block">
                      {inspectingHotel.bir_tin || '⚠️ Under Submission'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Physical Location & GPS Coordinates */}
              <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-2xl p-4 space-y-3">
                <div className="text-xs font-black text-[#1E3A2B] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D49B41]" />
                  <span>Physical Location & GPS Pin</span>
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-[#212529]">{inspectingHotel.address}</p>
                  <p className="text-slate-500">
                    {[inspectingHotel.city, inspectingHotel.province, inspectingHotel.country_name]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>

                {inspectingHotel.latitude && inspectingHotel.longitude && (
                  <div className="pt-2 border-t border-[#E8E2D8] flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-500">
                      GPS: {Number(inspectingHotel.latitude).toFixed(5)},{' '}
                      {Number(inspectingHotel.longitude).toFixed(5)}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${inspectingHotel.latitude},${inspectingHotel.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E3A2B] hover:underline"
                    >
                      <span>Open in Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Section 3: Host Identity & Payout Settlement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Host Identity */}
                <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-2xl p-4 space-y-2.5">
                  <div className="text-xs font-black text-[#1E3A2B] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Host Identity</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-[#212529]">{inspectingHotel.owner_name}</p>
                    <p className="text-slate-500 font-mono text-[11px]">
                      Username: @{inspectingHotel.owner_username}
                    </p>
                    {inspectingHotel.owner_email && (
                      <a
                        href={`mailto:${inspectingHotel.owner_email}`}
                        className="text-[#8F611A] hover:underline block text-[11px] truncate font-medium"
                      >
                        {inspectingHotel.owner_email}
                      </a>
                    )}
                    {(inspectingHotel.owner_phone || inspectingHotel.contact_phone) && (
                      <a
                        href={`tel:${inspectingHotel.owner_phone || inspectingHotel.contact_phone}`}
                        className="text-slate-600 hover:text-[#212529] block text-[11px]"
                      >
                        📞 {inspectingHotel.owner_phone || inspectingHotel.contact_phone}
                      </a>
                    )}
                  </div>
                </div>

                {/* Financial Settlement Account */}
                <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-2xl p-4 space-y-2.5">
                  <div className="text-xs font-black text-[#1E3A2B] uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#1E3A2B]" />
                    <span>Payout Settlement</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                      {inspectingHotel.payout_method || 'Bank Transfer'}
                    </span>
                    <p className="font-bold text-[#212529] mt-1">
                      Acct: {inspectingHotel.payout_account_number || '—'}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Name: {inspectingHotel.payout_account_name || inspectingHotel.owner_name}
                    </p>
                    <p className="text-[11px] text-slate-400 pt-1 border-t border-[#E8E2D8]">
                      SaaS Commission Rate: 10%
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4: Physical Inventory */}
              <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-2xl p-4 flex items-center justify-around text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Physical Rooms
                  </span>
                  <span className="text-xl font-black text-[#212529]">
                    {inspectingHotel.total_rooms || 0}
                  </span>
                </div>
                <div className="w-px h-8 bg-[#E8E2D8]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Room Types
                  </span>
                  <span className="text-xl font-black text-[#212529]">
                    {inspectingHotel.total_room_types || 0}
                  </span>
                </div>
                <div className="w-px h-8 bg-[#E8E2D8]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Platform Bookings
                  </span>
                  <span className="text-xl font-black text-[#212529]">
                    {inspectingHotel.total_bookings || 0}
                  </span>
                </div>
              </div>

              {/* Section 5: Property Audit Trail & Activity Log (Dispute & Fraud Investigation) */}
              <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-[#1E3A2B] uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#D49B41]" />
                    <span>Audit Trail & Activity Log ({dossierLogs.length})</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    Dispute & Fraud Resolution
                  </span>
                </div>

                {dossierLogsLoading ? (
                  <div className="p-4 text-center text-xs font-bold text-slate-500 bg-white rounded-xl border border-[#E8E2D8]">
                    <RefreshCw className="w-4 h-4 animate-spin inline-block mr-1 text-[#1E3A2B]" />
                    Fetching property audit history...
                  </div>
                ) : dossierLogs.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-[#E8E2D8]">
                    No activity logs recorded for this hotel yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {dossierLogs.slice(0, 15).map((log) => {
                      const sevClass = {
                        critical: 'bg-rose-50 text-rose-700 border-rose-200',
                        warning: 'bg-amber-50 text-amber-700 border-amber-200',
                        info: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      }[log.severity] || 'bg-slate-50 text-slate-700 border-slate-200';

                      return (
                        <div
                          key={log.id}
                          className="p-2.5 rounded-xl bg-white border border-[#E8E2D8] space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${sevClass}`}>
                              {log.severity}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              {log.category}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-auto">
                              {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="font-bold text-[#212529] text-[11px] leading-tight">
                            {log.summary}
                          </p>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                            <span>Actor: <strong className="text-slate-700">{log.actor_name || 'System'}</strong></span>
                            <span>•</span>
                            <span className="uppercase font-bold text-[9px]">{log.actor_role}</span>
                            {log.ip_address && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-slate-400">IP: {log.ip_address}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Dossier Footer Action Bar */}
            <div className="p-4 sm:p-5 bg-[#FAF8F5] border-t border-[#E8E2D8] flex items-center justify-between gap-3 shrink-0">
              <div>
                {onNavigate && inspectingHotel.status === 'approved' && (
                  <button
                    onClick={() => {
                      setInspectingHotel(null);
                      onNavigate('inn_detail', inspectingHotel.slug);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F4EFEA] text-[#212529] text-xs font-bold border border-[#E8E2D8] transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#D49B41]" />
                    <span>View Live Listing</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {inspectingHotel.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        setRejectingHotelId(inspectingHotel.id);
                        setIsRejectOpen(true);
                      }}
                      disabled={actionLoading}
                      className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => handleReviewAction(inspectingHotel.id, 'approve')}
                      disabled={actionLoading}
                      className="px-5 py-2.5 rounded-xl bg-[#1E3A2B] hover:bg-[#162B20] text-white text-xs font-black shadow-md shadow-[#1E3A2B]/20 transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Approve & Publish Live</span>
                    </button>
                  </>
                )}

                {inspectingHotel.status === 'approved' && (
                  <button
                    onClick={() => handleReviewAction(inspectingHotel.id, 'suspend')}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 border border-[#E8E2D8] text-slate-600 hover:text-rose-700 text-xs font-bold transition-all"
                  >
                    Suspend Listing
                  </button>
                )}

                {(inspectingHotel.status === 'rejected' || inspectingHotel.status === 'suspended') && (
                  <button
                    onClick={() => handleReviewAction(inspectingHotel.id, 'reactivate')}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-[#D49B41]" />
                    <span>Reactivate & Approve Property</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {isRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-[#E8E2D8] rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-[#212529]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#212529]">Reject Property Application</h3>
                <p className="text-xs text-slate-500">
                  Provide clear feedback to help the hotel owner reapply.
                </p>
              </div>
            </div>

            {/* Quick Preset Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Quick Presets
              </label>
              <div className="space-y-1.5">
                {[
                  'Business permit verification failed or expired.',
                  'Missing BIR TIN or invalid tax identification document.',
                  'Incomplete lodging photos or poor image resolution.',
                  'Invalid or unreachable front desk contact number.',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    className={`w-full text-left p-2 rounded-xl text-xs transition-colors border ${
                      rejectionReason === preset
                        ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                        : 'bg-[#FAF8F5] border border-[#E8E2D8] text-slate-600 hover:text-[#212529] hover:bg-[#F4EFEA]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Custom Rejection Feedback *
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl p-3 text-xs text-[#212529] placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#212529]"
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
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 active:scale-95 transition-all"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  };
