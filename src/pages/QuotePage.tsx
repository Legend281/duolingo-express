import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Clock,
  MapPin,
  Truck,
  Send,
  FileText,
  Lock,
  Building,
  Phone,
  Mail,
  User,
  DollarSign,
  Package,
  RotateCcw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useAdminData } from '../context/AdminDataContext';
import './QuotePage.css';

interface QuotePageProps {
  onNavigate: (page: string, param?: string) => void;
  initialService?: string;
}

export const QuotePage: React.FC<QuotePageProps> = ({ onNavigate, initialService }) => {
  const { createQuoteRequest, settings } = useAdminData();
  const supportPhone = settings.supportPhone || '1-800-555-0199';
  const dotNumber = settings.dotNumber || 'USDOT #3894210 · MC-892401';

  // Contact Info (Starts clean and blank)
  const [customerName, setCustomerName] = useState('');
  const [company, setCompany] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Routing
  const [originCity, setOriginCity] = useState('');
  const [originState, setOriginState] = useState('');
  const [originZip, setOriginZip] = useState('');
  
  const [destCity, setDestCity] = useState('');
  const [destState, setDestState] = useState('');
  const [destZip, setDestZip] = useState('');

  // Cargo Specs (Strict 4 Allowed Core Services, Zero Freight/Train/Ship)
  const [cargoDescription, setCargoDescription] = useState('');
  const [cargoType, setCargoType] = useState('Commercial Parcel');
  const [service, setService] = useState(initialService || 'Priority Express Courier');

  useEffect(() => {
    if (initialService) {
      setService(initialService);
    }
  }, [initialService]);

  const [weight, setWeight] = useState('');
  const [pieces, setPieces] = useState('1');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [declaredValue, setDeclaredValue] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Status & Errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdQuoteId, setCreatedQuoteId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Dynamic Real-Time Tariff Estimator
  const estimatedRate = useMemo(() => {
    const w = parseFloat(weight) || 0;
    const p = parseInt(pieces, 10) || 1;
    if (w <= 0) return null;

    let baseRate = 65; // Base courier dispatch fee
    let ratePerLb = 1.45;

    if (service === 'Priority Express Courier') {
      baseRate = 95;
      ratePerLb = 2.15;
    } else if (service === 'Scheduled Commercial Linehaul') {
      baseRate = 120;
      ratePerLb = 1.25;
    } else if (service === 'Auto & Vehicle Transport') {
      baseRate = 650;
      ratePerLb = 0.45;
    } else if (service === 'Time-Critical Secure Vault') {
      baseRate = 350;
      ratePerLb = 3.50;
    }

    const calculated = baseRate + (w * ratePerLb) + (p > 1 ? (p - 1) * 12 : 0);
    const lowRange = Math.round(calculated * 0.92);
    const highRange = Math.round(calculated * 1.15);

    return { low: lowRange, high: highRange, base: Math.round(calculated) };
  }, [weight, pieces, service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim() || !customerEmail.trim() || !originCity.trim() || !destCity.trim() || !weight.trim()) {
      setFormError('Please complete all required fields (Name, Email, Origin City, Destination City, and Weight).');
      return;
    }

    setIsSubmitting(true);

    try {
      const quotePayload = {
        customerName: customerName.trim(),
        company: company.trim() || undefined,
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        origin: {
          city: originCity.trim(),
          state: originState.trim() || 'NY',
          postalCode: originZip.trim() || '10001'
        },
        destination: {
          city: destCity.trim(),
          state: destState.trim() || 'CA',
          postalCode: destZip.trim() || '90001'
        },
        cargoDescription: cargoDescription.trim() || 'Commercial Express Consignment',
        shipmentType: (cargoType === 'Vehicle / Automobile' ? 'Vehicle' : 'Parcel') as any,
        service: service as any,
        weightLbs: parseFloat(weight) || 10,
        pieces: parseInt(pieces, 10) || 1,
        dimensions: {
          length: parseFloat(length) || 12,
          width: parseFloat(width) || 12,
          height: parseFloat(height) || 12
        },
        declaredValue: parseFloat(declaredValue) || 0,
        specialInstructions: specialInstructions.trim() || undefined
      };

      // Send to persistent backend SQLite API
      const result = await api.submitPublicQuote(quotePayload as any);
      const generatedId = result.id || `QR-2026-${Math.floor(10000 + Math.random() * 90000)}`;

      // Update state in context
      createQuoteRequest(result);

      setCreatedQuoteId(generatedId);
      setSubmitted(true);
      window.scrollTo({ top: 200, behavior: 'smooth' });
    } catch (err: any) {
      console.warn('API quote submission warning, utilizing client synchronization:', err);
      // Fallback local creation
      const localQuote = createQuoteRequest({
        customerName: customerName.trim(),
        company: company.trim() || undefined,
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        origin: { city: originCity, state: originState, postalCode: originZip },
        destination: { city: destCity, state: destState, postalCode: destZip },
        cargoDescription: cargoDescription || 'Commercial Express Consignment',
        service,
        weightLbs: parseFloat(weight) || 10,
        pieces: parseInt(pieces, 10) || 1,
        declaredValue: parseFloat(declaredValue) || 0,
        specialInstructions
      } as any);
      setCreatedQuoteId(localQuote.id);
      setSubmitted(true);
      window.scrollTo({ top: 200, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setCustomerName('');
    setCompany('');
    setCustomerEmail('');
    setCustomerPhone('');
    setOriginCity('');
    setOriginState('');
    setOriginZip('');
    setDestCity('');
    setDestState('');
    setDestZip('');
    setCargoDescription('');
    setWeight('');
    setPieces('1');
    setLength('');
    setWidth('');
    setHeight('');
    setDeclaredValue('');
    setSpecialInstructions('');
    setFormError(null);
  };

  return (
    <div className="dxp-page-quote">
      {/* =========================================================================
          1. CINEMATIC HERO SECTION
          ========================================================================= */}
      <section className="dxp-quote-hero">
        <div className="quote-hero-bg-overlay" />
        <div className="dxp-container-wide quote-hero-inner">
          <div className="quote-hero-pill animate-fade-in">
            <span className="quote-pulse-dot" />
            <span>{dotNumber} · CENTRAL TARIFF & RATING DESK</span>
          </div>

          <h1 className="quote-hero-title animate-fade-in">
            Calculate & Request <span className="quote-highlight-orange">Custom Consignment Rates.</span>
          </h1>

          <p className="quote-hero-lead animate-fade-in">
            Submit your consignment routing and weight specifications directly to our Central Tariff Desk. Certified rates are published by our operational coordinators.
          </p>
        </div>
      </section>

      {/* =========================================================================
          2. MAIN BODY & FORM
          ========================================================================= */}
      <div className="dxp-container-wide dxp-quote-body">
        {submitted ? (
          /* =========================================================================
             CONFIRMATION STATE
             ========================================================================= */
          <div className="quote-confirmation-card animate-fade-in">
            <div className="confirm-top-pill">
              <span className="pulse-orange-dot" />
              <span>APPLICATION SUBMITTED · PENDING DISPATCH DESK CERTIFICATION</span>
            </div>

            <div className="confirm-header">
              <div className="check-badge-icon"><CheckCircle2 size={48} className="text-emerald" /></div>
              <h2>Rate Request Successfully Submitted</h2>
              <p>
                Your consignment tariff application <strong className="font-mono text-orange">{createdQuoteId}</strong> has been logged in the Duolingo Express dispatch ledger.
              </p>
            </div>

            <div className="admin-review-info-box">
              <div className="info-box-head">
                <Lock size={18} className="text-orange flex-shrink-0" />
                <h4>How Rate Publishing & Certification Works:</h4>
              </div>
              <p>
                Duolingo Express maintains verified tariff transparency without surge markups. Our central dispatch desk reviews corridor linehaul availability, certified scale weight, and required transit speed. Once certified, your official rate is published to your account and sent directly to <strong>{customerEmail || 'your email'}</strong>.
              </p>
            </div>

            <div className="quote-receipt-card">
              <span className="receipt-tag font-mono">APPLICATION SPECIFICATION SUMMARY</span>
              <div className="receipt-grid">
                <div className="rec-item">
                  <small>Request ID Reference:</small>
                  <strong className="font-mono text-orange">{createdQuoteId}</strong>
                </div>
                <div className="rec-item">
                  <small>Applicant Contact:</small>
                  <strong>{customerName} {company ? `(${company})` : ''}</strong>
                </div>
                <div className="rec-item">
                  <small>Interstate Corridor:</small>
                  <strong>{originCity || 'Origin'}, {originState || 'NY'} → {destCity || 'Dest'}, {destState || 'CA'}</strong>
                </div>
                <div className="rec-item">
                  <small>Cargo Consignment:</small>
                  <strong>{cargoDescription || 'Commercial Parcel'}</strong>
                </div>
                <div className="rec-item">
                  <small>Certified Weight & Pieces:</small>
                  <strong>{weight || '10'} lbs ({pieces || '1'} pc{parseInt(pieces, 10) > 1 ? 's' : ''})</strong>
                </div>
                <div className="rec-item">
                  <small>Requested Service Tier:</small>
                  <strong>{service}</strong>
                </div>
                <div className="rec-item span-full">
                  <small>Tariff Certification Status:</small>
                  <strong className="text-orange font-mono">● PENDING DISPATCH DESK CERTIFICATION</strong>
                </div>
              </div>
            </div>

            <div className="quote-confirm-actions">
              <button
                type="button"
                className="btn-corp-primary"
                onClick={() => onNavigate('quote-result', createdQuoteId)}
              >
                <FileText size={16} />
                <span>View Official Quote Ledger</span>
              </button>

              <button
                type="button"
                className="btn-corp-ghost"
                onClick={() => onNavigate('track')}
              >
                <span>Track Active Consignment</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="btn-corp-ghost"
                onClick={handleReset}
              >
                <RotateCcw size={16} />
                <span>Submit Another Rate Application</span>
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             INTERACTIVE RATE REQUEST FORM + LIVE PREVIEW SIDEBAR
             ========================================================================= */
          <div className="dxp-quote-grid">
            <div className="quote-form-card">
              <div className="form-head-title">
                <h3>Consignment Rate Parameters</h3>
                <p>Provide your shipment details to receive an official published rate from our administration desk.</p>
              </div>

              {formError && (
                <div className="quote-form-error animate-fade-in">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="quote-calc-form">
                {/* 1. CONTACT INFORMATION */}
                <div className="form-section-divider">
                  <User size={16} className="text-orange" />
                  <span>1. Shipper & Contact Information</span>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. John Anderson"
                      className="dxp-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Company / Organization (Optional)</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Apex Distribution LLC"
                      className="dxp-input"
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. j.anderson@example.com"
                      className="dxp-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. (555) 014-8822"
                      className="dxp-input font-mono"
                    />
                  </div>
                </div>

                {/* 2. ROUTE LOCATIONS */}
                <div className="form-section-divider">
                  <MapPin size={16} className="text-orange" />
                  <span>2. Origin & Destination Corridor</span>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Origin City & State *</label>
                    <div className="city-state-row">
                      <input
                        type="text"
                        required
                        value={originCity}
                        onChange={(e) => setOriginCity(e.target.value)}
                        placeholder="Origin City (e.g. New York)"
                        className="dxp-input input-city"
                      />
                      <input
                        type="text"
                        required
                        maxLength={2}
                        value={originState}
                        onChange={(e) => setOriginState(e.target.value.toUpperCase())}
                        placeholder="NY"
                        className="dxp-input input-state font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Origin ZIP Code</label>
                    <input
                      type="text"
                      value={originZip}
                      onChange={(e) => setOriginZip(e.target.value)}
                      placeholder="e.g. 10007"
                      className="dxp-input font-mono"
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Destination City & State *</label>
                    <div className="city-state-row">
                      <input
                        type="text"
                        required
                        value={destCity}
                        onChange={(e) => setDestCity(e.target.value)}
                        placeholder="Destination City (e.g. Los Angeles)"
                        className="dxp-input input-city"
                      />
                      <input
                        type="text"
                        required
                        maxLength={2}
                        value={destState}
                        onChange={(e) => setDestState(e.target.value.toUpperCase())}
                        placeholder="CA"
                        className="dxp-input input-state font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Destination ZIP Code</label>
                    <input
                      type="text"
                      value={destZip}
                      onChange={(e) => setDestZip(e.target.value)}
                      placeholder="e.g. 90017"
                      className="dxp-input font-mono"
                    />
                  </div>
                </div>

                {/* 3. CARGO SPECIFICATIONS */}
                <div className="form-section-divider">
                  <Package size={16} className="text-orange" />
                  <span>3. Cargo Specifications & Service Tier</span>
                </div>

                <div className="form-group">
                  <label>Consignment Description *</label>
                  <input
                    type="text"
                    required
                    value={cargoDescription}
                    onChange={(e) => setCargoDescription(e.target.value)}
                    placeholder="e.g. Precision diagnostic electronic assemblies"
                    className="dxp-input"
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Consignment Category *</label>
                    <select
                      value={cargoType}
                      onChange={(e) => setCargoType(e.target.value)}
                      className="dxp-input"
                    >
                      <option value="Commercial Parcel">Commercial & Corporate Parcel</option>
                      <option value="Vehicle / Automobile">Vehicle / Automobile Transport</option>
                      <option value="Automotive Parts">Automotive Parts & Components</option>
                      <option value="High-Tech Electronics">High-Tech & Sensitive Electronics</option>
                      <option value="Medical Equipment">Medical / Laboratory Specimen</option>
                      <option value="Secure Vault Asset">Secure Vault & High-Value Asset</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Requested Courier Service Tier *</label>
                    <select
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="dxp-input"
                    >
                      <option value="Priority Express Courier">Priority Express Courier (Time-Definite)</option>
                      <option value="Scheduled Commercial Linehaul">Scheduled Commercial Linehaul (Interstate)</option>
                      <option value="Auto & Vehicle Transport">Auto & Vehicle Transport (Open/Enclosed)</option>
                      <option value="Time-Critical Secure Vault">Time-Critical Secure Vault (Armed Custody)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label>Scale Weight (lbs) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 14.5"
                      className="dxp-input font-mono"
                    />
                  </div>

                  <div className="form-group">
                    <label>Total Pieces *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={pieces}
                      onChange={(e) => setPieces(e.target.value)}
                      placeholder="1"
                      className="dxp-input font-mono"
                    />
                  </div>

                  <div className="form-group">
                    <label>Declared Value ($ USD)</label>
                    <input
                      type="number"
                      value={declaredValue}
                      onChange={(e) => setDeclaredValue(e.target.value)}
                      placeholder="e.g. 2500"
                      className="dxp-input font-mono"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Carton Dimensions (L × W × H in Inches - Optional)</label>
                  <div className="dimensions-row">
                    <input
                      type="number"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder="Length (in)"
                      className="dxp-input font-mono"
                    />
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder="Width (in)"
                      className="dxp-input font-mono"
                    />
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="Height (in)"
                      className="dxp-input font-mono"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Special Instructions / Delivery Directives</label>
                  <textarea
                    rows={3}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Provide facility access details, signature requirements, or handling notes..."
                    className="dxp-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-corp-primary submit-quote-btn"
                >
                  <Send size={18} />
                  <span>{isSubmitting ? 'Submitting Application...' : 'Submit Official Rate Application'}</span>
                </button>
              </form>
            </div>

            {/* Sidebar info & Dynamic Preview */}
            <div className="quote-sidebar-col">
              {/* Dynamic Instant Tariff Estimate Box */}
              {estimatedRate && (
                <div className="dynamic-estimate-box animate-fade-in">
                  <div className="est-head">
                    <Sparkles size={18} className="text-orange" />
                    <strong>Preliminary Tariff Corridor</strong>
                  </div>
                  <div className="est-amount font-mono">
                    ${estimatedRate.low} - ${estimatedRate.high}
                  </div>
                  <p className="est-note">
                    Preliminary automated estimate for {weight} lbs via {service}. Final custom tariff is certified by our dispatch desk upon scale and corridor intake review.
                  </p>
                </div>
              )}

              <div className="quote-policy-card">
                <span className="policy-tag font-mono">OUR TARIFF ASSURANCE</span>
                <h3>Direct Carrier Integrity</h3>
                <p>
                  To eliminate unexpected broker markups and maintain carrier rate integrity, all consignment tariffs are calculated and officially published by our central administrative desk.
                </p>
                
                <div className="policy-points">
                  <div className="p-point">
                    <CheckCircle2 size={16} className="text-orange flex-shrink-0" />
                    <span>Exact scale weight & dimensional cubic rating</span>
                  </div>
                  <div className="p-point">
                    <CheckCircle2 size={16} className="text-orange flex-shrink-0" />
                    <span>Verified Interstate linehaul corridor scheduling</span>
                  </div>
                  <div className="p-point">
                    <CheckCircle2 size={16} className="text-orange flex-shrink-0" />
                    <span>Published directly to your official tracking ledger</span>
                  </div>
                  <div className="p-point">
                    <CheckCircle2 size={16} className="text-orange flex-shrink-0" />
                    <span>Direct agency documentation issuance</span>
                  </div>
                </div>

                <div className="contact-hotline-box">
                  <small>Need Immediate Tariff Assistance?</small>
                  <strong>{supportPhone}</strong>
                  <p>24/7 Central Operations Desk Connection</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
