import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Building, MapPin, Phone, Clock, ShieldCheck, ZoomIn, ZoomOut, Compass, Radio } from 'lucide-react';
import './FacilityNetworkMap.css';

export interface FacilityNode {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  coordinates: [number, number]; // [lat, lng]
  hours: string;
  phone: string;
  status: 'OPTIMAL' | '24/7 ACTIVE' | 'INTAKE OPEN';
  services: string[];
}

export const NETWORK_FACILITIES: FacilityNode[] = [
  {
    id: 'fac-jfk',
    code: 'JFK',
    name: 'JFK Regional Sortation Gateway',
    type: 'Northeast Master Sortation Hub & Armored Vault',
    address: 'JFK International Airport, Cargo Area B',
    city: 'New York',
    state: 'NY',
    zip: '11430',
    coordinates: [40.6413, -73.7781],
    hours: '24/7 Continuous Sortation Operations',
    phone: '1-800-555-0199 (Ext 102)',
    status: '24/7 ACTIVE',
    services: ['Priority Express Courier', 'Scheduled Commercial Linehaul', 'Time-Critical Secure Vault']
  },
  {
    id: 'fac-man',
    code: 'NYC',
    name: 'Manhattan Primary Intake Terminal',
    type: 'Urban Express Counter & Same-Day Dispatch',
    address: '140 West Street, 8th Floor',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    coordinates: [40.7138, -74.0132],
    hours: 'Mon - Fri: 7:00 AM - 9:00 PM ET',
    phone: '1-800-555-0199 (Ext 101)',
    status: 'INTAKE OPEN',
    services: ['Priority Express Courier', 'Counter Drop-Off & Client Intake']
  },
  {
    id: 'fac-ord',
    code: 'ORD',
    name: 'Chicago Midwest Distribution Center',
    type: 'Midwest Gateway & Central Linehaul Cross-Dock',
    address: '500 W Harrison Street',
    city: 'Chicago',
    state: 'IL',
    zip: '60607',
    coordinates: [41.8748, -87.6401],
    hours: '24/7 Continuous Linehaul Operations',
    phone: '1-800-555-0199 (Ext 103)',
    status: '24/7 ACTIVE',
    services: ['Priority Express Courier', 'Scheduled Commercial Linehaul', 'Auto Transport Hub']
  },
  {
    id: 'fac-dfw',
    code: 'DFW',
    name: 'Dallas Southern Gateway Logistics Hub',
    type: 'Southwest Express & Vehicle Carrier Fleet Depot',
    address: 'DFW Logistics Interchange',
    city: 'Dallas',
    state: 'TX',
    zip: '75261',
    coordinates: [32.8998, -97.0403],
    hours: '24/7 Continuous Sortation Operations',
    phone: '1-800-555-0199 (Ext 104)',
    status: '24/7 ACTIVE',
    services: ['Commercial Linehaul', 'Auto & Vehicle Transport', 'Secure Vault']
  },
  {
    id: 'fac-lax',
    code: 'LAX',
    name: 'Los Angeles Pacific Gateway Terminal',
    type: 'West Coast Destination Hub & Fleet Dispatch',
    address: '900 Wilshire Blvd, Suite 1400',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90021',
    coordinates: [34.0505, -118.2598],
    hours: 'Mon - Sat: 6:00 AM - 10:00 PM PT',
    phone: '1-800-555-0199 (Ext 105)',
    status: 'INTAKE OPEN',
    services: ['Priority Express Courier', 'Scheduled Commercial Linehaul', 'Auto & Vehicle Transport']
  },
  {
    id: 'fac-atl',
    code: 'ATL',
    name: 'Atlanta Southeast Regional Depot',
    type: 'Southeast Corridor Linehaul Sortation & Transfer',
    address: 'Hartsfield Logistics Way',
    city: 'Atlanta',
    state: 'GA',
    zip: '30320',
    coordinates: [33.6407, -84.4277],
    hours: 'Mon - Fri: 6:00 AM - 11:00 PM ET',
    phone: '1-800-555-0199 (Ext 106)',
    status: 'INTAKE OPEN',
    services: ['Scheduled Commercial Linehaul', 'Priority Express Courier']
  }
];

// Major Scheduled Interstate Linehaul Corridors connecting our hubs
const LINEHAUL_CORRIDORS: [ [number, number], [number, number] ][] = [
  // Northeast (JFK/NYC) to Midwest (ORD)
  [ [40.6413, -73.7781], [41.8748, -87.6401] ],
  // Midwest (ORD) to Southwest (DFW)
  [ [41.8748, -87.6401], [32.8998, -97.0403] ],
  // Southwest (DFW) to Pacific (LAX)
  [ [32.8998, -97.0403], [34.0505, -118.2598] ],
  // Midwest (ORD) to Pacific (LAX)
  [ [41.8748, -87.6401], [34.0505, -118.2598] ],
  // Northeast (JFK) to Southeast (ATL)
  [ [40.6413, -73.7781], [33.6407, -84.4277] ],
  // Southeast (ATL) to Southwest (DFW)
  [ [33.6407, -84.4277], [32.8998, -97.0403] ]
];

