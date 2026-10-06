import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Calendar,
  Plane,
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
  Scale,
  Box,
  Shield,
  Container,
  Stethoscope
} from 'lucide-react';
import { Shipment, TrackingEvent, RouteCheckpoint, ShipmentStatus } from '../types/shipment';
import { Barcode } from '../components/Barcode';
import { USJourneyMap } from '../components/USJourneyMap';
import { calculateRouteGeometry } from '../services/routingEngine';
import { simulationEngine } from '../services/simulationEngine';
import { api } from '../services/api';
import { generateShipmentPlan, calculateDynamicTimeProgress, getServiceCommitmentHours, routeContext, formatCommitment } from '../services/planningEngine';
import { resolveLocation, formatPlace } from '../services/geocodingService';
import { etaTimestamp } from '../utils/dates';
import { applyForwardOnlyShipmentUpdate } from '../utils/shipmentSync';
import './TrackResultPage.css';

interface TrackResultPageProps {
  shipment: Shipment;
  onTrackAnother: (trackingNumber: string) => void;
  onNavigate: (page: string) => void;
}

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
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showEarlierEvents, setShowEarlierEvents] = useState(false);
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
  // The admin's Operations Control modal records a hold/delay reason into statusText as
  // "On Hold (<reason>)" / "Transit Delayed (<reason>)" — there's no separate reason column in
  // the backend, so this is the one place that value actually survives the round trip to the
  // database. Pull it back out here so the public page can tell the customer WHY, instead of
  // a generic "your shipment is on hold" that never says anything more.
  const holdOrDelayReasonMatch = /\((.+)\)\s*$/.exec(liveShipment?.statusText || '');
  const holdOrDelayReason = holdOrDelayReasonMatch ? holdOrDelayReasonMatch[1] : undefined;
  const hasRevisedSchedule = isHold || isDelayed || Boolean(shipment.delayNotice?.hasDelay);
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
  // A real city with no state is normal outside the US; only invent one with no city at all.
  const originState = liveShipment?.origin?.state || shipment?.origin?.state || ((liveShipment?.origin?.city || shipment?.origin?.city) ? '' : 'NY');
  const originCountry = (liveShipment?.origin as any)?.country || (shipment?.origin as any)?.country || 'United States';
  // No fallback — ZIP is optional at booking (CreateShipmentView), and showing a fake one for
  // a shipment that genuinely doesn't have it on file is exactly the "shows a placeholder
  // for a field I left blank" problem this page shouldn't have. Reads sender/recipient's
  // postalCode first — origin.zip/destination.zip have no backing database column at all, so
  // that value only ever survives in memory until the next refetch, when it silently reverts
  // to nothing; postalCode on the party record is what actually round-trips through the API.
  const originZip = (liveShipment?.sender as any)?.postalCode || (liveShipment?.origin as any)?.zip || (shipment?.sender as any)?.postalCode || (shipment?.origin as any)?.zip;
  const destCity = liveShipment?.destination?.city || shipment?.destination?.city || 'Los Angeles';
  const destState = liveShipment?.destination?.state || shipment?.destination?.state || ((liveShipment?.destination?.city || shipment?.destination?.city) ? '' : 'CA');
  const destCountry = (liveShipment?.destination as any)?.country || (shipment?.destination as any)?.country || 'United States';
  // "Austin, TX" in the US; "Leeds, England, United Kingdom" elsewhere.
  const originPlace = formatPlace(originCity, originState, originCountry);
  const destPlace = formatPlace(destCity, destState, destCountry);
  const destZip = (liveShipment?.recipient as any)?.postalCode || (liveShipment?.destination as any)?.zip || (shipment?.recipient as any)?.postalCode || (shipment?.destination as any)?.zip;
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
    ? `Your shipment is on hold${holdOrDelayReason ? `: ${holdOrDelayReason}` : ''}. We'll update this page once it resumes movement.`
    : isDelayed
    ? `Your shipment's transit has been delayed${holdOrDelayReason ? `: ${holdOrDelayReason}` : ''}. The estimated delivery below reflects the revised schedule.`
    : status === 'DELIVERED'
    ? `Your package was delivered to ${destPlace}.`
    : isOutForDelivery
    ? `Your package is out for delivery today in ${destPlace}.`
    : status === 'RECEIVED'
    ? `Your package has been received and is awaiting pickup for transit to ${destPlace}.`
    : `Your package is on its way to ${destPlace}.`;

  const currentCity = typeof liveShipment?.currentLocation === 'string'
    ? liveShipment.currentLocation.split(',')[0].trim()
    : (typeof liveShipment?.currentLocation === 'object' && (liveShipment.currentLocation as any)?.city) || (typeof shipment?.currentLocation === 'object' && (shipment?.currentLocation as any)?.city) || 'Chicago';
    
  const currentState = typeof liveShipment?.currentLocation === 'string'
    ? liveShipment.currentLocation.split(',')[1]?.trim() || originState
    : (typeof liveShipment?.currentLocation === 'object' && (liveShipment.currentLocation as any)?.state) || (typeof shipment?.currentLocation === 'object' && (shipment?.currentLocation as any)?.state)
      // A stored place with no state ("In Flight", most non-US cities) stays blank — the demo
      // default is only for a shipment with no current location at all.
      || ((typeof liveShipment?.currentLocation === 'object' && (liveShipment.currentLocation as any)?.city) || (typeof shipment?.currentLocation === 'object' && (shipment?.currentLocation as any)?.city) ? '' : 'IL');

  const currentCountry = (typeof liveShipment?.currentLocation === 'object' && (liveShipment.currentLocation as any)?.country)
    || (typeof shipment?.currentLocation === 'object' && (shipment?.currentLocation as any)?.country)
    || 'United States';
  const currentLocationText = formatPlace(currentCity, currentState, currentCountry);

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

  // Parties data — only Full Name and Street Address are required at booking (see
  // CreateShipmentView); Company/Email/Phone are explicitly optional there, so a blank one
  // must not show a fabricated fallback value here (they used to fall back to the flagship
  // demo shipment's own real contact info — "Randy" / "Apex Auto Design" / a fake phone
  // number — for ANY shipment missing that field, which is exactly backwards for a public
  // page: those fields are conditionally rendered below and simply omitted when empty).
  const senderName = shipment?.sender?.name || 'Shipper';
  const senderCompany = shipment?.sender?.company;
  const senderAddress = shipment?.sender?.addressLine;
  const senderPhone = shipment?.sender?.phone;
  const senderEmail = shipment?.sender?.email;

  const recipientName = shipment?.recipient?.name || 'Consignee';
  const recipientCompany = shipment?.recipient?.company;
  const recipientAddress = shipment?.recipient?.addressLine;
  // No fallback: a missing phone is simply not shown (this used to display a made-up
  // "+1 (310) 555-0144" as a tappable call link for every shipment without one).
  const recipientPhone = shipment?.recipient?.phone;
  const recipientEmail = shipment?.recipient?.email;

  const originGeo = resolveLocation([originCity, originState].filter(Boolean).join(', ')) || resolveLocation(originCity) || resolveLocation(originState) || { lat: 40.7128, lng: -74.0050 };
  const currentGeo = resolveLocation([currentCity, currentState].filter(Boolean).join(', ')) || resolveLocation(currentCity) || resolveLocation(currentState) || { lat: 41.8781, lng: -87.6298 };
  const destGeo = resolveLocation([destCity, destState].filter(Boolean).join(', ')) || resolveLocation(destCity) || resolveLocation(destState) || { lat: 34.0522, lng: -118.2437 };

  const routeCheckpoints: RouteCheckpoint[] = [
    {
      id: 'pt-origin',
      name: originCity,
      state: originState,
      country: originCountry,
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
      country: destCountry,
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
      description: `${isVehicle ? 'Vehicle' : 'Cargo'} processed and departed ${originCity} facility; is moving along its scheduled route toward ${destCity}.`,
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

  // Automated routing & planned milestone calculations
  const routeGeom = calculateRouteGeometry(
    { lat: (liveShipment?.origin as any)?.lat || (shipment?.origin as any)?.lat || originGeo.lat, lng: (liveShipment?.origin as any)?.lng || (shipment?.origin as any)?.lng || originGeo.lng, name: originCity, country: originCountry, state: originState },
    { lat: (liveShipment?.destination as any)?.lat || (shipment?.destination as any)?.lat || destGeo.lat, lng: (liveShipment?.destination as any)?.lng || (shipment?.destination as any)?.lng || destGeo.lng, name: destCity, country: destCountry, state: destState }
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
  const heroProgress = Math.round(Math.max(0, Math.min(100, Number(progressPercent) || 0)));

  // Anchor the planned-milestone timeline to this shipment's real, already-stored estimated
  // delivery date (working backward by the service SLA window) instead of deriving forward
  // from "right now" — otherwise the 6-stage timeline's own final "Delivered" milestone date
  // would silently drift out of sync with the ETA already shown in the header/summary cards,
  // the same class of self-contradicting-date bug this timeline replacement was meant to fix.
  // Road vs air and domestic vs cross-border (customs) for this shipment's SLA and milestones.
  const shipmentRoute = routeContext(routeGeom.origin, routeGeom.destination);
  const slaHoursForPlan = getServiceCommitmentHours(service, routeGeom.distanceMiles, shipmentRoute);
  // The stored deadline instant when the API provides it; `new Date(displayText)` read a
  // year-less date like "Wednesday, August 22" as the year 2001.
  // Data without that timestamp (e.g. the built-in demo shipment shown before the first
  // refresh) is read with the shared parser, anchored to the shipment's creation time.
  const etaIso = (typeof liveShipment?.estimatedDelivery === 'object' && (liveShipment.estimatedDelivery as any)?.timestamp) || undefined;
  const etaMs = etaIso
    ? new Date(etaIso).getTime()
    : etaTimestamp(estDeliveryDate, estDeliveryTime, {
        referenceMs: (liveShipment as any)?.createdAtTs || Date.now(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });
  const planPickupDateStr = etaMs != null && !isNaN(etaMs)
    ? new Date(etaMs - slaHoursForPlan * 3600 * 1000).toISOString()
    : undefined;

  const plan = generateShipmentPlan(
    { city: originCity, state: originState, country: originCountry, lat: routeGeom.origin.lat, lng: routeGeom.origin.lng },
    { city: destCity, state: destState, country: destCountry, lat: routeGeom.destination.lat, lng: routeGeom.destination.lng },
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
          title: `Delivered to Consignee — ${destPlace}`,
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

  // Everything the waybill lists about the cargo, including the type-specific details
  // (pet / pallet / container / freight / document) as plain label + value rows.
  type CargoFact = { label: string; value: React.ReactNode; mono?: boolean; wide?: boolean };
  const pallet = liveShipment?.palletDetails;
  const container = liveShipment?.containerDetails;
  const freight = liveShipment?.freightDetails;
  const doc = liveShipment?.documentDetails;
  const cargoFacts: CargoFact[] = [
    { label: 'Cargo', value: cargoDescription, wide: true },
    { label: 'Service', value: `${service} · ${formatCommitment(plan.serviceCommitmentHours)}` },
    { label: 'Type', value: shipmentType },
    { label: 'Weight', value: `${totalWeight.toLocaleString()} lbs` },
    { label: 'Dimensions', value: `${dimensions.length} × ${dimensions.width} × ${dimensions.height} in` },
    ...(isVehicle ? [{ label: 'Transport', value: transportType }] : []),
    ...(!isVehicle && isPet && pet ? [
      { label: 'Pet name', value: pet.name || '—' },
      { label: 'Species / breed', value: [pet.species, pet.breed].filter(Boolean).join(' — ') || '—' },
      { label: 'Crate', value: pet.crateType || '—' },
      { label: 'Microchip', value: pet.microchipNumber || '—', mono: true },
      { label: 'Vet clinic', value: pet.vetClinicName || '—', wide: true },
    ] : []),
    ...(!isVehicle && liveShipment?.shipmentType === 'Pallet' && pallet ? [
      { label: 'Pallet standard', value: pallet.standard },
      { label: 'Skids', value: String(pallet.count) },
      { label: 'Weight per skid', value: `${pallet.weightPerSkidLbs} lbs` },
      { label: 'Stackable', value: pallet.stackable ? 'Yes' : 'No — top tier only' },
    ] : []),
    ...(!isVehicle && liveShipment?.shipmentType === 'Container' && container ? [
      { label: 'Container no.', value: container.containerNumber, mono: true },
      { label: 'ISO size', value: container.isoSize },
      { label: 'Bolt seal', value: container.boltSeal, mono: true },
      { label: 'Terminal', value: container.terminal },
    ] : []),
    ...(!isVehicle && liveShipment?.shipmentType === 'Freight' && freight ? [
      { label: 'Freight class', value: freight.freightClass },
      { label: 'NMFC code', value: freight.nmfcCode, mono: true },
      { label: 'Loading', value: freight.loadingMethod },
      {
        label: 'Liftgate',
        value: freight.liftgatePickup && freight.liftgateDelivery ? 'Pickup & delivery'
          : freight.liftgateDelivery ? 'Delivery only'
          : freight.liftgatePickup ? 'Pickup only' : 'Not required',
      },
    ] : []),
    ...(!isVehicle && liveShipment?.shipmentType === 'Document' && doc ? [
      { label: 'Envelope', value: doc.envelopeType },
      { label: 'Seal no.', value: doc.sealNumber, mono: true },
      { label: 'Signature', value: doc.directSignOnly ? 'Direct signature only' : 'Standard signature' },
      { label: 'Deadline', value: doc.urgentDeadline || '—' },
    ] : []),
  ];

  // Handling flags the shipment was booked with; only the ones that apply are highlighted.
  const handling = liveShipment?.handlingRequirements;
  const handlingTags = [
    { label: handling?.fragile ? 'Fragile' : 'Not fragile', on: !!handling?.fragile },
    { label: handling?.signatureRequired ? 'Signature required' : 'No signature needed', on: !!handling?.signatureRequired },
    ...(handling?.oversized ? [{ label: 'Oversized', on: true }] : []),
    ...(isVehicle ? [{ label: 'No liftgate required', on: false }] : []),
  ];

  return (
    <div className="dxp-redesign-tracking-page animate-fade-in">
      {/* =========================================================================
          0. CINEMATIC HERO BANNER (DUSK HIGHWAY WITH BRANDED SEMI-TRUCK)
          ========================================================================= */}
      <section className="dxp-cinematic-hero-section">
        <div className="dxp-hero-backdrop-img">
          {/* Air legs show an airliner; road shipments a parcel warehouse */}
          <img
            src={routeGeom.mode === 'AIR'
              ? 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=2000&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=2000&auto=format&fit=crop&q=80'}
            alt=""
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
              <span>Track another</span>
            </button>
            <span className={`hero-live-status-pill ${isHold ? 'hold' : isDelayed ? 'delayed' : status === 'DELIVERED' ? 'delivered' : 'in-transit'}`}>
              <span className="hero-live-dot" />
              {statusDisplayLabel.toUpperCase()}
            </span>
          </div>

          <h1 className="hero-tracking-number font-mono">{trackingNum}</h1>
          <h2 className="hero-cargo-title">{cargoDescription}</h2>

          {/* Journey card: origin -> moving vehicle on a progress line -> destination */}
          <div className="hero-journey">
            <div className="hj-stop">
              <span className="hj-label">From</span>
              <strong>{originPlace}</strong>
            </div>
            <div className="hj-track" aria-label={`${heroProgress}% of the route complete`}>
              <div className="hj-line">
                <div className="hj-fill" style={{ width: `${heroProgress}%` }} />
                <span className="hj-mover" style={{ left: `${heroProgress}%` }}>
                  {routeGeom.mode === 'AIR' ? <Plane size={14} /> : <Package size={14} />}
                </span>
              </div>
              <span className="hj-pct">{heroProgress}% complete</span>
            </div>
            <div className="hj-stop end">
              <span className="hj-label">To</span>
              <strong>{destPlace}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <div className="dxp-track-container trk-body">
        {/* Hold / Delay Advisory — surfaces the specific reason an admin recorded via
            Operations Control, instead of leaving a customer to guess why their shipment
            stopped moving or when it'll actually arrive. */}
        {(isHold || isDelayed) && (
          <div className={`tracking-top-alert-banner animate-fade-in ${isHold ? 'hold' : 'delay'}`}>
            {isHold ? <Clock size={18} /> : <AlertTriangle size={18} />}
            <div>
              <strong>{isHold ? 'Shipment On Hold' : 'Transit Delay Advisory'}{holdOrDelayReason ? `: ${holdOrDelayReason}` : ''}</strong>
              <p>
                {isHold
                  ? 'Movement is temporarily paused. '
                  : 'This shipment is running behind its original schedule. '}
                Revised estimated delivery: <strong>{estDeliveryDate} · {estDeliveryTime}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* RTO Alert (If active) */}
        {shipment?.returnLeg && (
          <div className="rto-active-advisory-banner animate-fade-in">
            <RotateCcw size={18} className="text-amber" />
            <div>
              <strong>Return to Origin In Progress ({shipment.returnLeg.reason})</strong>
              <p>Consignment journey reversed back to sender at {originPlace}. Return tracking: <span className="font-mono">{shipment.returnLeg.returnTrackingNumber}</span></p>
            </div>
          </div>
        )}

        {/* =========================================================================
            1. STATUS STATEMENT — the answer to "where is it?", set as type, not a card
            ========================================================================= */}
        <section className="trk-status">
          <div className="trk-status-main">
            <span className="trk-eyebrow">
              <span className={`trk-eyebrow-dot ${isHold ? 'hold' : isDelayed ? 'delayed' : status === 'DELIVERED' ? 'delivered' : ''}`} />
              Latest update · {lastUpdated}
            </span>
            <h2 className="trk-status-title">{statusHeroHeading}</h2>
            <p className="trk-status-sub">{statusHeroSub}</p>
            <p className="trk-status-checkpoint">
              <MapPin size={15} />
              <span>Last checkpoint: <strong>{currentLocationText}</strong></span>
            </p>
          </div>

          <div className="trk-eta">
            <span className="trk-eta-label">{status === 'DELIVERED' ? 'Delivered' : 'Estimated delivery'}</span>
            <strong className="trk-eta-date">{estDeliveryDate}</strong>
            <span className="trk-eta-time">{estDeliveryTime}</span>
            <span className={`trk-eta-chip ${hasRevisedSchedule ? 'revised' : ''}`}>
              {hasRevisedSchedule ? <Clock size={13} /> : <CheckCircle2 size={13} />}
              {hasRevisedSchedule ? 'Revised estimate' : 'On schedule'}
            </span>
          </div>
        </section>

        {/* =========================================================================
            2. ROUTE MAP — full width, no extra chrome
            ========================================================================= */}
        <section className="trk-map">
          <USJourneyMap
            bare
            checkpoints={routeCheckpoints}
            currentLocationText={currentLocationText}
            currentLat={currentLat}
            currentLng={currentLng}
            lastEventDescription={`${isVehicle ? 'Vehicle' : 'Shipment'} — ${timeProgress.activeMilestoneStage} toward ${destCity}.`}
            totalDistance={`${routeGeom.distanceMiles.toLocaleString()} miles`}
            transitTime={formatCommitment(plan.serviceCommitmentHours)}
            progressPercent={progressPercent}
            shipmentStatus={status}
            delayNotice={liveShipment.delayNotice}
          />
          <div className="trk-map-caption">
            <span><strong>{routeGeom.distanceMiles.toLocaleString()} mi</strong> {routeGeom.mode === 'AIR' ? 'by air' : 'by road'}</span>
            <span className="trk-map-sep" />
            <span><strong>{heroProgress}%</strong> of the route complete</span>
            <span className="trk-map-sep" />
            <span>Position is estimated from the schedule</span>
          </div>
        </section>

        {/* =========================================================================
            3. JOURNEY TIMELINE + WAYBILL
            ========================================================================= */}
        <section className="trk-split">
          <div id="shipment-timeline-section" className="trk-journey">
            <div className="trk-section-head">
              <span className="trk-kicker">Journey</span>
              <h3>Every milestone, start to finish</h3>
              <p>
                {referenceTimelineEvents.filter(e => e.statusType === 'confirmed' || e.statusType === 'current').length} of {referenceTimelineEvents.length} milestones reached
              </p>
            </div>

            <ol className="trk-rail">
              {referenceTimelineEvents.map((evt) => {
                const state = evt.statusType === 'current' ? 'current' : evt.statusType === 'confirmed' ? 'done' : 'next';
                const [datePart, timePart] = String(evt.dateStr).split(' · ');
                return (
                  <li key={evt.id} className={`trk-step ${state}`}>
                    <div className="trk-step-when">
                      <strong>{datePart}</strong>
                      {timePart && <span>{timePart}</span>}
                    </div>
                    <div className="trk-step-node" aria-hidden="true">
                      {state === 'current'
                        ? (routeGeom.mode === 'AIR' && /flight|air/i.test(evt.title) ? <Plane size={14} /> : <Package size={14} />)
                        : state === 'done' ? <Check size={13} strokeWidth={3} /> : null}
                    </div>
                    <div className="trk-step-what">
                      <h4>{evt.title}</h4>
                      <span className="trk-step-where">{evt.location}</span>
                      <span className="trk-step-when-inline">{evt.dateStr}</span>
                      {state === 'current' && <span className="trk-step-badge">Current</span>}
                      {state === 'next' && <span className="trk-step-est">Estimated</span>}
                    </div>
                  </li>
                );
              })}
            </ol>

            {eventsList.length > 0 && (
              <button
                type="button"
                className="trk-scans-toggle"
                onClick={() => setShowEarlierEvents(!showEarlierEvents)}
                aria-expanded={showEarlierEvents}
              >
                <span>{showEarlierEvents ? 'Hide facility scans' : eventsList.length === 1 ? 'Show the facility scan' : `Show all ${eventsList.length} facility scans`}</span>
                <ChevronDown size={16} style={{ transform: showEarlierEvents ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
              </button>
            )}

            {showEarlierEvents && (
              <ul className="trk-scans animate-fade-in">
                {eventsList.map((evt, idx) => (
                  <li key={evt.id || idx}>
                    <span className="trk-scan-time">{evt.displayDate} · {evt.displayTime}</span>
                    <span className="trk-scan-title">{evt.title} — {evt.city}{evt.state ? `, ${evt.state}` : ''}</span>
                    {evt.facility && <span className="trk-scan-facility">{evt.facility}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Waybill ticket: one object holding the ID, the parties and the cargo facts */}
          <aside className="trk-waybill-wrap">
            <div className="trk-waybill">
              <div className="wb-top">
                <div className="wb-brand-row">
                  <span className="wb-kicker">Waybill</span>
                  <span className={`wb-status ${isHold ? 'hold' : isDelayed ? 'delayed' : ''}`}>{statusDisplayLabel}</span>
                </div>
                <div className="wb-number-row">
                  <strong className="wb-number">{trackingNum}</strong>
                  <button
                    type="button"
                    className="wb-copy"
                    onClick={handleCopyTrackingNumber}
                    aria-label="Copy tracking number"
                    title="Copy tracking number"
                  >
                    {copiedNumber ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>
                <div className="wb-barcode">
                  <Barcode value={trackingNum} height={46} width={1.4} fontSize={10} displayValue={false} />
                </div>
              </div>

              <div className="wb-perf" aria-hidden="true" />

              <div className="wb-parties">
                <div className="wb-party">
                  <span className="wb-label">From</span>
                  <strong>{senderName}</strong>
                  {senderCompany && <span>{senderCompany}</span>}
                  <span>{originPlace}{originZip ? ` ${originZip}` : ''}</span>
                  {senderPhone && <a href={`tel:${senderPhone.replace(/[^0-9+]/g, '')}`}>{senderPhone}</a>}
                  {senderEmail && <a href={`mailto:${senderEmail}`}>{senderEmail}</a>}
                </div>
                <div className="wb-party-arrow" aria-hidden="true"><ArrowRight size={16} /></div>
                <div className="wb-party">
                  <span className="wb-label">To</span>
                  <strong>{recipientName}</strong>
                  {recipientCompany && <span>{recipientCompany}</span>}
                  <span>{destPlace}{destZip ? ` ${destZip}` : ''}</span>
                  {recipientPhone && <a href={`tel:${recipientPhone.replace(/[^0-9+]/g, '')}`}>{recipientPhone}</a>}
                  {recipientEmail && <a href={`mailto:${recipientEmail}`}>{recipientEmail}</a>}
                </div>
              </div>

              <div className="wb-perf" aria-hidden="true" />

              <dl className="wb-facts">
                {cargoFacts.map((fact) => (
                  <div key={fact.label} className={fact.wide ? 'wide' : ''}>
                    <dt>{fact.label}</dt>
                    <dd className={fact.mono ? 'mono' : ''}>{fact.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="wb-handling">
                {handlingTags.map((tag) => (
                  <span key={tag.label} className={`wb-tag ${tag.on ? 'on' : ''}`}>{tag.label}</span>
                ))}
              </div>
              {liveShipment?.handlingRequirements?.otherInstructions && (
                <p className="wb-note">{liveShipment.handlingRequirements.otherInstructions}</p>
              )}

              <div className="wb-foot">
                <ShieldCheck size={15} />
                <span>FMCSA-certified carrier · chain of custody verified</span>
              </div>
            </div>
          </aside>
        </section>
      </div>

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

    </div>
  );
};
