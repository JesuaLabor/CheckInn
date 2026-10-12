import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import {
  Building2,
  ShieldCheck,
  CreditCard,
  User,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Clock,
  Check,
} from 'lucide-react';

interface PartnerRegisterProps {
  onBack: () => void;
  onSuccess: () => void;
}

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
];

export const PartnerRegister: React.FC<PartnerRegisterProps> = ({ onBack, onSuccess }) => {
  const { setSession } = useAuthStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Hotel Info
    hotel_name: '',
    tagline: '',
    description: '',
    address: '',
    city: 'Malaybalay City',
    province: 'Bukidnon',
    contact_phone: '',
    contact_email: '',
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    amenities: ['Free High-Speed Wi-Fi', 'Air Conditioning', 'En-suite Hot Shower', '24/7 Front Desk'],

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
    setError('');

    if (step === 1) {
      if (!formData.hotel_name.trim() || !formData.address.trim()) {
        setError('Please provide your Property Name and Complete Address.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.business_permit_number.trim()) {
        setError('Please enter your Business Permit or Registration Number for verification.');
        return;
      }
      if (!formData.payout_account_number.trim()) {
        setError('Please enter your GCash or Bank Account Number for guest payout disbursements.');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim() || !formData.email.trim() || !formData.password) {
      setError('Username, email, and password are required.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
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
        contact_phone: formData.contact_phone.trim() || formData.phone_number.trim(),
        contact_email: formData.contact_email.trim() || formData.email.trim(),
        image_url: formData.image_url.trim(),
        amenities: formData.amenities,

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
      setSuccessMessage(message || 'Application submitted successfully!');

      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Failed to submit registration. Please check your information.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back navigation */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Marketplace</span>
        </button>

        {/* Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/20 p-6 sm:p-8 mb-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Partner Onboarding</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                List Your Hotel or Inn on CheckInn
              </h1>
              <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
                Empower your front desk with digital reservations, automated room hold protection, and instant QR check-ins across Malaybalay City & Bukidnon.
              </p>
            </div>

            {/* Value Props */}
            <div className="grid grid-cols-2 gap-3 text-xs shrink-0">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="font-bold text-white text-base">0%</div>
                <div className="text-slate-400 text-[11px]">Upfront Setup Fee</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="font-bold text-emerald-400 text-base">24/7</div>
                <div className="text-slate-400 text-[11px]">Front Desk Matrix</div>
              </div>
            </div>
          </div>

          {/* Stepper Tabs */}
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-3 gap-2">
            <button
              onClick={() => step > 1 && setStep(1)}
              className={`flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                step === 1
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : step > 1
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-white/5 text-slate-500'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">
                {step > 1 ? <Check className="w-3 h-3" /> : '1'}
              </div>
              <span className="hidden sm:inline">Property Info</span>
            </button>

            <button
              onClick={() => step > 2 && setStep(2)}
              className={`flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                step === 2
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : step > 2
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-white/5 text-slate-500'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">
                {step > 2 ? <Check className="w-3 h-3" /> : '2'}
              </div>
              <span className="hidden sm:inline">Permit & Payout</span>
            </button>

            <button
              className={`flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                step === 3
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-white/5 text-slate-500'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">
                3
              </div>
              <span className="hidden sm:inline">Owner Login</span>
            </button>
          </div>
        </div>

        {/* Error / Success feedback */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-bold">Registration Alert</p>
              <p className="text-xs text-rose-400">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-bold">Application Received!</p>
              <p className="text-xs text-emerald-400">{successMessage}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Redirecting to your hotel management portal...
              </p>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* STEP 1: PROPERTY DETAILS */}
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Step 1: Property Information</h2>
                  <p className="text-xs text-slate-400">Tell guests about your hotel or inn.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Hotel or Inn Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bukidnon Highland Pine Inn"
                    value={formData.hotel_name}
                    onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Catchy Tagline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Peaceful mountain lodge near the city center"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Complete Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sayre Highway, Barangay Casisang, Malaybalay City"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Province</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Front Desk Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+63 917 000 0000"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Business Email
                  </label>
                  <input
                    type="email"
                    placeholder="reservations@yourhotel.ph"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Cover Photo Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Direct link to a high-resolution photo of your property.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    Property Amenities
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_AMENITIES.map((amenity) => {
                      const selected = formData.amenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            selected
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                              : 'bg-slate-950 text-slate-400 border border-white/10 hover:border-white/20'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>{amenity}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  <span>Continue to Permit & Payout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: BUSINESS PERMIT & PAYOUT */}
          {step === 2 && (
            <form onSubmit={handleNext} className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Step 2: Business Verification & Payout</h2>
                  <p className="text-xs text-slate-400">
                    Required for platform approval and automated guest payment disbursements.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Mayor's / Business Permit No. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BP-2026-MALAY-8821"
                    value={formData.business_permit_number}
                    onChange={(e) =>
                      setFormData({ ...formData, business_permit_number: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your local LGU or DTI registration reference.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    BIR TIN (Tax ID)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123-456-789-000"
                    value={formData.bir_tin}
                    onChange={(e) => setFormData({ ...formData, bir_tin: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span>Payout Account Details</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Payout Method
                        </label>
                        <select
                          value={formData.payout_method}
                          onChange={(e) =>
                            setFormData({ ...formData, payout_method: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="GCash">GCash</option>
                          <option value="Maya">Maya</option>
                          <option value="BDO">BDO Unibank</option>
                          <option value="BPI">Bank of the Philippine Islands (BPI)</option>
                          <option value="LandBank">Land Bank of the Philippines</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Account Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Juan Santos"
                          value={formData.payout_account_name}
                          onChange={(e) =>
                            setFormData({ ...formData, payout_account_name: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Account / Mobile Number *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 0917 123 4567"
                          value={formData.payout_account_number}
                          onChange={(e) =>
                            setFormData({ ...formData, payout_account_number: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  <span>Continue to Owner Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: OWNER CREDENTIALS */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Step 3: Hotel Owner Administrator Account</h2>
                  <p className="text-xs text-slate-400">
                    This account will hold full administrator permissions for your hotel to add staff, manage rooms, and view payouts.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Juan"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dela Cruz"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Owner Mobile Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+63 917 123 4567"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Owner Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="owner@yourhotel.ph"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Admin Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. juan_hoteladmin"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={formData.confirm_password}
                    onChange={(e) =>
                      setFormData({ ...formData, confirm_password: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              {/* Policy note */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3 text-xs text-slate-400">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  By submitting your application, your property will be placed in review by the CheckInn Platform Admin. You will be able to set up your rooms and staff members immediately while pending verification.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {loading ? (
                    <span>Submitting Application...</span>
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
      </div>
    </div>
  );
};
