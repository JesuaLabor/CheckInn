import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Hotel } from '../types';
import { useCurrencyStore } from '../stores/currencyStore';
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
  Navigation,
  Globe,
  Palmtree,
  Mountain,
  Landmark,
  Trees,
} from 'lucide-react';

interface MarketplaceProps {
  onSelectHotel: (slug: string) => void;
}

type TravelCategory = 'all' | 'beach' | 'mountain' | 'heritage' | 'city' | 'eco';

export const Marketplace: React.FC<MarketplaceProps> = ({ onSelectHotel }) => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [guestFilter, setGuestFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [activeCategory, setActiveCategory] = useState<TravelCategory>('all');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [locating, setLocating] = useState(false);

  const { formatPrice, currency } = useCurrencyStore();

  useEffect(() => {
    fetchHotels();
  }, [activeCategory, selectedDestination]);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.q = searchQuery;
      if (guestFilter) params.guests = guestFilter;
      if (maxPrice) params.max_price = maxPrice;

      if (activeCategory !== 'all') {
        params.category = activeCategory;
      }

      if (selectedDestination) {
        params.city = selectedDestination;
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
    setSelectedDestination('');
    fetchHotels();
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        // Search lodgings closest to latitude/longitude
        api
          .get('/inns/', {
            params: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            },
          })
          .then((res) => {
            setHotels(res.data.results || res.data || []);
          })
          .catch(() => {
            fetchHotels();
          });
      },
      () => {
        setLocating(false);
        alert('Could not determine your current location. Please select a destination.');
      }
    );
  };

  const getAmenityIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('wi-fi') || lower.includes('internet')) return <Wifi className="w-3 h-3 text-[#3B5E43]" />;
    if (lower.includes('coffee') || lower.includes('breakfast')) return <Coffee className="w-3 h-3 text-[#D49B41]" />;
    if (lower.includes('parking')) return <Car className="w-3 h-3 text-[#212529]" />;
    if (lower.includes('air') || lower.includes('breeze')) return <Wind className="w-3 h-3 text-[#3B5E43]" />;
    return <Sparkles className="w-3 h-3 text-[#D49B41]" />;
  };

  const getCountryFlag = (country?: string) => {
    switch ((country || '').toUpperCase()) {
      case 'PH':
        return '🇵🇭';
      case 'JP':
        return '🇯🇵';
      case 'ID':
        return '🇮🇩';
      case 'TH':
        return '🇹🇭';
      case 'US':
        return '🇺🇸';
      default:
        return '🌏';
    }
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'beach':
        return { label: 'Beach & Island', icon: <Palmtree className="w-3 h-3 text-cyan-600" />, bg: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
      case 'mountain':
        return { label: 'Highland & Mountain', icon: <Mountain className="w-3 h-3 text-emerald-700" />, bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'heritage':
        return { label: 'Heritage & Culture', icon: <Landmark className="w-3 h-3 text-amber-700" />, bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'city':
        return { label: 'Urban & City', icon: <Building className="w-3 h-3 text-slate-700" />, bg: 'bg-slate-100 text-slate-800 border-slate-200' };
      case 'eco':
        return { label: 'Eco & Nature', icon: <Trees className="w-3 h-3 text-green-700" />, bg: 'bg-green-50 text-green-800 border-green-200' };
      default:
        return { label: 'Local Stay', icon: <Sparkles className="w-3 h-3 text-[#D49B41]" />, bg: 'bg-[#FAF8F5] text-[#1E3A2B] border-[#E8E2D8]' };
    }
  };

  return (
    <div className="min-h-screen pb-28 md:pb-20">
      {/* Hero Section with Scalable Atmosphere */}
      <section className="relative bg-gradient-to-br from-[#212529] via-[#1E3A2B] to-[#141A16] text-white pt-24 pb-24 sm:pt-32 sm:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle decorative glow & grid pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D49B41_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#D49B41]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#3B5E43]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
          {/* Universal Scope Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#3B5E43]/25 text-[#E2AE55] text-xs font-bold border border-[#D49B41]/35 backdrop-blur-md animate-in fade-in duration-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#D49B41] animate-ping"></span>
            Verified Boutique & Heritage Inns • Philippines & Abroad
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Stay Authentic Across the Philippines & Beyond
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Discover verified boutique hotels, mountain lodges, and coastal inns. Enjoy instant front-desk reviews, a 45-minute guaranteed soft hold, and QR check-in.
          </p>

          {/* Floating Search Container */}
          <div className="pt-4 max-w-3xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white/95 backdrop-blur-xl text-slate-800 rounded-3xl sm:rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.35)] p-2 sm:p-2.5 flex flex-col sm:flex-row gap-2 items-stretch border border-white/60"
            >
              {/* Destination Search */}
              <div className="flex-1 relative flex items-center px-3">
                <Search className="w-5 h-5 text-slate-400 shrink-0 mr-2" />
                <input
                  type="text"
                  placeholder="Destination, city, or hotel (e.g. Boracay, Baguio, Tokyo)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2.5 text-xs sm:text-sm font-medium bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-slate-400"
                />
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block self-center"></div>

              {/* Guests Filter */}
              <div className="flex items-center px-3 sm:w-36 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
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

              {/* Budget Filter */}
              <div className="flex items-center px-3 sm:w-36 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                <SlidersHorizontal className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <select
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-700 bg-transparent border-0 focus:ring-0 outline-none cursor-pointer"
                >
                  <option value="">Any Budget</option>
                  <option value="1500">{formatPrice(1500)}</option>
                  <option value="2500">{formatPrice(2500)}</option>
                  <option value="4000">{formatPrice(4000)}</option>
                </select>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl sm:rounded-full bg-gradient-to-r from-[#D49B41] to-[#BF8832] hover:brightness-105 text-[#212529] font-black text-xs shadow-md shadow-[#D49B41]/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Find Rooms</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>

            {/* Popular Destinations Quick Chips */}
            <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 mt-4 text-xs">
              <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Globe className="w-3 h-3 text-[#D49B41]" /> Top Hubs:
              </span>
              {[
                { label: 'All Destinations', value: '' },
                { label: '🇵🇭 Boracay', value: 'Boracay' },
                { label: '🇵🇭 Siargao', value: 'Siargao' },
                { label: '🇵🇭 Baguio', value: 'Baguio' },
                { label: '🇵🇭 Cebu', value: 'Cebu' },
                { label: '🇵🇭 Manila', value: 'Manila' },
                { label: '🇵🇭 Malaybalay', value: 'Malaybalay' },
                { label: '🇯🇵 Tokyo', value: 'Tokyo' },
                { label: '🇮🇩 Bali', value: 'Bali' },
              ].map((dest) => (
                <button
                  key={dest.value}
                  onClick={() => {
                    setSelectedDestination(dest.value);
                    setSearchQuery(dest.value);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    selectedDestination === dest.value
                      ? 'bg-[#D49B41] text-[#212529] shadow-sm'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {dest.label}
                </button>
              ))}

              <button
                onClick={handleNearMe}
                disabled={locating}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100 text-[11px] font-bold border border-emerald-500/40 transition-all"
                title="Search lodgings closest to your location"
              >
                <Navigation className={`w-3 h-3 ${locating ? 'animate-spin' : ''}`} />
                <span>{locating ? 'Locating...' : 'Near Me'}</span>
              </button>
            </div>

            {/* Travel Style Category Chips */}
            <div className="flex items-center justify-center flex-wrap gap-2 mt-3 text-xs">
              {[
                { key: 'all', label: '🌟 All Stays' },
                { key: 'beach', label: '🏝️ Beach & Island' },
                { key: 'mountain', label: '🌲 Highland & Mountain' },
                { key: 'heritage', label: '🏛️ Heritage & Culture' },
                { key: 'city', label: '🏙️ Urban & City' },
                { key: 'eco', label: '🌿 Eco & Nature' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key as TravelCategory)}
                  className={`px-3 py-1.5 rounded-full font-bold text-xs transition-all ${
                    activeCategory === cat.key
                      ? 'bg-[#1E3A2B] text-white border border-[#D49B41]/50 shadow-sm ring-2 ring-[#D49B41]/25'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-12 relative z-10">
        
        {/* Value Trust Ribbon */}
        <div className="bg-white rounded-2xl shadow-xl shadow-[#1E3A2B]/5 border border-[#E8E2D8] p-4 sm:p-5 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E8E2D8]">
          <div className="flex items-center gap-3.5 sm:px-3 pt-2 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] text-[#1E3A2B] border border-[#E8E2D8] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#1E3A2B]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#212529]">45-Minute Hold Protection</h3>
              <p className="text-[11px] text-slate-500">Soft hold locks room inventory during front-desk review.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 sm:px-3 pt-3 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] text-[#D49B41] border border-[#E8E2D8] flex items-center justify-center shrink-0">
              <Building className="w-5 h-5 text-[#D49B41]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#212529]">Verified Local Stays</h3>
              <p className="text-[11px] text-slate-500">Curated independent inns, heritage lodges, & villas.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 sm:px-3 pt-3 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] text-[#3B5E43] border border-[#E8E2D8] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#3B5E43]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#212529]">Instant QR Mobile Pass</h3>
              <p className="text-[11px] text-slate-500">Scan at the front desk for fast, paperless check-in.</p>
            </div>
          </div>
        </div>

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#212529] tracking-tight">
              Featured Lodgings & Stays
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose your accommodation to inspect room photos, amenities, and book directly. Displayed in {currency}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FAF8F5] text-[#1E3A2B] border border-[#E8E2D8]">
              {hotels.length} {hotels.length === 1 ? 'Stay Available' : 'Stays Available'}
            </span>
          </div>
        </div>

        {/* Lodging Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl border border-[#E8E2D8] overflow-hidden shadow-xs animate-pulse">
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
          <div className="text-center py-16 bg-white rounded-3xl border border-[#E8E2D8] p-8 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF8F5] flex items-center justify-center mx-auto mb-4 text-slate-400 border border-[#E8E2D8]">
              <Building className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-[#212529]">No lodgings matched your filters</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              We couldn't find available inns matching your current criteria. Try resetting your search filters or exploring all destinations.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E3A2B] hover:bg-[#3B5E43] text-white text-xs font-bold shadow-md active:scale-95 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {hotels.map((hotel) => {
              const categoryBadge = getCategoryBadge(hotel.category);
              return (
                <article
                  key={hotel.id}
                  onClick={() => onSelectHotel(hotel.slug)}
                  className="group bg-white rounded-3xl border border-[#E8E2D8] hover:border-[#3B5E43] overflow-hidden shadow-sm hover:shadow-2xl card-hover-lift cursor-pointer flex flex-col transition-all duration-300"
                >
                  {/* Image Banner */}
                  <div className="relative h-60 sm:h-64 overflow-hidden bg-[#212529]">
                    <img
                      src={hotel.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'}
                      alt={hotel.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#212529]/90 via-[#212529]/25 to-transparent"></div>

                    {/* Location & Country Tag */}
                    <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5">
                      <span className="px-3 py-1 rounded-full bg-[#212529]/80 backdrop-blur-md text-[#FAF8F5] text-[11px] font-extrabold border border-white/10 shadow-md flex items-center gap-1">
                        <span>{getCountryFlag(hotel.country)}</span>
                        <span>{hotel.city}</span>
                      </span>
                    </div>

                    {/* Rating Pill */}
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#212529]/85 backdrop-blur-md text-[#D49B41] text-xs font-extrabold border border-[#D49B41]/25 shadow-md">
                      <Star className="w-3.5 h-3.5 fill-[#D49B41] text-[#D49B41]" />
                      <span>{hotel.rating}</span>
                      <span className="text-[10px] text-slate-300 font-normal">({hotel.review_count})</span>
                    </div>

                    {/* Hotel Name over gradient */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="mb-1.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md ${categoryBadge.bg}`}>
                          {categoryBadge.icon}
                          {categoryBadge.label}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white leading-tight drop-shadow-sm group-hover:text-[#D49B41] transition-colors">
                        {hotel.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-[#3B5E43] shrink-0" />
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
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#FAF8F5] text-[#212529] border border-[#E8E2D8]"
                          >
                            {getAmenityIcon(amenity)}
                            {amenity}
                          </span>
                        ))}
                        {(hotel.amenities || []).length > 3 && (
                          <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-[#FAF8F5] text-slate-500 border border-[#E8E2D8]">
                            +{(hotel.amenities || []).length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Footer: Price & CTA */}
                    <div className="pt-4 border-t border-[#E8E2D8]/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          Rate per night
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black text-[#1E3A2B]">
                            {formatPrice(Number(hotel.min_rate || 850))}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">/ night</span>
                        </div>
                      </div>

                      <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1E3A2B] group-hover:bg-[#3B5E43] text-white text-xs font-black shadow-sm shadow-[#1E3A2B]/20 group-hover:shadow-md transition-all">
                        <span>View Rooms</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
