import React, { useState } from 'react';
import {
  Play,
  Plus,
  Music2,
  ListMusic,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Search,
  Sparkles,
  Shield,
} from 'lucide-react';
import { SpotifyKeylessResolver } from '../lib/innertube/spotify';
import { Track } from '../types';

interface SpotifyPlayerViewProps {
  onPlayTrack: (track: Track) => void;
  onAddToVault?: (track: Track) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

const POPULAR_SPOTIFY_COLLECTIONS = [
  {
    name: "Today's Top Hits",
    url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    tag: 'Global Pop',
  },
  {
    name: 'Lofi Beats',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn',
    tag: 'Chill & Study',
  },
  {
    name: 'Top 50 - Global',
    url: 'https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF',
    tag: 'Charts',
  },
  {
    name: 'Daft Punk - RAM',
    url: 'https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa',
    tag: 'Electronic Album',
  },
];

export const SpotifyPlayerView: React.FC<SpotifyPlayerViewProps> = ({
  onPlayTrack,
  onAddToVault,
  currentTrackId,
  isPlaying,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAll, setSavedAll] = useState(false);

  const [activeCollection, setActiveCollection] = useState<{
    id: string;
    title: string;
    type: string;
    artwork?: string;
    embedUrl?: string;
    tracks: Track[];
  }>({
    id: '37i9dQZF1DXcBWIGoYBM5M',
    title: "Today's Top Hits",
    type: 'playlist',
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M',
    tracks: [],
  });

  const handleResolveUrl = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    setLoading(true);
    setError(null);
    setSavedAll(false);

    try {
      const data = await SpotifyKeylessResolver.resolveUrl(targetUrl.trim());
      setActiveCollection({
        id: data.id,
        title: data.title,
        type: data.type,
        artwork: data.artwork,
        embedUrl: data.embedUrl || `https://open.spotify.com/embed/${data.type}/${data.id}`,
        tracks: data.tracks,
      });
      setUrlInput('');
    } catch (err: any) {
      setError(err.message || 'Failed to load Spotify collection');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleResolveUrl(urlInput);
  };

  const handleSaveAll = () => {
    if (!onAddToVault || activeCollection.tracks.length === 0) return;
    activeCollection.tracks.forEach((track) => {
      onAddToVault(track);
    });
    setSavedAll(true);
    setTimeout(() => setSavedAll(false), 3000);
  };

  return (
    <div id="spotify-player-page" className="flex-1 flex flex-col min-h-0 bg-black overflow-y-auto">
      {/* Top Bar: URL Resolver */}
      <div className="p-4 bg-zinc-950/95 border-b border-zinc-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleFormSubmit} className="flex-1 w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="spotify-url-input"
                type="text"
                placeholder="Paste any Spotify playlist, album, or track URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-emerald-400 focus:outline-none text-zinc-100 placeholder-zinc-500 transition"
              />
            </div>
            <button
              id="spotify-resolve-btn"
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Music2 className="w-3.5 h-3.5" />
              )}
              <span>{loading ? 'Resolving...' : 'Resolve'}</span>
            </button>
          </form>

