import { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    isAdmin?: boolean;
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Same-site cookies (see the `sameSite: 'lax'` session config in index.ts) already stop the
// classic CSRF attack — a cross-site page can't get the browser to attach the admin's session
// cookie to a state-changing request at all. This is a second, independent layer: browsers
// always attach an Origin header to cross-origin fetch/XHR/form requests, so a request that
// DOES carry the session cookie (meaning something bypassed or predates the SameSite
// protection — an older browser, a misconfigured proxy, a browser bug) but has an Origin
// pointing somewhere else is still refused here. Deliberately lenient when Origin is absent
// entirely: real browsers always send it on state-changing cross-origin-capable requests, so
// its absence usually means a non-browser client (curl, a script, legitimate tooling)
// presenting the cookie deliberately — not a CSRF victim, and not what this check is for.
const configuredOrigin = process.env.ALLOWED_ORIGIN;
const DEV_ORIGINS = new Set(['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000']);
const ALLOWED_ORIGINS = configuredOrigin ? new Set([configuredOrigin, ...DEV_ORIGINS]) : DEV_ORIGINS;

function originIsAllowed(req: Request): boolean {
  const originHeader = req.headers.origin;
  if (!originHeader) return true; // no Origin sent — see comment above
  return ALLOWED_ORIGINS.has(originHeader);
}

/**
 * Gates a route behind the admin session established by POST /api/auth/login. Every
 * admin-only route (shipment list/detail/mutations, quotes list/publish/convert, documents,
 * settings, stats) must go through this — a login FORM alone protects nothing if the API
 * routes behind it stay reachable without a session, which is exactly how this system used
 * to work (no auth anywhere).
 *
 * Also rejects state-changing (non-GET/HEAD/OPTIONS) requests whose Origin header doesn't
 * match this app — see the CSRF comment above.
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAdmin) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!SAFE_METHODS.has(req.method) && !originIsAllowed(req)) {
    return res.status(403).json({ success: false, error: 'Cross-origin request blocked.' });
  }
  next();
}
