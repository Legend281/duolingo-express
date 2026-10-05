/**
 * Duolingo Express — Autonomous Logistics Planning & Dynamic Timeline Engine
 * Generates automated planned timelines, predicts milestone timestamps,
 * enforces 3-state milestone taxonomy (CONFIRMED, ESTIMATED, PENDING_CONFIRMATION),
 * and handles state-machine transitions (Hold, Delay, Return, Deliver) with full audit logging.
 */

import {
  TrackingEvent,
  ShipmentStatus,
  MilestoneState,
  Shipment,
  ShipmentAuditEntry,
  ReturnJourneyLeg
} from '../types/shipment.js';
import { findIntermediateHub, resolveTransportMode, LatLngPoint, TransportMode } from './routingEngine.js';
import { resolveLocation, formatPlace } from './geocodingService.js';
import { canonicalCountry, normalizePlace } from './worldCities.js';
import { etaTimestamp } from '../utils/dates.js';

/** How a shipment travels: road or air, and whether it crosses a border (customs). */
export interface RouteContext {
  mode?: TransportMode;
  international?: boolean;
}

/** Route context for two endpoints (country blank = United States). */
export function routeContext(origin: LatLngPoint, destination: LatLngPoint): RouteContext {
  const oc = normalizePlace(canonicalCountry(origin.country) || 'United States');
  const dc = normalizePlace(canonicalCountry(destination.country) || 'United States');
  return { mode: resolveTransportMode(origin, destination), international: oc !== dc };
}

/** Route context straight from a shipment record, when it has stored coordinates. */
function shipmentRouteContext(shipment: Shipment): RouteContext {
  const o = shipment.origin as any;
  const d = shipment.destination as any;
  if (typeof o?.lat !== 'number' || typeof d?.lat !== 'number') return {};
  return routeContext(
    { lat: o.lat, lng: o.lng, country: o.country, state: o.state },
    { lat: d.lat, lng: d.lng, country: d.country, state: d.state }
  );
}

