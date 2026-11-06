import React, { useState, useEffect } from 'react';
import { Tv, Search, Flame, Play, RefreshCw, Sparkles, Sliders, ExternalLink, User } from 'lucide-react';
import { InvidiousPlayer } from './player/InvidiousPlayer';
import { InvidiousSearch } from './search/InvidiousSearch';
import { InvidiousChannel } from './channel/InvidiousChannel';
import { invidiousHandler, VideoMetadata } from './handler/InvidiousHandler';
import { Track } from '../../types';

interface InvidiousMainProps {
  onPlayAudioOnly: (track: Track) => void;
  onOpenDsp: () => void;
}

export const InvidiousMain: React.FC<InvidiousMainProps> = ({
  onPlayAudioOnly,
  onOpenDsp,
}) => {
  const [activeTab, setActiveTab] = useState<'trending' | 'search' | 'player' | 'channel'>('trending');
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeVideoMetadata, setActiveVideoMetadata] = useState<VideoMetadata | null>(null);
  const [selectedChannelName, setSelectedChannelName] = useState<string | null>(null);
  const [trendingVideos, setTrendingVideos] = useState<any[]>([]);

  useEffect(() => {
    invidiousHandler.getTrending().then(setTrendingVideos);
  }, []);

  const handleLoadVideo = async (videoIdOrUrl: string) => {
    if (!videoIdOrUrl.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const meta = await invidiousHandler.getVideoInfo(videoIdOrUrl);
      setActiveVideoMetadata(meta);
      setActiveTab('player');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load video information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChannel = (channelName: string) => {
    if (!channelName) return;
    setSelectedChannelName(channelName);
    setActiveTab('channel');
  };

  return (
    <div className="space-y-8 select-none pb-24 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#163842] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#f43f5e]/20 border border-[#f43f5e]/40 text-[#f43f5e]">
              <Tv size={18} />
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#f43f5e] font-bold">
              YouTube & Invidious Cinema Node
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            YouTube Video & Live Player
          </h1>
          <p className="text-xs text-[#789d9a] mt-1 max-w-xl">
            Stream high-fidelity 1080p video, decipher audio streams directly, view channel uploads, and route real-time audio through the 5-band Web Audio DSP.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-[#091b20] p-1.5 rounded-2xl border border-[#163942]">
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'trending'
                ? 'bg-[#f43f5e] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Flame size={14} />
            <span>Trending</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'search'
                ? 'bg-[#f43f5e] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Search size={14} />
            <span>Search</span>
          </button>

          {selectedChannelName && (
            <button
              onClick={() => setActiveTab('channel')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'channel'
                  ? 'bg-[#f43f5e] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <User size={14} />
              <span>Channel: {selectedChannelName.slice(0, 12)}...</span>
            </button>
          )}

          {activeVideoMetadata && (
            <button
              onClick={() => setActiveTab('player')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'player'
                  ? 'bg-[#f43f5e] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Tv size={14} />
              <span>Active Video</span>
            </button>
          )}
        </div>
      </div>

      {/* Video URL Loader */}
      <div className="p-5 rounded-2xl bg-[#091b20] border border-[#1a3f4a] shadow-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLoadVideo(urlInput);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste any YouTube URL or Video ID (e.g., https://youtube.com/watch?v=... or FGBhQbmPwH8)..."
            className="flex-1 bg-[#061215] border border-[#183a44] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f43f5e] transition"
          />
          <button
            type="submit"
            disabled={isLoading || !urlInput.trim()}
            className="px-6 py-3 bg-[#f43f5e] hover:bg-[#e11d48] text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shrink-0 disabled:opacity-50 shadow-md shadow-rose-950/40"
          >
            {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            <span>Load Video</span>
          </button>
        </form>

        {errorMessage && (
          <div className="mt-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Tab 1: Video Player Stage */}
      {activeTab === 'player' && activeVideoMetadata && (
        <InvidiousPlayer
          metadata={activeVideoMetadata}
          onSelectVideo={handleLoadVideo}
          onSendToAudioDeck={onPlayAudioOnly}
          onOpenDsp={onOpenDsp}
        />
      )}

      {/* Tab 2: Trending Feed */}
      {activeTab === 'trending' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame size={18} className="text-[#f43f5e]" /> Trending Music & High-Definition Videos
              </h2>
              <p className="text-xs text-[#789d9a]">
                Top broadcast streams and trending audio tracks across global nodes
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trendingVideos.map((video, idx) => (
              <div
                key={video.id ? `trending_${video.id}_${idx}` : `trending_item_${idx}`}
                onClick={() => handleLoadVideo(video.id)}
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

                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectChannel(video.artist);
                    }}
                    className="text-xs text-[#789d9a] hover:text-[#48e4ff] transition-colors mt-1 truncate cursor-pointer font-medium"
                  >
                    {video.artist}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#122c33] flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>{video.views || 'Live Stream'}</span>
                  <span className="text-[#f43f5e] font-bold group-hover:translate-x-1 transition-transform">
                    Watch →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Search */}
      {activeTab === 'search' && (
        <InvidiousSearch
          onSelectVideo={handleLoadVideo}
          onPlayAudioOnly={onPlayAudioOnly}
          onSelectChannel={handleSelectChannel}
        />
      )}

      {/* Tab 4: Channel View */}
      {activeTab === 'channel' && selectedChannelName && (
        <InvidiousChannel
          channelIdOrName={selectedChannelName}
          onBack={() => setActiveTab('search')}
          onSelectVideo={handleLoadVideo}
        />
      )}
    </div>
  );
};
