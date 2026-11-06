import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  MessageSquare,
  ListVideo,
  ExternalLink,
  Plus,
  Check,
  RotateCcw,
  Layers,
  RotateCw,
  PictureInPicture,
  Minimize2,
  Server,
  Loader2,
  Tv,
  Film,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Globe,
  Info,
  ChevronDown,
  ArrowUpRight,
  Code2,
} from 'lucide-react';
import { VideoMetadata, VideoComment, invidiousHandler } from '../handler/InvidiousHandler';
import { Track } from '../../../types';
import { saveTrack } from '../../../lib/db';

interface InvidiousPlayerProps {
  metadata: VideoMetadata | null;
  onSelectVideo: (id: string) => void;
  onSendToAudioDeck: (track: Track) => void;
  onOpenDsp: () => void;
}

export type PlayerMode =
  | 'nerdvpn'
  | 'tiekoetter'
  | 'chocolatemoo'
  | 'f5_si'
  | 'perennial'
  | 'tuxpizza'
  | 'privatecoffee'
  | 'ytify'
  | 'vivid'
  | 'piped'
  | 'yt_nocookie'
  | 'html5_stream'
  | 'nadeko';

interface ServerInfo {
  id: PlayerMode;
  name: string;
  flag: string;
  country: string;
  sourceCodeUrl?: string;
  captcha: string;
  badge?: string;
  protocol: string;
}

export const INVIDIOUS_SERVERS: ServerInfo[] = [
  {
    id: 'nerdvpn',
    name: 'invidious.nerdvpn.de',
    flag: '🇺🇦',
    country: 'Ukraine',
    sourceCodeUrl: 'https://git.nerdvpn.de/NerdVPN.de/invidious',
    captcha: 'None (Clean Embed)',
    badge: 'Recommended',
    protocol: 'Invidious Node',
  },
  {
    id: 'tiekoetter',
    name: 'invidious.tiekoetter.com',
    flag: '🇩🇪',
    country: 'Germany',
    sourceCodeUrl: 'https://github.com/tiekoetter/invidious',
    captcha: 'None (Fast)',
    badge: 'High Speed',
    protocol: 'Invidious Node',
  },
  {
    id: 'chocolatemoo',
    name: 'yt.chocolatemoo53.com',
    flag: '🇺🇸',
    country: 'United States',
    sourceCodeUrl: 'https://git.nadeko.net/Fijxu/invidious',
    captcha: 'None',
    badge: 'US West',
    protocol: 'Invidious Node',
  },
  {
    id: 'f5_si',
    name: 'invidious.f5.si',
    flag: '🇯🇵',
    country: 'Japan',
    sourceCodeUrl: 'https://github.com/iv-org/invidious',
    captcha: 'None',
    badge: 'Asia-Pacific',
    protocol: 'Invidious Node',
  },
  {
    id: 'perennial',
    name: 'invidious.perennialtechtips.com',
    flag: '🇨🇦',
    country: 'Canada',
    sourceCodeUrl: 'https://github.com/iv-org/invidious',
    captcha: 'None',
    badge: 'North America',
    protocol: 'Invidious Node',
  },
  {
    id: 'tuxpizza',
    name: 'inv.tux.pizza',
    flag: '🇫🇷',
    country: 'France',
    sourceCodeUrl: 'https://github.com/iv-org/invidious',
    captcha: 'None',
    badge: 'EU Central',
    protocol: 'Invidious Node',
  },
  {
    id: 'privatecoffee',
    name: 'invidious.private.coffee',
    flag: '🇦🇹',
    country: 'Austria',
    sourceCodeUrl: 'https://github.com/iv-org/invidious',
    captcha: 'None',
    badge: 'EU Privacy',
    protocol: 'Invidious Node',
  },
  {
    id: 'ytify',
    name: 'ytify.pp.ua',
    flag: '🇺🇦',
    country: 'Ukraine',
    sourceCodeUrl: 'https://github.com/ytify/ytify',
    captcha: 'None',
    badge: 'Web Node',
    protocol: 'Ytify Client',
  },
  {
    id: 'vivid',
    name: 'vivid.errexe.xyz',
    flag: '🌐',
    country: 'Global',
    sourceCodeUrl: 'https://github.com/errexe/vivid',
    captcha: 'None',
    badge: 'Web Node',
    protocol: 'Vivid Cinema',
  },
  {
    id: 'piped',
    name: 'piped.video',
    flag: '🛡️',
    country: 'Global Mesh',
    sourceCodeUrl: 'https://github.com/TeamPiped/Piped',
    captcha: 'None',
    badge: 'Piped Mesh',
    protocol: 'Piped Node',
  },
  {
    id: 'yt_nocookie',
    name: 'YouTube HD Privacy Embed',
    flag: '🛡️',
    country: 'Global',
    captcha: 'None',
    badge: 'Zero Cookies',
    protocol: 'Official Privacy',
  },
  {
    id: 'html5_stream',
    name: 'SpotUI Multi-Node Decipher Pipeline',
    flag: '⚡',
    country: 'Decoded Pipeline',
    captcha: 'None',
    badge: 'Web Audio DSP',
    protocol: 'Native Stream',
  },
  {
    id: 'nadeko',
    name: 'inv.nadeko.net',
    flag: '🇨🇱',
    country: 'Chile',
    sourceCodeUrl: 'https://git.nadeko.net/Fijxu/invidious',
    captcha: 'Go-away CAPTCHA',
    badge: 'Go-away Active',
    protocol: 'Invidious Node',
  },
];

