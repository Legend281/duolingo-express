import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveLocationPrecise, geocodeAddressLive } from '../../src/services/geocodingService';

// The live geocoders are faked here: tests must not depend on the network or on Open-Meteo /
// Nominatim being up (Nominatim already blocks this user's network with a 403).

const openMeteo = (results: any[]) => new Response(JSON.stringify({ results }), { status: 200 });
const nominatimBlocked = () => new Response('Access denied', { status: 403 });

afterEach(() => vi.unstubAllGlobals());

describe('live geocoding', () => {
  it('uses Open-Meteo, filtered by the country code', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('open-meteo')
        ? openMeteo([{ name: 'Enugu', latitude: 6.44, longitude: 7.5, country: 'Nigeria', country_code: 'NG', admin1: 'Enugu State', feature_code: 'PPLA', timezone: 'Africa/Lagos' }])
        : nominatimBlocked()
    );
    vi.stubGlobal('fetch', fetchMock);

    const g = await geocodeAddressLive('Enugu-test-1', 'Nigeria');
    expect(g).toMatchObject({ city: 'Enugu', state: 'Enugu State', country: 'Nigeria', countryCode: 'NG' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('countryCode=NG');
  });

  it('picks the right same-named US town using the state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => openMeteo([
      { name: 'Springfield', latitude: 37.2, longitude: -93.3, country: 'United States', country_code: 'US', admin1: 'Missouri', feature_code: 'PPLA2' },
      { name: 'Springfield', latitude: 39.8, longitude: -89.6, country: 'United States', country_code: 'US', admin1: 'Illinois', feature_code: 'PPLA' },
    ])));
    const g = await resolveLocationPrecise('Springfield, IL');
    expect(g?.state).toBe('IL');
    expect(g?.lat).toBeCloseTo(39.8, 1);
  });

  it('falls back to Nominatim when Open-Meteo has nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.includes('open-meteo')
        ? openMeteo([])
        : new Response(JSON.stringify([{ lat: '53.8', lon: '-1.55', display_name: 'Leeds', addresstype: 'city', address: { city: 'Leeds', state: 'England', country: 'United Kingdom', country_code: 'gb' } }]), { status: 200 })
    ));
    const g = await geocodeAddressLive('Leeds-test-2', 'United Kingdom');
    expect(g).toMatchObject({ city: 'Leeds', country: 'United Kingdom' });
  });

  it('returns null (not a US guess) when nothing finds a non-US place', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('open-meteo') ? openMeteo([]) : nominatimBlocked())));
    expect(await resolveLocationPrecise('Xyzzyqqvv', 'Germany')).toBeNull();
  });

  // A typo like "Huston, TX" used to land on a same-named dam 492 miles from Houston.
  it('ignores features that are not towns or cities', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('open-meteo')
      ? openMeteo([{ name: 'Huston Dam', latitude: 33.2, longitude: -101.1, country: 'United States', country_code: 'US', admin1: 'Texas', feature_code: 'DAM' }])
      : nominatimBlocked())));
    expect(await resolveLocationPrecise('Hustonx, TX')).toBeNull();
  });

  it('gives the state centre for a bare state, not a same-named place elsewhere', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => openMeteo([{ name: 'Texas', latitude: 39.4, longitude: -80.6, country: 'United States', country_code: 'US', admin1: 'West Virginia', feature_code: 'PPL' }])));
    const g = await resolveLocationPrecise('Texas');
    expect(g?.state).toBe('TX');
  });

  it('reads a street address typed into the city box as its town', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (!url.includes('open-meteo')) return nominatimBlocked();
      return url.includes('name=Grandville')
        ? openMeteo([{ name: 'Grandville', latitude: 42.91, longitude: -85.76, country: 'United States', country_code: 'US', admin1: 'Michigan', feature_code: 'PPL' }])
        : openMeteo([]);
    }));
    const g = await resolveLocationPrecise('4727 Brushwood Blvd SW Grandville, MI');
    expect(g).toMatchObject({ city: 'Grandville', state: 'MI' });
  });

  it('survives the network being down for a city in the offline table', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    const g = await resolveLocationPrecise('Lagos', 'Nigeria');
    expect(g?.country).toBe('Nigeria');
  });
});
