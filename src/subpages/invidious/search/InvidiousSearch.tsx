import React, { useState, useEffect } from 'react';
import { Search, Play, Tv, RefreshCw, Eye, Clock, Plus, Check, Calendar, User, ArrowDownCircle } from 'lucide-react';
import { invidiousHandler } from '../handler/InvidiousHandler';
import { saveTrack } from '../../../lib/db';
import { Track } from '../../../types';

interface InvidiousSearchProps {
  onSelectVideo: (videoId: string) => void;
  onPlayAudioOnly: (track: Track) => void;
  onSelectChannel?: (channelName: string) => void;
}

export const InvidiousSearch: React.FC<InvidiousSearchProps> = ({
  onSelectVideo,
  onPlayAudioOnly,
  onSelectChannel,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setPage(1);
    try {
      const data = await invidiousHandler.search(query, 1);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !query.trim()) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const nextPageData = await invidiousHandler.search(query, nextPage);
      if (nextPageData && nextPageData.length > 0) {
        setResults((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const filtered = nextPageData.filter((item) => !existingIds.has(item.id));
          return [...prev, ...filtered];
        });
        setPage(nextPage);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Autoload on scroll near page bottom
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 400
      ) {
        if (!isLoadingMore && !isSearching && results.length > 0) {
          handleLoadMore();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [results, page, isLoadingMore, isSearching, query]);

  const handleSaveToVault = async (v: any) => {
    try {
      const track: Track = {
        id: `yt_${v.id}`,
        title: v.title,
        artist: v.artist || 'YouTube Channel',
        album: 'YouTube Video',
        duration: v.duration || 210,
        durationText: v.durationText || '3:30',
        artwork: v.thumbnail,
        source: 'youtube',
        addedAt: Date.now(),
        streamUrl: `/api/audio/stream?id=${v.id}`,
      };
      await saveTrack(track);
      setSavedIds((prev) => ({ ...prev, [v.id]: true }));
    } catch (e) {
      console.error(e);
    }
  };

  const quickCategories = [
    'Daft Punk Live',
    'Synthwave 80s Cyberpunk',
    'NPR Tiny Desk Concert',
    'Lo-Fi Beats to Relax/Study',
    'Boiler Room London',
    'Electronic Dance Music',
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search YouTube videos, channels, live sets, or paste video URL..."
            className="w-full bg-[#0a181c] border border-[#1d3d46] focus:border-[#48e4ff] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition shadow-inner"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="px-6 py-3.5 bg-[#f43f5e] hover:bg-[#e11d48] text-white font-bold text-xs rounded-2xl transition disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-rose-900/30"
        >
          {isSearching ? <RefreshCw size={15} className="animate-spin" /> : <Tv size={15} />}
          <span>Search Video</span>
        </button>
      </form>

      {/* Quick Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {quickCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setQuery(cat);
              setPage(1);
              invidiousHandler.search(cat, 1).then(setResults);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#091a1e] hover:bg-[#122e36] text-xs text-zinc-300 hover:text-white border border-[#193942] transition shrink-0"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((video, idx) => {
              const isSaved = !!savedIds[video.id];
              return (
                <div
                  key={video.id ? `search_${video.id}_${idx}` : `search_item_${idx}`}
                  className="p-4 rounded-3xl bg-[#07171a] border border-[#14333b] hover:border-[#f43f5e]/60 transition-all group flex flex-col justify-between shadow-xl"
                >
                  <div>
                    <div
                      onClick={() => onSelectVideo(video.id)}
                      className="relative aspect-video rounded-2xl overflow-hidden mb-3 bg-zinc-900 cursor-pointer"
                    >
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-[#f43f5e] flex items-center justify-center text-white shadow-lg shadow-rose-500/40">
                          <Play size={20} className="fill-current ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-mono text-white font-bold">
                        {video.durationText || '3:30'}
                      </span>
                    </div>

                    <h3
                      onClick={() => onSelectVideo(video.id)}
                      className="font-bold text-sm text-white line-clamp-2 cursor-pointer hover:text-[#f43f5e] transition-colors leading-snug"
                    >
                      {video.title}
                    </h3>

                    {/* Clickable Channel Name */}
                    <div
                      onClick={() => onSelectChannel && onSelectChannel(video.artist)}
                      className="text-xs text-[#789d9a] hover:text-[#48e4ff] transition-colors mt-1.5 truncate flex items-center gap-1 cursor-pointer font-medium"
                      title={`View channel profile for ${video.artist}`}
                    >
                      <User size={12} className="text-[#48e4ff] shrink-0" />
                      <span>{video.artist}</span>
                    </div>

                    {/* Explicit Published Date */}
                    <div className="text-[11px] font-mono text-[#5c828a] mt-1 flex items-center gap-1">
                      <Calendar size={11} className="text-[#48e4ff]" />
                      <span>{video.publishedText || 'Uploaded recently'}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#122c33] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                      <Eye size={12} /> {video.views || 'HD Stream'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveToVault(video)}
                        title="Add to Vault"
                        className={`p-2 rounded-xl border text-xs transition ${
                          isSaved
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-[#0a1e23] hover:bg-[#13353d] text-zinc-400 hover:text-white border-[#193a43]'
                        }`}
                      >
                        {isSaved ? <Check size={13} /> : <Plus size={13} />}
                      </button>
                      <button
                        onClick={() => onSelectVideo(video.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#f43f5e] hover:bg-[#e11d48] text-white font-bold text-xs transition flex items-center gap-1 shadow-md shadow-rose-900/30"
                      >
                        <Play size={12} className="fill-current" />
                        <span>Watch</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Autoloading Indicator / Load More Control */}
          <div className="pt-4 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-3 bg-[#0a2228] hover:bg-[#12363e] border border-[#1b4a56] text-[#48e4ff] text-xs font-mono font-bold rounded-2xl transition flex items-center gap-2 shadow-lg cursor-pointer"
            >
              {isLoadingMore ? (
                <>
                  <RefreshCw size={15} className="animate-spin text-[#48e4ff]" />
                  <span>Autoloading Page {page + 1} Results...</span>
                </>
              ) : (
                <>
                  <ArrowDownCircle size={15} />
                  <span>Scroll or Click to Autoload Page {page + 1}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
