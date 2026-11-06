import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Music2,
  Youtube,
  CheckCircle2,
  ListMusic,
  ArrowRight,
  Plus,
  Search,
  Check,
  Cloud,
  CloudLightning,
  Copy,
  Laptop,
  Smartphone,
  Shield,
  Upload,
  Download,
  AlertCircle,
  Database,
} from 'lucide-react';
import { saveTracksBatch, savePlaylist, getAllTracks, getAllPlaylists } from '../lib/db';
import { Track, Playlist } from '../types';
import { cloudSync, CloudSyncStatus } from '../lib/cloudSync';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
  isSpotifyConnected?: boolean;
  onConnectSpotify?: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [modalTab, setModalTab] = useState<'cloud_sync' | 'url_import' | 'backup_export'>('cloud_sync');

  // Cloud Sync State
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(cloudSync.getStatus());
  const [pairCodeInput, setPairCodeInput] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Backup & Restore file input ref
  const backupInputRef = React.useRef<HTMLInputElement>(null);

  // URL Import State
  const [sourceType, setSourceType] = useState<'spotify' | 'youtube'>('spotify');
  const [urlInput, setUrlInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportBackup = async () => {
    try {
      const tracks = await getAllTracks();
      const playlists = await getAllPlaylists();
      const backupData = {
        app: 'spotui-vault',
        version: '4.0',
        exportedAt: new Date().toISOString(),
        tracksCount: tracks.length,
        playlistsCount: playlists.length,
        tracks: tracks.map((t) => ({ ...t, blob: null })),
        playlists,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spotui-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSyncSuccessMsg(`Exported ${tracks.length} tracks & ${playlists.length} playlists to offline backup!`);
      setTimeout(() => setSyncSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to export backup');
    }
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        if (!data || !Array.isArray(data.tracks)) {
          throw new Error('Invalid Spotui backup format: missing tracks list');
        }

        if (data.tracks.length > 0) {
          await saveTracksBatch(data.tracks);
        }

        if (Array.isArray(data.playlists)) {
          for (const pl of data.playlists) {
            await savePlaylist(pl);
          }
        }

        setSyncSuccessMsg(`Restored ${data.tracks.length} tracks & ${data.playlists?.length || 0} playlists!`);
        setTimeout(() => setSyncSuccessMsg(null), 3500);
        onSyncComplete();
      } catch (err: any) {
        setError(err.message || 'Failed to restore backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const [resolvedCollection, setResolvedCollection] = useState<{
    name: string;
    source: 'spotify' | 'youtube';
    tracks: Track[];
  } | null>(null);

  const [selectedTracks, setSelectedTracks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    const unsub = cloudSync.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  // Cloud Sync Handlers
  const handleGenerateVault = async () => {
    try {
      setPairError(null);
      await cloudSync.createNewVault();
      setSyncSuccessMsg('Created new encrypted Cloud Vault!');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
      onSyncComplete();
    } catch (err: any) {
      setPairError(err.message || 'Failed to initialize vault');
    }
  };

  const handlePairVault = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = pairCodeInput.trim().toUpperCase();
    if (!code) return;

    setIsPairing(true);
    setPairError(null);
    try {
      const res = await fetch(`/api/sync/vault/status?code=${encodeURIComponent(code)}`);
      if (!res.ok) throw new Error('Cloud server unreachable');
      const data = await res.json();
      if (!data.exists) {
        throw new Error('Vault code not found. Check the code and try again.');
      }

      cloudSync.setVaultCode(code);
      setSyncSuccessMsg(`Connected to Cloud Vault ${code}!`);
      setPairCodeInput('');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
      onSyncComplete();
    } catch (err: any) {
      setPairError(err.message || 'Pairing error');
    } finally {
      setIsPairing(false);
    }
  };

  const handleSyncNow = async () => {
    setPairError(null);
    const success = await cloudSync.syncNow(true);
    if (success) {
      setSyncSuccessMsg('Cloud Vault synchronized successfully!');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
      onSyncComplete();
    } else {
      setPairError('Sync failed. Check your network connection.');
    }
  };

  const handleCopyCode = () => {
    if (syncStatus.vaultCode) {
      navigator.clipboard.writeText(syncStatus.vaultCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleDisconnectVault = () => {
    cloudSync.setVaultCode(null);
  };

  // URL Import Handlers
  const handleResolve = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setIsResolving(true);
    setError(null);
    setResolvedCollection(null);

    try {
      if (sourceType === 'spotify') {
        const res = await fetch(`/api/spotify/resolve-playlist?url=${encodeURIComponent(urlInput.trim())}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || 'Failed to resolve Spotify link');
        }
        const data = await res.json();
        const tracks: Track[] = (data.tracks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          album: data.name || 'Spotify Playlist',
          duration: t.duration || 210,
          durationText: t.durationText || '3:30',
          artwork: t.artwork || data.coverArt,
          source: 'spotify' as const,
          addedAt: Date.now(),
          streamUrl: t.audioPreview || `/api/audio/stream?id=${t.id}`,
        }));

        setResolvedCollection({
          name: data.name || 'Spotify Collection',
          source: 'spotify',
          tracks,
        });

        const initialSelected: Record<string, boolean> = {};
        tracks.forEach((t) => (initialSelected[t.id] = true));
        setSelectedTracks(initialSelected);
      } else {
        const res = await fetch(`/api/innertube/search?q=${encodeURIComponent(urlInput.trim())}`);
        if (!res.ok) throw new Error('Failed to query YouTube');
        const data = await res.json();
        const rawResults = Array.isArray(data) ? data : (data.results || []);
        const tracks: Track[] = rawResults.map((v: any) => ({
          id: v.id,
          title: v.title,
          artist: v.artist,
          album: 'YouTube Music',
          duration: v.duration || 210,
          durationText: v.durationText || '3:30',
          artwork: v.thumbnail,
          source: 'youtube' as const,
          addedAt: Date.now(),
          streamUrl: `/api/audio/stream?id=${v.id}`,
        }));

        setResolvedCollection({
          name: `YouTube: ${urlInput.trim()}`,
          source: 'youtube',
          tracks,
        });

        const initialSelected: Record<string, boolean> = {};
        tracks.forEach((t) => (initialSelected[t.id] = true));
        setSelectedTracks(initialSelected);
      }
    } catch (err: any) {
      setError(err.message || 'Error resolving playlist.');
    } finally {
      setIsResolving(false);
    }
  };

  const toggleTrack = (id: string) => {
    setSelectedTracks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAll = (select: boolean) => {
    if (!resolvedCollection) return;
    const next: Record<string, boolean> = {};
    resolvedCollection.tracks.forEach((t) => {
      next[t.id] = select;
    });
    setSelectedTracks(next);
  };

  const handleSaveToVault = async () => {
    if (!resolvedCollection) return;
    setIsSyncing(true);
    try {
      const tracksToSave = resolvedCollection.tracks.filter((t) => selectedTracks[t.id]);
      if (tracksToSave.length > 0) {
        await saveTracksBatch(tracksToSave);
        const playlist: Playlist = {
          id: `pl_${Date.now()}`,
          name: resolvedCollection.name,
          source: resolvedCollection.source,
          trackIds: tracksToSave.map((t) => t.id),
          createdAt: Date.now(),
          syncedAt: Date.now(),
        };
        await savePlaylist(playlist);
      }
      onSyncComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save to vault');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#07171b] border border-[#183d47] rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#14333b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#123841] to-[#0a1e23] border border-[#48e4ff]/40 flex items-center justify-center text-[#48e4ff] shadow-lg shadow-cyan-500/20">
              <CloudLightning size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Spotui Cloud Sync & Vault Deck</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#48e4ff] border border-cyan-500/30">
                  V4.0
                </span>
              </h2>
              <p className="text-xs text-[#789d9a]">
                Cross-device encrypted synchronization, peer pairing, and music catalog import
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#0c2227] text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-[#122e36]">
          <button
            onClick={() => setModalTab('cloud_sync')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              modalTab === 'cloud_sync'
                ? 'bg-[#48e4ff] text-[#051a20] shadow-md shadow-cyan-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-[#0c2227]'
            }`}
          >
            <Cloud size={14} />
            <span>Cross-Device Cloud Sync</span>
          </button>
          <button
            onClick={() => setModalTab('url_import')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              modalTab === 'url_import'
                ? 'bg-[#48e4ff] text-[#051a20] shadow-md shadow-cyan-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-[#0c2227]'
            }`}
          >
            <Music2 size={14} />
            <span>Import Link (Spotify / YouTube)</span>
          </button>
          <button
            onClick={() => setModalTab('backup_export')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              modalTab === 'backup_export'
                ? 'bg-[#48e4ff] text-[#051a20] shadow-md shadow-cyan-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-[#0c2227]'
            }`}
          >
            <Database size={14} />
            <span>Backup & Restore (.json)</span>
          </button>
        </div>

        {/* Notifications & Status Alerts */}
        {syncSuccessMsg && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{syncSuccessMsg}</span>
          </div>
        )}
        {(pairError || error) && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{pairError || error}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1">
          {modalTab === 'cloud_sync' ? (
            <div className="space-y-4">
              {/* Active Vault Card */}
              {syncStatus.vaultCode ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#081f25] to-[#041114] border border-cyan-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Active Cloud Vault Connected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSyncNow}
                        disabled={syncStatus.isSyncing}
                        className="px-3 py-1.5 rounded-xl bg-[#48e4ff] text-[#051a20] text-xs font-bold hover:bg-cyan-300 transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={13} className={syncStatus.isSyncing ? 'animate-spin' : ''} />
                        <span>{syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Vault Code Display & Copy */}
                  <div className="p-4 rounded-xl bg-[#030d10] border border-[#143740] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-[#789d9a] uppercase">Pairing Code</div>
                      <div className="text-xl font-mono font-bold text-[#48e4ff] tracking-widest mt-0.5">
                        {syncStatus.vaultCode}
                      </div>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-2 rounded-xl bg-[#0a2329] border border-[#1a4a56] text-xs text-[#789d9a] hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>

                  {/* Sync Metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-[#041216] border border-[#112f37]">
                      <div className="text-[10px] text-zinc-500">LAST SYNC</div>
                      <div className="text-zinc-200 mt-1 font-bold">
                        {syncStatus.lastSyncedAt
                          ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString()
                          : 'Just now'}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#041216] border border-[#112f37]">
                      <div className="text-[10px] text-zinc-500">CLOUD VERSION</div>
                      <div className="text-emerald-400 mt-1 font-bold">
                        v{syncStatus.remoteVersion || 1} (Live)
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#041216] border border-[#112f37] col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-zinc-500">SECURITY</div>
                      <div className="text-cyan-300 mt-1 font-bold flex items-center gap-1">
                        <Shield size={12} />
                        <span>AES-256 Vault</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#102d35]">
                    <span className="text-xs text-[#789d9a]">
                      Use this code to sync library with your phone, Chromebook, or home PC.
                    </span>
                    <button
                      onClick={handleDisconnectVault}
                      className="text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer"
                    >
                      Disconnect Vault
                    </button>
                  </div>
                </div>
              ) : (
                /* No Vault Connected: Create or Pair */
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#06181b] to-[#040f12] border border-[#173a44] space-y-3">
                    <div className="flex items-center gap-2">
                      <Cloud className="text-[#48e4ff]" size={18} />
                      <h3 className="text-sm font-bold text-white">Initialize New Cloud Vault</h3>
                    </div>
                    <p className="text-xs text-[#789d9a]">
                      Upload your tracks, playlists, EQ presets, and favorites to an encrypted cloud vault to sync across all your devices seamlessly.
                    </p>
                    <button
                      onClick={handleGenerateVault}
                      className="w-full py-2.5 rounded-xl bg-[#48e4ff] hover:bg-cyan-300 text-[#051a20] font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
                    >
                      <Plus size={16} />
                      <span>Generate Cloud Sync Vault Code</span>
                    </button>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-[#122e36] w-full" />
                    <span className="bg-[#07171b] px-3 text-[11px] font-mono text-zinc-500 uppercase">
                      OR PAIR EXISTING VAULT
                    </span>
                    <div className="border-t border-[#122e36] w-full" />
                  </div>

                  {/* Pair Existing Vault Code Form */}
                  <form onSubmit={handlePairVault} className="p-5 rounded-2xl bg-[#051316] border border-[#14353e] space-y-3">
                    <div className="flex items-center gap-2">
                      <Laptop className="text-emerald-400" size={18} />
                      <h3 className="text-sm font-bold text-white">Connect Device to Existing Vault</h3>
                    </div>
                    <p className="text-xs text-[#789d9a]">
                      Enter the 16-character Pairing Code from another device (e.g. <span className="font-mono text-zinc-300">SPOT-7K9A-3M2Q</span>) to download and sync your library.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="SPOT-XXXX-XXXX"
                        value={pairCodeInput}
                        onChange={(e) => setPairCodeInput(e.target.value.toUpperCase())}
                        className="flex-1 bg-[#020b0d] border border-[#19404a] rounded-xl px-3.5 py-2 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#48e4ff]"
                      />
                      <button
                        type="submit"
                        disabled={isPairing || !pairCodeInput.trim()}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isPairing ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        <span>Pair Vault</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : modalTab === 'url_import' ? (
            /* URL Import Tab (Spotify / YouTube) */
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-1 bg-[#051316] border border-[#13323a] rounded-xl">
                <button
                  type="button"
                  onClick={() => setSourceType('spotify')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    sourceType === 'spotify'
                      ? 'bg-emerald-500 text-black shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Music2 size={14} />
                  <span>Spotify Playlist</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('youtube')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    sourceType === 'youtube'
                      ? 'bg-rose-500 text-white shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Youtube size={14} />
                  <span>YouTube Music / Video</span>
                </button>
              </div>

              <form onSubmit={handleResolve} className="space-y-2">
                <label className="text-xs text-[#789d9a] font-medium block">
                  {sourceType === 'spotify' ? 'Paste Spotify URL (Playlist, Album, or Track)' : 'Enter YouTube Search Query or Video URL'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={
                      sourceType === 'spotify'
                        ? 'https://open.spotify.com/playlist/...'
                        : 'https://youtube.com/watch?v=... or song name'
                    }
                    className="flex-1 bg-[#030e10] border border-[#163a43] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#48e4ff]"
                  />
                  <button
                    type="submit"
                    disabled={isResolving || !urlInput.trim()}
                    className="px-4 py-2 bg-[#48e4ff] hover:bg-cyan-300 text-[#051a20] font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isResolving ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                    <span>Resolve</span>
                  </button>
                </div>
              </form>

              {resolvedCollection && (
                <div className="space-y-3 pt-2 border-t border-[#122e36]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{resolvedCollection.name}</h3>
                      <p className="text-xs text-[#789d9a]">
                        {resolvedCollection.tracks.length} tracks found
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => handleSelectAll(true)}
                        className="text-cyan-400 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-zinc-600">•</span>
                      <button
                        onClick={() => handleSelectAll(false)}
                        className="text-zinc-400 hover:underline cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {resolvedCollection.tracks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => toggleTrack(t.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                          selectedTracks[t.id]
                            ? 'bg-[#092228] border-cyan-500/40 text-white'
                            : 'bg-[#040e10] border-[#102d35] text-zinc-400 hover:bg-[#07191e]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedTracks[t.id])}
                            onChange={() => {}}
                            className="rounded accent-[#48e4ff]"
                          />
                          <div className="truncate">
                            <div className="text-xs font-bold truncate">{t.title}</div>
                            <div className="text-[10px] text-[#789d9a] truncate">{t.artist}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {t.durationText || '3:30'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSaveToVault}
                    disabled={isSyncing}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSyncing ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
                    <span>Save Selected to Local Vault</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Backup & Restore Tab */
            <div className="space-y-4">
              <input
                type="file"
                ref={backupInputRef}
                onChange={handleImportBackupFile}
                accept=".json"
                className="hidden"
              />

              <div className="p-5 rounded-2xl bg-[#06181b] border border-[#173a44] space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="text-[#48e4ff]" size={18} />
                  <h3 className="text-sm font-bold text-white">Download Offline Library Backup</h3>
                </div>
                <p className="text-xs text-[#789d9a] leading-relaxed">
                  Export all your tracks, custom playlists, and vault metadata into a portable JSON file. Keep it in Google Drive, USB drive, or transfer it to another computer without requiring network syncing.
                </p>
                <button
                  onClick={handleExportBackup}
                  className="w-full py-2.5 rounded-xl bg-[#48e4ff] hover:bg-cyan-300 text-[#051a20] font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  <Download size={15} />
                  <span>Download Offline Backup (.json)</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-[#051316] border border-[#14353e] space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="text-emerald-400" size={18} />
                  <h3 className="text-sm font-bold text-white">Restore from Backup File</h3>
                </div>
                <p className="text-xs text-[#789d9a] leading-relaxed">
                  Upload a previously saved <span className="font-mono text-zinc-300">.json</span> file to merge and restore your entire song library and playlists instantly into IndexedDB.
                </p>
                <button
                  onClick={() => backupInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Upload size={15} />
                  <span>Select JSON File to Restore</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#030d10] border border-[#112f37] flex items-center gap-3">
                <Shield className="text-[#48e4ff] shrink-0" size={18} />
                <div className="text-[11px] text-[#789d9a]">
                  <strong className="text-white">Privacy Guarantee:</strong> All backup generation and parsing runs 100% locally in your browser sandbox. No file data is uploaded to third-party analytics.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
