import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import helmet from 'helmet';
import path from 'path';
import { initDatabase } from './db.js';
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

// Initialize Persistent SQLite Database
initDatabase();

// Middleware
// contentSecurityPolicy and crossOriginEmbedderPolicy are off deliberately, not an
// oversight: this app loads map tiles from ArcGIS, fonts from Google Fonts, and (on the
// flagship demo shipment) photos from Unsplash — none of those send the response headers a
// strict CSP/COEP would require, so turning helmet's defaults on as-is would silently break
// the map and images. Doing CSP properly means cataloguing every external host this app
// actually uses and allow-listing exactly those — worth doing as a deliberate follow-up,
// not as a default flip. Everything else helmet sets (X-Content-Type-Options, X-Frame-
// Options, Strict-Transport-Security, Referrer-Policy, etc.) is safe with no such tradeoff.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
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
// Raised from Express's 100kb default so a base64-encoded signature/stamp image upload
// (see Settings > Barcode & Documents) doesn't silently fail with a 413.
app.use(express.json({ limit: '5mb' }));

if (!process.env.SESSION_SECRET) {
  console.error('[server] SESSION_SECRET is not set in .env — admin sessions will not persist reliably across restarts.');
}

app.use(session({
  name: 'dxp.sid',
  secret: process.env.SESSION_SECRET || 'dev-only-insecure-fallback-secret',
  resave: false,
  saveUninitialized: false,
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
app.use('/api/settings', requireAdminAuth, settingsRouter);
app.use('/api/track', trackRouter);
app.use('/api/stats', requireAdminAuth, statsRouter);

// 404 for anything under /api that didn't match a route above.
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not found.' });
});

// Serve the built React frontend (dist/, produced by `vite build`) so this one process is
// the whole deployed app — API above, static site here. The app uses HashRouter (#/admin,
// #/track/...), so the browser only ever requests the bare "/" from the server no matter which
// in-app page is open (everything after "#" stays client-side) — express.static's default
// index.html-for-"/" behavior is enough, no separate SPA catch-all route is needed.
app.use(express.static(path.join(process.cwd(), 'dist')));

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
  console.log(`📦 Database: duolingo_express.db (Persistent SQLite)`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
