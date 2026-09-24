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
const EXTRA_ALLOWED_ORIGINS = configuredOrigin ? new Set([configuredOrigin, ...DEV_ORIGINS]) : DEV_ORIGINS;

// This server always serves its own frontend from the exact same host it receives API
// requests on — a single deployment, or the admin-subdomain proxy mode, which also always
// answers on its own host regardless of what it forwards to upstream. That means a genuine
// same-origin browser request's Origin header will always exactly equal THIS request's own
// scheme+host. Comparing against that derived value (respecting X-Forwarded-Proto/Host via
// `trust proxy`, set in index.ts) works correctly with zero configuration — unlike relying on
// a separately-set ALLOWED_ORIGIN env var, which nothing in setup ever prompted for and which
// silently defaulted to dev-only origins. On the real deployed domain, every state-changing
// admin request's Origin header failed to match that dev-only list and was rejected here with
// a 403 — every delete, status change, and settings save looked like it was being ignored,
// when it was actually being blocked before it ever reached the route handler.
function originIsAllowed(req: Request): boolean {
  const originHeader = req.headers.origin;
  if (!originHeader) return true; // no Origin sent — see comment above
  if (EXTRA_ALLOWED_ORIGINS.has(originHeader)) return true;
  const selfOrigin = `${req.protocol}://${req.get('host')}`;
  return originHeader === selfOrigin;
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
