/**
 * Duolingo Express — date parsing & formatting shared by the server and the browser.
 *
 * Every stored date now has a real timestamp (epoch ms) next to its display text, and the
 * display text has one consistent shape with a year. Before this, dates were free text written
 * five different ways depending on which code path wrote them ("Today 12:14 AM",
 * "Sep 23 10:58 AM", "August 19, 2026 · 11:42 AM ET", "Wednesday, August 22", "2026-08-11"),
 * and anything without a year was read by `new Date()` as the year 2001 — which silently broke
 * sorting and the progress-pacing math.
 */

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

/** Time-zone labels people write next to a time, mapped to the zone they mean. */
const ZONE_LABELS: Record<string, string> = {
  ET: 'America/New_York', EST: 'America/New_York', EDT: 'America/New_York',
  CT: 'America/Chicago', CST: 'America/Chicago', CDT: 'America/Chicago',
  MT: 'America/Denver', MDT: 'America/Denver', MST: 'America/Phoenix',
  PT: 'America/Los_Angeles', PST: 'America/Los_Angeles', PDT: 'America/Los_Angeles',
  AKST: 'America/Anchorage', AKDT: 'America/Anchorage',
  HST: 'Pacific/Honolulu',
  UTC: 'UTC', GMT: 'UTC', Z: 'UTC',
};
const ZONE_LABEL_RE = new RegExp(`\\b(${Object.keys(ZONE_LABELS).join('|')})\\s*$`);

/** IANA zone for a label like "CT", or undefined if it isn't one we know. */
export function zoneForLabel(label?: string | null): string | undefined {
  return label ? ZONE_LABELS[label.trim().toUpperCase()] : undefined;
}

/** Offset (ms) of `timeZone` from UTC at instant `ts`. */
function zoneOffsetMs(ts: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ts));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/** Epoch ms for a wall-clock time in a given zone (handles daylight saving). */
export function zonedTimeToEpoch(y: number, month0: number, d: number, h: number, min: number, timeZone: string): number {
  const naive = Date.UTC(y, month0, d, h, min);
  let ts = naive - zoneOffsetMs(naive, timeZone);
  ts = naive - zoneOffsetMs(ts, timeZone); // second pass settles DST boundaries
  return ts;
}

/** Calendar parts of `ts` as seen in `timeZone`. */
function zonedParts(ts: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(ts));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  return { y: get('year'), m: get('month') - 1, d: get('day') };
}

export interface ParsedDate {
  ts: number;
  hasYear: boolean;
  hasTime: boolean;
  /** The time-zone label written in the text, if any ("CT"). */
  zoneLabel?: string;
}

export interface ParseOptions {
  /** "Now" for relative words, and the anchor used to infer a missing year. */
  referenceMs: number;
  /** Zone for times written without a label. */
  timeZone: string;
  /** Time of day to assume when the text has none: 'end' = 23:59 (deadlines), 'noon' = 12:00. */
  defaultTime?: 'end' | 'noon';
}

/**
 * Reads any date/time text this app has ever stored. Returns null for text with no date in it
 * at all ("2-3 Business Days", "Revised Schedule"). A missing year is inferred as the year that
 * puts the date closest to `referenceMs` (so "Dec 30" written in January means last December).
 */
