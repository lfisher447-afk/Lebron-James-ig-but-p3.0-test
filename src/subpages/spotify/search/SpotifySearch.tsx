import React, { useState } from 'react';
import { Search, Play, Plus, Check, Music2, Disc, RefreshCw, Radio } from 'lucide-react';
import { Track } from '../../../types';
import { spotifyHandler } from '../handler/SpotifyHandler';
import { saveTrack } from '../../../lib/db';

interface SpotifySearchProps {
  onPlayTrack: (track: Track, trackList?: Track[]) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

export const SpotifySearch: React.FC<SpotifySearchProps> = ({
  onPlayTrack,
  currentTrackId,
  isPlaying,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{ tracks: Track[]; albums: any[]; playlists: any[] }>({
    tracks: [],
    albums: [],
    playlists: [],
  });
  const [activeFilter, setActiveFilter] = useState<'all' | 'tracks' | 'albums' | 'playlists'>('all');
  const [savedTrackIds, setSavedTrackIds] = useState<Record<string, boolean>>({});

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const data = await spotifyHandler.search(query);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveTrack = async (track: Track) => {
    try {
      await saveTrack(track);
      setSavedTrackIds((prev) => ({ ...prev, [track.id]: true }));
    } catch (err) {
      console.error('Failed to save track:', err);
    }
  };

  const quickPills = ['Daft Punk', "Today's Top Hits", 'Chill Lo-Fi', 'Synthwave', 'The Weeknd', 'Kendrick Lamar'];

  return (
    <div className="space-y-6">
      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums, or paste Spotify URL..."
            className="w-full bg-[#0a181c] border border-[#1d3d46] focus:border-[#48e4ff] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition shadow-inner"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="px-6 py-3.5 bg-gradient-to-r from-[#1db954] to-[#1aa34a] hover:from-[#22c55e] hover:to-[#1db954] text-black font-bold text-xs rounded-2xl transition disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-emerald-900/30"
        >
          {isSearching ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
          <span>Search</span>
        </button>
      </form>

      {/* Quick Search Suggestions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-zinc-400 font-medium shrink-0 flex items-center gap-1">
          <Radio size={12} className="text-emerald-400" /> Suggestions:
        </span>
        {quickPills.map((pill) => (
          <button
            key={pill}
            onClick={() => {
              setQuery(pill);
              spotifyHandler.search(pill).then(setResults);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#091a1e] hover:bg-[#122e36] text-xs text-zinc-300 hover:text-white border border-[#193942] transition shrink-0"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Filter Tabs */}
      {results.tracks.length > 0 && (
        <div className="flex items-center gap-2 border-b border-[#17363e] pb-2">
          {(['all', 'tracks', 'albums', 'playlists'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                activeFilter === tab
                  ? 'bg-[#1db954] text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0c2227]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Track Results */}
      {(activeFilter === 'all' || activeFilter === 'tracks') && results.tracks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Music2 size={16} className="text-[#1db954]" /> Songs & Audio Tracks
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {results.tracks.map((track) => {
              const isCurrent = currentTrackId === track.id;
              const isSaved = !!savedTrackIds[track.id];
              return (
                <div
                  key={track.id}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between group ${
                    isCurrent
                      ? 'bg-[#123842] border-[#48e4ff]/60 shadow-md'
                      : 'bg-[#07171a] border-[#14333b] hover:bg-[#0d262d] hover:border-[#214a54]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800">
                      <img
                        src={track.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80'}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => onPlayTrack(track, results.tracks)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                      >
                        <Play size={18} className="fill-current text-[#1db954]" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{track.title}</div>
                      <div className="text-[11px] text-zinc-400 truncate mt-0.5">{track.artist}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs font-mono text-zinc-500">{track.durationText}</span>
                    <button
                      onClick={() => handleSaveTrack(track)}
                      title="Save to Vault"
                      className={`p-2 rounded-xl border text-xs transition ${
                        isSaved
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-[#0a1f24] hover:bg-[#13353d] text-zinc-400 hover:text-white border-[#1c4049]'
                      }`}
                    >
                      {isSaved ? <Check size={14} /> : <Plus size={14} />}
                    </button>
                    <button
                      onClick={() => onPlayTrack(track, results.tracks)}
                      className={`p-2 rounded-xl font-bold text-xs transition flex items-center justify-center ${
                        isCurrent && isPlaying
                          ? 'bg-[#1db954] text-black shadow-lg shadow-emerald-500/30'
                          : 'bg-[#123038] hover:bg-[#1b434e] text-white'
                      }`}
                    >
                      <Play size={14} className={isCurrent && isPlaying ? 'fill-current' : ''} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Album / Playlist Results */}
      {(activeFilter === 'all' || activeFilter === 'albums' || activeFilter === 'playlists') &&
        (results.albums.length > 0 || results.playlists.length > 0) && (
          <div className="space-y-3 pt-4 border-t border-[#17363e]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Disc size={16} className="text-[#48e4ff]" /> Albums & Playlists
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...results.albums, ...results.playlists].map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-2xl bg-[#08191d] border border-[#173842] hover:border-[#48e4ff]/50 transition group flex flex-col justify-between"
                >
                  <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-zinc-900 relative">
                    <img
                      src={item.coverArt || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80'}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white truncate">{item.name}</div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {item.artist || 'Collection'} • {item.trackCount || 10} tracks
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};
