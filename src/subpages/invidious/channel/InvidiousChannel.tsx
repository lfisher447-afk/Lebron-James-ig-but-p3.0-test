import React, { useState, useEffect } from 'react';
import { Tv, Play, Search, Flame, Users, Calendar, ArrowLeft, RefreshCw, Filter, Check, Shield } from 'lucide-react';

interface ChannelMetadata {
  id: string;
  name: string;
  avatar: string;
  banner?: string;
  subscribersFormatted?: string;
  verified?: boolean;
  description?: string;
  videos: any[];
}

interface InvidiousChannelProps {
  channelIdOrName: string;
  onBack: () => void;
  onSelectVideo: (videoId: string) => void;
}

export const InvidiousChannel: React.FC<InvidiousChannelProps> = ({
  channelIdOrName,
  onBack,
  onSelectVideo,
}) => {
  const [channel, setChannel] = useState<ChannelMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'oldest'>('recent');
  const [filterQuery, setFilterQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadChannelData();
  }, [channelIdOrName]);

  const loadChannelData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Query channel endpoint or search channel uploads via Innertube
      const res = await fetch(`/api/innertube/channel?id=${encodeURIComponent(channelIdOrName)}`);
      if (res.ok) {
        const data = await res.json();
        setChannel(data);
      } else {
        // Fallback: search for videos by channel name
        const searchRes = await fetch(`/api/innertube/search?q=${encodeURIComponent(channelIdOrName + ' channel')}`);
        const searchData = await searchRes.json();
        const videos = Array.isArray(searchData) ? searchData : searchData.results || [];

        setChannel({
          id: channelIdOrName,
          name: channelIdOrName.replace(/^@/, ''),
          avatar: videos[0]?.thumbnail || `https://i.ytimg.com/vi/${videos[0]?.id}/hqdefault.jpg`,
          subscribersFormatted: 'Verified Channel',
          verified: true,
          description: `Official channel videos and live uploads for ${channelIdOrName}`,
          videos,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load channel details');
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredAndSortedVideos = () => {
    if (!channel || !channel.videos) return [];

    let filtered = [...channel.videos];

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      filtered = filtered.filter(
        (v) => (v.title && v.title.toLowerCase().includes(q)) || (v.artist && v.artist.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'popular') {
      filtered.sort((a, b) => (b.views || '').localeCompare(a.views || ''));
    } else if (sortBy === 'oldest') {
      filtered.reverse();
    }

    return filtered;
  };

  const videos = getFilteredAndSortedVideos();

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="px-4 py-2 rounded-2xl bg-[#091b20] hover:bg-[#122e36] text-[#48e4ff] border border-[#183d47] text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
      >
        <ArrowLeft size={16} />
        <span>Back to Search & Feed</span>
      </button>

      {isLoading ? (
        <div className="p-12 text-center text-[#48e4ff] bg-[#07171a] border border-[#15343c] rounded-3xl space-y-3">
          <RefreshCw size={32} className="animate-spin mx-auto text-[#48e4ff]" />
          <div className="text-xs font-mono font-bold tracking-wider">Decrypting Channel Profile & Uploads...</div>
        </div>
      ) : errorMessage || !channel ? (
        <div className="p-8 text-center text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-3xl text-xs space-y-3">
          <div>{errorMessage || 'Channel not found or unavailable'}</div>
          <button
            onClick={loadChannelData}
            className="px-4 py-2 bg-rose-800 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition"
          >
            Retry Channel Fetch
          </button>
        </div>
      ) : (
        <>
          {/* Channel Banner & Header */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#081f25] via-[#09191d] to-[#040e11] border border-[#163a43] p-6 lg:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
              {/* Channel Avatar */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-[#48e4ff]/50 shadow-xl shrink-0 bg-black">
                <img src={channel.avatar} alt={channel.name} className="w-full h-full object-cover" />
              </div>

              {/* Channel Details */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{channel.name}</h1>
                  {channel.verified && (
                    <span className="p-1 rounded-full bg-cyan-500/20 text-[#48e4ff] border border-cyan-500/40" title="Verified Channel">
                      <Check size={14} />
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-mono text-[#789d9a]">
                  <span className="flex items-center gap-1.5 text-[#48e4ff] font-bold">
                    <Users size={14} />
                    <span>{channel.subscribersFormatted || '1M+ Subscribers'}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <Tv size={14} />
                    <span>{channel.videos.length} Uploads</span>
                  </span>
                </div>

                <p className="text-xs text-zinc-300 max-w-2xl line-clamp-2 leading-relaxed font-sans">
                  {channel.description || `Explore official uploads and recent videos from ${channel.name}.`}
                </p>
              </div>
            </div>

            {/* Filter & Sorting Ribbon */}
            <div className="pt-4 border-t border-[#13353e] flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Internal Channel Video Search */}
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder={`Search ${channel.name}'s videos...`}
                  className="w-full bg-[#051316] border border-[#183a43] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#48e4ff] transition"
                />
              </div>

              {/* Sort By Controls */}
              <div className="flex items-center gap-1.5 bg-[#051316] p-1 rounded-xl border border-[#183a43] shrink-0">
                <button
                  onClick={() => setSortBy('recent')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                    sortBy === 'recent' ? 'bg-[#48e4ff] text-[#051a20]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Most Recent
                </button>
                <button
                  onClick={() => setSortBy('popular')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                    sortBy === 'popular' ? 'bg-[#48e4ff] text-[#051a20]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Most Popular
                </button>
                <button
                  onClick={() => setSortBy('oldest')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                    sortBy === 'oldest' ? 'bg-[#48e4ff] text-[#051a20]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Oldest
                </button>
              </div>
            </div>
          </div>

          {/* Videos Grid */}
          {videos.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 font-mono bg-[#07171a] border border-[#15343c] rounded-3xl">
              No videos matching query &quot;{filterQuery}&quot; found in channel.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {videos.map((video, idx) => (
                <div
                  key={video.id ? `chan_${video.id}_${idx}` : `chan_item_${idx}`}
                  onClick={() => onSelectVideo(video.id)}
                  className="p-4 rounded-3xl bg-[#07171a] border border-[#15343c] hover:border-[#f43f5e] hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between shadow-xl"
                >
                  <div>
                    <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 bg-zinc-900">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-[#f43f5e] flex items-center justify-center text-white shadow-lg shadow-rose-500/40">
                          <Play size={22} className="fill-current ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-mono text-white font-bold">
                        {video.durationText || '3:30'}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white line-clamp-2 group-hover:text-[#f43f5e] transition-colors leading-snug">
                      {video.title}
                    </h3>
                    
                    {/* Explicit Upload Date & View Count */}
                    <div className="text-[11px] font-mono text-[#789d9a] mt-1 flex items-center gap-1">
                      <Calendar size={12} className="text-[#48e4ff]" />
                      <span>{video.publishedText || 'Recently uploaded'}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#122c33] flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span>{video.views || 'HD Stream'}</span>
                    <span className="text-[#f43f5e] font-bold group-hover:translate-x-1 transition-transform">
                      Watch Video →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
