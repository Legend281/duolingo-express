import { describe, it, expect } from 'vitest';
import { ApiClient } from './client';

describe('error responses', () => {
  it('never sends internal error details to the client', async () => {
    // An object where SQLite expects text makes the insert throw inside the route.
    const r = await new ApiClient().post('/shipments', { trackingNumber: { not: 'a string' } });
    expect(r.status).toBe(500);
    expect(r.json).toEqual({ success: false, error: 'Something went wrong on our side. Please try again.' });
  });

  it('returns a clean 400 for a malformed body', async () => {
    const res = await fetch(new ApiClient().base + '/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"broken": ',
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: 'Malformed request body.' });
  });
});