export const InvidiousPlayer: React.FC<InvidiousPlayerProps> = ({
  metadata,
  onSelectVideo,
  onSendToAudioDeck,
  onOpenDsp,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Default to nerdvpn (Ukraine) because it is reliable and does not trigger Go-away captcha blocks
  const [playerMode, setPlayerMode] = useState<PlayerMode>(() => {
    try {
      return (localStorage.getItem('spotui_player_mode') as PlayerMode) || 'nerdvpn';
    } catch {
      return 'nerdvpn';
    }
  });

  const [selectedResolution, setSelectedResolution] = useState<string>('720p');
  const [activeTab, setActiveTab] = useState<'related' | 'comments' | 'description' | 'servers' | 'chapters'>('related');
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isTheater, setIsTheater] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [showServerDetails, setShowServerDetails] = useState(false);

  // Extract chapters from description timestamps
  const chapters = React.useMemo(() => {
    if (!metadata?.description) return [];
    const lines = metadata.description.split('\n');
    const result: Array<{ time: number; title: string; text: string }> = [];
    const timePattern = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/;
    for (const line of lines) {
      const match = line.match(timePattern);
      if (match) {
        const h = match[1] ? parseInt(match[1]) : 0;
        const m = parseInt(match[2]);
        const s = parseInt(match[3]);
        const secs = h * 3600 + m * 60 + s;
        const title = line.replace(match[0], '').replace(/^[\s\-–—:]+/, '').trim();
        if (title) {
          result.push({ time: secs, title, text: match[0] });
        }
      }
    }
    return result;
  }, [metadata?.description]);

  // Native Video Player State (for HTML5 stream mode)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<any>(null);

  const handleModeChange = (mode: PlayerMode) => {
    setPlayerMode(mode);
    setStreamError(false);
    try {
      localStorage.setItem('spotui_player_mode', mode);
    } catch {}
  };

  // When metadata changes, reset and load
  useEffect(() => {
    if (metadata?.videoId) {
      setStreamError(false);
      setLoadingComments(true);
      invidiousHandler
        .getComments(metadata.videoId)
        .then(setComments)
        .finally(() => setLoadingComments(false));

      if (videoRef.current && playerMode === 'html5_stream') {
        videoRef.current.currentTime = 0;
        setCurrentTime(0);
        setIsBuffering(true);
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  }, [metadata?.videoId, playerMode]);

  // Handle Fullscreen events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!metadata) {
    return null;
  }

  // Stream URL calculation for HTML5 stream mode
  const videoStreamSrc = `/api/video/stream?id=${metadata.videoId}&res=${selectedResolution}`;

  // Get current embed URL based on selected mode
  const getEmbedSrc = () => {
    switch (playerMode) {
      case 'nerdvpn':
        return `https://invidious.nerdvpn.de/embed/${metadata.videoId}?autoplay=1&quality=${selectedResolution}`;
      case 'tiekoetter':
        return `https://invidious.tiekoetter.com/embed/${metadata.videoId}?autoplay=1&quality=${selectedResolution}`;
      case 'chocolatemoo':
        return `https://yt.chocolatemoo53.com/embed/${metadata.videoId}?autoplay=1&quality=${selectedResolution}`;
      case 'f5_si':
        return `https://invidious.f5.si/embed/${metadata.videoId}?autoplay=1&quality=${selectedResolution}`;
      case 'perennial':
        return `https://invidious.perennialtechtips.com/embed/${metadata.videoId}?autoplay=1&quality=${selectedResolution}`;
      case 'tuxpizza':
        return `https://inv.tux.pizza/embed/${metadata.videoId}?autoplay=1&quality=${selectedResolution}`;
      case 'privatecoffee':
        return `https://invidious.private.coffee/embed/${metadata.videoId}?autoplay=1&quality=${selectedResolution}`;
      case 'ytify':
        return `/api/proxy?url=${encodeURIComponent(`https://ytify.pp.ua/?s=${metadata.videoId}`)}`;
      case 'vivid':
        return `/api/proxy?url=${encodeURIComponent(`https://vivid.errexe.xyz/#/watch?v=${metadata.videoId}`)}`;
      case 'piped':
        return `https://piped.video/embed/${metadata.videoId}?autoplay=1`;
      case 'yt_nocookie':
        return `https://www.youtube-nocookie.com/embed/${metadata.videoId}?autoplay=1&rel=0&enablejsapi=1`;
      case 'nadeko':
        return `https://inv.nadeko.net/embed/${metadata.videoId}?autoplay=1&quality=${selectedResolution}`;
      default:
        return `https://invidious.nerdvpn.de/embed/${metadata.videoId}?autoplay=1`;
    }
  };

  // Get external watch link for the current mode
  const getExternalWatchUrl = () => {
    switch (playerMode) {
      case 'nerdvpn':
        return `https://invidious.nerdvpn.de/watch?v=${metadata.videoId}`;
      case 'tiekoetter':
        return `https://invidious.tiekoetter.com/watch?v=${metadata.videoId}`;
      case 'chocolatemoo':
        return `https://yt.chocolatemoo53.com/watch?v=${metadata.videoId}`;
      case 'f5_si':
        return `https://invidious.f5.si/watch?v=${metadata.videoId}`;
      case 'perennial':
        return `https://invidious.perennialtechtips.com/watch?v=${metadata.videoId}`;
      case 'tuxpizza':
        return `https://inv.tux.pizza/watch?v=${metadata.videoId}`;
      case 'privatecoffee':
        return `https://invidious.private.coffee/watch?v=${metadata.videoId}`;
      case 'ytify':
        return `https://ytify.pp.ua/?s=${metadata.videoId}`;
      case 'vivid':
        return `https://vivid.errexe.xyz/#/watch?v=${metadata.videoId}`;
      case 'piped':
        return `https://piped.video/watch?v=${metadata.videoId}`;
      case 'nadeko':
        return `https://inv.nadeko.net/watch?v=${metadata.videoId}`;
      default:
        return `https://youtube.com/watch?v=${metadata.videoId}`;
    }
  };

  const currentServerInfo = INVIDIOUS_SERVERS.find((s) => s.id === playerMode) || INVIDIOUS_SERVERS[0];

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true));
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || metadata.durationSeconds || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipSeconds = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(videoRef.current.duration || 9999, videoRef.current.currentTime + seconds)
      );
    }
  };

  const handleVolume = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const next = !isMuted;
      setIsMuted(next);
      videoRef.current.muted = next;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleSaveToVault = async () => {
    try {
      const track: Track = {
        id: `yt_${metadata.videoId}`,
        title: metadata.title,
        artist: metadata.author,
        album: 'YouTube Cinema',
        duration: metadata.durationSeconds || 210,
        durationText: metadata.durationFormatted,
        artwork: metadata.thumbnail,
        source: 'youtube',
        addedAt: Date.now(),
        streamUrl: `/api/audio/stream?id=${metadata.videoId}`,
      };
      await saveTrack(track);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendToAudio = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    const track: Track = {
      id: `yt_${metadata.videoId}`,
      title: metadata.title,
      artist: metadata.author,
      album: 'Invidious High-Fidelity Audio',
      duration: metadata.durationSeconds || 210,
      durationText: metadata.durationFormatted || '3:30',
      artwork: metadata.thumbnail,
      source: 'youtube',
      addedAt: Date.now(),
      streamUrl: `/api/audio/stream?id=${metadata.videoId}`,
    };

    onSendToAudioDeck(track);
    if (onOpenDsp) {
      onOpenDsp();
    }
  };

  return (
    <div className={`space-y-6 select-none ${isTheater ? 'max-w-none' : ''}`}>
      {/* SERVER ENGINE SELECTOR RIBBON */}
      <div className="p-4 rounded-3xl bg-[#081b20] border border-[#163c46] shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-[#48e4ff]" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Playback Server Instance:
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#113139] border border-[#1c4955] text-[#48e4ff] font-mono">
              {currentServerInfo.flag} {currentServerInfo.name}
            </span>
          </div>

          <button
            onClick={() => setShowServerDetails(!showServerDetails)}
            className="text-xs text-[#789d9a] hover:text-white flex items-center gap-1 font-mono transition"
          >
            <Info size={13} />
            <span>Instance Details & Source Code</span>
            <ChevronDown size={13} className={`transition-transform ${showServerDetails ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Server Selection Buttons Matrix */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {INVIDIOUS_SERVERS.map((server) => {
            const isActive = playerMode === server.id;
            const isNadeko = server.id === 'nadeko';

            return (
              <button
                key={server.id}
                onClick={() => handleModeChange(server.id)}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer relative ${
                  isActive
                    ? 'bg-[#48e4ff] text-[#051a20] shadow-[0_0_15px_rgba(72,228,255,0.4)]'
                    : isNadeko
                    ? 'text-amber-300 hover:text-white bg-[#141d15] border border-amber-900/40 hover:bg-[#1f2e1a]'
                    : 'text-zinc-300 hover:text-white bg-[#061518] hover:bg-[#0d2930] border border-[#13343c]'
                }`}
              >
                <span>{server.flag}</span>
                <span>{server.name}</span>
                {server.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-sans uppercase font-bold ${
                      isActive
                        ? 'bg-black/20 text-black'
                        : isNadeko
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-cyan-500/20 text-cyan-300'
                    }`}
                  >
                    {server.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Informative Go-away CAPTCHA Warning when Nadeko is Selected */}
        {playerMode === 'nadeko' && (
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Go-away CAPTCHA Notice: </span>
                <span className="text-amber-300/90">
                  <code className="bg-black/40 px-1 py-0.5 rounded text-[11px]">inv.nadeko.net</code> enforces a strict
                  anti-bot administrative rule that blocks external iframes. If you see{' '}
                  <i>&quot;access denied: denied by administrative rule&quot;</i>, switch to one of the unblocked nodes below:
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleModeChange('nerdvpn')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition"
              >
                🇺🇦 Switch to NerdVPN
              </button>
              <button
                onClick={() => handleModeChange('tiekoetter')}
                className="px-2.5 py-1.5 rounded-lg bg-[#48e4ff] text-black font-bold text-xs hover:bg-cyan-300 transition"
              >
                🇩🇪 Switch to Tiekoetter
              </button>
            </div>
          </div>
        )}

        {/* Expandable Server Instance Table with Git Source Codes & Details */}
        {showServerDetails && (
          <div className="p-4 rounded-2xl bg-[#040e11] border border-[#143943] text-xs space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase tracking-wider font-mono text-[11px]">
                Public Invidious & Web Player Network Directory
              </span>
              <span className="text-[11px] text-[#789d9a] font-mono">Sorted chronologically</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {INVIDIOUS_SERVERS.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleModeChange(s.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    playerMode === s.id
                      ? 'bg-[#0d2a32] border-[#48e4ff]'
                      : 'bg-[#07171b] border-[#13353e] hover:border-[#48e4ff]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span>{s.flag}</span>
                        <span>{s.name}</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#48e4ff]">{s.country}</span>
                    </div>

                    <div className="mt-1.5 space-y-1 text-[11px] text-[#789d9a]">
                      <div>Protocol: <span className="text-zinc-300">{s.protocol}</span></div>
                      <div>
                        CAPTCHA:{' '}
                        <span className={s.captcha.includes('Go-away') ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                          {s.captcha}
                        </span>
                      </div>
                    </div>
                  </div>

                  {s.sourceCodeUrl && (
                    <div className="mt-3 pt-2 border-t border-[#122e36] flex items-center justify-between">
                      <a
                        href={s.sourceCodeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-[#48e4ff] hover:underline flex items-center gap-1 font-mono"
                      >
                        <Code2 size={11} />
                        <span>Source Code</span>
                        <ArrowUpRight size={10} />
                      </a>
                      <button
                        onClick={() => handleModeChange(s.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          playerMode === s.id ? 'bg-[#48e4ff] text-black' : 'bg-[#102d35] text-zinc-300'
                        }`}
                      >
                        {playerMode === s.id ? 'Active' : 'Select'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* VIDEO STAGE CONTAINER */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className={`relative bg-[#020608] border border-[#14343d] rounded-3xl overflow-hidden shadow-2xl group ${
          isFullscreen ? 'w-screen h-screen rounded-none border-0' : 'w-full aspect-video'
        }`}
      >
        {playerMode === 'html5_stream' && !streamError ? (
          <>
            {/* Real HTML5 Video Element with Stream Proxy */}
            <video
              ref={videoRef}
              src={videoStreamSrc}
              poster={metadata.thumbnail}
              crossOrigin="anonymous"
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => {
                setIsBuffering(false);
                setIsPlaying(true);
              }}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                if (metadata.relatedVideos && metadata.relatedVideos.length > 0) {
                  onSelectVideo(metadata.relatedVideos[0].id);
                }
              }}
              onError={() => {
                console.warn('HTML5 Stream blocked or rate-limited. Auto-routing to NerdVPN Invidious Node...');
                setStreamError(true);
                handleModeChange('nerdvpn');
              }}
              onClick={togglePlay}
              className="w-full h-full object-contain cursor-pointer"
            />

            {/* Buffering Indicator */}
            {isBuffering && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none z-10">
                <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#05161a]/90 border border-[#1b434e] text-[#48e4ff]">
                  <Loader2 size={36} className="animate-spin text-[#48e4ff]" />
                  <span className="text-xs font-mono font-bold tracking-wider">Streaming Video Chunks...</span>
                </div>
              </div>
            )}

            {/* Big Center Play Overlay (when paused) */}
            {!isPlaying && !isBuffering && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-[#48e4ff]/90 text-[#051a20] flex items-center justify-center shadow-[0_0_40px_rgba(72,228,255,0.6)] hover:scale-110 transition-transform cursor-pointer z-10"
              >
                <Play size={36} fill="currentColor" className="ml-1" />
              </button>
            )}

            {/* Custom Video Overlay Controls Bar */}
            <div
              className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 transition-opacity duration-300 z-20 ${
                showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Timeline Scrubber */}
              <div className="space-y-1 mb-3">
                <div className="relative w-full flex items-center group/scrubber">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-[#1b3d45] rounded-lg appearance-none cursor-pointer accent-[#48e4ff] hover:h-2.5 transition-all"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span className="text-[#48e4ff] font-bold">{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded-xl bg-[#091f24] hover:bg-[#12363f] text-[#48e4ff] border border-[#19404a] transition"
                  >
                    {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                  </button>

                  <button
                    onClick={() => skipSeconds(-10)}
                    className="p-2 rounded-xl bg-[#091f24] hover:bg-[#12363f] text-zinc-300 hover:text-white border border-[#19404a] transition"
                  >
                    <RotateCcw size={15} />
                  </button>

                  <button
                    onClick={() => skipSeconds(10)}
                    className="p-2 rounded-xl bg-[#091f24] hover:bg-[#12363f] text-zinc-300 hover:text-white border border-[#19404a] transition"
                  >
                    <RotateCw size={15} />
                  </button>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2 bg-[#091f24] px-3 py-1.5 rounded-xl border border-[#19404a]">
                    <button onClick={toggleMute} className="text-zinc-300 hover:text-white">
                      {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolume(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-[#163942] rounded-lg appearance-none cursor-pointer accent-[#48e4ff]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendToAudio}
                    className="px-3 py-1 bg-[#0d262d] hover:bg-[#163a44] text-[#48e4ff] border border-[#1a4955] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Sliders size={13} />
                    <span className="hidden sm:inline">Route DSP</span>
                  </button>

                  <button
                    onClick={togglePictureInPicture}
                    className="p-1.5 bg-[#091f24] hover:bg-[#12363f] text-zinc-300 hover:text-white rounded-xl border border-[#19404a] transition"
                  >
                    <PictureInPicture size={15} />
                  </button>

                  <button
                    onClick={() => setIsTheater(!isTheater)}
                    className="p-1.5 bg-[#091f24] hover:bg-[#12363f] text-zinc-300 hover:text-white rounded-xl border border-[#19404a] transition"
                  >
                    <Layers size={15} />
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 bg-[#091f24] hover:bg-[#12363f] text-zinc-300 hover:text-white rounded-xl border border-[#19404a] transition"
                  >
                    {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Real Invidious & Web Player Embedded Node with Sandboxed Protection */
          <div className="w-full h-full relative flex items-center justify-center bg-black rounded-3xl overflow-hidden">
            <iframe
              key={`invidious-embed-${playerMode}-${metadata.videoId}-${selectedResolution}`}
              src={getEmbedSrc()}
              title={metadata.title}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-top-navigation-by-user-activation"
              className="w-full h-full border-0"
            />
          </div>
        )}
      </div>

      {/* Video Details & Meta Ribbon */}
      <div className="p-6 rounded-3xl bg-[#07161a] border border-[#15343c] space-y-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#122c33] pb-5">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
              {metadata.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#789d9a]">
              <span className="font-semibold text-white">{metadata.author}</span>
              <span>•</span>
              <span className="font-mono">{metadata.viewCountFormatted || 'Live HD Stream'}</span>
              <span>•</span>
              <span className="font-mono">{metadata.durationFormatted || 'YouTube Video'}</span>
              <span>•</span>
              <span className="font-mono text-[#48e4ff]">
                Node: {currentServerInfo.flag} {currentServerInfo.name}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveToVault}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                isSaved
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-[#091f24] hover:bg-[#12363f] text-white border-[#19404a]'
              }`}
            >
              {isSaved ? <Check size={14} /> : <Plus size={14} />}
              <span>{isSaved ? 'Vaulted Track' : 'Save to Vault'}</span>
            </button>

            <button
              onClick={handleSendToAudio}
              className="px-4 py-2.5 bg-[#0d262d] hover:bg-[#143d48] text-[#48e4ff] border border-[#1a4b57] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Sliders size={14} />
              <span>Route into 5-Band DSP</span>
            </button>

            <a
              href={getExternalWatchUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-[#091f24] hover:bg-[#12363f] text-[#48e4ff] hover:text-white border border-[#19404a] text-xs font-bold font-mono transition flex items-center gap-1.5"
              title="Open direct on active server"
            >
              <span>{currentServerInfo.flag} Open on {currentServerInfo.name}</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Tab Switcher for Bottom Section */}
        <div className="flex items-center gap-2 border-b border-[#122c33] pb-3">
          <button
            onClick={() => setActiveTab('related')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'related'
                ? 'bg-[#f43f5e] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListVideo size={14} />
            <span>Up Next & Related ({metadata.relatedVideos?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'comments'
                ? 'bg-[#f43f5e] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MessageSquare size={14} />
            <span>Comments ({comments.length || (metadata as any).commentCount || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('description')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'description'
                ? 'bg-[#f43f5e] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            <span>Description</span>
          </button>

          <button
            onClick={() => setActiveTab('servers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'servers'
                ? 'bg-[#f43f5e] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Server size={14} />
            <span>Servers ({INVIDIOUS_SERVERS.length})</span>
          </button>

          {chapters.length > 0 && (
            <button
              onClick={() => setActiveTab('chapters')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'chapters'
                  ? 'bg-[#f43f5e] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Zap size={14} />
              <span>Chapters ({chapters.length})</span>
            </button>
          )}
        </div>

        {/* Tab 0: Chapters */}
        {activeTab === 'chapters' && (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            <div className="text-xs text-zinc-400 mb-3">
              Click any chapter timestamp below to jump to that section:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {chapters.map((ch, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = ch.time;
                      setCurrentTime(ch.time);
                    }
                  }}
                  className="p-3 rounded-xl bg-[#091b20] border border-[#163640] hover:border-[#f43f5e] cursor-pointer flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-[#f43f5e]/20 text-[#f43f5e] font-mono text-[11px] font-bold">
                      {ch.text}
                    </span>
                    <span className="text-xs text-white group-hover:text-[#f43f5e] transition font-medium">
                      {ch.title}
                    </span>
                  </div>
                  <Play size={12} className="text-zinc-500 group-hover:text-white transition" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Related Videos */}
        {activeTab === 'related' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(metadata.relatedVideos || []).map((rel, idx) => (
              <div
                key={rel.id ? `rel_${rel.id}_${idx}` : `rel_item_${idx}`}
                onClick={() => onSelectVideo(rel.id)}
                className="p-3 rounded-2xl bg-[#091b20] border border-[#163640] hover:border-[#f43f5e] transition cursor-pointer flex gap-3 group"
              >
                <div className="relative w-28 h-18 rounded-xl overflow-hidden bg-black shrink-0">
                  <img src={rel.thumbnail} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white">
                    {rel.duration || '3:30'}
                  </span>
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-white line-clamp-2 leading-snug group-hover:text-[#f43f5e] transition-colors">
                      {rel.title}
                    </h4>
                    <p className="text-[11px] text-[#789d9a] truncate mt-0.5">{rel.author}</p>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">Play Next</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Comments */}
        {activeTab === 'comments' && (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {loadingComments ? (
              <div className="p-8 text-center text-xs font-mono text-[#48e4ff] flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Decrypting community comments stream...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 font-mono">
                No comments available for this broadcast.
              </div>
            ) : (
              comments.map((c, i) => (
                <div key={c.id ? `comment_${c.id}_${i}` : `comment_${i}`} className="p-3.5 rounded-2xl bg-[#091b20] border border-[#163640] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{c.author}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{c.publishedText}</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{c.content}</p>
                  {c.likeCount > 0 && (
                    <div className="text-[10px] font-mono text-[#48e4ff]">
                      👍 {c.likeCount.toLocaleString()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Description */}
        {activeTab === 'description' && (
          <div className="p-4 rounded-2xl bg-[#091b20] border border-[#163640] text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto font-sans">
            {metadata.description || 'No description provided by creator.'}
          </div>
        )}

        {/* Tab 4: Server Matrix */}
        {activeTab === 'servers' && (
          <div className="space-y-4">
            <div className="text-xs text-zinc-400">
              Select any public Invidious or Web Player server to switch your active stream routing instantaneously:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {INVIDIOUS_SERVERS.map((srv) => (
                <div
                  key={srv.id}
                  onClick={() => handleModeChange(srv.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    playerMode === srv.id
                      ? 'bg-[#0e2a32] border-[#48e4ff]'
                      : 'bg-[#081a1f] border-[#15363e] hover:border-[#48e4ff]/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{srv.flag}</span>
                        <span>{srv.name}</span>
                      </span>
                      {srv.badge && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#163a44] text-[#48e4ff]">
                          {srv.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400">Region: {srv.country}</div>
                    <div className="text-xs text-zinc-400 mt-1">
                      CAPTCHA status:{' '}
                      <span className={srv.captcha.includes('Go-away') ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                        {srv.captcha}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#122e36] flex items-center justify-between">
                    {srv.sourceCodeUrl ? (
                      <a
                        href={srv.sourceCodeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-[#48e4ff] hover:underline flex items-center gap-1 font-mono"
                      >
                        <span>Git Repository</span>
                        <ArrowUpRight size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-600 font-mono">Official</span>
                    )}

                    <button
                      onClick={() => handleModeChange(srv.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold ${
                        playerMode === srv.id
                          ? 'bg-[#48e4ff] text-black font-mono'
                          : 'bg-[#102d35] text-zinc-300 hover:text-white'
                      }`}
                    >
                      {playerMode === srv.id ? 'Active' : 'Switch'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
