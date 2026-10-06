import { Shipment, ShipmentStatus, TrackingEvent } from '../types/shipment';
import { QuoteRequest, QuoteRequestPricing, QuoteRequestStatus, AdminSettings, AdminDocument, DocumentStatus, StorageStatus, BackupInfo } from '../types/admin';

// On the admin host the page names the main site to talk to (server/index.ts adds this meta
// tag): API calls go straight there instead of through the admin host's unreliable edge.
const API_ORIGIN = typeof document !== 'undefined'
  ? document.querySelector('meta[name="dxp-api-origin"]')?.getAttribute('content') || ''
  : '';
const API_BASE = `${API_ORIGIN}/api`;

/** Marks a reply whose body never arrived (see apiFetch). */
const EMPTY_REPLY_HEADER = 'x-dxp-empty-reply';
/** Fired when a write succeeded but its reply body was lost — data screens should reload. */
export const REPLY_LOST_EVENT = 'dxp:reply-lost';

/**
 * fetch() for our own API that survives a reply losing its body on the way.
 *
 * In production the admin site (dr.) reaches the API through Hostinger's edge, which was
 * measured dropping the body of roughly half of POST replies (headers + status arrive, body
 * is empty) — the admin login then failed with "Server returned non-JSON response (HTTP 200)"
 * even though the password was right. Reads are simply asked again; for a write, repeating
 * it could do it twice, so instead the reply is replaced with a clear error (login checks
 * the session instead — see api.login).
 */
async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const attempts = method === 'GET' ? 3 : 1;
  let res: Response | null = null;
  let text = '';
  // Always send the session cookie — needed once calls go to the main site from the admin host.
  const withCookies: RequestInit = { ...init, credentials: 'include' };
  for (let i = 0; i < attempts; i++) {
    res = await fetch(input, withCookies);
    text = await res.text();
    if (text.trim() || res.status === 204) break;
  }
  const r = res as Response;
  if (!text.trim() && r.status !== 204) {
    const headers = new Headers(r.headers);
    headers.set(EMPTY_REPLY_HEADER, '1');
    headers.set('content-type', 'application/json');
    if (r.ok) {
      // A 2xx means the server did the work — only its reply went missing. Report success
      // and ask the admin screens to reload from the server so they show the saved result.
      // (Treating this as a failure made the admin roll its own screen back even though
      // the change was saved, e.g. a status update that the tracking page already showed.)
      if (typeof window !== 'undefined') window.dispatchEvent(new Event(REPLY_LOST_EVENT));
      return new Response(JSON.stringify({ success: true }), { status: r.status, statusText: r.statusText, headers });
    }
    return new Response(JSON.stringify({ success: false, error: 'The connection dropped the reply from the server. Please try again.' }), { status: r.status, statusText: r.statusText, headers });
  }
  return new Response(text, { status: r.status, statusText: r.statusText, headers: r.headers });
}