/** "48h" for short windows, "7 days" beyond two days. */
export function formatCommitment(hours: number): string {
  if (hours <= 48) return `${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

/**
 * Shipment.currentLocation is typed as a string, but the simulation engine (in motion)
 * writes it as an object ({ city, state, lat, lng }) once a shipment starts moving.
 * This safely extracts city/state regardless of which shape is actually present, instead
 * of assuming .split(',') always works and crashing when it's an object.
 */
function getLocationCityState(currentLocation: unknown): { city?: string; state?: string } {
  if (typeof currentLocation === 'string') {
    const [city, state] = currentLocation.split(',');
    return { city: city?.trim(), state: state?.trim() };
  }
  if (currentLocation && typeof currentLocation === 'object') {
    const loc = currentLocation as { city?: string; state?: string };
    return { city: loc.city, state: loc.state };
  }
  return {};
}

/** Renders currentLocation (string or object) as a "City, ST" display string. */
function formatLocationString(currentLocation: unknown): string {
  if (typeof currentLocation === 'string') return currentLocation;
  const { city, state } = getLocationCityState(currentLocation);
  return [city, state].filter(Boolean).join(', ');
}

export interface PlannedMilestone {
  id: string;
  stageName: string;
  location: string;
  facility: string;
  plannedDateTime: string;
  targetTimestamp: number; // epoch ms
  milestoneState: MilestoneState;
  status: ShipmentStatus;
  description: string;
  isConfirmed: boolean;
  isEstimated: boolean;
  isPendingConfirmation: boolean;
}

export interface ShipmentPlanResult {
  serviceCommitmentHours: number;
  pickupDateTime: string;
  estimatedDeliveryDate: string;
  estimatedDeliveryTime: string;
  plannedMilestones: PlannedMilestone[];
}

/**
 * Maps commercial service level to customer delivery SLA commitment (hours)
 * Strictly separated from physical driving duration.
 *
 * `route` (optional; omitted = domestic road, the original behavior):
 *  - international air: Express 3 days, Priority 5, Standard 7, Freight 10 (+1 day past
 *    6,000 mi) — includes export + import customs clearance;
 *  - domestic air (Hawaii/Alaska): Express 2 days, Priority 3, Standard 5, Freight 7;
 *  - cross-border road (e.g. US <-> Canada): the domestic window + 1 day for customs.
 */
export function getServiceCommitmentHours(service: string, distanceMiles: number, route: RouteContext = {}): number {
  const norm = String(service).toUpperCase();
  const tier = norm.includes('EXPRESS') || norm.includes('AIR') ? 'EXPRESS'
    : norm.includes('PRIORITY') ? 'PRIORITY'
    : norm.includes('FREIGHT') || norm.includes('LTL') ? 'FREIGHT'
    : 'STANDARD';
  if (route.mode === 'AIR') {
    const table = route.international
      ? { EXPRESS: 72, PRIORITY: 120, STANDARD: 168, FREIGHT: 240 }
      : { EXPRESS: 48, PRIORITY: 72, STANDARD: 120, FREIGHT: 168 };
    return table[tier] + (route.international && distanceMiles > 6000 ? 24 : 0);
  }
  return domesticRoadCommitmentHours(norm, distanceMiles) + (route.international ? 24 : 0);
}

function domesticRoadCommitmentHours(norm: string, distanceMiles: number): number {
  if (norm.includes('EXPRESS') || norm.includes('AIR')) {
    return 24; // 24h Express Air Linehaul SLA
  }
  if (norm.includes('PRIORITY')) {
    return 48; // 48h Priority SLA
  }
  if (norm.includes('FREIGHT') || norm.includes('LTL')) {
    return Math.max(72, Math.round((distanceMiles / 35) / 24) * 24);
  }
  // Standard Ground
  return Math.max(72, Math.round((distanceMiles / 30) / 24) * 24);
}

/**
 * Combines a stored `estimated_delivery_date` (date-only, e.g. "September 24, 2026") with the
 * free-text `estimated_delivery_time` field into one real timestamp. `new Date(dateOnlyString)`
 * on its own parses to MIDNIGHT (00:00:00) of that date — which silently truncated a promised
 * delivery window by however many hours had already passed that day, sometimes by nearly a
 * full 24 hours (e.g. a shipment created at 1pm promising delivery "tomorrow" was treated as
 * having only ~11 hours to arrive — until midnight tonight — instead of the intended ~24).
 * Tries to extract a real time-of-day from `estimatedDeliveryTime` first (it's inconsistently
 * formatted across this app — "by 5:00 PM", "Delivered at 2:15 PM", "Revised Schedule", "by
 * end of day" — so this only succeeds when an actual clock time is present); when it can't,
 * defaults to the END of that day (23:59:59), not the start — "delivery by September 24" means
 * sometime up through that day, not literally at its first instant.
 */
function parseEstimatedDeliveryTimestamp(dateStr: string, timeStr?: string, referenceMs: number = Date.now()): number | null {
  // Shared reader (src/utils/dates.ts): `new Date("Wednesday, August 22")` alone parses to the
  // year 2001, so a year-less date is anchored to the shipment's own creation time instead.
  return etaTimestamp(dateStr, timeStr, {
    referenceMs,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });
}

/**
 * The pace a shipment should advance at, in hours for a full 0-100% journey — used by both
 * the automatic server-side progress sync (server/progress.ts) and the admin's manual
 * "Simulate" preview (simulationEngine.ts), so a shipment paces identically whichever
 * mechanism is driving it. Prefers the shipment's OWN real, already-stored promise
 * (createdAt -> estimatedDeliveryDate + estimatedDeliveryTime) over the generic
 * getServiceCommitmentHours default — an admin can manually override a shipment's ETA (e.g.
 * to a custom "3 days from now" regardless of what its service level would normally imply),
 * and progress must pace against whatever was actually promised for THIS shipment, not a
 * number that silently ignores that override. Falls back to the service-level default when
 * there's no usable stored date to anchor to (new/malformed rows, or an ETA that parses to
 * before its own creation time).
 */
export function resolveProgressPaceHours(
  service: string,
  distanceMiles: number,
  createdAtTs?: number | null,
  estimatedDeliveryDate?: string,
  estimatedDeliveryTime?: string,
  route: RouteContext = {},
  /** The stored deadline (shipments.estimated_delivery_ts) — preferred over parsing the text. */
  estimatedDeliveryTs?: number | null
): number {
  if (createdAtTs && (estimatedDeliveryTs || estimatedDeliveryDate)) {
    const etaTs = estimatedDeliveryTs || parseEstimatedDeliveryTimestamp(estimatedDeliveryDate!, estimatedDeliveryTime, createdAtTs);
    if (etaTs !== null) {
      const realWindowHours = (etaTs - createdAtTs) / (1000 * 60 * 60);
      if (realWindowHours > 0.5) {
        return realWindowHours;
      }
    }
  }
  return getServiceCommitmentHours(service, distanceMiles, route);
}

/**
 * Formats a Date object into human-readable Date and Time strings
 */
export function formatDateTime(date: Date): { dateStr: string; timeStr: string } {
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return { dateStr, timeStr };
}

/**
 * Automatically creates an initial planned shipment schedule and dual-phase timeline.
 * Never automatically converts an estimated milestone into a confirmed actual scan.
 */
export function generateShipmentPlan(
  // lat/lng/country are optional for backward compatibility, but international shipments need
  // them: without them the city/state is re-looked-up through the US-only offline table.
  origin: { city: string; state: string; facilityName?: string; country?: string; lat?: number; lng?: number },
  destination: { city: string; state: string; facilityName?: string; country?: string; lat?: number; lng?: number },
  service: string,
  distanceMiles: number,
  pickupDateStr?: string,
  confirmedEvents: TrackingEvent[] = [],
  currentStatus?: ShipmentStatus,
  currentProgress?: number
): ShipmentPlanResult {
  // Stored coordinates win; the US-only re-lookup is only a fallback for legacy callers.
  const originGeo = typeof origin.lat === 'number' && typeof origin.lng === 'number'
    ? { lat: origin.lat, lng: origin.lng }
    : (resolveLocation(`${origin.city}, ${origin.state}`, origin.country) || { lat: 39.8283, lng: -98.5795 });
  const destGeo = typeof destination.lat === 'number' && typeof destination.lng === 'number'
    ? { lat: destination.lat, lng: destination.lng }
    : (resolveLocation(`${destination.city}, ${destination.state}`, destination.country) || { lat: 38.9072, lng: -77.0369 });
  const route = routeContext(
    { ...originGeo, country: origin.country, state: origin.state },
    { ...destGeo, country: destination.country, state: destination.state }
  );
  const isAir = route.mode === 'AIR';
  const slaHours = getServiceCommitmentHours(service, distanceMiles, route);
  const originPlace = formatPlace(origin.city, origin.state, origin.country);
  const destPlace = formatPlace(destination.city, destination.state, destination.country);
  const destCountryName = canonicalCountry(destination.country) || 'United States';
  const originCountryName = canonicalCountry(origin.country) || 'United States';

  // A bare "YYYY-MM-DD" (the Create form's date input) is a LOCAL calendar day; new Date() would
  // read it as UTC midnight, which is the previous evening anywhere west of Greenwich.
  const dateOnly = pickupDateStr?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const startDate = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 8, 0, 0, 0)
    : pickupDateStr ? new Date(pickupDateStr) : new Date();
  if (isNaN(startDate.getTime())) {
    startDate.setTime(Date.now());
  }

  if (startDate.getHours() === 0) {
    startDate.setHours(8, 0, 0, 0);
  }

  const originFacility = origin.facilityName || `${origin.city} Gateway Terminal`;
  const destFacility = destination.facilityName || `${destination.city} Destination Sort Center`;

  const nowMs = Date.now();

  // Intermediate road hub (US metros) — meaningless for a flight, and for cross-border road
  // legs the US-only hub table can't name the other side's corridor, so neutral wording there.
  const intermediateHub = isAir || route.international ? null : findIntermediateHub(
    { lat: originGeo.lat, lng: originGeo.lng, name: origin.city },
    { lat: destGeo.lat, lng: destGeo.lng, name: destination.city }
  );

  const midStageName = isAir
    ? `In Flight to ${route.international ? destCountryName : destination.city}`
    : intermediateHub
    ? `Corridor Transit Scan — ${intermediateHub.city}, ${intermediateHub.state}`
    : 'Intermediate Linehaul Corridor Scan';
  const midLocation = isAir
    ? 'In Flight'
    : intermediateHub ? `${intermediateHub.city}, ${intermediateHub.state}` : (route.international ? 'Cross-Border Transit Corridor' : 'Interstate Transit Corridor');
  const midFacility = isAir ? 'Air Freight Carrier' : intermediateHub ? intermediateHub.facility : 'Regional Linehaul Sort Center';
  const midDescription = isAir
    ? `Consignment airborne on scheduled air freight service toward ${destPlace}.`
    : intermediateHub
    ? intermediateHub.description
    : `Progressing through ${route.international ? 'the cross-border' : 'central interstate'} transit corridor toward ${destination.city}.`;

  // Cross-border shipments add export and import customs clearance; timings are fractions of
  // the full commitment window.
  const at = route.international
    ? { depart: 0.2, mid: 0.45, arrive: 0.82, out: 0.93 }
    : { depart: 0.25, mid: 0.65, arrive: 0.85, out: 0.95 };
  const atTime = (fraction: number) => new Date(startDate.getTime() + Math.round(slaHours * fraction * 3600 * 1000));
  const plannedAt = (d: Date) => { const { dateStr, timeStr } = formatDateTime(d); return `${dateStr} · ${timeStr}`; };

  // Milestone 1: Origin Intake
  const t0 = new Date(startDate.getTime());
  const { dateStr: d0, timeStr: tm0 } = formatDateTime(t0);

  // Milestone 2: Departure (road linehaul or air freight)
  const t1 = atTime(at.depart);
  const { dateStr: d1, timeStr: tm1 } = formatDateTime(t1);

  // Milestone 3: Intermediate hub (road) / in flight (air)
  const t2 = atTime(at.mid);
  const { dateStr: d2, timeStr: tm2 } = formatDateTime(t2);

  // Milestone 4: Arrival at Destination Sorting Center
  const t3 = atTime(at.arrive);
  const { dateStr: d3, timeStr: tm3 } = formatDateTime(t3);

  // Milestone 5: Out for Final Delivery
  const t4 = atTime(at.out);
  const { dateStr: d4, timeStr: tm4 } = formatDateTime(t4);

  // Milestone 6: Final Delivery
  const t5 = new Date(startDate.getTime() + slaHours * 3600 * 1000);
  const { dateStr: d5, timeStr: tm5 } = formatDateTime(t5);

  const exportCustoms = route.international ? [{
    id: 'plan-export-customs',
    stageName: `Export Customs Clearance — ${originCountryName}`,
    location: originPlace,
    facility: `${originFacility} Customs Bond`,
    plannedDateTime: plannedAt(atTime(0.1)),
    targetTimestamp: atTime(0.1).getTime(),
    status: 'PROCESSING' as ShipmentStatus,
    description: `Export declaration lodged and cleared with ${originCountryName} customs.`
  }] : [];
  const importCustoms = route.international ? [{
    id: 'plan-import-customs',
    stageName: `Import Customs Clearance — ${destCountryName}`,
    location: destPlace,
    facility: `${destination.city} ${isAir ? 'Air Cargo' : 'Border'} Customs`,
    plannedDateTime: plannedAt(atTime(0.7)),
    targetTimestamp: atTime(0.7).getTime(),
    status: 'DESTINATION_PROCESSING' as ShipmentStatus,
    description: `Import entry, duties and inspection processed by ${destCountryName} customs.`
  }] : [];

  const rawMilestones = [
    {
      id: 'plan-orig-intake',
      stageName: 'Shipment Received at Origin Facility',
      location: originPlace,
      facility: originFacility,
      plannedDateTime: `${d0} · ${tm0}`,
      targetTimestamp: t0.getTime(),
      status: 'RECEIVED' as ShipmentStatus,
      description: `Consignment tendered and registered at ${originFacility}.`
    },
    ...exportCustoms,
    {
      id: 'plan-linehaul-depart',
      stageName: isAir ? 'Departed on Scheduled Air Freight' : 'Departed Origin Facility on Scheduled Linehaul',
      location: originPlace,
      facility: isAir ? `${origin.city} Air Cargo Terminal` : originFacility,
      plannedDateTime: `${d1} · ${tm1}`,
      targetTimestamp: t1.getTime(),
      status: 'IN_TRANSIT' as ShipmentStatus,
      description: isAir
        ? `Consignment loaded on scheduled air freight service toward ${destPlace}.`
        : `Linehaul unit dispatched along verified corridor toward ${destination.city}.`
    },
    {
      id: 'plan-midpoint-sort',
      stageName: midStageName,
      location: midLocation,
      facility: midFacility,
      plannedDateTime: `${d2} · ${tm2}`,
      targetTimestamp: t2.getTime(),
      status: 'IN_TRANSIT' as ShipmentStatus,
      description: midDescription
    },
    ...importCustoms,
    {
      id: 'plan-dest-arrive',
      stageName: 'Arrived at Destination Facility',
      location: destPlace,
      facility: destFacility,
      plannedDateTime: `${d3} · ${tm3}`,
      targetTimestamp: t3.getTime(),
      status: 'AT_FACILITY' as ShipmentStatus,
      description: `Arrived at destination hub for inbound sorting and final dispatch.`
    },
    {
      id: 'plan-out-delivery',
      stageName: 'Out for Final Delivery',
      location: destPlace,
      facility: destFacility,
      plannedDateTime: `${d4} · ${tm4}`,
      targetTimestamp: t4.getTime(),
      status: 'OUT_FOR_DELIVERY' as ShipmentStatus,
      description: `Loaded onto local courier unit for delivery to consignee.`
    },
    {
      id: 'plan-delivered',
      stageName: 'Estimated Delivery to Consignee',
      location: destPlace,
      facility: 'Consignee Delivery Location',
      plannedDateTime: `${d5} · by ${tm5}`,
      targetTimestamp: t5.getTime(),
      status: 'DELIVERED' as ShipmentStatus,
      description: `Commercial delivery commitment completion.`
    }
  ];

  // Map 3-state taxonomy:
  // 1. CONFIRMED if an actual event exists in confirmedEvents
  // 2. PENDING_CONFIRMATION if targetTimestamp < now and overall commitment overdue
  // 3. ESTIMATED if milestone is planned ahead on schedule
  const plannedMilestones: PlannedMilestone[] = rawMilestones.map((m) => {
    const isOverallDelivered = currentStatus === 'DELIVERED' || (currentProgress !== undefined && currentProgress >= 100);
    const isOverallOutForDelivery = currentStatus === 'OUT_FOR_DELIVERY' || (currentProgress !== undefined && currentProgress >= 88);
    const isOverallAtFacility = currentStatus === 'AT_FACILITY' || (currentProgress !== undefined && currentProgress >= 65);
    const isOverallDeparted = currentStatus === 'IN_TRANSIT' && (currentProgress !== undefined ? currentProgress >= 20 : true);

    let isMatchedConfirmed = false;
    if (isOverallDelivered) {
      isMatchedConfirmed = true;
    } else if (m.id === 'plan-orig-intake') {
      isMatchedConfirmed = confirmedEvents.some(e => 
        e.status === 'RECEIVED' || e.status === 'BOOKED' || e.title.toLowerCase().includes('received') || e.title.toLowerCase().includes('registered') || e.title.toLowerCase().includes('created') || e.title.toLowerCase().includes('picked up')
      ) || (currentStatus !== undefined && currentStatus !== 'CREATED' && currentStatus !== 'AWAITING_PICKUP');
    } else if (m.id === 'plan-export-customs') {
      // Cleared once the shipment has departed (or anything later), or an explicit scan says so.
      isMatchedConfirmed = isOverallOutForDelivery || isOverallAtFacility || (currentProgress !== undefined && currentProgress >= 15) || confirmedEvents.some(e =>
        e.title.toLowerCase().includes('export') || e.title.toLowerCase().includes('departed')
      );
    } else if (m.id === 'plan-import-customs') {
      isMatchedConfirmed = isOverallOutForDelivery || (currentProgress !== undefined && currentProgress >= 75) || confirmedEvents.some(e =>
        e.title.toLowerCase().includes('import') || e.title.toLowerCase().includes('customs cleared')
      );
    } else if (m.id === 'plan-linehaul-depart') {
      isMatchedConfirmed = isOverallOutForDelivery || isOverallAtFacility || (isOverallDeparted && (confirmedEvents.some(e => 
        e.title.toLowerCase().includes('departed') || (e.status === 'IN_TRANSIT' && !e.title.toLowerCase().includes('corridor') && !e.title.toLowerCase().includes('intermediate'))
      ) || (currentProgress !== undefined && currentProgress >= 25)));
    } else if (m.id === 'plan-midpoint-sort') {
      isMatchedConfirmed = isOverallOutForDelivery || isOverallAtFacility || confirmedEvents.some(e => 
        e.title.toLowerCase().includes('corridor') || e.title.toLowerCase().includes('intermediate') || e.title.toLowerCase().includes('waypoint') || e.title.toLowerCase().includes('weigh') || (e.facility && e.facility.toLowerCase().includes('linehaul'))
      ) || (currentProgress !== undefined && currentProgress >= 60);
    } else if (m.id === 'plan-dest-arrive') {
      isMatchedConfirmed = isOverallOutForDelivery || confirmedEvents.some(e => 
        e.status === 'AT_FACILITY' || (e.title.toLowerCase().includes('arrived') && e.title.toLowerCase().includes('destination'))
      ) || (currentProgress !== undefined && currentProgress >= 88);
    } else if (m.id === 'plan-out-delivery') {
      isMatchedConfirmed = isOverallDelivered || confirmedEvents.some(e => 
        e.status === 'OUT_FOR_DELIVERY' || e.title.toLowerCase().includes('out for delivery')
      );
    } else if (m.id === 'plan-delivered') {
      isMatchedConfirmed = isOverallDelivered || confirmedEvents.some(e => 
        e.status === 'DELIVERED' || e.title.toLowerCase().includes('delivered')
      );
    } else {
      isMatchedConfirmed = confirmedEvents.some(e => e.id === m.id || e.title.toLowerCase().includes(m.stageName.toLowerCase()));
    }

    if (isMatchedConfirmed) {
      return {
        ...m,
        milestoneState: 'CONFIRMED' as MilestoneState,
        isConfirmed: true,
        isEstimated: false,
        isPendingConfirmation: false
      };
    }

    const isOverdue = nowMs > t5.getTime();
    const hasPassedMilestoneTime = m.targetTimestamp < nowMs;

    if (isOverdue && hasPassedMilestoneTime) {
      return {
        ...m,
        milestoneState: 'PENDING_CONFIRMATION' as MilestoneState,
        isConfirmed: false,
        isEstimated: false,
        isPendingConfirmation: true,
        description: 'Scheduled transit window passed; awaiting carrier telemetry scan.'
      };
    }

    return {
      ...m,
      milestoneState: 'ESTIMATED' as MilestoneState,
      isConfirmed: false,
      isEstimated: true,
      isPendingConfirmation: false
    };
  });

  return {
    serviceCommitmentHours: slaHours,
    pickupDateTime: `${d0} at ${tm0}`,
    estimatedDeliveryDate: d5,
    estimatedDeliveryTime: tm5,
    plannedMilestones
  };
}

/**
 * Creates an immutable Audit Log Entry for Super Admin operational actions
 */
export function createAuditLogEntry(
  operator: string,
  action: string,
  details: string,
  params?: {
    reason?: string;
    durationHours?: number;
    prevETA?: string;
    newETA?: string;
  }
): ShipmentAuditEntry {
  const now = new Date();
  return {
    id: `aud-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    operator: operator || 'Super Admin',
    action,
    reason: params?.reason,
    durationHours: params?.durationHours,
    prevETA: params?.prevETA,
    newETA: params?.newETA,
    details
  };
}

