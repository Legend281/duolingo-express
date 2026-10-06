import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import helmet from 'helmet';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { initDatabase, db } from './db.js';
import { SqliteSessionStore } from './sessionStore.js';
import { startBackupSchedule, ensurePersistenceMarker } from './backup.js';
import { repairLegacyDates } from './dateRepair.js';
import { adminRouter } from './routes/admin.js';
import { cspDirectives } from './csp.js';
import { shipmentsRouter } from './routes/shipments.js';
import { quotesRouter } from './routes/quotes.js';
import { documentsRouter } from './routes/documents.js';
import { settingsRouter } from './routes/settings.js';
import { trackRouter } from './routes/track.js';
import { statsRouter } from './routes/stats.js';
import { authRouter } from './routes/auth.js';
import { requireAdminAuth } from './middleware/auth.js';

dotenv.config(); // reload trigger for tsx watch after .env changes

const app = express();
const PORT = process.env.PORT || 5000;

// Set only on the admin-subdomain deployment. That deployment has no database of its own —
// every /api request is silently forwarded to the real app's API instead, so there is always
// exactly one SQLite file and one source of truth, never two copies of the data quietly
// diverging between the public site and the admin console. See the branch below.
const ADMIN_PROXY_TARGET = process.env.ADMIN_PROXY_TARGET;
// Origin (scheme://host[:port]) of the main site, when this process is the admin host.
const APP_ORIGIN = ADMIN_PROXY_TARGET ? new URL(ADMIN_PROXY_TARGET).origin : undefined;

// Hostinger (like virtually all shared/PaaS hosting) terminates HTTPS at a reverse proxy in
// front of this process, which itself only ever sees plain HTTP. Without this, Express has no
// way to know the original request was secure, so the session cookie's `secure: true` flag
// below never actually reaches the browser correctly — every request after login still looks
// unauthenticated (401), even though login itself appears to succeed. Trusting the first
// proxy hop is what lets Express read the standard X-Forwarded-Proto header instead.
app.set('trust proxy', 1);

if (!ADMIN_PROXY_TARGET) {
  // Initialize Persistent SQLite Database
  initDatabase();
  // Deploy-wipe check marker + automatic backups (see server/backup.ts).
  ensurePersistenceMarker();
  // One-time repair of free-text dates from before timestamps were stored (backs up first;
  // a no-op once the data is clean). See server/dateRepair.ts.
  repairLegacyDates();
  startBackupSchedule();
}

// Middleware
// Content Security Policy: an explicit allow-list of the outside services the site really uses
// (see server/csp.ts for the inventory). CSP_REPORT_ONLY=true makes browsers report violations
// without blocking — for trialing a change on the live site.
// crossOriginEmbedderPolicy stays off: Unsplash photos and ArcGIS map tiles don't send the
// Cross-Origin-Resource-Policy headers COEP would require, so it would blank them out.
// Everything else helmet sets (X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy)
// is on by default.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: cspDirectives(process.env.NODE_ENV === 'production', APP_ORIGIN),
    reportOnly: process.env.CSP_REPORT_ONLY === 'true',
  },
  crossOriginEmbedderPolicy: false,
  // 'same-site' (not the default 'same-origin'): the admin host (dr.) loads this site's
  // scripts/styles directly, and dr. is the same site, so it must be allowed to.
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

// credentials:true + a specific origin (not '*', which browsers reject alongside
// credentialed requests) — the admin session cookie has to actually reach the API for
// auth to work at all. In dev the Vite proxy makes this same-origin anyway, but this also
// covers hitting the API directly against its own port.
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// API replies must never be cached or rewritten by an edge/CDN in front of this app: on the
// production admin host, replies were arriving with their body missing (see apiFetch in
// src/services/api.ts). ETags are dropped for the same reason — an edge treating a reply as
// revalidatable is one way a body gets swapped for an empty one.
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  res.set('Cache-Control', 'no-store, no-transform');
  next();
});
app.set('etag', false);

