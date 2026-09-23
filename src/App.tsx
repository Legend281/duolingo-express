import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { TrackPage } from './pages/TrackPage';
import { TrackResultPage } from './pages/TrackResultPage';
import { PublicQuoteResultPage } from './pages/PublicQuoteResultPage';
import { ServicesPage } from './pages/ServicesPage';
import { QuotePage } from './pages/QuotePage';
import { ShipPage } from './pages/ShipPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { HelpPage } from './pages/HelpPage';
import { LegalPage } from './pages/LegalPage';
import { LocationsPage } from './pages/LocationsPage';
import { AdminApp } from './admin/AdminApp';
import { AdminLogin } from './admin/AdminLogin';
import { TrackingLoadingScreen } from './components/TrackingLoadingScreen';
import { AdminDataProvider, useAdminData } from './context/AdminDataContext';
import { PRIMARY_SHIPMENT, getShipmentByTrackingNumber } from './data/mockShipments';
import { Shipment } from './types/shipment';
import { QuoteRequest } from './types/admin';
import { api } from './services/api';
import { simulationEngine } from './services/simulationEngine';
import './styles/global.css';

const KNOWN_PAGES = ['home', 'track', 'services', 'quote', 'ship', 'about', 'help', 'contact', 'legal', 'locations', 'admin'];

// Admin now lives on its own subdomain instead of a hash route on the main site, for cleaner
// separation from the public site. Deliberately not "admin." — that's one of the most
// commonly probed/guessed subdomain names, which works against the obscurity this move is
// for. localhost is exempted so local dev can keep using the plain #/admin hash without a
// real subdomain being set up.
function isAdminHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.startsWith('dr.');
}

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