/**
 * Recalculates Delivery ETA when a Hold (+hours) or Delay (+hours) is applied
 */
export function recalculateETAOnDelay(
  currentETADateStr: string,
  delayHours: number
): { newETADate: string; newETATime: string } {
  let dateObj = new Date(currentETADateStr);
  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
    dateObj.setDate(dateObj.getDate() + 3);
    dateObj.setHours(17, 0, 0, 0); // 5:00 PM
  }

  const updatedEpoch = dateObj.getTime() + delayHours * 3600 * 1000;
  const newDateObj = new Date(updatedEpoch);

  const { dateStr, timeStr } = formatDateTime(newDateObj);
  return { newETADate: dateStr, newETATime: timeStr };
}

/**
 * 1. HOLD Handler: Freezes progress %, freezes estimated position, pushes ETA
 */
export function applyHoldState(
  shipment: Shipment,
  holdReason: string,
  holdHours: number,
  operator = 'Super Admin'
): { updatedShipment: Shipment; auditEntry: ShipmentAuditEntry; event: TrackingEvent } {
  const prevETA = typeof shipment.estimatedDelivery === 'string'
    ? shipment.estimatedDelivery
    : (shipment.estimatedDelivery as any)?.date || 'On Schedule';

  const { newETADate, newETATime } = recalculateETAOnDelay(prevETA, holdHours);
  const newETA = `${newETADate} • ${newETATime}`;

  const currentProgress = shipment.progressPercent ?? 35;

  const updatedShipment: Shipment = {
    ...shipment,
    status: 'ON_HOLD',
    statusText: `On Hold (${holdReason})`,
    statusMessage: `Shipment temporarily paused: ${holdReason}. Delivery ETA extended by +${holdHours} hours.`,
    isHoldFrozen: true,
    frozenProgressPercent: currentProgress,
    progressPercent: currentProgress,
    // estimatedDelivery/estimatedDeliveryDetail (date + time-window, matching how every other
    // part of the app models ETA — see Shipment type) rather than one combined "date • time"
    // string, so this pushed-back ETA actually round-trips through the backend's separate
    // estimated_delivery_date/estimated_delivery_time columns instead of getting silently
    // dropped by callers that expect the split shape.
    estimatedDelivery: newETADate,
    estimatedDeliveryDetail: newETATime,
    lastUpdated: 'Just now'
  };

  const now = new Date();
  const timestampStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const event: TrackingEvent = {
    id: `ev-${Date.now()}`,
    status: 'ON_HOLD',
    milestoneState: 'CONFIRMED',
    title: `Shipment Placed On Hold: ${holdReason}`,
    location: formatLocationString(shipment.currentLocation),
    facility: shipment.currentFacility || `${shipment.origin.city} Sorting Hub`,
    city: getLocationCityState(shipment.currentLocation).city || shipment.origin.city,
    state: getLocationCityState(shipment.currentLocation).state || shipment.origin.state,
    timestamp: timestampStr,
    displayDate: timestampStr.split(' · ')[0],
    displayTime: timestampStr.split(' · ')[1],
    description: `Operational hold initiated. Linehaul movement paused. Delivery ETA extended by +${holdHours}h to ${newETADate}.`,
    isCompleted: true,
    isCurrent: true,
    recordedBy: operator
  };

  const auditEntry = createAuditLogEntry(
    operator,
    'HOLD_APPLIED',
    `Shipment placed on hold for ${holdReason}. Progress frozen at ${currentProgress}%. ETA pushed by +${holdHours}h.`,
    {
      reason: holdReason,
      durationHours: holdHours,
      prevETA,
      newETA
    }
  );

  updatedShipment.timeline = [event, ...(shipment.timeline || []).map(e => ({ ...e, isCurrent: false }))];
  updatedShipment.auditLog = [auditEntry, ...(shipment.auditLog || [])];

  return { updatedShipment, auditEntry, event };
}

