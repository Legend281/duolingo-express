import { describe, it, expect } from 'vitest';
import {
  resolveTransportMode,
  calculateRouteGeometry,
  calculateEstimatedPosition,
  findNearestPointOnPolyline,
  nameTransitPosition,
  IN_FLIGHT_LABEL,
} from '../../src/services/routingEngine';

const P = {
  enugu: { lat: 6.4413, lng: 7.4988, country: 'Nigeria' },
  leeds: { lat: 53.7965, lng: -1.5479, country: 'United Kingdom' },
  la: { lat: 34.0522, lng: -118.2437, state: 'CA' },
  tokyo: { lat: 35.6762, lng: 139.6503, country: 'Japan' },
  honolulu: { lat: 21.3069, lng: -157.8583, state: 'HI' },
  detroit: { lat: 42.3314, lng: -83.0458, state: 'MI' },
  toronto: { lat: 43.6532, lng: -79.3832, country: 'Canada' },
  dallas: { lat: 32.7767, lng: -96.797, state: 'TX' },
  miami: { lat: 25.7617, lng: -80.1918, state: 'FL' },
  london: { lat: 51.5074, lng: -0.1278, country: 'United Kingdom' },
  paris: { lat: 48.8566, lng: 2.3522, country: 'France' },
};

describe('road vs air', () => {
  it.each([
    ['Enugu -> Leeds', P.enugu, P.leeds, 'AIR'],
    ['LA -> Tokyo', P.la, P.tokyo, 'AIR'],
    ['LA -> Honolulu', P.la, P.honolulu, 'AIR'],
    ['Detroit -> Toronto', P.detroit, P.toronto, 'ROAD'],
    ['London -> Paris', P.london, P.paris, 'ROAD'],
    ['Dallas -> Miami', P.dallas, P.miami, 'ROAD'],
  ])('%s is %s', (_label, o, d, mode) => {
    expect(resolveTransportMode(o, d)).toBe(mode);
    expect(calculateRouteGeometry(o, d).mode).toBe(mode);
  });
});

describe('air routes', () => {
  it('uses real great-circle miles', () => {
    expect(calculateRouteGeometry(P.la, P.tokyo).distanceMiles).toBeGreaterThan(5400);
    expect(calculateRouteGeometry(P.la, P.tokyo).distanceMiles).toBeLessThan(5600);
  });

  it('draws a transpacific route as one arc (no jump across the map)', () => {
    const { polyline } = calculateRouteGeometry(P.la, P.tokyo);
    for (let i = 1; i < polyline.length; i++) {
      expect(Math.abs(polyline[i][1] - polyline[i - 1][1])).toBeLessThan(5);
    }
    // Ends at Tokyo's longitude shifted by -360 (unwrapped), i.e. going west over the Pacific.
    expect(polyline[polyline.length - 1][1]).toBeCloseTo(139.65 - 360, 0);
  });

  it('reports positions as real longitudes and snaps back onto the line', () => {
    const { polyline } = calculateRouteGeometry(P.la, P.tokyo);
    const mid = calculateEstimatedPosition(polyline, 50);
    expect(mid.lng).toBeGreaterThanOrEqual(-180);
    expect(mid.lng).toBeLessThanOrEqual(180);
    expect(findNearestPointOnPolyline(polyline, mid.lat, mid.lng).progressPercent).toBeCloseTo(50, -1);
  });

  it('calls a mid-ocean position "In Flight", but names a city on a road route', () => {
    const air = calculateRouteGeometry(P.la, P.honolulu);
    const mid = calculateEstimatedPosition(air.polyline, 50);
    expect(nameTransitPosition(mid.lat, mid.lng, air)?.city).toBe(IN_FLIGHT_LABEL);

    const road = calculateRouteGeometry(P.dallas, P.miami);
    const roadMid = calculateEstimatedPosition(road.polyline, 50);
    expect(nameTransitPosition(roadMid.lat, roadMid.lng, road, 'United States')?.city).not.toBe(IN_FLIGHT_LABEL);
  });
});
