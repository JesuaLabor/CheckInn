import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Hotel } from '../types';
import {
  Search,
  MapPin,
  Star,
  Users,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
  Wifi,
  Coffee,
  Car,
  Wind,
  ShieldCheck,
  Building,
  RotateCcw,
} from 'lucide-react';

interface MarketplaceProps {
  onSelectHotel: (slug: string) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ onSelectHotel }) => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [guestFilter, setGuestFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'budget' | 'mountain' | 'downtown'>('all');

  useEffect(() => {
    fetchHotels();
  }, [activeCategory]);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.q = searchQuery;
      if (guestFilter) params.guests = guestFilter;
      if (maxPrice) params.max_price = maxPrice;

      if (activeCategory === 'budget') {
        params.max_price = '1500';
      } else if (activeCategory === 'mountain') {
        params.q = 'Mountain';
      } else if (activeCategory === 'downtown') {
        params.q = 'Malaybalay';
      }

      const res = await api.get('/inns/', { params });
      setHotels(res.data.results || res.data || []);
    } catch {
      console.error('Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHotels();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setGuestFilter('');
    setMaxPrice('');
    setActiveCategory('all');
    fetchHotels();
  };

  const getAmenityIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('wi-fi') || lower.includes('internet')) return <Wifi className="w-3 h-3 text-emerald-600" />;
    if (lower.includes('coffee') || lower.includes('breakfast')) return <Coffee className="w-3 h-3 text-amber-600" />;
    if (lower.includes('parking')) return <Car className="w-3 h-3 text-blue-600" />;
    if (lower.includes('air') || lower.includes('breeze')) return <Wind className="w-3 h-3 text-teal-600" />;
    return <Sparkles className="w-3 h-3 text-emerald-500" />;
  };

  return (
    <div className="min-h-screen pb-28 md:pb-20">
      {/* Hero Section with Highland Atmosphere */}
      <section className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white pt-24 pb-24 sm:pt-32 sm:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle decorative glow & grid pattern */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold border border-emerald-500/30 backdrop-blur-md animate-in fade-in duration-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Malaybalay City • Bukidnon Highland Lodging Exchange
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Stay in the Cool Mountain Heart of Bukidnon
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Discover verified hotels, mountain lodges, and heritage inns in Malaybalay. Enjoy instant front-desk reviews, a 45-minute guaranteed soft hold, and QR check-in.
          </p>

          {/* Floating Search Container */}
          <div className="pt-4 max-w-3xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white/95 backdrop-blur-xl text-slate-800 rounded-3xl sm:rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-2 sm:p-2.5 flex flex-col sm:flex-row gap-2 items-stretch border border-white/60"
            >
              {/* Keyword Search */}
              <div className="flex-1 relative flex items-center px-3">
                <Search className="w-5 h-5 text-slate-400 shrink-0 mr-2" />
                <input
                  type="text"
                  placeholder="Hotel name, landmark, Sayre Hwy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2.5 text-xs sm:text-sm font-medium bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-slate-400"
                />
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block self-center"></div>

              {/* Guests */}
              <div className="flex items-center px-3 sm:w-40 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                <Users className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <select
                  value={guestFilter}
                  onChange={(e) => setGuestFilter(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-700 bg-transparent border-0 focus:ring-0 outline-none cursor-pointer"
                >
                  <option value="">Any Guests</option>
                  <option value="1">1 Guest</option>
                  <option value="2">2 Guests</option>
                  <option value="3">3 Guests</option>
                  <option value="4">4+ Guests</option>
                </select>
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block self-center"></div>

              {/* Budget */}
              <div className="flex items-center px-3 sm:w-40 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                <SlidersHorizontal className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <select
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-700 bg-transparent border-0 focus:ring-0 outline-none cursor-pointer"
                >
                  <option value="">Any Budget</option>
                  <option value="1200">Under ₱1,200</option>
                  <option value="2000">Under ₱2,000</option>
                  <option value="3500">Under ₱3,500</option>
                </select>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl sm:rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Find Rooms</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Filter Pills */}
            <div className="flex items-center justify-center flex-wrap gap-2 mt-4 text-xs">
              <button
                onClick={() => { setActiveCategory('all'); setSearchQuery(''); setGuestFilter(''); setMaxPrice(''); }}
                className={`px-3.5 py-1.5 rounded-full font-bold transition-all ${
                  activeCategory === 'all'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                All Lodgings
              </button>

              <button
                onClick={() => setActiveCategory('mountain')}
                className={`px-3.5 py-1.5 rounded-full font-bold transition-all ${
                  activeCategory === 'mountain'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                🌲 Mountain & Pine Inns
              </button>

              <button
                onClick={() => setActiveCategory('budget')}
                className={`px-3.5 py-1.5 rounded-full font-bold transition-all ${
                  activeCategory === 'budget'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                🏷️ Under ₱1,500
              </button>

              <button
                onClick={() => setActiveCategory('downtown')}
                className={`px-3.5 py-1.5 rounded-full font-bold transition-all ${
                  activeCategory === 'downtown'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                🏛️ Central Malaybalay
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-12 relative z-10">
        
        {/* Value Trust Ribbon */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-4 sm:p-5 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="flex items-center gap-3.5 sm:px-3 pt-2 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">45-Minute Hold Protection</h3>
              <p className="text-[11px] text-slate-500">Soft hold locks room inventory during staff review.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 sm:px-3 pt-3 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Building className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Verified Local Inns</h3>
              <p className="text-[11px] text-slate-500">Pine Hills, 1st Inn & Bukidnon Mountain View partners.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 sm:px-3 pt-3 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Instant QR Mobile Pass</h3>
              <p className="text-[11px] text-slate-500">Scan at the front desk for fast, paperless check-in.</p>
            </div>
          </div>
        </div>

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Featured Lodgings in Malaybalay
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose your accommodation to inspect room photos, amenities, and book directly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {hotels.length} {hotels.length === 1 ? 'Inn Available' : 'Inns Available'}
            </span>
          </div>
        </div>

        {/* Lodging Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs animate-pulse">
                <div className="h-60 bg-slate-200 animate-shimmer"></div>
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-slate-200 rounded-lg w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-10 bg-slate-200 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : hotels.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Building className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">No lodgings matched your filters</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              We couldn't find available inns matching your current criteria. Try resetting your search filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {hotels.map((hotel) => (
              <article
                key={hotel.id}
                onClick={() => onSelectHotel(hotel.slug)}
                className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-2xl hover:border-emerald-300 card-hover-lift cursor-pointer flex flex-col transition-all duration-300"
              >
                {/* Image Banner */}
                <div className="relative h-60 sm:h-64 overflow-hidden bg-slate-900">
                  <img
                    src={hotel.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'}
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent"></div>

                  {/* Location Tag */}
                  <div className="absolute top-3.5 left-3.5">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-300 text-[11px] font-extrabold border border-white/10 shadow-md">
                      {hotel.city}
                    </span>
                  </div>

                  {/* Rating Pill */}
                  <div className="absolute top-3.5 right-3.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-amber-300 text-xs font-extrabold border border-white/10 shadow-md">
                    <Star className="w-3.5 h-3.5 fill-amber-300" />
                    <span>{hotel.rating}</span>
                    <span className="text-[10px] text-slate-300 font-normal">({hotel.review_count})</span>
                  </div>

                  {/* Hotel Name over gradient */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-black text-white leading-tight drop-shadow-sm group-hover:text-emerald-300 transition-colors">
                      {hotel.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate text-[11px]">{hotel.address}</span>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                      {hotel.tagline || hotel.description}
                    </p>

                    {/* Amenities Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-3.5">
                      {(hotel.amenities || []).slice(0, 3).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200/80"
                        >
                          {getAmenityIcon(amenity)}
                          {amenity}
                        </span>
                      ))}
                      {(hotel.amenities || []).length > 3 && (
                        <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-50 text-slate-400 border border-slate-200/80">
                          +{(hotel.amenities || []).length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Footer: Price & CTA */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Rate per night
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-900">
                          ₱{Number(hotel.min_rate || 850).toLocaleString()}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">/ night</span>
                      </div>
                    </div>

                    <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm shadow-emerald-600/20 group-hover:shadow-md transition-all">
                      <span>View Rooms</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
