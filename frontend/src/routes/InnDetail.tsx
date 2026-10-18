import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Hotel, RoomType, Review } from '../types';
import { useBookingDraftStore } from '../stores/bookingDraftStore';
import { useCurrencyStore } from '../stores/currencyStore';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Star,
  Users,
  Check,
  Calendar,
  Sparkles,
  ShieldCheck,
  Building,
  Clock,
  ChevronRight,
  Wifi,
  Bed,
  Wind,
  Coffee,
} from 'lucide-react';

interface InnDetailProps {
  slug: string;
  onBack: () => void;
  onOpenAuth: () => void;
}

export const InnDetail: React.FC<InnDetailProps> = ({ slug, onBack }) => {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState(2);

  const getAmenityIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('wi-fi') || lower.includes('wifi') || lower.includes('internet')) {
      return <Wifi className="w-2.5 h-2.5 text-[#3B5E43]" />;
    }
    if (lower.includes('air') || lower.includes('ac') || lower.includes('condition')) {
      return <Wind className="w-2.5 h-2.5 text-[#3B5E43]" />;
    }
    if (lower.includes('coffee') || lower.includes('breakfast')) {
      return <Coffee className="w-2.5 h-2.5 text-[#D49B41]" />;
    }
    if (lower.includes('bed') || lower.includes('kama')) {
      return <Bed className="w-2.5 h-2.5 text-[#D49B41]" />;
    }
    return <Sparkles className="w-2.5 h-2.5 text-[#3B5E43]" />;
  };

  const [reviews, setReviews] = useState<Review[]>([]);
  const { openBookingModal } = useBookingDraftStore();
  const { formatPrice } = useCurrencyStore();

  useEffect(() => {
    fetchHotelDetail();
  }, [slug]);

  const fetchHotelDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const [resHotel, resReviews] = await Promise.all([
        api.get(`/inns/${slug}/`),
        api.get(`/inns/${slug}/reviews/`).catch(() => ({ data: { reviews: [] } })),
      ]);
      setHotel(resHotel.data);
      setReviews(resReviews.data?.reviews || []);
    } catch {
      setError('Failed to load lodging details.');
    } finally {
      setLoading(false);
    }
  };

  const calculateNights = () => {
    try {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays);
    } catch {
      return 1;
    }
  };

  const nights = calculateNights();

  const handleReserve = (roomType: RoomType, stayType?: 'nightly' | 'hourly') => {
    if (!hotel) return;
    openBookingModal(hotel, roomType, { checkIn, checkOut, guests, stayType: stayType || 'nightly' });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 animate-pulse space-y-6">
        <div className="h-6 bg-slate-200 rounded w-1/4"></div>
        <div className="h-96 bg-slate-200 rounded-3xl animate-shimmer"></div>
        <div className="h-44 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <Building className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">{error || 'Lodging not found'}</h2>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1E3A2B] hover:bg-[#3B5E43] text-white text-xs font-bold shadow-md active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-28 md:pb-20 space-y-8">
      
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#1E3A2B] bg-white px-3.5 py-2 rounded-xl border border-[#E8E2D8] shadow-2xs transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Lodgings</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-bold text-[#1E3A2B] bg-[#3B5E43]/15 px-3 py-1.5 rounded-full border border-[#3B5E43]/30">
          <span className="w-2 h-2 rounded-full bg-[#3B5E43] animate-pulse"></span>
          <span>Live Front Desk Online</span>
        </div>
      </div>

      {/* Hero Showcase Card */}
      <section className="bg-white rounded-3xl border border-[#E8E2D8] overflow-hidden shadow-sm">
        <div className="relative min-h-[280px] h-72 sm:h-[420px] w-full overflow-hidden bg-[#212529]">
          <img
            src={hotel.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#212529]/95 via-[#212529]/35 to-transparent"></div>

          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 text-white space-y-1.5 sm:space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="px-2.5 sm:px-3 py-1 rounded-full bg-[#1E3A2B] font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider shadow-sm border border-[#3B5E43]/50">
                {hotel.city}, {hotel.province}
              </span>
              <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-[#212529]/80 backdrop-blur-md text-[#D49B41] text-[11px] sm:text-xs font-bold border border-[#D49B41]/25">
                <Star className="w-3.5 h-3.5 fill-[#D49B41] text-[#D49B41]" />
                <span>{hotel.rating}</span>
                <span className="text-slate-300 font-normal">({hotel.review_count} verified reviews)</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-sm">
              {hotel.name}
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl font-light leading-relaxed line-clamp-2 sm:line-clamp-none">
              {hotel.tagline}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 border-t border-[#E8E2D8]/80">
          
          {/* Description & Amenities */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-[#212529] tracking-tight">
                About the Property
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2 font-normal">
                {hotel.description || 'Experience authentic local hospitality, comfortable boutique rooms, and personalized service.'}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold text-[#212529] uppercase tracking-wider mb-3">
                Property Amenities & Inclusions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(hotel.amenities || []).map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-[#FAF8F5] px-3 py-2 rounded-xl border border-[#E8E2D8]">
                    <Check className="w-3.5 h-3.5 text-[#3B5E43] shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Location & Contact Sidecard */}
          <div className="bg-[#FAF8F5] p-5 sm:p-6 rounded-2xl border border-[#E8E2D8] space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              <h3 className="text-xs font-bold text-[#212529] uppercase tracking-wider">
                Location & Contact Details
              </h3>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#3B5E43] shrink-0 mt-0.5" />
                  <span className="font-medium text-slate-700">{hotel.address}</span>
                </div>
                {hotel.contact_phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-[#3B5E43] shrink-0" />
                    <span className="font-medium text-slate-700">{hotel.contact_phone}</span>
                  </div>
                )}
                {hotel.contact_email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-[#3B5E43] shrink-0" />
                    <span className="font-medium text-slate-700">{hotel.contact_email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#E8E2D8]">
              <div className="flex items-center gap-2.5 text-xs text-[#1E3A2B] font-bold bg-[#3B5E43]/15 p-3 rounded-xl border border-[#3B5E43]/30">
                <ShieldCheck className="w-4 h-4 text-[#1E3A2B] shrink-0" />
                <span>Guaranteed Booking • 50% Deposit</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Travel Dates Selector Bar */}
      <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-xl rounded-2xl border border-[#E8E2D8] shadow-lg p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] text-[#1E3A2B] border border-[#E8E2D8] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-[#1E3A2B]" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-[#212529]">
              Configuring Stay Duration
            </h3>
            <p className="text-[11px] text-slate-500">
              {nights} {nights === 1 ? 'night' : 'nights'} selected • Adjust to calculate accurate totals
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Check-in:</span>
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs font-semibold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
            />
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Check-out:</span>
            <input
              type="date"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs font-semibold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Guests:</span>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full sm:w-auto px-3 py-2 text-xs font-semibold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5] cursor-pointer"
            >
              <option value="1">1 Guest</option>
              <option value="2">2 Guests</option>
              <option value="3">3 Guests</option>
              <option value="4">4 Guests</option>
            </select>
          </div>
        </div>
      </div>

      {/* Available Room Types */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#212529] tracking-tight">
            Available Room Types
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select your preferred room to reserve with an upfront 50% deposit to guarantee your stay.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5 sm:gap-6">
          {(hotel.room_types || []).map((rt) => {
            const totalPrice = Number(rt.base_rate) * nights;
            return (
              <div
                key={rt.id}
                className="bg-white rounded-2xl sm:rounded-3xl border border-[#E8E2D8] overflow-hidden shadow-xs hover:shadow-xl hover:border-[#3B5E43] card-hover-lift transition-all duration-300 flex flex-col md:flex-row active:scale-[0.98]"
              >
                {/* Room Image */}
                <div className="w-full md:w-72 lg:w-80 h-36 sm:h-52 md:h-auto shrink-0 relative bg-[#212529] overflow-hidden">
                  <img
                    src={
                      rt.photos && rt.photos.length > 0
                        ? rt.photos[0]
                        : 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80'
                    }
                    alt={rt.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#212529]/80 backdrop-blur-md text-[#FAF8F5] text-[9px] sm:text-[11px] font-bold flex items-center gap-1 border border-white/10">
                    <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#D49B41]" />
                    <span><span className="hidden sm:inline">Up to </span>{rt.capacity} guests</span>
                  </div>
                </div>

                {/* Room Details & Pricing */}
                <div className="p-2.5 sm:p-5 md:p-7 flex-1 flex flex-col justify-between space-y-2 sm:space-y-4 min-w-0">
                  <div className="min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-2">
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-lg md:text-xl font-extrabold text-[#212529] leading-tight line-clamp-2 sm:line-clamp-none">
                          {rt.name}
                        </h3>
                        <p className="hidden sm:block text-xs text-slate-600 mt-1 leading-relaxed">
                          {rt.description}
                        </p>
                      </div>

                      <div className="text-left sm:text-right shrink-0 mt-0.5 sm:mt-0">
                        <div className="text-xs sm:text-xl md:text-2xl font-black text-[#1E3A2B] leading-none">
                          {formatPrice(Number(rt.base_rate))}
                          <span className="text-[9px] sm:text-xs font-normal text-slate-500"> /nt</span>
                        </div>
                        {nights > 1 && (
                          <div className="text-[9px] sm:text-[11px] font-bold text-[#D49B41] mt-0.5">
                            <span className="sm:hidden">{nights}n: {formatPrice(totalPrice)}</span>
                            <span className="hidden sm:inline">Total: {formatPrice(totalPrice)} for {nights} nights</span>
                          </div>
                        )}
                        {rt.short_stay_enabled && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[11px] font-extrabold text-[#8F611A] bg-[#D49B41]/15 px-2 py-0.5 rounded-full border border-[#D49B41]/30">
                              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#D49B41]" />
                              <span>Short-stay from {formatPrice(Number(rt.rate_3h || Math.round(Number(rt.base_rate) * 0.3)))} (3h)</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mobile Compact Amenities Preview */}
                    {rt.amenities && rt.amenities.length > 0 && (
                      <div className="sm:hidden flex flex-wrap gap-1 mt-1.5 mb-0.5">
                        {rt.amenities.slice(0, 2).map((a, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-[#FAF8F5] text-slate-700 border border-[#E8E2D8] max-w-[85px] truncate"
                          >
                            {getAmenityIcon(a)}
                            <span className="truncate">{a}</span>
                          </span>
                        ))}
                        {rt.amenities.length > 2 && (
                          <span className="text-[9px] font-bold text-slate-400 self-center px-0.5">
                            +{rt.amenities.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Desktop Room Amenities (Full List) */}
                    <div className="hidden sm:flex flex-wrap gap-1.5 mt-3.5">
                      {(rt.amenities || []).map((a, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#FAF8F5] text-[#212529] border border-[#E8E2D8]"
                        >
                          {getAmenityIcon(a)}
                          <span>{a}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Guarantee & Reserve Action */}
                  <div className="pt-2 sm:pt-4 border-t border-[#E8E2D8]/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 mt-auto">
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#1E3A2B] font-semibold">
                      <ShieldCheck className="w-4 h-4 text-[#3B5E43] shrink-0" />
                      <span>Mandatory 50% deposit locks room inventory</span>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      {rt.short_stay_enabled && (
                        <button
                          onClick={() => handleReserve(rt, 'hourly')}
                          className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-3 min-h-[36px] sm:min-h-[44px] rounded-xl bg-[#FAF8F5] hover:bg-[#E8E2D8]/50 text-[#1E3A2B] border border-[#1E3A2B]/30 font-extrabold text-[10px] sm:text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#3B5E43]" />
                          <span>Short-Stay</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleReserve(rt, 'nightly')}
                        className="flex-1 sm:flex-initial px-3 sm:px-6 py-2 sm:py-3 min-h-[36px] sm:min-h-[44px] rounded-xl bg-gradient-to-r from-[#1E3A2B] to-[#3B5E43] hover:from-[#162C20] hover:to-[#2F4D36] text-white font-extrabold text-[10px] sm:text-xs shadow-xs sm:shadow-md shadow-[#1E3A2B]/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Reserve</span>
                        <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Verified Guest Reviews & Ratings Section */}
      <section className="space-y-6 pt-4 border-t border-[#E8E2D8]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[#1E3A2B] text-xs font-extrabold uppercase tracking-wider mb-1">
              <Star className="w-3.5 h-3.5 fill-[#D49B41] text-[#D49B41]" />
              <span>Verified Guest Ratings</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#212529]">
              Reviews & Experiences
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Authentic reviews submitted by verified guests after completed checkouts.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-[#E8E2D8] shadow-xs">
            <div className="text-3xl font-black text-[#1E3A2B]">{hotel.rating}</div>
            <div>
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(Number(hotel.rating))
                        ? 'fill-amber-400 text-amber-500'
                        : 'text-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-slate-500 font-bold block mt-0.5">
                {hotel.review_count} verified {hotel.review_count === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-[#E8E2D8] text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 mx-auto flex items-center justify-center">
              <Star className="w-6 h-6 fill-amber-300 text-amber-500" />
            </div>
            <h4 className="text-sm font-bold text-[#212529]">No Guest Reviews Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Be among the first guests to reserve a stay at {hotel.name} and share your experience!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white p-5 rounded-2xl border border-[#E8E2D8] shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-xs text-[#212529] block">
                      {rev.guest_name || 'Verified Traveler'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Stayed {new Date(rev.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 rounded-full">
                    <div className="flex items-center text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${star <= rev.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-black text-amber-950">{rev.rating}/5</span>
                  </div>
                </div>

                {rev.comment ? (
                  <p className="text-xs text-slate-700 leading-relaxed font-medium italic">
                    "{rev.comment}"
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Rated without written feedback.</p>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-emerald-800 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Stay • Checkout Completed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
