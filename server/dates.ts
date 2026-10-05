import {
  parseLooseDate,
  formatEventDisplay,
  formatDisplayDate,
  formatEtaDate,
  etaTimestamp,
  zoneForLabel,
} from '../src/utils/dates.js';

/**
 * The zone server-generated times are written in. Previously each time was formatted in
 * whatever zone the host machine happened to run in (often UTC), with no label. Defaults to
 * the company's headquarters zone (New York); set BUSINESS_TIMEZONE to an IANA zone to change.
 */
export const BUSINESS_TZ = process.env.BUSINESS_TIMEZONE || 'America/New_York';

/** "Oct 5, 2026" for a shipment's creation date. */
export function displayDate(ts: number = Date.now()): string {
  return formatDisplayDate(ts, BUSINESS_TZ);
}

/** Display text for an event that happened at `ts` (server-generated). */
export function eventDisplay(ts: number = Date.now()): string {
  return formatEventDisplay(ts, BUSINESS_TZ);
}

/**
 * A delivery date as sent by a client, normalized: full display date with a year plus the
 * deadline timestamp. Text with no date in it ("2-3 Business Days") is kept as-is with no
 * timestamp, rather than guessed at.
 */
export function normalizeEta(
  dateText: string | null | undefined,
  windowText: string | null | undefined,
  referenceMs: number
): { date: string | null; ts: number | null } {
  if (dateText == null || String(dateText).trim() === '') return { date: null, ts: null };
  const ts = etaTimestamp(String(dateText), windowText, { referenceMs, timeZone: BUSINESS_TZ });
  if (ts === null) return { date: String(dateText), ts: null };
  const day = parseLooseDate(String(dateText), { referenceMs, timeZone: BUSINESS_TZ, defaultTime: 'end' });
  const zone = zoneForLabel(day?.zoneLabel) || BUSINESS_TZ;
  return { date: formatEtaDate(ts, zone), ts };
}

/**
 * When an event (from an admin form or a client) happened, and its display text. Accepts the
 * admin's own date + time (+ zone label like "CT") or an ISO timestamp; anything missing or
 * unreadable means "now".
 */
export function eventTimeFromInput(
  input: { displayDate?: string; displayTime?: string; timezone?: string; timestamp?: string },
  referenceMs: number = Date.now()
): { ts: number; display: string } {
  const label = input.timezone && zoneForLabel(input.timezone) ? input.timezone.toUpperCase() : undefined;
  const text = input.displayDate && input.displayTime
    ? `${input.displayDate} ${input.displayTime}${label && !new RegExp(`\\b${label}\\s*$`).test(input.displayTime) ? ` ${label}` : ''}`
    : input.timestamp;
  const parsed = parseLooseDate(text, { referenceMs, timeZone: BUSINESS_TZ, defaultTime: 'noon' });
  if (!parsed) return { ts: referenceMs, display: eventDisplay(referenceMs) };
  const zone = zoneForLabel(parsed.zoneLabel) || BUSINESS_TZ;
  return { ts: parsed.ts, display: formatEventDisplay(parsed.ts, zone, parsed.zoneLabel && zoneForLabel(parsed.zoneLabel) ? parsed.zoneLabel : undefined) };
}
