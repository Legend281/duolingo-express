import React, { useState, useEffect } from 'react';
import {
  Compass,
  Package,
  PlusCircle,
  QrCode,
  Radio,
  Calculator,
  FileText,
  Settings,
  Search,
  Bell,
  Clock,
  ExternalLink,
  Menu,
  X,
  CheckCircle2,
  ChevronDown,
  Truck,
  AlertTriangle,
  ArrowUpRight,
  UserCheck,
  Activity,
  Layers,
  Sparkles,
  LogOut
} from 'lucide-react';
import { useAdminData } from '../context/AdminDataContext';
import { api } from '../services/api';
import './AdminLayout.css';

export type AdminViewType =
  | 'operations-center'
  | 'all-shipments'
  | 'create-shipment'
  | 'tracking-events'
  | 'quote-requests'
  | 'document-center'
  | 'settings';

interface AdminLayoutProps {
  currentView: AdminViewType;
  onSelectView: (view: AdminViewType) => void;
  onNavigatePublic: (page: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  children: React.ReactNode;
}

const VIEW_METADATA: Record<AdminViewType, { title: string; category: string; description: string }> = {
  'operations-center': {
    title: 'Dashboard',
    category: 'Fleet Operations',
    description: 'Overview of active shipments, inbound quotes, and milestone checkpoints.'
  },
  'all-shipments': {
    title: 'Shipments',
    category: 'Fleet Operations',
    description: 'Master list of all shipments.'
  },
  'create-shipment': {
    title: 'New Shipment',
    category: 'Fleet Operations',
    description: 'Book a new shipment and generate documentation.'
  },
  'tracking-events': {
    title: 'Scanner',
    category: 'Fleet Operations',
    description: 'Log milestone events and update statuses.'
  },
  'quote-requests': {
    title: 'Quote Requests',
    category: 'Commercial Tariffs',
    description: 'Review and certify customer quote requests.'
  },
  'document-center': {
    title: 'Documents',
    category: 'Compliance & Governance',
    description: 'Bills of Lading, Proof of Delivery, and shipping labels.'
  },
  'settings': {
    title: 'Settings',
    category: 'Compliance & Governance',
    description: 'Carrier configuration and system preferences.'
  }
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentView,
  onSelectView,
  onNavigatePublic,
  searchQuery,
  onSearchChange,
  children
}) => {
  const { notifications, markNotificationRead, quoteRequests, shipments } = useAdminData();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingQuotesCount = quoteRequests.filter(q => q.status === 'NEW' || q.status === 'UNDER_REVIEW').length;

  const currentMeta = VIEW_METADATA[currentView] || VIEW_METADATA['operations-center'];

  return (
    <div className="dxp-admin-root">
      {/* =========================================================================
          LEFT SIDEBAR: EXECUTIVE DISPATCH COMMAND (DEEP NAVY)
          ========================================================================= */}
      <aside className={`dxp-admin-sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="admin-sidebar-header">
          <div className="admin-brand-card" onClick={() => onSelectView('operations-center')}>
            <img
              src="/logo-for-footer-or-any-area-having-thesame-color-as-the-footer.png"
              alt="Duolingo Express"
              className="admin-brand-logo"
              onError={(e) => {
                // Fallback if image fails to load
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <button className="mobile-close-btn" onClick={() => setMobileSidebarOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Groupings */}
        <nav className="admin-sidebar-nav">
          {/* SECTION 1: OPERATIONS */}
          <div className="admin-nav-section">
            <span className="section-label">OPERATIONS</span>

            {/* Dashboard */}
            <button
              className={`admin-nav-btn ${currentView === 'operations-center' ? 'active' : ''}`}
              onClick={() => { onSelectView('operations-center'); setMobileSidebarOpen(false); }}
            >
              <div className="nav-btn-icon-wrap">
                <Compass size={18} />
              </div>
              <span className="nav-title">Dashboard</span>
            </button>

            {/* Shipments */}
            <button
              className={`admin-nav-btn ${currentView === 'all-shipments' ? 'active' : ''}`}
              onClick={() => { onSelectView('all-shipments'); setMobileSidebarOpen(false); }}
            >
              <div className="nav-btn-icon-wrap">
                <Package size={18} />
              </div>
              <span className="nav-title">Shipments</span>
              <span className="nav-count-badge font-mono">{shipments.length}</span>
            </button>

            {/* New Shipment */}
            <button
              className={`admin-nav-btn ${currentView === 'create-shipment' ? 'active' : ''}`}
              onClick={() => { onSelectView('create-shipment'); setMobileSidebarOpen(false); }}
            >
              <div className="nav-btn-icon-wrap">
                <PlusCircle size={18} />
              </div>
              <span className="nav-title">New Shipment</span>
            </button>

            {/* Scanner */}
            <button
              className={`admin-nav-btn ${currentView === 'tracking-events' ? 'active' : ''}`}
              onClick={() => { onSelectView('tracking-events'); setMobileSidebarOpen(false); }}
            >
              <div className="nav-btn-icon-wrap">
                <QrCode size={18} />
              </div>
              <span className="nav-title">Scanner</span>
            </button>
          </div>

          {/* SECTION 2: COMMERCIAL */}
          <div className="admin-nav-section">
            <span className="section-label">COMMERCIAL</span>

            {/* Quote Requests */}
            <button
              className={`admin-nav-btn ${currentView === 'quote-requests' ? 'active' : ''}`}
              onClick={() => { onSelectView('quote-requests'); setMobileSidebarOpen(false); }}
            >
              <div className="nav-btn-icon-wrap">
                <Calculator size={18} />
              </div>
              <span className="nav-title">Quote Requests</span>
              {pendingQuotesCount > 0 ? (
                <span className="nav-badge-amber font-mono">{pendingQuotesCount} NEW</span>
              ) : (
                <span className="nav-count-badge muted font-mono">{quoteRequests.length}</span>
              )}
            </button>
          </div>

          {/* SECTION 3: SYSTEM */}
          <div className="admin-nav-section">
            <span className="section-label">SYSTEM</span>

            {/* Documents */}
            <button
              className={`admin-nav-btn ${currentView === 'document-center' ? 'active' : ''}`}
              onClick={() => { onSelectView('document-center'); setMobileSidebarOpen(false); }}
            >
              <div className="nav-btn-icon-wrap">
                <FileText size={18} />
              </div>
              <span className="nav-title">Documents</span>
            </button>

            {/* Settings */}
            <button
              className={`admin-nav-btn ${currentView === 'settings' ? 'active' : ''}`}
              onClick={() => { onSelectView('settings'); setMobileSidebarOpen(false); }}
            >
              <div className="nav-btn-icon-wrap">
                <Settings size={18} />
              </div>
              <span className="nav-title">Settings</span>
            </button>
          </div>
        </nav>

        {/* Sidebar Footer: Return to Public & Dispatcher Card */}
        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="btn-exit-to-public"
            onClick={() => onNavigatePublic('home')}
            title="Switch to public customer view"
          >
            <span>View Public Website</span>
            <ArrowUpRight size={16} />
          </button>

          <div className="sidebar-operator-card">
            <div className="operator-avatar">
              <span>SA</span>
              <span className="operator-online-dot" />
            </div>
            <div className="operator-info">
              <strong>Super Admin</strong>
              <small>Terminal Dispatcher #01</small>
            </div>
          </div>

          <div className="sidebar-brand-motto">
            <span className="motto-text">FASTER TOGETHER</span>
            <span className="motto-line" />
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN WORKSPACE WRAPPER
          ========================================================================= */}
      <div className="dxp-admin-main-wrapper">
        {/* TOP DISPATCH HEADER */}
        <header className="dxp-admin-top-header">
          {/* Left Column: Clean View Title */}
          <div className="header-titles-column">
            <button className="mobile-menu-trigger" onClick={() => setMobileSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 className="header-view-title">{currentMeta.title}</h1>
          </div>

          {/* Right Column: Universal Search & Quick Dispatch Actions */}
          <div className="header-actions-column">
            {/* Universal Search Input */}
            <div className="admin-universal-search">
              <Search size={15} className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search tracking, quote ID, customer..."
                className="universal-search-input"
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search query"
                >
                  <X size={13} />
                </button>
              ) : (
                <span className="search-shortcut-badge font-mono" title="Keyboard shortcut: Ctrl+K or ⌘K">
                  ⌘K
                </span>
              )}
            </div>

            {/* Notification Drawer Button */}
            <div className="notification-wrap">
              <button
                type="button"
                className={`btn-notification-trigger ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={() => setShowNotifications(!showNotifications)}
                title="Operational Alerts"
              >
                <Bell size={17} />
                {unreadCount > 0 && <span className="notification-count-badge font-mono">{unreadCount}</span>}
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifications && (
                <div className="admin-notification-popover animate-scale-in">
                  <div className="popover-header">
                    <div>
                      <strong>Operational Alerts</strong>
                      <small>{unreadCount} unread items</small>
                    </div>
                    <button className="popover-close" onClick={() => setShowNotifications(false)}>
                      <X size={14} />
                    </button>
                  </div>

                  <div className="popover-list">
                    {notifications.length === 0 ? (
                      <div className="popover-empty">
                        <CheckCircle2 size={24} className="text-emerald" />
                        <span>All corridors operating nominally</span>
                      </div>
                    ) : (
                      notifications.slice(0, 6).map((notif) => (
                        <div
                          key={notif.id}
                          className={`popover-item ${notif.read ? 'read' : 'unread'}`}
                          onClick={() => {
                            markNotificationRead(notif.id);
                            if (notif.type === 'QUOTE') onSelectView('quote-requests');
                            if (notif.type === 'DELAY') onSelectView('operations-center');
                          }}
                        >
                          <div className={`item-dot ${notif.type.toLowerCase()}`} />
                          <div className="item-content">
                            <strong>{notif.title}</strong>
                            <p>{notif.message}</p>
                            <span className="item-time">{notif.timestamp}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Operator Profile Pill */}
            <div className="user-profile-wrap">
              <button
                type="button"
                className="user-profile-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="avatar-chip">SA</div>
                <div className="profile-text">
                  <span className="profile-name">Super Admin</span>
                  <span className="profile-role">Root Dispatch</span>
                </div>
                <ChevronDown size={14} className="chevron-icon" />
              </button>

              {showUserMenu && (
                <div className="user-menu-popover animate-scale-in">
                  <div className="menu-popover-header">
                    <strong>Super Admin (Console)</strong>
                    <small>dispatch@duolingoexpress.com</small>
                  </div>
                  <div className="menu-popover-links">
                    <button onClick={() => { onSelectView('settings'); setShowUserMenu(false); }}>
                      <Settings size={15} />
                      <span>Carrier Settings</span>
                    </button>
                    <button onClick={() => { onSelectView('document-center'); setShowUserMenu(false); }}>
                      <FileText size={15} />
                      <span>Document Archive</span>
                    </button>
                    <div className="menu-divider" />
                    <button className="menu-exit-link" onClick={() => onNavigatePublic('home')}>
                      <ExternalLink size={15} />
                      <span>View Public Website</span>
                    </button>
                    <button
                      className="menu-exit-link"
                      onClick={() => { api.logout().finally(() => window.location.reload()); }}
                    >
                      <LogOut size={15} />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* DYNAMIC VIEW BODY */}
        <main className="dxp-admin-page-content">
          {children}
        </main>
      </div>
    </div>
  );
};
