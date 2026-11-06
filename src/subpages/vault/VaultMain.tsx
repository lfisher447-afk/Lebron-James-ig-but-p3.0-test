import React, { useState, useRef } from 'react';
import {
  FolderLock,
  Play,
  Shuffle,
  Trash2,
  Download,
  Upload,
  Plus,
  Music2,
  Disc,
  Search,
  HardDrive,
  Check,
  ListPlus,
  Clock,
  ArrowUpDown,
  FileAudio,
  Radio,
  Sliders,
  Sparkles,
  Heart,
  Share2,
  Database,
  Film,
  Layers,
} from 'lucide-react';
import { Track, Playlist } from '../../types';
import { VaultVideoPlayer } from './VaultVideoPlayer';
import {
  saveTrack,
  saveTracksBatch,
  deleteTrack,
  savePlaylist,
  deletePlaylist,
  getAllTracks,
  getAllPlaylists,
  getStorageMetrics,
  clearAllCachedAudio,
  DetailedStorageMetrics,
  onDBChange,
} from '../../lib/db';

export interface VaultMainProps {
  onPlayTrack: (track: Track, trackList?: Track[]) => void;
  onAddToQueue: (track: Track) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  tracks: Track[];
  playlists: Playlist[];
  onTracksChange: (tracks: Track[]) => void;
  onPlaylistsChange: (playlists: Playlist[]) => void;
  onOpenDsp?: () => void;
}

type SourceFilter = 'all' | 'local' | 'youtube' | 'spotify' | 'liked';
type SortField = 'addedAt' | 'title' | 'artist' | 'duration';

