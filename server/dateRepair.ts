import { db } from './db.js';
import { createBackup } from './backup.js';
import { BUSINESS_TZ, normalizeEta } from './dates.js';
import { parseLooseDate, formatDisplayDate, formatEventDisplay, zoneForLabel } from '../src/utils/dates.js';

/**
 * One-time (idempotent) repair of dates written before every date had a real timestamp:
 *  - shipments.created_at saved as "Today" or "2026-08-11" -> "Aug 11, 2026"
 *  - shipments.estimated_delivery_date without a year ("Wednesday, August 22") -> full date,
 *    plus estimated_delivery_ts
 *  - tracking_events.timestamp in ~5 shapes, some without a year -> "Aug 19, 2026 · 11:42 AM ET",
 *    plus occurred_at_ts
 * A missing year is inferred from the shipment's own creation date. Computes every change
 * first; only if there is something to change does it take a backup, then applies everything
 * in one transaction. Runs on each startup and does nothing once the data is clean.
 */
export function repairLegacyDates(): { shipments: number; events: number } {
  const FULL_DATE = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/; // "Oct 5, 2026"

  const shipments = db.prepare(`
    SELECT tracking_number, created_at, created_at_ts, estimated_delivery_date, estimated_delivery_time, estimated_delivery_ts
    FROM shipments
  `).all() as any[];

  const shipmentUpdates: { tn: string; createdAt: string; createdAtTs: number; etaDate: string | null; etaTs: number | null }[] = [];
  const createdMsByTracking = new Map<string, number>();

  for (const s of shipments) {
    const fallbackMs = s.created_at_ts || Date.now();
    const parsedCreated = parseLooseDate(s.created_at, { referenceMs: fallbackMs, timeZone: BUSINESS_TZ, defaultTime: 'noon' });
    // A written date with a year is the truth; "Today" only tells us it was the row's own timestamp.
    const createdMs = parsedCreated?.hasYear ? parsedCreated.ts : fallbackMs;
    createdMsByTracking.set(s.tracking_number, createdMs);

    const createdAt = FULL_DATE.test(s.created_at || '') ? s.created_at : formatDisplayDate(createdMs, BUSINESS_TZ);
    // Keep the precise stored creation instant whenever it already falls on the written date
    // (every normally-created row). Only a stored instant that contradicts a written calendar
    // date is replaced — e.g. old rows whose created_at_ts was backfilled with made-up times.
    const relativeWord = /^(today|just now|now|yesterday)\b/i.test((s.created_at || '').trim());
    const storedMatchesText = !!s.created_at_ts && formatDisplayDate(s.created_at_ts, BUSINESS_TZ) === formatDisplayDate(createdMs, BUSINESS_TZ);
    const createdAtTs = storedMatchesText || relativeWord || !parsedCreated?.hasYear
      ? (s.created_at_ts || createdMs)
      : createdMs;

    let etaDate: string | null = s.estimated_delivery_date;
    let etaTs: number | null = s.estimated_delivery_ts ?? null;
    if (etaTs == null) {
      const eta = normalizeEta(s.estimated_delivery_date, s.estimated_delivery_time, createdMs);
      if (eta.ts != null) { etaDate = eta.date; etaTs = eta.ts; }
    }

    if (createdAt !== s.created_at || createdAtTs !== s.created_at_ts || etaDate !== s.estimated_delivery_date || etaTs !== (s.estimated_delivery_ts ?? null)) {
      shipmentUpdates.push({ tn: s.tracking_number, createdAt, createdAtTs, etaDate, etaTs });
    }
  }

  const events = db.prepare(`
    SELECT id, shipment_tracking, timestamp FROM tracking_events WHERE occurred_at_ts IS NULL
  `).all() as any[];
  const eventUpdates: { id: string; tn: string; ts: number; display: string }[] = [];
  for (const e of events) {
    const refMs = createdMsByTracking.get(e.shipment_tracking) ?? Date.now();
    const parsed = parseLooseDate(e.timestamp, { referenceMs: refMs, timeZone: BUSINESS_TZ, defaultTime: 'noon' });
    if (parsed) {
      const zone = zoneForLabel(parsed.zoneLabel) || BUSINESS_TZ;
      const keepLabel = parsed.zoneLabel && zoneForLabel(parsed.zoneLabel) ? parsed.zoneLabel : undefined;
      eventUpdates.push({ id: e.id, tn: e.shipment_tracking, ts: parsed.ts, display: formatEventDisplay(parsed.ts, zone, keepLabel) });
    } else {
      // Unreadable text: keep it as written, anchor the timestamp to the shipment's creation.
      eventUpdates.push({ id: e.id, tn: e.shipment_tracking, ts: refMs, display: e.timestamp });
    }
  }

  // "Last updated" saved as the words "Just now" (no year) — the tracking page then showed the
  // CURRENT time as the last update, however old it really was. Replaced with the shipment's
  // latest event time below.
  const staleLastUpdated = (db.prepare(`
    SELECT tracking_number FROM shipments WHERE last_updated IS NULL OR last_updated NOT GLOB '*[0-9][0-9][0-9][0-9]*'
  `).all() as any[]).map(r => r.tracking_number as string);

  if (shipmentUpdates.length === 0 && eventUpdates.length === 0 && staleLastUpdated.length === 0) {
    return { shipments: 0, events: 0 };
  }

  try {
    createBackup('premigration');
  } catch (err) {
    // No safety copy, no changes.
    console.error('[dates] Skipping date repair: could not take a backup first.', err);
    return { shipments: 0, events: 0 };
  }

  const updateShipment = db.prepare(`
    UPDATE shipments SET created_at = ?, created_at_ts = ?, estimated_delivery_date = ?, estimated_delivery_ts = ?
    WHERE tracking_number = ?
  `);
  const updateEvent = db.prepare('UPDATE tracking_events SET timestamp = ?, occurred_at_ts = ? WHERE id = ? AND shipment_tracking = ?');
  db.exec('BEGIN');
  try {
    for (const u of shipmentUpdates) updateShipment.run(u.createdAt, u.createdAtTs, u.etaDate, u.etaTs, u.tn);
    for (const u of eventUpdates) updateEvent.run(u.display, u.ts, u.id, u.tn);
    const latestEvent = db.prepare('SELECT timestamp FROM tracking_events WHERE shipment_tracking = ? ORDER BY occurred_at_ts DESC LIMIT 1');
    const setLastUpdated = db.prepare('UPDATE shipments SET last_updated = ? WHERE tracking_number = ?');
    for (const tn of staleLastUpdated) {
      const latest = latestEvent.get(tn) as { timestamp: string } | undefined;
      const fallback = createdMsByTracking.get(tn);
      const value = latest?.timestamp || (fallback ? formatEventDisplay(fallback, BUSINESS_TZ) : null);
      if (value) setLastUpdated.run(value, tn);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[dates] Date repair failed and was rolled back:', err);
    return { shipments: 0, events: 0 };
  }
  const touchedShipments = new Set([...shipmentUpdates.map(u => u.tn), ...staleLastUpdated]).size;
  console.log(`[dates] Repaired dates on ${touchedShipments} shipment(s) and ${eventUpdates.length} event(s).`);
  return { shipments: touchedShipments, events: eventUpdates.length };
}
