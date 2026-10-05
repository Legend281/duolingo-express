import { describe, it, expect, beforeAll } from 'vitest';
import { inject } from 'vitest';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ApiClient, uniqueTracking } from './client';
import { startServer } from './globalSetup';

const FULL_DATE = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/;               // "Oct 5, 2026"
const ETA_DATE = /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, \d{4}$/;  // "Thu, Oct 8, 2026"
const EVENT_TIME = /^[A-Z][a-z]{2} \d{1,2}, \d{4} · \d{1,2}:\d{2} [AP]M [A-Z]{2,4}$/; // "Oct 5, 2026 · 9:58 AM EDT"

const dallas = { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.797 };
const miami = { city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 };

describe('dates are stored as real dates', () => {
  const admin = new ApiClient();
  beforeAll(async () => { await admin.login(); });

  it('ignores a client "Today" and stores a full creation date', async () => {
    const tn = uniqueTracking('D');
    await new ApiClient().post('/shipments', { trackingNumber: tn, createdAt: 'Today', origin: dallas, destination: miami });
    const s = (await admin.get(`/shipments/${tn}`)).json.data;
    expect(s.createdAt).toMatch(FULL_DATE);
    expect(s.lastUpdated).not.toBe('Just now');
    expect(s.lastUpdated).toMatch(EVENT_TIME);
  });

  it('gives a year-less delivery date its year and a real deadline', async () => {
    const tn = uniqueTracking('Y');
    const thisYear = new Date().getFullYear();
    await new ApiClient().post('/shipments', {
      trackingNumber: tn, origin: dallas, destination: miami,
      estimatedDelivery: { date: 'December 30', timeWindow: 'by 5:00 PM' },
    });
    const s = (await admin.get(`/shipments/${tn}`)).json.data;
    expect(s.estimatedDelivery.date).toMatch(ETA_DATE);
    expect(s.estimatedDelivery.date).toMatch(/Dec 30, \d{4}$/);
    const deadline = new Date(s.estimatedDelivery.timestamp);
    expect([thisYear, thisYear + 1, thisYear - 1]).toContain(deadline.getFullYear());
    expect(deadline.getFullYear()).not.toBe(2001);
  });

  it('defaults a missing delivery date to a real date (not a fixed past date)', async () => {
    const tn = uniqueTracking('M');
    await new ApiClient().post('/shipments', { trackingNumber: tn, origin: dallas, destination: miami });
    const s = (await admin.get(`/shipments/${tn}`)).json.data;
    expect(new Date(s.estimatedDelivery.timestamp).getTime()).toBeGreaterThan(Date.now());
    expect(s.estimatedDelivery.date).not.toMatch(/August 24, 2026/);
  });

  it('stores every new event with a year, a zone and a real instant', async () => {
    const tn = uniqueTracking('V');
    await new ApiClient().post('/shipments', { trackingNumber: tn, origin: dallas, destination: miami });
    await admin.patch(`/shipments/${tn}/status`, { newStatus: 'IN_TRANSIT', location: 'Houston, TX' });
    const s = (await admin.get(`/shipments/${tn}`)).json.data;
    expect(s.events.length).toBeGreaterThanOrEqual(2);
    for (const e of s.events) {
      expect(e.timestamp).toMatch(EVENT_TIME);
      expect(Math.abs(Date.parse(e.occurredAt) - Date.now())).toBeLessThan(5 * 60_000);
    }
  });

  it('keeps an admin-entered time in its own zone', async () => {
    const tn = uniqueTracking('Z');
    await new ApiClient().post('/shipments', { trackingNumber: tn, origin: dallas, destination: miami });
    const r = await admin.post(`/shipments/${tn}/events`, {
      title: 'Arrived at Facility', status: 'AT_FACILITY', city: 'Houston', state: 'TX',
      displayDate: 'Aug 20, 2026', displayTime: '4:35 PM', timezone: 'CT',
    });
    const ev = r.json.data.events.find((e: any) => e.title === 'Arrived at Facility');
    expect(ev.timestamp).toBe('Aug 20, 2026 · 4:35 PM CT');
    expect(ev.occurredAt).toBe('2026-08-20T21:35:00.000Z'); // 4:35 PM CDT = 21:35 UTC
  });

  it('normalizes a delivery date sent with a status change', async () => {
    const tn = uniqueTracking('S');
    await new ApiClient().post('/shipments', { trackingNumber: tn, origin: dallas, destination: miami });
    await admin.patch(`/shipments/${tn}/status`, { newStatus: 'DELAYED', location: 'Dallas, TX', estimatedDeliveryDate: 'November 3', estimatedDeliveryTime: 'by 2:00 PM' });
    const s = (await admin.get(`/shipments/${tn}`)).json.data;
    expect(s.estimatedDelivery.date).toMatch(/^[A-Z][a-z]{2}, Nov 3, \d{4}$/);
    expect(s.estimatedDelivery.timestamp).toBeTruthy();
  });
});

