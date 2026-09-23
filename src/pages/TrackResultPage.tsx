import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Calendar,
  Truck,
  Building2,
  MapPin,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Link2,
  ArrowLeft,
  ArrowRight,
  Headphones,
  Check,
  Phone,
  Mail,
  Search,
  ChevronLeft,
  ChevronRight,
  Radio,
  Clock,
  Compass,
  AlertCircle,
  HelpCircle,
  Car,
  Key,
  Flame,
  FileText,
  Activity,
  Layers,
  Bell,
  Printer,
  Share2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  PawPrint,
  Heart,
  Lock,
  Navigation,
  Zap,
  Maximize2,
  Scale,
  Box,
  Shield,
  Container,
  Stethoscope
} from 'lucide-react';
import { Shipment, TrackingEvent, RouteCheckpoint, ShipmentStatus } from '../types/shipment';
import { Barcode } from '../components/Barcode';
import { USJourneyMap } from '../components/USJourneyMap';
import { SupportModal } from '../components/SupportModal';
import { calculateRouteGeometry } from '../services/routingEngine';
import { simulationEngine } from '../services/simulationEngine';
import { api } from '../services/api';
import { generateShipmentPlan, calculateDynamicTimeProgress, getServiceCommitmentHours } from '../services/planningEngine';
import { resolveLocation } from '../services/geocodingService';
import { applyForwardOnlyShipmentUpdate } from '../utils/shipmentSync';
import './TrackResultPage.css';

interface TrackResultPageProps {
  shipment: Shipment;
  onTrackAnother: (trackingNumber: string) => void;
  onNavigate: (page: string) => void;
}

// Curated authentic vehicle transport inspection & carrier photos (Auto Carrier Logistics)
const DEFAULT_VEHICLE_PHOTOS = [
  '/images/tracking/toyota_tacoma_hero.jpg', // White Toyota Tacoma TRD Pro in scenic outdoor desert/mountain terrain
  'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=800&q=80', // Rear angle
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', // Front grille close-up
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80', // Interior steering wheel & dash
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80', // Interior cabin & seats
  'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=800&q=80', // Cargo bed inspection (+3 overlay)
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80'
];

