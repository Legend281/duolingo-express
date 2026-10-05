import { describe, it, expect } from 'vitest';
import {
  parseLooseDate,
  formatEventDisplay,
  formatEtaDate,
  formatDisplayDate,
  etaTimestamp,
  splitEventTimestamp,
  zonedTimeToEpoch,
} from '../../src/utils/dates';

const NY = 'America/New_York';
// Reference "now": Oct 5, 2026 10:00 AM New York time.
const REF = zonedTimeToEpoch(2026, 9, 5, 10, 0, NY);
const opts = { referenceMs: REF, timeZone: NY };
const at = (y: number, mo: number, d: number, h: number, mi: number, tz = NY) => zonedTimeToEpoch(y, mo - 1, d, h, mi, tz);

describe('parseLooseDate: every format found in the real database', () => {
  it.each([
    ['August 19, 2026 · 11:42 AM ET', at(2026, 8, 19, 11, 42)],
    ['August 20, 2026 · 4:35 PM CT', at(2026, 8, 20, 16, 35, 'America/Chicago')],
    ['August 14, 2026 · 2:15 PM PT', at(2026, 8, 14, 14, 15, 'America/Los_Angeles')],
    ['Sep 23 10:58 AM', at(2026, 9, 23, 10, 58)],
    ['Today 12:14 AM', at(2026, 10, 5, 0, 14)],
    ['Thu, Oct 8, 2026', at(2026, 10, 8, 12, 0)],
    ['2026-08-11', at(2026, 8, 11, 12, 0)],
    ['Oct 5, 2026 · 9:58 AM EDT', at(2026, 10, 5, 9, 58)],
  ])('%s', (text, expected) => {
    expect(parseLooseDate(text, opts)?.ts).toBe(expected);
  });

  it('infers a missing year from context instead of 2001', () => {
    const p = parseLooseDate('Wednesday, August 22', opts)!;
    expect(p.hasYear).toBe(false);
    expect(new Date(p.ts).getUTCFullYear()).toBe(2026);
    // Written in early January about late December -> last year
    const jan = parseLooseDate('Dec 30', { ...opts, referenceMs: at(2027, 1, 3, 9, 0) })!;
    expect(new Date(jan.ts).getUTCFullYear()).toBe(2026);
  });

  it('reads full ISO timestamps exactly', () => {
    expect(parseLooseDate('2026-10-05T14:00:00.000Z', opts)?.ts).toBe(Date.UTC(2026, 9, 5, 14, 0));
  });

  it('returns null when there is no date', () => {
    for (const t of ['2-3 Business Days', 'Revised Schedule', '', null, undefined]) {
      expect(parseLooseDate(t as any, opts)).toBeNull();
    }
  });

  it('uses end of day for deadlines without a time', () => {
    expect(parseLooseDate('Oct 8, 2026', { ...opts, defaultTime: 'end' })?.ts).toBe(at(2026, 10, 8, 23, 59));
  });
});

describe('formatting', () => {
  it('formats event times with a year and zone', () => {
    expect(formatEventDisplay(at(2026, 10, 5, 9, 58), NY)).toBe('Oct 5, 2026 · 9:58 AM EDT');
    expect(formatEventDisplay(at(2026, 8, 20, 16, 35, 'America/Chicago'), 'America/Chicago', 'CT')).toBe('Aug 20, 2026 · 4:35 PM CT');
  });

  it('formats dates', () => {
    expect(formatDisplayDate(at(2026, 10, 5, 12, 0), NY)).toBe('Oct 5, 2026');
    expect(formatEtaDate(at(2026, 10, 8, 12, 0), NY)).toBe('Thu, Oct 8, 2026');
  });

  it('round-trips: formatted text parses back to the same instant', () => {
    const ts = at(2026, 12, 31, 23, 15);
    expect(parseLooseDate(formatEventDisplay(ts, NY), opts)?.ts).toBe(ts);
  });

  it('handles the winter (standard time) zone label', () => {
    expect(formatEventDisplay(at(2026, 12, 1, 9, 0), NY)).toBe('Dec 1, 2026 · 9:00 AM EST');
  });
});

describe('delivery deadlines', () => {
  it('uses the clock time from the window', () => {
    expect(etaTimestamp('Thu, Oct 8, 2026', 'by 5:00 PM', opts)).toBe(at(2026, 10, 8, 17, 0));
  });
  it('falls back to end of day', () => {
    expect(etaTimestamp('Oct 8, 2026', 'End of Day', opts)).toBe(at(2026, 10, 8, 23, 59));
  });
  it('returns null for a non-date', () => {
    expect(etaTimestamp('2-3 Business Days', 'by 5:00 PM', opts)).toBeNull();
  });
});

describe('splitEventTimestamp', () => {
  it('splits the stored shape for the timeline', () => {
    expect(splitEventTimestamp('Oct 5, 2026 · 9:58 AM EDT')).toEqual({ displayDate: 'Oct 5, 2026', displayTime: '9:58 AM EDT', timezone: 'EDT' });
  });
});
