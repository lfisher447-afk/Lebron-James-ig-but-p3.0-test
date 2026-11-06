import {
  getAllTracks,
  saveTracksBatch,
  getAllPlaylists,
  savePlaylist,
  getStoredSettings,
  saveStoredSettings,
  getAllEqPresets,
  saveEqPreset,
  getPlayHistory,
  getPendingSyncOperations,
  removeSyncOperations,
  onDBChange,
} from './db';
import { Track, Playlist, AppSettings } from '../types';
import { EQPresetDef } from './eqConfig';

export interface CloudSyncStatus {
  isSyncing: boolean;
  isOnline: boolean;
  vaultCode: string | null;
  lastSyncedAt: number | null;
  lastError: string | null;
  pendingCount: number;
  remoteVersion: number;
}

type SyncStatusListener = (status: CloudSyncStatus) => void;

class CloudSyncManager {
  private vaultCode: string | null = null;
  private isSyncing = false;
  private lastSyncedAt: number | null = null;
  private lastError: string | null = null;
  private remoteVersion = 0;
  private listeners: Set<SyncStatusListener> = new Set();
  private autoSyncTimer: any = null;
  private debounceTimer: any = null;

  constructor() {
    // Restore vault code from local storage
    try {
      this.vaultCode = localStorage.getItem('spotui_cloud_vault_code') || null;
      const lastSync = localStorage.getItem('spotui_cloud_last_synced');
      if (lastSync) this.lastSyncedAt = parseInt(lastSync, 10);
    } catch {}

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyStatus();
        this.syncNow();
      });
      window.addEventListener('offline', () => {
        this.notifyStatus();
      });

      // Listen to DB changes and trigger debounced sync if vault code active
      onDBChange((event) => {
        if (event !== 'sync-queue-changed' && this.vaultCode) {
          this.triggerDebouncedSync();
        }
      });

      // Auto periodic background sync every 90 seconds
      this.autoSyncTimer = setInterval(() => {
        if (this.vaultCode && navigator.onLine && !this.isSyncing) {
          this.syncNow(false);
        }
      }, 90000);
    }
  }

  public subscribe(listener: SyncStatusListener) {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyStatus() {
    const status = this.getStatus();
    this.listeners.forEach((fn) => {
      try {
        fn(status);
      } catch (e) {
        console.warn('[Sync Listener Error]:', e);
      }
    });
  }

  public getStatus(): CloudSyncStatus {
    return {
      isSyncing: this.isSyncing,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      vaultCode: this.vaultCode,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      pendingCount: 0,
      remoteVersion: this.remoteVersion,
    };
  }

  public getVaultCode(): string | null {
    return this.vaultCode;
  }

  public setVaultCode(code: string | null) {
    this.vaultCode = code ? code.trim().toUpperCase() : null;
    try {
      if (this.vaultCode) {
        localStorage.setItem('spotui_cloud_vault_code', this.vaultCode);
      } else {
        localStorage.removeItem('spotui_cloud_vault_code');
      }
    } catch {}
    this.notifyStatus();
    if (this.vaultCode) {
      this.syncNow();
    }
  }

  public async createNewVault(): Promise<string> {
    this.isSyncing = true;
    this.lastError = null;
    this.notifyStatus();

    try {
      const [tracks, playlists, settings, eqPresets, history] = await Promise.all([
        getAllTracks(),
        getAllPlaylists(),
        getStoredSettings(),
        getAllEqPresets(),
        getPlayHistory(50),
      ]);

      const res = await fetch('/api/sync/vault/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracks: tracks.map((t) => ({ ...t, blob: null })),
          playlists,
          settings,
          eqPresets,
          history,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create cloud vault');
      }

      const data = await res.json();
      this.vaultCode = data.code;
      this.remoteVersion = data.version || 1;
      this.lastSyncedAt = Date.now();
      try {
        localStorage.setItem('spotui_cloud_vault_code', data.code);
        localStorage.setItem('spotui_cloud_last_synced', this.lastSyncedAt.toString());
      } catch {}

      return data.code;
    } catch (err: any) {
      this.lastError = err.message || 'Creation error';
      throw err;
    } finally {
      this.isSyncing = false;
      this.notifyStatus();
    }
  }

  public triggerDebouncedSync() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.syncNow(false);
    }, 4000);
  }

  public async syncNow(notify = true): Promise<boolean> {
    if (!this.vaultCode || this.isSyncing || !navigator.onLine) return false;

    this.isSyncing = true;
    if (notify) this.notifyStatus();

    try {
      // 1. Gather pending changes & local data
      const [localTracks, localPlaylists, localSettings, localPresets, localHistory, pendingQueue] = await Promise.all([
        getAllTracks(),
        getAllPlaylists(),
        getStoredSettings(),
        getAllEqPresets(),
        getPlayHistory(40),
        getPendingSyncOperations(),
      ]);

      // 2. Push local state to cloud vault
      const pushRes = await fetch('/api/sync/vault/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: this.vaultCode,
          tracks: localTracks.map((t) => ({ ...t, blob: null })),
          playlists: localPlaylists,
          settings: localSettings,
          eqPresets: localPresets,
          history: localHistory,
        }),
      });

      if (!pushRes.ok) {
        const errJson = await pushRes.json().catch(() => ({}));
        throw new Error(errJson.error || `Push failed: ${pushRes.statusText}`);
      }

      const pushData = await pushRes.json();
      this.remoteVersion = pushData.version || this.remoteVersion + 1;

      // 3. Clear flushed offline operations
      if (pendingQueue.length > 0) {
        await removeSyncOperations(pendingQueue.map((q) => q.id));
      }

      // 4. Pull down complete updated snapshot for multi-device sync
      const pullRes = await fetch(`/api/sync/vault/pull?code=${encodeURIComponent(this.vaultCode)}`);
      if (pullRes.ok) {
        const cloudData = await pullRes.json();
        // Merge cloud tracks into local db
        if (Array.isArray(cloudData.tracks) && cloudData.tracks.length > 0) {
          const localMap = new Map(localTracks.map((t) => [t.id, t]));
          const toAdd: Track[] = [];
          cloudData.tracks.forEach((ct: Track) => {
            if (!localMap.has(ct.id)) {
              toAdd.push(ct);
            }
          });
          if (toAdd.length > 0) {
            await saveTracksBatch(toAdd);
          }
        }

        // Merge cloud playlists
        if (Array.isArray(cloudData.playlists)) {
          for (const cp of cloudData.playlists) {
            await savePlaylist(cp);
          }
        }

        // Merge cloud custom EQ presets
        if (Array.isArray(cloudData.eqPresets)) {
          for (const ep of cloudData.eqPresets) {
            await saveEqPreset(ep);
          }
        }
      }

      this.lastSyncedAt = Date.now();
      this.lastError = null;
      try {
        localStorage.setItem('spotui_cloud_last_synced', this.lastSyncedAt.toString());
      } catch {}

      return true;
    } catch (err: any) {
      console.warn('[Cloud Sync Error]:', err);
      this.lastError = err.message || 'Sync error occurred';
      return false;
    } finally {
      this.isSyncing = false;
      this.notifyStatus();
    }
  }
}

export const cloudSync = new CloudSyncManager();
