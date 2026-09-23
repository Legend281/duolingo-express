import React, { useState } from 'react';
import {
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
  ArrowRight,
  ShieldCheck,
  Printer,
  Phone,
  Building,
  User,
  Calendar,
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Package,
  Award
} from 'lucide-react';
import { QuoteRequest } from '../types/admin';
import { useAdminData } from '../context/AdminDataContext';
import './PublicQuoteResultPage.css';

interface PublicQuoteResultPageProps {
  quote: QuoteRequest;
  onTrackShipment: (trackingNumber: string) => void;
  onNavigate: (page: string) => void;
}

export const PublicQuoteResultPage: React.FC<PublicQuoteResultPageProps> = ({
  quote,
  onTrackShipment,
  onNavigate,
}) => {
  const { updateQuoteStatus } = useAdminData();
  const [copiedId, setCopiedId] = useState(false);
  const [accepted, setAccepted] = useState(quote.status === 'ACCEPTED' || quote.status === 'CONVERTED');

  const handleCopyId = () => {
    navigator.clipboard.writeText(quote.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const isPublished = quote.status === 'QUOTE_PUBLISHED' || quote.status === 'ACCEPTED' || quote.status === 'CONVERTED' || (quote.pricing && quote.pricing.finalPrice > 0);
  const isPending = quote.status === 'NEW' || quote.status === 'UNDER_REVIEW';

  const formatDimensions = (dims: any) => {
    if (!dims) return '72 × 24 × 18 in';
    if (typeof dims === 'string') return dims;
    if (typeof dims === 'object') {
      return `${dims.length || 12} × ${dims.width || 12} × ${dims.height || 12} in`;
    }
    return String(dims);
  };

  const finalPrice = quote.pricing?.finalPrice || 350;
  const baseShipping = quote.pricing?.baseShipping || finalPrice * 0.75;
  const oversizeHandling = quote.pricing?.oversizeHandling || 45;
  const specialHandling = quote.pricing?.specialHandling || (finalPrice - baseShipping - oversizeHandling > 0 ? finalPrice - baseShipping - oversizeHandling : 42.5);

  return (
    <div className="dxp-quote-result-page animate-fade-in">
      {/* =========================================================================
          SCREEN-ONLY VIEW
          ========================================================================= */}
      <div className="screen-only-quotation-view">
        {/* Top Banner */}
        <div className="quote-res-hero">
          <div className="dxp-container-wide hero-content-flex">
            <div>
              <div className="quote-badge-pill">
                <FileText size={14} />
                <span>OFFICIAL TARIFF QUOTATION</span>
              </div>
              <h1>Shipping Rate Reference: <span className="font-mono text-blue">{quote.id}</span></h1>
              <p className="hero-subtext">
                Direct linehaul rate quotation issued by the Duolingo Express Central Tariff Desk.
              </p>
            </div>

            <div className="hero-actions-box">
              <button className="btn-copy-quote-id" onClick={handleCopyId}>
                {copiedId ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                <span>{copiedId ? 'Copied Reference' : 'Copy Quote ID'}</span>
              </button>
              <button className="btn-print-quote" onClick={() => window.print()}>
                <Printer size={14} />
                <span>Print Official Quotation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="dxp-container-wide quote-res-body">
          {/* STATUS BAR */}
          <div className={`quote-status-alert-strip ${isPublished ? 'status-ready' : 'status-review'}`}>
            <div className="alert-left">
              {isPublished ? (
                <CheckCircle2 size={24} className="text-emerald" />
              ) : (
                <Clock size={24} className="text-amber animate-spin-slow" />
              )}
              <div>
                <h3>
                  {isPublished
                    ? 'Official Tariff Rate Published & Guaranteed'
                    : 'Tariff Calculation in Progress (Admin Review)'}
                </h3>
                <p>
                  {isPublished
                    ? `Your custom rate of $${Number(finalPrice).toFixed(2)} USD has been approved. Guaranteed valid until ${quote.pricing?.validUntil || '14 days from issue'}.`
                    : 'Our Central Tariff Desk is verifying weight-scale parameters and linehaul routing availability. Check back shortly using this Quote ID.'}
                </p>
              </div>
            </div>

            <div className="alert-right-badge">
              <span className={`tariff-status-chip ${quote.status.toLowerCase()}`}>
                {quote.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="quote-two-column-layout">
            {/* LEFT COLUMN: PRICING & TARIFF DETAILS */}
            <div className="quote-main-col">
              {/* 1. RATE LOCK CARD */}
              {isPublished ? (
                <div className="published-rate-highlight-card">
                  <div className="rate-card-header">
                    <div>
                      <span className="rate-card-label">APPROVED ALL-INCLUSIVE PRICE</span>
                      <div className="rate-big-figure">
                        <span className="curr">$</span>
                        <strong className="amount font-mono">
                          {Number(finalPrice).toFixed(2)}
                        </strong>
                        <span className="currency-code">USD</span>
                      </div>
                    </div>

                    <div className="validity-lock-box">
                      <ShieldCheck size={20} className="text-emerald" />
                      <div>
                        <small>Rate Guaranteed Until</small>
                        <strong>{quote.pricing?.validUntil || '14 Days from Issue'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="tariff-breakdown-subdeck">
                    <span className="deck-title">OFFICIAL CHARGES BREAKDOWN</span>
                    <div className="charges-table">
                      <div className="charge-row">
                        <span>Interstate Linehaul Transport ({quote.originCity || 'NY'} → {quote.destCity || 'CA'})</span>
                        <strong className="font-mono">${Number(baseShipping).toFixed(2)}</strong>
                      </div>
                      <div className="charge-row">
                        <span>Oversize / Dimensional Handling</span>
                        <strong className="font-mono">${Number(oversizeHandling).toFixed(2)}</strong>
                      </div>
                      <div className="charge-row">
                        <span>Terminal Sorting & Security Screening</span>
                        <strong className="font-mono">${Number(specialHandling).toFixed(2)}</strong>
                      </div>
                      <div className="charge-row total">
                        <strong>Total Guaranteed Tariff</strong>
                        <strong className="total-amount font-mono text-emerald">
                          ${Number(finalPrice).toFixed(2)} USD
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Accept & Book Action */}
                  <div className="rate-booking-cta">
                    {accepted || quote.convertedShipmentId ? (
                      <div className="quote-converted-notice">
                        <CheckCircle2 size={20} className="text-emerald" />
                        <div>
                          <strong>Quote Accepted & Booked</strong>
                          {quote.convertedShipmentId && (
                            <p>
                              Assigned Master Tracking: <strong className="font-mono text-blue">{quote.convertedShipmentId}</strong>
                            </p>
                          )}
                        </div>
                        {quote.convertedShipmentId && (
                          <button
                            className="btn-track-converted"
                            onClick={() => onTrackShipment(quote.convertedShipmentId!)}
                          >
                            Track Waybill <ExternalLink size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="booking-cta-flex">
                        <div>
                          <strong>Ready to dispatch this cargo?</strong>
                          <p>Lock in this rate and schedule linehaul origin tender.</p>
                        </div>
                        <button
                          className="btn-accept-rate"
                          onClick={() => {
                            setAccepted(true);
                            updateQuoteStatus(quote.id, 'ACCEPTED');
                          }}
                        >
                          <Check size={16} /> Accept Rate & Book Shipment
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pending-rate-waiting-card">
                  <div className="waiting-spinner-box">
                    <Clock size={40} className="text-amber animate-pulse" />
                  </div>
                  <h3>Central Tariff Desk Review in Progress</h3>
                  <p>
                    Our rating team is actively calculating the interstate transit cost based on verified carrier linehaul schedules. Once published, your price will automatically appear on this page.
                  </p>
                  <div className="hotline-banner">
                    <Phone size={16} className="text-blue" />
                    <span>Need urgent priority quotation? Call <strong>(855) 388-EXPRESS</strong> with reference <strong className="font-mono text-blue">{quote.id}</strong>.</span>
                  </div>
                </div>
              )}

              {/* 2. ROUTE & CARGO SPECIFICATIONS */}
              <div className="quote-specs-card">
                <h3 className="section-head-title">
                  <Truck size={17} className="text-blue" /> Consignment Parameters
                </h3>

                {/* Route banner */}
                <div className="route-banner-grid">
                  <div className="route-loc origin">
                    <span className="loc-tag">ORIGIN</span>
                    <strong>{quote.originCity || (quote as any).origin?.city || 'New York'}, {quote.originState || (quote as any).origin?.state || 'NY'}</strong>
                    <small className="font-mono">ZIP {quote.originZip || (quote as any).origin?.postalCode || '10118'}</small>
                  </div>
                  <div className="route-center-line">
                    <div className="line" />
                    <ArrowRight size={16} className="arr" />
                    <div className="line" />
                  </div>
                  <div className="route-loc dest">
                    <span className="loc-tag">DESTINATION</span>
                    <strong>{quote.destCity || (quote as any).destination?.city || 'Los Angeles'}, {quote.destState || (quote as any).destination?.state || 'CA'}</strong>
                    <small className="font-mono">ZIP {quote.destZip || (quote as any).destination?.postalCode || '90021'}</small>
                  </div>
                </div>

                {/* Specifications grid */}
                <div className="specs-detail-grid">
                  <div className="spec-box">
                    <small>Cargo Description</small>
                    <strong>{quote.cargoDescription || 'Commercial Consignment Cargo'}</strong>
                  </div>
                  <div className="spec-box">
                    <small>Cargo Category</small>
                    <strong className="font-mono">{quote.cargoType || (quote as any).shipmentType || 'Vehicle Part'}</strong>
                  </div>
                  <div className="spec-box">
                    <small>Requested Service</small>
                    <strong className="text-blue">{quote.requestedService || (quote as any).service || 'Standard Ground'}</strong>
                  </div>
                  <div className="spec-box">
                    <small>Gross Scale Weight</small>
                    <strong>{quote.totalWeightLbs || (quote as any).weightLbs || 45} lbs</strong>
                  </div>
                  <div className="spec-box">
                    <small>Declared Pieces</small>
                    <strong>{typeof (quote as any).pieces === 'number' ? (quote as any).pieces : quote.quantity || 1} Unit(s)</strong>
                  </div>
                  <div className="spec-box">
                    <small>Dimensions (L × W × H)</small>
                    <strong className="font-mono">{formatDimensions(quote.dimensions)}</strong>
                  </div>
                </div>

                {quote.specialRequirements || (quote as any).specialInstructions ? (
                  <div className="special-inst-box">
                    <small>Special Instructions / Requirements</small>
                    <p>{quote.specialRequirements || (quote as any).specialInstructions}</p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* RIGHT COLUMN: SHIPPER INFO & POLICIES */}
            <div className="quote-side-col">
              {/* Shipper Details */}
              <div className="side-detail-card">
                <div className="card-head">
                  <User size={15} className="text-blue" />
                  <h4>Applicant Details</h4>
                </div>
                <div className="card-body">
                  <div className="info-row">
                    <small>Applicant Name:</small>
                    <strong>{quote.requesterName || (quote as any).customerName || 'Shipper'}</strong>
                  </div>
                  {((quote as any).requesterCompany || (quote as any).company) && (
                    <div className="info-row">
                      <small>Company:</small>
                      <strong>{(quote as any).requesterCompany || (quote as any).company}</strong>
                    </div>
                  )}
                  <div className="info-row">
                    <small>Contact Email:</small>
                    <strong className="text-blue">{quote.requesterEmail || (quote as any).customerEmail || 'client@example.com'}</strong>
                  </div>
                  <div className="info-row">
                    <small>Contact Phone:</small>
                    <strong className="font-mono">{quote.requesterPhone || (quote as any).customerPhone || '(212) 555-0148'}</strong>
                  </div>
                  <div className="info-row">
                    <small>Submission Date:</small>
                    <span>{quote.submittedDate || (quote as any).createdAt || 'Recent'}</span>
                  </div>
                </div>
              </div>

              {/* Carrier Tariff Guarantee */}
              <div className="side-detail-card guarantee-card">
                <div className="card-head">
                  <ShieldCheck size={16} className="text-emerald" />
                  <h4>Duolingo Express Tariff Integrity</h4>
                </div>
                <div className="card-body">
                  <div className="guarantee-point">
                    <CheckCircle2 size={14} className="text-emerald" />
                    <span>No hidden fuel or accessorial surcharges</span>
                  </div>
                  <div className="guarantee-point">
                    <CheckCircle2 size={14} className="text-emerald" />
                    <span>Direct door-to-door linehaul transport</span>
                  </div>
                  <div className="guarantee-point">
                    <CheckCircle2 size={14} className="text-emerald" />
                    <span>Code 128 piece-level barcode visibility upon dispatch</span>
                  </div>
                </div>
              </div>

              {/* Support Desk */}
              <div className="side-detail-card contact-desk-card">
                <div className="desk-head">
                  <Phone size={18} className="text-blue" />
                  <div>
                    <h4>Central Dispatch Desk</h4>
                    <small>24/7 Operations Line</small>
                  </div>
                </div>
                <strong className="desk-phone">1-800-555-0199</strong>
                <p className="desk-sub">Reference quote #{quote.id} when connecting with our tariff team.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRINT-ONLY OFFICIAL QUOTATION DOCUMENT (Standard Letter/A4)
          ========================================================================= */}
      <div className="printable-official-quotation">
        {/* Document Top Bar */}
        <div className="print-doc-header">
          <div className="print-header-left">
            <img src="/logo.png" alt="Duolingo Express" className="print-doc-logo" />
            <div className="print-company-info">
              <strong>Duolingo Express Logistics LLC</strong>
              <span>100 Logistics Blvd, Suite 400 · New York, NY 10001</span>
              <span>Operations Desk: (855) 388-EXPRESS · tariffs@duolingoexpress.com</span>
            </div>
          </div>

          <div className="print-header-right">
            <div className="print-doc-type-badge">OFFICIAL RATE QUOTATION</div>
            <div className="print-doc-meta-row">
              <span>REFERENCE #:</span>
              <strong className="font-mono text-blue">{quote.id}</strong>
            </div>
            <div className="print-doc-meta-row">
              <span>ISSUE DATE:</span>
              <strong>{quote.submittedDate || (quote as any).createdAt || new Date().toLocaleDateString()}</strong>
            </div>
            <div className="print-doc-meta-row">
              <span>VALID UNTIL:</span>
              <strong className="text-emerald">{quote.pricing?.validUntil || '14 Days from Issue'}</strong>
            </div>
          </div>
        </div>

        <div className="print-divider" />

        {/* Section 1: Route & Contact Parties */}
        <div className="print-parties-grid">
          <div className="print-party-box">
            <span className="box-title">ORIGIN & SHIPPER</span>
            <strong>{quote.requesterName || (quote as any).customerName || 'Shipper'}</strong>
            {(quote as any).requesterCompany || (quote as any).company ? <span>{(quote as any).requesterCompany || (quote as any).company}</span> : null}
            <span>{quote.originCity || (quote as any).origin?.city || 'New York'}, {quote.originState || (quote as any).origin?.state || 'NY'} {quote.originZip || (quote as any).origin?.postalCode || '10118'}</span>
            <span>Tel: {quote.requesterPhone || (quote as any).customerPhone || '—'}</span>
            <span>Email: {quote.requesterEmail || (quote as any).customerEmail || '—'}</span>
          </div>

          <div className="print-party-box">
            <span className="box-title">DESTINATION CONSIGNEE</span>
            <strong>{quote.recipientName || 'Designated Receiving Party'}</strong>
            <span>{quote.destCity || (quote as any).destination?.city || 'Los Angeles'}, {quote.destState || (quote as any).destination?.state || 'CA'} {quote.destZip || (quote as any).destination?.postalCode || '90021'}</span>
            <span>Requested Service: <strong>{quote.requestedService || (quote as any).service || 'Standard Ground'}</strong></span>
            <span>Linehaul Transit: <strong>Interstate Direct Corridor</strong></span>
          </div>
        </div>

        {/* Section 2: Consignment Specifications */}
        <div className="print-section-title">CONSIGNMENT CARGO SPECIFICATIONS</div>
        <table className="print-table">
          <thead>
            <tr>
              <th>CARGO DESCRIPTION</th>
              <th>CATEGORY</th>
              <th>PIECES</th>
              <th>WEIGHT</th>
              <th>DIMENSIONS</th>
              <th className="text-right">DECLARED VALUE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>{quote.cargoDescription || 'Commercial Consignment'}</strong></td>
              <td>{quote.cargoType || (quote as any).shipmentType || 'Vehicle Part'}</td>
              <td>{typeof (quote as any).pieces === 'number' ? (quote as any).pieces : quote.quantity || 1} Unit(s)</td>
              <td>{quote.totalWeightLbs || (quote as any).weightLbs || 45} lbs</td>
              <td className="font-mono">{formatDimensions(quote.dimensions)}</td>
              <td className="text-right font-mono">${Number((quote as any).declaredValue || 850).toFixed(2)} USD</td>
            </tr>
          </tbody>
        </table>

        {/* Section 3: Official Tariff Rating Schedule */}
        <div className="print-section-title">APPROVED TARIFF RATE SCHEDULE</div>
        <table className="print-table pricing-table">
          <thead>
            <tr>
              <th>TARIFF CHARGE COMPONENT</th>
              <th>RATE BASIS</th>
              <th className="text-right">AMOUNT (USD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Interstate Linehaul Line Transport ({quote.originCity || 'NY'} → {quote.destCity || 'CA'})</td>
              <td>Contract Tariff Rate</td>
              <td className="text-right font-mono">${Number(baseShipping).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Oversize / Dimensional Handling Surcharge</td>
              <td>Scale & Cube Verified</td>
              <td className="text-right font-mono">${Number(oversizeHandling).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Terminal Sorting, Screening & Origin Dispatch Processing</td>
              <td>Facility Protocol</td>
              <td className="text-right font-mono">${Number(specialHandling).toFixed(2)}</td>
            </tr>
            <tr className="print-total-row">
              <td colSpan={2}>
                <strong>TOTAL GUARANTEED TARIFF (ALL INCLUSIVE)</strong>
              </td>
              <td className="text-right font-mono print-grand-total">
                ${Number(finalPrice).toFixed(2)} USD
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 4: Terms & Signatures */}
        <div className="print-terms-footer">
          <div className="terms-left">
            <span className="terms-header">QUOTATION TERMS & CARRIER STIPULATIONS</span>
            <p>
              1. This rate quotation is guaranteed and locked until <strong>{quote.pricing?.validUntil || '14 days from issue'}</strong>.<br />
              2. Final charges are subject to physical dimensional scale verification upon origin intake tender.<br />
              3. Door-to-door transit includes piece-level Code 128 barcode chain-of-custody tracking.<br />
              4. To confirm and execute this shipment, present reference #{quote.id} to any Duolingo Express terminal.
            </p>
          </div>

          <div className="terms-right-auth">
            <div className="auth-stamp-box">
              <Award size={28} className="stamp-icon" />
              <span>DUOLINGO EXPRESS</span>
              <small>CENTRAL TARIFF DESK</small>
              <strong>OFFICIAL SEAL</strong>
            </div>
            <div className="auth-signature-line">
              <div className="sig-line" />
              <span>Authorized Tariff Officer</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="print-bottom-watermark">
          <span>Official Duolingo Express Document · Quotation #{quote.id} · Generated on {new Date().toLocaleDateString()}</span>
          <span>duolingoexpress.com · Public Ledger Visibility</span>
        </div>
      </div>
    </div>
  );
};