/**
 * 2. RESUME Handler: Unfreezes hold and continues linehaul progression
 */
export function applyResumeState(
  shipment: Shipment,
  operator = 'Super Admin'
): { updatedShipment: Shipment; auditEntry: ShipmentAuditEntry; event: TrackingEvent } {
  const currentProgress = shipment.frozenProgressPercent ?? shipment.progressPercent ?? 35;

  const updatedShipment: Shipment = {
    ...shipment,
    status: 'IN_TRANSIT',
    statusText: 'In Linehaul Transit (Resumed)',
    statusMessage: 'Hold condition resolved. Shipment movement has resumed along scheduled interstate corridor.',
    isHoldFrozen: false,
    progressPercent: currentProgress,
    lastUpdated: 'Just now'
  };

  const now = new Date();
  const timestampStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const event: TrackingEvent = {
    id: `ev-${Date.now()}`,
    status: 'IN_TRANSIT',
    milestoneState: 'CONFIRMED',
    title: 'Linehaul Transit Resumed',
    location: formatLocationString(shipment.currentLocation),
    facility: shipment.currentFacility || `${shipment.origin.city} Gateway`,
    city: getLocationCityState(shipment.currentLocation).city || shipment.origin.city,
    state: getLocationCityState(shipment.currentLocation).state || shipment.origin.state,
    timestamp: timestampStr,
    displayDate: timestampStr.split(' · ')[0],
    displayTime: timestampStr.split(' · ')[1],
    description: 'Operational hold resolved. Consignment moving toward destination on revised schedule.',
    isCompleted: true,
    isCurrent: true,
    recordedBy: operator
  };

  const auditEntry = createAuditLogEntry(
    operator,
    'TRANSIT_RESUMED',
    `Operational hold resolved. Linehaul progression resumed from ${currentProgress}%.`
  );

  updatedShipment.timeline = [event, ...(shipment.timeline || []).map(e => ({ ...e, isCurrent: false }))];
  updatedShipment.auditLog = [auditEntry, ...(shipment.auditLog || [])];

  return { updatedShipment, auditEntry, event };
}

