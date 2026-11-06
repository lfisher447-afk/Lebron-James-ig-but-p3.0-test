import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Track, Playlist, AppSettings } from '../types';
import { EQPresetDef } from './eqConfig';

export interface CachedAudioRecord {
  id: string; // trackId
  blob: Blob;
  mimeType: string;
  size: number;
  cachedAt: number;
  lastAccessed: number;
  duration?: number;
}

export interface PlayHistoryRecord {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  artwork?: string;
  playedAt: number;
  completedRatio: number;
  duration: number;
}

export interface SyncQueueItem {
  id: string;
  action: 'UPSERT_TRACK' | 'DELETE_TRACK' | 'UPSERT_PLAYLIST' | 'DELETE_PLAYLIST' | 'SAVE_SETTINGS' | 'SAVE_EQ_PRESET';
  payload: any;
  queuedAt: number;
  status: 'pending' | 'syncing' | 'failed';
}

export interface DetailedStorageMetrics {
  totalUsageMB: string;
  quotaMB: string;
  percent: string;
  audioCacheMB: string;
  audioCacheCount: number;
  tracksCount: number;
  playlistsCount: number;
  presetsCount: number;
  historyCount: number;
}

interface SpotuiDB extends DBSchema {
  tracks: {
    key: string;
    value: Track;
    indexes: {
      'by-source': string;
      'by-added': number;
      'by-liked': string;
      'by-title': string;
    };
  };
  audio_blobs: {
    key: string;
    value: CachedAudioRecord;
    indexes: {
      'by-cached-at': number;
      'by-last-accessed': number;
      'by-size': number;
    };
  };
  playlists: {
    key: string;
    value: Playlist;
    indexes: {
      'by-created': number;
      'by-source': string;
    };
  };
  eq_presets: {
    key: string;
    value: EQPresetDef;
    indexes: {
      'by-band-count': number;
      'by-created': number;
    };
  };
  play_history: {
    key: string;
    value: PlayHistoryRecord;
    indexes: {
      'by-played-at': number;
      'by-track-id': string;
    };
  };
  cloud_sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-queued-at': number;
      'by-status': string;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'spotui-signal-room-v3';
const DB_VERSION = 2;

// In-Memory Tier for sandboxed/private/restricted iframe browsing
const inMemoryCache = {
  tracks: new Map<string, Track>(),
  playlists: new Map<string, Playlist>(),
  eq_presets: new Map<string, EQPresetDef>(),
  play_history: new Map<string, PlayHistoryRecord>(),
  settings: new Map<string, any>(),
  cloud_sync_queue: new Map<string, SyncQueueItem>(),
};

// Safe localStorage sync helper
function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`spotui_vault_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key: string, val: any): void {
  try {
    localStorage.setItem(`spotui_vault_${key}`, JSON.stringify(val));
  } catch {
    // Quota reached or private mode localStorage restricted
  }
}

// Populate in-memory cache from localStorage on startup
try {
  const initTracks = readLocalJson<Track[]>('tracks', []);
  initTracks.forEach((t) => inMemoryCache.tracks.set(t.id, t));

  const initPlaylists = readLocalJson<Playlist[]>('playlists', []);
  initPlaylists.forEach((p) => inMemoryCache.playlists.set(p.id, p));

  const initPresets = readLocalJson<EQPresetDef[]>('eq_presets', []);
  initPresets.forEach((pr) => inMemoryCache.eq_presets.set(pr.id || pr.name, pr));

  const initHistory = readLocalJson<PlayHistoryRecord[]>('play_history', []);
  initHistory.forEach((h) => inMemoryCache.play_history.set(h.id, h));

  const initQueue = readLocalJson<SyncQueueItem[]>('cloud_sync_queue', []);
  initQueue.forEach((q) => inMemoryCache.cloud_sync_queue.set(q.id, q));
} catch {}

let dbPromise: Promise<IDBPDatabase<SpotuiDB> | null> | null = null;
let isIndexedDBSupported = true;

// Reactive DB Event Emitter for instant UI re-renders
type DBEvent = 'tracks-changed' | 'playlists-changed' | 'audio-cached' | 'presets-changed' | 'history-changed' | 'sync-queue-changed';
type DBEventListener = (event: DBEvent, payload?: any) => void;
const listeners: Set<DBEventListener> = new Set();

export function onDBChange(listener: DBEventListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitDBChange(event: DBEvent, payload?: any) {
  listeners.forEach((fn) => {
    try {
      fn(event, payload);
    } catch (e) {
      console.warn('[DB Event Dispatch Error]:', e);
    }
  });
}

/**
 * Supercharged, Dedicated, Resilient IndexedDB Connection
 * Auto-reconnects, never hangs on rejected promises, and gracefully falls back to Memory/LocalStorage
 */
export async function getDB(): Promise<IDBPDatabase<SpotuiDB> | null> {
  if (!isIndexedDBSupported) return null;
  if (typeof indexedDB === 'undefined') {
    isIndexedDBSupported = false;
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB<SpotuiDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, tx) {
        // 1. Tracks Store
        if (!db.objectStoreNames.contains('tracks')) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
          trackStore.createIndex('by-source', 'source');
          trackStore.createIndex('by-added', 'addedAt');
          trackStore.createIndex('by-liked', 'liked');
          trackStore.createIndex('by-title', 'title');
        } else if (oldVersion < 2) {
          const trackStore = tx.objectStore('tracks');
          if (!trackStore.indexNames.contains('by-liked')) {
            trackStore.createIndex('by-liked', 'liked');
          }
          if (!trackStore.indexNames.contains('by-title')) {
            trackStore.createIndex('by-title', 'title');
          }
        }

        // 2. Audio Blobs (Dedicated Offline Binary Cache)
        if (!db.objectStoreNames.contains('audio_blobs')) {
          const audioStore = db.createObjectStore('audio_blobs', { keyPath: 'id' });
          audioStore.createIndex('by-cached-at', 'cachedAt');
          audioStore.createIndex('by-last-accessed', 'lastAccessed');
          audioStore.createIndex('by-size', 'size');
        }

        // 3. Playlists Store
        if (!db.objectStoreNames.contains('playlists')) {
          const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
          playlistStore.createIndex('by-created', 'createdAt');
          playlistStore.createIndex('by-source', 'source');
        }

        // 4. Dedicated EQ Presets Store
        if (!db.objectStoreNames.contains('eq_presets')) {
          const eqStore = db.createObjectStore('eq_presets', { keyPath: 'id' });
          eqStore.createIndex('by-band-count', 'bandCount');
          eqStore.createIndex('by-created', 'createdAt');
        }

        // 5. Play History Store
        if (!db.objectStoreNames.contains('play_history')) {
          const historyStore = db.createObjectStore('play_history', { keyPath: 'id' });
          historyStore.createIndex('by-played-at', 'playedAt');
          historyStore.createIndex('by-track-id', 'trackId');
        }

        // 6. Cloud Sync Queue Store (Offline Outbox)
        if (!db.objectStoreNames.contains('cloud_sync_queue')) {
          const syncStore = db.createObjectStore('cloud_sync_queue', { keyPath: 'id' });
          syncStore.createIndex('by-queued-at', 'queuedAt');
          syncStore.createIndex('by-status', 'status');
        }

        // 7. Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
      blocked() {
        console.warn('[Spotui DB] Connection blocked by another tab/session');
      },
      blocking() {
        console.warn('[Spotui DB] Connection blocking an upgrade');
      },
      terminated() {
        console.warn('[Spotui DB] Connection terminated abnormally, will auto-reconnect');
        dbPromise = null;
      },
    }).catch((err) => {
      console.warn('[Spotui DB Engine] IndexedDB open error, falling back to Hybrid Sync Tier:', err?.message);
      dbPromise = null;
      return null;
    });
  }

  try {
    const db = await dbPromise;
    return db;
  } catch {
    dbPromise = null;
    return null;
  }
}

// ============================================================================
// TRACKS REPOSITORY (Ultra-Fast CRUD & Filtering)
// ============================================================================

export async function saveTrack(track: Track): Promise<void> {
  // Update in-memory & localStorage tier first for zero-latency UI
  inMemoryCache.tracks.set(track.id, track);
  writeLocalJson('tracks', Array.from(inMemoryCache.tracks.values()));

  try {
    const db = await getDB();
    if (db) {
      await db.put('tracks', track);
    }
  } catch (err) {
    console.warn('[saveTrack IDB notice]:', err);
  }
  emitDBChange('tracks-changed', { trackId: track.id, action: 'save' });
}

export async function saveTracksBatch(tracks: Track[]): Promise<void> {
  tracks.forEach((t) => inMemoryCache.tracks.set(t.id, t));
  writeLocalJson('tracks', Array.from(inMemoryCache.tracks.values()));

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction('tracks', 'readwrite');
      for (const track of tracks) {
        await tx.store.put(track);
      }
      await tx.done;
    }
  } catch (err) {
    console.warn('[saveTracksBatch IDB notice]:', err);
  }
  emitDBChange('tracks-changed', { count: tracks.length, action: 'batch-save' });
}

export async function getTrack(id: string): Promise<Track | undefined> {
  try {
    const db = await getDB();
    if (db) {
      const t = await db.get('tracks', id);
      if (t) return t;
    }
  } catch {}
  return inMemoryCache.tracks.get(id);
}

export async function getAllTracks(): Promise<Track[]> {
  try {
    const db = await getDB();
    if (db) {
      const tracks = await db.getAll('tracks');
      if (tracks && tracks.length > 0) {
        // Sync to memory cache
        tracks.forEach((t) => inMemoryCache.tracks.set(t.id, t));
        return tracks.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      }
    }
  } catch (err) {
    console.warn('[getAllTracks IDB fallback]:', err);
  }
  return Array.from(inMemoryCache.tracks.values()).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

export async function deleteTrack(id: string): Promise<void> {
  inMemoryCache.tracks.delete(id);
  writeLocalJson('tracks', Array.from(inMemoryCache.tracks.values()));

  try {
    const db = await getDB();
    if (db) {
      await db.delete('tracks', id);
      try {
        await db.delete('audio_blobs', id);
      } catch {}
    }
  } catch (err) {
    console.warn('[deleteTrack IDB notice]:', err);
  }
  emitDBChange('tracks-changed', { trackId: id, action: 'delete' });
}

export async function toggleTrackLiked(id: string): Promise<boolean> {
  const track = await getTrack(id);
  if (!track) return false;
  track.liked = !track.liked;
  await saveTrack(track);
  return track.liked;
}

export async function getLikedTracks(): Promise<Track[]> {
  const all = await getAllTracks();
  return all.filter((t) => Boolean(t.liked));
}

// ============================================================================
// AUDIO BLOBS REPOSITORY (Dedicated Offline Binary Audio Cache)
// ============================================================================

export async function cacheAudioBlob(
  trackId: string,
  blob: Blob,
  mimeType = 'audio/mpeg',
  duration?: number
): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;

    const record: CachedAudioRecord = {
      id: trackId,
      blob,
      mimeType,
      size: blob.size,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
      duration,
    };

    await db.put('audio_blobs', record);
    emitDBChange('audio-cached', { trackId, size: blob.size });
  } catch (err) {
    console.warn('[cacheAudioBlob quota/storage notice]:', err);
  }
}

export async function getCachedAudioBlob(trackId: string): Promise<CachedAudioRecord | undefined> {
  try {
    const db = await getDB();
    if (!db) return undefined;
    const record = await db.get('audio_blobs', trackId);
    if (record) {
      record.lastAccessed = Date.now();
      db.put('audio_blobs', record).catch(() => {});
      return record;
    }
  } catch (err) {
    console.warn('[getCachedAudioBlob notice]:', err);
  }
  return undefined;
}

export async function deleteCachedAudioBlob(trackId: string): Promise<void> {
  try {
    const db = await getDB();
    if (db) {
      await db.delete('audio_blobs', trackId);
      emitDBChange('audio-cached', { trackId, action: 'deleted' });
    }
  } catch {}
}

export async function clearAudioCache(): Promise<number> {
  try {
    const db = await getDB();
    if (db) {
      const count = await db.count('audio_blobs');
      await db.clear('audio_blobs');
      emitDBChange('audio-cached', { action: 'cleared', count });
      return count;
    }
  } catch {}
  return 0;
}

export const clearAllCachedAudio = clearAudioCache;

// ============================================================================
// PLAYLISTS REPOSITORY
// ============================================================================

export async function savePlaylist(playlist: Playlist): Promise<void> {
  inMemoryCache.playlists.set(playlist.id, playlist);
  writeLocalJson('playlists', Array.from(inMemoryCache.playlists.values()));

  try {
    const db = await getDB();
    if (db) {
      await db.put('playlists', playlist);
    }
  } catch (err) {
    console.warn('[savePlaylist IDB notice]:', err);
  }
  emitDBChange('playlists-changed', { playlistId: playlist.id });
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  try {
    const db = await getDB();
    if (db) {
      const pls = await db.getAll('playlists');
      if (pls && pls.length > 0) {
        pls.forEach((p) => inMemoryCache.playlists.set(p.id, p));
        return pls.sort((a, b) => b.createdAt - a.createdAt);
      }
    }
  } catch {}
  return Array.from(inMemoryCache.playlists.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deletePlaylist(id: string): Promise<void> {
  inMemoryCache.playlists.delete(id);
  writeLocalJson('playlists', Array.from(inMemoryCache.playlists.values()));

  try {
    const db = await getDB();
    if (db) {
      await db.delete('playlists', id);
    }
  } catch {}
  emitDBChange('playlists-changed', { playlistId: id, action: 'delete' });
}

// ============================================================================
// DEDICATED EQ PRESETS REPOSITORY (Custom Curves & Hardware Profiles)
// ============================================================================

export async function saveEqPreset(preset: EQPresetDef): Promise<void> {
  const now = Date.now();
  const record: EQPresetDef = {
    ...preset,
    id: preset.id || `eq_custom_${now}`,
    isCustom: true,
    createdAt: preset.createdAt || now,
  };

  inMemoryCache.eq_presets.set(record.id!, record);
  writeLocalJson('eq_presets', Array.from(inMemoryCache.eq_presets.values()));

  try {
    const db = await getDB();
    if (db) {
      await db.put('eq_presets', record);
    }
  } catch (err) {
    console.warn('[saveEqPreset IDB notice]:', err);
  }
  emitDBChange('presets-changed', { presetId: record.id });
}

export async function getAllEqPresets(): Promise<EQPresetDef[]> {
  try {
    const db = await getDB();
    if (db) {
      const presets = await db.getAll('eq_presets');
      if (presets && presets.length > 0) {
        presets.forEach((p) => inMemoryCache.eq_presets.set(p.id || p.name, p));
        return presets;
      }
    }
  } catch {}
  return Array.from(inMemoryCache.eq_presets.values());
}

export async function deleteEqPreset(id: string): Promise<void> {
  inMemoryCache.eq_presets.delete(id);
  writeLocalJson('eq_presets', Array.from(inMemoryCache.eq_presets.values()));

  try {
    const db = await getDB();
    if (db) {
      await db.delete('eq_presets', id);
    }
  } catch {}
  emitDBChange('presets-changed', { presetId: id, action: 'delete' });
}

// ============================================================================
// PLAY HISTORY REPOSITORY
// ============================================================================

export async function recordPlayHistory(track: Track, completedRatio = 1.0): Promise<void> {
  try {
    const now = Date.now();
    const id = `hist_${now}_${track.id}`;
    const record: PlayHistoryRecord = {
      id,
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      playedAt: now,
      completedRatio: Math.max(0, Math.min(1, completedRatio)),
      duration: track.duration,
    };

    inMemoryCache.play_history.set(id, record);
    writeLocalJson('play_history', Array.from(inMemoryCache.play_history.values()).slice(-200));

    const db = await getDB();
    if (db) {
      await db.put('play_history', record);
    }
    emitDBChange('history-changed', { id });
  } catch (err) {
    console.warn('[recordPlayHistory notice]:', err);
  }
}

export async function getPlayHistory(limit = 100): Promise<PlayHistoryRecord[]> {
  try {
    const db = await getDB();
    if (db) {
      const all = await db.getAllFromIndex('play_history', 'by-played-at');
      if (all && all.length > 0) {
        return all.reverse().slice(0, limit);
      }
    }
  } catch {}
  return Array.from(inMemoryCache.play_history.values())
    .sort((a, b) => b.playedAt - a.playedAt)
    .slice(0, limit);
}

export async function clearPlayHistory(): Promise<void> {
  inMemoryCache.play_history.clear();
  writeLocalJson('play_history', []);

  try {
    const db = await getDB();
    if (db) {
      await db.clear('play_history');
    }
  } catch {}
  emitDBChange('history-changed', { action: 'cleared' });
}

// ============================================================================
// SETTINGS REPOSITORY
// ============================================================================

export async function getStoredSettings(): Promise<Partial<AppSettings> | null> {
  try {
    const db = await getDB();
    if (db) {
      const s = await db.get('settings', 'app_config');
      if (s) return s;
    }
  } catch {}

  try {
    const raw = localStorage.getItem('spotui_settings_v3');
    if (raw) return JSON.parse(raw);
  } catch {}

  return inMemoryCache.settings.get('app_config') || null;
}

export async function saveStoredSettings(settings: AppSettings): Promise<void> {
  inMemoryCache.settings.set('app_config', settings);
  try {
    localStorage.setItem('spotui_settings_v3', JSON.stringify(settings));
  } catch {}

  try {
    const db = await getDB();
    if (db) {
      await db.put('settings', settings, 'app_config');
    }
  } catch {}
}

export async function getStoredValue<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    if (db) {
      const val = await db.get('settings', key);
      if (val !== undefined) return val;
    }
  } catch {}

  try {
    const raw = localStorage.getItem(`spotui_${key}`);
    if (raw) return JSON.parse(raw);
  } catch {}

  return inMemoryCache.settings.get(key) ?? null;
}

export async function saveStoredValue(key: string, value: any): Promise<void> {
  inMemoryCache.settings.set(key, value);
  try {
    localStorage.setItem(`spotui_${key}`, JSON.stringify(value));
  } catch {}

  try {
    const db = await getDB();
    if (db) {
      await db.put('settings', value, key);
    }
  } catch {}
}

// ============================================================================
// CLOUD SYNC QUEUE (Offline Outbox)
// ============================================================================

export async function enqueueSyncOperation(action: SyncQueueItem['action'], payload: any): Promise<string> {
  const id = `sync_op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: SyncQueueItem = {
    id,
    action,
    payload,
    queuedAt: Date.now(),
    status: 'pending',
  };

