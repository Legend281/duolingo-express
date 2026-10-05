import { describe, it, expect } from 'vitest';
import { inject } from 'vitest';
import net from 'node:net';
import { ApiClient } from './client';
import { startServer } from './globalSetup';

describe('admin login', () => {
  it('rejects a wrong password', async () => {
    const api = new ApiClient();
    const r = await api.login('not-the-password');
    expect(r.status).toBe(401);
    expect((await api.get('/auth/session')).json.isAdmin).toBe(false);
  });

  it('accepts the right password and keeps the session', async () => {
    const api = new ApiClient();
    expect((await api.login()).status).toBe(200);
    expect((await api.get('/auth/session')).json.isAdmin).toBe(true);
  });

  it('protects admin-only routes', async () => {
    const api = new ApiClient();
    for (const path of ['/shipments', '/quotes', '/documents', '/stats', '/admin/storage']) {
      expect((await api.get(path)).status, path).toBe(401);
    }
  });

  it('logout ends the session', async () => {
    const api = new ApiClient();
    await api.login();
    await api.post('/auth/logout');
    expect((await api.get('/auth/session')).json.isAdmin).toBe(false);
  });

  it('keeps an admin logged in across a server restart (sessions are stored in the database)', async () => {
    const api = new ApiClient();
    await api.login();

    // A second server process on the SAME database file stands in for "the server restarted":
    // an in-memory session store would know nothing about this cookie.
    const port = await new Promise<number>(resolve => {
      const s = net.createServer().listen(0, () => {
        const p = (s.address() as net.AddressInfo).port;
        s.close(() => resolve(p));
      });
    });
    const second = await startServer(port, inject('tempDir'));
    try {
      const cookie = (api as any).cookie as string;
      const r = await fetch(`http://127.0.0.1:${port}/api/auth/session`, { headers: { cookie } });
      expect((await r.json()).isAdmin).toBe(true);
    } finally {
      second.kill();
    }
  }, 60_000);
});
