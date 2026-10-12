import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Hotel, RoomType } from '../types';
import { useBookingDraftStore } from '../stores/bookingDraftStore';
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

  const { openBookingModal } = useBookingDraftStore();

  useEffect(() => {
    fetchHotelDetail();
  }, [slug]);

  const fetchHotelDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/inns/${slug}/`);
      setHotel(res.data);
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

  const handleReserve = (roomType: RoomType) => {
    if (!hotel) return;
    openBookingModal(hotel, roomType, { checkIn, checkOut, guests });
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
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
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
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Lodgings</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/80">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Front Desk Online</span>
        </div>
      </div>

      {/* Hero Showcase Card */}
      <section className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="relative h-72 sm:h-[420px] w-full overflow-hidden bg-slate-950">
          <img
            src={hotel.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent"></div>

          <div className="absolute bottom-6 left-6 right-6 text-white space-y-2 sm:space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-600 font-extrabold text-[11px] uppercase tracking-wider shadow-sm">
                {hotel.city}, {hotel.province}
              </span>
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-amber-300 text-xs font-bold border border-white/10">
                <Star className="w-3.5 h-3.5 fill-amber-300" />
                <span>{hotel.rating}</span>
                <span className="text-slate-300 font-normal">({hotel.review_count} verified reviews)</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-sm">
              {hotel.name}
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl font-light leading-relaxed">
              {hotel.tagline}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 border-t border-slate-100">
          
          {/* Description & Amenities */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                About the Property
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2 font-normal">
                {hotel.description || 'Experience authentic Bukidnon highland hospitality in Malaybalay City.'}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Property Amenities & Inclusions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(hotel.amenities || []).map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Location & Contact Sidecard */}
          <div className="bg-slate-50/80 p-5 sm:p-6 rounded-2xl border border-slate-200/80 space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Location & Contact Details
              </h3>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-medium text-slate-700">{hotel.address}</span>
                </div>
                {hotel.contact_phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium text-slate-700">{hotel.contact_phone}</span>
                  </div>
                )}
                {hotel.contact_email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium text-slate-700">{hotel.contact_email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2.5 text-xs text-emerald-900 font-bold bg-emerald-100/70 p-3 rounded-xl border border-emerald-200">
                <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>45-Min Soft Hold Guaranteed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Travel Dates Selector Bar */}
      <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-lg p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
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
              className="w-full sm:w-auto px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
            />
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Check-out:</span>
            <input
              type="date"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Guests:</span>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full sm:w-auto px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 cursor-pointer"
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
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Available Room Types
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select your preferred room to reserve with an automated 45-minute soft hold while staff approves.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {(hotel.room_types || []).map((rt) => {
            const totalPrice = Number(rt.base_rate) * nights;
            return (
              <div
                key={rt.id}
                className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-emerald-300 card-hover-lift transition-all duration-300 flex flex-col md:flex-row"
              >
                {/* Room Image */}
                <div className="md:w-80 h-56 md:h-auto shrink-0 relative bg-slate-900 overflow-hidden">
                  <img
                    src={
                      rt.photos && rt.photos.length > 0
                        ? rt.photos[0]
                        : 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80'
                    }
                    alt={rt.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1 border border-white/10">
                    <Users className="w-3 h-3 text-emerald-400" />
                    Up to {rt.capacity} guests
                  </div>
                </div>

                {/* Room Details & Pricing */}
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                          {rt.name}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {rt.description}
                        </p>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <div className="text-xl sm:text-2xl font-black text-slate-900">
                          ₱{Number(rt.base_rate).toLocaleString()}
                          <span className="text-xs font-normal text-slate-500"> / night</span>
                        </div>
                        {nights > 1 && (
                          <div className="text-[11px] font-bold text-emerald-700">
                            Total: ₱{totalPrice.toLocaleString()} for {nights} nights
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Room Amenities */}
                    <div className="flex flex-wrap gap-1.5 mt-3.5">
                      {(rt.amenities || []).map((a, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200/70"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Guarantee & Reserve Action */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Instant 45-min hold locks room inventory</span>
                    </div>

                    <button
                      onClick={() => handleReserve(rt)}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Reserve This Room</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
