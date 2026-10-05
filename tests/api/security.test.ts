import { describe, it, expect } from 'vitest';
import { ApiClient } from './client';

describe('Content Security Policy', () => {
  it('is sent and enforced (not report-only) with a strict script policy', async () => {
    const r = await new ApiClient().get('/health');
    const csp = r.headers.get('content-security-policy');
    expect(r.headers.get('content-security-policy-report-only')).toBeNull();
    expect(csp).toBeTruthy();
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
  });

  it('allows exactly the outside services the site uses', async () => {
    const csp = (await new ApiClient().get('/health')).headers.get('content-security-policy')!;
    const directive = (name: string) => csp.split(';').map(s => s.trim()).find(s => s.startsWith(name + ' '))!;
    expect(directive('connect-src').split(' ').slice(1).sort()).toEqual([
      "'self'",
      'https://geocoding-api.open-meteo.com',
      'https://nominatim.openstreetmap.org',
      'https://router.project-osrm.org',
    ].sort());
    expect(directive('img-src')).toContain('https://server.arcgisonline.com');
    expect(directive('img-src')).toContain('https://images.unsplash.com');
    expect(directive('font-src')).toContain('https://fonts.gstatic.com');
  });
});