  inMemoryCache.cloud_sync_queue.set(id, item);
  writeLocalJson('cloud_sync_queue', Array.from(inMemoryCache.cloud_sync_queue.values()));

  try {
    const db = await getDB();
    if (db) {
      await db.put('cloud_sync_queue', item);
    }
  } catch {}
  emitDBChange('sync-queue-changed', { id });
  return id;
}

export async function getPendingSyncOperations(): Promise<SyncQueueItem[]> {
  try {
    const db = await getDB();
    if (db) {
      const items = await db.getAllFromIndex('cloud_sync_queue', 'by-queued-at');
      if (items && items.length > 0) return items;
    }
  } catch {}
  return Array.from(inMemoryCache.cloud_sync_queue.values()).sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function removeSyncOperations(ids: string[]): Promise<void> {
  ids.forEach((id) => inMemoryCache.cloud_sync_queue.delete(id));
  writeLocalJson('cloud_sync_queue', Array.from(inMemoryCache.cloud_sync_queue.values()));

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction('cloud_sync_queue', 'readwrite');
      for (const id of ids) {
        await tx.store.delete(id);
      }
      await tx.done;
    }
  } catch {}
  emitDBChange('sync-queue-changed', { removedCount: ids.length });
}

// ============================================================================
// VAULT EXPORT, IMPORT & DETAILED METRICS
// ============================================================================

