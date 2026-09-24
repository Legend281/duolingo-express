import React, { useState, useEffect } from 'react';
import {
  Search,
  Lock,
  ArrowRight,
  Truck,
  FileText,
  AlertTriangle,
  Copy,
  Check,
  ShieldCheck,
  Building,
  Clock,
  Layers,
  Phone,
  HelpCircle,
  X
} from 'lucide-react';
import { SupportModal } from '../components/SupportModal';
import { PRIMARY_SHIPMENT, getShipmentByTrackingNumber } from '../data/mockShipments';
import { Shipment } from '../types/shipment';
import { api } from '../services/api';
import { useAdminData } from '../context/AdminDataContext';
import './TrackPage.css';

interface TrackPageProps {
  onTrack: (trackingNumber: string) => void;
  onNavigate: (page: string) => void;
  notFoundQuery?: string | null;
}

export const TrackPage: React.FC<TrackPageProps> = ({ onTrack, onNavigate, notFoundQuery }) => {
  const { settings } = useAdminData();
  const supportPhone = settings.supportPhone || '1-800-555-0199';
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [multiInput, setMultiInput] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportIssue, setSupportIssue] = useState('General Inquiry');
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Batch Multi-Tracking Drawer State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchShipments, setBatchShipments] = useState<Shipment[]>([]);
  const [batchFilter, setBatchFilter] = useState<'ALL' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED'>('ALL');

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dxp_recent_tracking');
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 4));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const saveRecentSearch = (num: string) => {
    try {
      const clean = num.trim().toUpperCase();
      const existing = recentSearches.filter(n => n.toUpperCase() !== clean);
      const updated = [clean, ...existing].slice(0, 4);
      setRecentSearches(updated);
      localStorage.setItem('dxp_recent_tracking', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = trackingNumber.trim();
    if (clean) {
      saveRecentSearch(clean);
      onTrack(clean);
    }
  };

  const handleQuickTrack = (num: string) => {
    setTrackingNumber(num);
    saveRecentSearch(num);
    onTrack(num);
  };

  const handleMultiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawNumbers = multiInput.split('\n').map(s => s.trim()).filter(Boolean);
    if (rawNumbers.length === 0) return;

    if (rawNumbers.length === 1) {
      handleQuickTrack(rawNumbers[0]);
      return;
    }

    // Each number is looked up through the same masked public endpoint single tracking
    // uses (api.trackShipment -> /api/track/:id) — this used to search the raw admin
    // shipments list directly, which meant pasting in any handful of tracking numbers (not
    // just your own) returned full unmasked sender/recipient/pricing details for whichever
    // ones happened to match a real shipment.
    const resolved: Shipment[] = await Promise.all(
      rawNumbers.map(async (num) => {
        const clean = num.toUpperCase();
        try {
          const real = await api.trackShipment(clean);
          if (real) return real;
        } catch {
          // not found via API — fall through to mock/placeholder below
        }
        const inMock = getShipmentByTrackingNumber(clean);
        if (inMock) return inMock;
        return {
          ...PRIMARY_SHIPMENT,
          trackingNumber: clean,
          status: 'IN_TRANSIT',
          statusText: 'In Linehaul Transit · Active Corridor',
          lastUpdated: 'Just now'
        } as Shipment;
      })
    );

    setBatchShipments(resolved);
    setBatchModalOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(text);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  return (
    <div className="dxp-page-track">
      {/* =========================================================================
          1. CLEAN EXECUTIVE TRACKING PORTAL HERO
          ========================================================================= */}
      <section className="track-hero-section">
        <div className="track-hero-bg-overlay" />
        <div className="dxp-container-wide track-hero-container">
          <div className="track-hero-header">
            <div className="track-hero-pill animate-fade-in">
              <span className="track-pulse-dot" />
              <span>NATIONWIDE COURIER & LINEHAUL TRACKING ENGINE</span>
            </div>

            <h1 className="track-hero-headline animate-fade-in">
              Track Your Shipment with <span className="track-highlight-orange">Piece-Level Precision.</span>
            </h1>
            <p className="track-hero-subtext animate-fade-in">
              Enter your tracking identifier or Bill of Lading (BOL) reference to inspect real-time linehaul progress, verified scan milestones, and dynamic arrival estimates.
            </p>
          </div>

          {/* Not Found Alert Banner */}
          {notFoundQuery && (
            <div className="track-not-found-banner animate-fade-in">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
              <div>
                <strong>Consignment Reference Not Found</strong>
                <p>
                  No active shipment or rate inquiry matches <span className="font-mono font-bold">"{notFoundQuery}"</span>. Please check the tracking number printed on your physical label or dispatch manifest.
                </p>
              </div>
            </div>
          )}

          {/* =========================================================================
              2. CENTRAL INTERACTIVE TRACKING TERMINAL CARD
              ========================================================================= */}
          <div className="track-terminal-card animate-fade-in">
            {/* Mode Switcher Tabs */}
            <div className="terminal-tabs-row">
              <button
                type="button"
                className={`terminal-tab-btn ${activeTab === 'single' ? 'active' : ''}`}
                onClick={() => setActiveTab('single')}
              >
                <Search size={16} />
                <span>Single Tracking Number</span>
              </button>

              <button
                type="button"
                className={`terminal-tab-btn ${activeTab === 'batch' ? 'active' : ''}`}
                onClick={() => setActiveTab('batch')}
              >
                <Layers size={16} />
                <span>Batch Multi-Tracking</span>
              </button>
            </div>

            {/* TAB 1: SINGLE TRACKING */}
            {activeTab === 'single' && (
              <form onSubmit={handleSingleSubmit} className="terminal-form-single">
                <div className="terminal-input-wrapper">
                  <Search size={22} className="terminal-search-icon" />
                  <input
                    type="text"
                    placeholder="Enter tracking number (e.g. DXP-2026-7K2M9QRX or QR-2026-88752)"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="terminal-input font-mono"
                    autoFocus
                  />
                  {trackingNumber && (
                    <button
                      type="button"
                      className="terminal-clear-btn"
                      onClick={() => setTrackingNumber('')}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <button type="submit" className="btn-corp-primary terminal-submit-btn">
                  <span>Track Shipment</span>
                  <ArrowRight size={17} />
                </button>
              </form>
            )}

            {/* TAB 2: BATCH MULTI-TRACKING */}
            {activeTab === 'batch' && (
              <form onSubmit={handleMultiSubmit} className="terminal-form-batch">
                <label className="batch-label">
                  Enter up to 10 tracking numbers (one per line):
                </label>
                <textarea
                  rows={4}
                  value={multiInput}
                  onChange={(e) => setMultiInput(e.target.value)}
                  className="terminal-textarea font-mono"
                  placeholder="DXP-2026-7K2M9QRX&#10;DXP-2026-8M4P2LQA&#10;DXP-2026-3J7N6KRB"
                />
                <div className="batch-actions-row">
                  <span className="batch-hint-text">
                    Consolidates multiple commercial dispatches into a single fleet monitor.
                  </span>
                  <button type="submit" className="btn-corp-primary terminal-submit-btn">
                    <span>Track Batch Shipments</span>
                    <ArrowRight size={17} />
                  </button>
                </div>
              </form>
            )}

            {/* Terminal Helper & Recent Searches (No Fake Dummy Numbers) */}
            <div className="terminal-footer">
              {/* Only show recent searches if the user has previously queried a number */}
              {recentSearches.length > 0 && (
                <div className="recent-searches-group">
                  <span className="quick-samples-label">Your Recent Lookups:</span>
                  <div className="quick-chips-row">
                    {recentSearches.map((num, i) => (
                      <button
                        key={i}
                        type="button"
                        className="recent-chip-btn font-mono"
                        onClick={() => handleQuickTrack(num)}
                      >
                        <Clock size={12} />
                        <span>{num}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Security & Access Strip */}
              <div className="terminal-trust-strip">
                <div className="trust-item">
                  <Lock size={14} className="text-emerald" />
                  <span>Public Ledger · Zero Login Required</span>
                </div>
                <div className="trust-divider" />
                <div className="trust-item">
                  <ShieldCheck size={14} className="text-orange" />
                  <span>Piece-Level Linear Code 128 Audited</span>
                </div>
                <div className="trust-divider" />
                <div className="trust-item">
                  <Clock size={14} className="text-sky" />
                  <span>Verified Checkpoint Timestamps</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. REFERENCE GUIDE: WHERE TO FIND YOUR TRACKING NUMBER
          ========================================================================= */}
      <section className="track-reference-section">
        <div className="dxp-container-wide">
          <div className="section-center-header">
            <span className="section-eyebrow">OFFICIAL DISPATCH DOCUMENTATION</span>
            <h2>Where to Locate Your Consignment Reference</h2>
            <p className="section-desc-sub">
              All official shipping documents, tracking numbers, and bills of lading are issued directly by the Duolingo Express dispatch desk and provided to you through your designated communication channel.
            </p>
            <div className="section-header-line" />
          </div>

          <div className="track-reference-grid">
            <div className="reference-card">
              <div className="ref-icon-box orange">
                <FileText size={24} />
              </div>
              <h3>Direct Dispatch Confirmation</h3>
              <p>
                Your dedicated Duolingo Express logistics coordinator sends your official tracking identifier and booking receipt directly to you via email, SMS, or dispatch message upon consignment tender.
              </p>
              <div className="ref-format-pill font-mono">Issued Directly by Dispatch</div>
            </div>

            <div className="reference-card">
              <div className="ref-icon-box emerald">
                <Truck size={24} />
              </div>
              <h3>Agency Bill of Lading (BOL)</h3>
              <p>
                The official signed Bill of Lading (BOL) manifest provided by our agency includes your primary reference code at the top right of the consignment paperwork.
              </p>
              <div className="ref-format-pill font-mono">Official BOL Manifest</div>
            </div>

            <div className="reference-card">
              <div className="ref-icon-box sky">
                <Clock size={24} />
              </div>
              <h3>Coordinator Verification</h3>
              <p>
                If you have misplaced your reference code, contact your assigned logistics coordinator or our 24/7 central desk to verify your shipment details instantly.
              </p>
              <div className="ref-format-pill font-mono">24/7 Dispatch Verification</div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. 24/7 CENTRAL DISPATCH & CONTEXTUAL SUPPORT
          ========================================================================= */}
      <section className="track-support-section">
        <div className="dxp-container-wide">
          <div className="track-support-card">
            <div className="support-card-content">
              <span className="support-card-eyebrow font-mono">24/7 CENTRAL DISPATCH DESK</span>
              <h2>Need Immediate Assistance with an Active Shipment?</h2>
              <p>
                Our experienced logistics coordinators are available around the clock to assist with address updates, delivery holds, or urgent linehaul status inquiries.
              </p>
              <div className="support-contact-strip">
                <div className="support-phone-badge">
                  <Phone size={16} className="text-orange" />
                  <span className="font-mono font-bold">{supportPhone}</span>
                  <small>(Toll-Free Dispatch)</small>
                </div>
                <div className="support-status-beacon">
                  <span className="beacon-dot" />
                  <span>Operations Center Active</span>
                </div>
              </div>
            </div>

            <div className="support-card-actions">
              <button
                type="button"
                className="btn-corp-primary"
                onClick={() => onNavigate('contact')}
              >
                <span>Contact Operations Desk</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="btn-corp-ghost"
                onClick={() => {
                  setSupportIssue('Tracking Assistance');
                  setSupportModalOpen(true);
                }}
              >
                <span>Submit Inquiry Ticket</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Support Modal */}
      <SupportModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        initialTrackingNumber={trackingNumber || ''}
        defaultIssueType={supportIssue}
      />

      {/* =========================================================================
          5. BATCH MULTI-TRACKING MODAL / DRAWER
          ========================================================================= */}
      {batchModalOpen && (
        <div className="batch-modal-backdrop animate-fade-in" onClick={() => setBatchModalOpen(false)}>
          <div className="batch-modal-dialog animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="batch-modal-header">
              <div>
                <div className="batch-header-title">
                  <Truck size={20} className="text-orange" />
                  <h3>Batch Multi-Shipment Fleet Monitor</h3>
                </div>
                <p>Real-time consolidated status across {batchShipments.length} queried trade corridor consignments.</p>
              </div>
              <button className="batch-modal-close" onClick={() => setBatchModalOpen(false)}>×</button>
            </div>

            <div className="batch-filter-bar">
              <div className="batch-filter-pills">
                <button
                  type="button"
                  className={`batch-filter-btn ${batchFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setBatchFilter('ALL')}
                >
                  All Consignments ({batchShipments.length})
                </button>
                <button
                  type="button"
                  className={`batch-filter-btn ${batchFilter === 'IN_TRANSIT' ? 'active' : ''}`}
                  onClick={() => setBatchFilter('IN_TRANSIT')}
                >
                  In Transit ({batchShipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'RECEIVED' || s.status === 'OUT_FOR_DELIVERY').length})
                </button>
                <button
                  type="button"
                  className={`batch-filter-btn ${batchFilter === 'DELIVERED' ? 'active' : ''}`}
                  onClick={() => setBatchFilter('DELIVERED')}
                >
                  Delivered ({batchShipments.filter(s => s.status === 'DELIVERED').length})
                </button>
                <button
                  type="button"
                  className={`batch-filter-btn ${batchFilter === 'DELAYED' ? 'active' : ''}`}
                  onClick={() => setBatchFilter('DELAYED')}
                >
                  Delayed ({batchShipments.filter(s => s.status === 'DELAYED' || s.health === 'POTENTIAL_DELAY' || s.health === 'ATTENTION_REQUIRED').length})
                </button>
              </div>

              <span className="batch-audit-label">Verified Checkpoint Records · Contiguous U.S.</span>
            </div>

            <div className="batch-modal-body">
              <div className="batch-cards-grid">
                {batchShipments
                  .filter(s => {
                    if (batchFilter === 'IN_TRANSIT') return s.status === 'IN_TRANSIT' || s.status === 'RECEIVED' || s.status === 'OUT_FOR_DELIVERY';
                    if (batchFilter === 'DELIVERED') return s.status === 'DELIVERED';
                    if (batchFilter === 'DELAYED') return s.status === 'DELAYED' || s.health === 'POTENTIAL_DELAY' || s.health === 'ATTENTION_REQUIRED';
                    return true;
                  })
                  .map((shipment, index) => {
                    const isDelivered = shipment.status === 'DELIVERED';
                    const isDelayed = shipment.status === 'DELAYED' || shipment.health === 'POTENTIAL_DELAY';

                    return (
                      <div key={index} className="batch-shipment-card">
                        <div className="batch-card-top">
                          <div>
                            <span className="batch-tracking-id">{shipment.trackingNumber}</span>
                            <span className="batch-service-sub">{shipment.service || 'Priority Express'} · {shipment.shipmentType || 'Parcel'}</span>
                          </div>

                          <div>
                            {isDelivered ? (
                              <span className="batch-status-pill delivered">DELIVERED</span>
                            ) : isDelayed ? (
                              <span className="batch-status-pill delayed">DELAYED</span>
                            ) : (
                              <span className="batch-status-pill transit">IN TRANSIT</span>
                            )}
                          </div>
                        </div>

                        <div className="batch-route-strip">
                          <div className="batch-route-point">
                            <small>ORIGIN</small>
                            <strong>{shipment.origin?.city || 'New York'}, {shipment.origin?.state || 'NY'}</strong>
                          </div>

                          <div className="batch-route-arrow">
                            <Truck size={14} />
                            <ArrowRight size={14} />
                          </div>

                          <div className="batch-route-point right">
                            <small>DESTINATION</small>
                            <strong>{shipment.destination?.city || 'Los Angeles'}, {shipment.destination?.state || 'CA'}</strong>
                          </div>
                        </div>

                        <div className="batch-metrics-row">
                          <div className="batch-metric-box">
                            <small>CURRENT FACILITY</small>
                            <strong>
                              {shipment.currentFacility ||
                                (typeof shipment.currentLocation === 'string'
                                  ? shipment.currentLocation
                                  : (shipment.currentLocation as any)?.facility ||
                                    [(shipment.currentLocation as any)?.city, (shipment.currentLocation as any)?.state].filter(Boolean).join(', ')) ||
                                `${shipment.origin?.city || 'New York'} Sort Hub`}
                            </strong>
                          </div>
                          <div className="batch-metric-box">
                            <small>ESTIMATED DELIVERY</small>
                            <strong>
                              {typeof shipment.estimatedDelivery === 'string'
                                ? shipment.estimatedDelivery
                                : (shipment.estimatedDelivery as any)?.date || 'On Schedule'}
                            </strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn-inspect-batch-item"
                          onClick={() => {
                            setBatchModalOpen(false);
                            handleQuickTrack(shipment.trackingNumber);
                          }}
                        >
                          <span>Inspect Live 60 FPS Telemetry & Map</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="batch-modal-footer">
              <span className="batch-footer-count">
                Showing <strong>{batchShipments.length}</strong> active consignments in fleet monitor
              </span>
              <button
                type="button"
                className="btn-corp-ghost"
                onClick={() => setBatchModalOpen(false)}
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Close Batch View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
