import { db } from './db.js';
import { calculateRouteGeometry, calculateEstimatedPosition } from '../src/services/routingEngine.js';
import { resolveProgressPaceHours } from '../src/services/planningEngine.js';
import { findNearestMetro } from '../src/services/geocodingService.js';

/**
 * Advances a shipment's progress based on real elapsed time, server-side, so it moves
 * forward whether or not anyone is watching it (previously, progress only ever changed via
 * an explicit admin action or a client-side "Simulate" session that didn't persist).
 *
 * Paces against `resolveProgressPaceHours` (planningEngine.ts) — this shipment's OWN real
 * promised delivery window (createdAt -> estimatedDeliveryDate, when a usable one is stored)
 * if it has one, otherwise `getServiceCommitmentHours`'s real, distance-based service-level
 * default. This used to pace against a separate, deliberately-compressed "demo" timescale
 * (1.5-9h regardless of the shipment's real promised window) so admins could watch a shipment
 * move within a short testing session — but that meant a shipment promising next-day delivery
 * could show 30%+ complete within minutes of being created, which doesn't correspond to
 * anything the page told the customer. It also meant a manually-overridden ETA (e.g. an admin
 * typing in a custom "3 days from now") was silently ignored for pacing purposes even after
 * the service-level default was fixed — resolveProgressPaceHours closes that gap by
 * preferring the shipment's actual stored dates whenever they're present and sane. An admin
 * who wants to watch a shipment complete faster than its real promised window should use the
 * Simulate panel's speed multipliers (2x-50x) instead — that's what they're for; this
 * automatic background pace should just tell the truth.
 *
 * Also recomputes and persists the vehicle's estimated map position (current_location_lat/lng)
 * to match the newly-advanced progress, along the same synthetic route geometry the map
 * itself falls back to. This is what makes the marker actually move for every viewer, on
 * every device, from one server-authoritative value — not a per-browser animation. It is
 * explicitly an SCHEDULE-BASED ESTIMATE, not a GPS ping: the UI must label it as such
 * ("Estimated Position (Schedule-Based)"), never "Live GPS" or "Live Tracking".
 *
 * Also advances `status` itself from RECEIVED/PROCESSING/AT_FACILITY/DEPARTED_FACILITY/
 * DESTINATION_PROCESSING to IN_TRANSIT once real movement has actually started — this used to
 * only ever touch progress_percent, leaving status permanently frozen (a shipment could sit
 * at 94% progress while still reading "Received at Origin Facility" forever). Still
 * deliberately conservative past that: never auto-advances to OUT_FOR_DELIVERY or DELIVERED,
 * and stops short of 100% — that final confirmation still requires an explicit admin action,
 * same as a real courier's last-mile scan.
 */

const MOVING_STATUSES = new Set([
  'RECEIVED',
  'PROCESSING',
  'IN_TRANSIT',
  'AT_FACILITY',
  'DEPARTED_FACILITY',
  'DESTINATION_PROCESSING',
]);

const PRE_TRANSIT_STATUSES = new Set([
  'RECEIVED',
  'PROCESSING',
  'AT_FACILITY',
  'DEPARTED_FACILITY',
  'DESTINATION_PROCESSING',
]);

interface ProgressRow {
  tracking_number: string;
  status: string;
  status_text?: string;
  service: string;
  progress_percent: number;
  progress_updated_at_ts: number | null;
  created_at_ts?: number | null;
  estimated_delivery_date?: string;
  estimated_delivery_time?: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  current_location_lat?: number;
  current_location_lng?: number;
  current_location_city?: string;
  current_location_state?: string;
}


/**
 * Given a shipment row, returns the progress it should show right now, advancing it (and
 * persisting the advance + a fresh clock reading) if real time has passed since the last
 * check. Rows not in a "moving" status are returned unchanged — on hold, delayed, out for
 * delivery, delivered, exception, cancelled and returned shipments all require an explicit
 * admin action to change, by design.
 */