export async function exportFullVault(includeAudioBlobs = false): Promise<string> {
  const tracks = await getAllTracks();
  const playlists = await getAllPlaylists();
  const settings = await getStoredSettings();
  const eqPresets = await getAllEqPresets();
  const history = await getPlayHistory(100);

  const exportData: any = {
    version: 'spotui-vault-v4',
    timestamp: Date.now(),
    app: 'Spotui Studio Audio Platform',
    tracks: tracks.map((t) => ({ ...t, blob: null })),
    playlists,
    settings,
    eqPresets,
    history,
  };

  if (includeAudioBlobs) {
    try {
      const db = await getDB();
      if (db) {
        const blobs = await db.getAll('audio_blobs');
        exportData.audioBlobsMeta = blobs.map((b) => ({
          id: b.id,
          size: b.size,
          mimeType: b.mimeType,
          cachedAt: b.cachedAt,
        }));
      }
    } catch {}
  }

  return JSON.stringify(exportData, null, 2);
}

export async function importFullVault(jsonString: string): Promise<{
  tracksImported: number;
  playlistsImported: number;
  presetsImported: number;
}> {
  const data = JSON.parse(jsonString);
  let tracksImported = 0;
  let playlistsImported = 0;
  let presetsImported = 0;

  if (Array.isArray(data.tracks) && data.tracks.length > 0) {
    await saveTracksBatch(data.tracks);
    tracksImported = data.tracks.length;
  }

  if (Array.isArray(data.playlists) && data.playlists.length > 0) {
    for (const pl of data.playlists) {
      await savePlaylist(pl);
      playlistsImported++;
    }
  }

  if (Array.isArray(data.eqPresets) && data.eqPresets.length > 0) {
    for (const pr of data.eqPresets) {
      await saveEqPreset(pr);
      presetsImported++;
    }
  }

  if (data.settings) {
    await saveStoredSettings(data.settings);
  }

  return { tracksImported, playlistsImported, presetsImported };
}