async function handleResponse<T>(res: Response): Promise<T> {
  let json: any;
  try {
    json = await res.json();
  } catch {
    const err: any = new Error(`Server returned non-JSON response (HTTP ${res.status})`);
    err.status = res.status;
    throw err;
  }
  if (!res.ok || json.success === false) {
    // Attaching the real HTTP status lets callers tell "not authenticated, stop retrying"
    // apart from "transient failure, keep retrying" — see AdminDataContext's periodic
    // refresh, which used to retry every 12s forever even for a logged-out visitor.
    const err: any = new Error(json.error || `HTTP error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Admin Auth
  async login(password: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password })
    });
    // Reply lost in transit: the password may well have been accepted — ask the server.
    if (res.headers.get(EMPTY_REPLY_HEADER)) {
      if (await api.checkSession()) return { success: true };
      if (res.status === 401) throw new Error('Incorrect password.');
    }
    let json: any;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Server returned non-JSON response (HTTP ${res.status})`);
    }
    if (!res.ok || json.success === false) {
      throw new Error(json.error || `HTTP error ${res.status}`);
    }
    return json;
  },

  async logout(): Promise<void> {
    await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  },

  async checkSession(): Promise<boolean> {
    try {
      const res = await apiFetch(`${API_BASE}/auth/session`, { credentials: 'include' });
      const json = await res.json();
      return Boolean(json?.isAdmin);
    } catch {
      return false;
    }
  },

  // Public Tracking
  async trackShipment(trackingNumber: string): Promise<Shipment> {
    const res = await apiFetch(`${API_BASE}/track/${encodeURIComponent(trackingNumber)}`);
    return handleResponse<Shipment>(res);
  },

  // Public Booking & Quotes
  async submitPublicQuote(quoteData: Partial<QuoteRequest>): Promise<QuoteRequest> {
    const res = await apiFetch(`${API_BASE}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quoteData)
    });
    return handleResponse<QuoteRequest>(res);
  },

  async submitPublicShipment(shipmentData: Partial<Shipment>): Promise<Shipment> {
    const res = await apiFetch(`${API_BASE}/shipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shipmentData)
    });
    return handleResponse<Shipment>(res);
  },

  // Admin Shipments
  async getShipments(params?: { search?: string; status?: string }): Promise<Shipment[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    const res = await apiFetch(`${API_BASE}/shipments?${query.toString()}`);
    return handleResponse<Shipment[]>(res);
  },

  // Soft-deleted shipments — "Delete" moves a shipment here rather than erasing it; this is
  // the Recently Deleted / trash list.
  async getTrashedShipments(): Promise<Shipment[]> {
    const res = await apiFetch(`${API_BASE}/shipments?trash=true`);
    return handleResponse<Shipment[]>(res);
  },

  async restoreShipment(trackingNumber: string): Promise<Shipment> {
    const res = await apiFetch(`${API_BASE}/shipments/${encodeURIComponent(trackingNumber)}/restore`, {
      method: 'POST'
    });
    return handleResponse<Shipment>(res);
  },

  // Permanent, irreversible delete — only ever called from the trash view on a shipment
  // that's already soft-deleted, as a deliberate separate action from the ordinary delete.
  async permanentlyDeleteShipment(trackingNumber: string): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch(`${API_BASE}/shipments/${encodeURIComponent(trackingNumber)}/permanent`, {
      method: 'DELETE'
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // Single fresh shipment, server-synced (unmasked, admin-only — never call this from a
  // public-facing page; use trackShipment there instead).
  async getShipment(trackingNumber: string): Promise<Shipment> {
    const res = await apiFetch(`${API_BASE}/shipments/${encodeURIComponent(trackingNumber)}`);
    return handleResponse<Shipment>(res);
  },

  async createShipment(shipmentData: Partial<Shipment>): Promise<Shipment> {
    const res = await apiFetch(`${API_BASE}/shipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shipmentData)
    });
    return handleResponse<Shipment>(res);
  },

  async updateShipmentStatus(
    trackingNumber: string,
    newStatus: ShipmentStatus,
    location?: string,
    facility?: string,
    notes?: string,
    progressPercent?: number,
    statusText?: string,
    lat?: number,
    lng?: number,
    eventTitle?: string,
    skipEventCreation?: boolean,
    estimatedDeliveryDate?: string,
    estimatedDeliveryTime?: string
  ): Promise<Shipment> {
    const res = await apiFetch(`${API_BASE}/shipments/${encodeURIComponent(trackingNumber)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newStatus, location, facility, notes, progressPercent, statusText, lat, lng, eventTitle, skipEventCreation, estimatedDeliveryDate, estimatedDeliveryTime })
    });
    return handleResponse<Shipment>(res);
  },

  async updateShipment(trackingNumber: string, shipment: Partial<Shipment>): Promise<Shipment> {
    const res = await apiFetch(`${API_BASE}/shipments/${encodeURIComponent(trackingNumber)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shipment)
    });
    return handleResponse<Shipment>(res);
  },

  async addTrackingEvent(trackingNumber: string, event: Partial<TrackingEvent>): Promise<Shipment> {
    const res = await apiFetch(`${API_BASE}/shipments/${encodeURIComponent(trackingNumber)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    return handleResponse<Shipment>(res);
  },

  async correctTrackingEvent(trackingNumber: string, eventId: string, updates: Partial<TrackingEvent>): Promise<Shipment> {
    const res = await apiFetch(`${API_BASE}/shipments/${encodeURIComponent(trackingNumber)}/events/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return handleResponse<Shipment>(res);
  },

  async deleteShipment(trackingNumber: string): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch(`${API_BASE}/shipments/${encodeURIComponent(trackingNumber)}`, {
      method: 'DELETE'
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // Admin Quotes
  async getQuotes(): Promise<QuoteRequest[]> {
    const res = await apiFetch(`${API_BASE}/quotes`);
    return handleResponse<QuoteRequest[]>(res);
  },

  // Public: a single quote by its own ID (used by the "look up my quote" flow) — scoped to
  // one record instead of pulling every customer's quotes to find a match client-side.
  async getPublicQuote(id: string): Promise<QuoteRequest | null> {
    const res = await apiFetch(`${API_BASE}/quotes/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    return handleResponse<QuoteRequest>(res);
  },

  async publishQuote(id: string, pricing: QuoteRequestPricing, internalNotes?: string): Promise<QuoteRequest> {
    const res = await apiFetch(`${API_BASE}/quotes/${encodeURIComponent(id)}/publish`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricing, internalNotes })
    });
    return handleResponse<QuoteRequest>(res);
  },

  async updateQuoteStatus(id: string, status: QuoteRequestStatus, validUntil?: string): Promise<QuoteRequest> {
    const res = await apiFetch(`${API_BASE}/quotes/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, validUntil })
    });
    return handleResponse<QuoteRequest>(res);
  },

  async convertQuoteToShipment(id: string, shipment?: Partial<Shipment>): Promise<{ trackingNumber: string; data: Shipment }> {
    const res = await apiFetch(`${API_BASE}/quotes/${encodeURIComponent(id)}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shipment || {})
    });
    return handleResponse<{ trackingNumber: string; data: Shipment }>(res);
  },

  // Admin Documents
  async getDocuments(params?: { docType?: string; status?: string; search?: string }): Promise<AdminDocument[]> {
    const query = new URLSearchParams();
    if (params?.docType) query.set('docType', params.docType);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const res = await apiFetch(`${API_BASE}/documents?${query.toString()}`);
    return handleResponse<AdminDocument[]>(res);
  },

  async generateDocument(docData: AdminDocument): Promise<AdminDocument> {
    const res = await apiFetch(`${API_BASE}/documents/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData)
    });
    return handleResponse<AdminDocument>(res);
  },

  async regenerateDocument(id: string, notes?: string, refreshedFields?: Partial<AdminDocument>): Promise<AdminDocument> {
    const res = await apiFetch(`${API_BASE}/documents/${encodeURIComponent(id)}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, ...refreshedFields })
    });
    return handleResponse<AdminDocument>(res);
  },

  async updateDocumentStatus(id: string, status: DocumentStatus): Promise<AdminDocument> {
    const res = await apiFetch(`${API_BASE}/documents/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return handleResponse<AdminDocument>(res);
  },

  async updateDocumentPaymentStatus(id: string, paymentStatus: 'PAID' | 'PENDING'): Promise<AdminDocument> {
    const res = await apiFetch(`${API_BASE}/documents/${encodeURIComponent(id)}/payment-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus })
    });
    return handleResponse<AdminDocument>(res);
  },

  async deleteDocument(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch(`${API_BASE}/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // Settings
  async getSettings(): Promise<AdminSettings> {
    const res = await apiFetch(`${API_BASE}/settings`);
    return handleResponse<AdminSettings>(res);
  },

  // Data & Backups (admin-only; see server/backup.ts)
  async getStorageStatus(): Promise<StorageStatus> {
    const res = await apiFetch(`${API_BASE}/admin/storage`);
    return handleResponse<StorageStatus>(res);
  },

  async createBackupNow(): Promise<BackupInfo> {
    const res = await apiFetch(`${API_BASE}/admin/backups`, { method: 'POST' });
    return handleResponse<BackupInfo>(res);
  },

  backupDownloadUrl(name?: string): string {
    return name ? `${API_BASE}/admin/backups/${encodeURIComponent(name)}` : `${API_BASE}/admin/backups/download`;
  },

  async updateSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    const res = await apiFetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return handleResponse<AdminSettings>(res);
  },

  // Dashboard Stats
  async getStats(): Promise<any> {
    const res = await apiFetch(`${API_BASE}/stats`);
    return handleResponse<any>(res);
  }
};
