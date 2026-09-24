import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { seedDatabaseIfEmpty } from './seed.js';

// process.cwd()-relative rather than __dirname-relative: this file's compiled location
// changes depth (server/db.ts in dev via tsx vs dist-server/server/db.js in production), but
// the process is always launched from the project root either way, so cwd stays stable.
const dataDir = path.join(process.cwd(), 'data');

// The admin-subdomain deployment runs in proxy mode (ADMIN_PROXY_TARGET, see server/index.ts)
// and never touches a database — every route file still does a static `import { db } from
// '../db.js'` though, which runs this module's top-level code regardless of which mode
// index.ts ends up branching into at runtime. An in-memory database here (rather than
// skipping creation entirely) keeps `db`'s type real with zero disk footprint — no data/
// directory or .db file gets created on that deployment, and in the unlikely event anything
// ever did call a method on it, it'd hit a harmless empty DB rather than crashing.
const dbPath = process.env.ADMIN_PROXY_TARGET
  ? ':memory:'
  : path.join(dataDir, 'duolingo_express.db');

if (!process.env.ADMIN_PROXY_TARGET && !fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// enableForeignKeyConstraints: without it, the ON DELETE CASCADE declared on
// shipment_pieces.parent_tracking and tracking_events.shipment_tracking is purely
// decorative — SQLite does not enforce foreign keys (or cascade deletes) unless this is
// explicitly turned on for the connection (it's node:sqlite's default, but set explicitly
// here since correctness depends on it).
export const db = new DatabaseSync(dbPath, { enableForeignKeyConstraints: true });

// Enable WAL mode for high concurrency
db.exec('PRAGMA journal_mode = WAL;');

export function initDatabase() {
  // 1. Shipments Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shipments (
      tracking_number TEXT PRIMARY KEY,
      barcode_code TEXT NOT NULL,
      status TEXT NOT NULL,
      status_text TEXT NOT NULL,
      progress_percent INTEGER NOT NULL,
      last_updated TEXT NOT NULL,
      created_at TEXT NOT NULL,
      estimated_delivery_date TEXT NOT NULL,
      estimated_delivery_time TEXT NOT NULL,
      service TEXT NOT NULL,
      shipment_type TEXT NOT NULL,
      cargo_description TEXT NOT NULL,
      total_weight_lbs REAL NOT NULL,
      total_pieces INTEGER NOT NULL,
      declared_value REAL,
      origin_city TEXT NOT NULL,
      origin_state TEXT NOT NULL,
      origin_lat REAL NOT NULL,
      origin_lng REAL NOT NULL,
      destination_city TEXT NOT NULL,
      destination_state TEXT NOT NULL,
      destination_lat REAL NOT NULL,
      destination_lng REAL NOT NULL,
      current_location_city TEXT NOT NULL,
      current_location_state TEXT NOT NULL,
      current_location_lat REAL NOT NULL,
      current_location_lng REAL NOT NULL,
      current_facility TEXT NOT NULL,
      sender_json TEXT NOT NULL,
      recipient_json TEXT NOT NULL,
      dimensions_json TEXT NOT NULL,
      vehicle_json TEXT,
      pet_json TEXT,
      pallet_json TEXT,
      container_json TEXT,
      freight_json TEXT,
      document_json TEXT,
      references_json TEXT,
      cargo_category TEXT,
      photos_json TEXT,
      handling_requirements_json TEXT,
      pickup_window TEXT,
      internal_pricing_note TEXT
    );
  `);

  // 2. Shipment Pieces Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shipment_pieces (
      id TEXT PRIMARY KEY,
      tracking_number TEXT NOT NULL,
      parent_tracking TEXT NOT NULL,
      piece_number INTEGER NOT NULL,
      total_pieces INTEGER NOT NULL,
      status TEXT NOT NULL,
      status_text TEXT NOT NULL,
      current_location TEXT NOT NULL,
      weight_lbs REAL NOT NULL,
      dimensions_json TEXT NOT NULL,
      FOREIGN KEY (parent_tracking) REFERENCES shipments(tracking_number) ON DELETE CASCADE
    );
  `);

  // 3. Tracking Checkpoints / Events Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracking_events (
      id TEXT PRIMARY KEY,
      shipment_tracking TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      facility TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      description TEXT NOT NULL,
      operator_notes TEXT,
      delay_flag INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 1,
      current_flag INTEGER DEFAULT 0,
      sort_order INTEGER NOT NULL,
      recorded_by TEXT,
      correction_audit_json TEXT,
      FOREIGN KEY (shipment_tracking) REFERENCES shipments(tracking_number) ON DELETE CASCADE
    );
  `);

  // 4. Quote Requests Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quote_requests (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      company TEXT,
      origin_json TEXT NOT NULL,
      destination_json TEXT NOT NULL,
      service TEXT NOT NULL,
      shipment_type TEXT NOT NULL,
      cargo_description TEXT NOT NULL,
      weight_lbs REAL NOT NULL,
      pieces INTEGER NOT NULL,
      dimensions_json TEXT,
      declared_value REAL,
      special_instructions TEXT,
      pricing_json TEXT,
      internal_notes TEXT,
      converted_shipment_id TEXT
    );
  `);

  // 5. Admin Documents Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      doc_type TEXT NOT NULL,
      title TEXT NOT NULL,
      shipment_tracking TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_company TEXT,
      sender_address TEXT,
      sender_city TEXT NOT NULL,
      sender_state TEXT NOT NULL,
      sender_zip TEXT,
      sender_phone TEXT,
      sender_email TEXT,
      recipient_name TEXT NOT NULL,
      recipient_company TEXT,
      recipient_address TEXT,
      recipient_city TEXT NOT NULL,
      recipient_state TEXT NOT NULL,
      recipient_zip TEXT,
      recipient_phone TEXT,
      recipient_email TEXT,
      cargo_description TEXT NOT NULL,
      shipment_type TEXT NOT NULL,
      service TEXT NOT NULL,
      weight_lbs REAL NOT NULL,
      pieces INTEGER NOT NULL,
      dimensions TEXT,
      declared_value REAL,
      charges_json TEXT,
      bol_carrier TEXT,
      bol_trailer_number TEXT,
      bol_seal_number TEXT,
      bol_special_instructions TEXT,
      insurer_name TEXT,
      policy_number TEXT,
      coverage_type TEXT,
      deductible REAL,
      premium_amount REAL,
      created_date TEXT NOT NULL,
      status TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      version_history_json TEXT,
      file_size TEXT
    );
  `);

  // 6. Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );
  `);

  // Safe dynamic migrations for existing databases. Must run after every CREATE TABLE above
  // (shipments through settings) — these ALTER statements target quote_requests, documents
  // and tracking_events too, and running them any earlier throws "no such table" on a
  // genuinely fresh database. That failure used to be silently swallowed by the empty catch
  // below, which meant several real columns (documents.sender_email, tracking_events.
  // recorded_by, quote_requests.converted_shipment_id, etc.) never actually got added on a
  // fresh install even though no error ever surfaced.
  try { db.exec(`ALTER TABLE shipments ADD COLUMN vehicle_json TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE shipments ADD COLUMN pet_json TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE shipments ADD COLUMN pallet_json TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE shipments ADD COLUMN container_json TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE shipments ADD COLUMN freight_json TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE shipments ADD COLUMN document_json TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE shipments ADD COLUMN references_json TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE shipments ADD COLUMN cargo_category TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE shipments ADD COLUMN photos_json TEXT;`); } catch (e) {}
  // Precise epoch-ms clock used to advance progress over real elapsed time, independent of
  // any client session — see server/progress.ts.
  try { db.exec(`ALTER TABLE shipments ADD COLUMN progress_updated_at_ts INTEGER;`); } catch (e) {}

  // Precise epoch-ms creation timestamps for reliable "newest first" sorting. created_at /
  // created_date are display-formatted strings ("Today", "Sep 4, 2026", "2026-08-19" — all
  // three appear in this same column depending on which UI created the row) and sorting
  // those lexicographically does NOT reflect real chronological order — e.g. "Oct" sorts
  // before "Sep" alphabetically despite being later. These columns are the real order.
  try { db.exec(`ALTER TABLE shipments ADD COLUMN created_at_ts INTEGER;`); } catch (e) {}
  try { db.exec(`ALTER TABLE quote_requests ADD COLUMN created_at_ts INTEGER;`); } catch (e) {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN created_at_ts INTEGER;`); } catch (e) {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN sender_email TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN recipient_email TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN insurer_name TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN policy_number TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN coverage_type TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN deductible REAL;`); } catch (e) {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN premium_amount REAL;`); } catch (e) {}
  try { db.exec(`ALTER TABLE quote_requests ADD COLUMN converted_shipment_id TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE tracking_events ADD COLUMN recorded_by TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE tracking_events ADD COLUMN correction_audit_json TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE shipments ADD COLUMN handling_requirements_json TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE shipments ADD COLUMN pickup_window TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE shipments ADD COLUMN internal_pricing_note TEXT;`); } catch (e) {}

  // Backfill existing rows so they don't all collapse to "unknown, sort last": preserve
  // today's best-effort relative order (by rowid, which reflects insertion order) as a
  // reasonable starting point. Every future insert gets a real Date.now() timestamp. Must
  // run after every table above is created (shipments through documents) — running it
  // earlier throws "no such table" on a genuinely fresh database, since quote_requests and
  // documents aren't created until steps 4 and 5.
  const backfillTable = (table: string) => {
    const needsBackfill = db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE created_at_ts IS NULL`).get() as any;
    if (needsBackfill.c === 0) return;
    const rows = db.prepare(`SELECT rowid FROM ${table} WHERE created_at_ts IS NULL ORDER BY rowid ASC`).all() as any[];
    const base = Date.now() - rows.length * 1000;
    const stmt = db.prepare(`UPDATE ${table} SET created_at_ts = ? WHERE rowid = ?`);
    rows.forEach((r, i) => stmt.run(base + i * 1000, r.rowid));
  };
  backfillTable('shipments');
  backfillTable('quote_requests');
  backfillTable('documents');

  // Default system configuration
  const settingCheck = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('general');
  if (!settingCheck) {
    db.prepare(`INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)`).run('general', JSON.stringify({
      companyName: 'Duolingo Express Logistics LLC',
      supportPhone: '(800) 555-DUO-EXP',
      dispatchEmail: 'dispatch@duolingoexpress.com',
      headquartersAddress: 'JFK International Cargo Terminal, Jamaica, NY 11430',
      dotNumber: 'USDOT #3894210 · MC-892401',
      piiMaskingEnabled: true,
      mapVisibility: 'CITY',
      cloakInternalNotes: true,
      showEstimatedTime: true,
      defaultFuelSurchargeRate: 0.085,
      quoteValidityDays: 14,
      oversizeLengthThreshold: 60
    }));
  } else {
    // Migration: an earlier version of this seed used the key `headquarters` instead of
    // `headquartersAddress` (the name the AdminSettings type and Settings page actually use),
    // so on any database seeded before this fix the admin's HQ address silently never showed
    // up when the Settings page was fixed to read from the real persisted value. Rename it
    // in place, once.
    const existing = JSON.parse((settingCheck as any).value_json);
    if (existing.headquarters !== undefined) {
      if (existing.headquartersAddress === undefined) {
        existing.headquartersAddress = existing.headquarters;
      }
      delete existing.headquarters;
      db.prepare(`UPDATE settings SET value_json = ? WHERE key = ?`).run(JSON.stringify(existing), 'general');
    }
  }

  // Demo/sample data (the "Randy's Tacoma" flagship shipment, sample quotes, a sample
  // document) is opt-in only, via SEED_DEMO_DATA=true — never automatic. This app is in real
  // production use now, not just a demo: an admin deleting every shipment (intentionally, or
  // via a bug like the one that motivated this) must land on a genuinely empty dashboard, not
  // have fake data silently reappear in place of whatever real records used to be there. That
  // silent reappearance is exactly what made a real, deleted shipment look like "the demo data
  // came back" instead of "data was lost" — this removes the ambiguity by never reseeding on
  // its own, under any circumstance, once the site is live.
  if (process.env.SEED_DEMO_DATA === 'true') {
    seedDatabaseIfEmpty();
  }
}
