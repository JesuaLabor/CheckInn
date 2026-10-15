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
  Compass,
  Map as MapIcon,
  LayoutGrid,
  Columns2,
  Bed,
} from 'lucide-react';
import heroBgImage from '../assets/hero_bg.jpg';
import { HotelMap, MapBounds } from '../components/HotelMap';
import { calculateDistanceKm, formatDistance, getCurrentCoordinates, Coordinates } from '../utils/geo';
import { toast } from '../stores/toastStore';

interface HotelWithDistance extends Hotel {
  distance_km?: number | null;
}

interface MarketplaceProps {
  onSelectHotel: (slug: string) => void;
}

type TravelCategory = 'all' | 'beach' | 'mountain' | 'heritage' | 'city' | 'eco';
type ViewMode = 'grid' | 'map' | 'split';

export const Marketplace: React.FC<MarketplaceProps> = ({ onSelectHotel }) => {
  const [hotels, setHotels] = useState<HotelWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [guestFilter, setGuestFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [activeCategory, setActiveCategory] = useState<TravelCategory>('all');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [locating, setLocating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [nearestHotelId, setNearestHotelId] = useState<number | string | null>(null);
  const [hoveredHotelId, setHoveredHotelId] = useState<number | string | null>(null);
  const [showFloatingMapBtn, setShowFloatingMapBtn] = useState(false);

  const { formatPrice, currency } = useCurrencyStore();

  useEffect(() => {
    fetchHotels();
  }, [activeCategory, selectedDestination]);

  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingMapBtn(window.scrollY > 280);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      let results: HotelWithDistance[] = res.data.results || res.data || [];

      // If user location is known, attach distances and sort by proximity
      if (userLocation) {
        results = results.map((h) => {
          if (h.latitude !== null && h.latitude !== undefined && h.longitude !== null && h.longitude !== undefined) {
            const dist = calculateDistanceKm(
              userLocation.lat,
              userLocation.lng,
              Number(h.latitude),
              Number(h.longitude)
            );
            return { ...h, distance_km: dist };
          }
          return { ...h, distance_km: null };
        });

        results.sort((a, b) => {
          if (a.distance_km === null) return 1;
          if (b.distance_km === null) return -1;
          return (a.distance_km || 0) - (b.distance_km || 0);
        });

        if (results.length > 0 && results[0].distance_km !== null) {
          setNearestHotelId(results[0].id);
        }
      }

      setHotels(results);
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
    setUserLocation(null);
    setNearestHotelId(null);
    fetchHotels();
  };

  const handleNearMe = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentCoordinates();
      setUserLocation(coords);

      // Attach distance to current hotel list
      const withDistances = hotels.map((h) => {
        if (h.latitude !== null && h.latitude !== undefined && h.longitude !== null && h.longitude !== undefined) {
          const dist = calculateDistanceKm(
            coords.lat,
            coords.lng,
            Number(h.latitude),
            Number(h.longitude)
          );
          return { ...h, distance_km: dist };
        }
        return { ...h, distance_km: null };
      });

      withDistances.sort((a, b) => {
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return (a.distance_km || 0) - (b.distance_km || 0);
      });

      setHotels(withDistances);
      if (withDistances.length > 0 && withDistances[0].distance_km !== null) {
        setNearestHotelId(withDistances[0].id);
      }

      // If on desktop screen, default to Split view to show both card & map
      if (window.innerWidth >= 1024) {
        setViewMode('split');
      } else {
        setViewMode('map');
      }

      // Smooth scroll to listings section
      const section = document.getElementById('listings-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    } catch {
      alert('Could not determine your location. Please ensure location permissions are granted in your browser.');
    } finally {
      setLocating(false);
    }
  };

  const handleSearchArea = (bounds: MapBounds) => {
    const inBounds = hotels.filter((h) => {
      if (
        h.latitude === null ||
        h.latitude === undefined ||
        h.longitude === null ||
        h.longitude === undefined
      ) {
        return false;
      }
      const lat = Number(h.latitude);
      const lng = Number(h.longitude);
      return (
        lat >= bounds.south &&
        lat <= bounds.north &&
        lng >= bounds.west &&
        lng <= bounds.east
      );
    });

    if (inBounds.length > 0) {
      setHotels(inBounds);
      toast.info(`Found ${inBounds.length} stay${inBounds.length === 1 ? '' : 's'} in this map area.`);
    } else {
      toast.info('No stays found in this visible map area.');
    }
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
    <div className={`min-h-screen ${viewMode === 'map' ? 'pb-2 sm:pb-6' : 'pb-8 sm:pb-16'}`}>
      {/* Hero Section with Scenic Landscape Background Image - Excluded in Map View for immersive full-screen map experience */}
      {viewMode !== 'map' && (
        <section className="relative text-white pt-24 pb-20 sm:pt-28 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden flex flex-col items-center justify-center">
        {/* Background Image with Cinematic Dark Gradient Overlays */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroBgImage}
            alt="Scenic Mountain Highlands"
            className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
          />
          {/* Deep Forest Green & Charcoal Gradient Overlay for Flawless Text Legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#212529]/80 via-[#1E3A2B]/75 to-[#151916]/95"></div>
          {/* Subtle Radial Vignette for Content Focus */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-transparent via-[#212529]/30 to-[#121614]/90"></div>
          {/* Subtle Golden Hour Ambient Sun Glow */}
          <div className="absolute -top-32 right-1/4 w-[450px] h-[450px] bg-[#D49B41]/15 rounded-full blur-3xl pointer-events-none"></div>
          {/* Micro Grid Texture */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D49B41_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center space-y-4 sm:space-y-5 w-full min-w-0">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-[54px] font-black tracking-tight text-white leading-[1.18] drop-shadow-sm max-w-3xl mx-auto px-1">
            Stay Authentic Across the Philippines & Beyond
          </h1>

          <p className="text-xs sm:text-sm md:text-[15px] text-slate-200/90 max-w-xl mx-auto font-normal leading-relaxed px-2">
            Discover verified boutique hotels, mountain lodges, and coastal inns with instant front-desk soft holds and paperless QR check-in.
          </p>

          {/* Curated Experience / Travel Style Segmented Glass Dock (Above Search for Intuitive Intent Filter) */}
          <div className="pt-2 w-full max-w-full overflow-hidden flex justify-center px-1 sm:px-2">
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/45 backdrop-blur-xl border border-white/20 shadow-lg max-w-full overflow-x-auto no-scrollbar touch-pan-x min-w-0">
              {[
                { key: 'all', label: 'All Stays', icon: Compass },
                { key: 'beach', label: 'Beach & Island', icon: Palmtree },
                { key: 'mountain', label: 'Highlands & Peaks', icon: Mountain },
                { key: 'heritage', label: 'Heritage & Culture', icon: Landmark },
                { key: 'city', label: 'Urban & City', icon: Building },
                { key: 'eco', label: 'Eco & Nature', icon: Trees },
              ].map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategory(cat.key as TravelCategory)}
                    className={`px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 ${
                      isActive
                        ? 'bg-[#FAF8F5] text-[#1E3A2B] shadow-sm font-black'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#D49B41]' : 'text-white/60'}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Floating Search Container */}
          <div className="max-w-4xl mx-auto w-full min-w-0 px-1 sm:px-0">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white/95 backdrop-blur-xl text-slate-800 rounded-3xl sm:rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.35)] p-2 sm:p-2.5 flex flex-col sm:flex-row gap-2 items-stretch border border-white/60 w-full min-w-0"
            >
              {/* Destination Search */}
              <div className="flex-1 relative flex items-center px-3.5 py-1 sm:py-0 min-h-[44px] min-w-0">
                <Search className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                <input
                  type="text"
                  placeholder="Where to? Search city, inn, or landmark..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-w-0 py-2.5 text-xs sm:text-sm font-medium bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-slate-400"
                />
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block self-center"></div>

              {/* Guests Filter */}
              <div className="flex items-center px-3.5 sm:w-36 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0 min-h-[44px] min-w-0">
                <Users className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <select
                  value={guestFilter}
                  onChange={(e) => setGuestFilter(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-700 bg-transparent border-0 focus:ring-0 outline-none cursor-pointer py-2 sm:py-0"
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
              <div className="flex items-center px-3.5 sm:w-36 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0 min-h-[44px] min-w-0">
                <SlidersHorizontal className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <select
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-700 bg-transparent border-0 focus:ring-0 outline-none cursor-pointer py-2 sm:py-0"
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
                className="w-full sm:w-auto px-6 py-3 rounded-2xl sm:rounded-full bg-gradient-to-r from-[#D49B41] to-[#BF8832] hover:brightness-105 text-[#212529] font-black text-xs shadow-md shadow-[#D49B41]/30 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 min-h-[44px]"
              >
                <span>Find Rooms</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>

            {/* Streamlined Trending Destinations Helper Row */}
            <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 pt-3 text-xs px-2 w-full min-w-0">
              <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1 mr-0.5">
                <Globe className="w-3 h-3 text-[#D49B41]" /> Trending:
              </span>
              {[
                { label: 'All', value: '' },
                { label: 'Boracay', value: 'Boracay' },
                { label: 'Siargao', value: 'Siargao' },
                { label: 'Baguio', value: 'Baguio' },
                { label: 'Cebu', value: 'Cebu' },
                { label: 'Malaybalay', value: 'Malaybalay' },
                { label: 'Tokyo', value: 'Tokyo' },
              ].map((dest) => (
                <button
                  key={dest.value}
                  type="button"
                  onClick={() => {
                    setSelectedDestination(dest.value);
                    setSearchQuery(dest.value);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all backdrop-blur-sm active:scale-95 ${
                    selectedDestination === dest.value
                      ? 'bg-[#D49B41] text-[#212529] font-bold shadow-sm'
                      : 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/15'
                  }`}
                >
                  {dest.label}
                </button>
              ))}

              <button
                type="button"
                onClick={handleNearMe}
                disabled={locating}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-white text-[11px] font-bold border border-emerald-400/40 shadow-xs transition-all active:scale-95"
                title="Search lodgings closest to your location"
              >
                <Navigation className={`w-3 h-3 ${locating ? 'animate-spin' : ''}`} />
                <span>{locating ? 'Locating...' : 'Near Me'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Main Content Area */}
      <main
        id="listings-section"
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full min-w-0 ${
          viewMode === 'map' ? 'pt-20 sm:pt-24' : '-mt-8 sm:-mt-12'
        }`}
      >
        {/* Value Trust Ribbon - Only visible in List/Grid view */}
        {viewMode !== 'map' && (
          <div className="bg-white rounded-2xl shadow-xl shadow-[#1E3A2B]/5 border border-[#E8E2D8] p-4 sm:p-5 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E8E2D8] w-full min-w-0">
            <div className="flex items-center gap-3.5 sm:px-3 pt-2 sm:pt-0 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] text-[#1E3A2B] border border-[#E8E2D8] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#1E3A2B]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-bold text-[#212529] truncate">45-Minute Hold Protection</h3>
                <p className="text-[11px] text-slate-500 leading-snug">Soft hold locks room inventory during front-desk review.</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 sm:px-3 pt-3 sm:pt-0 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] text-[#D49B41] border border-[#E8E2D8] flex items-center justify-center shrink-0">
                <Building className="w-5 h-5 text-[#D49B41]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-bold text-[#212529] truncate">Verified Local Stays</h3>
                <p className="text-[11px] text-slate-500 leading-snug">Curated independent inns, heritage lodges, & villas.</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 sm:px-3 pt-3 sm:pt-0 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] text-[#3B5E43] border border-[#E8E2D8] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-[#3B5E43]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-bold text-[#212529] truncate">Instant QR Mobile Pass</h3>
                <p className="text-[11px] text-slate-500 leading-snug">Scan at the front desk for fast, paperless check-in.</p>
              </div>
            </div>
          </div>
        )}

        {/* Header Bar with View Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#212529] tracking-tight flex items-center gap-2">
              <span>Featured Lodgings & Stays</span>
              {userLocation && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Navigation className="w-2.5 h-2.5" />
                  Sorted by Distance
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {userLocation && hotels.length > 0 && hotels[0].distance_km !== null
                ? `Showing lodgings closest to your location. Closest stay is ${hotels[0]?.name} (${formatDistance(hotels[0]?.distance_km)}).`
                : `Choose your accommodation to inspect room photos, amenities, and book directly. Displayed in ${currency}.`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            {/* View Mode Switcher: Grid | Map | Split */}
            <div className="flex items-center bg-white p-1 rounded-2xl border border-[#E8E2D8] shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-[#1E3A2B] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#1E3A2B]'
                }`}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'map'
                    ? 'bg-[#1E3A2B] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#1E3A2B]'
                }`}
                title="Full Map View"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Map</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'split'
                    ? 'bg-[#1E3A2B] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#1E3A2B]'
                }`}
                title="Split List & Map View"
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Split</span>
              </button>
            </div>

            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#FAF8F5] text-[#1E3A2B] border border-[#E8E2D8] shrink-0">
              {hotels.length} {hotels.length === 1 ? 'Stay' : 'Stays'}
            </span>
          </div>
        </div>

        {/* Nearest Stay Alert Notification if Geolocation is Active */}
        {userLocation && hotels.length > 0 && hotels[0].distance_km !== null && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-[#FAF8F5] to-amber-50 border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                📍
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-900">Your Location Detected</span>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-200 text-emerald-900">
                    Live GPS Radar
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Nearest hotel is <strong className="text-[#1E3A2B]">{hotels[0].name}</strong> situated just{' '}
                  <strong className="text-emerald-700">{formatDistance(hotels[0].distance_km)}</strong> from you.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className="px-3.5 py-1.5 rounded-xl bg-[#1E3A2B] hover:bg-[#3B5E43] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>View on Map</span>
              </button>
            </div>
          </div>
        )}

        {/* Lodging Listings Content */}
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
        ) : viewMode === 'map' ? (
          /* Full Interactive Map View */
          <div className="space-y-4">
            <HotelMap
              hotels={hotels}
              userLocation={userLocation}
              nearestHotelId={nearestHotelId}
              selectedHotelId={hoveredHotelId}
              onSelectHotel={onSelectHotel}
              onLocateUser={handleNearMe}
              onSearchArea={handleSearchArea}
              isLocating={locating}
              className="h-[calc(100dvh-185px)] min-h-[460px] sm:h-[720px] w-full"
            />
          </div>
        ) : viewMode === 'split' ? (
          /* Split View: Left List Cards | Right Sticky Map */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 space-y-4 max-h-[750px] overflow-y-auto pr-2 no-scrollbar">
              {hotels.map((hotel) => {
                const categoryBadge = getCategoryBadge(hotel.category);
                const isNearest = nearestHotelId === hotel.id;
                return (
                  <article
                    key={hotel.id}
                    onClick={() => onSelectHotel(hotel.slug)}
                    onMouseEnter={() => setHoveredHotelId(hotel.id)}
                    onMouseLeave={() => setHoveredHotelId(null)}
                    className={`group bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col sm:flex-row ${
                      isNearest
                        ? 'border-[#D49B41] ring-2 ring-[#D49B41]/20'
                        : 'border-[#E8E2D8] hover:border-[#1E3A2B]'
                    }`}
                  >
                    <div className="relative w-full sm:w-48 h-44 sm:h-auto overflow-hidden bg-[#212529] shrink-0">
                      <img
                        src={hotel.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'}
                        alt={hotel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-[#212529]/80 backdrop-blur-md text-[#FAF8F5] text-[10px] font-bold">
                          {getCountryFlag(hotel.country)} {hotel.city}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryBadge.bg}`}>
                            {categoryBadge.icon}
                            {categoryBadge.label}
                          </span>
                          <div className="flex items-center gap-1 text-xs font-bold text-[#212529]">
                            <Star className="w-3 h-3 text-[#D49B41] fill-[#D49B41]" />
                            <span>{hotel.rating}</span>
                          </div>
                        </div>

                        <h3 className="text-base font-black text-[#212529] group-hover:text-[#1E3A2B] transition-colors mt-1">
                          {hotel.name}
                        </h3>

                        {hotel.distance_km !== undefined && hotel.distance_km !== null && (
                          <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mt-1">
                            <Navigation className="w-3 h-3 text-emerald-600" />
                            <span>{formatDistance(hotel.distance_km)}</span>
                            {isNearest && (
                              <span className="bg-[#D49B41] text-[#212529] px-1.5 py-0.2 rounded text-[9px] uppercase font-black">
                                Closest
                              </span>
                            )}
                          </p>
                        )}

                        {hotel.room_types_summary && hotel.room_types_summary.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {hotel.room_types_summary.slice(0, 2).map((rts) => (
                              <span
                                key={rts.id}
                                className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#FAF8F5] text-slate-700 border border-slate-200"
                              >
                                <Bed className="w-2.5 h-2.5 text-[#D49B41]" />
                                <span>{rts.name}</span>
                              </span>
                            ))}
                            {hotel.room_types_summary.length > 2 && (
                              <span className="text-[9px] text-slate-400 self-center">
                                +{hotel.room_types_summary.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 mt-3 border-t border-[#E8E2D8] flex items-center justify-between">
                        <div>
                          <span className="text-sm font-black text-[#1E3A2B]">
                            {formatPrice(Number(hotel.min_rate || 850))}
                          </span>
                          <span className="text-[10px] text-slate-500"> / night</span>
                        </div>
                        <button className="px-3 py-1.5 rounded-xl bg-[#1E3A2B] group-hover:bg-[#3B5E43] text-white text-[11px] font-bold flex items-center gap-1 transition-colors">
                          <span>View Rooms</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden lg:block lg:col-span-6 sticky top-24">
              <HotelMap
                hotels={hotels}
                userLocation={userLocation}
                nearestHotelId={nearestHotelId}
                selectedHotelId={hoveredHotelId}
                onSelectHotel={onSelectHotel}
                onLocateUser={handleNearMe}
                onSearchArea={handleSearchArea}
                isLocating={locating}
                className="h-[750px] w-full"
              />
            </div>
          </div>
        ) : (
          /* Standard Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {hotels.map((hotel) => {
              const categoryBadge = getCategoryBadge(hotel.category);
              const isNearest = nearestHotelId === hotel.id;
              return (
                <article
                  key={hotel.id}
                  onClick={() => onSelectHotel(hotel.slug)}
                  className={`group bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-2xl card-hover-lift cursor-pointer flex flex-col transition-all duration-300 ${
                    isNearest
                      ? 'border-[#D49B41] ring-2 ring-[#D49B41]/25'
                      : 'border-[#E8E2D8] hover:border-[#3B5E43]'
                  }`}
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

                    {/* Distance / Nearest Badge OR Rating Pill */}
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
                      {hotel.distance_km !== undefined && hotel.distance_km !== null ? (
                        isNearest ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#D49B41] text-[#212529] text-[10px] font-black shadow-md flex items-center gap-1 animate-pulse">
                            <span>⚡ Closest Stay</span>
                            <span>({formatDistance(hotel.distance_km)})</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-[#1E3A2B]/90 backdrop-blur-md text-emerald-300 text-[10px] font-black border border-emerald-400/30 shadow-md flex items-center gap-1">
                            <Navigation className="w-2.5 h-2.5 text-emerald-400" />
                            <span>{formatDistance(hotel.distance_km)}</span>
                          </span>
                        )
                      ) : (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#212529]/85 backdrop-blur-md text-[#D49B41] text-xs font-extrabold border border-[#D49B41]/25 shadow-md">
                          <Star className="w-3.5 h-3.5 fill-[#D49B41] text-[#D49B41]" />
                          <span>{hotel.rating}</span>
                          <span className="text-[10px] text-slate-300 font-normal">({hotel.review_count})</span>
                        </div>
                      )}
                    </div>

                    {/* Hotel Name over gradient */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md ${categoryBadge.bg}`}>
                          {categoryBadge.icon}
                          {categoryBadge.label}
                        </span>
                        {hotel.distance_km !== undefined && hotel.distance_km !== null && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[#D49B41] text-[11px] font-extrabold">
                            <Star className="w-3 h-3 fill-[#D49B41] text-[#D49B41]" />
                            <span>{hotel.rating}</span>
                          </div>
                        )}
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

                      {/* Room Categories Available Preview */}
                      {hotel.room_types_summary && hotel.room_types_summary.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-[#E8E2D8]/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                            Available Room Tiers ({hotel.room_types_summary.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {hotel.room_types_summary.slice(0, 3).map((rts) => (
                              <span
                                key={rts.id}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[#1E3A2B] border border-emerald-900/10"
                              >
                                <Bed className="w-2.5 h-2.5 text-[#D49B41]" />
                                <span>{rts.name}</span>
                              </span>
                            ))}
                            {hotel.room_types_summary.length > 3 && (
                              <span className="text-[10px] text-slate-400 self-center">
                                +{hotel.room_types_summary.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
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

      {/* Mobile Floating Map / List Toggle Pill (Gold-standard Airbnb UX) - Appears when scrolled or when actively in map view */}
      {(showFloatingMapBtn || viewMode === 'map') && (
        <div className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            type="button"
            onClick={() => {
              const nextMode = viewMode === 'map' ? 'grid' : 'map';
              setViewMode(nextMode);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-5 py-2.5 rounded-full bg-[#1E3A2B] hover:bg-[#3B5E43] text-white font-extrabold text-xs shadow-2xl border border-white/20 flex items-center gap-2 active:scale-95 transition-all"
          >
            {viewMode === 'map' ? (
              <>
                <LayoutGrid className="w-4 h-4 text-[#D49B41]" />
                <span>Show List View</span>
              </>
            ) : (
              <>
                <MapIcon className="w-4 h-4 text-[#D49B41]" />
                <span>Show Map View</span>
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
};
