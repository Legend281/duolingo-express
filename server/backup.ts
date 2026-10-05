import path from 'path';
import fs from 'fs';
import os from 'os';
import { DatabaseSync } from 'node:sqlite';
import { db, dataDir, dbPath } from './db.js';

/**
 * Database backups. There were none before — two total-data-loss incidents had nothing to
 * restore from. SQLite's `VACUUM INTO` writes a complete, consistent copy of the live database
 * to a new file (safe while the app is running, WAL included), so no extra dependency is needed.
 *
 * Configuration (all optional, in .env):
 *   BACKUP_DIR             where backup files go (default: <data dir>/backups). Point this at
 *                          storage your host keeps across redeploys; a backup in the same place
 *                          a deploy wipes is wiped with it.
 *   BACKUP_INTERVAL_HOURS  how often to take an automatic backup (default 24)
 *   BACKUP_KEEP            how many automatic/manual backups to keep (default 14)
 *
 * Restoring: stop the app, replace the database file (DB_PATH, or data/duolingo_express.db)
 * with a backup file, delete the -wal/-shm files next to it if present, start the app.
 */

export const backupDir = process.env.BACKUP_DIR || path.join(dataDir, 'backups');
const intervalHours = Math.max(1, Number(process.env.BACKUP_INTERVAL_HOURS) || 24);
const keepCount = Math.max(1, Number(process.env.BACKUP_KEEP) || 14);

const FILE_PREFIX = 'duolingo_express-';
// Only names this module itself produces are ever listed or served (no path traversal).
const BACKUP_NAME_RE = /^duolingo_express-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-(auto|manual|premigration)\.db$/;

export interface BackupInfo {
  name: string;
  sizeBytes: number;
  createdAt: string;
  kind: BackupKind;
}

/** 'premigration' = taken automatically right before a data repair (server/dateRepair.ts). */
export type BackupKind = 'auto' | 'manual' | 'premigration';

/** Copies the live database to `target`, then removes login sessions from the copy. */
function snapshotTo(target: string): void {
  if (fs.existsSync(target)) fs.unlinkSync(target);
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  // A backup must never be usable to sign in as an admin.
  const copy = new DatabaseSync(target);
  try {
    const hasSessions = copy.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sessions'").get();
    if (hasSessions) {
      copy.exec('DELETE FROM sessions;');
      copy.exec('VACUUM;');
    }
  } finally {
    copy.close();
  }
}

export function listBackups(): BackupInfo[] {
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir)
    .filter(name => BACKUP_NAME_RE.test(name))
    .map(name => {
      const stat = fs.statSync(path.join(backupDir, name));
      return {
        name,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
        kind: (name.match(/-(auto|manual|premigration)\.db$/)?.[1] || 'auto') as BackupKind,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function prune(): void {
  for (const old of listBackups().slice(keepCount)) {
    try { fs.unlinkSync(path.join(backupDir, old.name)); } catch { /* already gone */ }
  }
}

export function createBackup(kind: BackupKind): BackupInfo {
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
  const name = `${FILE_PREFIX}${stamp}-${kind}.db`;
  const target = path.join(backupDir, name);
  snapshotTo(target);
  prune();
  const stat = fs.statSync(target);
  console.log(`[backup] ${kind} backup written: ${name} (${Math.round(stat.size / 1024)} KB)`);
  return { name, sizeBytes: stat.size, createdAt: stat.mtime.toISOString(), kind };
}

/** Absolute path of a stored backup, or null if the name isn't one of ours / doesn't exist. */
export function resolveBackupFile(name: string): string | null {
  if (!BACKUP_NAME_RE.test(name)) return null;
  const full = path.join(backupDir, name);
  return fs.existsSync(full) ? full : null;
}

/** A fresh snapshot in the OS temp dir for downloading; caller deletes it after sending. */
export function createDownloadSnapshot(): string {
  const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
  const target = path.join(os.tmpdir(), `${FILE_PREFIX}${stamp}-download-${process.pid}.db`);
  snapshotTo(target);
  return target;
}

/**
 * Takes a backup now if the newest one is older than the interval (so frequent restarts in
 * development don't pile up copies), then on a fixed schedule. Never throws: a failed backup
 * is logged, it must not take the app down.
 */
export function startBackupSchedule(): void {
  const run = () => {
    try {
      createBackup('auto');
    } catch (err) {
      console.error('[backup] Automatic backup FAILED:', err);
    }
  };
  const newest = listBackups()[0];
  const ageMs = newest ? Date.now() - new Date(newest.createdAt).getTime() : Infinity;
  if (ageMs >= intervalHours * 3600e3) run();
  const timer = setInterval(run, intervalHours * 3600e3);
  timer.unref?.();
}

// ---------------------------------------------------------------------------------------
// Deploy-wipe check (moved here from the former public /api/diag/storage endpoint). A marker
// file is written next to the database the first time the app ever starts with this data
// directory; its "first seen" time surviving a redeploy means the host keeps the directory.
// ---------------------------------------------------------------------------------------
const markerPath = path.join(dataDir, '.persistence-check.json');

export function ensurePersistenceMarker(): void {
  try {
    if (!fs.existsSync(markerPath)) {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(markerPath, JSON.stringify({ firstSeen: new Date().toISOString() }));
    }
  } catch (err) {
    console.error('[storage] Could not write persistence marker:', err);
  }
}

export function storageStatus() {
  let markerFirstSeen: string | null = null;
  try {
    markerFirstSeen = JSON.parse(fs.readFileSync(markerPath, 'utf-8')).firstSeen ?? null;
  } catch { /* no marker yet */ }
  const dbStat = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;
  const backups = listBackups();
  return {
    // Booleans only — the absolute paths stay server-side.
    customDatabasePath: !!process.env.DB_PATH,
    customBackupDir: !!process.env.BACKUP_DIR,
    dataDirFirstSeen: markerFirstSeen,
    serverStartedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    databaseSizeBytes: dbStat?.size ?? null,
    backupIntervalHours: intervalHours,
    backupKeep: keepCount,
    lastBackupAt: backups[0]?.createdAt ?? null,
    backups,
  };
}
