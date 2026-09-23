import React, { useState, useEffect } from 'react';
import { Shield, FileText, Lock, Eye, DollarSign, CheckCircle2, ChevronRight } from 'lucide-react';
import './LegalPage.css';

interface LegalPageProps {
  initialSection?: string;
  onNavigate?: (page: string) => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({
  initialSection = 'privacy',
  onNavigate = () => {},
}) => {
  const [activeDoc, setActiveDoc] = useState(initialSection);

  useEffect(() => {
    if (initialSection) {
      setActiveDoc(initialSection);
    }
  }, [initialSection]);

  return (
    <div className="dxp-page-legal">
      {/* =========================================================================
          1. CINEMATIC HERO SECTION
          ========================================================================= */}
      <section className="dxp-legal-hero">
        <div className="legal-hero-bg-overlay" />
        <div className="dxp-container-wide legal-hero-inner">
          <div className="legal-hero-pill animate-fade-in">
            <span className="legal-pulse-dot" />
            <span>USDOT #3894210 · MOTOR CARRIER GOVERNANCE</span>
          </div>

          <h1 className="legal-hero-title animate-fade-in">
            Legal, Compliance & <span className="legal-highlight-orange">Carrier Tariffs.</span>
          </h1>

          <p className="legal-hero-lead animate-fade-in">
            Review Duolingo Express regulatory standards, terms of carriage, carrier tariffs, and comprehensive client privacy protections.
          </p>
        </div>
      </section>

      {/* =========================================================================
          2. MAIN BODY & DOCUMENT VIEWER
          ========================================================================= */}
      <div className="dxp-container-wide dxp-legal-content-wrap">
        {/* Sidebar Nav */}
        <aside className="dxp-legal-sidebar">
          <div className="legal-sidebar-card">
            <h4>OFFICIAL POLICIES</h4>
            <nav className="legal-nav-list">
              <button
                type="button"
                className={`legal-nav-btn ${activeDoc === 'privacy' ? 'active' : ''}`}
                onClick={() => setActiveDoc('privacy')}
              >
                <Lock size={16} />
                <span>Privacy & PII Masking</span>
              </button>
              <button
                type="button"
                className={`legal-nav-btn ${activeDoc === 'terms' ? 'active' : ''}`}
                onClick={() => setActiveDoc('terms')}
              >
                <FileText size={16} />
                <span>Terms of Service</span>
              </button>
              <button
                type="button"
                className={`legal-nav-btn ${activeDoc === 'tariffs' ? 'active' : ''}`}
                onClick={() => setActiveDoc('tariffs')}
              >
                <DollarSign size={16} />
                <span>Carrier Tariffs & Rating</span>
              </button>
              <button
                type="button"
                className={`legal-nav-btn ${activeDoc === 'shipping-terms' ? 'active' : ''}`}
                onClick={() => setActiveDoc('shipping-terms')}
              >
                <Shield size={16} />
                <span>Shipping Terms of Carriage</span>
              </button>
              <button
                type="button"
                className={`legal-nav-btn ${activeDoc === 'accessibility' ? 'active' : ''}`}
                onClick={() => setActiveDoc('accessibility')}
              >
                <Eye size={16} />
                <span>Accessibility Statement</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Document Body */}
        <main className="dxp-legal-document animate-fade-in">
          <div className="legal-doc-header">
            <span className="doc-type-tag font-mono">OFFICIAL REGULATORY RECORD</span>
            <h2>
              {activeDoc === 'privacy' && 'Privacy & PII Protection Policy'}
              {activeDoc === 'terms' && 'Master Terms & Conditions of Service'}
              {activeDoc === 'tariffs' && 'Carrier Tariff & Rating Schedule Rules'}
              {activeDoc === 'shipping-terms' && 'Courier Shipping & Carriage Terms'}
              {activeDoc === 'accessibility' && 'Digital Accessibility Standards'}
            </h2>
            <div className="doc-meta-bar font-mono">
              <span>Revision: August 2026</span>
              <span>•</span>
              <span>Effective: Immediate</span>
              <span>•</span>
              <span>USDOT #3894210</span>
            </div>
          </div>

          <div className="legal-doc-body">
            {/* 1. PRIVACY POLICY */}
            {activeDoc === 'privacy' && (
              <>
                <section className="legal-section">
                  <h3>1. Scope of Privacy Protection</h3>
                  <p>
                    Duolingo Express ("we," "our," or "the Platform") provides priority express courier, scheduled commercial linehaul, auto transport, and secure vault logistics across the United States. This Privacy Policy details how we collect, safeguard, and manage data across public tracking engines, booking portals, and customer support channels.
                  </p>
                </section>

                <section className="legal-section">
                  <h3>2. Public Tracking & PII Masking</h3>
                  <p>
                    We strictly enforce zero unnecessary exposure of Personally Identifiable Information (PII) on public tracking pages. When querying any consignment, sender and recipient names, exact street addresses, and personal contact details are automatically masked to safeguard commercial and personal privacy.
                  </p>
                </section>

                <section className="legal-section">
                  <h3>3. Data Retention & Operational Provenance</h3>
                  <p>
                    Shipment event records, verified scan timestamps, facility identifiers, and generated logistics documents are retained in append-only records for 7 years to comply with federal motor carrier and interstate express courier regulations.
                  </p>
                </section>
              </>
            )}

            {/* 2. TERMS OF SERVICE */}
            {activeDoc === 'terms' && (
              <>
                <section className="legal-section">
                  <h3>1. Acceptance of Master Terms</h3>
                  <p>
                    By booking, tracking, or tendering consignments through Duolingo Express, you agree to these Master Terms and Conditions governing rate calculations, transit schedules, proof of delivery, and operational procedures.
                  </p>
                </section>

                <section className="legal-section">
                  <h3>2. Service Availability & Network Coverage</h3>
                  <p>
                    Services are rendered within established U.S. Interstate service regions and designated gateway corridors (New York JFK, Chicago ORD, Dallas DFW, and Los Angeles LAX). Scheduled departure times and estimated transit milestones are computed dynamically based on real-time operational conditions.
                  </p>
                </section>

                <section className="legal-section">
                  <h3>3. Payment & Account Invoicing</h3>
                  <p>
                    Consignments tendered under commercial accounts are billed in accordance with agreed tariff schedules. Official Bills of Lading and payment invoices are certified and transmitted directly by our central dispatch and administration desk.
                  </p>
                </section>
              </>
            )}

            {/* 3. CARRIER TARIFFS */}
            {activeDoc === 'tariffs' && (
              <>
                <section className="legal-section">
                  <h3>1. Rate Integrity & Tariff Certification</h3>
                  <p>
                    To protect commercial shippers from automated broker surge markups and generic rate deviations, all official consignment tariffs are calculated and certified directly by our central administration desk.
                  </p>
                </section>

                <section className="legal-section">
                  <h3>2. Dimensional Weight & Scale Rating</h3>
                  <p>
                    Tariffs are assessed based on the greater of actual certified scale weight or dimensional cubic weight (Length × Width × Height in inches divided by 139 for express domestic courier transit).
                  </p>
                </section>

                <section className="legal-section">
                  <h3>3. Fuel Surcharge & Accessorial Services</h3>
                  <p>
                    Fuel surcharges are adjusted bi-weekly in direct index alignment with U.S. Department of Energy national diesel averages. Accessorial services such as Adult Signature Confirmation, Saturday Expedited Delivery, or Armored Dual-Custody are itemized transparently.
                  </p>
                </section>
              </>
            )}

            {/* 4. SHIPPING TERMS */}
            {activeDoc === 'shipping-terms' && (
              <>
                <section className="legal-section">
                  <h3>1. Tender and Acceptance of Goods</h3>
                  <p>
                    Duolingo Express accepts commercial parcels, cartons, motor vehicles, and secure vault consignments subject to compliance with packaging standards, safety regulations, and legal transit requirements.
                  </p>
                </section>

                <section className="legal-section">
                  <h3>2. Proof of Delivery (POD) Protocols</h3>
                  <p>
                    Delivery is deemed complete only upon the capture of an authorized adult signature and electronic timestamp. These records are permanently archived into our central verified ledger and transmitted directly to the consignor.
                  </p>
                </section>

                <section className="legal-section">
                  <h3>3. Claims & Exception Resolution</h3>
                  <p>
                    Formal claims for loss or damage must be submitted through our Operations Desk within 30 days of the scheduled delivery date. All claims require the master tracking reference and original declared value documentation.
                  </p>
                </section>
              </>
            )}

            {/* 5. ACCESSIBILITY */}
            {activeDoc === 'accessibility' && (
              <>
                <section className="legal-section">
                  <h3>1. Digital Accessibility Commitment</h3>
                  <p>
                    Duolingo Express is committed to ensuring our digital logistics platform is accessible to all individuals, adhering to WCAG 2.1 Level AA standards including high-contrast color systems, keyboard navigation, and screen-reader support across our radar feeds and booking workflows.
                  </p>
                </section>

                <section className="legal-section">
                  <h3>2. Continuous Accessibility Auditing</h3>
                  <p>
                    We regularly audit our web applications for semantic compliance, touch target adequacy (minimum 48px height), and high-contrast text ratios across all light and dark visual presentation modes.
                  </p>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
