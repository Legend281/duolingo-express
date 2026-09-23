import React, { useState } from 'react';
import {
  Clock,
  Warehouse,
  Globe,
  Layers,
  Truck,
  ShieldCheck,
  ArrowRight,
  Zap,
  CheckCircle2,
  Calendar,
  Thermometer,
  ShieldAlert,
  PackageCheck,
  FileCheck2,
  ChevronRight,
  Building,
  Car,
  FileCheck,
  Headphones,
  Lock,
  Package
} from 'lucide-react';
import './ServicesPage.css';

interface ServicesPageProps {
  onNavigate: (page: string) => void;
}

interface ServiceTier {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  deliveryTime: string;
  transitDays: string;
  maxWeight: string;
  bestFor: string;
  linehaulMode: string;
  features: string[];
  specs: {
    maxDimensions: string;
    trackingFrequency: string;
    signatureOptions: string;
    insuranceCoverage: string;
  };
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onNavigate }) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>('priority-courier');
  const [activeIndustryTab, setActiveIndustryTab] = useState<string>('healthcare');

  const serviceTiers: ServiceTier[] = [
    {
      id: 'priority-courier',
      name: 'Priority Express Courier',
      tagline: 'Time-critical same-day and next-morning point-to-point courier distribution.',
      badge: 'FASTEST DISPATCH',
      deliveryTime: 'Next Business Day by 10:30 AM / 12:00 PM (Same-Day on Selected Corridors)',
      transitDays: 'Same-Day / Next-Day',
      maxWeight: 'Up to 150 lbs per piece',
      bestFor: 'Urgent medical diagnostics, legal contracts, emergency replacement parts, time-sensitive commercial tenders.',
      linehaulMode: 'Dedicated Express Highway Shuttle & Priority Relay',
      features: [
        'Guaranteed morning arrival commitment window',
        'Direct hand-to-hand courier custody without intermediate hub delays',
        'Real-time milestone checkpoint telemetry with UTC timestamps',
        'Optional 8:00 AM First-Overnight early delivery upgrade',
        'Direct recipient signature with digital Proof of Delivery (POD)',
      ],
      specs: {
        maxDimensions: '108″ length, 165″ length + girth',
        trackingFrequency: 'Instant scan-by-scan ledger verification',
        signatureOptions: 'Direct Adult Signature Required (21+)',
        insuranceCoverage: 'Declared valuation up to $50,000 per consignment',
      },
    },
    {
      id: 'scheduled-linehaul',
      name: 'Scheduled Commercial Linehaul',
      tagline: 'Fixed-schedule interstate linehaul relays connecting regional hubs and trade corridors.',
      badge: 'MOST POPULAR',
      deliveryTime: 'Second Business Day by 4:30 PM (Commercial) / 8:00 PM (Residential)',
      transitDays: '1–2 Business Days',
      maxWeight: 'Up to 150 lbs per carton (Multi-Piece supported)',
      bestFor: 'B2B commercial inventory, retail replenishment, electronics distribution, scheduled regional transfers.',
      linehaulMode: 'Team-Driven Scheduled Interstate Highway Linehaul',
      features: [
        'Coast-to-coast 2-day delivery across contiguous U.S. network',
        'Fixed departure and arrival schedules with zero transit drift',
        'Multi-piece consignment consolidation with master indexing',
        'Piece-level linear Code 128 scan auditing at every gateway hub',
        'Secure hold at gateway facility pickup options',
      ],
      specs: {
        maxDimensions: '108″ length, 165″ length + girth',
        trackingFrequency: 'Intake gateway, intermediate linehaul relay, and out-for-delivery',
        signatureOptions: 'Standard Direct or Indirect Signature on request',
        insuranceCoverage: 'Standard $100 included, declared valuation up to $25,000',
      },
    },
    {
      id: 'auto-transport',
      name: 'Auto & Vehicle Transport',
      tagline: 'Specialized enclosed and open vehicle logistics for corporate fleets and luxury automobiles.',
      badge: 'VEHICLE LOGISTICS',
      deliveryTime: 'Scheduled Delivery Appointment Window (2–5 Business Days)',
      transitDays: '2–5 Business Days',
      maxWeight: 'Passenger cars, SUVs, corporate fleet vans, and classic autos',
      bestFor: 'Dealership inventory relocations, corporate relocations, auto auctions, private luxury vehicle transport.',
      linehaulMode: 'Dedicated Soft-Tie Open & Enclosed Multi-Vehicle Transporters',
      features: [
        'Enclosed soft-tie carriers for exotic and high-value vehicles',
        'Comprehensive multi-point digital vehicle condition reports with photos',
        'Door-to-door loading and unloading by certified automotive drivers',
        'Active GPS trailer position telemetry across nationwide routes',
        'Zero hub transfer policy: vehicle stays on the dedicated carrier',
      ],
      specs: {
        maxDimensions: 'Standard passenger vehicles, luxury exotics, light commercial vans',
        trackingFrequency: 'Carrier pickup, daily GPS highway milestones, and delivery handover',
        signatureOptions: 'Certified Bill of Lading (BOL) & Vehicle Condition Inspection signoff',
        insuranceCoverage: 'Comprehensive vehicle in-transit marine/cargo coverage included',
      },
    },
    {
      id: 'secure-vault',
      name: 'Time-Critical Secure Vault',
      tagline: 'Climate-controlled, high-security parcel transit with chain-of-custody protocols.',
      badge: 'HIGH ASSURANCE',
      deliveryTime: 'Guaranteed Priority Window (Next-Day & Expedited Ground)',
      transitDays: '1–3 Business Days',
      maxWeight: 'Up to 100 lbs per piece',
      bestFor: 'Temperature-sensitive pharmaceuticals, biomedical specimens, high-value electronics, luxury merchandise.',
      linehaulMode: 'Climate-Monitored Secure Vans & Vault-Equipped Linehauls',
      features: [
        'Active temperature logger verification (2°C–8°C / ambient)',
        'Numbered tamper-evident security seals with verification ledger',
        'Dual-driver security escort protocols on high-value tenders',
        'Priority escalation desk with dedicated logistics coordinator',
        'Immediate delivery notification to sender with digital signature',
      ],
      specs: {
        maxDimensions: '72″ length, 130″ length + girth',
        trackingFrequency: 'Continuous climate log & instant gateway scan auditing',
        signatureOptions: 'Mandatory Photo ID Verification & Adult Signature',
        insuranceCoverage: 'Full high-value declaration up to $100,000 per consignment',
      },
    },
  ];

  const activeService = serviceTiers.find((s) => s.id === selectedServiceId) || serviceTiers[0];

  const industries = [
    {
      id: 'healthcare',
      title: 'Healthcare & Life Sciences',
      icon: <Thermometer size={24} className="text-emerald" />,
      desc: 'Strict chain-of-custody protocols, temperature validation, and high-priority transit for clinical trials, diagnostic specimens, and critical medical devices.',
      capabilities: [
        'Validated temperature-assured packaging protocols (2°C–8°C)',
        'Priority linehaul departure with guaranteed transit windows',
        'Direct facility-to-facility handoff with timestamped confirmations',
        'Emergency 24/7 dispatcher hotline for medical specimen tenders',
      ],
    },
    {
      id: 'technology',
      title: 'High-Tech & Electronics',
      icon: <Zap size={24} className="text-blue" />,
      desc: 'High-security transport for sensitive microchips, telecommunications equipment, server racks, and computing hardware requiring shock-absorbing care.',
      capabilities: [
        'Anti-static and climate-controlled highway transit vans',
        'Serial number and linear Code 128 piece-level barcode indexing',
        'Tamper-evident sealed trailers with driver security protocols',
        'Direct delivery to data centers and enterprise campus loading docks',
      ],
    },
    {
      id: 'automotive',
      title: 'Automotive & Fleet Logistics',
      icon: <Car size={24} className="text-amber" />,
      desc: 'Specialized vehicle transport for dealerships, corporate fleets, and private luxury automobile relocations across all 48 contiguous states.',
      capabilities: [
        'Enclosed soft-tie carriers for exotic and classic automobiles',
        'Multi-vehicle open carriers for dealership and corporate relocations',
        'Comprehensive digital vehicle condition reports at pickup and dropoff',
        'Direct door-to-door handover with verified receiver inspection',
      ],
    },
    {
      id: 'commercial',
      title: 'Commercial Enterprise Distribution',
      icon: <Globe size={24} className="text-purple" />,
      desc: 'Scheduled linehaul distribution, multi-piece carton logistics, and rapid point-to-point courier fulfillment for commercial corporate shippers.',
      capabilities: [
        'Automated intake batching for high-volume daily manifests',
        'Public tracking console with zero account registration friction',
        'Fixed departure linehauls minimizing transit lag and damage',
        'Direct access to senior logistics coordinators nationwide',
      ],
    },
  ];

  const activeIndustry = industries.find((ind) => ind.id === activeIndustryTab) || industries[0];

  return (
    <div className="dxp-page-services">
      {/* =========================================================================
          1. CINEMATIC EXECUTIVE HERO SECTION (HARMONIZED WITH HOMEPAGE BRAND)
          ========================================================================= */}
      <section className="services-hero-section">
        <div className="services-hero-overlay" />
        <div className="dxp-container-wide services-hero-inner">
          <div className="services-hero-badge animate-fade-in">
            <span className="services-badge-dot" />
            <span>USDOT #3894210 · CERTIFIED COMMERCIAL COURIER SERVICES</span>
          </div>

          <h1 className="services-hero-title animate-fade-in">
            Precision Delivery Speeds for Every <span className="services-highlight-orange">Commercial Consignment.</span>
          </h1>
          <p className="services-hero-sub animate-fade-in">
            From urgent next-morning express courier deliveries to scheduled interstate linehauls and specialized auto transport, Duolingo Express operates a transparent, verified domestic logistics network.
          </p>

          <div className="services-hero-stats-row animate-fade-in">
            <div className="services-stat-pill">
              <span className="stat-num font-mono">99.4%</span>
              <span className="stat-lbl">On-Time Transit Velocity</span>
            </div>
            <div className="services-stat-pill">
              <span className="stat-num font-mono">48 States</span>
              <span className="stat-lbl">Contiguous U.S. Network</span>
            </div>
            <div className="services-stat-pill">
              <span className="stat-num font-mono">Code 128</span>
              <span className="stat-lbl">Piece-Level Barcode Auditing</span>
            </div>
            <div className="services-stat-pill">
              <span className="stat-num font-mono">24/7/365</span>
              <span className="stat-lbl">Active Human Dispatch</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. CORE SERVICE TIERS INTERACTIVE EXPLORER
          ========================================================================= */}
      <section className="services-explorer-section">
        <div className="dxp-container-wide">
          <div className="section-center-header">
            <span className="section-eyebrow">DOMESTIC TRANSPORTATION CAPABILITIES</span>
            <h2>Select a Service Tier to Inspect Operational Specs</h2>
            <p className="section-desc-sub">
              Every service level is backed by strict delivery windows, piece-level Code 128 scans, and guaranteed linehaul capacity.
            </p>
            <div className="section-header-line" />
          </div>

          {/* Tier Selection Tabs */}
          <div className="service-tab-nav">
            {serviceTiers.map((tier) => {
              const isSelected = tier.id === selectedServiceId;
              return (
                <button
                  key={tier.id}
                  type="button"
                  className={`service-nav-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedServiceId(tier.id)}
                >
                  <span className="nav-btn-badge font-mono">{tier.badge}</span>
                  <strong className="nav-btn-title">{tier.name}</strong>
                  <span className="nav-btn-time font-mono">{tier.transitDays}</span>
                </button>
              );
            })}
          </div>

          {/* Active Service Showcase Card */}
          <div className="active-service-showcase-card animate-fade-in">
            <div className="service-showcase-grid">
              {/* Left Details */}
              <div className="showcase-left">
                <div className="showcase-header">
                  <span className="service-pill-tag font-mono">{activeService.badge}</span>
                  <h3>{activeService.name}</h3>
                  <p className="showcase-tagline">{activeService.tagline}</p>
                </div>

                <div className="showcase-time-box">
                  <div className="time-box-item">
                    <div className="time-icon-box orange">
                      <Clock size={20} />
                    </div>
                    <div>
                      <small>COMMITTED DELIVERY WINDOW</small>
                      <strong>{activeService.deliveryTime}</strong>
                    </div>
                  </div>

                  <div className="time-box-item">
                    <div className="time-icon-box emerald">
                      <Truck size={20} />
                    </div>
                    <div>
                      <small>PRIMARY TRANSPORT ASSET</small>
                      <strong>{activeService.linehaulMode}</strong>
                    </div>
                  </div>
                </div>

                <div className="showcase-features-list">
                  <h4>Key Operational Highlights:</h4>
                  {activeService.features.map((feat, idx) => (
                    <div key={idx} className="feature-bullet">
                      <CheckCircle2 size={16} className="text-emerald" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="showcase-actions-row">
                  <button
                    type="button"
                    className="btn-corp-primary"
                    onClick={() => onNavigate('quote')}
                  >
                    <span>Request Rate for {activeService.name}</span>
                    <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn-corp-ghost"
                    onClick={() => onNavigate('track')}
                  >
                    <span>Track Consignment</span>
                  </button>
                </div>
              </div>

              {/* Right Technical Specs Card */}
              <div className="showcase-right">
                <div className="specs-card-box">
                  <div className="specs-head">
                    <FileCheck2 size={18} className="text-orange" />
                    <h4>Technical & Packaging Specifications</h4>
                  </div>

                  <div className="specs-items-list">
                    <div className="spec-item">
                      <span className="spec-title">Weight Allowance</span>
                      <strong className="spec-val font-mono">{activeService.maxWeight}</strong>
                    </div>

                    <div className="spec-item">
                      <span className="spec-title">Maximum Dimensions</span>
                      <strong className="spec-val font-mono">{activeService.specs.maxDimensions}</strong>
                    </div>

                    <div className="spec-item">
                      <span className="spec-title">Tracking Telemetry Updates</span>
                      <strong className="spec-val font-mono">{activeService.specs.trackingFrequency}</strong>
                    </div>

                    <div className="spec-item">
                      <span className="spec-title">Signature & Verification</span>
                      <strong className="spec-val font-mono">{activeService.specs.signatureOptions}</strong>
                    </div>

                    <div className="spec-item">
                      <span className="spec-title">Cargo Liability Coverage</span>
                      <strong className="spec-val font-mono">{activeService.specs.insuranceCoverage}</strong>
                    </div>

                    <div className="spec-item ideal-for">
                      <span className="spec-title">Ideal Cargo Profile</span>
                      <p className="spec-desc">{activeService.bestFor}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. SIDE-BY-SIDE SERVICE COMPARISON MATRIX
          ========================================================================= */}
      <section className="services-matrix-section">
        <div className="dxp-container-wide">
          <div className="section-center-header">
            <span className="section-eyebrow">TRANSPARENT SERVICE MATRIX</span>
            <h2>Compare Delivery Speeds & Capabilities</h2>
            <p className="section-desc-sub">
              Direct comparison of domestic service parameters to help you select the optimal courier or linehaul option.
            </p>
            <div className="section-header-line" />
          </div>

          <div className="matrix-table-card">
            <div className="table-mobile-hint">
              <span>← Swipe horizontally to view full service matrix →</span>
            </div>
            <div className="table-responsive">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Service Tier</th>
                    <th>Committed Transit Window</th>
                    <th>Weight Maximum</th>
                    <th>Transport Asset</th>
                    <th>Piece Barcoding</th>
                    <th>Proof of Delivery</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="tier-col-title">
                        <strong>Priority Express Courier</strong>
                        <span className="tier-tag fast">Fastest</span>
                      </div>
                    </td>
                    <td>Next Morning (10:30 AM / 12:00 PM)</td>
                    <td>150 lbs / carton</td>
                    <td>Express Courier Shuttle</td>
                    <td><CheckCircle2 size={16} className="text-emerald" /> Code 128 (Piece Level)</td>
                    <td>Direct Adult Signature</td>
                    <td>
                      <button type="button" className="table-action-btn" onClick={() => onNavigate('quote')}>
                        Quote
                      </button>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="tier-col-title">
                        <strong>Scheduled Commercial Linehaul</strong>
                        <span className="tier-tag popular">Popular</span>
                      </div>
                    </td>
                    <td>1–2 Business Days (Day-Definite)</td>
                    <td>150 lbs / carton</td>
                    <td>Team-Driven Linehaul Relays</td>
                    <td><CheckCircle2 size={16} className="text-emerald" /> Code 128 (Piece Level)</td>
                    <td>Direct / Dock Signoff</td>
                    <td>
                      <button type="button" className="table-action-btn" onClick={() => onNavigate('quote')}>
                        Quote
                      </button>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="tier-col-title">
                        <strong>Auto & Vehicle Transport</strong>
                        <span className="tier-tag vehicle">Auto Fleet</span>
                      </div>
                    </td>
                    <td>2–5 Business Days (By Appointment)</td>
                    <td>Passenger & Fleet Vehicles</td>
                    <td>Enclosed & Open Transporters</td>
                    <td><CheckCircle2 size={16} className="text-emerald" /> VIN & Condition Audited</td>
                    <td>Signed BOL Inspection</td>
                    <td>
                      <button type="button" className="table-action-btn" onClick={() => onNavigate('quote')}>
                        Quote
                      </button>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="tier-col-title">
                        <strong>Time-Critical Secure Vault</strong>
                        <span className="tier-tag secure">Climate Vault</span>
                      </div>
                    </td>
                    <td>1–3 Business Days (Expedited)</td>
                    <td>100 lbs / piece</td>
                    <td>Climate-Monitored Secure Vans</td>
                    <td><CheckCircle2 size={16} className="text-emerald" /> Tamper-Seal Verification</td>
                    <td>Mandatory Photo ID & POD</td>
                    <td>
                      <button type="button" className="table-action-btn" onClick={() => onNavigate('quote')}>
                        Quote
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. INDUSTRY-SPECIFIC LOGISTICS SOLUTIONS
          ========================================================================= */}
      <section className="services-industry-section">
        <div className="dxp-container-wide">
          <div className="section-center-header">
            <span className="section-eyebrow">SPECIALIZED INDUSTRY SECTORS</span>
            <h2>Tailored Logistics Solutions by Industry</h2>
            <p className="section-desc-sub">
              Every commercial sector requires dedicated handling procedures, compliance verification, and tracking protocols.
            </p>
            <div className="section-header-line" />
          </div>

          <div className="industry-tabs-row">
            {industries.map((ind) => (
              <button
                key={ind.id}
                type="button"
                className={`industry-pill-btn ${ind.id === activeIndustryTab ? 'active' : ''}`}
                onClick={() => setActiveIndustryTab(ind.id)}
              >
                {ind.title}
              </button>
            ))}
          </div>

          <div className="industry-showcase-card animate-fade-in">
            <div className="ind-card-grid">
              <div className="ind-card-left">
                <div className="ind-icon-title-row">
                  <div className="ind-icon-box">{activeIndustry.icon}</div>
                  <div>
                    <span className="ind-subtag font-mono">ENTERPRISE COURIER STANDARDS</span>
                    <h3>{activeIndustry.title}</h3>
                  </div>
                </div>
                <p className="ind-desc">{activeIndustry.desc}</p>

                <div className="ind-capabilities-list">
                  <h4>Standard Operating Capabilities:</h4>
                  {activeIndustry.capabilities.map((cap, i) => (
                    <div key={i} className="ind-cap-row">
                      <CheckCircle2 size={16} className="text-emerald" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>

                <div className="ind-cta-row">
                  <button
                    type="button"
                    className="btn-corp-primary"
                    onClick={() => onNavigate('quote')}
                  >
                    <span>Request Rate for {activeIndustry.title}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>

              <div className="ind-card-right">
                <div className="ind-visual-box">
                  <img
                    src={
                      activeIndustryTab === 'healthcare'
                        ? '/images/services/healthcare-pharma.jpg' // User's authentic pharmaceutical & cold chain handling photo
                        : activeIndustryTab === 'technology'
                        ? 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop&q=80' // Enterprise data center logistics & server rack transit
                        : activeIndustryTab === 'automotive'
                        ? '/images/services/automotive-parts.jpg' // User's authentic automotive parts & mechanical logistics photo
                        : '/images/services/ecommerce-retail.jpg' // User's authentic e-commerce fulfillment carton packing photo
                    }
                    alt={activeIndustry.title}
                    className="ind-showcase-img"
                  />
                  <div className="ind-img-overlay">
                    <span className="overlay-badge font-mono">DXP SECURE LINEHAUL</span>
                    <span className="overlay-text">Dedicated handling and physical verification at every gateway</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. VALUE-ADDED HANDLING & ENTERPRISE SECURITY ADD-ONS
          ========================================================================= */}
      <section className="services-addons-section">
        <div className="dxp-container-wide">
          <div className="section-center-header">
            <span className="section-eyebrow">HIGH-ASSURANCE CARGO PROTOCOLS</span>
            <h2>Specialized Cargo Handling & Security Add-Ons</h2>
            <p className="section-desc-sub">
              Enhance any domestic courier or linehaul consignment with tailored chain-of-custody, timing, and dockside execution protocols.
            </p>
            <div className="section-header-line" />
          </div>

          <div className="addons-grid-cool">
            {/* Card 1 */}
            <div className="addon-card-cool">
              <div className="addon-card-glow-bar glow-emerald" />
              <div className="addon-top-meta">
                <div className="addon-icon-box icon-emerald"><ShieldCheck size={26} /></div>
                <span className="addon-category-tag tag-emerald font-mono">CHAIN OF CUSTODY</span>
              </div>
              <h3 className="addon-title-cool">Direct Signature Confirmation</h3>
              <p className="addon-desc-cool">
                Mandatory physical handoff requiring adult signature capture, verified consignee photo identification, and instant GPS-stamped proof of delivery recorded in the central ledger.
              </p>
              <div className="addon-specs-pills">
                <span className="spec-pill">✓ Adult (21+) Required</span>
                <span className="spec-pill">✓ Anti-Fraud Protection</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="addon-card-cool">
              <div className="addon-card-glow-bar glow-orange" />
              <div className="addon-top-meta">
                <div className="addon-icon-box icon-orange"><Calendar size={26} /></div>
                <span className="addon-category-tag tag-orange font-mono">EXPEDITED TIMING</span>
              </div>
              <h3 className="addon-title-cool">Saturday Priority Delivery</h3>
              <p className="addon-desc-cool">
                Dedicated weekend dispatch departures and Saturday morning delivery routes for urgent healthcare supplies, replacement parts, and high-priority commercial cargo.
              </p>
              <div className="addon-specs-pills">
                <span className="spec-pill">✓ Saturday 10:30 AM Commit</span>
                <span className="spec-pill">✓ Weekend Courier Shuttle</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="addon-card-cool">
              <div className="addon-card-glow-bar glow-purple" />
              <div className="addon-top-meta">
                <div className="addon-icon-box icon-purple"><Building size={26} /></div>
                <span className="addon-category-tag tag-purple font-mono">FACILITY HOLD</span>
              </div>
              <h3 className="addon-title-cool">Hold for Consignee Pickup</h3>
              <p className="addon-desc-cool">
                Securely hold cargo in monitored, climate-controlled carrier intake facilities. Ideal for consignees with irregular receiving hours or restricted access facilities.
              </p>
              <div className="addon-specs-pills">
                <span className="spec-pill">✓ 5-Day Secure Holding</span>
                <span className="spec-pill">✓ Flexible Pickup Window</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="addon-card-cool">
              <div className="addon-card-glow-bar glow-sky" />
              <div className="addon-top-meta">
                <div className="addon-icon-box icon-sky"><Car size={26} /></div>
                <span className="addon-category-tag tag-sky font-mono">VEHICLE LOGISTICS</span>
              </div>
              <h3 className="addon-title-cool">Soft-Tie Enclosed Vehicle Care</h3>
              <p className="addon-desc-cool">
                Full-service enclosed transport for luxury and classic vehicles. Soft-tie non-damaging strapping, hydraulic lift gate loading, and detailed condition auditing.
              </p>
              <div className="addon-specs-pills">
                <span className="spec-pill">✓ Soft-Tie Strapping</span>
                <span className="spec-pill">✓ Enclosed Weather Protection</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. OPERATIONAL LIFECYCLE PIPELINE
          ========================================================================= */}
      <section className="services-lifecycle-section">
        <div className="dxp-container-wide">
          <div className="lifecycle-header">
            <span className="lifecycle-eyebrow">UNBROKEN COURIER PIPELINE</span>
            <h3>How Every Consignment Moves Through Duolingo Express</h3>
            <p>Our standardized 4-stage operational journey ensures zero blind spots, instant Code 128 piece barcoding, and total transparency.</p>
          </div>

          <div className="lifecycle-steps-grid">
            <div className="lifecycle-step-card">
              <span className="step-num font-mono">01</span>
              <h4>Digital Tender & Barcoding</h4>
              <p>Consignment manifest and Code 128 piece barcodes are provisioned in the central ledger.</p>
            </div>

            <div className="lifecycle-step-card">
              <span className="step-num font-mono">02</span>
              <h4>Gateway Ingestion Scan</h4>
              <p>Origin facility scans, weighs, and stages cargo for scheduled linehaul departure.</p>
            </div>

            <div className="lifecycle-step-card">
              <span className="step-num font-mono">03</span>
              <h4>Dedicated Linehaul Relay</h4>
              <p>Cargo travels via direct express linehaul corridors with intermediate sort updates.</p>
            </div>

            <div className="lifecycle-step-card">
              <span className="step-num font-mono">04</span>
              <h4>Verified Proof of Delivery</h4>
              <p>Final courier delivers with recipient signature capture and digital POD signoff.</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. BOTTOM CALL TO ACTION
          ========================================================================= */}
      <section className="services-bottom-cta">
        <div className="dxp-container-wide">
          <div className="services-cta-card">
            <div className="services-cta-content">
              <div className="cta-telemetry-badge">
                <span className="services-pulse-dot" />
                <span>NATIONWIDE CARRIER DISPATCH ACTIVE</span>
              </div>
              <h2>Ready to Experience Reliable Courier Logistics?</h2>
              <p>
                Submit your cargo specifications for an instant guaranteed rate tariff or speak with our central logistics coordinator.
              </p>
            </div>

            <div className="services-cta-actions">
              <button
                type="button"
                className="btn-corp-primary"
                onClick={() => onNavigate('quote')}
              >
                <span>Request a Rate Quote</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="btn-corp-ghost"
                onClick={() => onNavigate('track')}
              >
                <span>Track a Shipment</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
