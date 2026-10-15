import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import distance from '@turf/distance';
import { Hotel } from '../types';
import { useCurrencyStore } from '../stores/currencyStore';
import { formatDistance, Coordinates } from '../utils/geo';
import {
  Navigation,
  Maximize2,
  Map as MapIcon,
  Search,
  Star,
  ExternalLink,
  X,
  Info,
  MapPin,
} from 'lucide-react';

export interface HotelWithDistance extends Hotel {
  distance_km?: number | null;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface HotelMapProps {
  hotels: HotelWithDistance[];
  userLocation: Coordinates | null;
  nearestHotelId?: number | string | null;
  selectedHotelId?: number | string | null;
  onSelectHotel: (slug: string) => void;
  onLocateUser?: () => void;
  onSearchArea?: (bounds: MapBounds) => void;
  isLocating?: boolean;
  className?: string;
  defaultMapStyle?: 'satellite' | 'street';
}

/**
 * Zoom threshold configuration
 * Zoom < 11: Clusters & small rating dots for unclustered points
 * Zoom 11 to 14: Category icon & star rating (no price to prevent city clutter)
 * Zoom >= 14: Full pill badge with nightly price and rating
 */
const MAP_ZOOM_THRESHOLDS = {
  CLUSTER_MAX_ZOOM: 11,
  CITY_LEVEL_ZOOM: 14,
  NEIGHBORHOOD_ZOOM: 14,
} as const;

/**
 * Category emoji helper for zoom 11-14 badges
 */
function getCategoryIcon(category?: string): string {
  switch (category?.toLowerCase()) {
    case 'beach':
      return '🏖️';
    case 'mountain':
    case 'cabin':
      return '🏔️';
    case 'heritage':
    case 'villa':
      return '🏛️';
    case 'resort':
      return '🌴';
    case 'apartment':
    case 'city':
      return '🏙️';
    default:
      return '🏨';
  }
}

interface ClusterGroup {
  id: string;
  items: HotelWithDistance[];
  center: [number, number];
  minPrice: number;
}

export const HotelMap: React.FC<HotelMapProps> = ({
  hotels,
  userLocation,
  nearestHotelId,
  selectedHotelId,
  onSelectHotel,
  onLocateUser,
  onSearchArea,
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
  const userInteractingRef = useRef<boolean>(false);

  const [mapReady, setMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(12);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'street'>(defaultMapStyle);
  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [activePopupHotel, setActivePopupHotel] = useState<HotelWithDistance | null>(null);

  const rawMapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim();
  const hasMapboxToken = Boolean(rawMapboxToken && rawMapboxToken.length > 10);
  const { formatPrice } = useCurrencyStore();

  // Valid hotels with numeric coordinates
  const validHotels = useMemo(
    () =>
      hotels.filter(
        (h) =>
          h.latitude !== null &&
          h.latitude !== undefined &&
          h.longitude !== null &&
          h.longitude !== undefined &&
          !isNaN(Number(h.latitude)) &&
          !isNaN(Number(h.longitude))
      ),
    [hotels]
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center on Philippines / Bukidnon
    const defaultCenter: [number, number] = [8.1575, 125.1277];
    const initialZoom = 12;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: initialZoom,
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
    setCurrentZoom(initialZoom);
    setMapReady(true);

    // Track user drag / zoom for "Search this area" button
    map.on('dragstart', () => {
      userInteractingRef.current = true;
    });

    map.on('zoomstart', () => {
      userInteractingRef.current = true;
    });

    map.on('moveend', () => {
      if (userInteractingRef.current) {
        setShowSearchAreaBtn(true);
      }
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

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

  // Update Base Tile Layer (Satellite / Mapbox Satellite Streets / Esri World Imagery / OSM Streets)
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
        // High-definition Satellite Fallback: Esri World Imagery + Reference Places/Roads overlay (100% Free, no token)
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
      // Standard Streets (OpenStreetMap) - 100% Free
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });
      group.addLayer(osmLayer);
    }
  }, [mapReady, mapStyle, hasMapboxToken, rawMapboxToken]);

  // Update User Location Beacon & Accuracy Radius
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

      userCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
        radius: 3000, // 3km subtle radius
        color: '#1E3A2B',
        fillColor: '#1E3A2B',
        fillOpacity: 0.05,
        weight: 1,
        dashArray: '4, 4',
      }).addTo(map);
    }
  }, [userLocation]);

  // Update Hotel Markers with Smart Zoom-Dependent Layers and Clustering
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer || !mapReady) return;

    markersLayer.clearLayers();
    if (validHotels.length === 0) return;

    // --- TIER 1: Zoom < 11 (Regional Clustered Overview & Rating Dots) ---
    if (currentZoom < MAP_ZOOM_THRESHOLDS.CLUSTER_MAX_ZOOM) {
      const clusters: ClusterGroup[] = [];
      const clusterThresholdPixels = 55;

      validHotels.forEach((hotel) => {
        const lat = Number(hotel.latitude);
        const lng = Number(hotel.longitude);
        const pt = map.latLngToLayerPoint([lat, lng]);

        let added = false;
        for (const cluster of clusters) {
          const cPt = map.latLngToLayerPoint(cluster.center);
          const dist = Math.hypot(pt.x - cPt.x, pt.y - cPt.y);
          if (dist < clusterThresholdPixels) {
            cluster.items.push(hotel);
            const total = cluster.items.length;
            cluster.center = [
              cluster.items.reduce((acc, h) => acc + Number(h.latitude), 0) / total,
              cluster.items.reduce((acc, h) => acc + Number(h.longitude), 0) / total,
            ];
            const price = Number(hotel.min_rate || 850);
            if (price < cluster.minPrice) cluster.minPrice = price;
            added = true;
            break;
          }
        }

        if (!added) {
          clusters.push({
            id: `cluster-${hotel.id}`,
            items: [hotel],
            center: [lat, lng],
            minPrice: Number(hotel.min_rate || 850),
          });
        }
      });

      clusters.forEach((cluster) => {
        if (cluster.items.length > 1) {
          // Multi-stay Cluster Badge
          const clusterHtml = `
            <div class="relative cursor-pointer select-none transition-transform duration-200 hover:scale-110 active:scale-95 group">
              <div class="w-12 h-12 rounded-full bg-[#1E3A2B] text-white border-2 border-white shadow-xl flex flex-col items-center justify-center p-1 text-center">
                <span class="text-xs font-black leading-tight">${cluster.items.length}</span>
                <span class="text-[9px] font-bold text-[#E2AE55] leading-none whitespace-nowrap">from ₱${Math.round(cluster.minPrice)}</span>
              </div>
            </div>
          `;

          const clusterIcon = L.divIcon({
            html: clusterHtml,
            className: 'stay-cluster-badge',
            iconSize: [48, 48],
            iconAnchor: [24, 24],
          });

          const clusterMarker = L.marker(cluster.center, {
            icon: clusterIcon,
            zIndexOffset: 500 + cluster.items.length,
          });

          clusterMarker.on('click', () => {
            map.setView(cluster.center, Math.min(currentZoom + 3, 13), { animate: true });
          });

          markersLayer.addLayer(clusterMarker);
        } else {
          // Unclustered Single Stay: Compact Dot with Star Rating
          const hotel = cluster.items[0];
          const isSelected = selectedHotelId === hotel.id;
          const rating = Number(hotel.rating || 4.5);
          const isAvailable =
            hotel.available_rooms_count !== undefined ? hotel.available_rooms_count > 0 : true;

          const dotHtml = `
            <div class="relative cursor-pointer select-none group flex items-center justify-center">
              <div class="w-3.5 h-3.5 rounded-full ${
                !isAvailable
                  ? 'bg-[#94A3B8]'
                  : isSelected
                  ? 'bg-[#D49B41] ring-3 ring-[#D49B41]/40 scale-125'
                  : 'bg-[#1E3A2B]'
              } border-2 border-white shadow-md transition-transform group-hover:scale-125"></div>
              <div class="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.2 rounded-md shadow-xs pointer-events-none">
                ★ ${rating.toFixed(1)}
              </div>
            </div>
          `;

          const dotIcon = L.divIcon({
            html: dotHtml,
            className: 'stay-rating-dot',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          const dotMarker = L.marker(cluster.center, {
            icon: dotIcon,
            zIndexOffset: isSelected ? 800 : 200,
          });

          dotMarker.on('click', () => {
            setActivePopupHotel(hotel);
            map.panTo(cluster.center, { animate: true, duration: 0.5 });
          });

          markersLayer.addLayer(dotMarker);
        }
      });
      return;
    }

    // --- TIER 2: Zoom 11 to 13.9 (City Browsing: Category Icon + Star Rating, No Price) ---
    if (currentZoom < MAP_ZOOM_THRESHOLDS.NEIGHBORHOOD_ZOOM) {
      validHotels.forEach((hotel) => {
        const lat = Number(hotel.latitude);
        const lng = Number(hotel.longitude);
        const isSelected = selectedHotelId === hotel.id;
        const isNearest = nearestHotelId === hotel.id;
        const rating = Number(hotel.rating || 4.5);
        const iconEmoji = getCategoryIcon(hotel.category);

        const badgeHtml = `
          <div class="relative cursor-pointer select-none transition-transform duration-200 group">
            <div class="px-2.5 py-1 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 shadow-md border ${
              isSelected
                ? 'bg-[#D49B41] text-[#212529] border-white ring-3 ring-[#D49B41]/50 scale-110'
                : isNearest
                ? 'bg-[#1E3A2B] text-white border-[#D49B41] border-2 hover:scale-105'
                : 'bg-[#1E3A2B] text-white border-white/80 hover:bg-[#2D5A40] hover:scale-105'
            }">
              <span>${iconEmoji}</span>
              <span>★ ${rating.toFixed(1)}</span>
            </div>
          </div>
        `;

        const categoryIcon = L.divIcon({
          html: badgeHtml,
          className: 'stay-category-pin',
          iconSize: [60, 28],
          iconAnchor: [30, 14],
        });

        const marker = L.marker([lat, lng], {
          icon: categoryIcon,
          zIndexOffset: isSelected ? 800 : isNearest ? 700 : 300,
        });

        marker.on('click', () => {
          setActivePopupHotel(hotel);
          map.panTo([lat, lng], { animate: true, duration: 0.5 });
        });

        markersLayer.addLayer(marker);
      });
      return;
    }

    // --- TIER 3: Zoom >= 14 (Street / Neighborhood Level: Full Pill with Nightly Price & Rating) ---
    validHotels.forEach((hotel) => {
      const lat = Number(hotel.latitude);
      const lng = Number(hotel.longitude);
      const isSelected = selectedHotelId === hotel.id;
      const isNearest = nearestHotelId === hotel.id;
      const rating = Number(hotel.rating || 4.5);
      const priceText = formatPrice(Number(hotel.min_rate || 850));
      const isAvailable =
        hotel.available_rooms_count !== undefined ? hotel.available_rooms_count > 0 : true;

      const pillHtml = `
        <div class="relative cursor-pointer select-none transition-transform duration-200 group">
          <div class="px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 shadow-lg border ${
            !isAvailable
              ? 'bg-[#64748B] text-white border-white/60'
              : isSelected
              ? 'bg-[#D49B41] text-[#212529] border-2 border-white shadow-xl scale-110 ring-4 ring-[#D49B41]/35'
              : isNearest
              ? 'bg-[#1E3A2B] text-[#FAF8F5] border-2 border-[#D49B41] shadow-xl hover:scale-105 ring-2 ring-[#D49B41]/30'
              : 'bg-[#1E3A2B] text-white border border-white/80 hover:bg-[#2D5A40] hover:scale-105'
          }">
            <span>${isAvailable ? priceText : 'Sold out'}</span>
            <span class="text-[10px] text-[#D49B41] font-bold">★ ${rating.toFixed(1)}</span>
          </div>
          ${
            isNearest
              ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#212529] text-[#E2AE55] text-[9px] font-black px-1.5 py-0.2 rounded-full border border-[#D49B41] shadow-xs uppercase tracking-wider">Closest</div>'
              : ''
          }
        </div>
      `;

      const pillIcon = L.divIcon({
        html: pillHtml,
        className: 'stay-price-pill',
        iconSize: [80, 32],
        iconAnchor: [40, 16],
      });

      const marker = L.marker([lat, lng], {
        icon: pillIcon,
        zIndexOffset: isSelected ? 900 : isNearest ? 800 : 400,
      });

      marker.on('click', () => {
        setActivePopupHotel(hotel);
        map.panTo([lat, lng], { animate: true, duration: 0.5 });
      });

      markersLayer.addLayer(marker);
    });
  }, [
    validHotels,
    currentZoom,
    selectedHotelId,
    nearestHotelId,
    mapReady,
    formatPrice,
  ]);

  // Sync external selectedHotelId (e.g. from Split view card hover or click)
  useEffect(() => {
    if (!selectedHotelId) return;
    const match = validHotels.find((h) => h.id === selectedHotelId);
    if (match && mapInstanceRef.current && match.latitude && match.longitude) {
      setActivePopupHotel(match);
      mapInstanceRef.current.panTo([Number(match.latitude), Number(match.longitude)], {
        animate: true,
        duration: 0.5,
      });
    }
  }, [selectedHotelId, validHotels]);

  // "Search this area" action
  const handleSearchThisArea = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setShowSearchAreaBtn(false);
    userInteractingRef.current = false;
    const bounds = map.getBounds();

    if (onSearchArea) {
      onSearchArea({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    }
  };

  // Center on user location
  const handleCenterUser = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
    } else if (onLocateUser) {
      onLocateUser();
    }
  };

  // Fit all stays
  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = L.latLngBounds([]);
    if (userLocation) bounds.extend([userLocation.lat, userLocation.lng]);
    validHotels.forEach((h) => bounds.extend([Number(h.latitude), Number(h.longitude)]));

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
        animate: true,
      });
    }
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border border-[#E8E2D8] shadow-xl bg-[#FAF8F5] ${className}`}
    >
      {/* Leaflet Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating "Search this area" Button */}
      {showSearchAreaBtn && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={handleSearchThisArea}
            className="flex items-center gap-2 bg-[#1E3A2B] hover:bg-[#3B5E43] text-white text-xs font-black px-4 py-2 rounded-full shadow-xl border border-white/30 transition-all active:scale-95 animate-in fade-in slide-in-from-top-2"
          >
            <Search className="w-3.5 h-3.5 text-[#D49B41]" />
            <span>Search this area</span>
          </button>
        </div>
      )}

      {/* Floating Map Utility Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        {/* Style Switcher: Street / Satellite */}
        <div className="flex items-center bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-[#E8E2D8] shadow-lg">
          <button
            type="button"
            onClick={() => setMapStyle('street')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              mapStyle === 'street'
                ? 'bg-[#1E3A2B] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#1E3A2B]'
            }`}
            title="Standard Street Map (OpenStreetMap)"
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
            title="High-Res Satellite View"
          >
            <span className="text-xs">🛰️</span>
            <span>Satellite</span>
          </button>
        </div>

        {/* Action Buttons: Locate Me & Fit All */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCenterUser}
            disabled={isLocating}
            className="p-2.5 rounded-2xl bg-white/95 hover:bg-white text-[#212529] shadow-lg border border-[#E8E2D8] transition-all active:scale-95 flex items-center justify-center group"
            title={userLocation ? 'Center on My Location' : 'Detect My Location'}
          >
            <Navigation
              className={`w-4 h-4 text-[#1E3A2B] ${
                isLocating ? 'animate-spin' : 'group-hover:scale-110'
              } transition-transform`}
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

      {/* Closest Stay Banner */}
      {userLocation && nearestHotelId && (
        <div className="absolute top-4 left-4 z-10 max-w-xs animate-in fade-in slide-in-from-top-2">
          {(() => {
            const nearestHotel = validHotels.find((h) => h.id === nearestHotelId);
            if (!nearestHotel) return null;
            return (
              <div
                onClick={() => {
                  setActivePopupHotel(nearestHotel);
                  if (
                    mapInstanceRef.current &&
                    nearestHotel.latitude &&
                    nearestHotel.longitude
                  ) {
                    mapInstanceRef.current.panTo(
                      [Number(nearestHotel.latitude), Number(nearestHotel.longitude)],
                      { animate: true }
                    );
                  }
                }}
                className="cursor-pointer bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-[#D49B41]/60 shadow-xl flex items-center gap-2.5 hover:scale-102 transition-transform active:scale-95"
              >
                <div className="w-8 h-8 rounded-xl bg-[#D49B41]/20 text-[#8F611A] flex items-center justify-center font-black text-xs shrink-0">
                  ⚡
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8F611A]">
                      Closest Stay
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      • {formatDistance(nearestHotel.distance_km)}
                    </span>
                  </div>
                  <div className="text-xs font-extrabold text-[#212529] truncate">
                    {nearestHotel.name}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Anchored Stay Preview Card */}
      {activePopupHotel && (
        <div className="absolute bottom-6 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-20 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#E8E2D8] text-[#212529]">
            <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
              <img
                src={
                  activePopupHotel.image_url ||
                  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80'
                }
                alt={activePopupHotel.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

              {/* Close Button */}
              <button
                onClick={() => setActivePopupHotel(null)}
                className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>

              {/* City and Type Badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <span className="bg-white/95 text-[#1E3A2B] text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                  {activePopupHotel.city || 'Philippines'}
                </span>
              </div>

              {/* Star Rating and Category */}
              <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-white text-xs">
                <span className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold">
                  {activePopupHotel.category || 'Boutique Stay'}
                </span>
                <span className="flex items-center gap-1 bg-[#1E3A2B]/90 backdrop-blur-md px-2 py-0.5 rounded-lg font-black text-[11px]">
                  <Star className="w-3 h-3 text-[#D49B41] fill-[#D49B41]" />
                  <span>{Number(activePopupHotel.rating || 4.5).toFixed(1)}</span>
                </span>
              </div>
            </div>

            <div className="p-3.5 space-y-2">
              <h4 className="font-extrabold text-sm text-[#212529] truncate">
                {activePopupHotel.name}
              </h4>

              {userLocation && (
                <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {(() => {
                      if (activePopupHotel.longitude && activePopupHotel.latitude) {
                        const d = distance(
                          [userLocation.lng, userLocation.lat],
                          [
                            Number(activePopupHotel.longitude),
                            Number(activePopupHotel.latitude),
                          ],
                          { units: 'kilometers' }
                        );
                        return `${formatDistance(d)} away`;
                      }
                      return activePopupHotel.distance_km
                        ? `${formatDistance(activePopupHotel.distance_km)} away`
                        : '';
                    })()}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">
                    From
                  </span>
                  <span className="text-base font-black text-[#1E3A2B]">
                    {formatPrice(Number(activePopupHotel.min_rate || 850))}
                  </span>
                  <span className="text-[10px] text-slate-400">/night</span>
                </div>

                <button
                  onClick={() => onSelectHotel(activePopupHotel.slug)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1E3A2B] hover:bg-[#3B5E43] text-white text-xs font-black shadow-md transition-all active:scale-95"
                >
                  <span>View Rooms</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#D49B41]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Tier Color Legend (Accessible & Collapsible) */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#E8E2D8] shadow-lg p-2 text-[10px]">
          <div
            className="flex items-center justify-between gap-3 cursor-pointer select-none font-black text-slate-700 pb-1"
            onClick={() => setShowLegend(!showLegend)}
          >
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3 text-[#1E3A2B]" />
              <span>Rating Legend</span>
            </span>
            <span className="text-slate-400">{showLegend ? '−' : '+'}</span>
          </div>

          {showLegend && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 border-t border-slate-100 font-semibold text-slate-600 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1E3A2B] border border-white shrink-0" />
                <span>4.8+ Top Tier</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2D5A40] border border-white shrink-0" />
                <span>4.5 - 4.7 Great</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D49B41] border border-white shrink-0" />
                <span>4.0 - 4.4 Good</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8] border border-white shrink-0" />
                <span>Sold out</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
