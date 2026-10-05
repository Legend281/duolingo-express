import { describe, it, expect } from 'vitest';
import {
  getServiceCommitmentHours,
  generateShipmentPlan,
  formatCommitment,
  routeContext,
} from '../../src/services/planningEngine';
import { calculateRouteGeometry } from '../../src/services/routingEngine';

describe('service commitments', () => {
  it('keeps domestic road windows unchanged', () => {
    expect(getServiceCommitmentHours('Express', 1277)).toBe(24);
    expect(getServiceCommitmentHours('Priority', 1277)).toBe(48);
    expect(getServiceCommitmentHours('Standard', 1277)).toBe(72);
  });

  it('uses international air windows (with customs)', () => {
    const intl = { mode: 'AIR' as const, international: true };
    expect(getServiceCommitmentHours('Express', 3300, intl)).toBe(72);
    expect(getServiceCommitmentHours('Priority Express Courier', 3300, intl)).toBe(72);
    expect(getServiceCommitmentHours('Standard', 3300, intl)).toBe(168);
    expect(getServiceCommitmentHours('Standard', 10_000, intl)).toBe(192); // +1 day past 6,000 mi
  });

  it('adds a day for customs on cross-border road legs', () => {
    expect(getServiceCommitmentHours('Standard', 237, { mode: 'ROAD', international: true })).toBe(96);
  });

  it('formats windows for display', () => {
    expect(formatCommitment(24)).toBe('24h');
    expect(formatCommitment(72)).toBe('3 days');
    expect(formatCommitment(168)).toBe('7 days');
  });
});

describe('shipment plan', () => {
  const enugu = { city: 'Enugu', state: 'Enugu State', country: 'Nigeria', lat: 6.4413, lng: 7.4988 };
  const leeds = { city: 'Leeds', state: 'England', country: 'United Kingdom', lat: 53.7965, lng: -1.5479 };
  const dallas = { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.797 };
  const miami = { city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 };

  it('adds export and import customs for a cross-border shipment', () => {
    const route = calculateRouteGeometry(enugu, leeds);
    expect(routeContext(route.origin, route.destination)).toEqual({ mode: 'AIR', international: true });
    const plan = generateShipmentPlan(enugu, leeds, 'Standard', route.distanceMiles, '2026-10-05');
    const names = plan.plannedMilestones.map(m => m.stageName);
    expect(names).toHaveLength(8);
    expect(names).toContain('Export Customs Clearance — Nigeria');
    expect(names).toContain('Import Customs Clearance — United Kingdom');
    expect(names).toContain('Departed on Scheduled Air Freight');
    expect(plan.serviceCommitmentHours).toBe(168);
  });

  it('keeps the six domestic steps with no customs', () => {
    const route = calculateRouteGeometry(dallas, miami);
    const plan = generateShipmentPlan(dallas, miami, 'Express', route.distanceMiles, '2026-10-05');
    expect(plan.plannedMilestones).toHaveLength(6);
    expect(plan.plannedMilestones.some(m => /Customs/.test(m.stageName))).toBe(false);
  });

  it('reads a date-only pickup as 8:00 AM local time (not UTC midnight)', () => {
    const route = calculateRouteGeometry(dallas, miami);
    const plan = generateShipmentPlan(dallas, miami, 'Express', route.distanceMiles, '2026-10-05');
    expect(plan.plannedMilestones[0].targetTimestamp).toBe(new Date(2026, 9, 5, 8, 0, 0, 0).getTime());
  });
});
