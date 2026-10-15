import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';
import { LocationPickerMap } from '../components/LocationPickerMap';
import {
  Building2,
  ShieldCheck,
  CreditCard,
  User,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Check,
  Clock,
  Eye,
  EyeOff,
  Image as ImageIcon,
  MapPin,
  Phone,
  Mail,
  Lock,
  FileText,
  BadgeCheck,
  Star,
  RefreshCw,
  Trees,
  Palmtree,
  Landmark,
  Building,
  Sprout,
  HelpCircle,
} from 'lucide-react';

interface PartnerRegisterProps {
  onBack: () => void;
  onSuccess: () => void;
}

const CATEGORY_OPTIONS = [
  {
    id: 'mountain',
    name: 'Highland & Mountain',
    icon: Trees,
    desc: 'Pine lodges, mountain cabins & scenic highland chalets',
  },
  {
    id: 'beach',
    name: 'Beach & Coastal',
    icon: Palmtree,
    desc: 'Island resorts, oceanfront villas & seaside inns',
  },
  {
    id: 'heritage',
    name: 'Heritage & Historic',
    icon: Landmark,
    desc: 'Colonial estates, ancestral houses & cultural sanctuaries',
  },
  {
    id: 'city',
    name: 'Urban & City Boutique',
    icon: Building,
    desc: 'Metro suites, business hotels & central boutique stays',
  },
  {
    id: 'eco',
    name: 'Eco & Nature Retreat',
    icon: Sprout,
    desc: 'Glamping, farmstays, treehouses & organic retreats',
  },
];

const PRESET_PHOTOS = [
  {
    label: 'Highland Pine',
    url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Island Beach',
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Heritage Villa',
    url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Urban Boutique',
    url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Nature Eco-Lodge',
    url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
  },
];

const COMMON_AMENITIES = [
  'Free High-Speed Wi-Fi',
  'Air Conditioning',
  'En-suite Hot Shower',
  '24/7 Front Desk',
  'Free Parking',
  'Standby Generator',
  'CCTV Security',
  'Cable TV',
  'On-site Café / Restaurant',
  'Swimming Pool',
  'Mountain / Scenic Balcony',
  'Pet Friendly Stays',
];

