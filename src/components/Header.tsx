import React, { useState, useEffect } from 'react';
import {
  Package,
  Menu,
  X,
  ArrowRight,
  Calculator,
  Phone,
  Mail,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useAdminData } from '../context/AdminDataContext';
import './Header.css';

// Phone menu order mirrors the desktop nav, plus the pages that only live in the footer there.
const MOBILE_LINKS: { page: string; label: string }[] = [
  { page: 'home', label: 'Home' },
  { page: 'about', label: 'About Us' },
  { page: 'services', label: 'Services' },
  { page: 'track', label: 'Track Shipment' },
  { page: 'ship', label: 'Ship Now' },
  { page: 'locations', label: 'Locations' },
  { page: 'help', label: 'Help Center' },
  { page: 'contact', label: 'Contact' },
];

// Turns a vanity number such as "(800) 555-DUO-EXP" into dialable digits (keypad letters,
// US numbers capped at 11 digits as vanity numbers conventionally are).
const KEYPAD: Record<string, string> = { A: '2', B: '2', C: '2', D: '3', E: '3', F: '3', G: '4', H: '4', I: '4', J: '5', K: '5', L: '5', M: '6', N: '6', O: '6', P: '7', Q: '7', R: '7', S: '7', T: '8', U: '8', V: '8', W: '9', X: '9', Y: '9', Z: '9' };
const toDialNumber = (phone: string) => {
  let digits = phone.toUpperCase().replace(/[A-Z]/g, (c) => KEYPAD[c]).replace(/[^0-9]/g, '');
  if (digits.length === 10) digits = '1' + digits;
  if (digits.length > 11 && digits.startsWith('1')) digits = digits.slice(0, 11);
  else if (digits.length > 10 && !digits.startsWith('1')) digits = '1' + digits.slice(0, 10);
  return '+' + digits;
};

