import { describe, it, expect, beforeAll } from 'vitest';
import { ApiClient, uniqueTracking } from './client';

const enugu = { city: 'Enugu', state: 'Enugu State', country: 'Nigeria', lat: 6.4413, lng: 7.4988 };
const leeds = { city: 'Leeds', state: 'England', country: 'United Kingdom', lat: 53.7965, lng: -1.5479 };
const paris = { city: 'Paris', state: '', country: 'France', lat: 48.8566, lng: 2.3522 };

describe('shipments', () => {
  const admin = new ApiClient();
  beforeAll(async () => { await admin.login(); });

  it('stores countries and never invents a US state for a city abroad', async () => {
    const tn = uniqueTracking('A');
    const r = await new ApiClient().post('/shipments', {
      trackingNumber: tn,
      origin: { ...enugu, state: '' },
      destination: leeds,
      sender: { name: 'Ada', city: 'Enugu', country: 'Nigeria' },
      recipient: { name: 'Tom', city: 'Leeds', country: 'United Kingdom' },
    });
    expect(r.status).toBe(201);
    const s = (await admin.get(`/shipments/${tn}`)).json.data;
    expect(s.origin).toMatchObject({ city: 'Enugu', state: '', country: 'Nigeria' });
    expect(s.destination).toMatchObject({ city: 'Leeds', country: 'United Kingdom' });
  });

  it('defaults legacy US shipments to the United States', async () => {
    const tn = uniqueTracking('U');
    await new ApiClient().post('/shipments', {
      trackingNumber: tn,
      origin: { city: 'Dallas', state: 'TX', lat: 32.77, lng: -96.79 },
      destination: { city: 'Miami', state: 'FL', lat: 25.76, lng: -80.19 },
    });
    const s = (await admin.get(`/shipments/${tn}`)).json.data;
    expect(s.origin.country).toBe('United States');
    expect(s.destination.country).toBe('United States');
  });

  it('shows countries on the public tracking page', async () => {
    const tn = uniqueTracking('P');
    await new ApiClient().post('/shipments', { trackingNumber: tn, origin: enugu, destination: leeds });
    const pub = await new ApiClient().get(`/track/${tn}`);
    expect(pub.status).toBe(200);
    expect(pub.json.data.origin.country).toBe('Nigeria');
    expect(pub.json.data.destination.country).toBe('United Kingdom');
  });

  it('moves the current location when an edit changes the route', async () => {
    const tn = uniqueTracking('E');
    await new ApiClient().post('/shipments', { trackingNumber: tn, origin: enugu, destination: leeds, currentLocation: enugu });
    const before = (await admin.get(`/shipments/${tn}`)).json.data;

    const r = await admin.put(`/shipments/${tn}`, { ...before, origin: paris, progressPercent: 0 });
    expect(r.status).toBe(200);
    expect(r.json.data.currentLocation).toMatchObject({ city: 'Paris', country: 'France' });
    expect(r.json.data.currentLocation.lat).toBeCloseTo(paris.lat, 3);
  });

  it('leaves the current location alone when the route does not change', async () => {
    const tn = uniqueTracking('N');
    await new ApiClient().post('/shipments', { trackingNumber: tn, origin: enugu, destination: leeds, currentLocation: enugu });
    const before = (await admin.get(`/shipments/${tn}`)).json.data;
    const r = await admin.put(`/shipments/${tn}`, { ...before, cargoDescription: 'edited only' });
    expect(r.json.data.cargoDescription).toBe('edited only');
    expect(r.json.data.currentLocation.city).toBe(before.currentLocation.city);
  });

  it('returns 404 for an unknown tracking number', async () => {
    expect((await new ApiClient().get('/track/DXP-2026-NOPE0000')).status).toBe(404);
  });
});
