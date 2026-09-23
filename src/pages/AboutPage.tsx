import React from 'react';
import {
  ShieldCheck,
  Eye,
  Clock,
  ArrowRight,
  Truck,
  Package,
  CheckCircle2,
  Lock,
  Zap,
  Award,
  BarChart3,
  Building2,
  Users,
  Car,
  Headphones,
  Phone,
  FileCheck,
  Compass
} from 'lucide-react';
import './AboutPage.css';

interface AboutPageProps {
  onNavigate: (page: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <div className="dxp-page-about">
      {/* =========================================================================
          1. CINEMATIC EXECUTIVE HERO SECTION
          ========================================================================= */}
      <section className="about-hero-section">
        <div className="about-hero-overlay" />
        <div className="dxp-container-wide about-hero-inner">
            <div className="about-hero-badge animate-fade-in">
              <span className="about-badge-dot" />
              <span>USDOT #3894210 · MC-882104 · AUTHORIZED U.S. MOTOR CARRIER</span>
            </div>

          <h1 className="about-hero-title animate-fade-in">
            Pioneering Speed, Precision, & Integrity in <span className="about-highlight-orange">American Courier Logistics.</span>
          </h1>

          <p className="about-hero-lead animate-fade-in">
            Duolingo Express was founded on a singular principle: commercial shippers deserve authentic, real-time visibility and guaranteed point-to-point courier execution across nationwide trade corridors.
          </p>

          <div className="about-hero-credentials animate-fade-in">
            <div className="cred-badge">
              <ShieldCheck size={16} className="text-orange" />
              <span>USDOT #3894210 Verified</span>
            </div>
            <div className="cred-divider" />
            <div className="cred-badge">
              <FileCheck size={16} className="text-emerald" />
              <span>FMCSA Carrier #MC-948201</span>
            </div>
            <div className="cred-divider" />
            <div className="cred-badge">
              <Lock size={16} className="text-sky" />
              <span>$1,000,000 Cargo Liability Insured</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. KEY PERFORMANCE INDICATORS (KPI STRIP)
          ========================================================================= */}
      <section className="about-stats-section">
        <div className="dxp-container-wide">
          <div className="about-stats-grid">
            <div className="about-stat-card">
              <span className="stat-value font-mono">99.4%</span>
              <strong className="stat-title">On-Time Transit Velocity</strong>
              <p className="stat-subtitle">Across all scheduled linehaul corridors and priority dispatches.</p>
            </div>

            <div className="about-stat-card">
              <span className="stat-value font-mono">50+</span>
              <strong className="stat-title">Regional Distribution Hubs</strong>
              <p className="stat-subtitle">Connecting primary metropolitan markets coast-to-coast.</p>
            </div>

            <div className="about-stat-card">
              <span className="stat-value font-mono">100%</span>
              <strong className="stat-title">Chain of Custody Provenance</strong>
              <p className="stat-subtitle">Every piece audited with linear Code 128 scans and schedule-based position telemetry.</p>
            </div>

