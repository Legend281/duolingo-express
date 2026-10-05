import session from 'express-session';
import { DatabaseSync } from 'node:sqlite';

/**
 * express-session store backed by the app's own SQLite database. The default MemoryStore
 * kept every admin session in this process's memory, so every restart or redeploy logged
 * every admin out (and express-session itself warns MemoryStore isn't meant for production:
 * it never frees expired sessions). Sessions live in their own `sessions` table; backups strip
 * that table (see server/backup.ts) so a leaked backup file can't be used to sign in.
 */
export class SqliteSessionStore extends session.Store {
  private db: DatabaseSync;
  private defaultTtlMs: number;

  constructor(db: DatabaseSync, defaultTtlMs = 12 * 60 * 60 * 1000) {
    super();
    this.db = db;
    this.defaultTtlMs = defaultTtlMs;
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expires INTEGER NOT NULL
      );
    `);
    // Hourly sweep of expired rows; unref() so it never keeps the process alive on its own.
    const sweep = setInterval(() => this.clearExpired(), 60 * 60 * 1000);
    sweep.unref?.();
  }

  private expiryFor(sess: session.SessionData): number {
    const expires = sess.cookie?.expires;
    if (expires) {
      const ts = new Date(expires as any).getTime();
      if (!isNaN(ts)) return ts;
    }
    return Date.now() + (typeof sess.cookie?.maxAge === 'number' ? sess.cookie.maxAge : this.defaultTtlMs);
  }

  clearExpired(): void {
    try {
      this.db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
    } catch (err) {
      console.error('[sessions] Failed to clear expired sessions:', err);
    }
  }

  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void): void {
    try {
      const row = this.db.prepare('SELECT sess, expires FROM sessions WHERE sid = ?').get(sid) as { sess: string; expires: number } | undefined;
      if (!row || row.expires <= Date.now()) return callback(null, null);
      callback(null, JSON.parse(row.sess));
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, sess: session.SessionData, callback?: (err?: any) => void): void {
    try {
      this.db.prepare(`
        INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires
      `).run(sid, JSON.stringify(sess), this.expiryFor(sess));
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  touch(sid: string, sess: session.SessionData, callback?: (err?: any) => void): void {
    try {
      this.db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?').run(this.expiryFor(sess), sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }
}
