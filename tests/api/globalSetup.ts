import { spawn, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import bcrypt from 'bcryptjs';
import type { TestProject } from 'vitest/node';

// Starts the real server (server/index.ts via tsx) against a brand-new temporary database,
// so API tests never touch real data. Exposes the base URL and admin password to tests.

export const ADMIN_PASSWORD = 'test-admin-password';

declare module 'vitest' {
  export interface ProvidedContext {
    apiBase: string;
    adminPassword: string;
    tempDir: string;
  }
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

let child: ChildProcess | null = null;
let tempDir = '';

export async function startServer(port: number, dir: string): Promise<ChildProcess> {
  const proc = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: path.resolve(__dirname, '../..'),
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: path.join(dir, 'test.db'),
      BACKUP_DIR: path.join(dir, 'backups'),
      ADMIN_PASSWORD_HASH: bcrypt.hashSync(ADMIN_PASSWORD, 4),
      SESSION_SECRET: 'vitest-session-secret',
      SEED_DEMO_DATA: 'true',
      NODE_ENV: 'test',
      ADMIN_PROXY_TARGET: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  proc.stdout?.on('data', d => { output += d; });
  proc.stderr?.on('data', d => { output += d; });

  const base = `http://127.0.0.1:${port}/api`;
  for (let i = 0; i < 120; i++) {
    if (proc.exitCode !== null) throw new Error(`Test server exited early:\n${output}`);
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) return proc;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 250));
  }
  proc.kill();
  throw new Error(`Test server did not start within 30s:\n${output}`);
}

export default async function setup(project: TestProject) {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dxp-api-test-'));
  const port = await freePort();
  child = await startServer(port, tempDir);
  project.provide('apiBase', `http://127.0.0.1:${port}/api`);
  project.provide('adminPassword', ADMIN_PASSWORD);
  project.provide('tempDir', tempDir);

  return async () => {
    child?.kill();
    await new Promise(r => setTimeout(r, 300));
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* Windows may hold the file briefly */ }
  };
}
