import { describe, it, expect } from 'vitest';
import { ApiClient } from './client';

describe('quotes', () => {
  it('keeps a blank state and ZIP blank and stores the country', async () => {
    const r = await new ApiClient().post('/quotes', {
      customerName: 'Ada Obi',
      customerEmail: 'ada@example.com',
      customerPhone: '1',
      origin: { city: 'Lagos', state: '', postalCode: '', country: 'Nigeria' },
      destination: { city: 'London', state: '', postalCode: '', country: 'United Kingdom' },
      weightLbs: 25,
    });
    expect(r.status).toBe(201);
    const q = r.json.data;
    expect(q.originState).toBe('');
    expect(q.originZip).toBe('');
    expect(q.originCountry).toBe('Nigeria');
    expect(q.destCountry).toBe('United Kingdom');
  });

  it('still fills demo defaults only when no location is sent at all', async () => {
    const r = await new ApiClient().post('/quotes', { customerName: 'X', customerEmail: 'x@example.com', customerPhone: '1', weightLbs: 5 });
    expect(r.json.data.originState).toBe('NY');
  });
});
