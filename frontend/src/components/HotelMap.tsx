import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hotel } from '../types';
import { useCurrencyStore } from '../stores/currencyStore';
import { formatDistance, Coordinates } from '../utils/geo';
import {
  Navigation,
  Maximize2,
  Compass,
  MapPin,
  Star,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  X,
  Map as MapIcon,
  Layers,
} from 'lucide-react';

interface HotelWithDistance extends Hotel {
  distance_km?: number | null;
}

interface HotelMapProps {
  hotels: HotelWithDistance[];
  userLocation: Coordinates | null;
  nearestHotelId?: number | string | null;
  selectedHotelId?: number | string | null;
  onSelectHotel: (slug: string) => void;
  onLocateUser?: () => void;
  isLocating?: boolean;
  className?: string;
  defaultMapStyle?: 'satellite' | 'street';
}

export const HotelMap: React.FC<HotelMapProps> = ({
  hotels,
  userLocation,
  nearestHotelId,
  selectedHotelId,
  onSelectHotel,
  onLocateUser,
  isLocating,
  className = 'h-[500px] sm:h-[600px] w-full',
  defaultMapStyle = 'satellite',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTilesGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'street'>(defaultMapStyle);

  const rawMapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim();
  const hasMapboxToken = Boolean(rawMapboxToken && rawMapboxToken.length > 10);

  const { formatPrice } = useCurrencyStore();
  const [activePopupHotel, setActivePopupHotel] = useState<HotelWithDistance | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center on Philippines / Bukidnon
    const defaultCenter: [number, number] = [8.1575, 125.1277];
    const defaultZoom = 13;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false,
    });

    // Zoom control in bottom-right corner
    L.control
      .zoom({
        position: 'bottomright',
      })
      .addTo(map);

    baseTilesGroupRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    setMapReady(true);

    // Invalidate size after mount transition
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

  // Update Base Tile Layer (Satellite / Mapbox Satellite Streets / OSM Streets)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = baseTilesGroupRef.current;
    if (!map || !group || !mapReady) return;

    group.clearLayers();

    if (mapStyle === 'satellite') {
      if (hasMapboxToken && rawMapboxToken) {
        // High-res Mapbox Satellite Streets with road networks and place labels
        const mapboxLayer = L.tileLayer(
          `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${rawMapboxToken}`,
          {
            tileSize: 512,
            zoomOffset: -1,
            maxZoom: 22,
            attribution:
              '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          }
        );
        group.addLayer(mapboxLayer);
      } else {
        // High-definition Satellite Fallback: Esri World Imagery + Reference Places/Roads overlay (No API key needed)
        const esriSatellite = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            attribution:
              'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
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
      // Standard Streets (OpenStreetMap)
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });
      group.addLayer(osmLayer);
    }
  }, [mapReady, mapStyle, hasMapboxToken, rawMapboxToken]);

  // Update User Location Beacon
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (userCircleRef.current) {
      userCircleRef.current.remove();
      userCircleRef.current = null;
    }

    if (userLocation) {
      // Custom pulsing user beacon
      const userHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-[#1E3A2B]/25 animate-ping"></div>
          <div class="w-5 h-5 rounded-full bg-[#1E3A2B] border-2 border-white shadow-xl flex items-center justify-center text-[10px] text-white font-black">
            📍
          </div>
          <div class="absolute -bottom-5 whitespace-nowrap bg-[#1E3A2B] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-white/20">
            You Are Here
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userHtml,
        className: 'user-location-pin',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      // Subtle radius circle
      userCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
        radius: 3000, // 3km radius
        color: '#1E3A2B',
        fillColor: '#1E3A2B',
        fillOpacity: 0.05,
        weight: 1,
        dashArray: '4, 4',
      }).addTo(map);
    }
  }, [userLocation]);

  // Update Hotel Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const validHotels = hotels.filter(
      (h) => h.latitude !== null && h.latitude !== undefined && h.longitude !== null && h.longitude !== undefined
    );

    if (validHotels.length === 0) return;

    const bounds = L.latLngBounds([]);

    if (userLocation) {
      bounds.extend([userLocation.lat, userLocation.lng]);
    }

    validHotels.forEach((hotel) => {
      const lat = Number(hotel.latitude);
      const lng = Number(hotel.longitude);
      bounds.extend([lat, lng]);

      const isNearest = nearestHotelId === hotel.id;
      const isSelected = selectedHotelId === hotel.id;
      const priceText = formatPrice(Number(hotel.min_rate || 850));

      // Airbnb-style Price Pin Badge
      let badgeClasses =
        'bg-[#1E3A2B] text-white border border-white/80 shadow-lg hover:bg-[#3B5E43] hover:scale-110';

      if (isNearest) {
        badgeClasses =
          'bg-[#D49B41] text-[#212529] font-black border-2 border-white shadow-xl scale-110 ring-4 ring-[#D49B41]/35 animate-bounce';
      } else if (isSelected) {
        badgeClasses =
          'bg-[#FAF8F5] text-[#1E3A2B] font-black border-2 border-[#1E3A2B] shadow-xl scale-110 ring-4 ring-[#1E3A2B]/20';
      }

      const markerHtml = `
        <div class="relative cursor-pointer transition-transform duration-200 group">
          <div class="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1 ${badgeClasses}">
            ${isNearest ? '<span>⚡</span>' : ''}
            <span>${priceText}</span>
          </div>
          ${
            isNearest
              ? '<div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#212529] text-[#E2AE55] text-[9px] font-black px-1.5 py-0.2 rounded-full border border-[#D49B41] shadow-xs uppercase tracking-wider">Closest</div>'
              : ''
          }
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'hotel-price-pin',
        iconSize: [60, 30],
        iconAnchor: [30, 15],
      });

      const marker = L.marker([lat, lng], {
        icon: customIcon,
        zIndexOffset: isNearest ? 900 : isSelected ? 800 : 100,
      });

      marker.on('click', () => {
        setActivePopupHotel(hotel);
        map.panTo([lat, lng], { animate: true, duration: 0.5 });
      });

      markersLayer.addLayer(marker);
    });

    // Auto-fit bounds if hotels exist
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
      });
    }
  }, [hotels, userLocation, nearestHotelId, selectedHotelId, formatPrice]);

  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const validHotels = hotels.filter(
      (h) => h.latitude !== null && h.latitude !== undefined && h.longitude !== null && h.longitude !== undefined
    );
    const bounds = L.latLngBounds([]);
    if (userLocation) bounds.extend([userLocation.lat, userLocation.lng]);
    validHotels.forEach((h) => bounds.extend([Number(h.latitude), Number(h.longitude)]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  };

  const handleCenterUser = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
    } else if (onLocateUser) {
      onLocateUser();
    }
  };

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-[#E8E2D8] shadow-xl bg-[#FAF8F5] ${className}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Utility Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        {/* Style Switcher: Street / Satellite (Mapbox Ready) */}
        <div className="flex items-center bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-[#E8E2D8] shadow-lg">
          <button
            type="button"
            onClick={() => setMapStyle('street')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              mapStyle === 'street'
                ? 'bg-[#1E3A2B] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#1E3A2B]'
            }`}
            title="Standard Street Map"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Street</span>
          </button>

          <button
            type="button"
            onClick={() => setMapStyle('satellite')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              mapStyle === 'satellite'
                ? 'bg-[#1E3A2B] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#1E3A2B]'
            }`}
            title={hasMapboxToken ? 'Mapbox Satellite Streets active' : 'High-Res Satellite View'}
          >
            <span className="text-xs">🛰️</span>
            <span>Satellite</span>
            {hasMapboxToken && (
              <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.2 rounded-md bg-[#D49B41] text-[#212529] font-black uppercase tracking-wider">
                Mapbox
              </span>
            )}
          </button>
        </div>

        {/* Utility Action Buttons: Locate Me & Fit All */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCenterUser}
            disabled={isLocating}
            className="p-2.5 rounded-2xl bg-white/95 hover:bg-white text-[#212529] shadow-lg border border-[#E8E2D8] transition-all active:scale-95 flex items-center justify-center group"
            title={userLocation ? 'Center on My Location' : 'Detect My Location'}
          >
            <Navigation
              className={`w-4 h-4 text-[#1E3A2B] ${isLocating ? 'animate-spin' : 'group-hover:scale-110'} transition-transform`}
            />
          </button>

          <button
            onClick={handleFitAll}
            className="p-2.5 rounded-2xl bg-white/95 hover:bg-white text-[#212529] shadow-lg border border-[#E8E2D8] transition-all active:scale-95 flex items-center justify-center group"
            title="Fit All Hotels"
          >
            <Maximize2 className="w-4 h-4 text-slate-600 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Nearest Stay Floating Pill Banner */}
      {userLocation && nearestHotelId && (
        <div className="absolute top-4 left-4 z-10 max-w-xs">
          {(() => {
            const nearestHotel = hotels.find((h) => h.id === nearestHotelId);
            if (!nearestHotel) return null;
            return (
              <div
                onClick={() => {
                  setActivePopupHotel(nearestHotel);
                  if (mapInstanceRef.current && nearestHotel.latitude && nearestHotel.longitude) {
                    mapInstanceRef.current.panTo([Number(nearestHotel.latitude), Number(nearestHotel.longitude)], {
                      animate: true,
                    });
                  }
                }}
                className="cursor-pointer bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-[#D49B41]/50 shadow-xl flex items-center gap-2.5 hover:scale-102 transition-transform"
              >
                <div className="w-8 h-8 rounded-xl bg-[#D49B41]/15 text-[#8F611A] flex items-center justify-center font-bold text-xs shrink-0">
                  ⚡
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8F611A]">Closest Stay</span>
                    <span className="text-[10px] font-bold text-slate-500">
                      • {formatDistance(nearestHotel.distance_km)}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#212529] truncate">{nearestHotel.name}</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Active Selected Hotel Preview Card (Bottom Center / Bottom Left) */}
      {activePopupHotel && (
        <div className="absolute bottom-4 inset-x-4 sm:inset-x-auto sm:left-4 z-20 sm:max-w-sm bg-white rounded-3xl p-3 shadow-2xl border border-[#E8E2D8] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex gap-3">
            <img
              src={activePopupHotel.image_url}
              alt={activePopupHotel.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shrink-0"
            />
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#8F611A] bg-[#FAF3E0] px-2 py-0.5 rounded-full truncate">
                      {activePopupHotel.city}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-[#212529] shrink-0">
                      <Star className="w-3 h-3 text-[#D49B41] fill-[#D49B41]" />
                      <span>{Number(activePopupHotel.rating || 4.5).toFixed(1)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePopupHotel(null);
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Close preview"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="text-sm font-black text-[#212529] truncate mt-1">
                  {activePopupHotel.name}
                </h4>
                {activePopupHotel.distance_km !== undefined && activePopupHotel.distance_km !== null && (
                  <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>{formatDistance(activePopupHotel.distance_km)}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-100">
                <div>
                  <span className="text-xs font-black text-[#1E3A2B]">
                    {formatPrice(Number(activePopupHotel.min_rate || 850))}
                  </span>
                  <span className="text-[10px] text-slate-400">/night</span>
                </div>
                <button
                  onClick={() => onSelectHotel(activePopupHotel.slug)}
                  className="px-3 py-1.5 rounded-xl bg-[#1E3A2B] hover:bg-[#3B5E43] text-white text-[11px] font-black flex items-center gap-1 shadow-sm transition-all"
                >
                  <span>View Rooms</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
