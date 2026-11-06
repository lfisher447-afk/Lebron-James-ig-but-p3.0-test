import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export interface CloudVaultData {
  code: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  deviceCount: number;
  tracks: any[];
  playlists: any[];
  settings: any;
  eqPresets: any[];
  history: any[];
}

const VAULT_STORAGE_FILE = path.join(process.cwd(), '.cloud_vaults_db.json');

// In-memory cache of sync vaults
const vaults = new Map<string, CloudVaultData>();

// Load persisted vaults on boot if present
try {
  if (fs.existsSync(VAULT_STORAGE_FILE)) {
    const raw = fs.readFileSync(VAULT_STORAGE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([code, data]) => {
        vaults.set(code, data as CloudVaultData);
      });
      console.log(`[Cloud Sync Server] Loaded ${vaults.size} vaults from storage.`);
    }
  }
} catch (e) {
  console.warn('[Cloud Sync Server] Notice loading vaults:', e);
}

function persistVaultsToDisk() {
  try {
    const obj: Record<string, CloudVaultData> = {};
    vaults.forEach((v, k) => {
      obj[k] = v;
    });
    fs.writeFileSync(VAULT_STORAGE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Cloud Sync Server] Failed to persist vaults to disk:', err);
  }
}

function normalizeVaultCode(raw: string): string {
  if (!raw) return '';
  return raw.trim().toUpperCase().replace(/[\s_]/g, '-');
}

export function findVaultByCode(code: string): CloudVaultData | undefined {
  if (!code) return undefined;
  const normalized = normalizeVaultCode(code);
  const direct = vaults.get(normalized);
  if (direct) return direct;

  const stripped = normalized.replace(/[^A-Z0-9]/g, '');
  for (const [k, v] of vaults.entries()) {
    if (k.replace(/[^A-Z0-9]/g, '') === stripped) {
      return v;
    }
  }
  return undefined;
}

function generateVaultCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let segment1 = '';
  let segment2 = '';
  for (let i = 0; i < 4; i++) {
    segment1 += chars.charAt(Math.floor(Math.random() * chars.length));
    segment2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SPOT-${segment1}-${segment2}`;
}

export const cloudSyncRouter = Router();

// Create a new Cloud Vault
cloudSyncRouter.post('/vault/create', (req: Request, res: Response) => {
  try {
    let code = req.body?.customCode ? req.body.customCode.trim().toUpperCase() : generateVaultCode();
    // Ensure uniqueness
    while (vaults.has(code) && !req.body?.customCode) {
      code = generateVaultCode();
    }

    const now = Date.now();
    const newVault: CloudVaultData = {
      code,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deviceCount: 1,
      tracks: Array.isArray(req.body?.tracks) ? req.body.tracks : [],
      playlists: Array.isArray(req.body?.playlists) ? req.body.playlists : [],
      settings: req.body?.settings || null,
      eqPresets: Array.isArray(req.body?.eqPresets) ? req.body.eqPresets : [],
      history: Array.isArray(req.body?.history) ? req.body.history : [],
    };

    vaults.set(code, newVault);
    persistVaultsToDisk();

    console.log(`[Cloud Sync Server] Created new vault: ${code}`);
    return res.json({
      success: true,
      code,
      version: newVault.version,
      createdAt: newVault.createdAt,
      updatedAt: newVault.updatedAt,
      trackCount: newVault.tracks.length,
      playlistCount: newVault.playlists.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to create vault' });
  }
});

// Push client changes to cloud vault
cloudSyncRouter.post('/vault/push', (req: Request, res: Response) => {
  try {
    const code = req.body?.code?.trim()?.toUpperCase();
    if (!code) {
      return res.status(400).json({ error: 'Vault code is required' });
    }

    const vault = findVaultByCode(code);
    const now = Date.now();

    if (!vault) {
      // Auto-create vault if pushing with specified code
      const newVault: CloudVaultData = {
        code,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deviceCount: 1,
        tracks: Array.isArray(req.body.tracks) ? req.body.tracks : [],
        playlists: Array.isArray(req.body.playlists) ? req.body.playlists : [],
        settings: req.body.settings || null,
        eqPresets: Array.isArray(req.body.eqPresets) ? req.body.eqPresets : [],
        history: Array.isArray(req.body.history) ? req.body.history : [],
      };
      vaults.set(code, newVault);
      persistVaultsToDisk();
      return res.json({
        success: true,
        code,
        version: 1,
        updatedAt: now,
        message: 'New cloud vault initialized',
      });
    }

    // Smart 3-way merge
    if (Array.isArray(req.body.tracks)) {
      const existingTrackMap = new Map<string, any>();
      vault.tracks.forEach((t) => existingTrackMap.set(t.id, t));
      req.body.tracks.forEach((t: any) => {
        if (!existingTrackMap.has(t.id) || (t.addedAt && t.addedAt >= (existingTrackMap.get(t.id)?.addedAt || 0))) {
          existingTrackMap.set(t.id, t);
        }
      });
      vault.tracks = Array.from(existingTrackMap.values());
    }

    if (Array.isArray(req.body.playlists)) {
      const existingPlMap = new Map<string, any>();
      vault.playlists.forEach((p) => existingPlMap.set(p.id, p));
      req.body.playlists.forEach((p: any) => {
        const existing = existingPlMap.get(p.id);
        if (!existing) {
          existingPlMap.set(p.id, p);
        } else {
          // Merge tracks without duplicates
          const mergedTrackIds = Array.from(new Set([...(existing.trackIds || []), ...(p.trackIds || [])]));
          existingPlMap.set(p.id, {
            ...existing,
            ...p,
            trackIds: mergedTrackIds,
            syncedAt: now,
          });
        }
      });
      vault.playlists = Array.from(existingPlMap.values());
    }

    if (req.body.settings) {
      vault.settings = { ...(vault.settings || {}), ...req.body.settings };
    }

    if (Array.isArray(req.body.eqPresets)) {
      const presetMap = new Map<string, any>();
      vault.eqPresets.forEach((ep) => presetMap.set(ep.id || ep.name, ep));
      req.body.eqPresets.forEach((ep: any) => presetMap.set(ep.id || ep.name, ep));
      vault.eqPresets = Array.from(presetMap.values());
    }

    if (Array.isArray(req.body.history)) {
      const histMap = new Map<string, any>();
      vault.history.forEach((h) => histMap.set(`${h.trackId}_${h.playedAt}`, h));
      req.body.history.forEach((h: any) => histMap.set(`${h.trackId}_${h.playedAt}`, h));
      vault.history = Array.from(histMap.values())
        .sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0))
        .slice(0, 200);
    }

    vault.version += 1;
    vault.updatedAt = now;
    vault.deviceCount = Math.max(vault.deviceCount, (req.body.deviceCount || 1));

    persistVaultsToDisk();

    console.log(`[Cloud Sync Server] Synced vault ${code} (v${vault.version}), tracks: ${vault.tracks.length}, playlists: ${vault.playlists.length}`);

    return res.json({
      success: true,
      code: vault.code,
      version: vault.version,
      updatedAt: vault.updatedAt,
      trackCount: vault.tracks.length,
      playlistCount: vault.playlists.length,
      presetCount: vault.eqPresets.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to sync vault' });
  }
});

// Pull snapshot from cloud vault
cloudSyncRouter.get('/vault/pull', (req: Request, res: Response) => {
  try {
    const code = (req.query.code as string)?.trim()?.toUpperCase();
    if (!code) {
      return res.status(400).json({ error: 'Vault code is required' });
    }

    const vault = findVaultByCode(code);
    if (!vault) {
      return res.status(404).json({ error: 'Cloud Vault not found. Check your sync code.' });
    }

    return res.json({
      success: true,
      code: vault.code,
      version: vault.version,
      createdAt: vault.createdAt,
      updatedAt: vault.updatedAt,
      deviceCount: vault.deviceCount,
      tracks: vault.tracks,
      playlists: vault.playlists,
      settings: vault.settings,
      eqPresets: vault.eqPresets,
      history: vault.history,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to pull vault' });
  }
});

// Check status of a vault
cloudSyncRouter.get('/vault/status', (req: Request, res: Response) => {
  const code = (req.query.code as string)?.trim()?.toUpperCase();
  if (!code) {
    return res.status(400).json({ error: 'Vault code is required' });
  }

  const vault = findVaultByCode(code);
  if (!vault) {
    return res.json({
      exists: false,
      code,
    });
  }

  return res.json({
    exists: true,
    code: vault.code,
    version: vault.version,
    updatedAt: vault.updatedAt,
    trackCount: vault.tracks.length,
    playlistCount: vault.playlists.length,
    presetCount: vault.eqPresets.length,
    deviceCount: vault.deviceCount,
  });
});