export const PartnerRegister: React.FC<PartnerRegisterProps> = ({ onBack, onSuccess }) => {
  const { setSession } = useAuthStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Hotel Info
    hotel_name: '',
    tagline: '',
    description: '',
    address: '',
    city: '',
    province: '',
    country: 'PH',
    country_name: 'Philippines',
    category: 'mountain',
    currency: 'PHP',
    contact_phone: '',
    contact_email: '',
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    amenities: ['Free High-Speed Wi-Fi', 'Air Conditioning', 'En-suite Hot Shower', '24/7 Front Desk'],
    latitude: null as number | null,
    longitude: null as number | null,

    // Step 2: Legal & Payout
    business_permit_number: '',
    bir_tin: '',
    payout_method: 'GCash',
    payout_account_name: '',
    payout_account_number: '',

    // Step 3: Owner Account
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    username: '',
    password: '',
    confirm_password: '',
  });

  const toggleAmenity = (amenity: string) => {
    if (formData.amenities.includes(amenity)) {
      setFormData({
        ...formData,
        amenities: formData.amenities.filter((a) => a !== amenity),
      });
    } else {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, amenity],
      });
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      if (!formData.hotel_name.trim()) {
        toast.error('Please enter the official name of your hotel, inn, or boutique stay.', 'Property Name Required');
        return;
      }
      if (!formData.address.trim() || !formData.city.trim()) {
        toast.error('Please provide the complete street address and city/municipality for accurate guest navigation.', 'Location Incomplete');
        return;
      }
      setStep(2);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else if (step === 2) {
      if (!formData.business_permit_number.trim()) {
        toast.error('Please enter your Business Permit or DTI Registration number for host verification.', 'Verification Required');
        return;
      }
      if (!formData.payout_account_number.trim()) {
        toast.error('Please specify your GCash or Bank Account number for automated guest disbursements.', 'Payout Account Required');
        return;
      }
      setStep(3);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('Please enter the hotel owner full legal name.', 'Owner Name Required');
      return;
    }

    if (!formData.username.trim() || !formData.email.trim() || !formData.password) {
      toast.error('Username, valid email address, and master password are required.', 'Credentials Incomplete');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Master password must be at least 6 characters in length.', 'Password Security');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      toast.error('Password confirmation does not match. Please verify both password fields.', 'Password Mismatch');
      return;
    }

    if (!agreedToTerms) {
      toast.error('Please accept the LocalStay Partner Hosting Agreement to submit your application.', 'Terms Agreement Required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone_number: formData.phone_number.trim() || formData.contact_phone.trim(),

        hotel_name: formData.hotel_name.trim(),
        tagline: formData.tagline.trim(),
        description: formData.description.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        province: formData.province.trim(),
        country: formData.country,
        country_name: formData.country_name,
        category: formData.category,
        currency: formData.currency,
        contact_phone: formData.contact_phone.trim() || formData.phone_number.trim(),
        contact_email: formData.contact_email.trim() || formData.email.trim(),
        image_url: formData.image_url.trim(),
        amenities: formData.amenities,
        latitude: formData.latitude,
        longitude: formData.longitude,

        business_permit_number: formData.business_permit_number.trim(),
        bir_tin: formData.bir_tin.trim(),
        payout_method: formData.payout_method,
        payout_account_name: formData.payout_account_name.trim() || `${formData.first_name} ${formData.last_name}`.trim(),
        payout_account_number: formData.payout_account_number.trim(),
      };

      const res = await api.post('/inns/partner-register/', payload);
      const { access, user, message } = res.data;

      // Auto login as hotel owner
      setSession(access, user);
      toast.success(
        message || 'Partnership application approved! Setting up your hotel dashboard...',
        'Welcome to LocalStay'
      );

      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Failed to submit registration. Please verify your details.';
      toast.error(errorMsg, 'Registration Failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryObj = CATEGORY_OPTIONS.find((c) => c.id === formData.category) || CATEGORY_OPTIONS[0];

  return (
    <div className="min-h-screen bg-[#15191E] text-slate-100 pt-24 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] bg-gradient-to-b from-[#1E3A2B]/40 via-[#D49B41]/10 to-transparent blur-3xl pointer-events-none -z-0" />
      <div className="absolute top-96 right-0 w-80 h-80 bg-[#1E3A2B]/20 rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Top Breadcrumb & Host Support Nav */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all group shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform text-[#D49B41]" />
            <span>Back to Marketplace</span>
          </button>

          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1E3A2B]/40 border border-[#3B5E43]/40 text-emerald-300 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D49B41]" />
            <span>Official Host Onboarding Portal</span>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#162C20] via-[#1E3A2B]/90 to-[#12241A] border border-[#3B5E43]/50 p-6 sm:p-8 mb-8 shadow-2xl overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#D49B41]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D49B41]/15 border border-[#D49B41]/35 text-[#E2AE55] text-xs font-bold uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>LocalStay Boutique Partner Network</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                List Your Hotel or Inn on LocalStay
              </h1>
              <p className="text-emerald-100/75 text-xs sm:text-sm max-w-xl leading-relaxed">
                Empower your front desk with automated 45-minute room hold protection, digital reservations, instant QR check-ins, and automated guest payouts across the Philippines & abroad.
              </p>
            </div>

            {/* Value Props & Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 text-xs shrink-0 md:min-w-[280px]">
              <div className="p-3.5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 hover:border-[#D49B41]/30 transition-all">
                <div className="font-black text-white text-lg flex items-baseline gap-1">
                  0%
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Free Setup</span>
                </div>
                <div className="text-slate-300 text-[11px] font-medium">Upfront Onboarding Fee</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 hover:border-[#D49B41]/30 transition-all">
                <div className="font-black text-[#D49B41] text-lg">24/7</div>
                <div className="text-slate-300 text-[11px] font-medium">Front Desk Matrix</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 hover:border-[#D49B41]/30 transition-all">
                <div className="font-black text-emerald-300 text-lg">45 Min</div>
                <div className="text-slate-300 text-[11px] font-medium">Soft Hold Overbooking Shield</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 hover:border-[#D49B41]/30 transition-all">
                <div className="font-black text-[#E2AE55] text-lg">Direct</div>
                <div className="text-slate-300 text-[11px] font-medium">Bank & GCash Settlements</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Step Wizard Navigation Stepper */}
        <div className="mb-8 bg-[#1A1F26]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 relative z-10">
            {/* Step 1 Tab */}
            <button
              type="button"
              onClick={() => step > 1 && setStep(1)}
              disabled={step === 1}
              className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all relative ${
                step === 1
                  ? 'bg-gradient-to-r from-[#1E3A2B] to-[#162C20] text-white border border-[#D49B41]/60 shadow-lg shadow-[#1E3A2B]/40 ring-1 ring-[#D49B41]/30'
                  : step > 1
                  ? 'bg-[#1E3A2B]/40 hover:bg-[#1E3A2B]/60 text-emerald-200 border border-[#3B5E43]/40 cursor-pointer'
                  : 'bg-white/5 text-slate-500 border border-transparent'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                  step > 1
                    ? 'bg-[#3B5E43] text-[#D49B41]'
                    : step === 1
                    ? 'bg-[#D49B41] text-[#1E3A2B]'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {step > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">Property Info</div>
                <div className="text-[10px] text-slate-400 hidden sm:block truncate">
                  Identity & Amenities
                </div>
              </div>
            </button>

            {/* Step 2 Tab */}
            <button
              type="button"
              onClick={() => step > 2 && setStep(2)}
              disabled={step < 2}
              className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all relative ${
                step === 2
                  ? 'bg-gradient-to-r from-[#1E3A2B] to-[#162C20] text-white border border-[#D49B41]/60 shadow-lg shadow-[#1E3A2B]/40 ring-1 ring-[#D49B41]/30'
                  : step > 2
                  ? 'bg-[#1E3A2B]/40 hover:bg-[#1E3A2B]/60 text-emerald-200 border border-[#3B5E43]/40 cursor-pointer'
                  : 'bg-white/5 text-slate-500 border border-transparent cursor-not-allowed'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                  step > 2
                    ? 'bg-[#3B5E43] text-[#D49B41]'
                    : step === 2
                    ? 'bg-[#D49B41] text-[#1E3A2B]'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {step > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">Permit & Payout</div>
                <div className="text-[10px] text-slate-400 hidden sm:block truncate">
                  Verification & Bank
                </div>
              </div>
            </button>

            {/* Step 3 Tab */}
            <button
              type="button"
              disabled={step < 3}
              className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all relative ${
                step === 3
                  ? 'bg-gradient-to-r from-[#1E3A2B] to-[#162C20] text-white border border-[#D49B41]/60 shadow-lg shadow-[#1E3A2B]/40 ring-1 ring-[#D49B41]/30'
                  : 'bg-white/5 text-slate-500 border border-transparent cursor-not-allowed'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                  step === 3 ? 'bg-[#D49B41] text-[#1E3A2B]' : 'bg-white/10 text-slate-400'
                }`}
              >
                3
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">Owner Login</div>
                <div className="text-[10px] text-slate-400 hidden sm:block truncate">
                  Master Credentials
                </div>
              </div>
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#D49B41] via-[#E2AE55] to-[#D49B41] transition-all duration-500 ease-out"
              style={{
                width: step === 1 ? '33.33%' : step === 2 ? '66.66%' : '100%',
              }}
            />
          </div>
        </div>

        {/* Main Form Container Card */}
        <div className="bg-[#181D23]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-9 shadow-2xl relative">
          {/* STEP 1: PROPERTY INFORMATION */}
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-8">
              {/* Step Header */}
              <div className="flex items-center justify-between pb-5 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E3A2B] to-[#12241A] border border-[#D49B41]/40 flex items-center justify-center text-[#E2AE55] shadow-md">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Step 1: Property Identity & Location
                    </h2>
                    <p className="text-xs text-slate-400">
                      Showcase your hotel, inn, or boutique retreat to domestic and international travelers.
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-white/5 text-[11px] font-semibold text-slate-300 border border-white/10">
                  Step 1 of 3
                </span>
              </div>

              {/* Basic Details Group */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>
                        Hotel or Inn Name <span className="text-[#D49B41]">*</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        Appears on guest vouchers & receipts
                      </span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bukidnon Highland Pine Inn & Suites"
                        value={formData.hotel_name}
                        onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })}
                        className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Catchy Tagline</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        One-sentence guest highlight
                      </span>
                    </label>
                    <div className="relative">
                      <Sparkles className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="e.g. Peaceful mountain lodge near the city center with panoramic sunrise views"
                        value={formData.tagline}
                        onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                        className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                      Property Overview / Story
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Share the unique charm, heritage, amenities, and guest experience offered at your property..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Hospitality Category Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5">
                    Property Hospitality Style <span className="text-[#D49B41]">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {CATEGORY_OPTIONS.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = formData.category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.id })}
                          className={`p-3.5 rounded-2xl text-left transition-all border relative flex items-start gap-3 ${
                            isSelected
                              ? 'bg-gradient-to-br from-[#1E3A2B] to-[#15271D] border-[#D49B41] shadow-lg shadow-[#1E3A2B]/40 ring-1 ring-[#D49B41]/40'
                              : 'bg-[#111418] border-white/10 hover:border-white/20 hover:bg-[#14191F]'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#D49B41] text-[#1E3A2B]'
                                : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 pr-4">
                            <div className="text-xs font-bold text-white leading-tight">
                              {cat.name}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {cat.desc}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#D49B41] text-[#1E3A2B] flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Location Section */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-[#D49B41]" />
                    <span>Location & Contact Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Country / Jurisdiction <span className="text-[#D49B41]">*</span>
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) => {
                          const code = e.target.value;
                          const names: Record<string, string> = {
                            PH: 'Philippines',
                            JP: 'Japan',
                            ID: 'Indonesia',
                            TH: 'Thailand',
                            US: 'United States',
                            XX: 'International Destination',
                          };
                          setFormData({
                            ...formData,
                            country: code,
                            country_name: names[code] || 'International',
                            currency: code === 'JP' ? 'JPY' : code === 'US' ? 'USD' : 'PHP',
                          });
                        }}
                        className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
                      >
                        <option value="PH">🇵🇭 Philippines (PHP ₱)</option>
                        <option value="JP">🇯🇵 Japan (JPY ¥)</option>
                        <option value="ID">🇮🇩 Indonesia (IDR Rp)</option>
                        <option value="TH">🇹🇭 Thailand (THB ฿)</option>
                        <option value="US">🇺🇸 United States (USD $)</option>
                        <option value="XX">🌏 Other International Destination</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        City / Municipality <span className="text-[#D49B41]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Malaybalay City, Boracay, Baguio"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Complete Street Address <span className="text-[#D49B41]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Barangay 7, Fortich Street, near Provincial Capitol"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Province / State / Region
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bukidnon, Benguet, Aklan"
                        value={formData.province}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                        className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Front Desk Phone
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                        <input
                          type="tel"
                          placeholder="+63 917 000 0000"
                          value={formData.contact_phone}
                          onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                          className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Official Inquiries / Reservations Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                        <input
                          type="email"
                          placeholder="reservations@yourhotel.ph"
                          value={formData.contact_email}
                          onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                          className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                        />
                      </div>
                    </div>

                    {/* Interactive Hotel Location Map Picker */}
                    <div className="sm:col-span-2 pt-2">
                      <LocationPickerMap
                        latitude={formData.latitude}
                        longitude={formData.longitude}
                        onChange={(lat, lng) =>
                          setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                        }
                        defaultCity={formData.city || 'Malaybalay City, Bukidnon'}
                        label="Pin Property Location on Map"
                        height="h-64 sm:h-72"
                      />
                    </div>
                  </div>
                </div>

                {/* Cover Photo with Live Preview & Presets */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#D49B41]" />
                      <span>Property Showcase Cover Photo</span>
                    </label>
                    <span className="text-[11px] text-slate-400">High-resolution banner</span>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none font-mono text-xs"
                    />

                    {/* Quick Photo Presets */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#D49B41]" />
                        Presets:
                      </span>
                      {PRESET_PHOTOS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: preset.url })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                            formData.image_url === preset.url
                              ? 'bg-[#1E3A2B] text-[#E2AE55] border-[#D49B41]/60'
                              : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Live Marketplace Preview Card */}
                    <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/40 shadow-xl group aspect-[16/7] sm:aspect-[21/9]">
                      <img
                        src={
                          formData.image_url ||
                          'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'
                        }
                        alt="Property Preview"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                          // Fallback on broken image
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4 sm:p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#1E3A2B]/90 border border-[#D49B41]/40 text-[#E2AE55] text-[11px] font-bold">
                            {selectedCategoryObj.name}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-semibold flex items-center gap-1 backdrop-blur-md">
                            <Star className="w-3 h-3 fill-[#D49B41] text-[#D49B41]" />
                            <span>5.0 (New Partner)</span>
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                          {formData.hotel_name || 'Your Property Name Here'}
                        </h3>
                        <p className="text-slate-300 text-xs mt-0.5 flex items-center gap-1.5 drop-shadow">
                          <MapPin className="w-3.5 h-3.5 text-[#D49B41]" />
                          <span>
                            {formData.city || 'City / Municipality'},{' '}
                            {formData.province || formData.country_name}
                          </span>
                        </p>
                      </div>

                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Live Marketplace Card Preview</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amenities Selection */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Property Amenities & Features
                    </label>
                    <span className="text-[11px] text-[#D49B41] font-semibold">
                      {formData.amenities.length} selected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {COMMON_AMENITIES.map((amenity) => {
                      const isSelected = formData.amenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          className={`p-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border text-left ${
                            isSelected
                              ? 'bg-gradient-to-r from-[#1E3A2B] to-[#172D20] text-white border-[#D49B41]/60 shadow-sm'
                              : 'bg-[#111418] text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#D49B41] text-[#1E3A2B]'
                                : 'bg-white/10 text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span className="truncate">{amenity}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Nav Action */}
              <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-[#D49B41] via-[#E2AE55] to-[#BF8832] hover:brightness-110 text-[#12241A] font-black text-xs uppercase tracking-wider shadow-xl shadow-[#D49B41]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Continue to Permit & Payout</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: BUSINESS PERMIT & PAYOUT */}
          {step === 2 && (
            <form onSubmit={handleNext} className="space-y-8">
              {/* Step Header */}
              <div className="flex items-center justify-between pb-5 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E3A2B] to-[#12241A] border border-[#D49B41]/40 flex items-center justify-center text-[#E2AE55] shadow-md">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Step 2: Business Verification & Automated Payouts
                    </h2>
                    <p className="text-xs text-slate-400">
                      Required for host authenticity badge and automated guest reservation disbursements.
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-white/5 text-[11px] font-semibold text-slate-300 border border-white/10">
                  Step 2 of 3
                </span>
              </div>

              {/* Security Trust Note */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1E3A2B]/40 via-[#182B20]/40 to-[#12241A]/40 border border-[#3B5E43]/40 flex items-start gap-3.5 text-xs text-emerald-200">
                <ShieldCheck className="w-5 h-5 text-[#D49B41] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-white">Bank-Grade Host Security Guarantee</p>
                  <p className="text-slate-300 leading-relaxed">
                    Your business permits, tax identification, and settlement accounts are protected with 256-bit encryption. LocalStay verifies lodging partners within 24 hours while granting instant draft portal access.
                  </p>
                </div>
              </div>

              {/* Compliance & Legal Credentials */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-[#D49B41]" />
                  <span>Business License & Registration</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>
                        Mayor's / Business Permit No. <span className="text-[#D49B41]">*</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">LGU or DTI</span>
                    </label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. BP-2026-MALAY-8821 / DTI-04928"
                        value={formData.business_permit_number}
                        onChange={(e) =>
                          setFormData({ ...formData, business_permit_number: e.target.value })
                        }
                        className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Enables the Verified Lodging Partner badge on guest searches.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>BIR TIN (Tax ID)</span>
                      <span className="text-[11px] text-slate-400 font-normal">Optional for invoice</span>
                    </label>
                    <div className="relative">
                      <BadgeCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="e.g. 123-456-789-000"
                        value={formData.bir_tin}
                        onChange={(e) => setFormData({ ...formData, bir_tin: e.target.value })}
                        className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Used for automated official tax receipt generation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payout & Revenue Disbursement Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <CreditCard className="w-4 h-4 text-[#D49B41]" />
                    <span>Guest Payout Disbursement Channel</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    24-hr settlement after check-in
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-[#111418] border border-white/10 space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      Select Settlement Channel <span className="text-[#D49B41]">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: 'GCash', name: 'GCash', sub: 'Instant PH E-Wallet' },
                        { id: 'Maya', name: 'Maya', sub: 'Digital Bank PH' },
                        { id: 'BDO', name: 'BDO Unibank', sub: 'Commercial Bank' },
                        { id: 'BPI', name: 'BPI Bank', sub: 'Commercial Bank' },
                        { id: 'UnionBank', name: 'UnionBank', sub: 'Commercial Bank' },
                        { id: 'Metrobank', name: 'Metrobank', sub: 'Commercial Bank' },
                        { id: 'Stripe', name: 'Stripe Connect', sub: 'Global Multi-Currency' },
                        { id: 'Wise', name: 'Wise Business', sub: 'International Wire' },
                      ].map((channel) => (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, payout_method: channel.id })}
                          className={`p-3 rounded-xl text-left border transition-all ${
                            formData.payout_method === channel.id
                              ? 'bg-gradient-to-br from-[#1E3A2B] to-[#15271D] border-[#D49B41] shadow-md ring-1 ring-[#D49B41]/40'
                              : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          <div className="text-xs font-bold text-white">{channel.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{channel.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Account Holder Full Legal Name <span className="text-[#D49B41]">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Juan Manuel Dela Cruz"
                          value={formData.payout_account_name}
                          onChange={(e) =>
                            setFormData({ ...formData, payout_account_name: e.target.value })
                          }
                          className="w-full bg-[#161A20] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Account / Mobile Phone Number <span className="text-[#D49B41]">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. 0917 123 4567 or Bank Account No."
                          value={formData.payout_account_number}
                          onChange={(e) =>
                            setFormData({ ...formData, payout_account_number: e.target.value })
                          }
                          className="w-full bg-[#161A20] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Nav Actions */}
              <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Property Info</span>
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-[#D49B41] via-[#E2AE55] to-[#BF8832] hover:brightness-110 text-[#12241A] font-black text-xs uppercase tracking-wider shadow-xl shadow-[#D49B41]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Continue to Owner Account</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: OWNER CREDENTIALS & LAUNCH */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Step Header */}
              <div className="flex items-center justify-between pb-5 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E3A2B] to-[#12241A] border border-[#D49B41]/40 flex items-center justify-center text-[#E2AE55] shadow-md">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Step 3: Hotel Owner Administrator Credentials
                    </h2>
                    <p className="text-xs text-slate-400">
                      Create your master administrative account to access your property dashboard, assign staff, and track bookings.
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-white/5 text-[11px] font-semibold text-slate-300 border border-white/10">
                  Step 3 of 3
                </span>
              </div>

              {/* Owner Profile Grid */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <User className="w-4 h-4 text-[#D49B41]" />
                  <span>Owner & Legal Representative Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      First Name <span className="text-[#D49B41]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Juan"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Last Name <span className="text-[#D49B41]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dela Cruz"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Direct Mobile Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        type="tel"
                        placeholder="+63 917 123 4567"
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Primary Email Address <span className="text-[#D49B41]">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        type="email"
                        required
                        placeholder="owner@yourhotel.ph"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Administrator Login Credentials */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <Lock className="w-4 h-4 text-[#D49B41]" />
                  <span>Master Administrator Login Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>
                        Admin Username <span className="text-[#D49B41]">*</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        Unique identifier for owner portal login
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. juan_hoteladmin"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Master Password <span className="text-[#D49B41]">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="At least 6 characters"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Confirm Master Password <span className="text-[#D49B41]">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Re-enter password"
                        value={formData.confirm_password}
                        onChange={(e) =>
                          setFormData({ ...formData, confirm_password: e.target.value })
                        }
                        className="w-full bg-[#111418] border border-white/10 hover:border-white/20 focus:border-[#D49B41] focus:ring-2 focus:ring-[#D49B41]/20 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Password Validation Status */}
                  {formData.password && (
                    <div className="sm:col-span-2 flex items-center gap-3 text-xs">
                      {formData.password.length >= 6 ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Password length requirement met
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">
                          • Requires at least 6 characters
                        </span>
                      )}

                      {formData.confirm_password && (
                        formData.password === formData.confirm_password ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Passwords match
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1">
                            • Passwords do not match
                          </span>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Pre-Launch Application Summary Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/10">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D49B41]" />
                    Application Snapshot
                  </span>
                  <span className="text-[11px] text-[#D49B41] normal-case font-medium">Ready to submit</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Property:</span>
                    <span className="font-bold text-white truncate block">
                      {formData.hotel_name || 'Pending Name'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formData.city || 'City'}, {formData.province || formData.country_name}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Category & Amenities:</span>
                    <span className="font-bold text-emerald-300 block">
                      {selectedCategoryObj.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formData.amenities.length} amenities selected
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Disbursement Channel:</span>
                    <span className="font-bold text-[#E2AE55] block">
                      {formData.payout_method}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formData.payout_account_number ? `••• ${formData.payout_account_number.slice(-4)}` : 'Account set'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Policy & Terms Checkbox */}
              <label className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/[0.07] transition-colors">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#D49B41] focus:ring-[#D49B41] border-white/20 bg-black/40"
                />
                <div className="text-xs text-slate-300 leading-relaxed">
                  I agree to the <span className="text-white font-bold underline">LocalStay Merchant Partner Terms</span>, including the automated 45-minute soft room hold policy and front desk check-in verification protocols.
                </div>
              </label>

              {/* Bottom Nav Actions */}
              <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Verification</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#D49B41] via-[#E2AE55] to-[#BF8832] hover:brightness-110 text-[#12241A] font-black text-xs uppercase tracking-wider shadow-2xl shadow-[#D49B41]/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Master Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Property Application</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Safe Footnote / Help note */}
        <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#D49B41]" />
          <span>Need help setting up your hotel or inn? Contact our LocalStay Concierge at </span>
          <a href="mailto:partners@localstay.ph" className="text-emerald-400 font-bold hover:underline">
            partners@localstay.ph
          </a>
        </div>
      </div>
    </div>
  );
};
