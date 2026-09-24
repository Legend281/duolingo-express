import React from 'react';
import { MapPin, Building, Phone, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { FacilityNetworkMap } from '../components/FacilityNetworkMap';
import { useAdminData } from '../context/AdminDataContext';
import './LocationsPage.css';

interface LocationsPageProps {
  onNavigate?: (page: string) => void;
}

export const LocationsPage: React.FC<LocationsPageProps> = ({ onNavigate }) => {
  const { settings } = useAdminData();
  const dotNumber = settings.dotNumber || 'USDOT #3894210 · MC-892401';
  const facilities = [
    {
      name: 'Manhattan Origin Terminal',
      city: '140 West Street, New York, NY 10001',
      type: 'Primary Urban Intake & Regional Dispatch',
      hours: 'Mon - Fri: 7:00 AM - 9:00 PM ET',
      phone: '1-800-555-0199 (Ext 101)',
    },
    {
      name: 'JFK Regional Sortation Gateway',
      city: 'JFK Cargo Area B, Jamaica, NY 11430',
      type: 'Northeast Express Sortation & Vault Intake',
      hours: '24/7 Continuous Sortation Operations',
      phone: '1-800-555-0199 (Ext 102)',
    },
    {
      name: 'Chicago Midwest Distribution Center',
      city: '500 W Harrison St, Chicago, IL 60607',
      type: 'Midwest Express Linehaul Gateway Hub',
      hours: '24/7 Continuous Linehaul Operations',
      phone: '1-800-555-0199 (Ext 103)',
    },
    {
      name: 'Dallas Southern Gateway Logistics Hub',
      city: 'DFW Airport Logistics Center, Dallas, TX 75261',
      type: 'Southern Corridor Express & Vehicle Dispatch',
      hours: '24/7 Continuous Operations',
      phone: '1-800-555-0199 (Ext 104)',
    },
    {
      name: 'Los Angeles Pacific Gateway Terminal',
      city: '900 Wilshire Blvd, Los Angeles, CA 90021',
      type: 'West Coast Destination Hub & Fleet Dispatch',
      hours: 'Mon - Sat: 6:00 AM - 10:00 PM PT',
      phone: '1-800-555-0199 (Ext 105)',
    },
    {
      name: 'Atlanta Southeast Regional Depot',
      city: 'Hartsfield Logistics Way, Atlanta, GA 30320',
      type: 'Southeast Linehaul Sortation & Intake',
      hours: 'Mon - Fri: 6:00 AM - 11:00 PM ET',
      phone: '1-800-555-0199 (Ext 106)',
    },
  ];

  return (
    <div className="dxp-page-locations">
      {/* =========================================================================
          1. CINEMATIC HERO SECTION
          ========================================================================= */}
      <section className="dxp-locations-hero">
        <div className="locations-hero-bg-overlay" />
        <div className="dxp-container-wide locations-hero-inner">
          <div className="locations-hero-pill animate-fade-in">
            <span className="locations-pulse-dot" />
            <span>{dotNumber} · NATIONAL GATEWAY NETWORK</span>
          </div>

          <h1 className="locations-hero-title animate-fade-in">
            U.S. Regional Gateways & <span className="locations-highlight-orange">Sortation Hubs.</span>
          </h1>

          <p className="locations-hero-lead animate-fade-in">
            Explore our nationwide network of primary intake gateways, sorting centers, and monitored transfer bays connecting critical interstate courier corridors.
          </p>
        </div>
      </section>

      {/* =========================================================================
          2. MAIN BODY: MAP & FACILITY CARDS
          ========================================================================= */}
      <div className="dxp-container-wide dxp-locations-content">
        <div className="locations-map-feature animate-fade-in">
          <div className="map-card-header">
            <div className="map-badge-pill font-mono">NATIONAL INFRASTRUCTURE RADAR</div>
            <h3>Primary Gateway Terminals & Scheduled Corridors</h3>
            <p>Interactive overview of our fixed intake bays and connecting linehaul routes across the United States.</p>
          </div>
          <FacilityNetworkMap />
        </div>

        <div className="facilities-section-head">
          <span className="section-eyebrow">SORTATION FACILITIES</span>
          <h2>Primary Terminal Locations & Intake Bays</h2>
          <p>Drop off consignments directly or coordinate facility pickup with our local dispatch teams.</p>
        </div>

        <div className="locations-list-grid">
          {facilities.map((fac, idx) => (
            <div key={idx} className="facility-card">
              <div className="facility-icon-pill"><Building size={20} /></div>
              <h3>{fac.name}</h3>
              <span className="fac-type font-mono">{fac.type}</span>
              <p className="fac-address">{fac.city}</p>
              
              <div className="fac-meta-info">
                <div className="fac-meta-row">
                  <Clock size={14} className="text-orange" />
                  <span>{fac.hours}</span>
                </div>
                <div className="fac-meta-row">
                  <Phone size={14} className="text-orange" />
                  <span>{fac.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