if (ADMIN_PROXY_TARGET) {
  // Admin-subdomain deployment: forward every /api request to the real app untouched, cookies
  // included. Mounted before any body-parser so the raw request stream reaches the upstream
  // intact — express.json() below would otherwise consume it, breaking the proxy for any
  // POST/PUT/PATCH body. No cookieDomainRewrite needed: the session cookie is set with no
  // explicit Domain attribute (see below), so it passes through unchanged and the browser
  // naturally scopes it to whichever host actually answered — this subdomain.
  //
  // pathRewrite re-adds "/api" because Express's app.use('/api', ...) already strips that
  // prefix from req.url before the proxy ever sees it (confirmed live — without this, /api/
  // health arrived upstream as bare /health and 404'd).
  app.use('/api', createProxyMiddleware({
    target: ADMIN_PROXY_TARGET,
    changeOrigin: true,
    pathRewrite: (path) => `/api${path}`,
    on: {
      proxyRes: (proxyRes) => {
        delete proxyRes.headers['etag'];
        proxyRes.headers['cache-control'] = 'no-store, no-transform';
      },
    },
  }));
} else {
  // Raised from Express's 100kb default so a base64-encoded signature/stamp image upload
  // (see Settings > Barcode & Documents) doesn't silently fail with a 413.
  app.use(express.json({ limit: '5mb' }));

  if (!process.env.SESSION_SECRET) {
    console.error('[server] SESSION_SECRET is not set in .env — admin sessions will not persist reliably across restarts.');
  }

  app.use(session({
    name: 'dxp.sid',
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-fallback-secret',
    // Sessions persist in SQLite so a restart/redeploy no longer logs every admin out.
    store: new SqliteSessionStore(db),
    resave: false,
    saveUninitialized: false,
    // Tells express-session to trust the proxy-derived secure-ness (via trust proxy above)
    // rather than the raw, always-insecure connection this process itself sees — required
    // alongside app.set('trust proxy') for a secure cookie to actually be set behind one.
    proxy: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // Only sent over HTTPS once this is actually deployed behind one — forcing it on in
      // this local http dev setup would silently stop the cookie from ever being sent at all.
      secure: process.env.NODE_ENV === 'production',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    }
  }));

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Duolingo Express Core Logistics API',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // (The former public /api/diag/storage deploy-wipe check now lives, admin-only and without
  // exposing server paths, at /api/admin/storage — shown under Settings > Data & Backups.)

  // API Routes
  // login/logout/session-check are necessarily unauthenticated (that's the point of them);
  // shipments and quotes are mixed public+admin routers, so each gates its own admin-only
  // routes internally — see the requireAdminAuth calls inside those two files. Documents,
  // settings and stats have no public use at all (confirmed by a full grep of the frontend
  // before this change), so it's simpler and harder to accidentally get wrong to gate them
  // wholesale here at the mount point instead of touching every route inside those files.
  app.use('/api/auth', authRouter);
  app.use('/api/shipments', shipmentsRouter);
  app.use('/api/quotes', quotesRouter);
  // documents is ALSO mixed public+admin (the public booking flow in ShipPage.tsx
  // auto-generates a BOL right after booking) — gated per-route inside documents.ts instead
  // of wholesale here, same reasoning as shipments/quotes.
  app.use('/api/documents', documentsRouter);
  // Not gated wholesale — GET is public (the public site needs to read company
  // identity/display-toggle fields like companyName/supportPhone/piiMaskingEnabled), and the
  // settings blob has nothing sensitive in it (no secrets, just business info and display
  // toggles whose enforcement already happens server-side regardless of who can see the
  // toggle's value). PUT is gated per-route inside settings.ts instead.
  app.use('/api/settings', settingsRouter);
  app.use('/api/track', trackRouter);
  app.use('/api/stats', requireAdminAuth, statsRouter);
  app.use('/api/admin', requireAdminAuth, adminRouter);

  // 404 for anything under /api that didn't match a route above.
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Not found.' });
  });
}

// Serve the built React frontend (dist/, produced by `vite build`) so this one process is
// the whole deployed app — API above, static site here. The app uses HashRouter (#/admin,
// #/track/...), so the browser only ever requests the bare "/" from the server no matter which
// in-app page is open (everything after "#" stays client-side) — express.static's default
// index.html-for-"/" behavior is enough, no separate SPA catch-all route is needed.
if (ADMIN_PROXY_TARGET) {
  // Admin host: serve the main site's current pages too, not this app's own build. This app
  // is redeployed separately and was seen running a build one release behind the main site,
  // so an already-shipped fix was still missing on the admin host. Falls back to the local
  // build only if the main site can't be reached.
  const localDist = express.static(path.join(process.cwd(), 'dist'));

  // The page itself: the main site's index.html, rewritten so every script/style loads
  // straight from the main site and the app sends its API calls there too. The edge in front
  // of this admin host was measured delivering some files with an EMPTY body — an empty code
  // file broke the whole admin ("does not provide an export named 'C'", React error #306),
  // and empty API replies broke saves. Only this one small page now travels through it.
  app.get(['/', '/index.html'], async (req: Request, res: Response, next: NextFunction) => {
    try {
      const upstream = await fetch(`${APP_ORIGIN}/`, { headers: { 'Accept': 'text/html' } });
      const html = await upstream.text();
      if (!upstream.ok || !html.includes('<div id="root">')) throw new Error(`upstream ${upstream.status}`);
      const rewritten = html
        .replace(/(src|href)="\/(?!\/)([^"]*)"/g, `$1="${APP_ORIGIN}/$2"`)
        .replace('<head>', `<head>\n    <meta name="dxp-api-origin" content="${APP_ORIGIN}">`);
      res.set('Cache-Control', 'no-store');
      res.type('html').send(rewritten);
    } catch (err) {
      console.error('[admin-host] Could not load the main site page, serving the local build:', err);
      next();
    }
  });

  app.use(createProxyMiddleware({
    target: ADMIN_PROXY_TARGET,
    changeOrigin: true,
    on: {
      error: (_err, req, res) => {
        const r = res as Response;
        if ('headersSent' in r && !r.headersSent) localDist(req as Request, r, () => r.status(502).end());
      },
    },
  }));
} else {
  app.use(express.static(path.join(process.cwd(), 'dist')));
}

// Last-resort error handler — catches anything that bypassed every route's own try/catch
// (a malformed JSON body from express.json(), a thrown error in middleware, etc.). Express's
// own default handler, with no NODE_ENV set (the case in this dev setup), responds with the
// FULL raw error — stack trace, absolute local filesystem paths, all of it — to whoever sent
// the request; confirmed live by POSTing truncated JSON and getting back a stack trace with
// this machine's real folder path in the response body. This always returns a flat, generic
// message instead and logs the real error server-side only, regardless of NODE_ENV.
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[server] Unhandled error:', err);
  if (res.headersSent) return next(err);
  const isMalformedBody = err?.type === 'entity.parse.failed' || err instanceof SyntaxError;
  const status = isMalformedBody ? 400 : (typeof err?.status === 'number' ? err.status : 500);
  res.status(status).json({
    success: false,
    error: isMalformedBody ? 'Malformed request body.' : 'Internal server error.'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Duolingo Express API Server running on port ${PORT}`);
  if (ADMIN_PROXY_TARGET) {
    console.log(`🔀 Admin-proxy mode — /api forwards to ${ADMIN_PROXY_TARGET}`);
  } else {
    console.log(`📦 Database: duolingo_express.db (Persistent SQLite)`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  }
  console.log(`====================================================`);
});