export const FacilityNetworkMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const [selectedFacility, setSelectedFacility] = useState<FacilityNode>(NETWORK_FACILITIES[0]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize U.S. National Overview
      const map = L.map(mapContainerRef.current, {
        center: [39.5, -96.5],
        zoom: 4,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false
      });

      // Esri's ArcGIS Online basemap tiles: no API key required (CARTO's
      // basemaps.cartocdn.com now gates raster tiles behind a key, and raw
      // tile.openstreetmap.org throttles this kind of client-side traffic).
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '&copy; Esri, HERE, Garmin, FAO, NOAA, USGS',
        errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7'
      }).addTo(map);

      // Render Scheduled Interstate Linehaul Corridors (Subtle glowing dashed lines)
      LINEHAUL_CORRIDORS.forEach(corridor => {
        // Outer glow
        L.polyline(corridor, {
          color: '#f97316',
          weight: 4,
          opacity: 0.25,
          dashArray: '8, 8'
        }).addTo(map);

        // Inner crisp line
        L.polyline(corridor, {
          color: '#ea580c',
          weight: 2,
          opacity: 0.75,
          dashArray: '6, 6'
        }).addTo(map);
      });

      // Render Fixed Facility Hub Pins
      NETWORK_FACILITIES.forEach(fac => {
        const iconHtml = `
          <div class="facility-map-marker-pin ${fac.id === selectedFacility.id ? 'active' : ''}">
            <div class="marker-pulse-ring"></div>
            <div class="marker-pin-inner">
              <span class="marker-pin-code font-mono">${fac.code}</span>
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-facility-div-icon',
          html: iconHtml,
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        });

        const marker = L.marker(fac.coordinates, { icon: customIcon }).addTo(map);

        marker.on('click', () => {
          setSelectedFacility(fac);
          map.flyTo(fac.coordinates, 6, { duration: 1.2 });
        });

        // Bind interactive rich popup
        const popupContent = `
          <div class="facility-map-popup font-sans">
            <div class="popup-badge font-mono">${fac.code} GATEWAY</div>
            <h4>${fac.name}</h4>
            <p class="popup-type">${fac.type}</p>
            <p class="popup-address">${fac.address}, ${fac.city}, ${fac.state} ${fac.zip}</p>
            <div class="popup-status-pill">
              <span class="status-dot"></span> ${fac.status}
            </div>
            <div class="popup-phone font-mono">${fac.phone}</div>
          </div>
        `;
        marker.bindPopup(popupContent, { offset: [0, -16], closeButton: false });

        markersRef.current[fac.id] = marker;
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleSelectFacility = (fac: FacilityNode) => {
    setSelectedFacility(fac);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(fac.coordinates, 6, { duration: 1.2 });
      const marker = markersRef.current[fac.id];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  const handleResetZoom = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([39.5, -96.5], 4, { duration: 1.2 });
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className="facility-network-map-wrapper">
      {/* 1. Facility Selector Filter Tabs */}
      <div className="facility-tabs-bar">
        <button
          type="button"
          className="btn-national-view"
          onClick={handleResetZoom}
          title="Reset to National Network View"
        >
          <Compass size={14} />
          <span>National View</span>
        </button>

        <div className="facility-chips-list">
          {NETWORK_FACILITIES.map(fac => (
            <button
              key={fac.id}
              type="button"
              className={`facility-chip ${selectedFacility.id === fac.id ? 'active' : ''}`}
              onClick={() => handleSelectFacility(fac)}
            >
              <span className="chip-code font-mono">{fac.code}</span>
              <span className="chip-name">{fac.city}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Interactive Map Viewport */}
      <div className="facility-map-stage">
        <div ref={mapContainerRef} className="facility-leaflet-container" />

        {/* Map Floating HUD Controls */}
        <div className="facility-map-controls">
          <button type="button" onClick={handleZoomIn} aria-label="Zoom in" title="Zoom In">
            <ZoomIn size={16} />
          </button>
          <button type="button" onClick={handleZoomOut} aria-label="Zoom out" title="Zoom Out">
            <ZoomOut size={16} />
          </button>
          <button type="button" onClick={handleResetZoom} aria-label="Reset Map" title="Reset Overview">
            <Compass size={16} />
          </button>
        </div>

        {/* Legend Badge */}
        <div className="facility-map-legend font-mono">
          <div className="legend-item">
            <span className="legend-marker-dot"></span>
            <span>Intake Gateway Hub</span>
          </div>
          <div className="legend-item">
            <span className="legend-line-dash"></span>
            <span>Scheduled Linehaul Corridor</span>
          </div>
        </div>
      </div>

      {/* 3. Selected Facility Spotlight Card */}
      {selectedFacility && (
        <div className="facility-spotlight-card animate-fade-in">
          <div className="spotlight-header">
            <div>
              <div className="spotlight-code-badge font-mono">
                <Radio size={12} className="text-orange" />
                <span>{selectedFacility.code} REGIONAL GATEWAY</span>
                <span className="spotlight-status font-mono">● {selectedFacility.status}</span>
              </div>
              <h3>{selectedFacility.name}</h3>
              <p className="spotlight-type">{selectedFacility.type}</p>
            </div>
            <div className="spotlight-phone-box">
              <small>Direct Dispatch Connection</small>
              <strong>{selectedFacility.phone}</strong>
            </div>
          </div>

          <div className="spotlight-details-grid">
            <div className="spotlight-info-item">
              <MapPin size={16} className="text-orange flex-shrink-0" />
              <div>
                <small>Intake Facility Address</small>
                <strong>{selectedFacility.address}, {selectedFacility.city}, {selectedFacility.state} {selectedFacility.zip}</strong>
              </div>
            </div>

            <div className="spotlight-info-item">
              <Clock size={16} className="text-orange flex-shrink-0" />
              <div>
                <small>Operating Intake Hours</small>
                <strong>{selectedFacility.hours}</strong>
              </div>
            </div>

            <div className="spotlight-info-item span-full">
              <ShieldCheck size={16} className="text-emerald flex-shrink-0" />
              <div>
                <small>Available Courier & Dispatch Services</small>
                <div className="spotlight-services-pills">
                  {selectedFacility.services.map((srv, idx) => (
                    <span key={idx} className="service-tag font-mono">{srv}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