export const VaultMain: React.FC<VaultMainProps> = ({
  onPlayTrack,
  onAddToQueue,
  currentTrackId,
  isPlaying = false,
  tracks,
  playlists,
  onTracksChange,
  onPlaylistsChange,
  onOpenDsp,
}) => {
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'upload'>('tracks');
  const [searchFilter, setSearchFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('addedAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Modals and state
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const [storageMetrics, setStorageMetrics] = useState<DetailedStorageMetrics | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | undefined>(undefined);
  const [videoTitle, setVideoTitle] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    getStorageMetrics().then(setStorageMetrics).catch(() => {});
    const unsub = onDBChange(() => {
      getStorageMetrics().then(setStorageMetrics).catch(() => {});
    });
    return unsub;
  }, [tracks.length, playlists.length]);

  const handleClearAudioCache = async () => {
    const cleared = await clearAllCachedAudio();
    showToast(`Cleared ${cleared} offline audio cache items`);
    const metrics = await getStorageMetrics();
    setStorageMetrics(metrics);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3000);
  };

  // Helper to format track duration
  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filter and Sort tracks
  const filteredTracks = tracks
    .filter((track) => {
      // Source filter
      if (sourceFilter === 'local' && track.source !== 'local') return false;
      if (sourceFilter === 'youtube' && track.source !== 'youtube') return false;
      if (sourceFilter === 'spotify' && track.source !== 'spotify') return false;
      if (sourceFilter === 'liked' && !track.liked) return false;

      // Text query
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        track.title.toLowerCase().includes(q) ||
        track.artist.toLowerCase().includes(q) ||
        (track.album && track.album.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      let result = 0;
      if (sortBy === 'addedAt') {
        result = (a.addedAt || 0) - (b.addedAt || 0);
      } else if (sortBy === 'title') {
        result = a.title.localeCompare(b.title);
      } else if (sortBy === 'artist') {
        result = a.artist.localeCompare(b.artist);
      } else if (sortBy === 'duration') {
        result = (a.duration || 0) - (b.duration || 0);
      }
      return sortAsc ? result : -result;
    });

  // Track deletion
  const handleDeleteTrack = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteTrack(id);
      const updated = tracks.filter((t) => t.id !== id);
      onTracksChange(updated);
      showToast('Track deleted from Vault');
    } catch (err: any) {
      showToast(`Error deleting track: ${err.message}`);
    }
  };

  // Playlist creation
  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const newP: Playlist = {
      id: `pl_${Date.now()}`,
      name: newPlaylistName.trim(),
      source: 'local',
      trackIds: addToPlaylistTrack ? [addToPlaylistTrack.id] : [],
      createdAt: Date.now(),
    };

    try {
      await savePlaylist(newP);
      const updatedPlaylists = [newP, ...playlists];
      onPlaylistsChange(updatedPlaylists);
      setNewPlaylistName('');
      setShowCreatePlaylistModal(false);
      setAddToPlaylistTrack(null);
      showToast(`Created playlist "${newP.name}"`);
    } catch (err: any) {
      showToast(`Failed to create playlist: ${err.message}`);
    }
  };

  // Playlist deletion
  const handleDeletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deletePlaylist(id);
      const updated = playlists.filter((p) => p.id !== id);
      onPlaylistsChange(updated);
      showToast('Playlist deleted');
    } catch (err: any) {
      showToast(`Failed to delete playlist: ${err.message}`);
    }
  };

  // Add / remove track in playlist
  const handleToggleTrackInPlaylist = async (playlist: Playlist, trackId: string) => {
    const exists = playlist.trackIds.includes(trackId);
    const updatedIds = exists
      ? playlist.trackIds.filter((id) => id !== trackId)
      : [...playlist.trackIds, trackId];

    const updatedPl = { ...playlist, trackIds: updatedIds };
    await savePlaylist(updatedPl);
    const updatedAll = playlists.map((p) => (p.id === playlist.id ? updatedPl : p));
    onPlaylistsChange(updatedAll);
    showToast(exists ? 'Removed track from playlist' : 'Added track to playlist');
  };

  // Play All
  const handlePlayAll = () => {
    if (filteredTracks.length === 0) return;
    onPlayTrack(filteredTracks[0], filteredTracks);
  };

  // Shuffle Play
  const handleShufflePlay = () => {
    if (filteredTracks.length === 0) return;
    const shuffled = [...filteredTracks].sort(() => Math.random() - 0.5);
    onPlayTrack(shuffled[0], shuffled);
  };

  // Play a specific playlist
  const handlePlayPlaylist = (pl: Playlist) => {
    const plTracks = tracks.filter((t) => pl.trackIds.includes(t.id));
    if (plTracks.length === 0) {
      showToast('Playlist is currently empty. Add tracks to it first.');
      return;
    }
    onPlayTrack(plTracks[0], plTracks);
  };

  // Media File Processor (Audio & Video)
  const processMediaFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    const newTracks: Track[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isAudio = file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|flac|ogg|m4a|aac|opus|webm)$/i);
      const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|mkv|webm|mov|avi|m3u8|ts)$/i);
      
      if (!isAudio && !isVideo) continue;

      // Read duration
      let duration = 180;
      try {
        const objectUrl = URL.createObjectURL(file);
        const media = isAudio ? new Audio() : document.createElement('video');
        media.src = objectUrl;

        await new Promise<void>((resolve) => {
          media.addEventListener('loadedmetadata', () => {
            if (Number.isFinite(media.duration)) {
              duration = Math.round(media.duration);
            }
            resolve();
          });
          media.addEventListener('error', () => resolve());
          setTimeout(resolve, 2000); // 2s timeout fallback
        });
        URL.revokeObjectURL(objectUrl);
      } catch {}

      // Clean title and artist from filename
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const parts = cleanName.split(' - ');
      const artist = parts.length > 1 ? parts[0].trim() : (isAudio ? 'Local Audio File' : 'Local Video File');
      const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : cleanName.trim();

      const track: Track = {
        id: `local_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        title,
        artist,
        album: isVideo ? 'Vault Video Library' : 'Vault Audio Library',
        duration,
        durationText: formatTime(duration),
        source: isVideo ? 'local_video' : 'local',
        fileName: file.name,
        size: file.size,
        addedAt: Date.now(),
        blob: file,
      };

      await saveTrack(track);
      newTracks.push(track);
    }

    if (newTracks.length > 0) {
      const updated = [...newTracks, ...tracks];
      onTracksChange(updated);
      showToast(`Imported ${newTracks.length} media item(s) to Vault`);
      setActiveTab('tracks');
    } else {
      showToast('No valid media files detected');
    }

    setIsUploading(false);
  };

  // Export Vault Backup
  const handleExportVault = () => {
    const vaultData = {
      app: 'SpotUI Studio v3.5',
      version: '3.0',
      exportedAt: new Date().toISOString(),
      trackCount: tracks.length,
      playlistCount: playlists.length,
      tracks: tracks.map((t) => ({ ...t, blob: undefined })), // Blobs cannot be exported to JSON
      playlists,
    };
    const blob = new Blob([JSON.stringify(vaultData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotui-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Vault backup file downloaded');
  };

  // Import Vault Backup
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.tracks || !Array.isArray(parsed.tracks)) {
        throw new Error('Invalid vault backup format.');
      }

      await saveTracksBatch(parsed.tracks);
      if (Array.isArray(parsed.playlists)) {
        for (const pl of parsed.playlists) {
          await savePlaylist(pl);
        }
      }

      const [freshTracks, freshPlaylists] = await Promise.all([getAllTracks(), getAllPlaylists()]);
      onTracksChange(freshTracks);
      onPlaylistsChange(freshPlaylists);
      showToast(`Restored ${parsed.tracks.length} tracks & ${parsed.playlists?.length || 0} playlists!`);
    } catch (err: any) {
      showToast(`Import failed: ${err.message}`);
    }

    if (backupInputRef.current) {
      backupInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8 select-none pb-28 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-cyan-500/50 text-white text-xs font-mono shadow-2xl flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-top-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && processMediaFiles(e.target.files)}
        multiple
        accept="audio/*,video/*,.mp3,.flac,.m4a,.aac,.ogg,.opus,.wav,.webm,.mp4,.mkv,.mov,.avi,.m3u8,.ts"
        className="hidden"
      />
      <input
        type="file"
        ref={backupInputRef}
        onChange={handleImportBackup}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
            <span className="text-cyan-400 font-mono font-bold flex items-center gap-1.5">
              <FolderLock size={15} />
              <span>PERSISTENT VAULT</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>IndexedDB Local Engine</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Cloud Offline Storage</span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight">
            Vault Audio Library
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Persistent audio storage, drag & drop local uploads, custom playlists, and instant continuous playback.
          </p>
        </div>

        {/* Global Vault Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dedicated Universal Video Player Button (10 Playback Support Engines) */}
          <button
            onClick={() => setShowVideoPlayer(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 hover:text-white border border-cyan-400/80 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/60 hover:scale-[1.02] active:scale-95"
            title="Open Universal Video Player (10 Playback Support Engines: HLS.js, HTML5, DASH, MSE, Web Audio DSP, Canvas Shaders, etc.)"
          >
            <Film size={15} className="fill-current text-slate-950 hover:text-white" />
            <span>Video Player</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/40 text-white font-mono">10 Libs</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Upload size={14} className="text-cyan-400" />
            <span>Upload Audio</span>
          </button>

          <button
            onClick={() => setShowCreatePlaylistModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus size={14} className="text-purple-400" />
            <span>New Playlist</span>
          </button>

          <button
            onClick={handleExportVault}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Download JSON Library Backup"
          >
            <Download size={14} />
            <span>Export</span>
          </button>

          <button
            onClick={() => backupInputRef.current?.click()}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Restore Vault from JSON Backup"
          >
            <HardDrive size={14} />
            <span>Restore</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#090d16] border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Music2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{tracks.length}</div>
            <div className="text-xs text-slate-400">Library Tracks</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#090d16] border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Disc size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{playlists.length}</div>
            <div className="text-xs text-slate-400">Playlists</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#090d16] border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <HardDrive size={24} />
            </div>
            <div>
              <div className="text-xl font-bold text-emerald-400 font-mono">
                {storageMetrics ? `${storageMetrics.audioCacheMB} MB` : '0 MB'}
              </div>
              <div className="text-[11px] text-slate-400">
                Binary Audio Cache ({storageMetrics?.audioCacheCount || 0} tracks)
              </div>
            </div>
          </div>
          {storageMetrics && storageMetrics.audioCacheCount > 0 && (
            <button
              onClick={handleClearAudioCache}
              className="px-2 py-1 text-[10px] font-mono rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer shrink-0"
              title="Purge Audio Cache"
            >
              Clear
            </button>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-[#090d16] border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Database size={24} />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-300 font-mono">
              {storageMetrics ? `${storageMetrics.totalUsageMB} MB` : 'Active'}
            </div>
            <div className="text-[11px] text-slate-400">
              Browser Quota ({storageMetrics ? `${storageMetrics.percent}%` : '0%'} used)
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tabs Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('tracks')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'tracks'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Tracks ({tracks.length})
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'playlists'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Playlists ({playlists.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Drop Audio Files
          </button>
        </div>

        {/* Search & Sort Controls */}
        {activeTab === 'tracks' && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search tracks, artists..."
                className="w-full bg-[#070b12] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1 bg-[#070b12] border border-slate-800 rounded-xl px-2 py-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer pr-1"
              >
                <option value="addedAt" className="bg-slate-900 text-white">Date Added</option>
                <option value="title" className="bg-slate-900 text-white">Title</option>
                <option value="artist" className="bg-slate-900 text-white">Artist</option>
                <option value="duration" className="bg-slate-900 text-white">Duration</option>
              </select>
              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="text-slate-400 hover:text-white p-1"
                title={sortAsc ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TRACKS TAB */}
      {activeTab === 'tracks' && (
        <div className="space-y-4">
          {/* Action Bar & Source Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080d16] p-3 rounded-2xl border border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePlayAll}
                disabled={filteredTracks.length === 0}
                className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-cyan-950/40 cursor-pointer disabled:opacity-50"
              >
                <Play size={14} fill="currentColor" />
                <span>Play All ({filteredTracks.length})</span>
              </button>

              <button
                onClick={handleShufflePlay}
                disabled={filteredTracks.length === 0}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Shuffle size={14} className="text-cyan-400" />
                <span>Shuffle</span>
              </button>
            </div>

            {/* Source Segmented Filters */}
            <div className="flex items-center gap-1 text-xs">
              {(['all', 'local', 'youtube', 'spotify', 'liked'] as SourceFilter[]).map((src) => (
                <button
                  key={src}
                  onClick={() => setSourceFilter(src)}
                  className={`px-3 py-1.5 rounded-lg transition capitalize font-medium cursor-pointer ${
                    sourceFilter === src
                      ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {src === 'liked' ? 'Favorites' : src}
                </button>
              ))}
            </div>
          </div>

          {/* Track List */}
          <div className="border border-slate-800/90 rounded-2xl bg-[#060a12] overflow-hidden shadow-2xl">
            {filteredTracks.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Music2 size={24} />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">No tracks found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Drag audio files onto this tab, upload local tracks, or save songs from YouTube Music & Spotify to populate your Vault.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Upload Local Audio</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {filteredTracks.map((track, idx) => {
                  const isCurrent = currentTrackId === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => onPlayTrack(track, filteredTracks)}
                      className={`p-3 px-5 flex items-center justify-between cursor-pointer transition group ${
                        isCurrent
                          ? 'bg-cyan-950/20 text-white'
                          : 'hover:bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      {/* Left: Index / Play Status + Artwork + Title */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-6 text-center font-mono text-xs text-slate-500 shrink-0">
                          {isCurrent && isPlaying ? (
                            <div className="flex items-end justify-center gap-0.5 h-3.5">
                              <span className="w-0.5 bg-cyan-400 rounded-full animate-[bounce_0.6s_infinite]" />
                              <span className="w-0.5 bg-sky-300 rounded-full animate-[bounce_0.8s_infinite]" />
                              <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.7s_infinite]" />
                            </div>
                          ) : (
                            <span className="group-hover:hidden">{idx + 1}</span>
                          )}
                          <Play
                            size={13}
                            fill="currentColor"
                            className="hidden group-hover:inline-block text-cyan-400 mx-auto"
                          />
                        </div>

                        {track.artwork ? (
                          <img
                            src={track.artwork}
                            alt={track.title}
                            className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-800 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                            {track.source === 'local_video' ? <Film size={18} /> : <Disc size={18} />}
                          </div>
                        )}

                        <div className="min-w-0 flex-1" onClick={() => {
                          if (track.source === 'local_video' && track.blob) {
                            const url = URL.createObjectURL(track.blob);
                            setStreamUrl(url);
                            setVideoTitle(track.title);
                            setShowVideoPlayer(true);
                          } else {
                            onPlayTrack(track, filteredTracks);
                          }
                        }}>
                          <div className={`text-xs font-bold truncate ${isCurrent ? 'text-cyan-300' : 'text-slate-100 group-hover:text-cyan-300'} transition-colors`}>
                            {track.title}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                            <span>{track.artist}</span>
                            {track.source && (
                              <>
                                <span aria-hidden="true" className="text-slate-600">·</span>
                                <span className="capitalize text-slate-500 text-[10px]">{track.source.replace('_', ' ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions & Duration */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-slate-500 w-12 text-right">
                          {track.durationText || formatTime(track.duration)}
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToQueue(track);
                              showToast(`Added "${track.title}" to Queue`);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Add to Playback Queue"
                          >
                            <ListPlus size={15} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddToPlaylistTrack(track);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition"
                            title="Add to Playlist"
                          >
                            <Plus size={15} />
                          </button>

                          <button
                            onClick={(e) => handleDeleteTrack(track.id, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                            title="Delete from Vault"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLAYLISTS TAB */}
      {activeTab === 'playlists' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Custom Playlists ({playlists.length})
            </h2>
            <button
              onClick={() => setShowCreatePlaylistModal(true)}
              className="px-3.5 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Playlist</span>
            </button>
          </div>

          {playlists.length === 0 ? (
            <div className="p-16 border border-slate-800/80 rounded-2xl bg-[#060a12] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/30 border border-purple-800/40 flex items-center justify-center mx-auto text-purple-400">
                <Disc size={24} />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">No playlists yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Group your favorite tracks into offline-synced mixes with continuous playback.
              </p>
              <button
                onClick={() => setShowCreatePlaylistModal(true)}
                className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Create First Playlist</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((pl) => {
                const plTracks = tracks.filter((t) => pl.trackIds.includes(t.id));
                const totalDuration = plTracks.reduce((sum, t) => sum + (t.duration || 0), 0);

                return (
                  <div
                    key={pl.id}
                    className="p-5 rounded-2xl bg-[#080d16] border border-slate-800 hover:border-purple-500/50 transition-all flex flex-col justify-between shadow-xl group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Disc size={15} className="text-purple-400" />
                          <span>{pl.trackIds.length} tracks</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatTime(totalDuration)}</span>
                        </div>

                        <button
                          onClick={(e) => handleDeletePlaylist(pl.id, e)}
                          className="text-slate-500 hover:text-rose-400 transition p-1"
                          title="Delete Playlist"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <h3 className="font-bold text-base text-white truncate group-hover:text-purple-300 transition-colors">
                        {pl.name}
                      </h3>

                      <div className="text-[11px] text-slate-500 font-mono mt-1">
                        Created {new Date(pl.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {plTracks.slice(0, 4).map((t, i) => (
                          <img
                            key={t.id}
                            src={t.artwork || '/favicon.ico'}
                            alt=""
                            className="w-6 h-6 rounded-full border border-slate-900 object-cover"
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => handlePlayPlaylist(pl)}
                        disabled={plTracks.length === 0}
                        className="px-3.5 py-1.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-950/40 cursor-pointer disabled:opacity-40"
                      >
                        <Play size={12} fill="currentColor" />
                        <span>Play Mix</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DROP MEDIA TAB */}
      {activeTab === 'upload' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            if (e.dataTransfer.files) {
              processMediaFiles(e.dataTransfer.files);
            }
          }}
          className={`p-12 border-2 border-dashed rounded-3xl text-center transition-all ${
            isDraggingOver
              ? 'border-cyan-400 bg-cyan-950/20'
              : 'border-slate-800 bg-[#070b13] hover:border-slate-700'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4">
            <Layers size={32} />
          </div>

          <h3 className="text-lg font-bold text-white mb-2">
            Drag & Drop Audio or Video Files
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
            Support for MP3, WAV, FLAC, M4A, AAC, Opus, MP4, MKV, and WebM. Media is decoded in browser and securely stored in your offline IndexedDB library.
          </p>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-950/40 transition cursor-pointer disabled:opacity-50"
          >
            {isUploading ? 'Importing Media...' : 'Select Files'}
          </button>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePlaylist}
            className="p-6 rounded-3xl bg-[#090e18] border border-slate-800 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <h3 className="text-base font-bold text-white">Create New Vault Playlist</h3>
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="e.g., Midnight Synthwave..."
              autoFocus
              className="w-full bg-[#05080e] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreatePlaylistModal(false);
                  setAddToPlaylistTrack(null);
                }}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Track to Playlist Modal */}
      {addToPlaylistTrack && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="p-6 rounded-3xl bg-[#090e18] border border-slate-800 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Add to Playlist</h3>
                <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                  {addToPlaylistTrack.title}
                </p>
              </div>
              <button
                onClick={() => setAddToPlaylistTrack(null)}
                className="text-slate-500 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {playlists.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">
                  No playlists yet. Create a playlist first!
                </div>
              ) : (
                playlists.map((pl) => {
                  const inPl = pl.trackIds.includes(addToPlaylistTrack.id);
                  return (
                    <div
                      key={pl.id}
                      onClick={() => handleToggleTrackInPlaylist(pl, addToPlaylistTrack.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        inPl
                          ? 'bg-purple-950/30 border-purple-500/50 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold">{pl.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {pl.trackIds.length} tracks
                        </div>
                      </div>

                      {inPl && <Check size={16} className="text-purple-400" />}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => setShowCreatePlaylistModal(true)}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
              >
                + Create New Playlist
              </button>

              <button
                onClick={() => setAddToPlaylistTrack(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vault Universal Video Player Modal (10 Playback Engines) */}
      {showVideoPlayer && (
        <VaultVideoPlayer
          onClose={() => {
            setShowVideoPlayer(false);
            setStreamUrl(undefined);
            setVideoTitle(undefined);
          }}
          onOpenDsp={onOpenDsp}
          initialUrl={streamUrl}
          initialTitle={videoTitle}
        />
      )}
    </div>
  );
};
