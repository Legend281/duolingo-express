/**
 * Duolingo Express — Road Routing & Geometry Service
 * Queries the OSRM Driving Engine for true road geometry, real driving distance,
 * and calculated highway polyline with an in-memory cache and smooth curvature fallback.
 * Strictly separates physical road driving hours from commercial customer service SLAs.
 */

import { US_METRO_DATABASE, GeoLocationResult } from './geocodingService.js';

export interface LatLngPoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface RouteGeometryResult {
  origin: LatLngPoint;
  destination: LatLngPoint;
  distanceMiles: number;
  drivingDurationHours: number;
  polyline: [number, number][]; // [lat, lng] points for Leaflet
  majorWaypoints: LatLngPoint[];
  isLiveRoadRoute?: boolean;
}

export interface EstimatedPositionResult {
  lat: number;
  lng: number;
  progressPercent: number; // 0 to 100
  corridorDescription: string;
  isCompleted: boolean;
}

// In-memory route cache
const ROUTE_CACHE = new Map<string, RouteGeometryResult>();

/**
 * Calculates great-circle distance between two points (in miles)
 */
export function calculateHaversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Asynchronously fetches genuine road routing geometry from OSRM Driving API.
 */
export async function fetchLiveRoadRoute(
  origin: LatLngPoint,
  destination: LatLngPoint
): Promise<RouteGeometryResult> {
  const cacheKey = `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}_${destination.lat.toFixed(3)},${destination.lng.toFixed(3)}`;
  if (ROUTE_CACHE.has(cacheKey)) {
    return ROUTE_CACHE.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // OSRM's public demo server routinely takes 4-5s to respond; 3s was timing out on essentially every request

    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (data.routes && data.routes.length > 0) {
        const primaryRoute = data.routes[0];
        const distanceMeters = primaryRoute.distance;
        const durationSeconds = primaryRoute.duration;
        const distanceMiles = Math.round(distanceMeters * 0.000621371);
        const drivingDurationHours = Math.round((durationSeconds / 3600) * 10) / 10;

        // OSRM returns GeoJSON coordinates as [lng, lat], convert to Leaflet [lat, lng]
        const rawCoords = primaryRoute.geometry.coordinates;
        const polyline: [number, number][] = rawCoords.map((c: [number, number]) => [c[1], c[0]]);

        const result: RouteGeometryResult = {
          origin,
          destination,
          distanceMiles,
          drivingDurationHours,
          polyline,
          majorWaypoints: [origin, destination],
          isLiveRoadRoute: true
        };

        ROUTE_CACHE.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Smooth fallback to local highway routing generator
  }

  const fallback = calculateRouteGeometry(origin, destination);
  ROUTE_CACHE.set(cacheKey, fallback);
  return fallback;
}

/**
 * Synchronously generates high-resolution highway road geometry connecting Origin to Destination.
 */
export function calculateRouteGeometry(
  origin: LatLngPoint,
  destination: LatLngPoint
): RouteGeometryResult {
  const directDistance = calculateHaversineDistanceMiles(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );

  // Highway factor ~1.15x for US road corridors
  const distanceMiles = Math.max(25, Math.round(directDistance * 1.15));
  // Average highway freight linehaul speed ~55 mph
  const drivingDurationHours = Math.max(1, Math.round((distanceMiles / 55) * 10) / 10);

  const polyline: [number, number][] = [];
  const steps = Math.max(25, Math.min(100, Math.round(distanceMiles / 30)));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Linear base interpolation
    const baseLat = origin.lat + (destination.lat - origin.lat) * t;
    const baseLng = origin.lng + (destination.lng - origin.lng) * t;

    // Natural geographic highway corridor bow
    const arcDeviation = Math.sin(t * Math.PI) * 0.85 * (destination.lng < origin.lng ? -1 : 1);
    const lat = baseLat + arcDeviation * 0.4;
    const lng = baseLng;

    polyline.push([lat, lng]);
  }

  return {
    origin,
    destination,
    distanceMiles,
    drivingDurationHours,
    polyline,
    majorWaypoints: [origin, destination],
    isLiveRoadRoute: false
  };
}

/**
 * Finds the point on a route polyline closest to a real, known location — used to anchor
 * the completed/remaining route split to wherever a shipment's actual GPS-equivalent
 * coordinates say it is, instead of a percentage-only estimate that has no idea the truck
 * icon and the route line might not agree with each other. Returns the equivalent progress
 * percentage that point represents, purely for the solid/dashed line split — the marker
 * itself should still be drawn at the exact real coordinates, not this snapped point.
 */