          {/* Preset quick links */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {POPULAR_SPOTIFY_COLLECTIONS.map((c) => (
              <button
                key={c.name}
                onClick={() => handleResolveUrl(c.url)}
                className="px-2.5 py-1 rounded-lg text-[11px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-emerald-400 transition whitespace-nowrap"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2 rounded-xl text-center">
            {error}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-4 md:p-6 flex-1 flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full">
        {/* Left Side: Spotify Interactive Embed Player */}
        <div className="w-full lg:w-[420px] flex flex-col space-y-4">
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Music2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Decrypted Native Spotify Deck
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-mono">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Zero-Embed Native DSP</span>
              </div>
            </div>

            {/* Dedicated Native Player Deck (Zero Iframe Embeds - 100% Unblockable) */}
            <div className="w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#0a231b] to-black aspect-[4/5] max-h-[460px] border border-emerald-500/30 p-6 flex flex-col items-center justify-between shadow-2xl relative">
              <div className="w-full flex items-center justify-between text-xs text-emerald-400/80 font-mono">
                <span>BITRATE: 320 KBPS</span>
                <span>DSP EQUALIZER: ACTIVE</span>
              </div>

              <div className="relative group my-auto">
                <div className="w-44 h-44 rounded-2xl overflow-hidden shadow-2xl border border-emerald-500/30">
                  <img
                    src={activeCollection.artwork || (activeCollection as any).coverArt || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400'}
                    alt={activeCollection.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                {activeCollection.tracks.length > 0 && (
                  <button
                    onClick={() => onPlayTrack(activeCollection.tracks[0])}
                    className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg shadow-emerald-500/30 transition transform hover:scale-105 cursor-pointer"
                    title="Play First Track"
                  >
                    <Play className="w-6 h-6 fill-black ml-0.5" />
                  </button>
                )}
              </div>

              <div className="w-full text-center space-y-1">
                <h4 className="text-sm font-bold text-white truncate">{activeCollection.title}</h4>
                <p className="text-xs text-[#789d9a] truncate">
                  {activeCollection.tracks.length} Tracks • Direct Audio Pipeline
                </p>
                <div className="pt-2">
                  {activeCollection.tracks.length > 0 && (
                    <button
                      onClick={() => onPlayTrack(activeCollection.tracks[0])}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      <span>Play Collection in Spotui</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Collection Info Card */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4">
            <h3 className="font-bold text-sm text-white">{activeCollection.title}</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Type: <span className="capitalize text-zinc-200">{activeCollection.type}</span> •{' '}
              {activeCollection.tracks.length > 0
                ? `${activeCollection.tracks.length} tracks parsed & ready`
                : 'Direct stream active'}
            </p>

            {activeCollection.tracks.length > 0 && onAddToVault && (
              <button
                onClick={handleSaveAll}
                disabled={savedAll}
                className={`w-full mt-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                  savedAll
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black border-transparent font-bold'
                }`}
              >
                {savedAll ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>All Tracks Saved to Vault</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Entire Collection to Vault</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Tracklist for DSP Web Audio Playback */}
        <div className="flex-1 flex flex-col bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-emerald-400" />
                <span>Extracted Tracks ({activeCollection.tracks.length})</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Click any track to stream through Spotui's Web Audio DSP Engine with live EQ.
              </p>
            </div>
          </div>

          {activeCollection.tracks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <Music2 className="w-10 h-10 text-zinc-600 mb-3" />
              <p className="text-sm font-semibold text-zinc-300">
                Ready to stream from Spotify
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                Use the player on the left to play directly in Spotify, or paste any playlist URL above to extract individual audio tracks into your vault.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto max-h-[600px] pr-1">
              {activeCollection.tracks.map((track, idx) => {
                const isCurrent = currentTrackId === track.id;
                return (
                  <div
                    key={track.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition group ${
                      isCurrent
                        ? 'bg-emerald-950/40 border border-emerald-500/40'
                        : 'hover:bg-zinc-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-6 text-center text-xs font-mono text-zinc-500">
                        {idx + 1}
                      </span>
                      {track.artwork && (
                        <img
                          src={track.artwork}
                          alt={track.title}
                          className="w-9 h-9 rounded-lg object-cover border border-zinc-800 shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs font-semibold truncate ${
                            isCurrent ? 'text-emerald-400' : 'text-zinc-100'
                          }`}
                        >
                          {track.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">{track.artist}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs font-mono text-zinc-500 mr-1">
                        {track.durationText}
                      </span>
                      <button
                        onClick={() => onPlayTrack(track)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>DSP Play</span>
                      </button>
                      {onAddToVault && (
                        <button
                          onClick={() => onAddToVault(track)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                          title="Add to Vault"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
