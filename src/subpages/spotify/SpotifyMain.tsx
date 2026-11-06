import React, { useState, useEffect } from 'react';
import {
  Music2,
  Disc,
  Play,
  Pause,
  Plus,
  Check,
  Search,
  RefreshCw,
  Sparkles,
  ListMusic,
  ExternalLink,
  Layers,
  ArrowRight,
  Radio,
} from 'lucide-react';
import { Track, Playlist } from '../../types';
import { SpotifyPlayer } from './player/SpotifyPlayer';
import { SpotifySearch } from './search/SpotifySearch';
import { spotifyHandler, SpotifyCollection, SpotifyFeaturedItem } from './handler/SpotifyHandler';
import { saveTracksBatch, savePlaylist } from '../../lib/db';

interface SpotifyMainProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, trackList?: Track[]) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  queue: Track[];
  onOpenDsp: () => void;
}

export const SpotifyMain: React.FC<SpotifyMainProps> = ({
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onNext,
  onPrev,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  queue,
  onOpenDsp,
}) => {
  const [activeTab, setActiveTab] = useState<'featured' | 'search' | 'collection'>('featured');
  const [urlInput, setUrlInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [featuredCatalogs, setFeaturedCatalogs] = useState<SpotifyFeaturedItem[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<SpotifyCollection | null>(null);
  const [vaultSyncSuccess, setVaultSyncSuccess] = useState(false);

  useEffect(() => {
    spotifyHandler.getFeaturedCatalogs().then(setFeaturedCatalogs);
  }, []);

  const handleResolveUrl = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    const query = customUrl || urlInput;
    if (!query.trim()) return;

    setIsResolving(true);
    setResolveError(null);
    try {
      const collection = await spotifyHandler.resolve(query);
      setSelectedCollection(collection);
      setActiveTab('collection');
    } catch (err: any) {
      setResolveError(err.message || 'Could not resolve Spotify URL');
    } finally {
      setIsResolving(false);
    }
  };

  const handleSyncToVault = async () => {
    if (!selectedCollection) return;
    try {
      await saveTracksBatch(selectedCollection.tracks);
      const playlist: Playlist = {
        id: `sp_pl_${Date.now()}`,
        name: selectedCollection.name,
        source: 'spotify',
        trackIds: selectedCollection.tracks.map((t) => t.id),
        createdAt: Date.now(),
        syncedAt: Date.now(),
      };
      await savePlaylist(playlist);
      setVaultSyncSuccess(true);
      setTimeout(() => setVaultSyncSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to sync collection:', err);
    }
  };

  return (
    <div className="space-y-8 select-none pb-24 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#163842] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#1db954]/20 border border-[#1db954]/40 text-[#1db954]">
              <Music2 size={18} />
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#1db954] font-bold">
              Dedicated Spotify Web Node
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Spotify Master Player
          </h1>
          <p className="text-xs text-[#789d9a] mt-1 max-w-xl">
            Stream full albums, public playlists, and top charts keylessly. Native audio decoding routed through the 5-band Web Audio DSP equalizer.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-[#091b20] p-1.5 rounded-2xl border border-[#163942]">
          <button
            onClick={() => setActiveTab('featured')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'featured'
                ? 'bg-[#1db954] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Featured Catalogs
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'search'
                ? 'bg-[#1db954] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Search size={14} />
            <span>Search & Bridge</span>
          </button>
          {selectedCollection && (
            <button
              onClick={() => setActiveTab('collection')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'collection'
                  ? 'bg-[#1db954] text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Disc size={14} />
              <span>Current Collection</span>
            </button>
          )}
        </div>
      </div>

      {/* URL Resolver Bar */}
      <div className="p-5 rounded-2xl bg-[#091b20] border border-[#1a3f4a] shadow-lg">
        <form onSubmit={handleResolveUrl} className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste any public Spotify Playlist, Album, or Track URL..."
            className="flex-1 bg-[#061215] border border-[#183a44] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#1db954] transition"
          />
          <button
            type="submit"
            disabled={isResolving || !urlInput.trim()}
            className="px-6 py-3 bg-[#1db954] hover:bg-[#22c55e] text-black font-bold text-xs rounded-xl transition flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            {isResolving ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            <span>Resolve Collection</span>
          </button>
        </form>

        {resolveError && (
          <div className="mt-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl">
            {resolveError}
          </div>
        )}
      </div>

      {/* Primary Spotify Master Deck Player */}
      <SpotifyPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
        onNext={onNext}
        onPrev={onPrev}
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        volume={volume}
        onVolumeChange={onVolumeChange}
        queue={queue}
        onSelectTrack={(t) => onPlayTrack(t, queue)}
        onOpenDsp={onOpenDsp}
      />

      {/* Tab 1: Featured Catalogs */}
      {activeTab === 'featured' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-[#1db954]" /> Curated Spotify Playlists & Master Albums
              </h2>
              <p className="text-xs text-[#789d9a]">
                Click any catalog to resolve full tracklist and stream keylessly
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredCatalogs.map((item) => (
              <div
                key={item.id}
                onClick={() => handleResolveUrl(undefined, item.id)}
                className="p-4 rounded-3xl bg-[#07171a] border border-[#15343c] hover:border-[#1db954] hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between shadow-xl"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-zinc-900">
                  <img
                    src={item.coverArt}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-[#1db954] flex items-center justify-center text-black shadow-lg shadow-emerald-500/40">
                      <Play size={22} className="fill-current ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-black/70 text-emerald-400 border border-emerald-500/30">
                    {item.type}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-white truncate group-hover:text-[#1db954] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-[#789d9a]">
                    <span>{item.trackCount} Tracks</span>
                    <span className="text-[#1db954] font-bold group-hover:translate-x-1 transition-transform">
                      Load Deck →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Search Engine */}
      {activeTab === 'search' && (
        <SpotifySearch
          onPlayTrack={onPlayTrack}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
        />
      )}

      {/* Tab 3: Detailed Resolved Collection Tracklist View */}
      {activeTab === 'collection' && selectedCollection && (
        <div className="space-y-6">
          {/* Collection Hero Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0d2a30] via-[#081b20] to-[#040e11] border border-[#1a444f] flex flex-col md:flex-row items-center md:items-end gap-6 shadow-2xl">
            <img
              src={selectedCollection.coverArt}
              alt={selectedCollection.name}
              className="w-40 h-40 rounded-2xl object-cover shadow-2xl border border-[#1b4b57] shrink-0"
            />
            <div className="flex-1 text-center md:text-left">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#1db954] font-bold">
                Resolved Spotify {selectedCollection.type}
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight mt-1 mb-2">
                {selectedCollection.name}
              </h2>
              <p className="text-xs text-[#789d9a] mb-4">
                {selectedCollection.tracks.length} Tracks • High-Bitrate Innertube Audio Bridge
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <button
                  onClick={() => {
                    if (selectedCollection.tracks.length > 0) {
                      onPlayTrack(selectedCollection.tracks[0], selectedCollection.tracks);
                    }
                  }}
                  className="px-6 py-2.5 bg-[#1db954] hover:bg-[#22c55e] text-black font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/30"
                >
                  <Play size={16} className="fill-current" />
                  <span>Play All Tracks</span>
                </button>

                <button
                  onClick={handleSyncToVault}
                  className={`px-5 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                    vaultSyncSuccess
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : 'bg-[#0a1e23] hover:bg-[#13353d] text-white border-[#1c4049]'
                  }`}
                >
                  {vaultSyncSuccess ? <Check size={15} /> : <Plus size={15} />}
                  <span>{vaultSyncSuccess ? 'Synced to Vault!' : 'Sync All to Local Vault'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tracklist Table */}
          <div className="border border-[#163842] rounded-2xl bg-[#061417] overflow-hidden">
            <div className="p-3.5 border-b border-[#14343d] flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wider px-6">
              <span className="w-8">#</span>
              <span className="flex-1">Title & Artist</span>
              <span className="w-24 text-right">Duration</span>
              <span className="w-20 text-right">Action</span>
            </div>

            <div className="divide-y divide-[#10272e]">
              {selectedCollection.tracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack(track, selectedCollection.tracks)}
                    className={`p-3.5 px-6 flex items-center justify-between cursor-pointer transition ${
                      isCurrent
                        ? 'bg-[#123842] text-white font-bold'
                        : 'hover:bg-[#091f24] text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <span className="text-xs font-mono text-zinc-500 w-8">
                        {isCurrent && isPlaying ? (
                          <span className="w-2 h-2 rounded-full bg-[#1db954] inline-block animate-ping" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      {track.artwork && (
                        <img
                          src={track.artwork}
                          alt={track.title}
                          className="w-10 h-10 rounded-lg object-cover shrink-0 border border-zinc-800"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate text-white">{track.title}</div>
                        <div className="text-[11px] text-zinc-400 truncate mt-0.5">{track.artist}</div>
                      </div>
                    </div>

                    <div className="w-24 text-right font-mono text-xs text-zinc-400">
                      {track.durationText}
                    </div>

                    <div className="w-20 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTrack(track, selectedCollection.tracks);
                        }}
                        className="p-2 rounded-xl bg-[#0a1e23] hover:bg-[#1db954] hover:text-black text-white transition border border-[#193a43]"
                      >
                        <Play size={13} className="fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
