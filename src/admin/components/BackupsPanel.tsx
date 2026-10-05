import React, { useCallback, useEffect, useState } from 'react';
import { Database, Download, RefreshCw, AlertTriangle, CheckCircle2, HardDrive } from 'lucide-react';
import { api } from '../../services/api';
import { StorageStatus } from '../../types/admin';

const formatBytes = (n: number | null | undefined) =>
  n == null ? '—' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

const formatWhen = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never';

/**
 * Settings > Data & Backups. Not part of the settings form: nothing here is "saved" — it shows
 * the automatic backup schedule, lets an admin take or download a backup, and shows the
 * deploy-wipe check (when this server's data folder was first seen).
 */
export const BackupsPanel: React.FC = () => {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await api.getStorageStatus());
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Could not load backup status.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const backupNow = async () => {
    setWorking(true);
    setNotice(null);
    try {
      const b = await api.createBackupNow();
      setNotice(`Backup saved (${formatBytes(b.sizeBytes)}).`);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Backup failed.');
    } finally {
      setWorking(false);
    }
  };

  const backupsShareDataFolder = status && !status.customBackupDir;

  return (
    <div className="settings-card-section animate-fade-in">
      <div className="settings-card-header">
        <div className="header-icon-wrap icon-blue">
          <Database size={20} />
        </div>
        <div>
          <h3>Data Backups & Storage</h3>
          <p>Automatic database backups, on-demand copies to download, and a check that your host keeps the data folder between deploys.</p>
        </div>
      </div>

      <div className="settings-card-body">
        {error && (
          <div className="backup-alert backup-alert-error" role="alert">
            <AlertTriangle size={16} /> <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="backup-alert backup-alert-ok">
            <CheckCircle2 size={16} /> <span>{notice}</span>
          </div>
        )}

        <div className="backup-stats-grid">
          <div className="backup-stat">
            <small>Last backup</small>
            <strong>{status ? formatWhen(status.lastBackupAt) : '…'}</strong>
          </div>
          <div className="backup-stat">
            <small>Automatic schedule</small>
            <strong>{status ? `Every ${status.backupIntervalHours}h · keeps ${status.backupKeep}` : '…'}</strong>
          </div>
          <div className="backup-stat">
            <small>Database size</small>
            <strong>{status ? formatBytes(status.databaseSizeBytes) : '…'}</strong>
          </div>
          <div className="backup-stat">
            <small>Data folder first seen</small>
            <strong>{status ? formatWhen(status.dataDirFirstSeen) : '…'}</strong>
          </div>
        </div>

        <p className="backup-help">
          <HardDrive size={14} /> <span>If "Data folder first seen" changes to the time of your latest deploy, your host wiped the
          data folder on deploy — set <code>DB_PATH</code> and <code>BACKUP_DIR</code> in the server's environment to
          storage your host keeps between deploys.</span>
        </p>
        {backupsShareDataFolder && (
          <p className="backup-help backup-help-warn">
            <AlertTriangle size={14} /> <span>Backups are currently stored next to the database, so anything that deletes the
            database deletes them too. Download a copy regularly and keep it somewhere else.</span>
          </p>
        )}

        <div className="backup-actions">
          <button type="button" className="btn-save-settings-primary" onClick={backupNow} disabled={working}>
            <RefreshCw size={15} className={working ? 'spin' : ''} />
            <span>{working ? 'Backing up…' : 'Back up now'}</span>
          </button>
          <a className="btn-reset-settings" href={api.backupDownloadUrl()} download>
            <Download size={15} />
            <span>Download a fresh copy</span>
          </a>
        </div>

        <div className="backup-list">
          <div className="backup-list-head">Stored backups ({status?.backups.length ?? 0})</div>
          {status && status.backups.length === 0 && <div className="backup-list-empty">No backups yet.</div>}
          {status?.backups.map(b => (
            <div className="backup-row" key={b.name}>
              <span className="backup-row-when">{formatWhen(b.createdAt)}</span>
              <span className={`backup-kind backup-kind-${b.kind}`}>{b.kind === 'auto' ? 'Automatic' : b.kind === 'premigration' ? 'Before repair' : 'Manual'}</span>
              <span className="backup-row-size font-mono">{formatBytes(b.sizeBytes)}</span>
              <a className="backup-row-dl" href={api.backupDownloadUrl(b.name)} download>
                <Download size={14} /> Download
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
