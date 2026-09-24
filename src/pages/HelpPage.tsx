import React, { useState, useMemo } from 'react';
import {
  Search,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  ShieldCheck,
  Phone,
  Mail,
  FileText,
  Truck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  LifeBuoy,
  Layers,
  Send,
  Sparkles
} from 'lucide-react';
import { useAdminData } from '../context/AdminDataContext';
import './HelpPage.css';

interface HelpPageProps {
  onNavigate: (page: string) => void;
}

interface FaqItem {
  id: string;
  category: 'tracking' | 'tenders' | 'delivery' | 'exceptions';
  question: string;
  answer: string;
  badge?: string;
}

export const HelpPage: React.FC<HelpPageProps> = ({ onNavigate }) => {
  const { settings } = useAdminData();
  const supportPhone = settings.supportPhone || '1-800-555-0199';
  const supportPhoneDigits = supportPhone.replace(/[^0-9+]/g, '');
  const dotNumber = settings.dotNumber || 'USDOT #3894210 · MC-892401';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>('trk-1');

  const faqs: FaqItem[] = [
    {
      id: 'trk-1',
      category: 'tracking',
      question: 'How do I locate and track an active consignment?',
      answer: 'Enter your 16-character tracking identifier (e.g. DXP-2026-7K2M9QRX or DXP-7K2M9QRX) in the search bar on our Track page. You will immediately access verified checkpoint scan events, regional hub transfers, and live interstate telemetry.',
      badge: 'Core Telemetry'
    },
    {
      id: 'trk-2',
      category: 'tracking',
      question: 'What are piece-level child barcodes (Code 128)?',
      answer: 'For multi-piece shipments, each individual carton receives its own serialized Code 128 child barcode (e.g. DXP-7K2M9QRX-01, -02). This ensures that every individual piece is independently scanned and accounted for at every intake gateway.',
      badge: 'Multi-Piece'
    },
    {
      id: 'trk-3',
      category: 'tracking',
      question: 'How often does highway tracking telemetry update?',
      answer: 'Our long-haul transit network updates telemetry continuously as vehicles pass through weigh stations, regional toll points, and facility gateway checkpoints. In the tracking dashboard, you can monitor milestone progression in real time.',
      badge: 'Real-Time'
    },
    {
      id: 'tnd-1',
      category: 'tenders',
      question: 'What is the cutoff window for scheduling same-day courier pickup?',
      answer: 'For same-day commercial pickup, requests must be tendered by 3:00 PM local dispatch time. After 3:00 PM, pickups are scheduled for the next morning priority window (8:00 AM – 12:00 PM).',
      badge: 'SLA Window'
    },
    {
      id: 'tnd-2',
      category: 'tenders',
      question: 'Can I tender packages directly at a logistics gateway hub?',
      answer: 'Yes. You can select "Drop Off at Gateway Hub" on our Ship page and bring packaged consignments directly to any of our designated intake bays across New York, Chicago, Dallas, and Los Angeles.',
      badge: 'Hub Intake'
    },
    {
      id: 'tnd-3',
      category: 'tenders',
      question: 'What services do you provide for motor vehicles and high-value items?',
      answer: 'We offer specialized Auto & Vehicle Transport (open-deck or enclosed car carrier transit) and Time-Critical Secure Vault courier services featuring armored transport with dual-custody oversight.',
      badge: 'Specialized'
    },
    {
      id: 'dlv-1',
      category: 'delivery',
      question: 'How is digital proof of delivery (POD) captured?',
      answer: 'Upon delivery, our courier captures an adult recipient physical signature, printed name, and atomic timestamp. These records are archived directly into the master ledger and transmitted to the consignor.',
      badge: 'POD Verification'
    },
    {
      id: 'dlv-2',
      category: 'delivery',
      question: 'Who issues official shipping documentation like the Bill of Lading (BOL)?',
      answer: 'All official shipping labels, Bills of Lading, and invoices are certified and issued directly by the agency and dispatch coordinators. They are delivered via secure email or direct communications.',
      badge: 'Agency Direct'
    },
    {
      id: 'dlv-3',
      category: 'delivery',
      question: 'Can I request Saturday or after-hours delivery?',
      answer: 'Yes. Saturday Expedited Delivery and after-hours commercial dock handovers can be selected during the booking process on our Ship page or requested directly from our central operations desk.',
      badge: 'Weekend Dispatch'
    },
    {
      id: 'exc-1',
      category: 'exceptions',
      question: 'What happens if severe weather or a highway corridor delay occurs?',
      answer: 'If severe weather or interstate traffic causes a detour, our automated dispatch system immediately recalculates transit timelines and updates the ETA on your tracking timeline. The dispatch desk is notified automatically.',
      badge: 'Delays & Reroutes'
    },
    {
      id: 'exc-2',
      category: 'exceptions',
      question: 'How do I request an in-transit address correction or terminal hold?',
      answer: `Authorized senders or consignees can call our 24/7 central dispatch hotline at ${supportPhone} with the master tracking ID to hold the consignment at a regional gateway before final delivery.`,
      badge: 'Urgent Hold'
    },
    {
      id: 'exc-3',
      category: 'exceptions',
      question: 'How do I file a formal inquiry or claims report?',
      answer: 'To file an inquiry, navigate to our Contact page, select "Delivery Exception" or "Claims", provide your tracking number and details, and our dispatch team will investigate with an initial response under 30 minutes.',
      badge: 'Claims Support'
    }
  ];

  // Filtered FAQs based on category & search query
  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
      const matchesSearch = searchQuery.trim() === '' ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (faq.badge && faq.badge.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [faqs, activeCategory, searchQuery]);

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  return (
    <div className="dxp-page-help">
      {/* =========================================================================
          1. CINEMATIC HERO SECTION
          ========================================================================= */}
      <section className="dxp-help-hero">
        <div className="help-hero-bg-overlay" />
        <div className="dxp-container-wide help-hero-inner">
          <div className="help-hero-pill animate-fade-in">
            <span className="help-pulse-dot" />
            <span>{dotNumber} · 24/7 CLIENT OPERATIONS DESK</span>
          </div>

          <h1 className="help-hero-title animate-fade-in">
            How Can Our Operations Team <span className="help-highlight-orange">Assist You Today?</span>
          </h1>

          <p className="help-hero-lead animate-fade-in">
            Browse verified operational guidelines, learn how our piece-level barcode tracking operates, or connect directly with 24/7 dispatch supervisors.
          </p>

          {/* Interactive Hero Search Input */}
          <div className="help-search-container animate-fade-in">
            <div className="help-search-input-wrap">
              <Search size={20} className="help-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, tracking questions, delivery terms, or claims..."
                className="help-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="help-search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. NETWORK OPERATIONAL STATUS BAR
          ========================================================================= */}
      <section className="dxp-help-network-strip">
        <div className="dxp-container-wide">
          <div className="network-strip-inner">
            <div className="network-status-label">
              <span className="live-radar-dot" />
              <strong>INTERSTATE LOGISTICS NETWORK STATUS:</strong>
            </div>
            <div className="network-nodes-grid">
              <div className="node-item">
                <span className="node-code font-mono">JFK GATEWAY</span>
                <span className="node-status text-emerald">● OPTIMAL</span>
              </div>
              <div className="node-item">
                <span className="node-code font-mono">ORD MIDWEST</span>
                <span className="node-status text-emerald">● OPTIMAL</span>
              </div>
              <div className="node-item">
                <span className="node-code font-mono">DFW CORRIDOR</span>
                <span className="node-status text-emerald">● OPTIMAL</span>
              </div>
              <div className="node-item">
                <span className="node-code font-mono">LAX PACIFIC</span>
                <span className="node-status text-emerald">● OPTIMAL</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. CORE ASSISTANCE PILLARS
          ========================================================================= */}
      <div className="dxp-container-wide dxp-help-body">
        <div className="help-pillars-grid">
          <div className="help-pillar-card" onClick={() => onNavigate('track')}>
            <div className="pillar-icon icon-orange"><MapPin size={24} /></div>
            <h3>Track a Consignment</h3>
            <p>Monitor live 60 FPS highway telemetry and verified scan milestones across all regional intake gateways.</p>
            <span className="pillar-action-link">Open Tracking Radar <ArrowRight size={15} /></span>
          </div>

          <div className="help-pillar-card" onClick={() => onNavigate('ship')}>
            <div className="pillar-icon icon-emerald"><Truck size={24} /></div>
            <h3>Book & Tender Pickup</h3>
            <p>Schedule time-definite courier pickups or generate a consignment barcode for gateway hub drop-off.</p>
            <span className="pillar-action-link">Schedule Tender <ArrowRight size={15} /></span>
          </div>

          <div className="help-pillar-card" onClick={() => onNavigate('quote')}>
            <div className="pillar-icon icon-sky"><FileText size={24} /></div>
            <h3>Request Official Tariff</h3>
            <p>Submit scale weight and route parameters for custom certified rate review by our central tariff desk.</p>
            <span className="pillar-action-link">Calculate Rates <ArrowRight size={15} /></span>
          </div>

          <div className="help-pillar-card" onClick={() => onNavigate('contact')}>
            <div className="pillar-icon icon-amber"><Phone size={24} /></div>
            <h3>24/7 Operations Desk</h3>
            <p>Connect immediately with regional dispatch supervisors for urgent in-transit delivery holds or reroutes.</p>
            <span className="pillar-action-link">Contact Dispatch <ArrowRight size={15} /></span>
          </div>
        </div>

        {/* =========================================================================
            4. KNOWLEDGE BASE ACCORDION & TOPIC FILTER
            ========================================================================= */}
        <section className="dxp-help-faq-section">
          <div className="section-center-header">
            <span className="section-eyebrow">FREQUENTLY ASKED QUESTIONS</span>
            <h2>Operational Knowledge Base</h2>
            <p className="section-desc-sub">Select a category below or use the search bar above to quickly resolve questions.</p>
            <div className="section-header-line" />
          </div>

          {/* Category Filter Pills */}
          <div className="faq-category-pills">
            <button
              type="button"
              className={`cat-pill ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              All Topics ({faqs.length})
            </button>
            <button
              type="button"
              className={`cat-pill ${activeCategory === 'tracking' ? 'active' : ''}`}
              onClick={() => setActiveCategory('tracking')}
            >
              Tracking & Barcodes
            </button>
            <button
              type="button"
              className={`cat-pill ${activeCategory === 'tenders' ? 'active' : ''}`}
              onClick={() => setActiveCategory('tenders')}
            >
              Courier Tenders
            </button>
            <button
              type="button"
              className={`cat-pill ${activeCategory === 'delivery' ? 'active' : ''}`}
              onClick={() => setActiveCategory('delivery')}
            >
              Delivery & POD
            </button>
            <button
              type="button"
              className={`cat-pill ${activeCategory === 'exceptions' ? 'active' : ''}`}
              onClick={() => setActiveCategory('exceptions')}
            >
              Exceptions & Claims
            </button>
          </div>

          {/* FAQs List */}
          <div className="help-faq-accordion">
            {filteredFaqs.length === 0 ? (
              <div className="help-empty-search">
                <AlertTriangle size={36} className="text-amber" />
                <h3>No Matching Knowledge Topics Found</h3>
                <p>We couldn't find any articles matching "{searchQuery}". Try searching with different keywords or contact our operations desk directly.</p>
                <button
                  type="button"
                  className="btn-corp-ghost"
                  onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                >
                  Reset Search Filter
                </button>
              </div>
            ) : (
              filteredFaqs.map((faq) => (
                <div
                  key={faq.id}
                  className={`help-faq-item ${openFaqId === faq.id ? 'active' : ''}`}
                >
                  <button
                    type="button"
                    className="help-faq-header-btn"
                    onClick={() => toggleFaq(faq.id)}
                  >
                    <div className="faq-q-text">
                      <HelpCircle size={18} className="text-orange flex-shrink-0" />
                      <span>{faq.question}</span>
                      {faq.badge && (
                        <span className="faq-topic-badge font-mono">{faq.badge}</span>
                      )}
                    </div>
                    {openFaqId === faq.id ? (
                      <ChevronUp size={18} className="text-orange flex-shrink-0" />
                    ) : (
                      <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />
                    )}
                  </button>

                  {openFaqId === faq.id && (
                    <div className="help-faq-body animate-fade-in">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* =========================================================================
            5. NEED IMMEDIATE ASSISTANCE CALLOUT
            ========================================================================= */}
        <section className="dxp-help-cta-box">
          <div className="help-cta-content">
            <div className="help-cta-badge font-mono">24/7 CENTRAL DISPATCH DESK</div>
            <h2>Still need assistance with an active consignment?</h2>
            <p>Our logistics coordinators and interstate dispatchers are on duty 24 hours a day, 7 days a week.</p>
            <div className="help-cta-buttons">
              <button
                type="button"
                className="btn-corp-primary"
                onClick={() => onNavigate('contact')}
              >
                <Send size={16} />
                <span>Submit Dispatch Ticket</span>
              </button>
              <a
                href={`tel:${supportPhoneDigits}`}
                className="btn-corp-ghost"
              >
                <Phone size={16} />
                <span>Call {supportPhone}</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
