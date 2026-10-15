import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Search,
  Layers,
  Map as MapIcon,
  Check,
  Copy,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface LocationPickerMapProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  onChange: (lat: number, lng: number) => void;
  defaultCity?: string;
  className?: string;
  height?: string;
  label?: string;
  readOnly?: boolean;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  latitude,
  longitude,
  onChange,
  defaultCity = 'Malaybalay City, Bukidnon',
  className = '',
  height = 'h-72 sm:h-80',
  label = 'Pin Property Location on Map',
  readOnly = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const baseTilesGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawMapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim();
  const hasMapboxToken = Boolean(rawMapboxToken && rawMapboxToken.length > 10);

  // Default coordinate fallback: Malaybalay, Bukidnon (8.1575, 125.1277)
  const currentLat = latitude !== null && latitude !== undefined && !isNaN(Number(latitude))
    ? Number(latitude)
    : 8.1575;
  const currentLng = longitude !== null && longitude !== undefined && !isNaN(Number(longitude))
    ? Number(longitude)
    : 125.1277;

  const hasCoordinates =
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined &&
    !isNaN(Number(latitude)) &&
    !isNaN(Number(longitude));

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [currentLat, currentLng],
      zoom: hasCoordinates ? 15 : 12,
      zoomControl: false,
    });

    L.control
      .zoom({
        position: 'bottomright',
      })
      .addTo(map);

    baseTilesGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    setMapReady(true);

    // Click map to drop / move pin
    if (!readOnly) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
      });
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Update Base Tile Layer (Street OSM / Satellite Esri or Mapbox)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = baseTilesGroupRef.current;
    if (!map || !group || !mapReady) return;

    group.clearLayers();

    if (mapStyle === 'satellite') {
      if (hasMapboxToken && rawMapboxToken) {
        const mapboxLayer = L.tileLayer(
          `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${rawMapboxToken}`,
          {
            tileSize: 512,
            zoomOffset: -1,
            maxZoom: 22,
            attribution: '© Mapbox © OpenStreetMap',
          }
        );
        group.addLayer(mapboxLayer);
      } else {
        const esriSatellite = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri',
          }
        );
        const esriLabels = L.tileLayer(
          'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
          }
        );
        group.addLayer(esriSatellite);
        group.addLayer(esriLabels);
      }
    } else {
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      });
      group.addLayer(osmLayer);
    }
  }, [mapReady, mapStyle, hasMapboxToken, rawMapboxToken]);

  // Update or Create Draggable Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // Custom Draggable Pin HTML
    const pinHtml = `
      <div class="relative cursor-grab active:cursor-grabbing select-none flex flex-col items-center -translate-y-4 group">
        <div class="px-2.5 py-1 rounded-full bg-[#1E3A2B] text-white border-2 border-white shadow-xl flex items-center gap-1.5 text-xs font-black transition-transform group-hover:scale-110">
          <span class="text-xs">🏨</span>
          <span class="text-[11px] whitespace-nowrap">Hotel Pin</span>
        </div>
        <div class="w-2.5 h-2.5 bg-[#1E3A2B] rotate-45 -mt-1 border-r-2 border-b-2 border-white shadow-xs"></div>
        <div class="w-3.5 h-1 bg-black/40 rounded-full blur-[1px] mt-0.5"></div>
      </div>
    `;

    const icon = L.divIcon({
      html: pinHtml,
      className: 'location-picker-pin',
      iconSize: [80, 40],
      iconAnchor: [40, 36],
    });

    const marker = L.marker([currentLat, currentLng], {
      icon,
      draggable: !readOnly,
      zIndexOffset: 1000,
    }).addTo(map);

    if (!readOnly) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
      });
    }

    markerRef.current = marker;
  }, [currentLat, currentLng, mapReady, readOnly]);

  // Address search via OpenStreetMap Nominatim
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&countrycodes=ph&limit=4`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      if (!res.ok) throw new Error('Search failed');
      const data: SearchResult[] = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item: SearchResult) => {
    const lat = Number(parseFloat(item.lat).toFixed(6));
    const lng = Number(parseFloat(item.lon).toFixed(6));
    onChange(lat, lng);
    setSearchResults([]);
    setSearchQuery('');

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
    }
  };

  // Device GPS Geolocation
  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onChange(lat, lng);
        setIsLocating(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
        }
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setIsLocating(false);
        alert('Could not retrieve device location. Please enable location permissions or click manually on the map.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${currentLat}, ${currentLng}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#1E3A2B]" />
          <span>{label}</span>
          {!hasCoordinates && (
            <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md font-bold">
              Pin Not Set Yet
            </span>
          )}
        </label>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUseCurrentGPS}
              disabled={isLocating}
              className="flex items-center gap-1.5 text-[11px] font-bold text-[#1E3A2B] bg-[#FAF8F5] hover:bg-[#E8E2D8] border border-[#E8E2D8] px-2.5 py-1 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              title="Set pin to your device's current location"
            >
              {isLocating ? (
                <Loader2 className="w-3 h-3 animate-spin text-[#1E3A2B]" />
              ) : (
                <Navigation className="w-3 h-3 text-[#1E3A2B]" />
              )}
              <span>Use Current GPS</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Map Box */}
      <div className="relative rounded-2xl overflow-hidden border border-[#E8E2D8] shadow-sm bg-[#FAF8F5]">
        {/* Search Bar Overlay */}
        {!readOnly && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-80 z-20">
            <form onSubmit={handleSearch} className="relative shadow-lg">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, barangay, or landmark..."
                className="w-full bg-white/95 backdrop-blur-md border border-[#E8E2D8] rounded-xl pl-8 pr-16 py-2 text-xs text-[#212529] placeholder-slate-400 focus:outline-none focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-1.5 top-1 px-2.5 py-1 rounded-lg bg-[#1E3A2B] text-white text-[10px] font-bold hover:bg-[#2D5A40] transition-colors disabled:opacity-50"
              >
                {isSearching ? '...' : 'Find'}
              </button>
            </form>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => selectSearchResult(item)}
                    className="w-full text-left px-3 py-2 text-[11px] text-slate-700 hover:bg-[#FAF8F5] transition-colors flex items-start gap-1.5"
                  >
                    <MapPin className="w-3 h-3 text-[#D49B41] shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Style Switcher: Street / Satellite */}
        <div className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-md p-0.5 rounded-xl border border-[#E8E2D8] shadow-md flex items-center">
          <button
            type="button"
            onClick={() => setMapStyle('street')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
              mapStyle === 'street'
                ? 'bg-[#1E3A2B] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#1E3A2B]'
            }`}
          >
            Street
          </button>
          <button
            type="button"
            onClick={() => setMapStyle('satellite')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
              mapStyle === 'satellite'
                ? 'bg-[#1E3A2B] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#1E3A2B]'
            }`}
          >
            Satellite
          </button>
        </div>

        {/* The Leaflet Container */}
        <div ref={mapContainerRef} className={`w-full ${height} z-0`} />

        {/* Bottom Coordinates & Instructions Banner */}
        <div className="absolute bottom-2 left-2 right-2 sm:right-auto z-20 flex items-center justify-between sm:justify-start gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E8E2D8] text-[11px] shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono font-bold text-slate-700">
              {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyCoords}
            className="text-slate-400 hover:text-slate-700 p-1 transition-colors"
            title="Copy Coordinates"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {!readOnly && (
            <span className="hidden md:inline text-[10px] font-semibold text-slate-500 border-l border-slate-200 pl-2">
              Drag pin or click map to move
            </span>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-normal flex items-start gap-1">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
        <span>
          This pin determines where your lodging appears on the marketplace map and calculates driving distances for guests.
        </span>
      </p>
    </div>
  );
};
