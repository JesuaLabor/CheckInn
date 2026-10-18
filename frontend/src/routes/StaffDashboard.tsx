import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';
import { WalkInModal } from '../components/WalkInModal';
import { LocationPickerMap } from '../components/LocationPickerMap';
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
  Pencil,
  DollarSign,
  FileText,
  CreditCard,
  Copy,
  Building,
  Image as ImageIcon,
  UploadCloud,
  Camera,
  X,
} from 'lucide-react';
import { Booking, Room, GuestRequest, Hotel, StaffMember, RoomType } from '../types';

const COMMON_ROOM_AMENITIES = [
  'King Bed',
  'Queen Bed',
  'Air Conditioning',
  'En-suite Hot Shower',
  'High-Speed Wi-Fi',
  'Private Balcony',
  'Scenic View',
  'Smart TV / Netflix',
  'Breakfast Included',
];

export type StaffSubTab =
  | 'pending'
  | 'rooms'
  | 'checkin'
  | 'requests'
  | 'reports'
  | 'staff_manage'
  | 'inventory_manage'
  | 'hotel_settings';

interface StaffDashboardProps {
  initialSubTab?: StaffSubTab;
  /** Changes on every navbar deep-link so the same shortcut can be re-applied */
  deepLinkNonce?: number;
  isWalkInOpenExternal?: boolean;
  onCloseWalkInExternal?: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  initialSubTab,
  deepLinkNonce,
  isWalkInOpenExternal,
  onCloseWalkInExternal,
}) => {
  const { user } = useAuthStore();
  const isHotelAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  const [activeTab, setActiveTab] = useState<StaffSubTab>(initialSubTab || 'pending');

  // Apply navbar deep-links (profile shortcuts) during render instead of in an effect,
  // so repeated clicks on the same shortcut (new nonce) re-select the target sub-tab.
  const [appliedDeepLink, setAppliedDeepLink] = useState(deepLinkNonce);
  if (deepLinkNonce !== appliedDeepLink) {
    setAppliedDeepLink(deepLinkNonce);
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }

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
    amenities: 'King Bed, Air Conditioning, En-suite Hot Shower, High-Speed Wi-Fi',
    description: '',
    short_stay_enabled: true,
    rate_3h: '',
    rate_6h: '',
    rate_12h: '',
    rate_24h: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [roomImageFile, setRoomImageFile] = useState<File | null>(null);
  const [roomImagePreview, setRoomImagePreview] = useState<string>('');

  const handleRoomImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, JPEG, WEBP).', 'Invalid File Type');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast.error('Image size must be less than 12MB.', 'File Too Large');
      return;
    }

    setRoomImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setRoomImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveRoomImage = () => {
    setRoomImageFile(null);
    setRoomImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleRoomAmenity = (amenity: string) => {
    const current = newRoomTypeData.amenities
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    if (current.includes(amenity)) {
      setNewRoomTypeData({
        ...newRoomTypeData,
        amenities: current.filter((a) => a !== amenity).join(', '),
      });
    } else {
      setNewRoomTypeData({
        ...newRoomTypeData,
        amenities: [...current, amenity].join(', '),
      });
    }
  };

  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({
    room_number: '',
    floor: '1st Floor',
    room_type_id: '',
  });

  // Edit Room Category State
  const [isEditRoomTypeOpen, setIsEditRoomTypeOpen] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [editRoomTypeData, setEditRoomTypeData] = useState({
    name: '',
    base_rate: '',
    capacity: 2,
    amenities: '',
    description: '',
    short_stay_enabled: true,
    rate_3h: '',
    rate_6h: '',
    rate_12h: '',
    rate_24h: '',
  });
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editRoomImageFile, setEditRoomImageFile] = useState<File | null>(null);
  const [editRoomImagePreview, setEditRoomImagePreview] = useState<string>('');

  // Edit Physical Room State
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editRoomData, setEditRoomData] = useState({
    room_number: '',
    floor: '1st Floor',
    room_type_id: '',
    status: 'available',
  });

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState<{
    tagline: string;
    description: string;
    contact_phone: string;
    contact_email: string;
    payout_method: string;
    payout_account_name: string;
    payout_account_number: string;
    latitude: number | null;
    longitude: number | null;
  }>({
    tagline: '',
    description: '',
    contact_phone: '',
    contact_email: '',
    payout_method: 'GCash',
    payout_account_name: '',
    payout_account_number: '',
    latitude: null,
    longitude: null,
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
            latitude: profileRes.value.data.latitude !== null && profileRes.value.data.latitude !== undefined ? Number(profileRes.value.data.latitude) : null,
            longitude: profileRes.value.data.longitude !== null && profileRes.value.data.longitude !== undefined ? Number(profileRes.value.data.longitude) : null,
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

    if (!newRoomTypeData.name.trim()) {
      toast.error('Please enter a room category name.', 'Category Name Required');
      return;
    }

    if (!newRoomTypeData.base_rate || Number(newRoomTypeData.base_rate) <= 0) {
      toast.error('Please enter a valid nightly rate in Philippine Peso (₱).', 'Nightly Rate Required');
      return;
    }

    if (!roomImageFile && !roomImagePreview) {
      toast.error('Please attach a photo of this room from your device.', 'Room Photo Required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', newRoomTypeData.name.trim());
      formData.append('base_rate', newRoomTypeData.base_rate);
      formData.append('capacity', String(newRoomTypeData.capacity));
      formData.append('description', newRoomTypeData.description.trim());
      formData.append('amenities', newRoomTypeData.amenities);
      formData.append('short_stay_enabled', String(newRoomTypeData.short_stay_enabled));
      if (newRoomTypeData.rate_3h) formData.append('rate_3h', newRoomTypeData.rate_3h);
      if (newRoomTypeData.rate_6h) formData.append('rate_6h', newRoomTypeData.rate_6h);
      if (newRoomTypeData.rate_12h) formData.append('rate_12h', newRoomTypeData.rate_12h);
      if (newRoomTypeData.rate_24h) formData.append('rate_24h', newRoomTypeData.rate_24h);

      if (roomImageFile) {
        formData.append('photo', roomImageFile);
      } else if (roomImagePreview) {
        formData.append('photos', roomImagePreview);
      }

      await api.post('/hotel-manage/room-types/', formData);
      toast.success(`Room category "${newRoomTypeData.name}" created with your attached photo!`, 'Category Added');
      setActionSuccess(`Room category "${newRoomTypeData.name}" created!`);
      setIsAddRoomTypeOpen(false);
      setNewRoomTypeData({
        name: '',
        base_rate: '',
        capacity: 2,
        amenities: 'King Bed, Air Conditioning, En-suite Hot Shower, High-Speed Wi-Fi',
        description: '',
        short_stay_enabled: true,
        rate_3h: '',
        rate_6h: '',
        rate_12h: '',
        rate_24h: '',
      });
      setRoomImageFile(null);
      setRoomImagePreview('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchDashboardData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to create room category.';
      toast.error(errorMsg, 'Creation Failed');
      setActionError(errorMsg);
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

  const handleOpenEditRoomType = (rt: RoomType) => {
    setEditingRoomType(rt);
    setEditRoomTypeData({
      name: rt.name,
      base_rate: String(rt.base_rate),
      capacity: rt.capacity || 2,
      amenities: Array.isArray(rt.amenities) ? rt.amenities.join(', ') : '',
      description: rt.description || '',
      short_stay_enabled: rt.short_stay_enabled !== false,
      rate_3h: rt.rate_3h ? String(rt.rate_3h) : '',
      rate_6h: rt.rate_6h ? String(rt.rate_6h) : '',
      rate_12h: rt.rate_12h ? String(rt.rate_12h) : '',
      rate_24h: rt.rate_24h ? String(rt.rate_24h) : '',
    });
    setEditRoomImageFile(null);
    setEditRoomImagePreview(rt.photos && rt.photos.length > 0 ? rt.photos[0] : '');
    setIsEditRoomTypeOpen(true);
  };

  const handleEditRoomImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, JPEG, WEBP).', 'Invalid File Type');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast.error('Image size must be less than 12MB.', 'File Too Large');
      return;
    }

    setEditRoomImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setEditRoomImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleEditRoomAmenity = (amenity: string) => {
    const current = editRoomTypeData.amenities
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    if (current.includes(amenity)) {
      setEditRoomTypeData({
        ...editRoomTypeData,
        amenities: current.filter((a) => a !== amenity).join(', '),
      });
    } else {
      setEditRoomTypeData({
        ...editRoomTypeData,
        amenities: [...current, amenity].join(', '),
      });
    }
  };

  const handleUpdateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoomType) return;
    if (!editRoomTypeData.name.trim()) {
      toast.error('Please enter a room category name.', 'Name Required');
      return;
    }
    if (!editRoomTypeData.base_rate || Number(editRoomTypeData.base_rate) <= 0) {
      toast.error('Please enter a valid nightly rate in Philippine Peso (₱).', 'Nightly Rate Required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', editRoomTypeData.name.trim());
      formData.append('base_rate', editRoomTypeData.base_rate);
      formData.append('capacity', String(editRoomTypeData.capacity));
      formData.append('description', editRoomTypeData.description.trim());
      formData.append('amenities', editRoomTypeData.amenities);
      formData.append('short_stay_enabled', String(editRoomTypeData.short_stay_enabled));
      formData.append('rate_3h', editRoomTypeData.rate_3h || '');
      formData.append('rate_6h', editRoomTypeData.rate_6h || '');
      formData.append('rate_12h', editRoomTypeData.rate_12h || '');
      formData.append('rate_24h', editRoomTypeData.rate_24h || '');

      if (editRoomImageFile) {
        formData.append('photo', editRoomImageFile);
      }

      await api.patch(`/hotel-manage/room-types/${editingRoomType.id}/`, formData);
      toast.success(`Room category "${editRoomTypeData.name}" updated successfully!`, 'Category Updated');
      setIsEditRoomTypeOpen(false);
      setEditingRoomType(null);
      fetchDashboardData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update room category.';
      toast.error(errorMsg, 'Update Failed');
    }
  };

  const handleExtendStay = async (bookingId: number | string, guestName: string) => {
    const hours = window.prompt(
      `Extend short-stay for guest "${guestName}"?\nEnter additional duration slot (3, 6, 12, or 24 hours):`,
      '3'
    );
    if (!hours) return;
    const numHours = parseInt(hours, 10);
    if (![3, 6, 12, 24].includes(numHours)) {
      toast.error('Extension slot must be 3, 6, 12, or 24 hours.', 'Invalid Slot');
      return;
    }
    try {
      const res = await api.post(`/bookings/${bookingId}/extend/`, { hours: numHours });
      toast.success(res.data.message || 'Stay extended successfully!');
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to extend stay.');
    }
  };

  const handleDeleteRoomType = async (rt: RoomType) => {
    if (!window.confirm(`Are you sure you want to delete room category "${rt.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/hotel-manage/room-types/${rt.id}/`);
      toast.success(`Room category "${rt.name}" deleted.`, 'Category Deleted');
      if (editingRoomType?.id === rt.id) {
        setIsEditRoomTypeOpen(false);
        setEditingRoomType(null);
      }
      fetchDashboardData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to delete room category.';
      toast.error(errorMsg, 'Deletion Failed');
    }
  };

  const handleOpenEditRoom = (rm: Room) => {
    setEditingRoom(rm);
    setEditRoomData({
      room_number: rm.room_number,
      floor: rm.floor || '1st Floor',
      room_type_id: String(rm.room_type),
      status: rm.status || 'available',
    });
    setIsEditRoomOpen(true);
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    if (!editRoomData.room_number.trim()) {
      toast.error('Please enter a room number.', 'Room Number Required');
      return;
    }
    try {
      await api.patch(`/hotel-manage/rooms/${editingRoom.id}/`, editRoomData);
      toast.success(`Room "${editRoomData.room_number}" updated successfully!`, 'Room Updated');
      setIsEditRoomOpen(false);
      setEditingRoom(null);
      fetchDashboardData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update physical room.';
      toast.error(errorMsg, 'Update Failed');
    }
  };

  const handleDeleteRoom = async (rm: Room) => {
    if (!window.confirm(`Are you sure you want to delete Room "${rm.room_number}"?`)) {
      return;
    }
    try {
      await api.delete(`/hotel-manage/rooms/${rm.id}/`);
      toast.success(`Room "${rm.room_number}" deleted from inventory.`, 'Room Deleted');
      if (editingRoom?.id === rm.id) {
        setIsEditRoomOpen(false);
        setEditingRoom(null);
      }
      fetchDashboardData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to delete room.';
      toast.error(errorMsg, 'Deletion Failed');
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

  const handleDirectCheckIn = async (bookingId: number | string) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.post(`/bookings/${bookingId}/checkin/`);
      setActionSuccess(res.data.message || 'Guest checked in successfully!');
      fetchDashboardData();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Check-in failed.');
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
                  (r) =>
                    (Number(r.room_type) === Number(b.room_type) ||
                      Number((r as any).room_type_id) === Number(b.room_type)) &&
                    r.status === 'available'
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
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-[#212529] truncate">{r.occupant.guest_name}</span>
                        {(r.occupant as any).status === 'confirmed' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 shrink-0">
                            Assigned
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 shrink-0">
                            Checked In
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium">{r.occupant.guest_phone || 'No phone'}</div>
                      
                      {r.occupant.stay_type === 'hourly' ? (
                        <div className="pt-1 pb-0.5 space-y-1">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#1E3A2B]/10 text-[#1E3A2B]">
                              <Clock className="w-2.5 h-2.5 text-[#D49B41]" />
                              <span>{r.occupant.duration_hours || 3}h Wash-and-Go</span>
                            </span>

                            {r.occupant.is_expired ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 animate-pulse flex items-center gap-1">
                                ⚠️ Time Expired
                              </span>
                            ) : typeof r.occupant.remaining_seconds === 'number' ? (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                r.occupant.remaining_seconds <= 900
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                  : 'bg-emerald-100 text-emerald-900'
                              }`}>
                                <Clock className="w-2.5 h-2.5" />
                                {Math.floor(r.occupant.remaining_seconds / 3600) > 0 ? `${Math.floor(r.occupant.remaining_seconds / 3600)}h ` : ''}
                                {Math.floor((r.occupant.remaining_seconds % 3600) / 60)}m left
                              </span>
                            ) : null}
                          </div>

                          {r.occupant.check_out_datetime && (
                            <div className="text-[10px] text-[#1E3A2B] font-bold">
                              Out: {new Date(r.occupant.check_out_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-[#1E3A2B] font-bold">
                          Checkout: {r.occupant.check_out}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 mt-2.5">
                        {(r.occupant as any).status === 'confirmed' && (
                          <button
                            onClick={() => handleDirectCheckIn(r.occupant!.booking_id)}
                            className="flex-1 py-1.5 rounded-xl bg-[#1E3A2B] hover:bg-[#3B5E43] text-white text-[11px] font-bold transition-all active:scale-95 flex items-center justify-center gap-1 shadow-2xs"
                            title="Complete Arrival Check-in"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#D49B41]" />
                            <span>Check In</span>
                          </button>
                        )}
                        {r.occupant.stay_type === 'hourly' && (r.occupant as any).status === 'checked_in' && (
                          <button
                            onClick={() => handleExtendStay(r.occupant!.booking_id, r.occupant!.guest_name)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#D49B41] hover:bg-[#b8822f] text-[#212529] text-[11px] font-black transition-all active:scale-95 flex items-center justify-center gap-1 shadow-2xs"
                            title="Extend stay duration (+3h/6h)"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Extend</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleCheckOut(r.occupant!.booking_id)}
                          className="flex-1 py-1.5 rounded-xl bg-[#212529] hover:bg-[#1E3A2B] text-white text-[11px] font-bold transition-all active:scale-95 flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>{(r.occupant as any).status === 'confirmed' ? 'Release Room' : 'Check Out'}</span>
                        </button>
                      </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {roomTypes.map((rt) => (
                <div
                  key={rt.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-3 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    {rt.photos && rt.photos.length > 0 && rt.photos[0] && (
                      <div className="h-40 w-full -mx-5 -mt-5 mb-3.5 overflow-hidden relative bg-slate-100 group">
                        <img
                          src={rt.photos[0]}
                          alt={rt.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                        <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                          {rt.rooms?.length || 0} Physical Rooms
                        </div>
                      </div>
                    )}

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

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-2.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Up to {rt.capacity} Guests</span>
                      {(!rt.photos || rt.photos.length === 0) && (
                        <>
                          <span>•</span>
                          <span>{rt.rooms?.length || 0} Physical Rooms</span>
                        </>
                      )}
                    </div>

                    {rt.amenities && rt.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
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

                    {rt.short_stay_enabled !== false && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E3A2B]">
                          <Clock className="w-3 h-3 text-[#D49B41]" />
                          <span>Short-Stay:</span>
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-700">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                            3h: ₱{Number(rt.rate_3h || Math.round(Number(rt.base_rate) * 0.3)).toLocaleString()}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                            6h: ₱{Number(rt.rate_6h || Math.round(Number(rt.base_rate) * 0.5)).toLocaleString()}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            12h: ₱{Number(rt.rate_12h || Math.round(Number(rt.base_rate) * 0.75)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditRoomType(rt)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#1E3A2B] text-slate-700 hover:text-white border border-[#E8E2D8] hover:border-[#1E3A2B] text-[11px] font-bold transition-all shadow-2xs"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#D49B41]" />
                        <span>Edit Category</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRoomType(rt)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        title="Delete Room Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Physical Rooms Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#212529]">Physical Rooms On Property</h3>
              <span className="text-[11px] text-slate-400">Click any room to edit details or change status</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {(roomBoard?.rooms || []).map((rm) => (
                <div
                  key={rm.id}
                  onClick={() => handleOpenEditRoom(rm)}
                  className={`group relative p-3 rounded-2xl border text-center space-y-1 cursor-pointer transition-all hover:scale-105 hover:shadow-md ${
                    rm.status === 'available'
                      ? 'bg-white border-[#3B5E43]/30 text-[#1E3A2B] hover:border-[#3B5E43]'
                      : rm.status === 'occupied'
                      ? 'bg-[#FAF8F5] border-[#D49B41]/40 text-[#212529] hover:border-[#D49B41]'
                      : rm.status === 'cleaning'
                      ? 'bg-[#FAF8F5] border-slate-200 text-[#3B5E43] hover:border-[#3B5E43]'
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                  title="Click to edit room details or status"
                >
                  <div className="text-sm font-black flex items-center justify-center gap-1">
                    <span>{rm.room_number}</span>
                    <Pencil className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
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

              {/* Hotel Map Pinning Section */}
              <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                <LocationPickerMap
                  latitude={profileForm.latitude}
                  longitude={profileForm.longitude}
                  onChange={(lat, lng) =>
                    setProfileForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                  }
                  defaultCity={hotelProfile?.city || 'Malaybalay City, Bukidnon'}
                  label="Hotel Map Location & GPS Coordinates"
                  height="h-72 sm:h-80"
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
        isOpen={isWalkInOpen || !!isWalkInOpenExternal}
        onClose={() => {
          setIsWalkInOpen(false);
          if (onCloseWalkInExternal) onCloseWalkInExternal();
        }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#12161A]/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[92vh] border border-slate-200/80 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-[#FAF8F5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1E3A2B]/10 text-[#1E3A2B] border border-[#1E3A2B]/20 flex items-center justify-center shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#212529]">Add Room Category</h3>
                  <p className="text-xs text-slate-500">Configure tier pricing, amenities & guest photo showcase.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddRoomTypeOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-200/70 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleAddRoomType} className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Category Name <span className="text-[#D49B41]">*</span></span>
                  <span className="text-[11px] text-slate-400 font-normal">Shown to guests on booking</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deluxe Balcony Suite / Executive Chalet"
                  value={newRoomTypeData.name}
                  onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, name: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B] font-medium transition-all"
                />
              </div>

              {/* Pricing & Occupancy */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Rate (₱ / night) <span className="text-[#D49B41]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">₱</span>
                    <input
                      type="number"
                      required
                      min={100}
                      placeholder="2500"
                      value={newRoomTypeData.base_rate}
                      onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, base_rate: e.target.value })}
                      className="w-full bg-[#FAF8F5] border border-slate-200/90 rounded-xl pl-7 pr-3 py-2.5 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B] font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Max Capacity <span className="text-[#D49B41]">*</span>
                  </label>
                  <div className="relative">
                    <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="number"
                      required
                      min={1}
                      max={20}
                      value={newRoomTypeData.capacity}
                      onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, capacity: parseInt(e.target.value) || 1 })}
                      className="w-full bg-[#FAF8F5] border border-slate-200/90 rounded-xl pl-8 pr-3 py-2.5 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B] font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Short-Stay / Micro-Stay Tiers (Wash-and-Go) */}
              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#D49B41]" />
                    <span className="text-xs font-bold text-slate-800">
                      Short-Stay / Micro-Stay Tiers (Wash-and-Go)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRoomTypeData.short_stay_enabled}
                      onChange={(e) =>
                        setNewRoomTypeData({ ...newRoomTypeData, short_stay_enabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E3A2B]"></div>
                  </label>
                </div>

                {newRoomTypeData.short_stay_enabled && (
                  <div className="space-y-2.5 pt-1">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Configure standard fixed hourly rates for micro-stays. Leave blank to use proportional defaults.
                    </p>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          3 Hours (Wash & Go)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-black text-slate-400">₱</span>
                          <input
                            type="number"
                            min={50}
                            placeholder={newRoomTypeData.base_rate ? String(Math.round(Number(newRoomTypeData.base_rate) * 0.3)) : '450'}
                            value={newRoomTypeData.rate_3h}
                            onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, rate_3h: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-2.5 py-1.5 text-xs text-[#212529] font-bold outline-none focus:border-[#1E3A2B]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          6 Hours (Half-Day)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-black text-slate-400">₱</span>
                          <input
                            type="number"
                            min={50}
                            placeholder={newRoomTypeData.base_rate ? String(Math.round(Number(newRoomTypeData.base_rate) * 0.5)) : '750'}
                            value={newRoomTypeData.rate_6h}
                            onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, rate_6h: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-2.5 py-1.5 text-xs text-[#212529] font-bold outline-none focus:border-[#1E3A2B]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          12 Hours (Overnight/Rest)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-black text-slate-400">₱</span>
                          <input
                            type="number"
                            min={100}
                            placeholder={newRoomTypeData.base_rate ? String(Math.round(Number(newRoomTypeData.base_rate) * 0.75)) : '1200'}
                            value={newRoomTypeData.rate_12h}
                            onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, rate_12h: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-2.5 py-1.5 text-xs text-[#212529] font-bold outline-none focus:border-[#1E3A2B]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          24 Hours (Full-Day Block)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-black text-slate-400">₱</span>
                          <input
                            type="number"
                            min={100}
                            placeholder={newRoomTypeData.base_rate || '1800'}
                            value={newRoomTypeData.rate_24h}
                            onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, rate_24h: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-2.5 py-1.5 text-xs text-[#212529] font-bold outline-none focus:border-[#1E3A2B]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Room Photography from Local Device */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#D49B41]" />
                    <span>Attach Room Photo from Device <span className="text-[#D49B41]">*</span></span>
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Local Device Upload
                  </span>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleRoomImageChange}
                  className="hidden"
                />

                <div className="space-y-3">
                  {!roomImagePreview ? (
                    /* Dropzone Button */
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group border-2 border-dashed border-slate-300 hover:border-[#1E3A2B] bg-[#FAF8F5] hover:bg-[#F3EDE3]/60 rounded-2xl p-5 text-center cursor-pointer transition-all duration-200"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#1E3A2B]/10 text-[#1E3A2B] group-hover:bg-[#1E3A2B] group-hover:text-white transition-all flex items-center justify-center mx-auto mb-2 shadow-2xs">
                        <UploadCloud className="w-6 h-6 transition-transform group-hover:-translate-y-0.5" />
                      </div>
                      <p className="text-xs font-black text-[#212529]">
                        Click to attach room photo from your device
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Select a clear photo from your files or gallery (PNG, JPG, or WEBP up to 12MB)
                      </p>
                    </div>
                  ) : (
                    /* Attached File Control Bar */
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-emerald-950 truncate">
                            {roomImageFile?.name || 'Attached Room Image'}
                          </p>
                          <p className="text-[10px] text-emerald-700 font-medium">
                            {roomImageFile ? `${(roomImageFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to save` : 'Attached from device'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#1E3A2B] border border-slate-200 text-xs font-bold transition-all shadow-2xs active:scale-95"
                        >
                          Change Photo
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveRoomImage}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove attached photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Live Interactive Preview Card */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md aspect-[16/9] group">
                    {roomImagePreview ? (
                      <img
                        src={roomImagePreview}
                        alt="Room Preview"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-400 cursor-pointer p-4 text-center hover:bg-slate-850 transition-colors"
                      >
                        <Camera className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                        <span className="text-xs font-bold text-slate-300">No room photo attached yet</span>
                        <span className="text-[11px] text-slate-500 mt-0.5">Click to choose a photo from your local device</span>
                      </div>
                    )}

                    {roomImagePreview && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4">
                          <div className="flex items-center justify-between text-white">
                            <div>
                              <span className="px-2 py-0.5 rounded-full bg-[#1E3A2B]/90 border border-[#D49B41]/50 text-[#E2AE55] text-[10px] font-black uppercase">
                                Attached Device Photo
                              </span>
                              <h4 className="text-sm font-black mt-1 drop-shadow-md">
                                {newRoomTypeData.name || 'Category Name'}
                              </h4>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-[#E2AE55]">
                                ₱{Number(newRoomTypeData.base_rate || 0).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-300 block">/ night</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-1">
                            <Users className="w-3 h-3 text-[#D49B41]" />
                            <span>Up to {newRoomTypeData.capacity} Guests</span>
                          </div>
                        </div>

                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Live Marketplace View</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Room Amenities Quick Select & Custom Input */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Room Amenities & Highlights
                </label>

                {/* Quick Toggle Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_ROOM_AMENITIES.map((amenity) => {
                    const isSelected = newRoomTypeData.amenities.toLowerCase().includes(amenity.toLowerCase());
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleRoomAmenity(amenity)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#1E3A2B] text-white border-[#1E3A2B] shadow-xs'
                            : 'bg-[#FAF8F5] text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-[#D49B41] stroke-[3]" />}
                        <span>{amenity}</span>
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  placeholder="Custom amenities (e.g. Mountain Balcony, Marble Bath, Coffee Maker)"
                  value={newRoomTypeData.amenities}
                  onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, amenities: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200/90 rounded-xl px-3.5 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Guest-Facing Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the ambiance, bedding comfort, natural light, and unique view guests will enjoy..."
                  value={newRoomTypeData.description}
                  onChange={(e) => setNewRoomTypeData({ ...newRoomTypeData, description: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200/90 rounded-xl px-3.5 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B] resize-none"
                />
              </div>

              {/* Pinned Modal Footer Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddRoomTypeOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-black text-white bg-gradient-to-r from-[#1E3A2B] to-[#162C20] hover:brightness-110 rounded-xl shadow-md shadow-[#1E3A2B]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D49B41]" />
                  <span>Create Room Category</span>
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

      {/* Edit Room Category Modal */}
      {isEditRoomTypeOpen && editingRoomType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212529]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-[#FAF8F5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1E3A2B] text-white flex items-center justify-center shadow-xs">
                  <Pencil className="w-5 h-5 text-[#D49B41]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#212529]">Edit Room Category</h3>
                  <p className="text-xs text-slate-400">Update rates, photos, amenities, or capacity.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditRoomTypeOpen(false);
                  setEditingRoomType(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleUpdateRoomType} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={editRoomTypeData.name}
                  onChange={(e) => setEditRoomTypeData({ ...editRoomTypeData, name: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nightly Rate (₱) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editRoomTypeData.base_rate}
                    onChange={(e) => setEditRoomTypeData({ ...editRoomTypeData, base_rate: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Guest Capacity</label>
                  <select
                    value={editRoomTypeData.capacity}
                    onChange={(e) => setEditRoomTypeData({ ...editRoomTypeData, capacity: Number(e.target.value) })}
                    className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                      <option key={num} value={num}>
                        {num} Guest{num > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Short-Stay / Micro-Stay Tiers (Wash-and-Go) */}
              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#D49B41]" />
                    <span className="text-xs font-bold text-slate-800">
                      Short-Stay / Micro-Stay Tiers (Wash-and-Go)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRoomTypeData.short_stay_enabled}
                      onChange={(e) =>
                        setEditRoomTypeData({ ...editRoomTypeData, short_stay_enabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E3A2B]"></div>
                  </label>
                </div>

                {editRoomTypeData.short_stay_enabled && (
                  <div className="space-y-2.5 pt-1">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Configure standard fixed hourly rates for micro-stays. Leave blank to use proportional defaults.
                    </p>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          3 Hours (Wash & Go)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-black text-slate-400">₱</span>
                          <input
                            type="number"
                            min={50}
                            placeholder={editRoomTypeData.base_rate ? String(Math.round(Number(editRoomTypeData.base_rate) * 0.3)) : '450'}
                            value={editRoomTypeData.rate_3h}
                            onChange={(e) => setEditRoomTypeData({ ...editRoomTypeData, rate_3h: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-2.5 py-1.5 text-xs text-[#212529] font-bold outline-none focus:border-[#1E3A2B]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          6 Hours (Half-Day)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-black text-slate-400">₱</span>
                          <input
                            type="number"
                            min={50}
                            placeholder={editRoomTypeData.base_rate ? String(Math.round(Number(editRoomTypeData.base_rate) * 0.5)) : '750'}
                            value={editRoomTypeData.rate_6h}
                            onChange={(e) => setEditRoomTypeData({ ...editRoomTypeData, rate_6h: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-2.5 py-1.5 text-xs text-[#212529] font-bold outline-none focus:border-[#1E3A2B]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          12 Hours (Overnight/Rest)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-black text-slate-400">₱</span>
                          <input
                            type="number"
                            min={100}
                            placeholder={editRoomTypeData.base_rate ? String(Math.round(Number(editRoomTypeData.base_rate) * 0.75)) : '1200'}
                            value={editRoomTypeData.rate_12h}
                            onChange={(e) => setEditRoomTypeData({ ...editRoomTypeData, rate_12h: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-2.5 py-1.5 text-xs text-[#212529] font-bold outline-none focus:border-[#1E3A2B]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          24 Hours (Full-Day Block)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-black text-slate-400">₱</span>
                          <input
                            type="number"
                            min={100}
                            placeholder={editRoomTypeData.base_rate || '1800'}
                            value={editRoomTypeData.rate_24h}
                            onChange={(e) => setEditRoomTypeData({ ...editRoomTypeData, rate_24h: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-2.5 py-1.5 text-xs text-[#212529] font-bold outline-none focus:border-[#1E3A2B]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Photo Attachment Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Room Photo</label>
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF8F5] hover:bg-[#1E3A2B] text-slate-700 hover:text-white border border-[#E8E2D8] text-[11px] font-bold transition-all"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-[#D49B41]" />
                    <span>Upload New Photo</span>
                  </button>
                </div>

                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                  onChange={handleEditRoomImageChange}
                />

                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-[16/9]">
                  {editRoomImagePreview ? (
                    <img
                      src={editRoomImagePreview}
                      alt="Room Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => editFileInputRef.current?.click()}
                      className="w-full h-full flex flex-col items-center justify-center text-slate-400 cursor-pointer p-4 text-center hover:bg-slate-800 transition-colors"
                    >
                      <Camera className="w-8 h-8 mb-2 opacity-40" />
                      <span className="text-xs font-bold text-slate-300">Click to attach photo from device</span>
                    </div>
                  )}

                  {editRoomImagePreview && (
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                      {editRoomImageFile ? 'New Photo Selected' : 'Current Photo'}
                    </div>
                  )}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Room Amenities</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_ROOM_AMENITIES.map((amenity) => {
                    const isSelected = editRoomTypeData.amenities
                      .split(',')
                      .map((a) => a.trim().toLowerCase())
                      .includes(amenity.toLowerCase());
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleEditRoomAmenity(amenity)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-[#1E3A2B] text-white border-[#1E3A2B]'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {amenity}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={editRoomTypeData.amenities}
                  onChange={(e) => setEditRoomTypeData({ ...editRoomTypeData, amenities: e.target.value })}
                  placeholder="Comma-separated amenities"
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editRoomTypeData.description}
                  onChange={(e) => setEditRoomTypeData({ ...editRoomTypeData, description: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B] resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteRoomType(editingRoomType)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Category</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditRoomTypeOpen(false);
                      setEditingRoomType(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-[#1E3A2B] to-[#162C20] hover:brightness-110 rounded-xl shadow-md shadow-[#1E3A2B]/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D49B41]" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Physical Room Modal */}
      {isEditRoomOpen && editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212529]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] text-[#212529] border border-slate-200 flex items-center justify-center">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#212529]">Edit Physical Room</h3>
                  <p className="text-xs text-slate-400">Update room number, floor, or category.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditRoomOpen(false);
                  setEditingRoom(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Room Number *</label>
                <input
                  type="text"
                  required
                  value={editRoomData.room_number}
                  onChange={(e) => setEditRoomData({ ...editRoomData, room_number: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Floor</label>
                <input
                  type="text"
                  value={editRoomData.floor}
                  onChange={(e) => setEditRoomData({ ...editRoomData, floor: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Room Category *</label>
                <select
                  required
                  value={editRoomData.room_type_id}
                  onChange={(e) => setEditRoomData({ ...editRoomData, room_type_id: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} (₱{rt.base_rate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={editRoomData.status}
                  onChange={(e) => setEditRoomData({ ...editRoomData, status: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteRoom(editingRoom)}
                  className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditRoomOpen(false);
                      setEditingRoom(null);
                    }}
                    className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-extrabold text-white bg-[#1E3A2B] hover:bg-[#3B5E43] rounded-xl shadow-md active:scale-95 transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