            <div className="about-stat-card">
              <span className="stat-value font-mono">24/7/365</span>
              <strong className="stat-title">Dedicated Human Dispatch</strong>
              <p className="stat-subtitle">Direct telephone access to experienced logistics coordinators.</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. OUR MISSION & CORE OPERATING PRINCIPLES
          ========================================================================= */}
      <section className="about-story-section">
        <div className="dxp-container-wide">
          <div className="about-story-grid">
            <div className="about-story-content">
              <span className="section-eyebrow">THE DUOLINGO EXPRESS STANDARD</span>
              <h2>Moving What Matters with Authentic Transparency</h2>
              <p className="lead-p">
                Traditional shipping providers often leave commercial clients stranded between fragmented handoffs, unresponsive call centers, and opaque status updates.
              </p>
              <p>
                At <strong>Duolingo Express</strong>, we engineered our courier network around a zero-compromise chain-of-custody model. From initial dock tender to recipient handoff, every milestone is time-verified, barcode-audited, and managed by dedicated dispatch professionals who know your cargo by name.
              </p>

              <div className="about-pillars-grid">
                <div className="pillar-item">
                  <div className="pillar-icon-box orange">
                    <Eye size={22} />
                  </div>
                  <div>
                    <h4>Milestone Provenance</h4>
                    <p>Accurate timestamps, scan operator IDs, and physical facility checkpoints logged at every step.</p>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-icon-box emerald">
                    <Compass size={22} />
                  </div>
                  <div>
                    <h4>Point-to-Point Routing</h4>
                    <p>Optimized highway corridors minimize unnecessary hub sorting, reducing damage and transit lag.</p>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-icon-box sky">
                    <Lock size={22} />
                  </div>
                  <div>
                    <h4>Secure Custody Controls</h4>
                    <p>High-security linear Code 128 piece barcoding, tamper-evident seals, and signed digital PODs.</p>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-icon-box navy">
                    <Headphones size={22} />
                  </div>
                  <div>
                    <h4>24/7 Proactive Support</h4>
                    <p>Direct line to live logistics coordinators who proactively monitor weather, traffic, and arrival windows.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="about-visual-column">
              <div className="about-visual-card">
                <img
                  src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=1000&auto=format&fit=crop&q=80"
                  alt="Duolingo Express Gateway Cross-Dock Operations"
                  className="about-terminal-img"
                />
                <div className="about-floating-badge">
                  <div className="floating-badge-header">
                    <span className="live-pulse-dot" />
                    <span className="font-mono text-xs font-bold text-white">CENTRAL OPERATIONS CENTER</span>
                  </div>
                  <h4>Continuous Nationwide Dispatch</h4>
                  <p>Coordinating over 1,400 daily linehaul and express courier routes nationwide.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. OUR 4 SPECIALIZED TRANSPORT DIVISIONS
          ========================================================================= */}
      <section className="about-divisions-section">
        <div className="dxp-container-wide">
          <div className="section-center-header">
            <span className="section-eyebrow">SPECIALIZED CAPABILITIES</span>
            <h2>Our Core Courier & Transportation Divisions</h2>
            <p className="section-desc-sub">
              Precision ground and express transportation services engineered for commercial enterprise shippers.
            </p>
            <div className="section-header-line" />
          </div>

          <div className="about-divisions-grid">
            {/* Division 1 */}
            <div className="division-card">
              <div className="division-icon-wrap orange">
                <Zap size={26} />
              </div>
              <h3>Priority Express Courier</h3>
              <p>
                Point-to-point same-day and next-day courier delivery for urgent parcels, legal contracts, laboratory specimens, and mission-critical tenders.
              </p>
              <ul className="division-specs">
                <li><CheckCircle2 size={15} className="text-emerald" /> Guaranteed Cutoff & Arrival Times</li>
                <li><CheckCircle2 size={15} className="text-emerald" /> Direct Hand-to-Hand Recipient Signature</li>
                <li><CheckCircle2 size={15} className="text-emerald" /> Continuous Driver Telemetry</li>
              </ul>
            </div>

            {/* Division 2 */}
            <div className="division-card">
              <div className="division-icon-wrap emerald">
                <Truck size={26} />
              </div>
              <h3>Scheduled Commercial Linehaul</h3>
              <p>
                Fixed-departure interstate linehaul relays connecting regional sortation hubs and distribution centers with strict transit predictability.
              </p>
              <ul className="division-specs">
                <li><CheckCircle2 size={15} className="text-emerald" /> Coast-to-Coast Dedicated Corridors</li>
                <li><CheckCircle2 size={15} className="text-emerald" /> Team-Driven Expedited Highway Transit</li>
                <li><CheckCircle2 size={15} className="text-emerald" /> Piece-Level Code 128 Scan Ingest</li>
              </ul>
            </div>

            {/* Division 3 */}
            <div className="division-card">
              <div className="division-icon-wrap sky">
                <Car size={26} />
              </div>
              <h3>Auto & Vehicle Transport</h3>
              <p>
                Specialized open and enclosed vehicle logistics for dealerships, corporate fleets, and private luxury automobile relocations across all 48 states.
              </p>
              <ul className="division-specs">
                <li><CheckCircle2 size={15} className="text-emerald" /> Enclosed Soft-Tie Luxury Carriers</li>
                <li><CheckCircle2 size={15} className="text-emerald" /> Comprehensive Condition Reports</li>
                <li><CheckCircle2 size={15} className="text-emerald" /> Full Auto In-Transit Valuation Coverage</li>
              </ul>
            </div>

            {/* Division 4 */}
            <div className="division-card">
              <div className="division-icon-wrap navy">
                <Package size={26} />
              </div>
              <h3>Time-Critical Secure Vault</h3>
              <p>
                Climate-controlled, high-security parcel transit with chain-of-custody protocols for sensitive medical reagents, electronics, and luxury goods.
              </p>
              <ul className="division-specs">
                <li><CheckCircle2 size={15} className="text-emerald" /> Validated Temperature Loggers (2°C–8°C)</li>
                <li><CheckCircle2 size={15} className="text-emerald" /> Tamper-Evident High-Security Seals</li>
                <li><CheckCircle2 size={15} className="text-emerald" /> Priority Escalation Dispatch Desk</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. EXECUTIVE OPERATIONS TIMELINE
          ========================================================================= */}
      <section className="about-timeline-section">
        <div className="dxp-container-wide">
          <div className="section-center-header">
            <span className="section-eyebrow">PROVENANCE & EVOLUTION</span>
            <h2>The Evolution of Duolingo Express</h2>
            <p className="section-desc-sub">
              From regional point-to-point courier routes to an accredited nationwide linehaul distribution network.
            </p>
            <div className="section-header-line" />
          </div>

          <div className="timeline-track-container">
            <div className="timeline-connector-bar" />

            <div className="timeline-cards-grid">
              {/* Step 1 */}
              <div className="timeline-card">
                <div className="timeline-year-badge font-mono">2018</div>
                <div className="timeline-icon-bubble orange">
                  <Compass size={22} />
                </div>
                <span className="timeline-stage-tag font-mono">FOUNDATION</span>
                <h3>Regional Courier Lines</h3>
                <p>
                  Established direct point-to-point same-day courier dispatch across the Northeast corridor with strict hand-to-hand custody protocols.
                </p>
                <div className="timeline-milestone-stat font-mono">12 Metro Routes</div>
              </div>

              {/* Step 2 */}
              <div className="timeline-card">
                <div className="timeline-year-badge font-mono">2021</div>
                <div className="timeline-icon-bubble emerald">
                  <Truck size={22} />
                </div>
                <span className="timeline-stage-tag font-mono">EXPANSION</span>
                <h3>Nationwide Linehaul Relays</h3>
                <p>
                  Launched dedicated team-driven linehaul corridors connecting Chicago, Dallas, Atlanta, and the East Coast on fixed departure schedules.
                </p>
                <div className="timeline-milestone-stat font-mono">18 Interstate Lanes</div>
              </div>

              {/* Step 3 */}
              <div className="timeline-card">
                <div className="timeline-year-badge font-mono">2024</div>
                <div className="timeline-icon-bubble sky">
                  <Zap size={22} />
                </div>
                <span className="timeline-stage-tag font-mono">INFRASTRUCTURE</span>
                <h3>Piece Barcoding & Telemetry</h3>
                <p>
                  Implemented linear Code 128 piece-level scan auditing and schedule-based vehicle position telemetry for certified milestone tracking.
                </p>
                <div className="timeline-milestone-stat font-mono">100% Scan Auditing</div>
              </div>

              {/* Step 4 */}
              <div className="timeline-card active">
                <div className="timeline-year-badge font-mono active">2026</div>
                <div className="timeline-icon-bubble amber">
                  <Award size={22} />
                </div>
                <span className="timeline-stage-tag font-mono active">SCALE & RELIABILITY</span>
                <h3>50+ Hub Gateway Network</h3>
                <p>
                  Operating over 50 regional sortation hubs coordinating 1,400+ daily courier runs with 99.4% verified on-time transit performance.
                </p>
                <div className="timeline-milestone-stat font-mono active">50+ Regional Hubs</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. REGULATORY COMPLIANCE & SAFETY STANDARDS
          ========================================================================= */}
      <section className="about-compliance-section">
        <div className="dxp-container-wide">
          <div className="compliance-banner">
            <div className="compliance-text-block">
              <span className="section-eyebrow light">VERIFIED CARRIER STANDARDS</span>
              <h3>Committed to Absolute Regulatory Safety & Compliance</h3>
              <p>
                Every driver, vehicle, and terminal in the Duolingo Express network operates under stringent federal guidelines and commercial insurance protocols.
              </p>
            </div>

            <div className="compliance-badges-grid">
              <div className="c-badge-item">
                <ShieldCheck size={28} className="text-orange" />
                <div>
                  <strong>USDOT #3894210</strong>
                  <span>Active & Verified Carrier Authority</span>
                </div>
              </div>

              <div className="c-badge-item">
                <FileCheck size={28} className="text-emerald" />
                <div>
                  <strong>FMCSA #MC-948201</strong>
                  <span>Interstate Operating License</span>
                </div>
              </div>

              <div className="c-badge-item">
                <Award size={28} className="text-sky" />
                <div>
                  <strong>$1,000,000 Cargo</strong>
                  <span>Primary Commercial Insurance Policy</span>
                </div>
              </div>

              <div className="c-badge-item">
                <Users size={28} className="text-amber" />
                <div>
                  <strong>100% Background Check</strong>
                  <span>Strict DOT Driver Screening</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. BOTTOM CALL TO ACTION
          ========================================================================= */}
      <section className="about-bottom-cta">
        <div className="dxp-container-wide">
          <div className="about-cta-card">
            <div className="about-cta-content">
              <h2>Ready to Experience Reliable Courier Logistics?</h2>
              <p>
                Calculate instant commercial shipping rates or speak directly with our senior logistics coordination desk.
              </p>
            </div>

            <div className="about-cta-action-row">
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
