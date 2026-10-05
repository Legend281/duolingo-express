import { describe, it, expect } from 'vitest';
import {
  canonicalCountry,
  isUnitedStates,
  findWorldCity,
  pickerCountryName,
  normalizePlace,
} from '../../src/services/worldCities';
import {
  resolveLocation,
  formatPlace,
  findNearestMetro,
  domesticCountry,
  countryCodeFor,
} from '../../src/services/geocodingService';

describe('country names', () => {
  it('maps common spellings to one canonical name', () => {
    expect(canonicalCountry('UK')).toBe('United Kingdom');
    expect(canonicalCountry('usa')).toBe('United States');
    expect(canonicalCountry('Turkey')).toBe('Türkiye');
    expect(canonicalCountry('UAE')).toBe('United Arab Emirates');
    expect(canonicalCountry('Nigeria')).toBe('Nigeria');
  });

  it('treats blank and any US spelling as the United States', () => {
    for (const c of [undefined, null, '', 'US', 'U.S.A.', 'United States of America']) {
      expect(isUnitedStates(c as any)).toBe(true);
    }
    expect(isUnitedStates('Canada')).toBe(false);
  });

  it('normalizes accents and punctuation', () => {
    expect(normalizePlace('São Paulo')).toBe(normalizePlace('sao paulo'));
    expect(normalizePlace('St. Petersburg')).toBe('st petersburg');
  });

  it('returns the dropdown spelling for stored values', () => {
    expect(pickerCountryName('uk')).toBe('United Kingdom');
    expect(pickerCountryName('')).toBe('United States');
  });

  it('knows ISO codes for picker countries', () => {
    expect(countryCodeFor('Nigeria')).toBe('NG');
    expect(countryCodeFor('United Kingdom')).toBe('GB');
    expect(countryCodeFor('UK')).toBe('GB');
  });
});

describe('offline lookup (resolveLocation)', () => {
  it('keeps US behavior when no country is given', () => {
    const dallas = resolveLocation('Dallas, TX');
    expect(dallas?.state).toBe('TX');
    expect(dallas?.isExactCoordinate).toBe(true);
  });

  it('does not confuse same-named cities across countries', () => {
    expect(resolveLocation('Birmingham', 'United Kingdom')?.country).toBe('United Kingdom');
    expect(resolveLocation('Birmingham, AL')?.state).toBe('AL');
  });

  it('recognizes a trailing country with no country argument', () => {
    const london = resolveLocation('London, United Kingdom');
    expect(london?.country).toBe('United Kingdom');
    expect(london?.lat).toBeCloseTo(51.5, 0);
  });

  it('returns null for an unknown non-US place instead of a US fallback', () => {
    expect(resolveLocation('Atlantis', 'France')).toBeNull();
  });

  it('finds a world city by alias', () => {
    expect(findWorldCity('Bombay', 'India')?.city).toBe('Mumbai');
  });
});

describe('formatPlace', () => {
  it.each([
    [['Austin', 'TX', 'United States'], 'Austin, TX'],
    [['Dallas', 'TX', ''], 'Dallas, TX'],
    [['Niamey', 'Niamey', 'Niger'], 'Niamey, Niger'],
    [['Leeds', 'England', 'United Kingdom'], 'Leeds, England, United Kingdom'],
    [['Singapore', 'Singapore', 'Singapore'], 'Singapore'],
    [['Enugu', '', 'Nigeria'], 'Enugu, Nigeria'],
  ])('%j -> %s', (args, expected) => {
    expect(formatPlace(...(args as [string, string, string]))).toBe(expected);
  });
});

describe('nearest place naming', () => {
  it('names positions abroad after a city in the right country', () => {
    // Between Enugu and Leeds, over Algeria
    const near = findNearestMetro(30.3, 4.1);
    expect(near?.country).toBe('Algeria');
  });

  it('keeps a domestic shipment inside its country', () => {
    // A point in Ontario on a Detroit -> Buffalo truck
    const near = findNearestMetro(42.9, -81.3, domesticCountry('United States', 'United States'));
    expect(near?.country).toBe('United States');
    expect(domesticCountry('Nigeria', 'United Kingdom')).toBeUndefined();
  });
});
