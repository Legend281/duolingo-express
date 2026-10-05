import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ApiClient } from './client';

/** Writes downloaded bytes to a temp file and opens them as a database. */
function openDownloaded(bytes: Buffer) {
  const file = path.join(os.tmpdir(), `dxp-test-dl-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  fs.writeFileSync(file, bytes);
  const db = new DatabaseSync(file, { readOnly: true });
  return { db, cleanup: () => { db.close(); fs.rmSync(file, { force: true }); } };
}

describe('backups & storage', () => {
  const admin = new ApiClient();
  beforeAll(async () => { await admin.login(); });

  it('the old public storage diagnostic is gone', async () => {
    expect((await new ApiClient().get('/diag/storage')).status).toBe(404);
  });

  it('took an automatic backup on startup and reports status without server paths', async () => {
    const r = await admin.get('/admin/storage');
    expect(r.status).toBe(200);
    expect(r.json.data.backups.length).toBeGreaterThanOrEqual(1);
    expect(r.json.data.backups.some((b: any) => b.kind === 'auto')).toBe(true);
    expect(JSON.stringify(r.json)).not.toMatch(/dxp-api-test-|[A-Za-z]:\\\\|\/tmp\//);
  });

  it('takes a manual backup', async () => {
    const r = await admin.post('/admin/backups');
    expect(r.status).toBe(201);
    expect(r.json.data.kind).toBe('manual');
  });

  it('downloads a valid database copy with no login sessions in it', async () => {
    const dl = await admin.download('/admin/backups/download');
    expect(dl.status).toBe(200);
    expect(dl.headers.get('content-disposition')).toMatch(/attachment; filename="duolingo_express-.*\.db"/);
    expect(dl.bytes.subarray(0, 15).toString()).toBe('SQLite format 3');
    const { db, cleanup } = openDownloaded(dl.bytes);
    try {
      expect((db.prepare('SELECT COUNT(*) AS n FROM shipments').get() as any).n).toBeGreaterThan(0);
      expect((db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as any).n).toBe(0);
    } finally {
      cleanup();
    }
  });

  it('downloads a stored backup, and refuses names it did not create', async () => {
    const { backups } = (await admin.get('/admin/storage')).json.data;
    const ok = await admin.download(`/admin/backups/${backups[0].name}`);
    expect(ok.status).toBe(200);
    expect(ok.bytes.subarray(0, 15).toString()).toBe('SQLite format 3');
    expect((await admin.get('/admin/backups/..%2F..%2F.env')).status).toBe(404);
    expect((await admin.get('/admin/backups/test.db')).status).toBe(404);
  });

  it('requires a login for every backup route', async () => {
    const anon = new ApiClient();
    expect((await anon.get('/admin/storage')).status).toBe(401);
    expect((await anon.post('/admin/backups')).status).toBe(401);
    expect((await anon.download('/admin/backups/download')).status).toBe(401);
  });
});