export function syncTimeBasedProgress(row: ProgressRow): number {
  if (!MOVING_STATUSES.has(row.status)) {
    return row.progress_percent;
  }

  const now = Date.now();
  const lastTs = row.progress_updated_at_ts || now;

  if (!row.progress_updated_at_ts) {
    // First time we've seen this row since the column existed — start the clock now
    // rather than assuming any elapsed time, and don't advance progress on this call.
    db.prepare('UPDATE shipments SET progress_updated_at_ts = ? WHERE tracking_number = ?')
      .run(now, row.tracking_number);
    return row.progress_percent;
  }

  const elapsedHours = (now - lastTs) / (1000 * 60 * 60);
  if (elapsedHours <= 0) {
    return row.progress_percent;
  }

  // Recompute the estimated position along the same synthetic corridor geometry the map
  // uses as its own fallback, so the persisted coordinate always matches the persisted
  // progress instead of drifting apart the moment a shipment moves unattended. Computed here
  // (rather than after the pace calc below) because getServiceCommitmentHours needs the real
  // route distance too.
  const origin = { lat: row.origin_lat, lng: row.origin_lng };
  const destination = { lat: row.destination_lat, lng: row.destination_lng };
  const routeGeom = calculateRouteGeometry(origin, destination);

  const slaHours = resolveProgressPaceHours(row.service, routeGeom.distanceMiles, row.created_at_ts, row.estimated_delivery_date, row.estimated_delivery_time);
  const ratePerHour = 100 / slaHours;
  const advance = elapsedHours * ratePerHour;

  if (advance < 0.05) {
    // Not enough real time has passed to move the needle — skip the write.
    return row.progress_percent;
  }

  const nextProgress = Math.max(0, Math.min(94, Math.round((row.progress_percent + advance) * 10) / 10));
  const pos = calculateEstimatedPosition(routeGeom.polyline, nextProgress);
  const nearestMetro = findNearestMetro(pos.lat, pos.lng);

  // Advance status alongside progress: once a pre-transit shipment has genuinely started
  // moving, it should read IN_TRANSIT rather than staying stuck on "Received"/"Processing"
  // indefinitely. Never auto-advances further than that — OUT_FOR_DELIVERY/DELIVERED are
  // still an explicit admin action, matching the 94% progress ceiling just above.
  const nextStatus = PRE_TRANSIT_STATUSES.has(row.status) && nextProgress > 0 ? 'IN_TRANSIT' : row.status;
  const nextStatusText = nextStatus !== row.status
    ? `In Linehaul Transit (${Math.round(nextProgress)}% Complete)`
    : (row.status_text ?? null);

  db.prepare(`
    UPDATE shipments
    SET progress_percent = ?, progress_updated_at_ts = ?,
        current_location_lat = ?, current_location_lng = ?,
        current_location_city = COALESCE(?, current_location_city),
        current_location_state = COALESCE(?, current_location_state),
        status = ?, status_text = COALESCE(?, status_text)
    WHERE tracking_number = ?
  `).run(
    nextProgress, now, pos.lat, pos.lng,
    nearestMetro?.city ?? null, nearestMetro?.state ?? null,
    nextStatus, nextStatus !== row.status ? nextStatusText : null,
    row.tracking_number
  );

  // Log a real checkpoint event for the transition, same as any admin-triggered status
  // change does — otherwise the status field silently flips with nothing in the shipment's
  // actual timeline/event history to show for it, which is exactly the kind of gap that made
  // the "Shipment Timeline" panel look frozen even as the shipment was genuinely moving.
  if (nextStatus !== row.status) {
    db.prepare('UPDATE tracking_events SET current_flag = 0 WHERE shipment_tracking = ?').run(row.tracking_number);
    const eventCount = (db.prepare('SELECT COUNT(*) as count FROM tracking_events WHERE shipment_tracking = ?').get(row.tracking_number) as any).count;
    const nowDate = new Date(now);
    db.prepare(`
      INSERT INTO tracking_events (
        id, shipment_tracking, status, title, location, facility,
        timestamp, description, operator_notes, delay_flag, completed, current_flag, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `e-${now}`,
      row.tracking_number,
      nextStatus,
      'Departed Facility — Linehaul Transit Underway',
      nearestMetro ? `${nearestMetro.city}, ${nearestMetro.state}` : 'Interstate Transit Corridor',
      'Automated Schedule-Based Checkpoint',
      `${nowDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${nowDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      'Consignment departed origin facility and is proceeding along the scheduled linehaul corridor.',
      'Auto-generated by schedule-based progress sync.',
      0, 1, 1, eventCount + 1
    );
  }

  row.status = nextStatus;
  if (nextStatusText) {
    row.status_text = nextStatusText;
  }
  row.current_location_lat = pos.lat;
  row.current_location_lng = pos.lng;
  if (nearestMetro) {
    row.current_location_city = nearestMetro.city;
    row.current_location_state = nearestMetro.state;
  }

  return nextProgress;
}
