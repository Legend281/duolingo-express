import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  Search,
  Send,
  Twitter,
  Youtube,
} from 'lucide-react';
import './Footer.css';

interface FooterProps {
  onNavigate?: (page: string, param?: string) => void;
  /** Runs a tracking lookup straight from the footer search (same flow as the Track page). */
  onTrackShipment?: (query: string) => void;
}

type LinkItem = { label: string; page: string; param?: string };

const LINK_COLUMNS: { title: string; links: LinkItem[] }[] = [
  {
    title: 'Quick Links',
    links: [
      { label: 'Home', page: 'home' },
      { label: 'Track Shipment', page: 'track' },
      { label: 'Our Services', page: 'services' },
      { label: 'Locations', page: 'locations' },
      { label: 'About Us', page: 'about' },
      { label: 'Contact Us', page: 'contact' },
    ],
  },
  {
    title: 'Our Services',
    links: [
      { label: 'Priority Express Courier', page: 'services' },
      { label: 'Commercial Linehaul', page: 'services' },
      { label: 'Auto & Vehicle Transport', page: 'services' },
      { label: 'Time-Critical Secure Vault', page: 'services' },
      { label: 'Ship a Consignment', page: 'ship' },
      { label: 'Tariff Rate Calculator', page: 'quote' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', page: 'help' },
      { label: 'FAQs', page: 'help' },
      { label: 'Shipping Terms', page: 'legal', param: 'shipping-terms' },
      { label: 'Privacy Policy', page: 'legal', param: 'privacy' },
      { label: 'Terms of Service', page: 'legal', param: 'terms' },
      { label: 'Report an Issue', page: 'contact' },
    ],
  },
];

export const Footer: React.FC<FooterProps> = ({
  onNavigate = () => {},
  onTrackShipment,
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [trackQuery, setTrackQuery] = useState('');
  // Phone only: link columns collapse into an accordion so the footer isn't three screens tall.
  const [openColumn, setOpenColumn] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const query = trackQuery.trim();
    if (!query) {
      onNavigate('track');
      return;
    }
    if (onTrackShipment) onTrackShipment(query);
    else onNavigate('track-result', query);
    setTrackQuery('');
  };

  return (
    <footer className="dxp-site-footer">
      <div className="ft-bg" aria-hidden="true" />
      <div className="ft-overlay" aria-hidden="true" />

      <div className="ft-inner">
        {/* 1. HEADLINE + TRACKING SEARCH */}
        <section className="ft-hero">
          <div className="ft-hero-copy">
            <span className="ft-eyebrow">
              <span className="ft-live-dot" />
              Road & Air Freight · 24/7 Dispatch
            </span>
            <h2 className="ft-hero-title">
              Ship it today. <span className="ft-accent">Track it anywhere.</span>
            </h2>
            <p className="ft-hero-sub">
              From a single parcel to a full linehaul load, across all 50 states and to destinations worldwide.
            </p>
          </div>

          <div className="ft-hero-actions">
            <form className="ft-track-form" onSubmit={handleTrack}>
              <Search size={18} className="ft-track-icon" aria-hidden="true" />
              <input
                type="text"
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder="Enter a tracking number"
                aria-label="Tracking number"
                className="ft-track-input"
              />
              <button type="submit" className="ft-track-btn">
                <span>Track</span>
                <ArrowRight size={16} />
              </button>
            </form>
            <div className="ft-hero-links">
              <button type="button" onClick={() => onNavigate('quote')}>Get a rate quote</button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={() => onNavigate('ship')}>Book a pickup</button>
            </div>
          </div>
        </section>

        {/* 2. LINKS */}
        <div className="ft-grid">
          <div className="ft-brand">
            <button type="button" className="ft-logo-btn" onClick={() => onNavigate('home')} aria-label="Duolingo Express home">
              <img
                src="/logo-for-footer-or-any-area-having-thesame-color-as-the-footer.png"
                alt="Duolingo Express"
                className="ft-logo"
              />
            </button>
            <p className="ft-brand-desc">
              Reliable shipping. Real-time tracking. Nationwide and international delivery. Duolingo Express connects people, businesses, and opportunities across the country and around the world.
            </p>
            <div className="ft-contact">
              <button type="button" onClick={() => onNavigate('contact')}><Phone size={15} /> (800) 555-DUO-EXP</button>
              <a href="mailto:dispatch@duolingoexpress.com"><Mail size={15} /> dispatch@duolingoexpress.com</a>
            </div>
            <div className="ft-socials">
              <a href="#facebook" aria-label="Facebook"><Facebook size={16} /></a>
              <a href="#twitter" aria-label="Twitter / X"><Twitter size={16} /></a>
              <a href="#instagram" aria-label="Instagram"><Instagram size={16} /></a>
              <a href="#linkedin" aria-label="LinkedIn"><Linkedin size={16} /></a>
              <a href="#youtube" aria-label="YouTube"><Youtube size={16} /></a>
            </div>
          </div>

          {LINK_COLUMNS.map((col) => {
            const open = openColumn === col.title;
            return (
              <nav key={col.title} className={`ft-col ${open ? 'open' : ''}`} aria-label={col.title}>
                <button
                  type="button"
                  className="ft-col-title"
                  aria-expanded={open}
                  onClick={() => setOpenColumn(open ? null : col.title)}
                >
                  <span>{col.title}</span>
                  <ChevronDown size={18} className="ft-col-chevron" />
                </button>
                <ul className="ft-col-list">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <button type="button" onClick={() => onNavigate(link.page, link.param)}>
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            );
          })}

          <div className="ft-news">
            <h4 className="ft-news-title">Stay Updated</h4>
            <p className="ft-news-desc">
              Subscribe to our newsletter for the latest updates, shipping tips and special offers.
            </p>
            <form onSubmit={handleSubscribe} className="ft-news-form">
              <input
                type="email"
                placeholder="Your email address"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" aria-label="Subscribe">
                <Send size={16} />
              </button>
            </form>
            {subscribed && (
              <p className="ft-news-msg">✓ Thank you for subscribing to operations updates.</p>
            )}
            <div className="ft-worldwide">
              <Globe size={22} />
              <div>
                <strong>We Deliver Worldwide</strong>
                <span>From local to global, Duolingo Express gets it there.</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. BOTTOM BAR */}
        <div className="ft-bottom">
          <span>© 2026 Duolingo Express. All rights reserved.</span>
          <div className="ft-bottom-links">
            <button type="button" onClick={() => onNavigate('ship')}>Ship</button>
            <span className="ft-dot" aria-hidden="true" />
            <button type="button" onClick={() => onNavigate('track')}>Track</button>
            <span className="ft-dot" aria-hidden="true" />
            <button type="button" onClick={() => onNavigate('services')}>Deliver</button>
            <span className="ft-dot" aria-hidden="true" />
            <strong>A Better Tomorrow</strong>
          </div>
        </div>
      </div>
    </footer>
  );
};
