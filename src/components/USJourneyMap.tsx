import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RouteCheckpoint, ShipmentStatus } from '../types/shipment';
import { calculateRouteGeometry, calculateEstimatedPosition, fetchLiveRoadRoute, findNearestPointOnPolyline } from '../services/routingEngine';
import { Layers, ZoomIn, ZoomOut, Compass, ChevronDown, AlertTriangle, ShieldAlert, Pause, Truck, ArrowRight } from 'lucide-react';
import './USJourneyMap.css';

// 1x1 transparent pixel — used as the errorTileUrl so a tile that fails to load
// (slow/blocked network, provider hiccup) renders invisibly instead of a hard
// gray box sitting on top of the map.
const TRANSPARENT_TILE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7';

interface USJourneyMapProps {
  checkpoints?: RouteCheckpoint[];
  currentLocationText?: string;
  /** Real coordinates for the shipment's current location, when known (e.g. an admin-set
   * facility, or a live simulation tick — both now keep these in sync with reality). When
   * present, the vehicle marker is drawn exactly here instead of a synthetic point computed
   * purely from progressPercent — that mismatch was how a shipment labeled "Denver, CO"
   * could end up plotted hundreds of miles away, in Kansas. */
  currentLat?: number;
  currentLng?: number;
  lastEventDescription?: string;
  totalDistance?: string;
  transitTime?: string;
  progressPercent?: number;
  shipmentStatus?: ShipmentStatus | string;
  delayNotice?: {
    hasDelay: boolean;
    reason: string;
    delayHours: number;
    advisoryNote?: string;
    originalETA?: string;
    revisedETA?: string;
  };
  onScrollToTimeline?: () => void;
  className?: string;
  showLegend?: boolean;
}