/**
 * 3. DELAY Handler: Shifts operational schedule without freezing movement
 */
export function applyDelayState(
  shipment: Shipment,
  delayReason: string,
  delayHours: number,
  operator = 'Super Admin'
): { updatedShipment: Shipment; auditEntry: ShipmentAuditEntry; event: TrackingEvent } {
  const prevETA = typeof shipment.estimatedDelivery === 'string'
    ? shipment.estimatedDelivery
    : (shipment.estimatedDelivery as any)?.date || 'On Schedule';

  const { newETADate, newETATime } = recalculateETAOnDelay(prevETA, delayHours);
  const newETA = `${newETADate} • ${newETATime}`;

  const updatedShipment: Shipment = {
    ...shipment,
    status: 'DELAYED',
    statusText: `Transit Delayed (${delayReason})`,
    statusMessage: `Corridor transit delay: ${delayReason}. New estimated delivery is ${newETADate}.`,
    // Split date/time, matching the app's ETA convention — see the same fix in applyHoldState.
    estimatedDelivery: newETADate,
    estimatedDeliveryDetail: newETATime,
    lastUpdated: 'Just now'
  };

  const now = new Date();
  const timestampStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const event: TrackingEvent = {
    id: `ev-${Date.now()}`,
    status: 'DELAYED',
    milestoneState: 'CONFIRMED',
    title: `Transit Delay Advisory: ${delayReason}`,
    location: formatLocationString(shipment.currentLocation),
    facility: shipment.currentFacility || 'Interstate Linehaul Corridor',
    city: getLocationCityState(shipment.currentLocation).city || shipment.origin.city,
    state: getLocationCityState(shipment.currentLocation).state || shipment.origin.state,
    timestamp: timestampStr,
    displayDate: timestampStr.split(' · ')[0],
    displayTime: timestampStr.split(' · ')[1],
    description: `Corridor schedule delay recorded: ${delayReason}. Estimated delivery commitment adjusted by +${delayHours}h.`,
    isCompleted: true,
    isCurrent: true,
    recordedBy: operator
  };

  const auditEntry = createAuditLogEntry(
    operator,
    'DELAY_LOGGED',
    `Delay logged: ${delayReason}. Transit schedule shifted by +${delayHours}h.`,
    {
      reason: delayReason,
      durationHours: delayHours,
      prevETA,
      newETA
    }
  );

  updatedShipment.timeline = [event, ...(shipment.timeline || []).map(e => ({ ...e, isCurrent: false }))];
  updatedShipment.auditLog = [auditEntry, ...(shipment.auditLog || [])];

  return { updatedShipment, auditEntry, event };
}

