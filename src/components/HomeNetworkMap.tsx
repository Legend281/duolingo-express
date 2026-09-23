import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './HomeNetworkMap.css';

interface HubData {
  code: 'ORD' | 'JFK' | 'DFW' | 'DEN' | 'LAX';
  name: string;
  terminal: string;
  lat: number;
  lng: number;
  status: string;
  departures: string;
}

const HUBS: HubData[] = [
  { code: 'JFK', name: 'New York JFK', terminal: 'JFK International Gateway (JFK-01)', lat: 40.6413, lng: -73.7781, status: 'ONLINE', departures: '128 Linehauls/Day' },
  { code: 'ORD', name: 'Chicago ORD', terminal: 'Midwest Sortation Gateway (ORD-03)', lat: 41.9742, lng: -87.9073, status: 'ONLINE', departures: '142 Linehauls/Day' },
  { code: 'DFW', name: 'Dallas DFW', terminal: 'Southwest Intermodal Gateway (DFW-04)', lat: 32.8998, lng: -97.0403, status: 'ONLINE', departures: '98 Linehauls/Day' },
  { code: 'DEN', name: 'Denver DEN', terminal: 'Mountain Regional Hub (DEN-05)', lat: 39.8561, lng: -104.6737, status: 'ONLINE', departures: '76 Linehauls/Day' },
  { code: 'LAX', name: 'Los Angeles LAX', terminal: 'Pacific Coast Gateway (LAX-06)', lat: 33.9416, lng: -118.4085, status: 'ONLINE', departures: '114 Linehauls/Day' },
];

interface HomeNetworkMapProps {
  activeHub: 'ORD' | 'JFK' | 'DFW' | 'DEN' | 'LAX';
  onSelectHub: (hub: 'ORD' | 'JFK' | 'DFW' | 'DEN' | 'LAX') => void;
}

export const HomeNetworkMap: React.FC<HomeNetworkMapProps> = ({ activeHub, onSelectHub }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize map centered over Continental US
    const map = L.map(mapContainerRef.current, {
      center: [39.5, -98.35],
      zoom: 4,
      minZoom: 3,
      maxZoom: 7,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false
    });

    // Esri's ArcGIS Online basemap tiles: no API key required, and unlike raw
    // tile.openstreetmap.org (which actively throttles/blocks this kind of client-side
    // production traffic — see FacilityNetworkMap.tsx and USJourneyMap.tsx, already on
    // ArcGIS for the same reason), these are meant for exactly this kind of usage.
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '&copy; Esri, HERE, Garmin, FAO, NOAA, USGS',
      errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Draw connecting corridor routes
    const routes: [number, number][][] = [
      [[40.6413, -73.7781], [41.9742, -87.9073]], // JFK - ORD
      [[41.9742, -87.9073], [32.8998, -97.0403]], // ORD - DFW
      [[41.9742, -87.9073], [39.8561, -104.6737]], // ORD - DEN
      [[39.8561, -104.6737], [33.9416, -118.4085]], // DEN - LAX
      [[32.8998, -97.0403], [33.9416, -118.4085]], // DFW - LAX
    ];

    routes.forEach((route) => {
      L.polyline(route, {
        color: '#ea580c',
        weight: 3,
        opacity: 0.65,
        dashArray: '6, 8',
        className: 'animated-corridor-line'
      }).addTo(map);
    });

    // Create markers for each hub
    HUBS.forEach((hub) => {
      const isSelected = hub.code === activeHub;

      const customIcon = L.divIcon({
        className: 'hub-leaflet-marker-wrap',
        html: `
          <div class="hub-marker-beacon ${isSelected ? 'active-beacon' : ''}">
            <div class="hub-marker-ping"></div>
            <div class="hub-marker-core"></div>
            <div class="hub-marker-label font-mono">${hub.code}</div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const marker = L.marker([hub.lat, hub.lng], { icon: customIcon }).addTo(map);
      
      marker.on('click', () => {
        onSelectHub(hub.code);
      });

      markersRef.current[hub.code] = marker;
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map view and active marker when activeHub prop changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const targetHub = HUBS.find((h) => h.code === activeHub);
    if (!targetHub) return;

    mapInstanceRef.current.flyTo([targetHub.lat, targetHub.lng], 5, {
      duration: 1.2
    });

    // Update marker styling
    HUBS.forEach((hub) => {
      const marker = markersRef.current[hub.code];
      if (marker) {
        const isSelected = hub.code === activeHub;
        const customIcon = L.divIcon({
          className: 'hub-leaflet-marker-wrap',
          html: `
            <div class="hub-marker-beacon ${isSelected ? 'active-beacon' : ''}">
              <div class="hub-marker-ping"></div>
              <div class="hub-marker-core"></div>
              <div class="hub-marker-label font-mono">${hub.code}</div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
        marker.setIcon(customIcon);
      }
    });
  }, [activeHub]);

  return (
    <div className="home-network-map-wrapper">
      <div ref={mapContainerRef} className="home-leaflet-map-container" />
      <div className="map-overlay-badge font-mono">
        <span className="live-dot" />
        <span>50+ LIVE U.S. GATEWAYS CONNECTED</span>
      </div>
    </div>
  );
};