export const USJourneyMap: React.FC<USJourneyMapProps> = ({
  checkpoints = [],
  currentLocationText = 'Chicago, IL',
  currentLat,
  currentLng,
  lastEventDescription = 'Shipment in transit along verified interstate corridor.',
  totalDistance = '2,790 miles',
  transitTime = '24 Hours',
  progressPercent = 15,
  shipmentStatus = 'IN_TRANSIT',
  delayNotice,
  onScrollToTimeline,
  className = '',
  showLegend = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const completedLineRef = useRef<L.Polyline | null>(null);
  const remainingLineRef = useRef<L.Polyline | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const fullPolylineRef = useRef<[number, number][]>([]);
  const isInitializedRef = useRef<boolean>(false);
  const lastFittedRouteRef = useRef<string>('');

  const [activeLayer, setActiveLayer] = useState<'voyager' | 'satellite' | 'dark'>('voyager');

  // Esri's ArcGIS Online raster basemaps: no API key, no anonymous-usage gate
  // (unlike CARTO's basemaps.cartocdn.com, which now requires a key and was
  // rendering "API KEY REQUIRED" watermarks; and unlike raw tile.openstreetmap.org,
  // which throttles this kind of client-side traffic and left gray gaps).
  const tileLayers = {
    voyager: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri, HERE, Garmin, FAO, NOAA, USGS',
      subdomains: '',
      maxZoom: 19,
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri, Maxar, Earthstar Geographics',
      subdomains: '',
      maxZoom: 18,
    },
    dark: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri',
      subdomains: '',
      maxZoom: 16,
    }
  };

  const originPt = checkpoints.find(p => p.type === 'origin') || checkpoints[0] || {
    id: 'orig',
    name: 'New York, NY',
    state: 'NY',
    type: 'origin' as const,
    statusLabel: 'Origin',
    lat: 40.7128,
    lng: -74.0060
  };

  const destPt = checkpoints.find(p => p.type === 'destination') || checkpoints[checkpoints.length - 1] || {
    id: 'dest',
    name: 'Los Angeles, CA',
    state: 'CA',
    type: 'destination' as const,
    statusLabel: 'Destination',
    lat: 34.0522,
    lng: -118.2437
  };

  // Helper to create map pin icons
  const createCustomPin = (colorClass: string, label: string, role: string) => {
    const isCurrent = colorClass === 'pin-current';
    const isDelivered = role.includes('DELIVERED') || shipmentStatus === 'DELIVERED';
    const bg = colorClass === 'pin-origin' 
      ? '#16a34a' 
      : colorClass === 'pin-destination' 
        ? '#dc2626' 
        : isDelivered
          ? '#16a34a'
          : (delayNotice?.hasDelay ? '#d97706' : '#2563eb');
    // Pulses the marker whenever the shipment is genuinely in transit, not whenever an admin
    // happens to have the (now-removed) live-ticking preview open — a shipment that's really
    // moving pulses for every viewer, all the time, whether or not anyone's watching.
    const isActuallyMoving = shipmentStatus === 'IN_TRANSIT';

    return L.divIcon({
      className: 'dxp-clean-map-marker',
      html: `
        <div class="map-pin-container ${colorClass} ${isActuallyMoving ? 'is-simulating' : ''}">
          ${isCurrent && !isDelivered ? `<div class="radar-glow-ring ${isActuallyMoving ? 'active-pulse' : ''}"></div>` : ''}
          <div class="pin-badge" style="background: ${bg};">
            ${isCurrent ? '<div class="pin-inner-truck">📦</div>' : '<div class="pin-inner-white"></div>'}
          </div>
          <div class="pin-info-callout">
            <strong>${label}</strong>
            <div class="callout-sub-row">
              <span class="callout-tag" style="color: ${bg};">${role}</span>
            </div>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  const hasRealPosition = typeof currentLat === 'number' && typeof currentLng === 'number' &&
    !isNaN(currentLat) && !isNaN(currentLng);

  // Resolves where the vehicle marker should actually sit, and what percentage the
  // completed/remaining route split should use. When real coordinates are known (an
  // admin-set facility, or a live simulation tick — both keep currentLat/currentLng
  // genuinely accurate now), the marker is drawn at the nearest point ON the route line to
  // that real position, and the solid/dashed route line is split at that same point.
  //
  // This used to draw the marker at the raw, un-snapped currentLat/currentLng instead of
  // nearest.lat/nearest.lng — findNearestPointOnPolyline was only ever used to get a
  // progress percentage for the line split, and its actual nearest-point coordinates were
  // thrown away. Since currentLat/currentLng is computed independently (by the simulation
  // engine or server/progress.ts) against a synthetic route geometry that can differ from
  // whichever polyline this map is currently drawing (especially once the async live-road
  // route replaces the initial synthetic one), the marker would visibly float off the line
  // it was supposedly moving along.
  const resolveVehiclePosition = (polyline: [number, number][], progress: number) => {
    if (hasRealPosition && polyline.length > 1) {
      const nearest = findNearestPointOnPolyline(polyline, currentLat as number, currentLng as number);
      return { lat: nearest.lat, lng: nearest.lng, splitProgress: nearest.progressPercent };
    }
    const est = calculateEstimatedPosition(polyline, progress);
    return { lat: est.lat, lng: est.lng, splitProgress: progress };
  };

  // 1. Separate Tile Layer Switcher (Preserves camera pan/zoom without resetting)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const layerConfig = tileLayers[activeLayer];
    tileLayerRef.current = L.tileLayer(layerConfig.url, {
      subdomains: layerConfig.subdomains,
      maxZoom: layerConfig.maxZoom,
      attribution: layerConfig.attribution,
      errorTileUrl: TRANSPARENT_TILE,
    }).addTo(map);
  }, [activeLayer]);

  // =========================================================================
  // 2. BASE MAP & ROUTE INITIALIZATION (Runs on Mount & Route Changes)
  // =========================================================================
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let map = mapInstanceRef.current;
    if (!map) {
      map = L.map(mapContainerRef.current, {
        center: [39.8283, -98.5795],
        zoom: 4,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      });
      mapInstanceRef.current = map;

      const layerConfig = tileLayers[activeLayer];
      tileLayerRef.current = L.tileLayer(layerConfig.url, {
        subdomains: layerConfig.subdomains,
        maxZoom: layerConfig.maxZoom,
        attribution: layerConfig.attribution,
        errorTileUrl: TRANSPARENT_TILE,
      }).addTo(map);
    }

    // Compute route geometry
    const routePlan = calculateRouteGeometry(
      { lat: originPt.lat, lng: originPt.lng, name: originPt.name },
      { lat: destPt.lat, lng: destPt.lng, name: destPt.name }
    );
    fullPolylineRef.current = routePlan.polyline;
    const fullPolyline = routePlan.polyline;

    if (fullPolyline.length > 1) {
      const clampedProgress = Math.max(0, Math.min(100, progressPercent ?? 0));
      const vehiclePos = resolveVehiclePosition(fullPolyline, clampedProgress);
      const splitProgress = Math.max(0, Math.min(100, vehiclePos.splitProgress));
      let completedSegment: [number, number][] = [];
      let remainingSegment: [number, number][] = [];

      if (splitProgress <= 0) {
        completedSegment = [];
        remainingSegment = fullPolyline;
      } else if (splitProgress >= 100) {
        completedSegment = fullPolyline;
        remainingSegment = [];
      } else {
        const splitIndex = Math.min(
          fullPolyline.length - 1,
          Math.max(1, Math.floor((splitProgress / 100) * (fullPolyline.length - 1)))
        );
        completedSegment = fullPolyline.slice(0, splitIndex + 1);
        remainingSegment = fullPolyline.slice(splitIndex);
      }

      // Create or update Completed Polyline (Solid Royal Blue)
      if (!completedLineRef.current) {
        completedLineRef.current = L.polyline(completedSegment, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
          smoothFactor: 1.2,
        }).addTo(map);
      } else {
        completedLineRef.current.setLatLngs(completedSegment);
      }

      // Create or update Remaining Polyline (Dashed Sky Blue)
      if (!remainingLineRef.current) {
        remainingLineRef.current = L.polyline(remainingSegment, {
          color: '#60a5fa',
          weight: 3.5,
          opacity: 0.85,
          dashArray: '8, 10',
          lineCap: 'round',
          lineJoin: 'round',
          smoothFactor: 1.2,
        }).addTo(map);
      } else {
        remainingLineRef.current.setLatLngs(remainingSegment);
      }

      // Create or update Origin Marker
      if (!originMarkerRef.current) {
        originMarkerRef.current = L.marker([originPt.lat, originPt.lng], {
          icon: createCustomPin('pin-origin', originPt.name || 'Origin Terminal', 'ORIGIN TERMINAL')
        }).addTo(map);
      } else {
        originMarkerRef.current.setLatLng([originPt.lat, originPt.lng]);
        originMarkerRef.current.setIcon(
          createCustomPin('pin-origin', originPt.name || 'Origin Terminal', 'ORIGIN TERMINAL')
        );
      }

      // Create or update Destination Marker
      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker([destPt.lat, destPt.lng], {
          icon: createCustomPin('pin-destination', destPt.name || 'Destination Hub', 'DESTINATION HUB')
        }).addTo(map);
      } else {
        destMarkerRef.current.setLatLng([destPt.lat, destPt.lng]);
        destMarkerRef.current.setIcon(
          createCustomPin('pin-destination', destPt.name || 'Destination Hub', 'DESTINATION HUB')
        );
      }

      // Create or update Moving Vehicle Marker
      const estPos = vehiclePos;
      const roleText = (clampedProgress >= 100 || shipmentStatus === 'DELIVERED')
        ? 'CONSIGNMENT DELIVERED'
        : clampedProgress === 0
          ? 'STAGED AT ORIGIN'
          : shipmentStatus === 'ON_HOLD'
            ? 'TRANSIT PAUSED (HOLD)'
            : delayNotice?.hasDelay
              ? 'DELAY ADVISORY ACTIVE'
              : 'ESTIMATED POSITION';

      if (!vehicleMarkerRef.current) {
        vehicleMarkerRef.current = L.marker([estPos.lat, estPos.lng], {
          icon: createCustomPin('pin-current', currentLocationText || 'In Linehaul Transit', roleText),
          zIndexOffset: 1000
        }).addTo(map);
      } else {
        vehicleMarkerRef.current.setLatLng([estPos.lat, estPos.lng]);
        vehicleMarkerRef.current.setIcon(
          createCustomPin('pin-current', currentLocationText || 'In Linehaul Transit', roleText)
        );
      }

      // Fit bounds to entire route on initial mount or when origin/destination change
      const currentRouteKey = `${originPt.lat.toFixed(4)},${originPt.lng.toFixed(4)}->${destPt.lat.toFixed(4)},${destPt.lng.toFixed(4)}`;
      const routeChanged = lastFittedRouteRef.current !== currentRouteKey;
      if (routeChanged || !isInitializedRef.current) {
        lastFittedRouteRef.current = currentRouteKey;
        isInitializedRef.current = true;
        const bounds = L.latLngBounds(fullPolyline);
        map.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 7,
        });
      }
    }

    // Measure container and guarantee complete route visibility. animate:false on both calls
    // here deliberately — this fires 150ms after the fitBounds call above (which IS
    // animated), a corrective re-fit once the container has actually finished laying out, not
    // a user-facing camera move. Leaving it animated meant two CSS zoom transitions could
    // overlap (the first one from above still mid-flight when this one starts), which is
    // exactly the shape of race that crashes Leaflet's internal zoom-transition handler
    // (observed live: "Cannot read properties of undefined (reading '_leaflet_pos')" inside
    // _onZoomTransitionEnd) — especially likely to tip over when tiles are also failing to
    // load (e.g. behind a restrictive proxy), which adds its own extra reflows into the mix.
    const timer = setTimeout(() => {
      if (mapInstanceRef.current && fullPolyline.length > 1) {
        mapInstanceRef.current.invalidateSize({ animate: false });
        const bounds = L.latLngBounds(fullPolylineRef.current.length > 1 ? fullPolylineRef.current : fullPolyline);
        mapInstanceRef.current.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 7,
          animate: false,
        });
      }
    }, 150);

    // Asynchronously upgrade to actual US Interstate Highway road geometry
    let isCancelled = false;
    fetchLiveRoadRoute(
      { lat: originPt.lat, lng: originPt.lng, name: originPt.name },
      { lat: destPt.lat, lng: destPt.lng, name: destPt.name }
    ).then(liveRoad => {
      if (isCancelled || !mapInstanceRef.current || !liveRoad.polyline || liveRoad.polyline.length < 2) return;
      fullPolylineRef.current = liveRoad.polyline;
      const roadProgress = Math.max(0, Math.min(100, progressPercent ?? 0));
      const roadVehiclePos = resolveVehiclePosition(liveRoad.polyline, roadProgress);
      const roadSplitProgress = Math.max(0, Math.min(100, roadVehiclePos.splitProgress));
      let compSeg: [number, number][] = [];
      let remSeg: [number, number][] = [];

      if (roadSplitProgress <= 0) {
        compSeg = [];
        remSeg = liveRoad.polyline;
      } else if (roadSplitProgress >= 100) {
        compSeg = liveRoad.polyline;
        remSeg = [];
      } else {
        const roadSplit = Math.min(
          liveRoad.polyline.length - 1,
          Math.max(1, Math.floor((roadSplitProgress / 100) * (liveRoad.polyline.length - 1)))
        );
        compSeg = liveRoad.polyline.slice(0, roadSplit + 1);
        remSeg = liveRoad.polyline.slice(roadSplit);
      }

      if (completedLineRef.current) completedLineRef.current.setLatLngs(compSeg);
      if (remainingLineRef.current) remainingLineRef.current.setLatLngs(remSeg);

      const newEst = roadVehiclePos;
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.setLatLng([newEst.lat, newEst.lng]);
      }
    }).catch(() => {});

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [
    originPt.lat,
    originPt.lng,
    originPt.name,
    destPt.lat,
    destPt.lng,
    destPt.name
  ]);

  // =========================================================================
  // 2. HIGH-PERFORMANCE 60 FPS TELEMETRY UPDATER (NO MAP RE-RENDER / NO FLICKER)
  // =========================================================================
  useEffect(() => {
    const fullPolyline = fullPolylineRef.current;
    if (!fullPolyline || fullPolyline.length < 2) return;

    const clampedProgress = Math.max(0, Math.min(100, progressPercent ?? 0));
    const vehiclePos = resolveVehiclePosition(fullPolyline, clampedProgress);
    const splitProgress = Math.max(0, Math.min(100, vehiclePos.splitProgress));
    let completedSegment: [number, number][] = [];
    let remainingSegment: [number, number][] = [];

    if (splitProgress <= 0) {
      completedSegment = [];
      remainingSegment = fullPolyline;
    } else if (splitProgress >= 100) {
      completedSegment = fullPolyline;
      remainingSegment = [];
    } else {
      const splitIndex = Math.min(
        fullPolyline.length - 1,
        Math.max(1, Math.floor((splitProgress / 100) * (fullPolyline.length - 1)))
      );
      completedSegment = fullPolyline.slice(0, splitIndex + 1);
      remainingSegment = fullPolyline.slice(splitIndex);
    }

    // 1. Smoothly update completed path
    if (completedLineRef.current) {
      completedLineRef.current.setLatLngs(completedSegment);
    }

    // 2. Smoothly update remaining path
    if (remainingLineRef.current) {
      remainingLineRef.current.setLatLngs(remainingSegment);
    }

    // 3. Smoothly glide vehicle marker position along highway coordinates
    const estPos = vehiclePos;
    const roleText = (clampedProgress >= 100 || shipmentStatus === 'DELIVERED')
      ? 'CONSIGNMENT DELIVERED'
      : clampedProgress === 0
        ? 'STAGED AT ORIGIN'
        : shipmentStatus === 'ON_HOLD'
          ? 'TRANSIT PAUSED (HOLD)'
          : delayNotice?.hasDelay
            ? 'DELAY ADVISORY ACTIVE'
            : 'ESTIMATED POSITION';

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([estPos.lat, estPos.lng]);
      vehicleMarkerRef.current.setIcon(
        createCustomPin('pin-current', currentLocationText || 'In Linehaul Transit', roleText)
      );
    }
  }, [
    progressPercent,
    currentLocationText,
    currentLat,
    currentLng,
    shipmentStatus,
    delayNotice?.hasDelay,
    delayNotice?.reason
  ]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        completedLineRef.current = null;
        remainingLineRef.current = null;
        originMarkerRef.current = null;
        destMarkerRef.current = null;
        vehicleMarkerRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      const points = (fullPolylineRef.current && fullPolylineRef.current.length > 1)
        ? fullPolylineRef.current
        : [[originPt.lat, originPt.lng], [destPt.lat, destPt.lng]];
      const bounds = L.latLngBounds(points as [number, number][]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 7 });
    }
  };

  const isHold = shipmentStatus === 'ON_HOLD';
  const isDelayed = shipmentStatus === 'DELAYED';

  const originDisplay = originPt.name && (originPt.name.includes(',') || !originPt.state)
    ? originPt.name
    : `${originPt.name}, ${originPt.state}`;

  const destDisplay = destPt.name && (destPt.name.includes(',') || !destPt.state)
    ? destPt.name
    : `${destPt.name}, ${destPt.state}`;

  return (
    <div className={`dxp-journey-map-card ${className}`}>
      {/* 1. Gorgeous 3-Column Route Stages Header */}
      <div className="map-route-stages-header">
        {/* Origin Node */}
        <div className="stage-node-box origin-box">
          <div className="stage-tag-badge origin">
            <span className="dot-indicator green" />
            <span>ORIGIN</span>
          </div>
          <h4 className="stage-city-title">{originDisplay || 'Origin Terminal'}</h4>
          <span className="stage-facility-sub">Origin Gateway Terminal</span>
        </div>

        {/* Center Transit Corridor Pill */}
        <div className="stage-transit-center">
          <div className="transit-status-pill">
            <Truck size={14} className="text-blue" />
            <span>
              {isHold ? 'TRANSIT PAUSED (HOLD)' : isDelayed ? 'TRANSIT DELAY ADVISORY' : 'ESTIMATED TRANSIT CORRIDOR'}
            </span>
          </div>
          <div className="transit-metrics-row">
            <span className="metric-text font-semibold">{totalDistance}</span>
            <span className="metric-sep">•</span>
            <span className="metric-text font-semibold">{transitTime}</span>
            <span className="metric-sep">•</span>
            <span className="metric-progress-tag text-blue font-bold">{progressPercent}% Complete</span>
          </div>
        </div>

        {/* Destination Node */}
        <div className="stage-node-box dest-box">
          <div className="stage-tag-badge destination">
            <span className="dot-indicator red" />
            <span>DESTINATION</span>
          </div>
          <h4 className="stage-city-title">{destDisplay || 'Destination Hub'}</h4>
          <span className="stage-facility-sub">Consignee Destination</span>
        </div>
      </div>

      {/* 2. Map Canvas Viewport Area */}
      <div className="map-viewport-wrapper">
        <div ref={mapContainerRef} className="leaflet-map-canvas" />

        {/* Floating Controls */}
        <div className="map-floating-controls">
          <div className="zoom-btn-group">
            <button className="map-ctrl-btn" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={16} />
            </button>
            <button className="map-ctrl-btn" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <button className="map-ctrl-btn" onClick={handleRecenter} title="Recenter Complete Route">
              <Compass size={16} />
            </button>
          </div>

          <div className="layer-selector-group">
            <button
              className={`layer-btn ${activeLayer === 'voyager' ? 'active' : ''}`}
              onClick={() => setActiveLayer('voyager')}
            >
              Daylight
            </button>
            <button
              className={`layer-btn ${activeLayer === 'satellite' ? 'active' : ''}`}
              onClick={() => setActiveLayer('satellite')}
            >
              Satellite
            </button>
            <button
              className={`layer-btn ${activeLayer === 'dark' ? 'active' : ''}`}
              onClick={() => setActiveLayer('dark')}
            >
              Night
            </button>
          </div>
        </div>

        {/* Hold / Delay Floating Banner — genuinely exceptional states worth calling out.
            There used to also be a banner here for "an admin has a live simulation preview
            open," but that was only ever meaningful while the old client-side ticking
            existed; a shipment just being normally in transit isn't exceptional enough to
            warrant its own alert banner (the pulsing marker and header pill already show
            that). */}
        {isHold && (
          <div className="map-floating-alert hold animate-fade-in">
            <div className="gps-alert-main">
              <Pause size={15} />
              <span>Transit Paused: Shipment staged at intermediate checkpoint.</span>
            </div>
          </div>
        )}
        {delayNotice?.hasDelay && (
          <div className="map-floating-alert delayed animate-fade-in">
            <AlertTriangle size={15} />
            <span>Transit Delay (+{delayNotice.delayHours}h): {delayNotice.reason} — {delayNotice.advisoryNote}</span>
          </div>
        )}
        {!delayNotice?.hasDelay && isDelayed && (
          <div className="map-floating-alert delayed animate-fade-in">
            <AlertTriangle size={15} />
            <span>Transit Delay: Highway linehaul schedule extended.</span>
          </div>
        )}
      </div>

      {/* 3. Route Status Footer Bar */}
      <div className="map-footer-status-bar">
        <div className="footer-status-left">
          <Compass size={16} className="text-blue" />
          <span>
            <strong>Estimated Position (Schedule-based):</strong> {lastEventDescription || `Progressing along scheduled interstate corridor near ${currentLocationText}`}
          </span>
        </div>
        {onScrollToTimeline && (
          <button className="view-timeline-shortcut-btn" onClick={onScrollToTimeline}>
            <span>View Full Timeline</span>
            <ChevronDown size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