/**
 * 4. RETURN TO ORIGIN (RTO) Handler: Preserves original journey leg and appends return journey
 */
export function applyReturnToOrigin(
  shipment: Shipment,
  returnReason: string,
  operator = 'Super Admin'
): { updatedShipment: Shipment; auditEntry: ShipmentAuditEntry; event: TrackingEvent } {
  const returnTrackingNumber = `DXP-RTO-${shipment.trackingNumber.replace('DXP-', '')}`;

  const now = new Date();
  const timestampStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const event: TrackingEvent = {
    id: `ev-${Date.now()}`,
    status: 'EXCEPTION',
    milestoneState: 'CONFIRMED',
    title: `Return to Origin Initiated: ${returnReason}`,
    location: formatLocationString(shipment.currentLocation),
    facility: 'Regional Transit Sort Center',
    city: getLocationCityState(shipment.currentLocation).city || shipment.destination.city,
    state: getLocationCityState(shipment.currentLocation).state || shipment.destination.state,
    timestamp: timestampStr,
    displayDate: timestampStr.split(' · ')[0],
    displayTime: timestampStr.split(' · ')[1],
    description: `Original journey concluded (Exception: ${returnReason}). Return leg initialized back to sender at ${shipment.origin.city}, ${shipment.origin.state}.`,
    isCompleted: true,
    isCurrent: true,
    recordedBy: operator
  };

  const returnLeg: ReturnJourneyLeg = {
    returnTrackingNumber,
    originalTrackingNumber: shipment.trackingNumber,
    returnInitiatedDate: timestampStr,
    reason: returnReason,
    origin: { ...shipment.destination },
    destination: { ...shipment.origin },
    status: 'IN_TRANSIT',
    timeline: [event]
  };

  const auditEntry = createAuditLogEntry(
    operator,
    'RETURN_INITIATED',
    `Return journey initiated due to "${returnReason}". Original route history preserved. Return leg ${returnTrackingNumber} registered.`,
    { reason: returnReason }
  );

  const updatedShipment: Shipment = {
    ...shipment,
    status: 'EXCEPTION',
    statusText: `Returning to Origin (${returnReason})`,
    statusMessage: `Consignment is being returned to sender at ${shipment.origin.city}, ${shipment.origin.state}.`,
    returnLeg,
    timeline: [event, ...(shipment.timeline || []).map(e => ({ ...e, isCurrent: false }))],
    auditLog: [auditEntry, ...(shipment.auditLog || [])],
    lastUpdated: 'Just now'
  };

  return { updatedShipment, auditEntry, event };
}

