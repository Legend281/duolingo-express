import React, { useState, useEffect } from 'react';
import {
  Package,
  Menu,
  X,
  ArrowRight,
  Shield,
  MapPin,
  Calculator,
  Truck,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  ChevronRight,
  Home,
  Headphones,
  FileText
} from 'lucide-react';
import './Header.css';

interface HeaderProps {
  activePage?: string;
  onNavigate?: (page: string, param?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage = 'home',
  onNavigate = () => {},
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              <span>Priority Dispatch: <strong>1-800-555-0199</strong></span>
            </div>
            <div className="topbar-divider" />
            <div className="topbar-item">
              <Mail size={13} className="text-orange" />
              <span>dispatch@duolingoexpress.com</span>
            </div>
            <div className="topbar-divider" />
            <div className="topbar-item">
              <Clock size={13} className="text-emerald" />
              <span>24/7 Continuous Highway Transit</span>
            </div>
          </div>

          <div className="dxp-topbar-right">
            <div className="topbar-cert-pill font-mono">
              <CheckCircle2 size={12} className="text-emerald" />
              <span>USDOT #3894210 · MC-882104</span>
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

      {/* 3. EXECUTIVE MOBILE DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="dxp-drawer-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="dxp-mobile-drawer-sheet animate-slide-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header with Logo and Close */}
            <div className="drawer-header">
              <div className="drawer-logo" onClick={() => handleNav('home')}>
                <img src="/logo.png" alt="Duolingo Express" className="drawer-logo-img" />
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Action Top Cards */}
            <div className="drawer-quick-actions">
              <button
                type="button"
                className="drawer-action-card track-card"
                onClick={() => handleNav('track')}
              >
                <div className="action-icon-wrap orange">
                  <Package size={20} />
                </div>
                <div className="action-text">
                  <strong>Track a Shipment</strong>
                  <small>Live highway telemetry radar</small>
                </div>
                <ChevronRight size={16} className="action-arrow" />
              </button>

              <button
                type="button"
                className="drawer-action-card quote-card"
                onClick={() => handleNav('quote')}
              >
                <div className="action-icon-wrap navy">
                  <Calculator size={20} />
                </div>
                <div className="action-text">
                  <strong>Get Tariff Quote</strong>
                  <small>Instant corridor rate calculation</small>
                </div>
                <ChevronRight size={16} className="action-arrow" />
              </button>
            </div>

            {/* Navigation List */}
            <div className="drawer-nav-section">
              <span className="drawer-section-label">MAIN NAVIGATION</span>
              <nav className="drawer-nav-list">
                <button
                  type="button"
                  className={`drawer-link ${activePage === 'home' ? 'active' : ''}`}
                  onClick={() => handleNav('home')}
                >
                  <Home size={18} className="link-icon" />
                  <span>Home</span>
                  <ChevronRight size={14} className="link-chevron" />
                </button>

                <button
                  type="button"
                  className={`drawer-link ${activePage === 'services' ? 'active' : ''}`}
                  onClick={() => handleNav('services')}
                >
                  <Truck size={18} className="link-icon" />
                  <span>Our Courier Services</span>
                  <ChevronRight size={14} className="link-chevron" />
                </button>

                <button
                  type="button"
                  className={`drawer-link ${activePage === 'ship' ? 'active' : ''}`}
                  onClick={() => handleNav('ship')}
                >
                  <Package size={18} className="link-icon" />
                  <span>Ship a Consignment</span>
                  <ChevronRight size={14} className="link-chevron" />
                </button>

                <button
                  type="button"
                  className={`drawer-link ${activePage === 'locations' ? 'active' : ''}`}
                  onClick={() => handleNav('locations')}
                >
                  <MapPin size={18} className="link-icon" />
                  <span>Facility & Gateway Network</span>
                  <ChevronRight size={14} className="link-chevron" />
                </button>

                <button
                  type="button"
                  className={`drawer-link ${activePage === 'about' ? 'active' : ''}`}
                  onClick={() => handleNav('about')}
                >
                  <Shield size={18} className="link-icon" />
                  <span>About Duolingo Express</span>
                  <ChevronRight size={14} className="link-chevron" />
                </button>

                <button
                  type="button"
                  className={`drawer-link ${activePage === 'contact' ? 'active' : ''}`}
                  onClick={() => handleNav('contact')}
                >
                  <Headphones size={18} className="link-icon" />
                  <span>24/7 Operations Desk</span>
                  <ChevronRight size={14} className="link-chevron" />
                </button>
              </nav>
            </div>

            {/* 24/7 Dispatch Hotline Bottom Box */}
            <div className="drawer-footer-hotline">
              <div className="hotline-head">
                <span className="live-status-dot" />
                <span className="hotline-tag font-mono">24/7 OPERATIONS ACTIVE</span>
              </div>
              <a href="tel:18005550199" className="hotline-phone-btn">
                <Phone size={15} />
                <span>Call Dispatch: 1-800-555-0199</span>
              </a>
              <div className="drawer-regulatory font-mono">
                USDOT #3894210 · MC-882104
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
