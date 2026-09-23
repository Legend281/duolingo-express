import React, { useState, useEffect } from 'react';
import {
  Radio,
  Search,
  CheckCircle2,
  MapPin,
  Clock,
  Send,
  Building,
  AlertTriangle,
  Layers,
  ArrowRight,
  Plus,
  Copy,
  Check,
  Edit3,
  ShieldCheck,
  Eye,
  Info,
  Calendar,
  Sparkles,
  Lock,
  RotateCcw,
  X,
  AlertCircle,
  FileText,
  Truck,
  PackageCheck,
  Navigation,
  CornerDownRight,
  HelpCircle,
  Package
} from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext';
import { Shipment, ShipmentStatus, TrackingEvent } from '../../types/shipment';
import { AdminViewType } from '../AdminLayout';
import { resolveLocation, resolveLocationPrecise } from '../../services/geocodingService';
import './TrackingEventsView.css';

// Pre-defined structured standard network locations
const NETWORK_LOCATIONS = [
  { city: 'New York', state: 'NY', timezone: 'ET', facility: 'New York Gateway Facility' },
  { city: 'Newark', state: 'NJ', timezone: 'ET', facility: 'Newark Regional Sort Hub' },
  { city: 'Chicago', state: 'IL', timezone: 'CT', facility: 'Chicago Regional Sort Facility' },
  { city: 'Dallas', state: 'TX', timezone: 'CT', facility: 'Dallas Freight Intermodal Hub' },
  { city: 'Denver', state: 'CO', timezone: 'MT', facility: 'Rocky Mountain Gateway' },
  { city: 'Los Angeles', state: 'CA', timezone: 'PT', facility: 'Los Angeles Metro Sort Hub' },
  { city: 'Seattle', state: 'WA', timezone: 'PT', facility: 'Pacific Northwest Terminal' },
  { city: 'Atlanta', state: 'GA', timezone: 'ET', facility: 'Atlanta Gateway Center' }
];

// Customer-facing message templates for normal customer understanding
const MESSAGE_TEMPLATES: Record<string, string> = {
  ARRIVED: 'Your shipment has arrived at our facility and is continuing toward its destination.',
  DEPARTED: 'Your shipment has departed our location and is en route to the next network gateway.',
  PROCESSING: 'Your shipment is being processed and prepared for scheduled linehaul transit.',
  RECEIVED: 'Shipment received into the Duolingo Express network.',
  SHIPMENT_CREATED: 'Shipment waybill registered and physical piece barcode generated.',
  OUT_FOR_DELIVERY: 'Your shipment is out for delivery with our courier and will be delivered today.',
  DELIVERED: 'Your shipment has been successfully delivered and signed for.',
  DELAYED: 'Your shipment has experienced a temporary transit delay. The estimated delivery schedule has been updated.',
  ON_HOLD: 'Your shipment is temporarily on hold pending delivery window confirmation.',
  EXCEPTION: 'A shipping exception has occurred. Our operations team is actively resolving the movement.'
};

// Helper: Format Date & Time helpers for input fields
const getTodayDateStr = () => new Date().toISOString().split('T')[0];
const getCurrentTimeStr = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  return strTime;
};

// Safe Location Formatter Helper
const formatLocationStr = (loc: any): string => {
  if (!loc) return 'In Transit';
  if (typeof loc === 'string') return loc;
  if (typeof loc === 'object') {
    const city = loc.city || loc.name || '';
    const state = loc.state || '';
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    if (loc.facility) return loc.facility;
  }
  return 'In Transit Hub';
};