export const TrackResultPage: React.FC<TrackResultPageProps> = ({
  shipment,
  onTrackAnother,
  onNavigate,
}) => {
  // Continuous real-time synchronized state
  const [liveShipment, setLiveShipment] = useState<Shipment>(shipment);

  useEffect(() => {
    setLiveShipment(prev => applyForwardOnlyShipmentUpdate(prev, shipment));
  }, [shipment]);

  useEffect(() => {
    // Real progress now comes from the server (server/progress.ts), on a schedule, for every
    // viewer — this subscription is just for instant same-session updates an admin makes
    // through the control modal (a manual scrub-to-percentage preview, a delay advisory),
    // broadcast live via localStorage rather than waiting for the next poll. Guarded the same
    // forward-only way as every other entry point below.
    const unsubscribe = simulationEngine.subscribe((updated) => {
      if (updated.trackingNumber.toUpperCase() === (shipment?.trackingNumber || '').toUpperCase()) {
        setLiveShipment(prev => applyForwardOnlyShipmentUpdate(prev, updated));
      }
    });

    return () => unsubscribe();
  }, [shipment?.trackingNumber]);

  useEffect(() => {
    // The server now advances a shipment's real progress on its own over elapsed time
    // (see server/progress.ts) — but an already-open tab has no way to notice that
    // happened without asking again. Periodically re-fetch so genuine background
    // progress becomes visible without requiring a manual page reload.
    const trackingNumber = shipment?.trackingNumber;
    if (!trackingNumber) return;

    const POLL_MS = 8000;
    let stopped = false;
    const interval = setInterval(async () => {
      if (stopped) return;
      try {
        const fresh = await api.trackShipment(trackingNumber);
        if (!fresh) return;
        setLiveShipment(prev => applyForwardOnlyShipmentUpdate(prev, fresh));
      } catch (err: any) {
        if (err?.status === 404) {
          // The shipment behind this tracking number is gone (deleted, or never existed) —
          // retrying every 8 seconds forever can't fix that. Stop; a genuinely new tracking
          // number means a fresh mount of this page anyway (new trackingNumber dependency).
          stopped = true;
          clearInterval(interval);
        }
        // Any other error: silent, a failed background refresh shouldn't disrupt the page.
      }
    }, POLL_MS);

    return () => { stopped = true; clearInterval(interval); };
  }, [shipment?.trackingNumber]);

  const [searchInput, setSearchInput] = useState('');
  const [supportOpen, setSupportOpen] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [showEarlierEvents, setShowEarlierEvents] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [alertPhone, setAlertPhone] = useState('');
  const [alertEmail, setAlertEmail] = useState('');
  const [alertSuccess, setAlertSuccess] = useState(false);

  // Safe field extraction from synchronized liveShipment
  const trackingNum = liveShipment?.trackingNumber || shipment?.trackingNumber || 'DXP-2026-7KZM9QRX';
  const status = liveShipment?.status || 'IN_TRANSIT';
  const isDelivered = status === 'DELIVERED';
  const isException = status === 'EXCEPTION' || status === 'DELAYED';
  const isHold = status === 'ON_HOLD' || status === 'HELD';
  const isDelayed = status === 'DELAYED';
  const isOutForDelivery = status === 'OUT_FOR_DELIVERY';
  // Single canonical status label, reused everywhere the page shows the shipment's current
  // status. This used to be five separate copies of the same ternary chain, each of which
  // only special-cased HOLD/DELAYED/DELIVERED and collapsed every other real status —
  // RECEIVED, PROCESSING, AT_FACILITY, DEPARTED_FACILITY, DESTINATION_PROCESSING, even
  // OUT_FOR_DELIVERY — down to "In Transit", so a shipment that hadn't even been picked up
  // yet was labeled "In Transit" throughout the page.
  const statusDisplayLabel = isHold
    ? 'On Hold'
    : isDelayed
    ? 'Transit Delayed'
    : status === 'DELIVERED'
    ? 'Delivered'
    : isOutForDelivery
    ? 'Out for Delivery'
    : status === 'RECEIVED'
    ? 'Received at Origin'
    : status === 'PROCESSING' || status === 'AT_FACILITY'
    ? 'At Facility'
    : status === 'DEPARTED_FACILITY'
    ? 'Departed Facility'
    : status === 'DESTINATION_PROCESSING'
    ? 'At Destination Facility'
    : status === 'EXCEPTION'
    ? 'Exception'
    : 'In Transit';
  // The flagship demo tracking number describes a "Toyota Tacoma Front Bumper" freight
  // shipment (an auto part, not the whole vehicle) and deliberately shows illustrative
  // vehicle photos for it throughout this page — computed early so isVehicle below can use
  // it (was previously defined further down, after isVehicle already needed it).
  // Matched on tracking number ONLY. This used to also match any shipment whose
  // cargoDescription merely contained the word "tacoma" or "bumper" — which meant a real,
  // unrelated Parcel shipment (e.g. someone actually shipping a truck bumper part) got its
  // real type/weight/dimensions/coordinates silently replaced by this demo's hardcoded
  // values below. Only the one literal flagship tracking number should ever trigger this.
  const isFlagshipTacoma = trackingNum.includes('7K2M9QRX') || trackingNum.includes('7KZM9QRX');
  // Was hardcoded `|| true`, making this evaluate true for every shipment regardless of
  // real type — a plain Parcel shipment would show "Vehicle Photos" with a stock Toyota
  // Tacoma image. That trailing `|| true` is why. isFlagshipTacoma is kept as its own,
  // deliberate exception (see above) rather than removed along with the blanket `|| true`.
  const isVehicle = liveShipment?.shipmentType === 'Vehicle' || !!liveShipment?.vehicleDetails || isFlagshipTacoma;
  const isPet = liveShipment?.shipmentType === 'Pets' || !!liveShipment?.petDetails;
  const pet = liveShipment?.petDetails;
  
  const originCity = liveShipment?.origin?.city || shipment?.origin?.city || 'New York';
  const originState = liveShipment?.origin?.state || shipment?.origin?.state || 'NY';
  const originZip = (liveShipment?.origin as any)?.zip || (shipment?.origin as any)?.zip || '10005';
  const destCity = liveShipment?.destination?.city || shipment?.destination?.city || 'Los Angeles';
  const destState = liveShipment?.destination?.state || shipment?.destination?.state || 'CA';
  const destZip = (liveShipment?.destination as any)?.zip || (shipment?.destination as any)?.zip || '90071';
  const originFacility = (liveShipment?.origin as any)?.facilityName || (shipment?.origin as any)?.facilityName || `${originCity} Gateway Terminal`;
  const destFacility = (liveShipment?.destination as any)?.facilityName || (shipment?.destination as any)?.facilityName || `${destCity} Distribution Center`;

  const statusHeroHeading = isHold
    ? 'Shipment on Hold'
    : (isDelayed || shipment.delayNotice?.hasDelay)
    ? 'Transit Delay Advisory'
    : status === 'DELIVERED'
    ? 'Shipment Delivered'
    : isOutForDelivery
    ? 'Out for Delivery Today'
    : status === 'RECEIVED'
    ? 'Shipment Received at Origin'
    : status === 'PROCESSING' || status === 'AT_FACILITY' || status === 'DEPARTED_FACILITY' || status === 'DESTINATION_PROCESSING'
    ? 'Shipment At Facility'
    : 'Shipment In Transit';

  const statusHeroSub = isHold
    ? `Your shipment is on hold. We'll update this page once it resumes movement.`
    : status === 'DELIVERED'
    ? `Your package was delivered to ${destCity}, ${destState}.`
    : isOutForDelivery
    ? `Your package is out for delivery today in ${destCity}, ${destState}.`
    : status === 'RECEIVED'
    ? `Your package has been received and is awaiting pickup for transit to ${destCity}, ${destState}.`
    : `Your package is on its way to ${destCity}, ${destState}.`;

  const currentCity = typeof liveShipment?.currentLocation === 'string'
    ? liveShipment.currentLocation.split(',')[0].trim()
    : (typeof liveShipment?.currentLocation === 'object' && (liveShipment.currentLocation as any)?.city) || (typeof shipment?.currentLocation === 'object' && (shipment?.currentLocation as any)?.city) || 'Chicago';
    
  const currentState = typeof liveShipment?.currentLocation === 'string'
    ? liveShipment.currentLocation.split(',')[1]?.trim() || originState
    : (typeof liveShipment?.currentLocation === 'object' && (liveShipment.currentLocation as any)?.state) || (typeof shipment?.currentLocation === 'object' && (shipment?.currentLocation as any)?.state) || 'IL';

  const currentLocationText = `${currentCity}, ${currentState}`;

  // Real coordinates for wherever the shipment's currentLocation actually points — an
  // admin-set facility or a live simulation tick, both now kept accurate (see the routing
  // fixes above). USJourneyMap uses these to plot the vehicle marker for real instead of
  // guessing a point from progress % alone.
  const currentLat = typeof liveShipment?.currentLocation === 'object'
    ? (liveShipment.currentLocation as any)?.lat
    : (typeof shipment?.currentLocation === 'object' ? (shipment?.currentLocation as any)?.lat : undefined);
  const currentLng = typeof liveShipment?.currentLocation === 'object'
    ? (liveShipment.currentLocation as any)?.lng
    : (typeof shipment?.currentLocation === 'object' ? (shipment?.currentLocation as any)?.lng : undefined);

  // "Just now" is a real, valid value (the shipment really was just touched) — it just isn't
  // a displayable date/time on its own. This used to reject it and substitute a hardcoded
  // fake past date instead of formatting the actual current moment it stands in for.
  const lastUpdated = typeof liveShipment?.lastUpdated === 'string' && liveShipment.lastUpdated !== 'Just now'
    ? liveShipment.lastUpdated
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const estDeliveryDate = typeof liveShipment?.estimatedDelivery === 'string'
    ? liveShipment.estimatedDelivery
    : (typeof liveShipment?.estimatedDelivery === 'object' && (liveShipment.estimatedDelivery as any)?.date) || 'Wednesday, August 22';

  const estDeliveryTime = typeof liveShipment?.estimatedDeliveryDetail === 'string'
    ? liveShipment.estimatedDeliveryDetail
    : (typeof liveShipment?.estimatedDelivery === 'object' && (liveShipment.estimatedDelivery as any)?.timeWindow) || 'by the end of day';

  const service = liveShipment?.service || shipment?.service || 'Express';

  // Real shipment data always wins here now — these hardcoded values are only the
  // ultimate fallback when no real data exists at all (e.g. the flagship demo's own mock
  // record, which sets its own real weight/dimensions/type and no longer gets overridden).
  const cargoType = liveShipment?.shipmentType || 'Freight';
  const cargoDescription = liveShipment?.cargoDescription || shipment?.cargoDescription || 'Toyota Tacoma Front Bumper';
  const shipmentType = cargoType === 'Vehicle' ? 'Freight' : cargoType;
  const transportType = 'Open Auto Carrier';
  const totalWeight = Number(liveShipment?.totalWeightLbs || shipment?.totalWeightLbs || 435.0);
  const totalPieces = Number(shipment?.totalPieces || 1);
  const dimensions = liveShipment?.dimensions || shipment?.dimensions || { length: 60, width: 20, height: 15 };

  // Vehicle data with safe defaults
  const vehicle = shipment?.vehicleDetails || {
    make: 'Toyota',
    model: 'Tacoma',
    year: 2024,
    vin: '4T1BK1EB7RU128940',
    color: 'Magnetic Grey Metallic',
    bodyType: 'Pickup Truck',
    condition: 'Running',
    operable: true,
    licensePlate: 'N/A',
    keys: true,
    fuelType: 'Gasoline'
  };

  // Parties data with verified authentic logistics information
  const senderName = shipment?.sender?.name || 'Randy';
  const senderCompany = shipment?.sender?.company || 'Apex Auto Design & Fabrication';
  const senderAddress = shipment?.sender?.addressLine || '123 Main Street, Suite 400';
  const senderPhone = shipment?.sender?.phone || '+1 (212) 555-0198';

  const recipientName = shipment?.recipient?.name || 'Daniel';
  const recipientCompany = shipment?.recipient?.company || 'Pacific Genomics Institute';
  const recipientAddress = shipment?.recipient?.addressLine || '654 Sunset Boulevard';
  const recipientPhone = shipment?.recipient?.phone || '+1 (310) 555-0144';

  const originGeo = resolveLocation([originCity, originState].filter(Boolean).join(', ')) || resolveLocation(originCity) || resolveLocation(originState) || { lat: 40.7128, lng: -74.0050 };
  const currentGeo = resolveLocation([currentCity, currentState].filter(Boolean).join(', ')) || resolveLocation(currentCity) || resolveLocation(currentState) || { lat: 41.8781, lng: -87.6298 };
  const destGeo = resolveLocation([destCity, destState].filter(Boolean).join(', ')) || resolveLocation(destCity) || resolveLocation(destState) || { lat: 34.0522, lng: -118.2437 };

  const routeCheckpoints: RouteCheckpoint[] = [
    {
      id: 'pt-origin',
      name: originCity,
      state: originState,
      type: 'origin',
      statusLabel: 'Origin',
      dateLabel: 'Aug 19 · 9:00 AM ET',
      lat: (liveShipment?.origin as any)?.lat || (shipment?.origin as any)?.lat || originGeo.lat,
      lng: (liveShipment?.origin as any)?.lng || (shipment?.origin as any)?.lng || originGeo.lng,
    },
    {
      id: 'pt-current',
      name: currentCity,
      state: currentState,
      type: 'current',
      statusLabel: 'Current Location',
      dateLabel: 'Aug 21 · 7:35 PM ET',
      lat: (liveShipment?.currentLocation as any)?.lat || currentGeo.lat,
      lng: (liveShipment?.currentLocation as any)?.lng || currentGeo.lng,
    },
    {
      id: 'pt-dest',
      name: destCity,
      state: destState,
      type: 'destination',
      statusLabel: 'Destination',
      dateLabel: `${estDeliveryDate} • ${estDeliveryTime}`,
      lat: (liveShipment?.destination as any)?.lat || (shipment?.destination as any)?.lat || destGeo.lat,
      lng: (liveShipment?.destination as any)?.lng || (shipment?.destination as any)?.lng || destGeo.lng,
    }
  ];

  // Timeline events
  const defaultEvents: TrackingEvent[] = [
    {
      id: 'e-1',
      timestamp: '2026-08-21T19:35:00Z',
      timezone: 'ET',
      displayDate: 'Aug 21, 2026',
      displayTime: '7:35 PM ET',
      title: 'Departed Facility',
      facility: `${originCity} Regional Processing Center`,
      city: originCity,
      state: originState,
      description: `${isVehicle ? 'Vehicle' : 'Cargo'} processed and departed ${originCity} facility; is moving along verified interstate corridor toward ${destCity}.`,
      isCurrent: true,
      isCompleted: true
    },
    {
      id: 'e-2',
      timestamp: '2026-08-21T17:12:00Z',
      timezone: 'ET',
      displayDate: 'Aug 21, 2026',
      displayTime: '5:12 PM ET',
      title: 'Processed at Facility',
      facility: `${originCity} Inbound Sort Gateway`,
      city: originCity,
      state: originState,
      description: `${isVehicle ? 'Vehicle' : 'Cargo'} processed and cleared for linehaul departure.`,
      isCurrent: false,
      isCompleted: true
    },
    {
      id: 'e-3',
      timestamp: '2026-08-20T09:00:00Z',
      timezone: 'ET',
      displayDate: 'Aug 20, 2026',
      displayTime: '9:00 AM ET',
      title: 'Arrived at Facility',
      facility: `${originCity} Freight Logistics Terminal`,
      city: originCity,
      state: originState,
      description: `${isVehicle ? 'Vehicle' : 'Cargo'} arrived at ${originCity} terminal facility for staging.`,
      isCurrent: false,
      isCompleted: true
    },
    {
      id: 'e-4',
      timestamp: '2026-08-19T13:12:00Z',
      timezone: 'ET',
      displayDate: 'Aug 19, 2026',
      displayTime: '1:12 PM ET',
      title: 'Picked Up',
      facility: `${originCity} Tender Location`,
      city: originCity,
      state: originState,
      description: `${isVehicle ? 'Vehicle physically received and keys collected from sender.' : 'Cargo tendered and physically ingested from shipper.'}`,
      isCurrent: false,
      isCompleted: true
    },
    {
      id: 'e-5',
      timestamp: '2026-08-19T09:30:00Z',
      timezone: 'ET',
      displayDate: 'Aug 19, 2026',
      displayTime: '9:30 AM ET',
      title: 'Shipment Record Created',
      facility: 'Super Admin Operations Desk',
      city: originCity,
      state: originState,
      description: 'Consignment manifest generated and barcode applied.',
      isCurrent: false,
      isCompleted: true
    }
  ];

  const rawEventsList: TrackingEvent[] = (liveShipment?.timeline && liveShipment.timeline.length > 0)
    ? liveShipment.timeline
    : (shipment?.timeline && shipment.timeline.length > 0)
    ? shipment.timeline
    : (liveShipment?.events && liveShipment.events.length > 0)
    ? liveShipment.events
    : (shipment?.events && shipment.events.length > 0)
    ? shipment.events
    : defaultEvents;

  // Gallery Photos (Ensure Tacoma/Flagship 9-photo inspection gallery is rendered)
  const vehiclePhotos = isFlagshipTacoma
    ? DEFAULT_VEHICLE_PHOTOS
    : (shipment?.vehicleDetails?.photos && shipment.vehicleDetails.photos.length > 0)
    ? shipment.vehicleDetails.photos
    : (shipment?.photos && shipment.photos.length > 0)
    ? shipment.photos
    : DEFAULT_VEHICLE_PHOTOS;

  const handleCopyTrackingNumber = () => {
    navigator.clipboard.writeText(trackingNum);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  const handleCopyShareableLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/track/${trackingNum}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onTrackAnother(searchInput.trim());
    }
  };

  const nextPhoto = () => {
    setActivePhotoIdx((prev) => (prev + 1) % vehiclePhotos.length);
  };

  const prevPhoto = () => {
    setActivePhotoIdx((prev) => (prev - 1 + vehiclePhotos.length) % vehiclePhotos.length);
  };

  // Automated routing & planned milestone calculations
  const routeGeom = calculateRouteGeometry(
    { lat: (liveShipment?.origin as any)?.lat || (shipment?.origin as any)?.lat || originGeo.lat, lng: (liveShipment?.origin as any)?.lng || (shipment?.origin as any)?.lng || originGeo.lng, name: originCity },
    { lat: (liveShipment?.destination as any)?.lat || (shipment?.destination as any)?.lat || destGeo.lat, lng: (liveShipment?.destination as any)?.lng || (shipment?.destination as any)?.lng || destGeo.lng, name: destCity }
  );

  const timeProgress = calculateDynamicTimeProgress(liveShipment || shipment, 48);

  // NOTE: progressPercent intentionally does NOT blend in timeProgress.progressPercent via
  // Math.max() here. timeProgress is a wall-clock estimate (elapsed real time since the
  // shipment's first event vs. its SLA window) — for demo data with fixed past dates, that
  // ratio only ever climbs and permanently pins near its 94% ceiling well after the SLA
  // window has passed, silently overriding whatever progress the simulation/admin actually
  // set. The real, admin-controllable progressPercent is the source of truth; timeProgress
  // is used only as a last-resort fallback when no real value exists at all.
  const progressPercent = status === 'DELIVERED'
    ? 100
    : isHold
    ? (liveShipment?.frozenProgressPercent ?? shipment?.frozenProgressPercent ?? shipment?.progressPercent ?? 35)
    : String(status) === 'CREATED' || String(status) === 'AWAITING_PICKUP' || String(status) === 'BOOKED'
    ? 0
    : (liveShipment as any)?.progressPercent !== undefined
    ? (liveShipment as any).progressPercent
    : (shipment as any)?.progressPercent !== undefined
    ? (shipment as any).progressPercent
    : timeProgress.progressPercent;

  // Anchor the planned-milestone timeline to this shipment's real, already-stored estimated
  // delivery date (working backward by the service SLA window) instead of deriving forward
  // from "right now" — otherwise the 6-stage timeline's own final "Delivered" milestone date
  // would silently drift out of sync with the ETA already shown in the header/summary cards,
  // the same class of self-contradicting-date bug this timeline replacement was meant to fix.
  const slaHoursForPlan = getServiceCommitmentHours(service, routeGeom.distanceMiles);
  const parsedEstDelivery = new Date(estDeliveryDate);
  const planPickupDateStr = !isNaN(parsedEstDelivery.getTime())
    ? new Date(parsedEstDelivery.getTime() - slaHoursForPlan * 3600 * 1000).toISOString()
    : undefined;

  const plan = generateShipmentPlan(
    { city: originCity, state: originState },
    { city: destCity, state: destState },
    service,
    routeGeom.distanceMiles,
    planPickupDateStr,
    rawEventsList,
    status as ShipmentStatus,
    progressPercent
  );

  const eventsList: TrackingEvent[] = useMemo(() => {
    let sourceList = [...rawEventsList];
    if (status === 'DELIVERED') {
      const hasDelivered = sourceList.some(e => e.status === 'DELIVERED' || e.title.toLowerCase().includes('delivered'));
      if (!hasDelivered) {
        const lastUp = typeof liveShipment?.lastUpdated === 'string' && liveShipment.lastUpdated.includes('·')
          ? liveShipment.lastUpdated
          : 'Today · Delivery Verified';
        const parts = lastUp.split('·');
        const dStr = parts[0]?.trim() || 'Today';
        const tStr = parts[1]?.trim() || 'Delivery Verified';

        const delEvent: TrackingEvent = {
          id: 'auto-delivered-scan',
          timestamp: new Date().toISOString(),
          timezone: 'ET',
          displayDate: dStr,
          displayTime: tStr,
          title: `Delivered to Consignee — ${destCity}, ${destState}`,
          facility: `${destCity} Consignee Delivery Address`,
          city: destCity,
          state: destState,
          description: `Consignment successfully delivered into the custody of ${liveShipment?.recipient?.name || shipment?.recipient?.name || 'authorized recipient'}. Proof of delivery confirmed.`,
          isCurrent: true,
          isCompleted: true,
          operatorId: 'Final Mile Courier'
        };

        sourceList = [delEvent, ...sourceList];
      }
    }

    // Intelligent Deduplication: Filter out rapid tick artifacts & repetitive status pings
    const seenSignatures = new Set<string>();
    const cleaned: TrackingEvent[] = [];

    for (const evt of sourceList) {
      // Normalize signature: event title without non-alphanumeric noise + city
      const normTitle = (evt.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const normCity = (evt.city || '').trim().toLowerCase();
      const sig = `${normTitle}_${normCity}`;
      
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        cleaned.push(evt);
      }
      // Maximum realistic milestone checkpoints for any domestic highway consignment
      if (cleaned.length >= 8) break;
    }

    return cleaned.length > 0 ? cleaned : defaultEvents;
  }, [status, rawEventsList, destCity, destState, liveShipment, shipment, defaultEvents]);

  // The primary 6-stage timeline, derived from `plan.plannedMilestones` (see the
  // generateShipmentPlan call above) — genuinely computed from this shipment's real pickup
  // date, real service-level SLA window, and real confirmed events/progress, instead of a
  // fixed "Aug 21-23, 2026" mockup timeline that used to render identically for every
  // shipment regardless of when it was actually created or what had actually happened to it.
  const referenceTimelineEvents = useMemo(() => {
    const milestones = plan.plannedMilestones;
    const lastConfirmedIndex = milestones.reduce(
      (acc, m, idx) => (m.milestoneState === 'CONFIRMED' ? idx : acc),
      -1
    );
    return milestones.map((m, idx) => ({
      id: m.id,
      title: m.stageName,
      dateStr: m.plannedDateTime,
      location: m.location,
      statusType: (idx === lastConfirmedIndex && status !== 'DELIVERED')
        ? ('current' as const)
        : m.milestoneState === 'CONFIRMED'
          ? ('confirmed' as const)
          : ('estimated' as const),
      description: m.description
    }));
  }, [plan.plannedMilestones, status]);

  const scrollToTimeline = () => {
    const el = document.getElementById('shipment-timeline-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubscribeAlerts = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertSuccess(true);
    setTimeout(() => {
      setAlertSuccess(false);
      setAlertsModalOpen(false);
    }, 2000);
  };

  return (
    <div className="dxp-redesign-tracking-page animate-fade-in">
      {/* =========================================================================
          0. CINEMATIC HERO BANNER (DUSK HIGHWAY WITH BRANDED SEMI-TRUCK)
          ========================================================================= */}
      <section className="dxp-cinematic-hero-section">
        <div className="dxp-hero-backdrop-img">
          <img
            src="/images/tracking/truck_highway_hero.jpg"
            alt="Duolingo Express Commercial Linehaul Highway Hauler"
            className="hero-bg-photo"
          />
          <div className="dxp-hero-overlay" />
        </div>

        <div className="dxp-hero-content-wrap">
          {/* Top Breadcrumb & Status */}
          <div className="dxp-hero-top-bar">
            <button
              type="button"
              className="hero-back-link"
              onClick={() => onNavigate('track')}
            >
              <ArrowLeft size={16} />
              <span>Back to Shipments</span>
            </button>
          </div>

          <div className="hero-status-pill-wrap">
            <span className={`hero-live-status-pill ${isHold ? 'hold' : isDelayed ? 'delayed' : status === 'DELIVERED' ? 'delivered' : 'in-transit'}`}>
              <span className="hero-live-dot" />
              {statusDisplayLabel.toUpperCase()}
            </span>
          </div>

          <h1 className="hero-tracking-number font-mono">{trackingNum}</h1>
          <h2 className="hero-cargo-title">{cargoDescription}</h2>

          <div className="hero-route-strip">
            <div className="hero-route-stop">
              <MapPin size={16} className="text-blue" />
              <span>{originCity}, {originState}</span>
            </div>
            <ArrowRight size={14} className="hero-route-arrow" />
            <div className="hero-route-stop">
              <MapPin size={16} className="text-blue" />
              <span>{destCity}, {destState}</span>
            </div>
          </div>

          {/* Floating Frosted Dark Metrics Bar */}
          <div className="hero-floating-metrics-bar">
            <div className="hero-metric-cell">
              <div className="hero-metric-icon amber">
                <Zap size={18} />
              </div>
              <div className="hero-metric-text">
                <span className="hero-metric-lbl">Service Level</span>
                <strong className="hero-metric-val">{service} (24h)</strong>
              </div>
            </div>

            <div className="hero-metric-sep" />

            <div className="hero-metric-cell">
              <div className="hero-metric-icon amber">
                <Calendar size={18} />
              </div>
              <div className="hero-metric-text">
                <span className="hero-metric-lbl">Est. Delivery</span>
                <strong className="hero-metric-val">{estDeliveryDate} · {estDeliveryTime}</strong>
              </div>
            </div>

            <div className="hero-metric-sep" />

            <div className="hero-metric-cell">
              <div className="hero-metric-icon amber">
                <Truck size={18} />
              </div>
              <div className="hero-metric-text">
                <span className="hero-metric-lbl">Distance</span>
                <strong className="hero-metric-val">{routeGeom.distanceMiles.toLocaleString()} miles</strong>
              </div>
            </div>

            <div className="hero-metric-sep" />

            <div className="hero-metric-cell">
              <div className="hero-metric-icon emerald">
                <Activity size={18} />
              </div>
              <div className="hero-metric-text">
                <span className="hero-metric-lbl">Current Status</span>
                <strong className="hero-metric-val text-emerald">
                  {statusDisplayLabel}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <div className="dxp-track-container">
        {/* RTO Alert (If active) */}
        {shipment?.returnLeg && (
          <div className="rto-active-advisory-banner animate-fade-in">
            <RotateCcw size={18} className="text-amber" />
            <div>
              <strong>Return to Origin In Progress ({shipment.returnLeg.reason})</strong>
              <p>Consignment journey reversed back to sender at {originCity}, {originState}. Return tracking: <span className="font-mono">{shipment.returnLeg.returnTrackingNumber}</span></p>
            </div>
          </div>
        )}

        {/* =========================================================================
            1. WHITE CONSIGNMENT SUMMARY CARD (3 COLUMNS + CORRIDOR RAIL)
            ========================================================================= */}
        <section className="dxp-hero-summary-card">
          <div className="hero-summary-grid">
            {/* Column 1: Tracking Number & Barcode */}
            <div className="hero-col-barcode">
              <span className="hero-col-label">Tracking Number</span>
              <div className="tracking-number-row">
                <h3 className="tracking-number-val font-mono">{trackingNum}</h3>
                <button
                  type="button"
                  className="copy-btn-inline"
                  onClick={handleCopyTrackingNumber}
                  title="Copy Tracking Number"
                >
                  {copiedNumber ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
                </button>
              </div>

              {/* Code 128 Linear Barcode */}
              <div className="hero-barcode-container">
                <Barcode
                  value={trackingNum}
                  height={54}
                  width={1.5}
                  fontSize={11}
                  displayValue={true}
                />
              </div>
            </div>

            {/* Column 2: Current Status & Details */}
            <div className="hero-col-status">
              <span className="hero-col-label">Current Status</span>
              <div className="status-badge-wrap">
                <span className={`status-pill-in-transit ${isHold ? 'hold' : (isDelayed || shipment.delayNotice?.hasDelay) ? 'delayed' : ''}`}>
                  <span className="pill-dot-pulse" />
                  {statusDisplayLabel.toUpperCase()}
                </span>
              </div>
              <h2 className="status-hero-heading">
                {statusHeroHeading}
              </h2>
              <p className="status-hero-sub">
                {statusHeroSub}
              </p>

              <div className="last-recorded-checkpoint-box">
                <span className="chk-label">LAST RECORDED CHECKPOINT</span>
                <span className="chk-val">{currentCity}, {currentState} ({lastUpdated})</span>
              </div>

              <div className="on-schedule-chip">
                <CheckCircle2 size={14} className="text-emerald" />
                <span>On schedule — Estimated delivery remains unchanged.</span>
              </div>
            </div>

            {/* Column 3: Estimated Delivery & Meta Specs */}
            <div className="hero-col-eta-specs">
              <span className="hero-col-label">ESTIMATED DELIVERY</span>
              <div className="eta-highlight-box">
                <div className="eta-date-row">
                  <Calendar size={22} className="text-blue" />
                  <div>
                    <strong>{estDeliveryDate}</strong>
                    <small>by the end of day</small>
                  </div>
                </div>
                <span className="on-schedule-pill">
                  <CheckCircle2 size={13} />
                  <span>On Schedule</span>
                </span>
              </div>

              {/* Meta Specs Table */}
              <div className="hero-specs-mini-table">
                <div className="spec-item-row">
                  <span className="s-lbl">Service Level:</span>
                  <span className="s-val">{service} (24h)</span>
                </div>
                <div className="spec-item-row">
                  <span className="s-lbl">Shipment Type:</span>
                  <span className="s-val">{shipmentType}</span>
                </div>
                {isVehicle && (
                <div className="spec-item-row">
                  <span className="s-lbl">Transport Type:</span>
                  <span className="s-val">{transportType}</span>
                </div>
                )}
                <div className="spec-item-row">
                  <span className="s-lbl">Total Weight:</span>
                  <span className="s-val">{totalWeight.toLocaleString()} lbs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Highway Corridor Transit Rail */}
          <div className="hero-corridor-journey-strip">
            <div className="corridor-point origin">
              <div className="corridor-point-icon">
                <Navigation size={16} />
              </div>
              <div className="corridor-point-text">
                <span className="corridor-label">ORIGIN TERMINAL</span>
                <strong className="corridor-city">{originCity}, {originState}</strong>
                <small className="corridor-facility">{originFacility}</small>
              </div>
            </div>

            <div className="corridor-track-wrapper">
              <div className="corridor-meta-badges">
                <span className="corridor-dist-badge">
                  <span>{routeGeom.distanceMiles.toLocaleString()} Total Highway Miles</span>
                </span>
                <span className="corridor-status-badge">
                  {status === 'DELIVERED' ? (
                    <span className="text-emerald font-bold">✓ 100% Completed</span>
                  ) : (
                    <span>● {progressPercent}% Completed</span>
                  )}
                </span>
                <span className="corridor-sla-badge">
                  <span>{statusDisplayLabel}</span>
                </span>
              </div>
              <div className="corridor-progress-rail">
                <div 
                  className={`corridor-progress-fill ${status === 'DELIVERED' ? 'delivered' : ''}`}
                  style={{ width: `${Math.min(Math.max(progressPercent, 5), 100)}%` }}
                >
                  <span className="corridor-hauler-indicator" title={`${progressPercent}% progress`}>
                    🚛
                  </span>
                </div>
              </div>
            </div>

            <div className="corridor-point destination">
              <div className="corridor-point-icon dest">
                <MapPin size={16} />
              </div>
              <div className="corridor-point-text">
                <span className="corridor-label">FINAL DESTINATION</span>
                <strong className="corridor-city">{destCity}, {destState}</strong>
                <small className="corridor-facility">{destFacility}</small>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. FULL-WIDTH INTERACTIVE HIGHWAY ROUTE MAP
            ========================================================================= */}
        <section className="dxp-route-map-section">
          <USJourneyMap
            checkpoints={routeCheckpoints}
            currentLocationText={currentLocationText}
            currentLat={currentLat}
            currentLng={currentLng}
            lastEventDescription={`${isVehicle ? 'Vehicle' : 'Shipment'} — ${timeProgress.activeMilestoneStage} toward ${destCity}.`}
            totalDistance={`${routeGeom.distanceMiles.toLocaleString()} miles`}
            transitTime={`${plan.serviceCommitmentHours} Hours`}
            progressPercent={progressPercent}
            shipmentStatus={status}
            delayNotice={liveShipment.delayNotice}
            onScrollToTimeline={scrollToTimeline}
          />
        </section>

        {/* =========================================================================
            3. TWO-COLUMN MAIN CONTENT (LEFT: TIMELINE | RIGHT: VEHICLE & DETAILS)
            ========================================================================= */}
        <section className="dxp-main-content-grid">
          {/* LEFT COLUMN: Clean Chronological Shipment Timeline */}
          <div id="shipment-timeline-section" className="content-col-timeline">
            <div className="timeline-card">
              <div className="timeline-card-header">
                <h3 className="card-section-title" style={{ margin: 0 }}>Shipment Timeline</h3>
                <span className="timeline-count-tag font-mono">
                  {referenceTimelineEvents.filter(e => e.statusType === 'confirmed' || e.statusType === 'current').length} of {referenceTimelineEvents.length} milestones
                </span>
              </div>

              {/* 6 Formatted Events */}
              <div className="timeline-items-list">
                {referenceTimelineEvents.map((evt, idx) => {
                  const isCurrent = evt.statusType === 'current';
                  const isConfirmed = evt.statusType === 'confirmed';
                  const isLast = idx === referenceTimelineEvents.length - 1;

                  return (
                    <div key={evt.id} className={`t-event-row ${isCurrent ? 'active-event' : ''}`}>
                      <div className="t-icon-col">
                        <div className={`t-icon-badge ${isCurrent ? 'current' : isConfirmed ? 'confirmed' : 'estimated'}`}>
                          {isCurrent ? (
                            <Truck size={14} className="text-white animate-pulse" />
                          ) : isConfirmed ? (
                            <Check size={14} />
                          ) : (
                            <span className="hollow-circle-dot" />
                          )}
                        </div>
                        {!isLast && <div className={`t-line-connector ${isConfirmed ? 'solid' : 'dashed'}`} />}
                      </div>

                      <div className="t-content-col">
                        <div className="t-event-head-row">
                          <h4 className={`t-event-title ${isCurrent ? 'text-blue' : ''}`}>{evt.title}</h4>
                          <span className={`t-tag ${evt.statusType}`}>
                            {evt.statusType === 'confirmed' ? 'Confirmed' : evt.statusType === 'current' ? 'Current' : 'Estimated'}
                          </span>
                        </div>
                        <div className="t-event-meta-sub">
                          <span className="t-time-text">{evt.dateStr}</span>
                          <span className="t-dot-sep">•</span>
                          <span className="t-location-text">{evt.location}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* View Full Timeline Button */}
              <button
                type="button"
                className="view-full-timeline-action-btn"
                onClick={() => setShowEarlierEvents(!showEarlierEvents)}
              >
                <span>{showEarlierEvents ? 'Collapse Additional Scans' : 'View Full Timeline'}</span>
                <ChevronDown size={15} style={{ transform: showEarlierEvents ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
              </button>

              {/* Expanded Facility Scan Logs */}
              {showEarlierEvents && (
                <div className="timeline-extended-logs animate-fade-in">
                  <div className="extended-logs-header">
                    <span className="font-mono text-xs text-slate-500 font-bold uppercase tracking-wider">Historical Checkpoint Scan Logs</span>
                  </div>
                  {eventsList.map((evt, idx) => (
                    <div key={evt.id || idx} className="extended-scan-item">
                      <div className="scan-time font-mono">{evt.displayDate} · {evt.displayTime}</div>
                      <div className="scan-title">{evt.title} — {evt.city}, {evt.state}</div>
                      <div className="scan-facility text-xs text-slate-500">{evt.facility}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: VEHICLE PHOTOS & STRUCTURED CARGO DETAILS */}
          <div className="content-col-details">
            {/* Card 1: Vehicle Photos — only for actual Vehicle shipments. This used to
                render unconditionally for every cargo type (the isVehicle check above had a
                stray `|| true`), so a plain Parcel or Pallet shipment showed a stock Toyota
                Tacoma photo gallery. */}
            {isVehicle && (
            <div className="vehicle-photos-card">
              <div className="veh-gallery-header">
                <h3 className="card-section-title" style={{ margin: 0 }}>Vehicle Photos</h3>
                <div className="gallery-nav-controls">
                  <span className="photo-counter font-mono">{activePhotoIdx + 1} of {vehiclePhotos.length}</span>
                  <button className="gallery-arrow-btn" onClick={prevPhoto} title="Previous photo" type="button">
                    <ChevronLeft size={16} />
                  </button>
                  <button className="gallery-arrow-btn" onClick={nextPhoto} title="Next photo" type="button">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Main Photo Preview Frame */}
              <div className="veh-main-photo-frame" onClick={() => setIsLightboxOpen(true)}>
                <img
                  src={vehiclePhotos[activePhotoIdx]}
                  alt={`${cargoDescription} - Photo ${activePhotoIdx + 1}`}
                  className="main-veh-img"
                />
                <button
                  type="button"
                  className="veh-expand-btn"
                  title="View full-size photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(true);
                  }}
                >
                  <Maximize2 size={15} />
                </button>
              </div>

              {/* Thumbnail Strip (6 Thumbnails with +3 badge on the 6th) */}
              <div className="veh-thumbnails-strip">
                {vehiclePhotos.slice(0, 6).map((photoUrl, idx) => {
                  const isLastThumb = idx === 5;
                  const remainingCount = vehiclePhotos.length - 6;

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`veh-thumb-btn ${idx === activePhotoIdx ? 'active' : ''}`}
                      onClick={() => setActivePhotoIdx(idx)}
                    >
                      <img src={photoUrl} alt={`Thumbnail ${idx + 1}`} className="thumb-img" />
                      {isLastThumb && remainingCount > 0 && (
                        <div className="veh-thumb-more-overlay">
                          <span>+{remainingCount}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            {/* Card 1b: Cargo-Type-Specific Specifications — shown instead of Vehicle Photos
                for the non-Vehicle types that have real, structured data of their own
                (Pets, Pallet, Container, Freight, Document — wired up server-side in an
                earlier phase but never actually surfaced anywhere on this page). Parcel /
                Multi-piece / unrecognized types get no extra card here since the generic
                "Shipment Details" card below already covers everything relevant for them. */}
            {!isVehicle && isPet && pet && (
              <div className="shipment-details-spec-card">
                <h3 className="card-section-title">Live Animal Details</h3>
                <div className="shipment-details-two-col-grid">
                  <div className="detail-cell">
                    <PawPrint size={18} className="dtl-icon text-slate-500" />
                    <div className="dtl-cell-content">
                      <small>Pet Name</small>
                      <strong>{pet.name || '—'}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <Heart size={18} className="dtl-icon text-blue" />
                    <div className="dtl-cell-content">
                      <small>Species / Breed</small>
                      <strong>{[pet.species, pet.breed].filter(Boolean).join(' — ') || '—'}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <Scale size={18} className="dtl-icon text-slate-500" />
                    <div className="dtl-cell-content">
                      <small>Weight</small>
                      <strong>{pet.weightLbs ? `${pet.weightLbs} lbs` : '—'}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <Box size={18} className="dtl-icon text-blue" />
                    <div className="dtl-cell-content">
                      <small>Crate Type</small>
                      <strong>{pet.crateType || '—'}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <FileText size={18} className="dtl-icon text-slate-500" />
                    <div className="dtl-cell-content">
                      <small>Microchip Number</small>
                      <strong className="font-mono">{pet.microchipNumber || '—'}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <Stethoscope size={18} className="dtl-icon text-blue" />
                    <div className="dtl-cell-content">
                      <small>Vet Clinic</small>
                      <strong>{pet.vetClinicName || '—'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isVehicle && liveShipment?.shipmentType === 'Pallet' && liveShipment?.palletDetails && (
              <div className="shipment-details-spec-card">
                <h3 className="card-section-title">Pallet Specifications</h3>
                <div className="shipment-details-two-col-grid">
                  <div className="detail-cell">
                    <Layers size={18} className="dtl-icon text-slate-500" />
                    <div className="dtl-cell-content">
                      <small>Pallet Standard</small>
                      <strong>{liveShipment.palletDetails.standard}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <Box size={18} className="dtl-icon text-blue" />
                    <div className="dtl-cell-content">
                      <small>Skid Count</small>
                      <strong>{liveShipment.palletDetails.count}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <Scale size={18} className="dtl-icon text-slate-500" />
                    <div className="dtl-cell-content">
                      <small>Weight Per Skid</small>
                      <strong>{liveShipment.palletDetails.weightPerSkidLbs} lbs</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <ShieldCheck size={18} className="dtl-icon text-emerald" />
                    <div className="dtl-cell-content">
                      <small>Stackable</small>
                      <strong>{liveShipment.palletDetails.stackable ? 'Yes' : 'No — Top-Tier Only'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isVehicle && liveShipment?.shipmentType === 'Container' && liveShipment?.containerDetails && (
              <div className="shipment-details-spec-card">
                <h3 className="card-section-title">Intermodal Container Details</h3>
                <div className="shipment-details-two-col-grid">
                  <div className="detail-cell">
                    <Container size={18} className="dtl-icon text-slate-500" />
                    <div className="dtl-cell-content">
                      <small>Container Number</small>
                      <strong className="font-mono">{liveShipment.containerDetails.containerNumber}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <Box size={18} className="dtl-icon text-blue" />
                    <div className="dtl-cell-content">
                      <small>ISO Size</small>
                      <strong>{liveShipment.containerDetails.isoSize}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <Lock size={18} className="dtl-icon text-slate-500" />
                    <div className="dtl-cell-content">
                      <small>Bolt Seal</small>
                      <strong className="font-mono">{liveShipment.containerDetails.boltSeal}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <Building2 size={18} className="dtl-icon text-blue" />
                    <div className="dtl-cell-content">
                      <small>Terminal</small>
                      <strong>{liveShipment.containerDetails.terminal}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isVehicle && liveShipment?.shipmentType === 'Freight' && liveShipment?.freightDetails && (
              <div className="shipment-details-spec-card">
                <h3 className="card-section-title">Heavy Freight & LTL Details</h3>
                <div className="shipment-details-two-col-grid">
                  <div className="detail-cell">
                    <Truck size={18} className="dtl-icon text-slate-500" />
                    <div className="dtl-cell-content">
                      <small>Freight Class</small>
                      <strong>{liveShipment.freightDetails.freightClass}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <FileText size={18} className="dtl-icon text-blue" />
                    <div className="dtl-cell-content">
                      <small>NMFC Code</small>
                      <strong className="font-mono">{liveShipment.freightDetails.nmfcCode}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <Box size={18} className="dtl-icon text-slate-500" />
                    <div className="dtl-cell-content">
                      <small>Loading Method</small>
                      <strong>{liveShipment.freightDetails.loadingMethod}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <ShieldCheck size={18} className="dtl-icon text-emerald" />
                    <div className="dtl-cell-content">
                      <small>Liftgate</small>
                      <strong>
                        {liveShipment.freightDetails.liftgatePickup && liveShipment.freightDetails.liftgateDelivery
                          ? 'Pickup & Delivery'
                          : liveShipment.freightDetails.liftgateDelivery
                            ? 'Delivery Only'
                            : liveShipment.freightDetails.liftgatePickup
                              ? 'Pickup Only'
                              : 'Not Required'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isVehicle && liveShipment?.shipmentType === 'Document' && liveShipment?.documentDetails && (
              <div className="shipment-details-spec-card">
                <h3 className="card-section-title">Secure Document Details</h3>
                <div className="shipment-details-two-col-grid">
                  <div className="detail-cell">
                    <FileText size={18} className="dtl-icon text-slate-500" />
                    <div className="dtl-cell-content">
                      <small>Envelope / Pouch Type</small>
                      <strong>{liveShipment.documentDetails.envelopeType}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <Lock size={18} className="dtl-icon text-blue" />
                    <div className="dtl-cell-content">
                      <small>Seal Number</small>
                      <strong className="font-mono">{liveShipment.documentDetails.sealNumber}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <ShieldCheck size={18} className="dtl-icon text-emerald" />
                    <div className="dtl-cell-content">
                      <small>Signature Requirement</small>
                      <strong>{liveShipment.documentDetails.directSignOnly ? 'Direct Signature Only' : 'Standard Signature'}</strong>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <Clock size={18} className="dtl-icon text-slate-500" />
                    <div className="dtl-cell-content">
                      <small>Delivery Deadline</small>
                      <strong>{liveShipment.documentDetails.urgentDeadline || '—'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card 2: Shipment Details (2-Column Icon Grid) */}
            <div className="shipment-details-spec-card">
              <h3 className="card-section-title">Shipment Details</h3>
              <div className="shipment-details-two-col-grid">
                {/* Row 1 */}
                <div className="detail-cell">
                  <FileText size={18} className="dtl-icon text-slate-500" />
                  <div className="dtl-cell-content">
                    <small>Tracking Number</small>
                    <div className="tracking-with-copy">
                      <strong className="font-mono">{trackingNum}</strong>
                      <button
                        type="button"
                        onClick={handleCopyTrackingNumber}
                        className="inline-copy-btn"
                        title="Copy tracking number"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="detail-cell">
                  <MapPin size={18} className="dtl-icon text-blue" />
                  <div className="dtl-cell-content">
                    <small>Origin</small>
                    <strong>
                      {originCity}, {originState}
                      <span className="gps-sub font-mono">
                        ({originGeo.lat.toFixed(4)}, {originGeo.lng.toFixed(4)})
                      </span>
                    </strong>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="detail-cell">
                  <Car size={18} className="dtl-icon text-slate-500" />
                  <div className="dtl-cell-content">
                    <small>Cargo</small>
                    <strong>{cargoDescription}</strong>
                  </div>
                </div>

                <div className="detail-cell">
                  <MapPin size={18} className="dtl-icon text-blue" />
                  <div className="dtl-cell-content">
                    <small>Destination</small>
                    <strong>
                      {destCity}, {destState}
                      <span className="gps-sub font-mono">
                        ({destGeo.lat.toFixed(4)}, {destGeo.lng.toFixed(4)})
                      </span>
                    </strong>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="detail-cell">
                  <Scale size={18} className="dtl-icon text-slate-500" />
                  <div className="dtl-cell-content">
                    <small>Weight</small>
                    <strong>{totalWeight.toLocaleString()} lbs</strong>
                  </div>
                </div>

                <div className="detail-cell">
                  <Package size={18} className="dtl-icon text-blue" />
                  <div className="dtl-cell-content">
                    <small>Service Level</small>
                    <strong>{service} (24h)</strong>
                  </div>
                </div>

                {/* Row 4 */}
                <div className="detail-cell">
                  <Box size={18} className="dtl-icon text-slate-500" />
                  <div className="dtl-cell-content">
                    <small>Dimensions</small>
                    <strong>{dimensions.length} × {dimensions.width} × {dimensions.height} in</strong>
                  </div>
                </div>

                <div className="detail-cell">
                  <ShieldCheck size={18} className="dtl-icon text-emerald" />
                  <div className="dtl-cell-content">
                    <small>Status</small>
                    <strong className="status-highlight text-emerald">
                      <span className="mini-green-pulse" />
                      {statusDisplayLabel}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Shipment Parties (Side-by-side Sender and Recipient) */}
            <div className="shipment-parties-card">
              <h3 className="card-section-title">Shipment Parties</h3>
              <div className="parties-two-col-layout">
                {/* Sender */}
                <div className="party-box sender-box">
                  <div className="party-header-tag">
                    <User size={15} className="text-blue" />
                    <span>From (Sender)</span>
                  </div>
                  <h4 className="party-name">{senderName}</h4>
                  <p className="party-company">{senderCompany}</p>
                  <p className="party-address">{senderAddress}</p>
                  <p className="party-city-state">{originCity}, {originState} {originZip}</p>
                  <a href={`tel:${senderPhone.replace(/[^0-9+]/g, '')}`} className="party-phone-link font-mono">
                    <Phone size={13} />
                    <span>{senderPhone}</span>
                  </a>
                </div>

                {/* Recipient */}
                <div className="party-box recipient-box">
                  <div className="party-header-tag">
                    <User size={15} className="text-blue" />
                    <span>To (Recipient)</span>
                  </div>
                  <h4 className="party-name">{recipientName}</h4>
                  <p className="party-company">{recipientCompany}</p>
                  <p className="party-address">{recipientAddress}</p>
                  <p className="party-city-state">{destCity}, {destState} {destZip}</p>
                  <a href={`tel:${recipientPhone.replace(/[^0-9+]/g, '')}`} className="party-phone-link font-mono">
                    <Phone size={13} />
                    <span>{recipientPhone}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Card 4: Special Handling — reads the real handlingRequirements this shipment
                was created with. This used to be three literal JSX strings ("Fragile: No",
                "Signature Required: Yes") that showed the same values for every shipment
                regardless of what was actually set, and never surfaced `oversized` at all. */}
            <div className="special-handling-card">
              <h3 className="card-section-title">Special Handling</h3>
              <div className="handling-items-row">
                <div className="handling-pill">
                  <span className="h-label">Fragile:</span>
                  <strong className={`h-val ${liveShipment?.handlingRequirements?.fragile ? 'text-amber' : ''}`}>
                    {liveShipment?.handlingRequirements?.fragile ? 'Yes' : 'No'}
                  </strong>
                </div>
                <div className="handling-pill">
                  <span className="h-label">Signature Required:</span>
                  <strong className={`h-val ${liveShipment?.handlingRequirements?.signatureRequired ? 'text-emerald' : ''}`}>
                    {liveShipment?.handlingRequirements?.signatureRequired ? 'Yes' : 'No'}
                  </strong>
                </div>
                {liveShipment?.handlingRequirements?.oversized && (
                  <div className="handling-pill">
                    <span className="h-label">Oversized:</span>
                    <strong className="h-val text-amber">Yes</strong>
                  </div>
                )}
                {isVehicle && (
                  <div className="handling-pill">
                    <span className="h-label">Vehicle Handling:</span>
                    <strong className="h-val">Standard No Liftgate Required</strong>
                  </div>
                )}
              </div>
              {liveShipment?.handlingRequirements?.otherInstructions && (
                <p className="text-xs text-slate-500" style={{ marginTop: '0.5rem' }}>{liveShipment.handlingRequirements.otherInstructions}</p>
              )}
            </div>

            {/* Card 5: Carrier Operating Authority & Chain of Custody */}
            <div className="carrier-authority-card">
              <div className="authority-card-left">
                <div className="authority-icon-box">
                  <ShieldCheck size={20} className="text-emerald" />
                </div>
                <div>
                  <h4 className="authority-title">Carrier Operating Authority & Chain of Custody</h4>
                  <p className="authority-subtitle">Federal Motor Carrier Safety Administration (FMCSA) Certified Linehaul Carrier</p>
                </div>
              </div>
              <div className="authority-card-right">
                <span className="authority-verified-badge">
                  <Check size={13} />
                  <span>Secure & Verified</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. 24/7 OPERATIONS CONCIERGE & DRIVER DISPATCH BANNER
            ========================================================================= */}
        <section className="dxp-help-banner-card">
          <div className="help-banner-left">
            <div className="help-icon-bubble">
              <Headphones size={22} />
            </div>
            <div>
              <h3>24/7 Operations Concierge & Driver Dispatch</h3>
              <p>Direct priority line for consignees, brokers, and destination receiving docks.</p>
              <div className="dispatch-live-indicator">
                <span className="dispatch-dot-pulse"></span>
                <span>Dispatchers online · Average wait: &lt; 45 seconds</span>
              </div>
            </div>
          </div>

          <div className="help-banner-actions">
            <a href="tel:18005550190" className="help-btn phone-btn orange-dispatch-btn">
              <Phone size={15} />
              <span>Call Dispatch 1-800-555-0190</span>
            </a>
            <button className="help-btn contact-btn" onClick={() => setSupportOpen(true)} type="button">
              <Mail size={15} />
              <span>Message Dispatch Desk</span>
            </button>
            <button className="help-btn report-btn" onClick={() => setSupportOpen(true)} type="button">
              <AlertTriangle size={15} />
              <span>Report Delivery Exception</span>
            </button>
          </div>
        </section>

        {/* =========================================================================
            5. TRUST & VERIFICATION STRIP
            ========================================================================= */}
        <div className="dxp-bottom-trust-strip">
          <div className="trust-item">
            <ShieldCheck size={15} className="text-blue" />
            <span>Secure Tracking</span>
          </div>
          <span className="trust-sep">·</span>
          <div className="trust-item">
            <CheckCircle2 size={15} className="text-blue" />
            <span>Real Updates</span>
          </div>
          <span className="trust-sep">·</span>
          <div className="trust-item">
            <Truck size={15} className="text-blue" />
            <span>Real Deliveries</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          LIGHTBOX MODAL FOR VEHICLE PHOTOS
          ========================================================================= */}
      {isLightboxOpen && (
        <div className="veh-lightbox-overlay animate-fade-in" onClick={() => setIsLightboxOpen(false)}>
          <div className="veh-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="veh-lightbox-close"
              onClick={() => setIsLightboxOpen(false)}
            >
              ×
            </button>
            <img
              src={vehiclePhotos[activePhotoIdx]}
              alt={`${cargoDescription} full view`}
              className="veh-lightbox-img"
            />
            <div className="veh-lightbox-footer">
              <span className="font-mono">{cargoDescription} — Photo {activePhotoIdx + 1} of {vehiclePhotos.length}</span>
              <div className="lightbox-nav-buttons">
                <button type="button" onClick={prevPhoto} className="lightbox-arrow-btn">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" onClick={nextPhoto} className="lightbox-arrow-btn">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUBSCRIBE TO ALERTS MODAL
          ========================================================================= */}
      {alertsModalOpen && (
        <div className="alerts-modal-overlay animate-fade-in" onClick={() => setAlertsModalOpen(false)}>
          <div className="alerts-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="alerts-modal-header">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-blue" />
                <h3>Get Delivery Alerts</h3>
              </div>
              <button className="modal-close-icon" onClick={() => setAlertsModalOpen(false)} type="button">×</button>
            </div>
            <p className="alerts-modal-sub">
              Receive automatic SMS or email notifications whenever consignment <strong>{trackingNum}</strong> reaches a major sort hub or departs for final delivery.
            </p>

            {alertSuccess ? (
              <div className="alerts-success-box animate-fade-in">
                <CheckCircle2 size={24} className="text-emerald" />
                <div>
                  <h4>Subscribed Successfully!</h4>
                  <p>You will receive live transit updates for this consignment.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubscribeAlerts} className="alerts-modal-form">
                <div className="form-group">
                  <label>Mobile Number (SMS Updates)</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="(555) 000-0000"
                    value={alertPhone}
                    onChange={(e) => setAlertPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="you@company.com"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-confirm-alerts">
                  <span>Activate Live Alerts</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Support Dialog */}
      <SupportModal
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        initialTrackingNumber={trackingNum}
        defaultIssueType="In Transit Status Inquiry"
      />
    </div>
  );
};