interface HeaderProps {
  activePage?: string;
  onNavigate?: (page: string, param?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage = 'home',
  onNavigate = () => {},
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Admin-editable company contact info — this used to be hardcoded here (and independently
  // hardcoded, often with different fake numbers, across every other public page), so
  // changing the phone/email/DOT number in Settings never actually reached any of them.
  const { settings } = useAdminData();
  const supportPhone = settings.supportPhone || '1-800-555-0199';
  const supportPhoneDigits = supportPhone.replace(/[^0-9+]/g, '');
  const dialNumber = toDialNumber(supportPhone);
  const dispatchEmail = settings.dispatchEmail || 'dispatch@duolingoexpress.com';
  const dotNumber = settings.dotNumber || 'USDOT #3894210 · MC-892401';

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleNav = (page: string, param?: string) => {
    onNavigate(page, param);
    setMobileMenuOpen(false);
  };

  return (
    <header className="dxp-header-wrapper">
      {/* 1. TOP UTILITY BAR (Hidden completely on mobile to eliminate clutter) */}
      <div className="dxp-topbar hide-mobile-topbar">
        <div className="dxp-container-wide dxp-topbar-inner">
          <div className="dxp-topbar-left">
            <div className="topbar-item">
              <Phone size={13} className="text-orange" />
              <span>Priority Dispatch: <strong>{supportPhone}</strong></span>
            </div>
            <div className="topbar-divider" />
            <div className="topbar-item">
              <Mail size={13} className="text-orange" />
              <span>{dispatchEmail}</span>
            </div>
            <div className="topbar-divider" />
            <div className="topbar-item">
              <Clock size={13} className="text-emerald" />
              <span>24/7 Road & Air Freight Transit</span>
            </div>
          </div>

          <div className="dxp-topbar-right">
            <div className="topbar-cert-pill font-mono">
              <CheckCircle2 size={12} className="text-emerald" />
              <span>{dotNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVIGATION BAR */}
      <div className="dxp-main-header">
        <div className="dxp-container-wide dxp-header-inner">
          {/* Brand Logo */}
          <div className="dxp-logo-wrap" onClick={() => handleNav('home')}>
            <img
              src="/logo.png"
              alt="Duolingo Express"
              className="dxp-brand-logo-img"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.dxp-fallback-logo')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'dxp-fallback-logo';
                  fallback.innerHTML = '<span class="dxp-brand-name">DUOLINGO<span class="text-orange">EXPRESS</span></span>';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>

          {/* Desktop Nav Links */}
          <nav className="dxp-nav-links">
            <button
              type="button"
              className={`dxp-nav-link ${activePage === 'home' ? 'active' : ''}`}
              onClick={() => handleNav('home')}
            >
              Home
            </button>
            <button
              type="button"
              className={`dxp-nav-link ${activePage === 'about' ? 'active' : ''}`}
              onClick={() => handleNav('about')}
            >
              About Us
            </button>
            <button
              type="button"
              className={`dxp-nav-link ${activePage === 'services' ? 'active' : ''}`}
              onClick={() => handleNav('services')}
            >
              Services
            </button>
            <button
              type="button"
              className={`dxp-nav-link ${activePage === 'track' ? 'active' : ''}`}
              onClick={() => handleNav('track')}
            >
              Track Shipment
            </button>
            <button
              type="button"
              className={`dxp-nav-link ${activePage === 'ship' ? 'active' : ''}`}
              onClick={() => handleNav('ship')}
            >
              Ship Now
            </button>
            <button
              type="button"
              className={`dxp-nav-link ${activePage === 'contact' ? 'active' : ''}`}
              onClick={() => handleNav('contact')}
            >
              Contact
            </button>
          </nav>

          {/* Header Primary Action Button */}
          <div className="dxp-header-actions">
            <button
              type="button"
              className="dxp-btn-top-quote"
              onClick={() => handleNav('quote')}
            >
              <Calculator size={15} />
              <span>Request a Quote</span>
            </button>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            className={`dxp-mobile-toggle-btn ${mobileMenuOpen ? 'is-active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* 3. MOBILE MENU — full-screen dark overlay (matches the footer) */}
      {mobileMenuOpen && (
        <div className="dxp-menu-overlay" role="dialog" aria-modal="true" aria-label="Site menu">
          <div className="menu-bg" aria-hidden="true" />

          <div className="menu-top">
            <button type="button" className="menu-logo-btn" onClick={() => handleNav('home')} aria-label="Duolingo Express home">
              <img
                src="/logo-for-footer-or-any-area-having-thesame-color-as-the-footer.png"
                alt="Duolingo Express"
                className="menu-logo"
              />
            </button>
            <button
              type="button"
              className="menu-close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>

          <nav className="menu-links" aria-label="Main">
            {MOBILE_LINKS.map((link, i) => {
              const active = activePage === link.page;
              return (
                <button
                  key={link.page}
                  type="button"
                  className={`menu-link ${active ? 'active' : ''}`}
                  style={{ animationDelay: `${60 + i * 35}ms` }}
                  onClick={() => handleNav(link.page)}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="menu-link-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="menu-link-label">{link.label}</span>
                  <ArrowRight size={18} className="menu-link-arrow" />
                </button>
              );
            })}
          </nav>

          <div className="menu-bottom">
            <div className="menu-cta-row">
              <button type="button" className="menu-cta ghost" onClick={() => handleNav('track')}>
                <Package size={17} />
                <span>Track</span>
              </button>
              <button type="button" className="menu-cta primary" onClick={() => handleNav('quote')}>
                <Calculator size={17} />
                <span>Get a Quote</span>
              </button>
            </div>
            <a href={`tel:${dialNumber}`} className="menu-call">
              <span className="menu-call-icon"><Phone size={16} /></span>
              <span className="menu-call-text">
                <small><span className="menu-live-dot" /> Dispatch open 24/7</small>
                <strong>{supportPhone}</strong>
              </span>
            </a>
            <div className="menu-reg">{dotNumber}</div>
          </div>
        </div>
      )}
    </header>
  );
};
