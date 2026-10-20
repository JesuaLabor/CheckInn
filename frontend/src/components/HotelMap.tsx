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
  const [activePopupHotel, setActivePopupHotel] = useState<HotelWithDistance | null>(null);
  const [popupCoords, setPopupCoords] = useState<{ x: number; y: number } | null>(null);

  const rawMapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim();
  const hasMapboxToken = Boolean(rawMapboxToken && rawMapboxToken.length > 10);
  const { formatPrice } = useCurrencyStore();

  // Color helper matching the rating legend
  const getRatingColor = (rating: number, isAvailable: boolean): string => {
    if (!isAvailable) return '#94A3B8';
    if (rating >= 4.8) return '#1E3A2B';
    if (rating >= 4.5) return '#2D5A40';
    return '#D49B41';
  };

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

    map.on('click', () => {
      setActivePopupHotel(null);
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

  // Focus marker with anchored preview modal card
  const handleMarkerClick = (hotel: HotelWithDistance) => {
    setActivePopupHotel(hotel);
    const map = mapInstanceRef.current;
    if (map && hotel.latitude && hotel.longitude) {
      const lat = Number(hotel.latitude);
      const lng = Number(hotel.longitude);
      map.panTo([lat, lng], { animate: true, duration: 0.4 });
    }
  };

  // Keep anchored popup coordinates synced with map panning and zooming
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activePopupHotel) {
      setPopupCoords(null);
      return;
    }

    const updateCoords = () => {
      if (!activePopupHotel.latitude || !activePopupHotel.longitude) return;
      const pt = map.latLngToContainerPoint([
        Number(activePopupHotel.latitude),
        Number(activePopupHotel.longitude),
      ]);
      setPopupCoords({ x: pt.x, y: pt.y });
    };

    updateCoords();

    map.on('move', updateCoords);
    map.on('zoom', updateCoords);
    map.on('viewreset', updateCoords);

    return () => {
      map.off('move', updateCoords);
      map.off('zoom', updateCoords);
      map.off('viewreset', updateCoords);
    };
  }, [activePopupHotel]);

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

          dotMarker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            handleMarkerClick(hotel);
          });

          markersLayer.addLayer(dotMarker);
        }
      });
      return;
    }

    // --- TIER 2 & 3: Zoom >= 11 (Clean Boutique Hotel Pins with Category Icon - No Price/Rate Clutter) ---
    validHotels.forEach((hotel) => {
      const lat = Number(hotel.latitude);
      const lng = Number(hotel.longitude);
      const isSelected = activePopupHotel?.id === hotel.id || selectedHotelId === hotel.id;
      const isNearest = nearestHotelId === hotel.id;
      const rating = Number(hotel.rating || 4.5);
      const isAvailable =
        hotel.available_rooms_count !== undefined ? hotel.available_rooms_count > 0 : true;
      const pinColor = isSelected ? '#D49B41' : getRatingColor(rating, isAvailable);
      const iconEmoji = getCategoryIcon(hotel.category);

      const pinHtml = `
        <div class="relative cursor-pointer select-none transition-transform duration-200 hover:scale-120 active:scale-95 group flex flex-col items-center">
          <div class="w-9 h-9 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-base text-white transition-all ${
            isSelected
              ? 'ring-4 ring-[#D49B41]/50 scale-110 shadow-2xl'
              : isNearest
              ? 'ring-2 ring-[#D49B41]'
              : 'group-hover:shadow-2xl'
          }" style="background-color: ${pinColor}">
            <span>${iconEmoji}</span>
          </div>
          <div class="w-2.5 h-2 -mt-1 shadow-xs" style="background-color: ${pinColor}; clip-path: polygon(50% 100%, 0 0, 100% 0);"></div>
          ${
            isNearest
              ? '<div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#212529] text-[#E2AE55] text-[8px] font-black px-1.5 py-0.2 rounded-full border border-[#D49B41] shadow-xs uppercase tracking-wider">Closest</div>'
              : ''
          }
        </div>
      `;

      const pinIcon = L.divIcon({
        html: pinHtml,
        className: 'stay-map-pin',
        iconSize: [36, 42],
        iconAnchor: [18, 42],
      });

      const marker = L.marker([lat, lng], {
        icon: pinIcon,
        zIndexOffset: isSelected ? 900 : isNearest ? 800 : 400,
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        handleMarkerClick(hotel);
      });

      markersLayer.addLayer(marker);
    });
  }, [
    validHotels,
    currentZoom,
    selectedHotelId,
    activePopupHotel,
    nearestHotelId,
    mapReady,
  ]);

  // Sync external selectedHotelId (e.g. from Split view card hover or click)
  useEffect(() => {
    if (!selectedHotelId) return;
    const match = validHotels.find((h) => h.id === selectedHotelId);
    if (match) {
      handleMarkerClick(match);
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

  // Calculate clamped layout so modal card is never clipped by map edges
  const getClampedModalCoords = () => {
    if (!popupCoords || !mapContainerRef.current) return null;
    const mapW = mapContainerRef.current.clientWidth || 800;
    const mapH = mapContainerRef.current.clientHeight || 600;
    const cardW = Math.min(325, mapW - 24);
    const cardH = 315;

    // Show below pin if pin is in upper area (< 450px) so card is never covered by floating navbar
    const showBelow = popupCoords.y < 450;

    const clampedLeft = Math.max(12, Math.min(mapW - cardW - 12, popupCoords.x - cardW / 2));
    const idealTop = showBelow ? popupCoords.y + 12 : popupCoords.y - 44 - cardH;
    const clampedTop = Math.max(88, Math.min(mapH - cardH - 12, idealTop));
    const arrowX = Math.max(20, Math.min(cardW - 20, popupCoords.x - clampedLeft));

    return {
      left: clampedLeft,
      top: clampedTop,
      width: cardW,
      arrowX,
      showBelow,
    };
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
                  handleMarkerClick(nearestHotel);
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

      {/* Anchored Hotel Preview Modal Card (Matching Image 1) */}
      {activePopupHotel && (() => {
        const layout = getClampedModalCoords();
        if (!layout) return null;

        return (
          <div
            style={{
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`,
            }}
            className="absolute z-30 pointer-events-auto select-none transition-all duration-150 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pointer arrow on top (if showBelow) */}
            {layout.showBelow && (
              <div
                className="absolute -top-2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-white drop-shadow-md pointer-events-none"
                style={{ left: `${layout.arrowX}px` }}
              />
            )}

            {/* Card Frame */}
            <div className="w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-black/10 text-[#212529]">
              {/* Hero Image Section */}
              <div className="relative h-40 w-full bg-slate-900 overflow-hidden">
                <img
                  src={
                    activePopupHotel.image_url ||
                    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80'
                  }
                  alt={activePopupHotel.name}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" />

                {/* Location Badge (Top-Left) */}
                <div className="absolute top-3 left-3 flex items-center">
                  <span className="bg-white/95 text-[#1E3A2B] text-[10px] font-black px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
                    {activePopupHotel.city?.toUpperCase() || 'MALAYBALAY CITY'}
                  </span>
                </div>

                {/* Close Button (Top-Right) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePopupHotel(null);
                  }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-xs text-white flex items-center justify-center transition-all shadow-md active:scale-90 cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Category (Bottom-Left) & Star Rating (Bottom-Right) Badges */}
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-white text-xs">
                  <span className="bg-black/50 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[11px] font-semibold lowercase">
                    {activePopupHotel.category || 'city'}
                  </span>
                  <span className="flex items-center gap-1 bg-[#1E3A2B]/95 backdrop-blur-xs px-2.5 py-0.5 rounded-lg font-black text-xs shadow-xs">
                    <Star className="w-3.5 h-3.5 text-[#D49B41] fill-[#D49B41]" />
                    <span>{Number(activePopupHotel.rating || 4.5).toFixed(1)}</span>
                  </span>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-extrabold text-base text-[#212529] truncate" title={activePopupHotel.name}>
                    {activePopupHotel.name}
                  </h3>
                  {userLocation && (
                    <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
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
                </div>

                <div className="border-t border-slate-100" />

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                      FROM
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-[#1E3A2B]">
                        {formatPrice(Number(activePopupHotel.min_rate || 850))}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">/night</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectHotel(activePopupHotel.slug);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#1E3A2B] hover:bg-[#2D5A40] text-white text-xs font-black shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <span>View Rooms</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#D49B41]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Pointer arrow on bottom (if not showBelow) */}
            {!layout.showBelow && (
              <div
                className="absolute -bottom-2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-white drop-shadow-md pointer-events-none"
                style={{ left: `${layout.arrowX}px` }}
              />
            )}
          </div>
        );
      })()}

    </div>
  );
};