// Color Theme Helper for Event Statuses
const getEventTheme = (statusStr?: string, title?: string) => {
  const s = (statusStr || title || '').toUpperCase();
  if (s.includes('DELIVERED')) {
    return { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', text: '#166534', label: 'DELIVERED', theme: 'theme-delivered' };
  }
  if (s.includes('OUT_FOR_DELIVERY') || s.includes('OUT FOR DELIVERY')) {
    return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', text: '#92400e', label: 'OUT FOR DELIVERY', theme: 'theme-out-for-delivery' };
  }
  if (s.includes('DELAY') || s.includes('EXCEPTION') || s.includes('WEATHER')) {
    return { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', label: 'DELAY / EXCEPTION', theme: 'theme-delay' };
  }
  if (s.includes('HOLD')) {
    return { color: '#ea580c', bg: '#fff7ed', border: '#fdba74', text: '#9a3412', label: 'ON HOLD', theme: 'theme-hold' };
  }
  if (s.includes('PROCESSING') || s.includes('SORT')) {
    return { color: '#7c3aed', bg: '#faf5ff', border: '#d8b4fe', text: '#6b21a8', label: 'PROCESSING', theme: 'theme-processing' };
  }
  if (s.includes('DEPARTED')) {
    return { color: '#0284c7', bg: '#f0f9ff', border: '#7dd3fc', text: '#0369a1', label: 'DEPARTED', theme: 'theme-departed' };
  }
  if (s.includes('ARRIVED')) {
    return { color: '#0056d2', bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', label: 'ARRIVED', theme: 'theme-arrived' };
  }
  if (s.includes('RECEIVED')) {
    return { color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', text: '#115e59', label: 'RECEIVED', theme: 'theme-received' };
  }
  return { color: '#475569', bg: '#f8fafc', border: '#cbd5e1', text: '#334155', label: 'SHIPMENT CREATED', theme: 'theme-created' };
};

interface TrackingEventsViewProps {
  onSelectView?: (view: AdminViewType) => void;
}

export const TrackingEventsView: React.FC<TrackingEventsViewProps> = ({ onSelectView }) => {
  const { shipments, addTrackingEvent, updateShipmentStatus, correctTrackingEvent } = useAdminData();

  // Active Shipment Selection (Defaults to Randy's flagship shipment DXP-2026-7K2M9QRX)
  const [selectedTracking, setSelectedTracking] = useState<string>(
    shipments.find(s => s.trackingNumber === 'DXP-2026-7K2M9QRX')?.trackingNumber || shipments[0]?.trackingNumber || ''
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState<boolean>(false);
  const [inspectEvent, setInspectEvent] = useState<TrackingEvent | null>(null);
  const [correctingEvent, setCorrectingEvent] = useState<TrackingEvent | null>(null);

  // Form State: Add Tracking Event (Fully Editable Date & Time!)
  const [formEventStatus, setFormEventStatus] = useState<string>('ARRIVED');
  const [formLocationIndex, setFormLocationIndex] = useState<number>(2); // Chicago
  const [formCustomLocation, setFormCustomLocation] = useState<string>('');
  const [formFacility, setFormFacility] = useState<string>('Chicago Regional Sort Facility');
  const [formCustomerMessage, setFormCustomerMessage] = useState<string>(MESSAGE_TEMPLATES.ARRIVED);
  const [formInternalNote, setFormInternalNote] = useState<string>('Shipment arrived after scheduled departure. Processing for next available movement.');
  const [formDelayReason, setFormDelayReason] = useState<string>('Weather-related transportation delay');
  const [formEventDate, setFormEventDate] = useState<string>(getTodayDateStr());
  const [formEventTime, setFormEventTime] = useState<string>(getCurrentTimeStr());
  const [formTimezone, setFormTimezone] = useState<string>('CT');

  // Form State: Correct / Edit Event (Fully Editable Date & Time!)
  const [correctedLocation, setCorrectedLocation] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('Location was incorrectly recorded during barcode scan.');
  const [correctedCustomerMessage, setCorrectedCustomerMessage] = useState<string>('');
  const [correctedEventDate, setCorrectedEventDate] = useState<string>('');
  const [correctedEventTime, setCorrectedEventTime] = useState<string>('');
  const [correctedTimezone, setCorrectedTimezone] = useState<string>('CT');

  const currentShipment: Shipment | undefined = shipments.find(
    s => s.trackingNumber.toUpperCase() === selectedTracking.toUpperCase()
  );

  const timelineEvents: TrackingEvent[] = currentShipment
    ? (currentShipment.timeline || (currentShipment as any).events || [])
    : [];

  // Snapshot KPIs — gives this page the same at-a-glance stat row as the other admin
  // screens, using metrics relevant to scanning/logging tracking events specifically.
  const inTransitCount = shipments.filter(s =>
    s.status === 'IN_TRANSIT' || s.status === 'OUT_FOR_DELIVERY'
  ).length;
  const totalEventsLogged = shipments.reduce((acc, s) => {
    const events = s.timeline || (s as any).events || [];
    return acc + events.length;
  }, 0);
  const delayedCount = shipments.filter(s =>
    s.status === 'HELD' || s.status === 'EXCEPTION' || s.status === 'ON_HOLD' || s.status === 'DELAYED' || Boolean(s.delayNotice?.hasDelay)
  ).length;

  // Auto-update message template when status changes in Add modal
  const handleStatusChange = (newStatus: string) => {
    setFormEventStatus(newStatus);
    if (MESSAGE_TEMPLATES[newStatus]) {
      setFormCustomerMessage(MESSAGE_TEMPLATES[newStatus]);
    }
  };

  // Auto-update facility & timezone when location selection changes
  const handleLocationChange = (idx: number) => {
    setFormLocationIndex(idx);
    if (idx < NETWORK_LOCATIONS.length) {
      const loc = NETWORK_LOCATIONS[idx];
      setFormFacility(loc.facility);
      setFormTimezone(loc.timezone);
    }
  };

  // Search Filter
  const filteredShipments = shipments.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.trackingNumber.toLowerCase().includes(q) ||
      s.sender.name.toLowerCase().includes(q) ||
      s.recipient.name.toLowerCase().includes(q) ||
      (s.cargoDescription && s.cargoDescription.toLowerCase().includes(q)) ||
      (s.references?.customerReference && s.references.customerReference.toLowerCase().includes(q))
    );
  });

  const handleCopyTracking = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedId(num);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Submit New Tracking Event (With Custom Date & Time)
  const handleAddEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShipment || isSubmittingEvent) return;
    setIsSubmittingEvent(true);

    const isCustom = formLocationIndex === NETWORK_LOCATIONS.length;
    const locCity = isCustom
      ? formCustomLocation.split(',')[0]?.trim() || 'Custom Gateway'
      : NETWORK_LOCATIONS[formLocationIndex].city;
    const locState = isCustom
      ? formCustomLocation.split(',')[1]?.trim() || ''
      : NETWORK_LOCATIONS[formLocationIndex].state;

    // The 8 preset network locations are all major metros already covered instantly by the
    // offline table; a custom-typed location is the case that actually needs the live
    // geocoding fallback, since it could be any town in the country.
    const locGeo = isCustom
      ? await resolveLocationPrecise(formCustomLocation)
      : resolveLocation(`${locCity}, ${locState}`);

    const eventTitleMap: Record<string, string> = {
      ARRIVED: 'Arrived at Facility',
      DEPARTED: 'Departed Facility',
      PROCESSING: 'Processing at Facility',
      RECEIVED: 'Shipment Received',
      SHIPMENT_CREATED: 'Shipment Created',
      OUT_FOR_DELIVERY: 'Out for Final Delivery',
      DELIVERED: 'Shipment Delivered',
      DELAYED: 'Shipment Delayed',
      ON_HOLD: 'Shipment On Hold',
      EXCEPTION: 'Delivery Exception'
    };

    // Format display date
    const parsedDate = new Date(formEventDate + 'T12:00:00');
    const formattedDisplayDate = isNaN(parsedDate.getTime())
      ? new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : parsedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Determine equivalent shipment status. Previously missing ON_HOLD/DEPARTED/
    // SHIPMENT_CREATED branches meant logging one of those events silently set the
    // shipment's actual status to IN_TRANSIT, contradicting the event just recorded.
    let mappedShipmentStatus: ShipmentStatus = 'IN_TRANSIT';
    if (formEventStatus === 'DELIVERED') mappedShipmentStatus = 'DELIVERED';
    else if (formEventStatus === 'OUT_FOR_DELIVERY') mappedShipmentStatus = 'OUT_FOR_DELIVERY';
    else if (formEventStatus === 'DELAYED') mappedShipmentStatus = 'DELAYED';
    else if (formEventStatus === 'EXCEPTION') mappedShipmentStatus = 'EXCEPTION';
    else if (formEventStatus === 'RECEIVED') mappedShipmentStatus = 'RECEIVED';
    else if (formEventStatus === 'PROCESSING') mappedShipmentStatus = 'PROCESSING';
    else if (formEventStatus === 'ARRIVED') mappedShipmentStatus = 'AT_FACILITY';
    else if (formEventStatus === 'ON_HOLD') mappedShipmentStatus = 'ON_HOLD';
    else if (formEventStatus === 'DEPARTED') mappedShipmentStatus = 'DEPARTED_FACILITY';
    else if (formEventStatus === 'SHIPMENT_CREATED') mappedShipmentStatus = 'CREATED';

    const eventTitle = eventTitleMap[formEventStatus] || formEventStatus;

    const newEvent: TrackingEvent = {
      id: `ev-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timezone: formTimezone,
      displayDate: formattedDisplayDate,
      displayTime: `${formEventTime} ${formTimezone}`,
      title: eventTitle,
      status: mappedShipmentStatus,
      eventStatus: formEventStatus,
      location: `${locCity}, ${locState}`,
      facility: formFacility || `${locCity} Gateway`,
      city: locCity,
      state: locState,
      description: formCustomerMessage,
      internalNote: formInternalNote,
      recordedBy: 'Super Admin',
      operatorId: 'Super Admin',
      isCurrent: true,
      isCompleted: true
    };

    // addTrackingEvent already recorded the real event (with this exact title/description)
    // both locally and server-side — this follow-up call exists only to sync the shipment's
    // status/progress/location fields, so it must not create a second, near-identical event
    // on top of the one just added (it used to, making every "Record Event" submission
    // produce two almost-duplicate timeline rows).
    addTrackingEvent(currentShipment.trackingNumber, newEvent);
    updateShipmentStatus(
      currentShipment.trackingNumber,
      mappedShipmentStatus,
      `${locCity}, ${locState}`,
      formFacility,
      formCustomerMessage,
      undefined,
      eventTitle,
      locGeo?.lat,
      locGeo?.lng,
      undefined,
      true, // skipLocalEventDuplicate
      true  // skipServerEventCreation
    );

    setShowAddModal(false);
    setIsSubmittingEvent(false);
    setSuccessToast(`Tracking event "${newEvent.title}" recorded for ${currentShipment.trackingNumber}. Current location updated to ${locCity}, ${locState}.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Submit Event Correction & Time Edit (Preserving Audit Trail)
  const handleCorrectEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingEvent || !currentShipment) return;

    const originalLocation = `${correctingEvent.city}, ${correctingEvent.state}`;
    const originalTime = `${correctingEvent.displayDate} — ${correctingEvent.displayTime}`;
    const newCity = correctedLocation.split(',')[0]?.trim() || correctingEvent.city;
    const newState = correctedLocation.split(',')[1]?.trim() || correctingEvent.state;

    correctTrackingEvent(currentShipment.trackingNumber, correctingEvent.id, {
      city: newCity,
      state: newState,
      displayDate: correctedEventDate || correctingEvent.displayDate,
      displayTime: correctedEventTime ? `${correctedEventTime} ${correctedTimezone}` : correctingEvent.displayTime,
      timezone: correctedTimezone,
      description: correctedCustomerMessage || correctingEvent.description,
      correctionAudit: {
        originalLocation: `${originalLocation} (${originalTime})`,
        originalTitle: correctingEvent.title,
        reason: correctionReason,
        correctedAt: new Date().toLocaleDateString('en-US') + ' ' + new Date().toLocaleTimeString('en-US'),
        operator: 'Super Admin'
      }
    });

    setCorrectingEvent(null);
    setSuccessToast(`Event corrected and audit log preserved. Timestamp & location updated.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="dxp-tracking-events-workspace animate-fade-in">
      {successToast && (
        <div className="tracking-toast-success animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 1. PAGE HEADER */}
      <div className="tracking-page-header">
        <div className="header-title-block">
          <h2>Tracking Events</h2>
          <p>Manage shipment status, location, and chronological tracking history.</p>
        </div>

        {/* Search Input Box */}
        <div className="tracking-search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="tracking-search-input font-mono"
            placeholder="Search tracking #, sender, recipient, city..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. SNAPSHOT KPI ROW (matches Dashboard / Shipments visual language) */}
      <div className="tev-kpi-row">
        <div className="tev-kpi-card">
          <div className="tev-card-header">
            <div className="tev-circle-icon orange">
              <Package size={15} />
            </div>
            <span className="tev-card-label">TRACKABLE SHIPMENTS</span>
          </div>
          <strong className="tev-card-number">{shipments.length}</strong>
          <span className="tev-card-subtext">Available in the scanner</span>
        </div>

        <div className="tev-kpi-card">
          <div className="tev-card-header">
            <div className="tev-circle-icon blue">
              <Truck size={15} />
            </div>
            <span className="tev-card-label">IN TRANSIT NOW</span>
          </div>
          <strong className="tev-card-number">{inTransitCount}</strong>
          <span className="tev-card-subtext">Actively moving</span>
        </div>

        <div className="tev-kpi-card">
          <div className="tev-card-header">
            <div className="tev-circle-icon emerald">
              <Radio size={15} />
            </div>
            <span className="tev-card-label">EVENTS LOGGED</span>
          </div>
          <strong className="tev-card-number">{totalEventsLogged}</strong>
          <span className="tev-card-subtext">Total checkpoint scans</span>
        </div>

        <div className="tev-kpi-card">
          <div className="tev-card-header">
            <div className={`tev-circle-icon ${delayedCount > 0 ? 'red' : 'green'}`}>
              <AlertTriangle size={15} />
            </div>
            <span className="tev-card-label">DELAYED / HELD</span>
          </div>
          <strong className="tev-card-number">{delayedCount}</strong>
          <span className="tev-card-subtext">{delayedCount > 0 ? 'Needs attention' : 'All clear'}</span>
        </div>
      </div>

      {/* 3. QUICK SCENARIO SELECTOR PILLS */}
      {shipments.length > 0 && (
        <div className="shipment-quick-pills-bar">
          <span className="pills-label">Quick Select:</span>
          {filteredShipments.length === 0 ? (
            <span className="pills-label" style={{ fontStyle: 'italic' }}>No shipments match "{searchQuery}".</span>
          ) : (
            filteredShipments.slice(0, 5).map(s => {
              const isSelected = s.trackingNumber.toUpperCase() === selectedTracking.toUpperCase();
              const theme = getEventTheme(s.status, s.statusText);
              return (
                <button
                  key={s.trackingNumber}
                  className={`shipment-quick-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedTracking(s.trackingNumber)}
                >
                  <span className="quick-pill-dot" style={{ backgroundColor: theme.color }} />
                  <strong>{s.trackingNumber}</strong>
                  <span>({s.sender.name} → {s.recipient.name})</span>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* 4. ACTIVE SHIPMENT STATE & IDENTITY BANNER */}
      {currentShipment ? (
        <div className="active-shipment-identity-panel">
          <div className="identity-panel-left">
            <div className="tracking-code-row">
              <span className="shipment-waybill-id font-mono">{currentShipment.trackingNumber}</span>
              <button
                className="copy-waybill-btn"
                onClick={() => handleCopyTracking(currentShipment.trackingNumber)}
                title="Copy tracking number"
              >
                {copiedId === currentShipment.trackingNumber ? (
                  <Check size={14} className="text-emerald" />
                ) : (
                  <Copy size={14} />
                )}
                <span>{copiedId === currentShipment.trackingNumber ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Traditional Code 128 Barcode Simulation (NO QR CODE) */}
            <div className="traditional-barcode-strip">
              <svg className="code128-barcode-svg" viewBox="0 0 260 36">
                <rect x="5" y="2" width="3" height="32" fill="#000000" />
                <rect x="11" y="2" width="2" height="32" fill="#000000" />
                <rect x="16" y="2" width="4" height="32" fill="#000000" />
                <rect x="23" y="2" width="2" height="32" fill="#000000" />
                <rect x="28" y="2" width="5" height="32" fill="#000000" />
                <rect x="36" y="2" width="3" height="32" fill="#000000" />
                <rect x="42" y="2" width="4" height="32" fill="#000000" />
                <rect x="49" y="2" width="2" height="32" fill="#000000" />
                <rect x="54" y="2" width="6" height="32" fill="#000000" />
                <rect x="63" y="2" width="3" height="32" fill="#000000" />
                <rect x="69" y="2" width="4" height="32" fill="#000000" />
                <rect x="76" y="2" width="5" height="32" fill="#000000" />
                <rect x="84" y="2" width="2" height="32" fill="#000000" />
                <rect x="89" y="2" width="5" height="32" fill="#000000" />
                <rect x="97" y="2" width="3" height="32" fill="#000000" />
                <rect x="103" y="2" width="6" height="32" fill="#000000" />
                <rect x="112" y="2" width="2" height="32" fill="#000000" />
                <rect x="117" y="2" width="5" height="32" fill="#000000" />
                <rect x="125" y="2" width="3" height="32" fill="#000000" />
                <rect x="131" y="2" width="6" height="32" fill="#000000" />
                <rect x="140" y="2" width="3" height="32" fill="#000000" />
                <rect x="146" y="2" width="4" height="32" fill="#000000" />
                <rect x="153" y="2" width="5" height="32" fill="#000000" />
                <rect x="161" y="2" width="2" height="32" fill="#000000" />
                <rect x="166" y="2" width="6" height="32" fill="#000000" />
                <rect x="175" y="2" width="3" height="32" fill="#000000" />
                <rect x="181" y="2" width="4" height="32" fill="#000000" />
                <rect x="188" y="2" width="5" height="32" fill="#000000" />
                <rect x="196" y="2" width="2" height="32" fill="#000000" />
                <rect x="201" y="2" width="6" height="32" fill="#000000" />
                <rect x="210" y="2" width="4" height="32" fill="#000000" />
                <rect x="217" y="2" width="2" height="32" fill="#000000" />
                <rect x="222" y="2" width="5" height="32" fill="#000000" />
                <rect x="230" y="2" width="3" height="32" fill="#000000" />
                <rect x="236" y="2" width="6" height="32" fill="#000000" />
                <rect x="245" y="2" width="4" height="32" fill="#000000" />
              </svg>
              <span className="barcode-caption font-mono">{currentShipment.trackingNumber}</span>
            </div>

            {/* Shipment Context: Parties, Cargo, Route */}
            <div className="shipment-meta-summary">
              <div className="meta-pair">
                <span className="m-label">PARTIES</span>
                <strong>{currentShipment.sender?.name || 'Sender'} → {currentShipment.recipient?.name || 'Recipient'}</strong>
              </div>
              <div className="meta-pair">
                <span className="m-label">CARGO</span>
                <strong>{currentShipment.cargoDescription || currentShipment.shipmentType} ({currentShipment.totalWeightLbs} lb)</strong>
              </div>
              <div className="meta-pair">
                <span className="m-label">ROUTE</span>
                <strong>{formatLocationStr(currentShipment.origin)} → {formatLocationStr(currentShipment.destination)}</strong>
              </div>
            </div>
          </div>

          <div className="identity-panel-right">
            <div className="current-state-card">
              <div className="state-badge-row">
                <span className="state-tag-label">CURRENT STATUS</span>
                <span className={`status-pill ${currentShipment.status.toLowerCase().replace(/_/g, '-')}`}>
                  {currentShipment.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="state-badge-row">
                <span className="state-tag-label">CURRENT LOCATION</span>
                <strong className="current-loc-val">
                  <MapPin size={15} className="text-blue" />
                  {formatLocationStr(currentShipment.currentLocation)}
                </strong>
              </div>

              <div className="state-badge-row">
                <span className="state-tag-label">LAST RECORDED MILESTONE</span>
                <span className="last-upd-val font-mono">{currentShipment.lastUpdated}</span>
              </div>

              <button
                className="add-event-primary-btn"
                onClick={() => {
                  setFormEventStatus('ARRIVED');
                  setFormCustomerMessage(MESSAGE_TEMPLATES.ARRIVED);
                  setFormEventDate(getTodayDateStr());
                  setFormEventTime(getCurrentTimeStr());
                  setShowAddModal(true);
                }}
              >
                <Plus size={16} />
                <span>+ Add Tracking Event</span>
              </button>
            </div>
          </div>
        </div>
      ) : shipments.length === 0 ? (
        <div className="no-shipment-selected-card">
          <Package size={32} className="text-slate" />
          <h3>No Shipments to Scan Yet</h3>
          <p>Create a shipment first, then come back here to log checkpoints and status updates.</p>
          {onSelectView && (
            <button className="tev-empty-cta" onClick={() => onSelectView('create-shipment')}>
              <Plus size={15} />
              <span>New Shipment</span>
            </button>
          )}
        </div>
      ) : (
        <div className="no-shipment-selected-card">
          <AlertCircle size={32} className="text-slate" />
          <h3>No Shipment Found</h3>
          <p>Please enter a valid tracking number or select from the quick list above.</p>
        </div>
      )}

      {/* 5. MAIN VERTICAL CHRONOLOGICAL TIMELINE (CENTERPIECE WITH RICH COLORS) */}
      {currentShipment && (
        <div className="tracking-timeline-deck">
          <div className="timeline-deck-header">
            <div className="timeline-title-wrap">
              <h3>Chronological Tracking History</h3>
              <p>Append-only audit trail. Every event color-coded by milestone category.</p>
            </div>
            <div className="timeline-legend-row">
              <span className="legend-chip color-arrived">● In Transit / Arrived</span>
              <span className="legend-chip color-delivered">● Delivered</span>
              <span className="legend-chip color-out">● Out for Delivery</span>
              <span className="legend-chip color-delayed">● Delayed / Hold</span>
            </div>
          </div>

          <div className="vertical-timeline-flow">
            {timelineEvents.map((event, index) => {
              const isLatest = index === 0;
              const theme = getEventTheme(event.eventStatus, event.title);

              return (
                <div
                  key={event.id}
                  className={`timeline-event-node ${isLatest ? 'latest-current' : ''} ${theme.theme}`}
                >
                  {/* Spine Connector Line */}
                  <div className="timeline-spine">
                    <div
                      className={`node-marker ${isLatest ? 'pulse-active' : ''}`}
                      style={{
                        borderColor: theme.color,
                        backgroundColor: theme.bg
                      }}
                    >
                      <div className="inner-dot" style={{ backgroundColor: theme.color }} />
                    </div>
                    {index < timelineEvents.length - 1 && <div className="spine-connector-line" />}
                  </div>

                  {/* Event Content Card with Left Color Accent Ribbon */}
                  <div
                    className="timeline-card-content"
                    style={{
                      borderLeft: `4px solid ${theme.color}`
                    }}
                  >
                    <div className="event-card-head">
                      <div className="event-head-left">
                        <span
                          className="event-status-pill"
                          style={{
                            backgroundColor: theme.bg,
                            color: theme.text,
                            borderColor: theme.border
                          }}
                        >
                          {event.title.toUpperCase()}
                        </span>
                        <strong className="event-location-title">
                          <MapPin size={14} style={{ color: theme.color }} />
                          {event.city}, {event.state}
                        </strong>
                        <span className="event-facility-sub font-mono">• {event.facility}</span>
                      </div>

                      <div className="event-head-right">
                        <div className="event-timestamp font-mono">
                          <Clock size={13} style={{ color: theme.color }} />
                          <span>{event.displayDate} — {event.displayTime}</span>
                        </div>
                        <div className="event-actions-group">
                          <button
                            className="event-action-icon-btn"
                            title="Inspect full details"
                            onClick={() => setInspectEvent(event)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="event-action-icon-btn"
                            title="Edit / Correct this event (Change date, time, location)"
                            onClick={() => {
                              setCorrectingEvent(event);
                              setCorrectedLocation(`${event.city}, ${event.state}`);
                              setCorrectedCustomerMessage(event.description);
                              setCorrectedEventDate(event.displayDate);
                              setCorrectedEventTime(event.displayTime.split(' ')[0] + ' ' + (event.displayTime.split(' ')[1] || ''));
                              setCorrectedTimezone(event.timezone || 'CT');
                            }}
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Customer-Facing Tracking Message */}
                    <div className="customer-facing-box">
                      <span className="box-tag-label" style={{ color: theme.color }}>CUSTOMER-FACING MESSAGE</span>
                      <p className="customer-msg-text">"{event.description}"</p>
                    </div>

                    {/* Internal Operational Note (Admin Only) */}
                    {event.internalNote && (
                      <div className="internal-admin-note-box">
                        <div className="note-head">
                          <Lock size={12} className="text-amber" />
                          <span className="note-label">INTERNAL OPERATIONAL NOTE (PRIVATE)</span>
                        </div>
                        <p className="note-text">{event.internalNote}</p>
                      </div>
                    )}

                    {/* Correction Audit Badge if Event was Corrected */}
                    {event.correctionAudit && (
                      <div className="correction-audit-banner">
                        <AlertTriangle size={13} className="text-amber" />
                        <span>
                          <strong>Edited / Corrected:</strong> Formerly {event.correctionAudit.originalLocation} by {event.correctionAudit.operator}. Reason: {event.correctionAudit.reason}
                        </span>
                      </div>
                    )}

                    {/* Provenance Footer */}
                    <div className="event-provenance-footer">
                      <span>Recorded by: <strong>{event.recordedBy || 'Super Admin'}</strong></span>
                      <span>Audit Milestone ID: <code className="font-mono">{event.id}</code></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==========================================================================
          5. MODAL: ADD TRACKING EVENT (WITH EDITABLE DATE & TIME)
          ========================================================================== */}
      {showAddModal && currentShipment && (
        <div className="tracking-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="tracking-modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="m-title-block">
                <h3>Record Tracking Event</h3>
                <p>Shipment: <strong className="font-mono">{currentShipment.trackingNumber}</strong> ({currentShipment.cargoDescription || currentShipment.shipmentType})</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEventSubmit} className="modal-form-content">
              {/* Event Status Dropdown */}
              <div className="form-group-unit">
                <label>Event Status *</label>
                <select
                  value={formEventStatus}
                  onChange={e => handleStatusChange(e.target.value)}
                  className="modal-select-input"
                >
                  <option value="ARRIVED">Arrived (at Sorting / Linehaul Hub Location)</option>
                  <option value="DEPARTED">Departed (En Route to Next Gateway)</option>
                  <option value="PROCESSING">Processing (Sorting & Staging)</option>
                  <option value="RECEIVED">Received (Physical Tender Verified)</option>
                  <option value="SHIPMENT_CREATED">Shipment Created (Manifest Generated)</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery (Courier Assigned)</option>
                  <option value="DELIVERED">Delivered (Direct Recipient Handover)</option>
                  <option value="DELAYED">Delayed (Weather, Corridor Hold, etc.)</option>
                  <option value="ON_HOLD">On Hold (Customer Instruction / Clearance)</option>
                  <option value="EXCEPTION">Exception (Needs Operational Review)</option>
                </select>
              </div>

              {/* DATE & TIME (NOW FULLY EDITABLE!) */}
              <div className="form-group-unit datetime-editor-box">
                <label className="datetime-box-label">
                  <Calendar size={14} className="text-blue" />
                  <span>Event Date & Time (Editable) *</span>
                </label>
                <div className="input-grid-3">
                  <div className="input-field">
                    <label style={{ fontSize: '0.68rem', color: '#64748b' }}>Date</label>
                    <input
                      type="date"
                      value={formEventDate}
                      onChange={e => setFormEventDate(e.target.value)}
                      className="modal-text-input"
                      required
                    />
                  </div>
                  <div className="input-field">
                    <label style={{ fontSize: '0.68rem', color: '#64748b' }}>Time</label>
                    <input
                      type="text"
                      value={formEventTime}
                      onChange={e => setFormEventTime(e.target.value)}
                      placeholder="e.g. 04:35 PM"
                      className="modal-text-input"
                      required
                    />
                  </div>
                  <div className="input-field">
                    <label style={{ fontSize: '0.68rem', color: '#64748b' }}>Timezone</label>
                    <select
                      value={formTimezone}
                      onChange={e => setFormTimezone(e.target.value)}
                      className="modal-select-input"
                    >
                      <option value="ET">Eastern (ET)</option>
                      <option value="CT">Central (CT)</option>
                      <option value="MT">Mountain (MT)</option>
                      <option value="PT">Pacific (PT)</option>
                      <option value="UTC">UTC / GMT</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Location Selector */}
              <div className="form-group-unit">
                <label>Shipment Physical Location *</label>
                <div className="input-grid-2">
                  <select
                    value={formLocationIndex}
                    onChange={e => handleLocationChange(parseInt(e.target.value))}
                    className="modal-select-input"
                  >
                    {NETWORK_LOCATIONS.map((loc, idx) => (
                      <option key={idx} value={idx}>
                        {loc.city}, {loc.state} ({loc.timezone})
                      </option>
                    ))}
                    <option value={NETWORK_LOCATIONS.length}>Custom Location...</option>
                  </select>

                  <input
                    type="text"
                    value={formFacility}
                    onChange={e => setFormFacility(e.target.value)}
                    placeholder="Specific Facility or Hub Name"
                    className="modal-text-input"
                  />
                </div>

                {formLocationIndex === NETWORK_LOCATIONS.length && (
                  <input
                    type="text"
                    style={{ marginTop: '0.5rem' }}
                    value={formCustomLocation}
                    onChange={e => setFormCustomLocation(e.target.value)}
                    placeholder="Enter City, State (e.g. Phoenix, AZ)"
                    className="modal-text-input"
                  />
                )}
              </div>

              {/* Delay Specifics if Status is Delayed */}
              {(formEventStatus === 'DELAYED' || formEventStatus === 'EXCEPTION') && (
                <div className="form-group-unit delay-highlight-box">
                  <label>Delay / Exception Reason *</label>
                  <select
                    value={formDelayReason}
                    onChange={e => setFormDelayReason(e.target.value)}
                    className="modal-select-input"
                  >
                    <option value="Weather-related transportation delay">Weather-related transportation delay</option>
                    <option value="Intermodal linehaul corridor congestion">Intermodal linehaul corridor congestion</option>
                    <option value="Mechanical vehicle inspection / maintenance">Mechanical vehicle inspection / maintenance</option>
                    <option value="Customer appointment delivery requested">Customer appointment delivery requested</option>
                    <option value="Security / Agricultural inspection clearance">Security / Agricultural inspection clearance</option>
                  </select>
                </div>
              )}

              {/* Customer-Facing Message */}
              <div className="form-group-unit">
                <label>Customer-Facing Message *</label>
                <p className="field-subtext">This message appears directly on the public customer tracking view.</p>
                <textarea
                  rows={3}
                  value={formCustomerMessage}
                  onChange={e => setFormCustomerMessage(e.target.value)}
                  className="modal-textarea"
                />
              </div>

              {/* Internal Operational Note */}
              <div className="form-group-unit">
                <div className="label-with-private-tag">
                  <label>Internal Note (Admin Only)</label>
                  <span className="private-badge">Private</span>
                </div>
                <p className="field-subtext">Will NEVER appear on public tracking. Stored strictly in the admin audit history.</p>
                <input
                  type="text"
                  value={formInternalNote}
                  onChange={e => setFormInternalNote(e.target.value)}
                  placeholder="e.g. Shipment arrived after scheduled departure. Processing for next movement."
                  className="modal-text-input"
                />
              </div>

              {/* Timestamp & Operator Auto-Stamp */}
              <div className="modal-provenance-strip">
                <div className="prov-item">
                  <span className="prov-label">RECORDED BY</span>
                  <strong>Super Admin</strong>
                </div>
                <div className="prov-item">
                  <span className="prov-label">TIMESTAMP STAMP</span>
                  <strong className="font-mono">{formEventDate} · {formEventTime} {formTimezone}</strong>
                </div>
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit-event" disabled={isSubmittingEvent}>
                  <Send size={15} />
                  <span>{isSubmittingEvent ? 'Verifying Location…' : 'Record Tracking Event'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          6. MODAL: EDIT / CORRECT TRACKING EVENT (WITH EDITABLE DATE & TIME)
          ========================================================================== */}
      {correctingEvent && (
        <div className="tracking-modal-backdrop" onClick={() => setCorrectingEvent(null)}>
          <div className="tracking-modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="m-title-block">
                <h3>Edit / Correct Tracking Event</h3>
                <p>Milestone: <strong>{correctingEvent.title}</strong> (Original: {correctingEvent.displayDate} — {correctingEvent.displayTime})</p>
              </div>
              <button className="modal-close-btn" onClick={() => setCorrectingEvent(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCorrectEventSubmit} className="modal-form-content">
              <div className="correction-warning-banner">
                <AlertTriangle size={16} className="text-amber" />
                <div>
                  <strong>Audit Trail Preservation</strong>
                  <p>You can adjust the location, date, time, or message. An audit record of this edit will be saved.</p>
                </div>
              </div>

              {/* DATE & TIME CORRECTION (FULL EDIT CONTROL) */}
              <div className="form-group-unit datetime-editor-box">
                <label className="datetime-box-label">
                  <Calendar size={14} className="text-blue" />
                  <span>Adjust Date & Time *</span>
                </label>
                <div className="input-grid-3">
                  <div className="input-field">
                    <label style={{ fontSize: '0.68rem', color: '#64748b' }}>Date (e.g. August 20, 2026)</label>
                    <input
                      type="text"
                      value={correctedEventDate}
                      onChange={e => setCorrectedEventDate(e.target.value)}
                      placeholder="e.g. August 20, 2026"
                      className="modal-text-input"
                      required
                    />
                  </div>
                  <div className="input-field">
                    <label style={{ fontSize: '0.68rem', color: '#64748b' }}>Time (e.g. 4:35 PM)</label>
                    <input
                      type="text"
                      value={correctedEventTime}
                      onChange={e => setCorrectedEventTime(e.target.value)}
                      placeholder="e.g. 4:35 PM"
                      className="modal-text-input"
                      required
                    />
                  </div>
                  <div className="input-field">
                    <label style={{ fontSize: '0.68rem', color: '#64748b' }}>Timezone</label>
                    <select
                      value={correctedTimezone}
                      onChange={e => setCorrectedTimezone(e.target.value)}
                      className="modal-select-input"
                    >
                      <option value="ET">Eastern (ET)</option>
                      <option value="CT">Central (CT)</option>
                      <option value="MT">Mountain (MT)</option>
                      <option value="PT">Pacific (PT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group-unit">
                <label>Corrected Location (City, State) *</label>
                <input
                  type="text"
                  value={correctedLocation}
                  onChange={e => setCorrectedLocation(e.target.value)}
                  placeholder="e.g. Detroit, MI"
                  className="modal-text-input"
                  required
                />
              </div>

              <div className="form-group-unit">
                <label>Reason for Edit / Correction *</label>
                <input
                  type="text"
                  value={correctionReason}
                  onChange={e => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Timestamp and location adjusted to reflect actual physical arrival."
                  className="modal-text-input"
                  required
                />
              </div>

              <div className="form-group-unit">
                <label>Customer Message (Adjust wording if needed)</label>
                <textarea
                  rows={2}
                  value={correctedCustomerMessage}
                  onChange={e => setCorrectedCustomerMessage(e.target.value)}
                  className="modal-textarea"
                />
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="btn-cancel" onClick={() => setCorrectingEvent(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit-event">
                  <CheckCircle2 size={15} />
                  <span>Save Changes & Log Audit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          7. MODAL: INSPECT EVENT FULL DETAILS
          ========================================================================== */}
      {inspectEvent && (
        <div className="tracking-modal-backdrop" onClick={() => setInspectEvent(null)}>
          <div className="tracking-modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="m-title-block">
                <h3>Event Metadata Inspection</h3>
                <p>Audit ID: <strong className="font-mono">{inspectEvent.id}</strong></p>
              </div>
              <button className="modal-close-btn" onClick={() => setInspectEvent(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="inspect-details-body">
              <div className="inspect-grid-2">
                <div className="inspect-item">
                  <span className="i-label">MILESTONE</span>
                  <strong>{inspectEvent.title}</strong>
                </div>
                <div className="inspect-item">
                  <span className="i-label">EVENT STATUS</span>
                  <span className="font-mono">{inspectEvent.eventStatus || 'ARRIVED'}</span>
                </div>
                <div className="inspect-item">
                  <span className="i-label">RECORDED LOCATION</span>
                  <strong>{inspectEvent.city}, {inspectEvent.state}</strong>
                </div>
                <div className="inspect-item">
                  <span className="i-label">FACILITY / HUB</span>
                  <span>{inspectEvent.facility}</span>
                </div>
                <div className="inspect-item">
                  <span className="i-label">TIMESTAMP</span>
                  <span className="font-mono">{inspectEvent.displayDate} — {inspectEvent.displayTime}</span>
                </div>
                <div className="inspect-item">
                  <span className="i-label">OPERATOR PROVENANCE</span>
                  <strong>{inspectEvent.recordedBy || 'Super Admin'}</strong>
                </div>
              </div>

              <div className="inspect-box">
                <span className="i-label">CUSTOMER-FACING MESSAGE</span>
                <p>"{inspectEvent.description}"</p>
              </div>

              {inspectEvent.internalNote && (
                <div className="inspect-box private">
                  <span className="i-label">INTERNAL OPERATIONAL NOTE</span>
                  <p>{inspectEvent.internalNote}</p>
                </div>
              )}

              {inspectEvent.correctionAudit && (
                <div className="inspect-box correction">
                  <span className="i-label">AUDIT EDIT LOG</span>
                  <p>Edited by {inspectEvent.correctionAudit.operator} at {inspectEvent.correctionAudit.correctedAt}: {inspectEvent.correctionAudit.reason}</p>
                </div>
              )}
            </div>

            <div className="modal-footer-actions">
              <button type="button" className="btn-cancel" onClick={() => setInspectEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