export function parseLooseDate(text: string | null | undefined, opts: ParseOptions): ParsedDate | null {
  const raw = (text || '').trim();
  if (!raw) return null;

  // Full ISO timestamps carry their own zone.
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const ts = Date.parse(raw);
    return isNaN(ts) ? null : { ts, hasYear: true, hasTime: true, zoneLabel: undefined };
  }

  const zoneMatch = raw.match(ZONE_LABEL_RE);
  const zoneLabel = zoneMatch ? zoneMatch[1].toUpperCase() : undefined;
  const timeZone = zoneForLabel(zoneLabel) || opts.timeZone;

  let y: number | undefined;
  let m: number | undefined;
  let d: number | undefined;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})\b/);
  const named = raw.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s+(\d{4}))?/i);
  const numeric = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  const relative = raw.match(/^(today|just now|now|yesterday)\b/i);

  if (iso) {
    y = Number(iso[1]); m = Number(iso[2]) - 1; d = Number(iso[3]);
  } else if (named) {
    m = MONTHS[named[1].toLowerCase()];
    d = Number(named[2]);
    if (named[3]) y = Number(named[3]);
  } else if (numeric) {
    m = Number(numeric[1]) - 1; d = Number(numeric[2]); y = Number(numeric[3]);
  } else if (relative) {
    const ref = zonedParts(opts.referenceMs, timeZone);
    const back = relative[1].toLowerCase() === 'yesterday' ? 1 : 0;
    const shifted = zonedParts(zonedTimeToEpoch(ref.y, ref.m, ref.d, 12, 0, timeZone) - back * 86400000, timeZone);
    y = shifted.y; m = shifted.m; d = shifted.d;
    if (/^(just now|now)$/i.test(raw)) {
      return { ts: opts.referenceMs, hasYear: true, hasTime: true, zoneLabel };
    }
  } else {
    return null;
  }
  if (m === undefined || d === undefined || isNaN(m) || d < 1 || d > 31) return null;

  const timeMatch = raw.match(/\b(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]\.?/) || raw.match(/\b(\d{1,2}):(\d{2})\b(?!\s*[AaPp])/);
  let h: number;
  let min: number;
  const hasTime = !!timeMatch && !(iso && !raw.includes(':'));
  if (timeMatch) {
    h = Number(timeMatch[1]);
    min = Number(timeMatch[2]);
    if (timeMatch[3]) {
      const pm = timeMatch[3].toLowerCase() === 'p';
      if (pm && h !== 12) h += 12;
      if (!pm && h === 12) h = 0;
    }
  } else if (opts.defaultTime === 'end') {
    h = 23; min = 59;
  } else {
    h = 12; min = 0;
  }

  const hasYear = y !== undefined;
  if (!hasYear) {
    const refYear = zonedParts(opts.referenceMs, timeZone).y;
    let best = refYear;
    let bestGap = Infinity;
    for (const candidate of [refYear - 1, refYear, refYear + 1]) {
      const gap = Math.abs(zonedTimeToEpoch(candidate, m, d, h, min, timeZone) - opts.referenceMs);
      if (gap < bestGap) { bestGap = gap; best = candidate; }
    }
    y = best;
  }

  const ts = zonedTimeToEpoch(y!, m, d, h, min, timeZone);
  return isNaN(ts) ? null : { ts, hasYear, hasTime, zoneLabel };
}

/** "Oct 5, 2026" */
export function formatDisplayDate(ts: number, timeZone: string): string {
  return new Date(ts).toLocaleDateString('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Thu, Oct 8, 2026" — the shape delivery dates are shown in. */
export function formatEtaDate(ts: number, timeZone: string): string {
  return new Date(ts).toLocaleDateString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

/** "9:58 AM" */
export function formatClockTime(ts: number, timeZone: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' });
}

/** Short zone name at that instant: "EDT", "CST", "UTC". */
export function zoneAbbreviation(ts: number, timeZone: string): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(new Date(ts)).find(p => p.type === 'timeZoneName');
  return part?.value || 'UTC';
}

/**
 * "Oct 5, 2026 · 9:58 AM EDT" — the one shape every event time is stored and shown in.
 * `zoneLabel` keeps a label the admin typed ("CT") instead of the computed abbreviation.
 */
export function formatEventDisplay(ts: number, timeZone: string, zoneLabel?: string): string {
  return `${formatDisplayDate(ts, timeZone)} · ${formatClockTime(ts, timeZone)} ${zoneLabel || zoneAbbreviation(ts, timeZone)}`;
}

/**
 * Delivery deadline timestamp from a date text plus the free-text window ("by 5:00 PM",
 * "End of Day"): the window's clock time when it has one, else the end of that day.
 */
export function etaTimestamp(dateText: string | null | undefined, windowText: string | null | undefined, opts: Omit<ParseOptions, 'defaultTime'>): number | null {
  const day = parseLooseDate(dateText, { ...opts, defaultTime: 'end' });
  if (!day) return null;
  if (day.hasTime) return day.ts;
  const clock = (windowText || '').match(/\b(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]/);
  if (!clock) return day.ts;
  const tz = zoneForLabel(day.zoneLabel) || opts.timeZone;
  const p = zonedParts(day.ts, tz);
  let h = Number(clock[1]);
  const pm = clock[3].toLowerCase() === 'p';
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return zonedTimeToEpoch(p.y, p.m, p.d, h, Number(clock[2]), tz);
}

/**
 * Splits a stored event display string back into the date and time fields the timeline
 * renders ("Oct 5, 2026 · 9:58 AM EDT" -> "Oct 5, 2026" / "9:58 AM EDT").
 */
export function splitEventTimestamp(raw: string): { displayDate: string; displayTime: string; timezone?: string } {
  const str = (raw || '').trim();
  if (!str) return { displayDate: '', displayTime: '' };
  const zoneMatch = str.match(/\b([A-Z]{2,5}|GMT[+-]\d{1,2}|UTC[+-]\d{1,2})\s*$/);
  const timezone = zoneMatch ? zoneMatch[1] : undefined;
  const timeMatch = str.match(/\d{1,2}:\d{2}\s*[AaPp][Mm]/);
  if (timeMatch) {
    const timeIdx = str.indexOf(timeMatch[0]);
    const displayDate = str.slice(0, timeIdx).replace(/[·\-–—]+\s*$/, '').trim() || str;
    const displayTime = str.slice(timeIdx).trim();
    return { displayDate, displayTime, timezone };
  }
  return { displayDate: str, displayTime: '', timezone };
}
