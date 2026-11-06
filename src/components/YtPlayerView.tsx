import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Search,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Plus,
  ExternalLink,
  Youtube,
  Tv,
  ListMusic,
  Share2,
  Server,
  Activity,
  MessageSquare,
  Shield,
  Maximize2,
  Radio,
  Layers,
  Download,
  Sparkles,
  Music,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import screenfull from 'screenfull';
import download from 'downloadjs';
import { colord } from 'colord';
import { YouTubeUrlParser } from '../lib/innertube/parser';
import { Track } from '../types';
import {
  YOUTUBE_PROXY_SERVERS,
  getActiveServerId,
  setActiveServerId,
  getActiveServerNode,
  pingProxyServerNode,
  ProxyServerNode,
} from '../lib/innertube/servers';

interface YtPlayerViewProps {
  onPlayTrack?: (track: Track) => void;
  onAddToVault?: (track: Track) => void;
  onOpenDsp?: () => void;
}

export const YtPlayerView: React.FC<YtPlayerViewProps> = ({
  onPlayTrack,
  onAddToVault,
  onOpenDsp,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [currentVideoId, setCurrentVideoId] = useState('dQw4w9WgXcQ'); // Worldwide streamable showcase
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(false);

  // Video container reference for fullscreen
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Playback Method State (Zero external iframes to bypass school filters)
  const [playMethod, setPlayMethod] = useState<'proxy' | 'audio_studio' | 'cdn_stream'>(() => {
    const saved = localStorage.getItem('yt_play_method');
    if (saved === 'proxy' || saved === 'audio_studio' || saved === 'cdn_stream') {
      return saved;
    }
    return 'proxy';
  });

  // Selected Resolution
  const [selectedResolution, setSelectedResolution] = useState<string>('720p');

  // 12-Node Proxy Servers State
  const [activeServer, setActiveServer] = useState<string>(getActiveServerId());
  const [serverNodes, setServerNodes] = useState<ProxyServerNode[]>(YOUTUBE_PROXY_SERVERS);
  const [showServerModal, setShowServerModal] = useState(false);

  // Comments State
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const [proxyError, setProxyError] = useState(false);

  const handlePlayMethodChange = (method: 'proxy' | 'audio_studio' | 'cdn_stream') => {
    setPlayMethod(method);
    setProxyError(false);
    localStorage.setItem('yt_play_method', method);
  };

  const handleServerChange = (serverId: string) => {
    setActiveServer(serverId);
    setActiveServerId(serverId);
    setProxyError(false);
  };

  const triggerFullscreen = () => {
    if (screenfull.isEnabled && videoContainerRef.current) {
      screenfull.toggle(videoContainerRef.current);
    }
  };

  useEffect(() => {
    loadVideoDetails(currentVideoId);
    setProxyError(false);
  }, [currentVideoId, playMethod, activeServer]);

  const loadVideoDetails = async (videoId: string) => {
    setLoading(true);
    setSavedToVault(false);
    try {
      const res = await fetch(`/api/innertube/video-info?id=${encodeURIComponent(videoId)}`);
      if (res.ok) {
        const data = await res.json();
        setVideoInfo(data);
        if (data.availableResolutions && data.availableResolutions.length > 0) {
          if (!data.availableResolutions.includes(selectedResolution)) {
            setSelectedResolution(data.availableResolutions[0]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load video info:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (videoId: string) => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/invidious/comments?id=${encodeURIComponent(videoId)}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (e) {
      console.error('Failed to load comments:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/innertube/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const parsed = YouTubeUrlParser.parse(urlInput.trim());
    if (parsed && parsed.videoId) {
      setCurrentVideoId(parsed.videoId);
      setUrlInput('');
    } else {
      setSearchQuery(urlInput);
      handleSearch();
    }
  };

  const handleSelectVideo = (videoId: string) => {
    setCurrentVideoId(videoId);
  };

  const handleQueueTrack = () => {
    if (!videoInfo || !onPlayTrack) return;
    const newTrack: Track = {
      id: currentVideoId,
      title: videoInfo.title || 'YouTube Video',
      artist: videoInfo.author || 'YouTube Channel',
      album: 'YouTube Music',
      duration: videoInfo.durationSeconds || 210,
      durationText: videoInfo.durationFormatted || '3:30',
      artwork: videoInfo.thumbnail || `https://i.ytimg.com/vi/${currentVideoId}/hqdefault.jpg`,
      source: 'youtube',
      addedAt: Date.now(),
      streamUrl: `/api/audio/stream?id=${currentVideoId}`,
    };
    onPlayTrack(newTrack);
    if (onOpenDsp) {
      onOpenDsp();
    }
  };

  const handleSaveToVault = () => {
    if (!videoInfo) return;
    const newTrack: Track = {
      id: currentVideoId,
      title: videoInfo.title || 'YouTube Video',
      artist: videoInfo.author || 'YouTube Channel',
      album: 'YouTube Music',
      duration: videoInfo.durationSeconds || 210,
      durationText: videoInfo.durationFormatted || '3:30',
      artwork: videoInfo.thumbnail || `https://i.ytimg.com/vi/${currentVideoId}/hqdefault.jpg`,
      source: 'youtube',
      addedAt: Date.now(),
      streamUrl: `/api/audio/stream?id=${currentVideoId}`,
    };
    if (onAddToVault) onAddToVault(newTrack);
    setSavedToVault(true);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#48e4ff', '#8df5be', '#ff5c8a', '#ffd166'],
      });
    } catch {}

    setTimeout(() => setSavedToVault(false), 3000);
  };

  const handleDownloadManifest = () => {
    if (!videoInfo) return;
    const exportData = {
      id: currentVideoId,
      title: videoInfo.title,
      author: videoInfo.author,
      duration: videoInfo.durationFormatted,
      thumbnail: videoInfo.thumbnail,
      youtubeUrl: `https://www.youtube.com/watch?v=${currentVideoId}`,
      audioStream: `/api/audio/stream?id=${currentVideoId}`,
      exportedAt: new Date().toISOString(),
    };
    download(
      JSON.stringify(exportData, null, 2),
      `${(videoInfo.title || 'video').replace(/[^a-zA-Z0-9]/g, '_')}_manifest.json`,
      'application/json'
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${currentVideoId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeServerNode = serverNodes.find((s) => s.id === activeServer) || serverNodes[0];

  const ambientGlow = colord('#083344').alpha(0.4).toRgbString();

  return (
    <div id="yt-player-page" className="flex-1 flex flex-col min-h-0 bg-black overflow-y-auto">
      {/* Top Bar: URL Input, 12-Server Selector, & Method Selection Slot */}
      <div className="p-4 bg-zinc-950/95 border-b border-zinc-800 sticky top-0 z-30 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        {/* URL Bar */}
        <form onSubmit={handleUrlSubmit} className="flex-1 min-w-[260px] flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="yt-url-input"
              type="text"
              placeholder="Paste any YouTube video link, watch ID, or search..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-cyan-400 focus:outline-none text-zinc-100 placeholder-zinc-500 transition"
            />
          </div>
          <button
            id="yt-load-btn"
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-white transition flex items-center gap-1.5 shadow-md shadow-rose-500/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Play
          </button>
        </form>

        {/* Quick actions & Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 12-Server Matrix Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 transition">
            <Server className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-zinc-400 leading-none">PROXY NODE</span>
              <select
                id="yt-server-select"
                value={activeServer}
                onChange={(e) => handleServerChange(e.target.value)}
                className="bg-transparent text-xs text-cyan-300 font-bold outline-none cursor-pointer border-0 p-0 pr-1 hover:text-cyan-200 transition"
              >
                {serverNodes.map((s) => (
                  <option key={s.id} value={s.id} className="bg-zinc-950 text-zinc-100">
                    {s.name} ({s.region})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Top-Right Playback Method Selection Slot */}
          <div className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 transition">
            <Radio className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-zinc-400 leading-none">PLAY METHOD</span>
              <select
                id="yt-play-method-select"
                value={playMethod}
                onChange={(e) => handlePlayMethodChange(e.target.value as any)}
                className="bg-transparent text-xs text-rose-300 font-bold outline-none cursor-pointer border-0 p-0 pr-1 hover:text-rose-200 transition"
              >
                <option value="proxy" className="bg-zinc-950 text-zinc-100">Decrypted Native (No Embeds)</option>
                <option value="audio_studio" className="bg-zinc-950 text-zinc-100">Studio Audio + DSP (Unblockable)</option>
                <option value="cdn_stream" className="bg-zinc-950 text-zinc-100">Stealth CDN Stream</option>
              </select>
            </div>
          </div>

          {/* Resolution Selector */}
          {videoInfo?.availableResolutions && videoInfo.availableResolutions.length > 0 && (
            <div className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 transition">
              <span className="text-[9px] font-mono text-zinc-400 leading-none">RES</span>
              <select
                value={selectedResolution}
                onChange={(e) => setSelectedResolution(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 font-bold outline-none cursor-pointer border-0 p-0 pr-1 hover:text-white transition"
              >
                {videoInfo.availableResolutions.map((res: string) => (
                  <option key={res} value={res} className="bg-zinc-950 text-zinc-100">
                    {res}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cinema Mode Toggle */}
          <button
            onClick={() => setCinemaMode(!cinemaMode)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 ${
              cinemaMode
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Cinema</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={triggerFullscreen}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 transition flex items-center gap-1.5"
            title="Toggle Fullscreen Video"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {onOpenDsp && (
            <button
              onClick={onOpenDsp}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-purple-300 transition flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Audio DSP</span>
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 transition flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className={`p-4 md:p-6 flex-1 flex flex-col ${cinemaMode ? 'max-w-full' : 'max-w-7xl lg:flex-row'} gap-6 mx-auto w-full transition-all duration-300`}>
        {/* Left Side: Video Screen & Player Details */}
        <div className="flex-1 flex flex-col space-y-4">
          {/* Video Container */}
          <div
            ref={videoContainerRef}
            style={{ boxShadow: `0 20px 50px ${ambientGlow}` }}
            className={`relative w-full ${cinemaMode ? 'h-[75vh]' : 'aspect-video'} bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl transition-all duration-300`}
          >
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-zinc-950 text-cyan-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs font-mono text-zinc-400">Decrypting InnerTube Stream...</span>
              </div>
            ) : proxyError || playMethod === 'audio_studio' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#091f24] to-[#040e11] text-zinc-100 z-10 space-y-4">
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-cyan-500/40 shadow-xl shadow-cyan-500/20 group">
                  <img
                    src={videoInfo?.thumbnail || `https://i.ytimg.com/vi/${currentVideoId}/hqdefault.jpg`}
                    alt={videoInfo?.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                    <Music className="w-10 h-10 text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-1.5 max-w-md">
                  <div className="text-cyan-400 font-mono text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Anti-Detection DSP Audio Stream Active</span>
                  </div>
                  <p className="text-xs text-[#789d9a]">
                    Zero-embed high-fidelity audio direct from backend proxy. 100% immune to school filter iframe blocks and extension scanners.
                  </p>
                </div>
                <audio
                  key={`audio-studio-${currentVideoId}`}
                  src={`/api/audio/stream?id=${currentVideoId}`}
                  controls
                  autoPlay
                  className="w-full max-w-md accent-cyan-400 mt-1"
                />
                <button
                  onClick={() => {
                    setProxyError(false);
                    handlePlayMethodChange('proxy');
                  }}
                  className="px-4 py-2 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-semibold transition"
                >
                  Switch Back to Native Video Stream
                </button>
              </div>
            ) : (
              <video
                key={`${currentVideoId}-${selectedResolution}-${activeServer}-${playMethod}`}
                src={`/api/video/stream?id=${currentVideoId}&res=${selectedResolution}`}
                controls
                autoPlay
                className="w-full h-full object-contain"
                onError={() => {
                  console.warn('[YtPlayerView] Direct video stream throttled by remote node, auto-swapping to Anti-Detection Audio DSP.');
                  setProxyError(true);
                  handlePlayMethodChange('audio_studio');
                }}
              />
            )}
          </div>

          {/* Video Metadata & Controls */}
          {videoInfo && (
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-white leading-snug line-clamp-2">
                    {videoInfo.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-200">{videoInfo.author}</span>
                    {videoInfo.viewCountFormatted && (
                      <>
                        <span>•</span>
                        <span>{videoInfo.viewCountFormatted}</span>
                      </>
                    )}
                    {videoInfo.durationFormatted && (
                      <>
                        <span>•</span>
                        <span>{videoInfo.durationFormatted}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={handleQueueTrack}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play in DSP Audio</span>
                  </button>

                  <button
                    onClick={handleSaveToVault}
                    disabled={savedToVault}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                      savedToVault
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                    }`}
                  >
                    {savedToVault ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Vault</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadManifest}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-200 transition flex items-center gap-1.5"
                    title="Export Track Manifest JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowComments(!showComments);
                      if (!showComments) loadComments(currentVideoId);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                      showComments
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Comments</span>
                  </button>
                </div>
              </div>

              {/* Comments Section */}
              {showComments && (
                <div className="mt-4 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                    <span>Live Video Comments</span>
                    {loadingComments && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                  </div>
                  {comments.length > 0 ? (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {comments.map((c) => (
                        <div key={c.id} className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-cyan-400">{c.author}</span>
                            <span className="text-[10px] text-zinc-500">{c.publishedText}</span>
                          </div>
                          <p className="text-zinc-300 leading-relaxed">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : !loadingComments ? (
                    <div className="text-xs text-zinc-500 italic">No comments retrieved for this stream.</div>
                  ) : null}
                </div>
              )}

              {videoInfo.description && (
                <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/60 text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                  {videoInfo.description}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Search & Related Tracks */}
        <div className="w-full lg:w-96 flex flex-col space-y-4">
          {/* Quick Search */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Search YouTube Music</span>
            </h3>

            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artists, songs..."
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 text-black font-semibold text-xs hover:bg-cyan-400 transition disabled:opacity-50"
              >
                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Go'}
              </button>
            </form>

            {/* Search Results List */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectVideo(item.id)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition group"
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-12 h-9 object-cover rounded-lg shrink-0 border border-zinc-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-cyan-300 truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">{item.author}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related Tracks */}
          {videoInfo?.relatedVideos && videoInfo.relatedVideos.length > 0 && (
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 flex-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                <ListMusic className="w-3.5 h-3.5 text-cyan-400" />
                <span>Up Next & Related</span>
              </h3>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {videoInfo.relatedVideos.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectVideo(item.id)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition group"
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-12 h-9 object-cover rounded-lg shrink-0 border border-zinc-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-cyan-300 truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">{item.author}</div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      {item.duration}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