// Reads the current URL hash synchronously, before the first paint, so the initial render
// already shows the right page. Without this, `currentPage` always started as 'home' and only
// got corrected once the hash-parsing effect ran a moment later — barely noticeable on an
// ordinary page load, but very visible right after logging into the admin console, since that
// flow does a full page reload: the public home page (header, hero, footer) would flash on
// screen for a beat before the admin dashboard took over. Only handles the simple, synchronous
// cases (a known page name, or /admin) — /track/:id and /quote/:id still need an async lookup
// to know what to show, so those fall back through to 'track' as a neutral holding page; the
// existing hash-parsing effect (below) still runs afterward and resolves them for real.
function getInitialPage(): string {
  if (typeof window === 'undefined') return 'home';
  if (isAdminHost()) return 'admin';
  const hash = window.location.hash.replace('#', '');
  const pathname = window.location.pathname.replace(/^\//, '');
  const target = hash || (pathname ? `/${pathname}` : '');
  if (target.startsWith('/admin') || target === 'admin') {
    return isLocalDevHost() ? 'admin' : 'home';
  }
  if (target.startsWith('/track/') || target.startsWith('/quote/')) return 'track';
  if (target.startsWith('/')) {
    const page = target.replace('/', '').split('/')[0];
    if (KNOWN_PAGES.includes(page)) return page;
  }
  return 'home';
}

function MainAppContent() {
  const [currentPage, setCurrentPage] = useState<string>(getInitialPage);
  const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null);
  const [currentQuote, setCurrentQuote] = useState<QuoteRequest | null>(null);
  const [notFoundQuery, setNotFoundQuery] = useState<string | null>(null);
  const [preselectedService, setPreselectedService] = useState<string>('Priority');
  const [legalSection, setLegalSection] = useState<string>('privacy');
  const [adminAuthChecked, setAdminAuthChecked] = useState(false);
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [isTrackSearching, setIsTrackSearching] = useState(false);
  const [trackSearchQuery, setTrackSearchQuery] = useState('');
  const { getShipment, quoteRequests, shipments } = useAdminData();

  // Every admin API route now requires a session — check once before ever rendering the
  // real admin console, so someone without a session sees the login form instead of a
  // console full of failed 401 requests and empty/mock data.
  useEffect(() => {
    if (currentPage === 'admin' && !adminAuthChecked) {
      api.checkSession().then(isAdmin => {
        setIsAdminAuthed(isAdmin);
        setAdminAuthChecked(true);
      });
    }
  }, [currentPage, adminAuthChecked]);

  // Keep tracked shipment in continuous live synchronization with simulation engine
  useEffect(() => {
    const unsubscribe = simulationEngine.subscribe((simUpdated) => {
      setCurrentShipment(prev => {
        if (prev && prev.trackingNumber.toUpperCase() === simUpdated.trackingNumber.toUpperCase()) {
          return { ...prev, ...simUpdated };
        }
        return prev;
      });
    });
    return () => unsubscribe();
  }, []);

  const liveShipment = currentShipment
    ? (shipments.find(s => s.trackingNumber.toUpperCase() === currentShipment.trackingNumber.toUpperCase()) || currentShipment)
    : null;

  // Dynamic document title update for enhanced UX and B2B professionalism
  useEffect(() => {
    const titles: Record<string, string> = {
      home: 'Duolingo Express | Nationwide Priority Courier & Linehaul Logistics',
      track: 'Duolingo Express | Live Shipment Tracking & Highway Radar',
      'track-result': liveShipment ? `Tracking #${liveShipment.trackingNumber} | Duolingo Express` : 'Shipment Details | Duolingo Express',
      'quote-result': currentQuote ? `Quote #${currentQuote.id} | Duolingo Express` : 'Quote Details | Duolingo Express',
      services: 'Duolingo Express | Commercial Courier Services & Linehaul Portfolio',
      quote: 'Duolingo Express | Instant Rate Quote & Tariff Calculator',
      ship: 'Duolingo Express | Schedule Courier Pickup & Tender',
      about: 'Duolingo Express | Corporate Provenance, Compliance & Fleet Standards',
      contact: 'Duolingo Express | 24/7 Logistics Dispatch & Support Desk',
      help: 'Duolingo Express | Client Support & Help Center',
      legal: 'Duolingo Express | Carrier Terms of Service & Tariffs',
      admin: 'Duolingo Express | Operations Command & Central Dispatch Desk',
    };
    document.title = titles[currentPage] || 'Duolingo Express | Priority Courier Logistics';
  }, [currentPage, liveShipment, currentQuote]);

  // Initialize from hash if available
  useEffect(() => {
    const handleHash = async () => {
      if (isAdminHost()) {
        setCurrentPage('admin');
        return;
      }
      const hash = window.location.hash.replace('#', '');
      const pathname = window.location.pathname.replace(/^\//, '');
      const target = hash || (pathname ? `/${pathname}` : '');

      if (target.startsWith('/track/')) {
        const trk = target.replace('/track/', '');
        if (trk.toUpperCase().startsWith('QR-') || trk.toUpperCase().startsWith('QR')) {
          handleTrackShipment(trk);
          return;
        }
        const found = getShipment(trk) || getShipmentByTrackingNumber(trk);
        if (found) {
          setCurrentShipment(found);
          setNotFoundQuery(null);
          setCurrentPage('track-result');
        } else {
          try {
            const apiShipment = await api.trackShipment(trk);
            if (apiShipment) {
              setCurrentShipment(apiShipment);
              setNotFoundQuery(null);
              setCurrentPage('track-result');
              return;
            }
          } catch (e) {
            // Not found
          }
          setNotFoundQuery(trk);
          setCurrentPage('track');
        }
      } else if (target.startsWith('/quote/')) {
        const quoteId = target.replace('/quote/', '');
        handleTrackShipment(quoteId);
      } else if (target.startsWith('/admin') || target === 'admin') {
        // No longer resolves on the public domain — admin moved to its own subdomain.
        // Exempted on localhost so local dev can keep using the plain #/admin hash.
        if (isLocalDevHost()) {
          setCurrentPage('admin');
        }
      } else if (target.startsWith('/')) {
        const page = target.replace('/', '').split('/')[0];
        if (KNOWN_PAGES.includes(page)) {
          setCurrentPage(page);
        } else if (page === 'track-result') {
          // If navigated directly to track-result without an active shipment, redirect to track search
          if (!currentShipment) {
            setCurrentPage('track');
          }
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [getShipment, quoteRequests, shipments, currentShipment]);

  const handleNavigate = (page: string, param?: string) => {
    if (page === 'quote' && param) {
      setPreselectedService(param);
    }
    if (page === 'legal' && param) {
      setLegalSection(param);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (page === 'track-result' && param) {
      window.location.hash = `/track/${param}`;
    } else if (page === 'quote-result' && param) {
      window.location.hash = `/quote/${param}`;
    } else if (page === 'home') {
      window.location.hash = '';
    } else {
      window.location.hash = `/${page}`;
    }
  };

  const handleTrackShipment = async (inputQuery: string) => {
    const query = inputQuery.trim();
    if (!query) return;

    // A local cache hit used to resolve this whole function synchronously, so the result
    // page just appeared instantly with zero transition — genuinely fast, but it read as
    // "did that even do anything?" rather than as a live lookup. Every exit path below now
    // goes through finishSearch, which guarantees the loading screen stays up for at least
    // MIN_LOADING_MS regardless of how fast the underlying lookup actually was, then commits
    // the real state change. A slow lookup (the real API path) is unaffected — it already
    // takes longer than this floor, so the extra wait is 0.
    const MIN_LOADING_MS = 900;
    const searchStartedAt = Date.now();
    setIsTrackSearching(true);
    setTrackSearchQuery(query);
    // Without this, the loading screen renders wherever the page happened to already be
    // scrolled to (e.g. down at the search box on TrackPage) — on mobile especially, that cut
    // the truck icon and heading off above the fold, leaving only the progress bar visible.
    // Scroll to top immediately, not just after the result is ready.
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const finishSearch = async (commit: () => void) => {
      const elapsed = Date.now() - searchStartedAt;
      if (elapsed < MIN_LOADING_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_MS - elapsed));
      }
      commit();
      setIsTrackSearching(false);
    };

    // 1. CHECK IF THIS IS A QUOTE ID (e.g. QR-2026-88752)
    if (query.toUpperCase().startsWith('QR') || quoteRequests.some(q => q.id.toUpperCase() === query.toUpperCase())) {
      const match = quoteRequests.find(q => q.id.toUpperCase() === query.toUpperCase());
      if (match) {
        await finishSearch(() => {
          setCurrentQuote(match);
          setCurrentPage('quote-result');
          window.location.hash = `/quote/${match.id}`;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        return;
      }

      // Try fetching from backend API — a single, scoped lookup by this exact ID, not the
      // full admin quotes list (that endpoint now requires an admin session anyway, and
      // even before it did, pulling every customer's quote data into a public visitor's
      // browser just to check one ID was never right).
      try {
        const apiMatch = await api.getPublicQuote(query.toUpperCase());
        if (apiMatch) {
          await finishSearch(() => {
            setCurrentQuote(apiMatch);
            setCurrentPage('quote-result');
            window.location.hash = `/quote/${apiMatch.id}`;
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
          return;
        }
      } catch (err) {
        console.error('Error fetching quote:', err);
      }
    }

    // 2. CHECK IF THIS IS A REAL SHIPMENT
    const foundShipment = getShipment(query) || getShipmentByTrackingNumber(query);
    if (foundShipment) {
      await finishSearch(() => {
        setCurrentShipment(foundShipment);
        setNotFoundQuery(null);
        setCurrentPage('track-result');
        window.location.hash = `/track/${foundShipment.trackingNumber}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      return;
    }

    // Try backend API for shipment
    try {
      const apiShipment = await api.trackShipment(query);
      if (apiShipment) {
        await finishSearch(() => {
          setCurrentShipment(apiShipment);
          setNotFoundQuery(null);
          setCurrentPage('track-result');
          window.location.hash = `/track/${apiShipment.trackingNumber}`;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        return;
      }
    } catch (e) {
      // not found
    }

    // 3. IF FALLBACK SEARCHING SAMPLE
    if (query.toUpperCase().startsWith('DXP-SAMPLE') || query.toUpperCase().includes('7K2M9QRX')) {
      const sample = getShipmentByTrackingNumber(query) || PRIMARY_SHIPMENT;
      await finishSearch(() => {
        setCurrentShipment(sample);
        setNotFoundQuery(null);
        setCurrentPage('track-result');
        window.location.hash = `/track/${sample.trackingNumber}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      return;
    }

    // 4. NOT FOUND STATE
    await finishSearch(() => {
      setNotFoundQuery(query);
      setCurrentPage('track');
      window.location.hash = `/track`;
    });
  };

  // If on Admin page, render dedicated Admin Command Center layout — gated behind the
  // session check above so no admin data ever loads into the page before login succeeds.
  if (currentPage === 'admin') {
    if (!adminAuthChecked) {
      return <div className="admin-login-shell" />;
    }
    if (!isAdminAuthed) {
      return <AdminLogin onNavigatePublic={handleNavigate} />;
    }
    return (
      <AdminApp
        onNavigatePublic={handleNavigate}
        onViewPublicTracking={handleTrackShipment}
      />
    );
  }

  return (
    <div className="dxp-app-shell">
      <Header
        activePage={currentPage}
        onNavigate={handleNavigate}
      />

      <main className="dxp-main-view">
        {isTrackSearching ? (
          <TrackingLoadingScreen query={trackSearchQuery} />
        ) : (
          <>
        {currentPage === 'home' && (
          <HomePage
            onTrack={handleTrackShipment}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'track' && (
          <TrackPage
            onTrack={handleTrackShipment}
            onNavigate={handleNavigate}
            notFoundQuery={notFoundQuery}
          />
        )}

        {currentPage === 'track-result' && (currentShipment || liveShipment) && (
          <TrackResultPage
            shipment={liveShipment || currentShipment!}
            onTrackAnother={handleTrackShipment}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'quote-result' && currentQuote && (
          <PublicQuoteResultPage
            quote={currentQuote}
            onTrackShipment={handleTrackShipment}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'services' && (
          <ServicesPage onNavigate={handleNavigate} />
        )}

        {currentPage === 'quote' && (
          <QuotePage onNavigate={handleNavigate} initialService={preselectedService} />
        )}

        {currentPage === 'ship' && (
          <ShipPage onTrack={(tn) => handleTrackShipment(tn)} onNavigate={handleNavigate} />
        )}

        {currentPage === 'about' && (
          <AboutPage onNavigate={handleNavigate} />
        )}

        {currentPage === 'help' && (
          <HelpPage onNavigate={handleNavigate} />
        )}

        {currentPage === 'contact' && (
          <ContactPage onNavigate={handleNavigate} />
        )}

        {currentPage === 'legal' && (
          <LegalPage initialSection={legalSection} onNavigate={handleNavigate} />
        )}

        {currentPage === 'locations' && (
          <LocationsPage onNavigate={handleNavigate} />
        )}
          </>
        )}
      </main>

      <Footer
        onNavigate={handleNavigate}
        showTrustStrip={currentPage !== 'track-result'}
      />
    </div>
  );
}

export function App() {
  return (
    <AdminDataProvider>
      <MainAppContent />
    </AdminDataProvider>
  );
}

export default App;