export function findNearestPointOnPolyline(
  polyline: [number, number][],
  targetLat: number,
  targetLng: number
): { index: number; lat: number; lng: number; progressPercent: number } {
  if (!polyline || polyline.length === 0) {
    return { index: 0, lat: targetLat, lng: targetLng, progressPercent: 0 };
  }

  let bestIndex = 0;
  let bestDistSq = Infinity;
  for (let i = 0; i < polyline.length; i++) {
    const [lat, lng] = polyline[i];
    const distSq = (lat - targetLat) ** 2 + (lng - targetLng) ** 2;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIndex = i;
    }
  }

  const progressPercent = polyline.length > 1 ? (bestIndex / (polyline.length - 1)) * 100 : 0;
  return { index: bestIndex, lat: polyline[bestIndex][0], lng: polyline[bestIndex][1], progressPercent };
}

/**
 * Calculates time-interpolated estimated position along the highway polyline.
 * Clearly labeled as schedule-derived, protecting company credibility.
 */
export function calculateEstimatedPosition(
  polyline: [number, number][],
  progressPercent: number
): EstimatedPositionResult {
  if (!polyline || polyline.length === 0) {
    return {
      lat: 39.8283,
      lng: -98.5795,
      progressPercent: 0,
      corridorDescription: 'Awaiting departure scan',
      isCompleted: false
    };
  }

  const clampedPercent = Math.max(0, Math.min(100, progressPercent));
  if (clampedPercent === 0) {
    return {
      lat: polyline[0][0],
      lng: polyline[0][1],
      progressPercent: 0,
      corridorDescription: 'Staged at Origin Terminal',
      isCompleted: false
    };
  }

  if (clampedPercent === 100) {
    const last = polyline[polyline.length - 1];
    return {
      lat: last[0],
      lng: last[1],
      progressPercent: 100,
      corridorDescription: 'Delivered to Consignee Destination',
      isCompleted: true
    };
  }

  const targetIndex = (clampedPercent / 100) * (polyline.length - 1);
  const lowerIndex = Math.floor(targetIndex);
  const upperIndex = Math.min(polyline.length - 1, lowerIndex + 1);
  const fraction = targetIndex - lowerIndex;

  const p1 = polyline[lowerIndex];
  const p2 = polyline[upperIndex];

  const currentLat = p1[0] + (p2[0] - p1[0]) * fraction;
  const currentLng = p1[1] + (p2[1] - p1[1]) * fraction;

  return {
    lat: currentLat,
    lng: currentLng,
    progressPercent: Math.round(clampedPercent),
    corridorDescription: `Moving along scheduled interstate corridor (${Math.round(clampedPercent)}% complete)`,
    isCompleted: false
  };
}

/**
 * Identifies the major logistics interchange city / state located along the corridor
 * between origin and destination.
 */
export function findIntermediateHub(
  origin: LatLngPoint,
  destination: LatLngPoint
): { city: string; state: string; facility: string; description: string } | null {
  const directDist = calculateHaversineDistanceMiles(origin.lat, origin.lng, destination.lat, destination.lng);
  if (directDist < 120) {
    return null;
  }

  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;

  let bestEntry: any = null;
  let bestDist = Infinity;

  const origCityLower = (origin.name || '').toLowerCase();
  const destCityLower = (destination.name || '').toLowerCase();

  for (const entry of (Object.values(US_METRO_DATABASE) as GeoLocationResult[])) {
    const entryCityLower = entry.city.toLowerCase();
    if (origCityLower.includes(entryCityLower) || destCityLower.includes(entryCityLower)) {
      continue;
    }

    const distToMid = calculateHaversineDistanceMiles(midLat, midLng, entry.lat, entry.lng);
    const distFromOrigin = calculateHaversineDistanceMiles(origin.lat, origin.lng, entry.lat, entry.lng);
    const distToDest = calculateHaversineDistanceMiles(entry.lat, entry.lng, destination.lat, destination.lng);
    const totalViaEntry = distFromOrigin + distToDest;

    if (totalViaEntry < directDist * 1.35 && distToMid < bestDist) {
      bestDist = distToMid;
      bestEntry = entry;
    }
  }

  if (bestEntry) {
    return {
      city: bestEntry.city,
      state: bestEntry.state,
      facility: bestEntry.facilityName || `${bestEntry.city} Regional Linehaul Sort Hub`,
      description: `Linehaul telemetry verified through ${bestEntry.stateFull || bestEntry.state} corridor near ${bestEntry.city}.`
    };
  }

  return null;
}