describe('legacy date repair on startup', () => {
  it('repairs old free-text dates (after taking a backup) and is a no-op the second time', async () => {
    const dbFile = path.join(inject('tempDir'), 'test.db');
    const tn = uniqueTracking('L');
    // Plant a shipment written the old way, straight into the database.
    const db = new DatabaseSync(dbFile);
    db.exec('PRAGMA busy_timeout = 5000;'); // the running test server may be mid-write
    const created = new Date(2026, 8, 23, 9, 0).getTime(); // Sep 23, 2026 (local)
    db.prepare(`INSERT INTO shipments (tracking_number, barcode_code, status, status_text, progress_percent, last_updated, created_at,
      estimated_delivery_date, estimated_delivery_time, service, shipment_type, cargo_description, total_weight_lbs, total_pieces,
      origin_city, origin_state, origin_lat, origin_lng, destination_city, destination_state, destination_lat, destination_lng,
      current_location_city, current_location_state, current_location_lat, current_location_lng, current_facility,
      sender_json, recipient_json, dimensions_json, created_at_ts)
      VALUES (?, ?, 'DELIVERED', 'Delivered', 100, 'Just now', 'Today', 'Wednesday, September 30', 'by 5:00 PM', 'Standard', 'Parcel', 'x', 1, 1,
      'Dallas', 'TX', 32.77, -96.79, 'Miami', 'FL', 25.76, -80.19, 'Miami', 'FL', 25.76, -80.19, 'Hub', '{}', '{}', '{}', ?)`)
      .run(tn, `*${tn}*`, created);
    db.prepare(`INSERT INTO tracking_events (id, shipment_tracking, status, title, location, facility, timestamp, description, sort_order)
      VALUES ('legacy-1', ?, 'RECEIVED', 'Received', 'Dallas, TX', 'Hub', 'Sep 23 10:58 AM', 'x', 1)`).run(tn);
    db.close();

    const backupsBefore = fs.readdirSync(path.join(inject('tempDir'), 'backups')).filter(f => f.includes('premigration')).length;
    const port = await new Promise<number>(resolve => {
      const s = net.createServer().listen(0, () => { const p = (s.address() as net.AddressInfo).port; s.close(() => resolve(p)); });
    });
    const restarted = await startServer(port, inject('tempDir'));
    try {
      const api = new ApiClient();
      (api as any).base = `http://127.0.0.1:${port}/api`;
      await api.login();
      const s = (await api.get(`/shipments/${tn}`)).json.data;
      expect(s.createdAt).toBe('Sep 23, 2026');
      // 'Just now' replaced with the latest event's real time
      expect(s.lastUpdated).toMatch(/^Sep 23, 2026 · 10:58 AM [A-Z]{2,4}$/);
      expect(s.estimatedDelivery.date).toBe('Wed, Sep 30, 2026');
      expect(s.events[0].timestamp).toMatch(/^Sep 23, 2026 · 10:58 AM [A-Z]{2,4}$/);
      expect(s.events[0].occurredAt).toBeTruthy();

      const backupsAfter = fs.readdirSync(path.join(inject('tempDir'), 'backups')).filter(f => f.includes('premigration')).length;
      expect(backupsAfter).toBe(backupsBefore + 1);
    } finally {
      restarted.kill();
    }

    // Second start: nothing left to repair, so no new pre-repair backup.
    const port2 = await new Promise<number>(resolve => {
      const s = net.createServer().listen(0, () => { const p = (s.address() as net.AddressInfo).port; s.close(() => resolve(p)); });
    });
    const again = await startServer(port2, inject('tempDir'));
    again.kill();
    const backupsFinal = fs.readdirSync(path.join(inject('tempDir'), 'backups')).filter(f => f.includes('premigration')).length;
    expect(backupsFinal).toBe(backupsBefore + 1);
  }, 120_000);
});
