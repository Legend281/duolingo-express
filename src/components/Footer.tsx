import React, { useState } from 'react';
import {
  ShieldCheck,
  Clock,
  Layers,
  Globe,
  Send,
  Linkedin,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  ChevronRight,
  Mail
} from 'lucide-react';
import './Footer.css';

interface FooterProps {
  onNavigate?: (page: string, param?: string) => void;
  showTrustStrip?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate = () => {},
  showTrustStrip = true,
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="dxp-pro-footer-wrapper">
      {/* 1. TRUST FEATURE STRIP */}
      {showTrustStrip && (
        <div className="dxp-footer-trust-strip">
          <div className="dxp-container-wide dxp-trust-grid">
            <div className="dxp-trust-card">
              <div className="dxp-trust-icon">
                <ShieldCheck size={24} />
              </div>
              <div className="dxp-trust-info">
                <h4>Verified Carrier Custody</h4>
                <p>Armored and monitored chain-of-custody across all linehaul corridors.</p>
              </div>
            </div>

            <div className="dxp-trust-card">
              <div className="dxp-trust-icon">
                <Clock size={24} />
              </div>
              <div className="dxp-trust-info">
                <h4>Real-Time Highway Telemetry</h4>
                <p>Continuous milestone scan updates and live highway transit tracking.</p>
              </div>
            </div>

            <div className="dxp-trust-card">
              <div className="dxp-trust-icon">
                <Layers size={24} />
              </div>
              <div className="dxp-trust-info">
                <h4>Piece-Level Barcodes</h4>
                <p>Serialized Code 128 multi-piece tracking on every individual carton.</p>
              </div>
            </div>

            <div className="dxp-trust-card">
              <div className="dxp-trust-icon">
                <Globe size={24} />
              </div>
              <div className="dxp-trust-info">
                <h4>Nationwide Coverage</h4>
                <p>Daily scheduled linehaul connections across all 50 states.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN EXECUTIVE FOOTER */}
      <div className="dxp-pro-footer-main">
        {/* Subtle Map Watermark Background */}
        <div className="footer-world-map-bg" />
        
        {/* Glowing Orange Corner Swoosh */}
        <div className="footer-orange-swoosh" />

        <div className="dxp-container-wide footer-content-relative">
          <div className="dxp-pro-footer-grid">
            {/* Column 1: Brand & Tagline */}
            <div className="dxp-pro-brand-col">
              <div className="dxp-pro-footer-logo" onClick={() => onNavigate('home')}>
                <img
                  src="/logo-for-footer-or-any-area-having-thesame-color-as-the-footer.png"
                  alt="Duolingo Express"
                  className="dxp-pro-footer-logo-img"
                />
              </div>

              <p className="dxp-pro-brand-desc">
                Reliable shipping. Real-time tracking. Nationwide delivery. Duolingo Express connects people, businesses, and opportunities across the country.
              </p>

              <div className="dxp-pro-socials">
                <a href="#facebook" className="pro-social-btn" aria-label="Facebook"><Facebook size={15} /></a>
                <a href="#twitter" className="pro-social-btn" aria-label="Twitter / X"><Twitter size={15} /></a>
                <a href="#instagram" className="pro-social-btn" aria-label="Instagram"><Instagram size={15} /></a>
                <a href="#linkedin" className="pro-social-btn" aria-label="LinkedIn"><Linkedin size={15} /></a>
                <a href="#youtube" className="pro-social-btn" aria-label="YouTube"><Youtube size={15} /></a>
              </div>

              <div className="dxp-pro-faster-tagline font-mono">
                <span>FASTER TOGETHER</span>
                <div className="tagline-bar" />
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="dxp-pro-links-col">
              <h4 className="dxp-pro-col-title">
                Quick Links
                <span className="title-orange-dash" />
              </h4>
              <ul className="dxp-pro-links-list">
                <li>
                  <button type="button" onClick={() => onNavigate('home')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Home</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('track')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Track Shipment</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('services')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Our Services</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('locations')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Locations</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('about')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>About Us</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('contact')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Contact Us</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Our Services */}
            <div className="dxp-pro-links-col">
              <h4 className="dxp-pro-col-title">
                Our Services
                <span className="title-orange-dash" />
              </h4>
              <ul className="dxp-pro-links-list">
                <li>
                  <button type="button" onClick={() => onNavigate('services')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Priority Express Courier</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('services')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Commercial Linehaul</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('services')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Auto & Vehicle Transport</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('services')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Time-Critical Secure Vault</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('ship')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Ship a Consignment</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('quote')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Tariff Rate Calculator</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Support */}
            <div className="dxp-pro-links-col">
              <h4 className="dxp-pro-col-title">
                Support
                <span className="title-orange-dash" />
              </h4>
              <ul className="dxp-pro-links-list">
                <li>
                  <button type="button" onClick={() => onNavigate('help')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Help Center</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('help')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>FAQs</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('legal', 'shipping-terms')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Shipping Terms</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('legal', 'privacy')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Privacy Policy</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('legal', 'terms')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Terms of Service</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('contact')}>
                    <ChevronRight size={14} className="link-chevron" />
                    <span>Report an Issue</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 5: Stay Updated */}
            <div className="dxp-pro-newsletter-col">
              <h4 className="dxp-pro-col-title">
                Stay Updated
                <span className="title-orange-dash" />
              </h4>
              
              <p className="dxp-pro-newsletter-desc">
                Subscribe to our newsletter for the latest updates, shipping tips and special offers.
              </p>

              <form onSubmit={handleSubscribe} className="dxp-pro-subscribe-form">
                <div className="pro-input-wrap">
                  <Mail size={16} className="pro-mail-icon" />
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pro-newsletter-input"
                    required
                  />
                </div>
                <button type="submit" className="pro-subscribe-btn">
                  <span>Subscribe</span>
                  <ChevronRight size={15} />
                </button>
              </form>

              {subscribed && (
                <p className="pro-subscribe-msg font-mono">✓ Thank you for subscribing to operations updates.</p>
              )}

              {/* Worldwide Network Callout */}
              <div className="dxp-pro-global-pill">
                <div className="global-pill-icon">
                  <Globe size={26} className="text-orange" />
                </div>
                <div className="global-pill-text">
                  <strong>We Deliver Worldwide</strong>
                  <p>From local to global, Duolingo Express gets it there.</p>
                </div>
              </div>

            </div>
          </div>

          {/* 3. BOTTOM BAR */}
          <div className="dxp-pro-footer-bottom">
            <div className="pro-copy-text">
              © 2026 Duolingo Express. All rights reserved.
            </div>

            <div className="pro-bottom-right-links">
              <span className="pro-sep-bar">|</span>
              <button type="button" onClick={() => onNavigate('ship')}>Ship</button>
              <span className="pro-dot">•</span>
              <button type="button" onClick={() => onNavigate('track')}>Track</button>
              <span className="pro-dot">•</span>
              <button type="button" onClick={() => onNavigate('services')}>Deliver</button>
              <span className="pro-dot">•</span>
              <span className="pro-slogan">A Better Tomorrow</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
