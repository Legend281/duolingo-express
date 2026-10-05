import { inject } from 'vitest';

/** Minimal HTTP client with a cookie jar, so a logged-in session carries across requests. */
export class ApiClient {
  private cookie = '';
  readonly base = inject('apiBase');

  async request(method: string, path: string, body?: unknown): Promise<{ status: number; json: any; headers: Headers }> {
    const res = await fetch(this.base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: new URL(this.base).origin,
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';')[0];
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json, headers: res.headers };
  }

  get(path: string) { return this.request('GET', path); }
  post(path: string, body?: unknown) { return this.request('POST', path, body ?? {}); }
  put(path: string, body?: unknown) { return this.request('PUT', path, body ?? {}); }
  patch(path: string, body?: unknown) { return this.request('PATCH', path, body ?? {}); }

  async login(password = inject('adminPassword')) {
    return this.post('/auth/login', { password });
  }

  /** Raw bytes (for file downloads). */
  async download(path: string): Promise<{ status: number; bytes: Buffer; headers: Headers }> {
    const res = await fetch(this.base + path, { headers: this.cookie ? { cookie: this.cookie } : {} });
    return { status: res.status, bytes: Buffer.from(await res.arrayBuffer()), headers: res.headers };
  }
}

export const uniqueTracking = (prefix = 'T') =>
  `DXP-2026-${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`.slice(0, 17);