/**
 * Calculates genuine dynamic time-elapsed progress percentage (0 - 100%)
 * based on start time, SLA duration hours, and real-world clock time.
 */
export function calculateDynamicTimeProgress(
  shipment: Shipment | null | undefined,
  serviceCommitmentHours: number = 24,
  route?: RouteContext
): {
  progressPercent: number;
  interpolatedLocation: string;
  isCompletedTime: boolean;
  activeMilestoneStage: string;
} {
  if (!shipment) {
    return { progressPercent: 15, interpolatedLocation: 'Origin Sort Facility', isCompletedTime: false, activeMilestoneStage: 'Intake' };
  }

  const status = shipment.status || 'IN_TRANSIT';
  if (status === 'DELIVERED') {
    return {
      progressPercent: 100,
      interpolatedLocation: `${shipment.destination?.city || 'Destination'}, ${shipment.destination?.state || ''}`,
      isCompletedTime: true,
      activeMilestoneStage: 'Delivered'
    };
  }

  if (status === 'ON_HOLD' || status === 'HELD') {
    const frozen = shipment.frozenProgressPercent ?? shipment.progressPercent ?? 35;
    return {
      progressPercent: frozen,
      interpolatedLocation: typeof shipment.currentLocation === 'string'
        ? shipment.currentLocation
        : `${(shipment.currentLocation as any)?.city || 'Transit Hub'}, ${(shipment.currentLocation as any)?.state || ''}`,
      isCompletedTime: false,
      activeMilestoneStage: 'Hold Staged'
    };
  }

  if (status === 'CREATED' || status === 'AWAITING_PICKUP' || status === 'BOOKED') {
    return {
      progressPercent: 0,
      interpolatedLocation: `${shipment.origin?.city || 'Origin'}, ${shipment.origin?.state || ''}`,
      isCompletedTime: false,
      activeMilestoneStage: 'Consignment Created'
    };
  }

  if (status === 'RECEIVED') {
    return {
      progressPercent: 5,
      interpolatedLocation: `${shipment.origin?.city || 'Origin'}, ${shipment.origin?.state || ''}`,
      isCompletedTime: false,
      activeMilestoneStage: 'Received at Origin Terminal'
    };
  }

  // Determine start timestamp: earliest event timestamp, shipment createdAt, or pickupDate
  let startMs = Date.now() - 4 * 3600 * 1000; // default 4 hours ago
  const events = shipment.timeline || shipment.events || [];
  // Real event instants (occurredAt) first; the display text is only a fallback. This used to
  // parse only the display text and seed `oldest` from the first event, so one unreadable
  // first entry ("Today 12:14 AM") made it ignore every other event too.
  const eventTimes = events
    .map(ev => new Date((ev as any).occurredAt || ev.timestamp).getTime())
    .filter(t => !isNaN(t) && t > 0);
  if (eventTimes.length > 0) {
    startMs = Math.min(...eventTimes);
  } else if ((shipment as any).createdAtTs) {
    startMs = (shipment as any).createdAtTs;
  } else if ((shipment as any).createdAt) {
    const parsed = new Date((shipment as any).createdAt).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      startMs = parsed;
    }
  } else if ((shipment as any).pickupDate) {
    const parsed = new Date((shipment as any).pickupDate).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      startMs = parsed;
    }
  }

  const totalDurationMs = Math.max(1, serviceCommitmentHours * 3600 * 1000);
  const nowMs = Date.now();
  const elapsedMs = Math.max(0, nowMs - startMs);

  let ratio = elapsedMs / totalDurationMs;
  if (ratio > 1) ratio = 1;

  // Real-time dynamic progress calculation
  let dynamicProgress = Math.round(ratio * 100);

  // If status is IN_TRANSIT and time has elapsed 24h+, progress reaches destination gateway (90-95%)
  if (status === 'IN_TRANSIT') {
    dynamicProgress = Math.max(15, Math.min(94, dynamicProgress));
  } else if (status === 'OUT_FOR_DELIVERY') {
    dynamicProgress = Math.max(88, Math.min(98, dynamicProgress));
  } else if (status === 'AT_FACILITY' || status === 'DEPARTED_FACILITY') {
    dynamicProgress = Math.max(dynamicProgress, 50);
  }

  const originCity = shipment.origin?.city || 'Origin';
  const destCity = shipment.destination?.city || 'Destination';

  const ctx = route || shipmentRouteContext(shipment);
  const isAir = ctx.mode === 'AIR';
  let activeMilestoneStage = isAir ? 'Departed on Air Freight' : 'In Linehaul';
  if (dynamicProgress >= 90) {
    activeMilestoneStage = `Arrived at ${destCity} Gateway`;
  } else if (dynamicProgress >= 65) {
    activeMilestoneStage = ctx.international ? 'Import Customs Clearance' : 'Approaching Regional Hub';
  } else if (dynamicProgress >= 35) {
    activeMilestoneStage = isAir ? 'In Flight' : ctx.international ? 'Cross-Border Linehaul' : 'Interstate Linehaul Corridor';
  }

  return {
    progressPercent: dynamicProgress,
    interpolatedLocation: `${originCity} → ${destCity}`,
    isCompletedTime: ratio >= 1,
    activeMilestoneStage
  };
}

