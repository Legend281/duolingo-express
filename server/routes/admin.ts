import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createBackup, createDownloadSnapshot, resolveBackupFile, storageStatus } from '../backup.js';

// Mounted behind requireAdminAuth in server/index.ts — every route here is admin-only.
export const adminRouter = Router();

// GET /api/admin/storage — backup list, last backup time, and the deploy-wipe check.
adminRouter.get('/storage', (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: storageStatus() });
  } catch (err) {
    console.error('[admin] storage status failed:', err);
    res.status(500).json({ success: false, error: 'Could not read storage status.' });
  }
});

// POST /api/admin/backups — take a backup right now.
adminRouter.post('/backups', (req: Request, res: Response) => {
  try {
    res.status(201).json({ success: true, data: createBackup('manual') });
  } catch (err) {
    console.error('[admin] manual backup failed:', err);
    res.status(500).json({ success: false, error: 'Backup failed. Check the server log.' });
  }
});

// GET /api/admin/backups/download — a fresh snapshot of the database, as a file download.
// The way to keep a copy OFF the server, which is the only protection if the host wipes it.
adminRouter.get('/backups/download', (req: Request, res: Response) => {
  let tmp: string | null = null;
  try {
    tmp = createDownloadSnapshot();
    const file = tmp;
    res.download(file, path.basename(file).replace(/-download-\d+\.db$/, '.db'), err => {
      fs.unlink(file, () => {});
      if (err && !res.headersSent) res.status(500).json({ success: false, error: 'Download failed.' });
    });
  } catch (err) {
    if (tmp) fs.unlink(tmp, () => {});
    console.error('[admin] backup download failed:', err);
    res.status(500).json({ success: false, error: 'Could not create a backup to download.' });
  }
});

// GET /api/admin/backups/:name — download one of the stored backups.
adminRouter.get('/backups/:name', (req: Request, res: Response) => {
  const file = resolveBackupFile(String(req.params.name));
  if (!file) return res.status(404).json({ success: false, error: 'Backup not found.' });
  res.download(file);
});
