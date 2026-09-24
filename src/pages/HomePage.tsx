import React, { useState } from 'react';
import {
  Package,
  Truck,
  Calculator,
  MapPin,
  Calendar,
  Clock,
  Globe,
  Layers,
  Warehouse,
  ShieldCheck,
  Headphones,
  Eye,
  CheckCircle2,
  ArrowRight,
  Phone,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
  Lock,
  FileText,
  Building,
  Check,
  Search,
  Shield,
  Award,
  Send,
  Star,
  Users,
  Car,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sliders,
  DollarSign
} from 'lucide-react';
import { Barcode } from '../components/Barcode';
import { HomeNetworkMap } from '../components/HomeNetworkMap';
import { CLIENT_LOGOS } from '../components/ClientLogos';
import { useAdminData } from '../context/AdminDataContext';
import './HomePage.css';

interface HomePageProps {
  onTrack: (trackingNumber: string) => void;
  onNavigate: (page: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onTrack, onNavigate }) => {
  const { settings } = useAdminData();
  const supportPhone = settings.supportPhone || '1-800-555-0199';
  const dotNumber = settings.dotNumber || 'USDOT #3894210 · MC-892401';
  // Interactive Mini Rate Estimator State
  const [estOrigin, setEstOrigin] = useState('New York, NY');
  const [estDest, setEstDest] = useState('Los Angeles, CA');
  const [estService, setEstService] = useState<'EXPRESS' | 'GROUND' | 'VEHICLE'>('EXPRESS');
  const [estWeight, setEstWeight] = useState(45);

  // Industry Solutions Interactive Tab State
  const [industryTab, setIndustryTab] = useState<'auto' | 'medical' | 'ecommerce' | 'tech'>('auto');

  // Callback Form State
  const [cbName, setCbName] = useState('');
  const [cbService, setCbService] = useState('Priority Express Courier');
  const [cbPhone, setCbPhone] = useState('');
  const [cbSuccess, setCbSuccess] = useState(false);

  // Testimonials Slider State
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Active Gateway Hub State
  const [activeHub, setActiveHub] = useState<'JFK' | 'ORD' | 'DFW' | 'DEN' | 'LAX'>('ORD');

  // Mini Rate Calculation
  const calculateRate = () => {
    let base = 35;
    if (estService === 'EXPRESS') base = 65;
    if (estService === 'VEHICLE') return 1280 + (estWeight > 50 ? 150 : 0);

    const weightCost = estWeight * (estService === 'EXPRESS' ? 1.85 : 0.95);
    const fuel = (base + weightCost) * 0.085;
    return Math.round((base + weightCost + fuel) * 100) / 100;
  };

  const testimonials = [
    {
      quote: "Duolingo Express gives us the visibility and reliability we need to keep our commercial clients completely satisfied. Checkpoint updates are accurate, schedules are consistent, and their dedicated dispatch desk is unmatched.",
      author: "Jessica Morgan",
      role: "Director of Supply Chain, Apex Retail Logistics",
      company: "Apex Commercial Corp",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      rating: 5
    },
    {
      quote: "The linear Code 128 piece barcodes and live vehicle telemetry revolutionized our medical parts delivery across regional hubs. Real-time chain of custody from origin pickup to hospital dock sign-off.",
      author: "David Vance",
      role: "VP of Operations, Midwest Medical Distribution",
      company: "Midwest Health Logistics",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
      rating: 5
    },
    {
      quote: "We ship high-value auto components and full vehicle transports nationwide. The digital Bill of Lading generation and 60 FPS live tracking give our customers total confidence from coast to coast.",
      author: "Marcus Sterling",
      role: "Fleet Operations Manager, Sterling Automotive USA",
      company: "Sterling Auto Group",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
      rating: 5
    }
  ];

  const faqs = [
    {
      q: 'Do I need an account or password to track a shipment?',
      a: 'No. Duolingo Express operates a public logistics ledger. Simply enter your unique tracking identifier into our public tracking engine to view verified facility checkpoints, transit progress, and dynamic ETA updates.'
    },
    {
      q: 'How does live highway telemetry work without continuous driver GPS?',
      a: 'For driver safety and commercial privacy, our simulation and routing engine calculates verified physical progress between certified FMCSA corridor waypoints, logging exact facility arrival and departure timestamps.'
    },
    {
      q: 'Can I track multi-piece packages or auto transports under one master waybill?',
      a: 'Yes. Our platform supports parent-child consignment hierarchies with linear Code 128 piece barcodes, VIN inspection records, and consolidated Bill of Lading documentation.'
    },
    {
      q: 'What is the cutoff time for same-day scheduled linehaul dispatch?',
      a: 'Same-day scheduled linehaul tenders are accepted until 4:00 PM local time across our regional gateway terminals (New York JFK, Chicago ORD, Dallas DFW, Denver DEN, Los Angeles LAX).'
    },
    {
      q: 'Are documents such as the Bill of Lading (BOL) and Proof of Delivery (POD) available digitally?',
      a: 'Yes. Every tendered consignment automatically provisions an official digital Bill of Lading and Master Shipping Label. Upon delivery, the recipient’s physical signature is recorded on the official Proof of Delivery (POD).'
    }
  ];

  const partnerLogos = [
    { name: 'FedEx Custom Critical', type: 'EXPRESS COURIER', icon: <Truck size={20} className="text-orange" /> },
    { name: 'DHL Express Network', type: 'TIME-CRITICAL COURIER', icon: <Globe size={20} className="text-orange" /> },
    { name: 'UPS Express Critical', type: 'INTERSTATE LINEHAUL', icon: <ShieldCheck size={20} className="text-orange" /> },
    { name: 'Penske Commercial Logistics', type: 'DEDICATED FLEET', icon: <Warehouse size={20} className="text-orange" /> },
    { name: 'ArcBest Expedited', type: 'EXPEDITED TRANSIT', icon: <Zap size={20} className="text-orange" /> },
    { name: 'Old Dominion Express', type: 'DIRECT LINEHAUL', icon: <Truck size={20} className="text-orange" /> },
    { name: 'Estes Express Lines', type: 'REGIONAL COURIER', icon: <Package size={20} className="text-orange" /> },
    { name: 'Forward Logistics Complete', type: 'AIRPORT GATEWAY COURIER', icon: <Globe size={20} className="text-orange" /> }
  ];

  const handleCallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cbPhone.trim()) {
      setCbSuccess(true);
      setTimeout(() => {
        setCbSuccess(false);
        setCbName('');
        setCbPhone('');
      }, 4000);
    }
  };

  const nextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="dxp-homepage-container">
      {/* =========================================================================
          1. CINEMATIC HERO SECTION WITH BOLD TYPOGRAPHY & FAST ACTION CONSOLE
          ========================================================================= */}
      <section className="corp-hero-section">
        <div className="corp-hero-overlay" />
        <div className="dxp-container-wide corp-hero-inner">
          <div className="corp-hero-content animate-fade-in">
            <div className="corp-hero-badge">
              <span className="badge-pulse-dot" />
              <span>{dotNumber} · NATIONWIDE COURIER NETWORK</span>
            </div>

            <h1 className="corp-hero-title">
              Delivering confidence <br />
              <span className="corp-highlight-orange">mile after mile.</span>
            </h1>

            <p className="corp-hero-subtitle">
              Fast, certified express courier and scheduled commercial linehaul transit across major nationwide commercial trade corridors.
            </p>

            <div className="corp-hero-cta-row">
              <button
                type="button"
                className="btn-corp-primary"
                onClick={() => onNavigate('quote')}
              >
                <Calculator size={18} />
                <span>Get a Rate Quote</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="btn-corp-ghost"
                onClick={() => onNavigate('track')}
              >
                <Search size={18} />
                <span>Track Shipment</span>
              </button>
            </div>
          </div>

          {/* Clean & Elegant Hero Service Guarantee Showcase */}
          <div className="corp-hero-service-showcase animate-scale-in">
            <div className="hero-showcase-header">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-orange" />
                <span className="showcase-header-title font-mono">OFFICIAL SERVICE GUARANTEES</span>
              </div>
              <span className="hero-guarantee-badge font-mono">CERTIFIED</span>
            </div>

            <div className="hero-feature-rows">
              <div className="hero-feat-item">
                <div className="hero-feat-icon">
                  <Clock size={20} className="text-orange" />
                </div>
                <div className="hero-feat-text">
                  <strong>Guaranteed Transit Windows</strong>
                  <p>Strict pickup and arrival timeframes with real-time milestone confirmations.</p>
                </div>
              </div>

              <div className="hero-feat-item">
                <div className="hero-feat-icon">
                  <ShieldCheck size={20} className="text-emerald" />
                </div>
                <div className="hero-feat-text">
                  <strong>Direct Chain of Custody</strong>
                  <p>Hand-to-hand parcel scanning and instant signed Proof of Delivery (POD).</p>
                </div>
              </div>

              <div className="hero-feat-item">
                <div className="hero-feat-icon">
                  <Headphones size={20} className="text-sky" />
                </div>
                <div className="hero-feat-text">
                  <strong>Dedicated Human Support</strong>
                  <p>Direct phone access to senior dispatch coordinators for every single consignment.</p>
                </div>
              </div>
            </div>

            <div className="hero-showcase-bottom">
              <Phone size={15} className="text-orange" />
              <span>Priority Hotline: <strong>{supportPhone}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. "WHY SHIPPERS CHOOSE US" (3 ELEVATED FLOATING VALUE CARDS)
          ========================================================================= */}
      <section className="corp-why-choose-section">
        <div className="dxp-container-wide">
          <div className="section-center-header">
            <span className="section-eyebrow">RELIABLE COURIER EXCELLENCE</span>
            <h2>Why commercial shippers choose Duolingo Express</h2>
            <p className="section-desc-sub">
              Precision transit schedules, verifiable chain of custody, and dedicated driver dispatch across all major interstate corridors.
            </p>
            <div className="section-header-line" />
          </div>

          <div className="why-choose-grid">
            {/* Card 1 */}
            <div className="why-card">
              <div className="why-icon-bubble">
                <Zap size={24} />
              </div>
              <h3>Priority Express Courier</h3>
              <p>
                Guaranteed point-to-point same-day and next-day courier delivery connecting commercial hubs and regional distribution gateways without delay.
              </p>
              <button
                type="button"
                className="btn-why-readmore"
                onClick={() => onNavigate('services')}
              >
                <span>Read more</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Card 2 */}
            <div className="why-card">
              <div className="why-icon-bubble">
                <Truck size={24} />
              </div>
              <h3>Door-to-Door Scheduled Linehaul</h3>
              <p>
                Dedicated courier linehaul fleets with strict chain of custody, tamper-evident security seals, and direct dock-to-dock transit schedules.
              </p>
              <button
                type="button"
                className="btn-why-readmore"
                onClick={() => onNavigate('services')}
              >
                <span>Read more</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Card 3 */}
            <div className="why-card">
              <div className="why-icon-bubble">
                <Activity size={24} />
              </div>
              <h3>Real-Time Checkpoint Provenance</h3>
              <p>
                Every barcode scan logs verified physical timestamps, hub sortation provenance, digital Bill of Lading records, and live highway telemetry.
              </p>
              <button
                type="button"
                className="btn-why-readmore"
                onClick={() => onNavigate('track')}
              >
                <span>Read more</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. "HOW IT WORKS" — 4-STEP VERIFIED TRANSIT PROTOCOL
          ========================================================================= */}
      <section className="corp-how-it-works-section">
        <div className="dxp-container-wide">
          <div className="section-center-header">
            <span className="section-eyebrow">SEAMLESS COURIER PROTOCOL</span>
            <h2>How Duolingo Express moves your shipments</h2>
            <p className="section-desc-sub">
              From origin pickup to final recipient signature, every consignment follows our verified 4-step chain of custody.
            </p>
            <div className="section-header-line" />
          </div>

          {/* Kinetic Horizontal Conduit Architecture (No Box Fatigue) */}
          <div className="kinetic-pipeline-container">
            <div className="pipeline-laser-beam" />
            <div className="pipeline-nodes-row">
              {/* Step 1 */}
              <div className="pipeline-step-node">
                <div className="pipeline-connector-top">
                  <div className="node-ring font-mono">
                    <span className="node-num">01</span>
                    <div className="node-ring-pulse" />
                  </div>
                  <div className="node-icon-bubble">
                    <FileText size={22} className="text-orange" />
                  </div>
                </div>
                <div className="node-body">
                  <span className="node-eyebrow font-mono">STEP 01 · TENDER</span>
                  <h3>Consignment Tender & Digital BOL</h3>
                  <p>
                    Instant electronic Bill of Lading generation, regulatory compliance validation, and high-density linear Code 128 piece barcode issuance.
                  </p>
                  <div className="node-spec-pills">
                    <span className="spec-pill font-mono">EDI 214 Ready</span>
                    <span className="spec-pill font-mono">Instant BOL</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="pipeline-step-node">
                <div className="pipeline-connector-top">
                  <div className="node-ring font-mono">
                    <span className="node-num">02</span>
                    <div className="node-ring-pulse" />
                  </div>
                  <div className="node-icon-bubble">
                    <Warehouse size={22} className="text-orange" />
                  </div>
                </div>
                <div className="node-body">
                  <span className="node-eyebrow font-mono">STEP 02 · HUB INTAKE</span>
                  <h3>Regional Sortation & Verification</h3>
                  <p>
                    Tendered parcels arrive at regional gateway cross-docks for automated optical dimensioning, high-speed scales, and physical timestamping.
                  </p>
                  <div className="node-spec-pills">
                    <span className="spec-pill font-mono">Laser Dimensioning</span>
                    <span className="spec-pill font-mono">Ledger Logged</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="pipeline-step-node">
                <div className="pipeline-connector-top">
                  <div className="node-ring font-mono">
                    <span className="node-num">03</span>
                    <div className="node-ring-pulse" />
                  </div>
                  <div className="node-icon-bubble">
                    <Truck size={22} className="text-orange" />
                  </div>
                </div>
                <div className="node-body">
                  <span className="node-eyebrow font-mono">STEP 03 · LINEHAUL</span>
                  <h3>Interstate Highway Telemetry</h3>
                  <p>
                    Dedicated express linehaul departures with 60 FPS schedule-based position telemetry, automated waypoint alerts, and corridor milestone tracking.
                  </p>
                  <div className="node-spec-pills">
                    <span className="spec-pill font-mono">60 FPS Telemetry</span>
                    <span className="spec-pill font-mono">Geofenced ETA</span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="pipeline-step-node">
                <div className="pipeline-connector-top">
                  <div className="node-ring font-mono">
                    <span className="node-num">04</span>
                    <div className="node-ring-pulse" />
                  </div>
                  <div className="node-icon-bubble">
                    <ShieldCheck size={22} className="text-orange" />
                  </div>
                </div>
                <div className="node-body">
                  <span className="node-eyebrow font-mono">STEP 04 · DELIVERED</span>
                  <h3>Dock-to-Door Signed POD</h3>
                  <p>
                    Direct physical handoff with electronic recipient signature capture, timestamped geocoordinates, and immediate downloadable POD waybill.
                  </p>
                  <div className="node-spec-pills">
                    <span className="spec-pill font-mono">Electronic Signature</span>
                    <span className="spec-pill font-mono">Legal Proof</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="how-it-works-action-strip">
            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-orange" />
              <span>Ready to experience transparent nationwide express delivery?</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn-corp-primary"
                onClick={() => onNavigate('ship')}
              >
                <span>Ship With Us</span>
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="btn-corp-ghost-dark"
                onClick={() => onNavigate('quote')}
              >
                <span>Get a Rate Quote</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. EDITORIAL "ABOUT US" SECTION (SPLIT SHOWCASE WITH EXPERIENCE BADGE)
          ========================================================================= */}
      <section className="corp-about-section">
        <div className="dxp-container-wide corp-about-grid">
          {/* Left Stacked Image Stage */}
          <div className="about-image-stage">
            <div className="about-main-img-wrapper">
              <img
                src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=900&auto=format&fit=crop&q=85"
                alt="Duolingo Express Commercial Logistics Operations"
                className="about-main-img"
              />
              <div className="about-experience-badge">
                <span className="exp-years font-mono">15+</span>
                <div className="exp-text">
                  <strong>YEARS OF</strong>
                  <span>EXPRESS LOGISTICS</span>
                </div>
              </div>
            </div>

            {/* Floating Secondary Thumbnail */}
            <div className="about-thumb-overlap">
              <img
                src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&auto=format&fit=crop&q=85"
                alt="Operations Logistics Team"
                className="about-thumb-img"
              />
              <div className="about-thumb-caption">
                <strong>24/7 Dispatch Desk</strong>
                <small>Dedicated Regional Operators</small>
              </div>
            </div>
          </div>

          {/* Right Text Content */}
          <div className="about-text-content">
            <span className="section-eyebrow">ABOUT DUOLINGO EXPRESS</span>
            <h2>We believe modern shipping should be visible, fast, and effortlessly dependable.</h2>
            <p className="about-lead">
              Duolingo Express provides nationwide interstate courier services and express parcel distribution across major U.S. commercial corridors.
            </p>
            <p className="about-body">
              Built on certified carrier compliance and digital transparency, our operations eliminate the ambiguity of traditional shipping. Shippers and consignees receive physical facility checkpoint verification, high-density linear Code 128 barcodes, and continuous vehicle tracking from origin tender to final delivery.
            </p>

            <div className="about-stats-strip">
              <div className="about-stat-item">
                <strong className="font-mono text-orange">99.4%</strong>
                <span>On-Time Delivery Rate</span>
              </div>
              <div className="about-stat-item">
                <strong className="font-mono text-orange">50+</strong>
                <span>Gateway Sorting Hubs</span>
              </div>
              <div className="about-stat-item">
                <strong className="font-mono text-orange">24/7</strong>
                <span>Live Dispatch Support</span>
              </div>
            </div>

            <button
              type="button"
              className="btn-corp-primary"
              onClick={() => onNavigate('about')}
            >
              <span>Discover Our Network</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. CORE COURIER SERVICES SHOWCASE (4 ELEVATED CARDS)
          ========================================================================= */}
      <section className="corp-services-section">
        <div className="dxp-container-wide">
          <div className="section-center-header light">
            <span className="section-eyebrow text-orange">COURIER SOLUTIONS</span>
            <h2>Specialized Priority Transportation</h2>
            <p className="section-desc-sub text-slate-300">
              High-velocity transport options engineered for time-sensitive commercial consignments and private shipments.
            </p>
            <div className="section-header-line orange" />
          </div>

          <div className="services-showcase-grid">
            {/* Service 01: Priority Express Courier */}
            <div className="service-card" style={{ backgroundImage: `url('/images/home/ecommerce-retail.jpg')` }}>
              <div className="service-card-overlay" />
              <div className="service-card-content">
                <div className="flex justify-between items-center">
                  <span className="service-num font-mono">01</span>
                  <span className="service-status-pill">SAME-DAY DISPATCH</span>
                </div>
                <h3>Priority Express Courier</h3>
                <p>Urgent point-to-point document and parcel dispatch with expedited linehaul connection.</p>
                <div className="service-micro-pills">
                  <span>• Flight Connection</span>
                  <span>• 24/7 Hand-off</span>
                  <span>• Direct Chain</span>
                </div>
                <button
                  type="button"
                  className="btn-service-arrow"
                  onClick={() => onNavigate('services')}
                  aria-label="View Priority Express Courier"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            {/* Service 02: Scheduled Regional Linehaul */}
            <div className="service-card" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=900&auto=format&fit=crop&q=80')` }}>
              <div className="service-card-overlay" />
              <div className="service-card-content">
                <div className="flex justify-between items-center">
                  <span className="service-num font-mono">02</span>
                  <span className="service-status-pill">SCHEDULED LINEHAUL</span>
                </div>
                <h3>Scheduled Regional Linehaul</h3>
                <p>Direct interstate highway transport between sorting gateways with verified timestamps.</p>
                <div className="service-micro-pills">
                  <span>• Dedicated Fleet</span>
                  <span>• Dock-to-Dock</span>
                  <span>• Tamper Seals</span>
                </div>
                <button
                  type="button"
                  className="btn-service-arrow"
                  onClick={() => onNavigate('services')}
                  aria-label="View Scheduled Regional Linehaul"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            {/* Service 03: Auto & Vehicle Transport */}
            <div className="service-card" style={{ backgroundImage: `url('/images/home/automotive-parts.jpg')` }}>
              <div className="service-card-overlay" />
              <div className="service-card-content">
                <div className="flex justify-between items-center">
                  <span className="service-num font-mono">03</span>
                  <span className="service-status-pill">VEHICLE LOGISTICS</span>
                </div>
                <h3>Auto & Vehicle Transport</h3>
                <p>Enclosed and open vehicle hauling with VIN barcode tracking and digital condition reports.</p>
                <div className="service-micro-pills">
                  <span>• 17-Digit VIN Pass</span>
                  <span>• Open/Enclosed</span>
                  <span>• Condition Log</span>
                </div>
                <button
                  type="button"
                  className="btn-service-arrow"
                  onClick={() => onNavigate('services')}
                  aria-label="View Auto & Vehicle Transport"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            {/* Service 04: Secure Cargo & Vault */}
            <div className="service-card" style={{ backgroundImage: `url('/images/home/healthcare-pharma.jpg')` }}>
              <div className="service-card-overlay" />
              <div className="service-card-content">
                <div className="flex justify-between items-center">
                  <span className="service-num font-mono">04</span>
                  <span className="service-status-pill">COLD CHAIN VAULT</span>
                </div>
                <h3>Medical & High-Value Cargo</h3>
                <p>Tamper-evident chain of custody, direct driver handoff, and direct recipient signature sign-off.</p>
                <div className="service-micro-pills">
                  <span>• Temperature Vault</span>
                  <span>• Direct Driver</span>
                  <span>• Signed POD</span>
                </div>
                <button
                  type="button"
                  className="btn-service-arrow"
                  onClick={() => onNavigate('services')}
                  aria-label="View Medical & High-Value Cargo"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. INDUSTRY-SPECIFIC LOGISTICS SOLUTIONS (INTERACTIVE TABS)
          ========================================================================= */}
      <section className="corp-industry-section">
        <div className="dxp-container-wide">
          <div className="section-center-header">
            <span className="section-eyebrow">SECTOR EXPERTISE</span>
            <h2>Tailored logistics for key industries</h2>
            <p className="section-desc-sub">
              Customized courier workflows designed to meet strict regulatory and delivery standards.
            </p>
            <div className="section-header-line" />
          </div>

          <div className="industry-tabs-bar">
            <button
              type="button"
              className={`ind-tab-btn ${industryTab === 'auto' ? 'active' : ''}`}
              onClick={() => setIndustryTab('auto')}
            >
              <Car size={16} />
              <span>Automotive & Parts</span>
            </button>
            <button
              type="button"
              className={`ind-tab-btn ${industryTab === 'medical' ? 'active' : ''}`}
              onClick={() => setIndustryTab('medical')}
            >
              <ShieldCheck size={16} />
              <span>Healthcare & Pharma</span>
            </button>
            <button
              type="button"
              className={`ind-tab-btn ${industryTab === 'ecommerce' ? 'active' : ''}`}
              onClick={() => setIndustryTab('ecommerce')}
            >
              <Package size={16} />
              <span>E-Commerce & Retail</span>
            </button>
            <button
              type="button"
              className={`ind-tab-btn ${industryTab === 'tech' ? 'active' : ''}`}
              onClick={() => setIndustryTab('tech')}
            >
              <Zap size={16} />
              <span>Technology & Industrial</span>
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="industry-content-card animate-fade-in">
            {industryTab === 'auto' && (
              <div className="industry-tab-grid">
                <div className="ind-text-col">
                  <h3>Precision Automotive & Vehicle Hauling</h3>
                  <p>
                    From bumper-to-bumper commercial parts to full vehicle carriers, we provide VIN barcode tracking, condition assessment logs, and direct dealership distribution.
                  </p>
                  <ul className="ind-feature-list">
                    <li><CheckCircle2 size={16} className="text-emerald" /> 17-digit VIN barcode inspection at pickup & dock tender</li>
                    <li><CheckCircle2 size={16} className="text-emerald" /> Enclosed & open multi-car carrier dispatch schedules</li>
                    <li><CheckCircle2 size={16} className="text-emerald" /> Expedited same-day dealership emergency part runs</li>
                  </ul>
                  <button className="btn-corp-primary mt-4" onClick={() => onNavigate('services')}>
                    Explore Automotive Solutions
                  </button>
                </div>
                <div className="ind-img-col">
                  <img src="/images/home/automotive-parts.jpg" alt="Automotive Parts Logistics" className="ind-showcase-img" />
                </div>
              </div>
            )}

            {industryTab === 'medical' && (
              <div className="industry-tab-grid">
                <div className="ind-text-col">
                  <h3>Certified Medical & Life Science Courier</h3>
                  <p>
                    Time-critical healthcare logistics requiring uncompromised chain of custody, tamper-evident security sealing, and priority airport connection.
                  </p>
                  <ul className="ind-feature-list">
                    <li><CheckCircle2 size={16} className="text-emerald" /> Dedicated courier hand-to-hand specimen transport</li>
                    <li><CheckCircle2 size={16} className="text-emerald" /> Hospital dock priority check-in & signed receiver sign-off</li>
                    <li><CheckCircle2 size={16} className="text-emerald" /> Temperature-sensitive package monitoring</li>
                  </ul>
                  <button className="btn-corp-primary mt-4" onClick={() => onNavigate('services')}>
                    Explore Healthcare Solutions
                  </button>
                </div>
                <div className="ind-img-col">
                  <img src="/images/home/healthcare-pharma.jpg" alt="Healthcare & Life Science Logistics" className="ind-showcase-img" />
                </div>
              </div>
            )}

            {industryTab === 'ecommerce' && (
              <div className="industry-tab-grid">
                <div className="ind-text-col">
                  <h3>High-Velocity E-Commerce Fulfillment</h3>
                  <p>
                    Accelerate your brand’s customer satisfaction with scheduled linehaul routes between fulfillment centers and final-mile regional sort hubs.
                  </p>
                  <ul className="ind-feature-list">
                    <li><CheckCircle2 size={16} className="text-emerald" /> High-density Code 128 piece barcodes on every carton</li>
                    <li><CheckCircle2 size={16} className="text-emerald" /> Automated batch multi-consignment manifest integration</li>
                    <li><CheckCircle2 size={16} className="text-emerald" /> Transparent 99.4% on-time interstate linehaul network</li>
                  </ul>
                  <button className="btn-corp-primary mt-4" onClick={() => onNavigate('quote')}>
                    Get E-Commerce Volume Rates
                  </button>
                </div>
                <div className="ind-img-col">
                  <img src="/images/home/ecommerce-retail.jpg" alt="E-Commerce Fulfillment & Dispatch" className="ind-showcase-img" />
                </div>
              </div>
            )}

            {industryTab === 'tech' && (
              <div className="industry-tab-grid">
                <div className="ind-text-col">
                  <h3>Mission-Critical Technology & Hardware</h3>
                  <p>
                    Secure transport of enterprise server racks, microelectronics, aerospace components, and sensitive machinery with full insurance coverage.
                  </p>
                  <ul className="ind-feature-list">
                    <li><CheckCircle2 size={16} className="text-emerald" /> Air-ride suspension trucks with hydraulic liftgate tender</li>
                    <li><CheckCircle2 size={16} className="text-emerald" /> Dual-driver continuous security escort available</li>
                    <li><CheckCircle2 size={16} className="text-emerald" /> Direct data center dock delivery clearance</li>
                  </ul>
                  <button className="btn-corp-primary mt-4" onClick={() => onNavigate('ship')}>
                    Book Technology Tender
                  </button>
                </div>
                <div className="ind-img-col">
                  <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop&q=80" alt="Enterprise Data & Precision Tech Transport" className="ind-showcase-img" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. REGIONAL GATEWAY HUBS & U.S. TRADE CORRIDORS MAP (INTERACTIVE RADAR)
          ========================================================================= */}
      <section className="corp-hubs-map-section">
        <div className="dxp-container-wide">
          <div className="hubs-map-header">
            <div>
              <span className="section-eyebrow text-orange">NATIONWIDE INTERMODAL HUBS</span>
              <h2>Active U.S. Trade Gateways & Sort Facilities</h2>
            </div>
            <div className="hubs-selector-pills">
              {(['ORD', 'JFK', 'DFW', 'DEN', 'LAX'] as const).map((hubCode) => (
                <button
                  key={hubCode}
                  type="button"
                  className={`hub-pill-btn ${activeHub === hubCode ? 'active' : ''}`}
                  onClick={() => setActiveHub(hubCode)}
                >
                  <MapPin size={13} />
                  <span>{hubCode} Hub</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hubs-preview-grid">
            <div className="hub-info-card">
              <div className="hub-status-strip">
                <span className="hub-dot-pulse" />
                <strong>
                  {activeHub === 'ORD' && 'Chicago Regional Gateway (ORD-03)'}
                  {activeHub === 'JFK' && 'New York International Terminal (JFK-01)'}
                  {activeHub === 'DFW' && 'Dallas Intermodal Gateway (DFW-04)'}
                  {activeHub === 'DEN' && 'Denver Mountain Regional Hub (DEN-05)'}
                  {activeHub === 'LAX' && 'Los Angeles Pacific Gateway (LAX-06)'}
                </strong>
                <span className="status-badge-live">ONLINE & SORTING</span>
              </div>

              <div className="hub-metrics-grid-2x2">
                <div className="hm-box">
                  <small>DAILY LINEHAUL DEPARTURES</small>
                  <strong>142 Trucks/Day</strong>
                </div>
                <div className="hm-box">
                  <small>SORT CAPACITY</small>
                  <strong>48,000 Pcs/Hour</strong>
                </div>
                <div className="hm-box">
                  <small>AVERAGE DWELL TIME</small>
                  <strong>1.4 Hours</strong>
                </div>
                <div className="hm-box">
                  <small>ON-TIME DISPATCH</small>
                  <strong className="text-emerald">99.6%</strong>
                </div>
              </div>

              <p className="hub-description-text">
                Primary consolidation point connecting eastern manufacturing corridors with Midwest and Western interstate trade arteries. Equipped with automated high-speed linear laser sorting and climate-controlled cross-dock bays.
              </p>

              <button
                type="button"
                className="btn-why-readmore"
                onClick={() => onNavigate('track')}
              >
                <span>Inspect Active Corridors</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Interactive Leaflet Gateway Map */}
            <HomeNetworkMap activeHub={activeHub} onSelectHub={(hub) => setActiveHub(hub)} />
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. "YOUR CARGO IS SAFE WITH US" (8-POINT TRUST PILLARS GRID)
          ========================================================================= */}
      <section className="corp-trust-matrix-section">
        <div className="dxp-container-wide">
          <div className="section-center-header">
            <span className="section-eyebrow">GUARANTEED SECURITY</span>
            <h2>Your cargo is safe with us</h2>
            <p className="section-desc-sub">
              Every shipment is backed by institutional security protocols, FMCSA carrier registration, and PII protection.
            </p>
            <div className="section-header-line" />
          </div>

          <div className="trust-matrix-grid">
            <div className="trust-pillar-card">
              <div className="trust-pillar-icon"><ShieldCheck size={22} className="text-orange" /></div>
              <div>
                <h4>Integrity Guarantee</h4>
                <p>Strict chain-of-custody verification at every transit checkpoint.</p>
              </div>
            </div>

            <div className="trust-pillar-card">
              <div className="trust-pillar-icon"><Clock size={22} className="text-orange" /></div>
              <div>
                <h4>Precise Time Schedules</h4>
                <p>Dynamic ETA routing calculated on live trade corridor conditions.</p>
              </div>
            </div>

            <div className="trust-pillar-card">
              <div className="trust-pillar-icon"><Users size={22} className="text-orange" /></div>
              <div>
                <h4>Vetted Professional Drivers</h4>
                <p>FMCSA-certified commercial drivers with background validation.</p>
              </div>
            </div>

            <div className="trust-pillar-card">
              <div className="trust-pillar-icon"><Lock size={22} className="text-orange" /></div>
              <div>
                <h4>PII Privacy Protection</h4>
                <p>Automated masking of personal contact info on public tracking.</p>
              </div>
            </div>

            <div className="trust-pillar-card">
              <div className="trust-pillar-icon"><Award size={22} className="text-orange" /></div>
              <div>
                <h4>Certified Quality Standards</h4>
                <p>USDOT registered commercial carrier authority #3894210.</p>
              </div>
            </div>

            <div className="trust-pillar-card">
              <div className="trust-pillar-icon"><FileText size={22} className="text-orange" /></div>
              <div>
                <h4>Digital Bills of Lading</h4>
                <p>Instant regulatory BOL, Waybills, and signed POD receipts.</p>
              </div>
            </div>

            <div className="trust-pillar-card">
              <div className="trust-pillar-icon"><Sparkles size={22} className="text-orange" /></div>
              <div>
                <h4>Linear Code 128 Barcodes</h4>
                <p>High-density optical symbology for tamper-proof piece tracking.</p>
              </div>
            </div>

            <div className="trust-pillar-card">
              <div className="trust-pillar-icon"><Headphones size={22} className="text-orange" /></div>
              <div>
                <h4>24/7 Dedicated Support</h4>
                <p>Live human dispatch assistance with instant shipment lookup.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. LINEAR CODE 128 BARCODE SPOTLIGHT (THERMAL SHIPPING LABEL)
          ========================================================================= */}
      <section className="corp-barcode-spotlight-section">
        <div className="dxp-container-wide barcode-spotlight-grid">
          <div className="barcode-text-col">
            <span className="section-eyebrow text-orange">PROVENANCE TECHNOLOGY</span>
            <h2>High-Density Linear Code 128 Barcode Symbology</h2>
            <p>
              Unlike generic QR codes that fail in industrial dock environments, Duolingo Express utilizes standardized high-density linear Code 128 barcodes across all parcel cartons, auto VIN passes, and Bills of Lading.
            </p>
            <div className="barcode-specs-row">
              <div className="b-spec">
                <strong>0.001s</strong>
                <small>Laser Scan Velocity</small>
              </div>
              <div className="b-spec">
                <strong>100%</strong>
                <small>Physical Provenance</small>
              </div>
              <div className="b-spec">
                <strong>Zero</strong>
                <small>QR Code Failures</small>
              </div>
            </div>
          </div>

          <div className="barcode-visual-col">
            <div className="thermal-label-card">
              <div className="thermal-perforation-top" />
              <div className="thermal-header-strip">
                <div>
                  <strong className="thermal-brand font-mono">DUOLINGO EXPRESS CARRIER LABEL</strong>
                  <span className="thermal-fmcsa font-mono">{dotNumber} · STANDARD MASTER WAYBILL</span>
                </div>
                <span className="thermal-badge font-mono">PRIORITY AIR/GROUND</span>
              </div>

              <div className="thermal-body-grid font-mono">
                <div className="th-cell">
                  <small>ORIGIN HUB</small>
                  <strong>JFK-01 (NEW YORK)</strong>
                </div>
                <div className="th-cell">
                  <small>DESTINATION GATEWAY</small>
                  <strong>LAX-06 (LOS ANGELES)</strong>
                </div>
                <div className="th-cell">
                  <small>WEIGHT & CLASS</small>
                  <strong>45.0 LBS · CLASS 70</strong>
                </div>
                <div className="th-cell">
                  <small>DEPARTURE DISPATCH</small>
                  <strong>LINEHAUL #842</strong>
                </div>
              </div>

              <div className="bc-canvas-wrap-thermal">
                <div className="laser-sweep-line" />
                <Barcode value="DXP-2026-7K2M9QRX" width={2.2} height={68} />
              </div>

              <div className="thermal-footer font-mono">
                <span>CONSIGNMENT ID: DXP-2026-7K2M9QRX</span>
                <span>PIECE 01/01 · VERIFIED LEDGER</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. WHAT OUR CLIENTS SAY (TESTIMONIAL CAROUSEL)
          ========================================================================= */}
      <section className="corp-testimonial-section">
        <div className="dxp-container">
          <div className="testimonial-wrapper">
            <div className="testimonial-card-frame">
              <div className="quote-mark-icon">“</div>
              <div className="testimonial-top-row">
                <div className="flex gap-1 text-orange">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="#f97316" color="#f97316" />
                  ))}
                </div>
                <span className="verified-client-badge font-mono">
                  <CheckCircle2 size={12} className="text-emerald" />
                  VERIFIED ENTERPRISE SHIPPER
                </span>
              </div>

              <p className="testimonial-quote-text">
                {testimonials[activeTestimonial].quote}
              </p>

              <div className="testimonial-author-row">
                <div className="author-profile">
                  <img
                    src={testimonials[activeTestimonial].avatar}
                    alt={testimonials[activeTestimonial].author}
                    className="author-avatar-img"
                  />
                  <div>
                    <h4 className="author-name">{testimonials[activeTestimonial].author}</h4>
                    <p className="author-role">{testimonials[activeTestimonial].role}</p>
                    <small className="author-company">{testimonials[activeTestimonial].company}</small>
                  </div>
                </div>

                {/* Slider Navigation Arrows */}
                <div className="testimonial-controls">
                  <button
                    type="button"
                    className="btn-slider-arrow"
                    onClick={prevTestimonial}
                    aria-label="Previous Testimonial"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className="btn-slider-arrow"
                    onClick={nextTestimonial}
                    aria-label="Next Testimonial"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          11. TRUSTED BY NATIONWIDE COMMERCIAL SHIPPERS (PURE LOGO MARQUEE)
          ========================================================================= */}
      <section className="corp-partners-strip">
        <div className="dxp-container-wide">
          <div className="partners-label">TRUSTED BY NATIONWIDE ENTERPRISES & COMMERCIAL SHIPPERS</div>
          <div className="partners-marquee-container">
            <div className="partners-marquee-fade left" />
            <div className="partners-marquee-track">
              {CLIENT_LOGOS.concat(CLIENT_LOGOS).map((client, idx) => (
                <div key={idx} className="partner-marquee-card">
                  <div className="partner-logo-svg-wrap">{client.svg}</div>
                </div>
              ))}
            </div>
            <div className="partners-marquee-fade right" />
          </div>
        </div>
      </section>

      {/* =========================================================================
          12. INSTANT DISPATCH CALLBACK BANNER
          ========================================================================= */}
      <section className="corp-callback-banner">
        <div className="callback-banner-overlay" />
        <div className="dxp-container callback-inner">
          <div className="callback-text-block">
            <h3>Need urgent linehaul dispatch or custom rate consultation?</h3>
            <p>Enter your details and our senior logistics coordinator will call you within 15 minutes.</p>
          </div>

          {cbSuccess ? (
            <div className="callback-success-alert animate-fade-in">
              <CheckCircle2 size={24} className="text-emerald" />
              <div>
                <strong>Callback Request Received!</strong>
                <p>Our priority dispatch desk is connecting with you now.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCallbackSubmit} className="callback-form-row">
              <input
                type="text"
                placeholder="Your Full Name"
                value={cbName}
                onChange={(e) => setCbName(e.target.value)}
                className="cb-input"
                required
              />

              <select
                value={cbService}
                onChange={(e) => setCbService(e.target.value)}
                className="cb-select"
              >
                <option value="Priority Express Courier">Priority Express Courier</option>
                <option value="Regional Scheduled Linehaul">Regional Scheduled Linehaul</option>
                <option value="Auto & Vehicle Transport">Auto & Vehicle Transport</option>
                <option value="Medical / Fragile Cargo">Medical / Fragile Cargo</option>
              </select>

              <input
                type="tel"
                placeholder="Phone Number (e.g. 555-0199)"
                value={cbPhone}
                onChange={(e) => setCbPhone(e.target.value)}
                className="cb-input"
                required
              />

              <button type="submit" className="btn-callback-submit">
                <span>Request Call</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </section>

      {/* =========================================================================
          13. FREQUENTLY ASKED QUESTIONS (ACCORDION)
          ========================================================================= */}
      <section className="corp-faq-section">
        <div className="dxp-container">
          <div className="section-center-header">
            <span className="section-eyebrow">COMMON QUESTIONS</span>
            <h2>Frequently Asked Questions</h2>
            <div className="section-header-line" />
          </div>

          <div className="faq-accordion-list">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className={`faq-item-card ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="faq-question-toggle"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} className="text-orange" /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen && (
                    <div className="faq-answer-pane animate-fade-in">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