export async function getStorageMetrics(): Promise<DetailedStorageMetrics> {
  let tracksCount = inMemoryCache.tracks.size;
  let playlistsCount = inMemoryCache.playlists.size;
  let presetsCount = inMemoryCache.eq_presets.size;
  let historyCount = inMemoryCache.play_history.size;
  let audioCacheCount = 0;
  let audioCacheBytes = 0;

  try {
    const db = await getDB();
    if (db) {
      const [tCount, pCount, eqCount, hCount, aCount] = await Promise.all([
        db.count('tracks'),
        db.count('playlists'),
        db.count('eq_presets'),
        db.count('play_history'),
        db.count('audio_blobs'),
      ]);
      tracksCount = tCount;
      playlistsCount = pCount;
      presetsCount = eqCount;
      historyCount = hCount;
      audioCacheCount = aCount;

      const audioRecords = await db.getAll('audio_blobs');
      audioCacheBytes = audioRecords.reduce((sum, r) => sum + (r.size || 0), 0);
    }
  } catch {}

  let totalUsage = audioCacheBytes;
  let quota = 0;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      totalUsage = estimate.usage || totalUsage;
      quota = estimate.quota || 0;
    } catch {}
  }

  const usageMB = (totalUsage / (1024 * 1024)).toFixed(2);
  const quotaMB = quota ? (quota / (1024 * 1024)).toFixed(2) : '5000.00';
  const percent = quota ? ((totalUsage / quota) * 100).toFixed(1) : '0';
  const audioCacheMB = (audioCacheBytes / (1024 * 1024)).toFixed(2);

  return {
    totalUsageMB: usageMB,
    quotaMB,
    percent,
    audioCacheMB,
    audioCacheCount,
    tracksCount,
    playlistsCount,
    presetsCount,
    historyCount,
  };
}
