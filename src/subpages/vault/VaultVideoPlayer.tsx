import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Minimize2,
  Sliders,
  Sparkles,
  Layers,
  Camera,
  Repeat,
  Download,
  Upload,
  Settings2,
  Info,
  Check,
  Zap,
  Activity,
  Tv,
  Radio,
  FileVideo,
  Monitor,
  ExternalLink,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Shield,
  RefreshCw,
  Cpu,
  Scissors,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  Plus,
  Trash2,
  Clock,
  Gauge,
  Sun,
  Contrast,
  Palette,
  Compass,
} from 'lucide-react';
import { AppSettings } from '../../types';

export type PlaybackEngine =
  | 'hls_js'
  | 'html5_native'
  | 'dash_shaka'
  | 'mse_streamer'
  | 'canvas_shader'
  | 'webaudio_dsp'
  | 'p2p_torrent'
  | 'invidious_proxy'
  | 'worker_crypto'
  | 'yt_embed';

export interface EngineInfo {
  id: PlaybackEngine;
  name: string;
  badge: string;
  description: string;
  flag: string;
  supportedFormats: string[];
}

export const PLAYBACK_ENGINES: EngineInfo[] = [
  {
    id: 'hls_js',
    name: 'HLS.js Adaptive Engine',
    badge: 'v1.7.2 Core',
    description: 'Hardware-accelerated HTTP Live Streaming (.m3u8) with adaptive bitrate switching and fragment metrics.',
    flag: '⚡',
    supportedFormats: ['.m3u8', 'HLS Live', 'VOD TS', 'fMP4'],
  },
  {
    id: 'html5_native',
    name: 'HTML5 Native Media Engine',
    badge: 'Hardware Direct',
    description: 'Direct browser pipeline for MP4, WebM, OGG, and MOV with HTTP range-request byte streaming.',
    flag: '🚀',
    supportedFormats: ['MP4', 'WebM', 'OGG', 'MOV'],
  },
  {
    id: 'dash_shaka',
    name: 'MPEG-DASH Manifest Engine',
    badge: 'DASH/Shaka',
    description: 'Segmented Dynamic Adaptive Streaming over HTTP (.mpd) with multi-period buffering.',
    flag: '🌐',
    supportedFormats: ['.mpd', 'DASH', 'Segmented XML'],
  },
  {
    id: 'mse_streamer',
    name: 'MSE Custom Buffer Pipeline',
    badge: 'MediaSource',
    description: 'Low-level MediaSource Extensions (MSE) buffer feeder with custom chunk size and memory control.',
    flag: '🧩',
    supportedFormats: ['fMP4 Chunks', 'WebM Byte Streams'],
  },
  {
    id: 'canvas_shader',
    name: 'Canvas 2D / WebGL Shader Frame Engine',
    badge: 'CRT & Filters',
    description: 'Renders video frames onto a 60 FPS Canvas with real-time post-processing shaders (CRT scanlines, neon, HDR).',
    flag: '🎨',
    supportedFormats: ['Canvas Frame Buffer', 'WebGL Post-FX'],
  },
  {
    id: 'webaudio_dsp',
    name: 'Web Audio DSP 5-Band Studio Engine',
    badge: 'DSP Parametric',
    description: 'Directly hooks video audio output to parametric equalization, spatial widening, and dynamic compression.',
    flag: '🎚️',
    supportedFormats: ['Decoupled Audio', 'Studio Mastered'],
  },
  {
    id: 'p2p_torrent',
    name: 'Decentralized P2P Streamer Simulator',
    badge: 'WebSeed / Swarm',
    description: 'Emulates decentralized mesh piece streaming, swarm peer statistics, and chunk integrity verification.',
    flag: '📡',
    supportedFormats: ['Magnet URI', 'InfoHash', 'WebSeed'],
  },
  {
    id: 'invidious_proxy',
    name: 'Invidious / Piped Multi-Node Streamer',
    badge: 'Stealth Relay',
    description: 'Extracts and streams video streams through privacy proxy nodes with zero tracking.',
    flag: '🛡️',
    supportedFormats: ['YouTube ID', 'Invidious API', 'Piped'],
  },
  {
    id: 'worker_crypto',
    name: 'Web Worker Crypto De-obfuscator',
    badge: 'Wasm / Worker',
    description: 'Offloads stream decryption, byte desynchronization, and cipher reversing to dedicated background worker threads.',
    flag: '🔐',
    supportedFormats: ['Encrypted Blobs', 'De-obfuscated'],
  },
  {
    id: 'yt_embed',
    name: 'Universal Privacy IFrame Sandbox',
    badge: 'Zero-Cookie',
    description: 'Sandboxed embed engine with automatic ad-blocking, fullscreen, and PiP capabilities.',
    flag: '📺',
    supportedFormats: ['Universal Embed', 'No-Cookie Embed'],
  },
];

export interface SampleStream {
  id: string;
  title: string;
  category: string;
  url: string;
  engine: PlaybackEngine;
  resolution: string;
  duration: string;
  thumbnail: string;
}

export const SAMPLE_STREAMS: SampleStream[] = [
  {
    id: 'bbb_hls',
    title: 'Big Buck Bunny (1080p HLS)',
    category: 'Open Animation Cinema',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    engine: 'hls_js',
    resolution: '1080p 60FPS',
    duration: '9:56',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80',
  },
  {
    id: 'tears_of_steel',
    title: 'Tears of Steel (4K Sci-Fi Short)',
    category: 'Blender VFX Cinema',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    engine: 'html5_native',
    resolution: '4K Ultra HD',
    duration: '12:14',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80',
  },
  {
    id: 'sintel_dash',
    title: 'Sintel: The Dragon Hunt (HLS/DASH)',
    category: 'Fantasy Adventure',
    url: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    engine: 'hls_js',
    resolution: '1080p HD',
    duration: '14:48',
    thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80',
  },
  {
    id: 'elephants_dream',
    title: "Elephant's Dream (Sci-Fi Surreal)",
    category: 'Open Movie Project',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    engine: 'html5_native',
    resolution: '1080p Full HD',
    duration: '10:53',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&q=80',
  },
  {
    id: 'cosmic_laundromat',
    title: 'Cosmic Laundromat (Sci-Fi Comedy)',
    category: 'Blender Institute',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    engine: 'html5_native',
    resolution: '1080p HD',
    duration: '0:15',
    thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=500&q=80',
  },
];

export interface ChapterMarker {
  id: string;
  time: number;
  label: string;
}

export interface VaultVideoPlayerProps {
  onClose: () => void;
  onOpenDsp?: () => void;
  initialUrl?: string;
  initialTitle?: string;
  settings?: AppSettings;
}

export const VaultVideoPlayer: React.FC<VaultVideoPlayerProps> = ({
  onClose,
  initialUrl,
  initialTitle,
  settings,
}) => {
  // Core Stream & Engine State
  const [streamUrl, setStreamUrl] = useState<string>(
    initialUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
  );
  const [activeEngine, setActiveEngine] = useState<PlaybackEngine>(
    initialUrl?.includes('.m3u8') ? 'hls_js' : 'html5_native'
  );
  const [videoTitle, setVideoTitle] = useState<string>(
    initialTitle || (initialUrl ? 'Vault Local Video' : 'Big Buck Bunny (1080p HLS)')
  );
  const [customInputUrl, setCustomInputUrl] = useState<string>('');

  // Player Elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const subtitleInputRef = useRef<HTMLInputElement | null>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.9);
  const [audioBoost, setAudioBoost] = useState<number>(1.0); // 1.0 = 100%, 3.0 = 300%
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '21:9' | 'fit' | 'fill'>('16:9');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);

  // A-B Repeat Loop
  const [loopPointA, setLoopPointA] = useState<number | null>(null);
  const [loopPointB, setLoopPointB] = useState<number | null>(null);

  // Custom Video Shaders / Color Grading
  const [brightness, setBrightness] = useState<number>(100); // 50 - 200%
  const [contrast, setContrast] = useState<number>(100); // 50 - 200%
  const [saturation, setSaturation] = useState<number>(100); // 0 - 300%
  const [sepia, setSepia] = useState<number>(0); // 0 - 100%
  const [invert, setInvert] = useState<number>(0); // 0 - 100%
  const [hueRotate, setHueRotate] = useState<number>(0); // 0 - 360 deg
  const [blurPx, setBlurPx] = useState<number>(0); // 0 - 10px
  const [crtMode, setCrtMode] = useState<boolean>(false);
  const [filmGrain, setFilmGrain] = useState<boolean>(false);
  const [ambientGlow, setAmbientGlow] = useState<boolean>(true);

  // Subtitles & Markers
  const [subtitlesText, setSubtitlesText] = useState<string | null>(null);
  const [subtitleOffsetSec, setSubtitleOffsetSec] = useState<number>(0);
  const [subtitleSize, setSubtitleSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [chapterMarkers, setChapterMarkers] = useState<ChapterMarker[]>([]);
  const [newMarkerLabel, setNewMarkerLabel] = useState<string>('');

  // HUD & Modals
  const [videoBitrate, setVideoBitrate] = useState<string>('Auto (Adaptive)');
  const [bufferLength, setBufferLength] = useState<number>(0);
  const [droppedFrames, setDroppedFrames] = useState<number>(0);
  const [showMetricsHud, setShowMetricsHud] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [snapshotNotice, setSnapshotNotice] = useState<string | null>(null);

  // Web Audio Booster Node
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const initAudioBooster = () => {
    if (!videoRef.current || audioCtxRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(audioBoost, ctx.currentTime);
      const source = ctx.createMediaElementSource(videoRef.current);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      audioCtxRef.current = ctx;
      gainNodeRef.current = gainNode;
      sourceNodeRef.current = source;
    } catch (e) {
      // Browser may restrict multiple source creation on same element
    }
  };

  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(audioBoost, audioCtxRef.current.currentTime);
    }
  }, [audioBoost]);

  // Compute CSS filter string
  const computedFilterStyle = useMemo(() => {
    const filters: string[] = [];
    if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
    if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
    if (saturation !== 100) filters.push(`saturate(${saturation}%)`);
    if (sepia > 0) filters.push(`sepia(${sepia}%)`);
    if (invert > 0) filters.push(`invert(${invert}%)`);
    if (hueRotate > 0) filters.push(`hue-rotate(${hueRotate}deg)`);
    if (blurPx > 0) filters.push(`blur(${blurPx}px)`);
    return filters.join(' ') || 'none';
  }, [brightness, contrast, saturation, sepia, invert, hueRotate, blurPx]);

  // Ambient Backlight Canvas Loop
  useEffect(() => {
    if (!ambientGlow) return;
    let animId: number;
    const canvas = ambientCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const drawAmbient = () => {
      try {
        if (!video.paused && !video.ended && video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
      } catch {}
      animId = requestAnimationFrame(drawAmbient);
    };

    animId = requestAnimationFrame(drawAmbient);
    return () => cancelAnimationFrame(animId);
  }, [ambientGlow]);

  // Stream Loader
  const loadStream = useCallback((url: string, engine: PlaybackEngine, title?: string) => {
    if (!url) return;
    setStreamUrl(url);
    setActiveEngine(engine);
    if (title) setVideoTitle(title);
    setIsBuffering(true);

    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    const video = videoRef.current;
    if (!video) return;

    if (engine === 'hls_js' || url.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          setIsBuffering(false);
          setVideoBitrate(`${data.levels.length} Adaptive Levels`);
          video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });
        hls.on(Hls.Events.ERROR, (_, errData) => {
          if (errData.fatal) {
            hls.destroy();
            video.src = url;
            video.play().catch(() => {});
          }
        });
        hlsInstanceRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play().catch(() => {});
      }
    } else {
      video.src = url;
      video.load();
      video.play().then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
      }).catch(() => {
        setIsPlaying(false);
        setIsBuffering(false);
      });
    }
  }, []);

  useEffect(() => {
    loadStream(streamUrl, activeEngine, videoTitle);
    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
      }
    };
  }, []);

  // Buffer and Frame Drop HUD
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video) {
        if (video.buffered.length > 0) {
          const end = video.buffered.end(video.buffered.length - 1);
          setBufferLength(Math.max(0, Math.round(end - video.currentTime)));
        }
        if ((video as any).getVideoPlaybackQuality) {
          const q = (video as any).getVideoPlaybackQuality();
          setDroppedFrames(q.droppedVideoFrames || 0);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Time Update and A-B Loop Enforcer
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);

    if (loopPointB !== null && loopPointA !== null && video.currentTime >= loopPointB) {
      video.currentTime = loopPointA;
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    initAudioBooster();
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, newTime));
    setCurrentTime(video.currentTime);
  };

  const handleStepFrame = (frames: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    const frameDuration = 1 / 30; // standard 30fps
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + frames * frameDuration));
    setCurrentTime(video.currentTime);
  };

  const handleSetSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    setIsMuted(v === 0);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
  };

  // High-Res Snapshot Capture
  const captureScreenshot = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = video.videoWidth || 1920;
      snapCanvas.height = video.videoHeight || 1080;
      const ctx = snapCanvas.getContext('2d');
      if (ctx) {
        ctx.filter = computedFilterStyle;
        ctx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
        const dataUrl = snapCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `snapshot_${videoTitle.replace(/[^a-z0-9]/gi, '_')}_${Math.floor(currentTime)}s.png`;
        link.href = dataUrl;
        link.click();
        setSnapshotNotice('Snapshot captured & downloaded in full resolution!');
        setTimeout(() => setSnapshotNotice(null), 3000);
      }
    } catch (e) {
      setSnapshotNotice('Snapshot blocked by CORS stream restrictions');
      setTimeout(() => setSnapshotNotice(null), 3000);
    }
  };

  // Chapter Marker Handlers
  const handleAddMarker = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newMarkerLabel.trim() || `Bookmark @ ${formatTime(currentTime)}`;
    const newMarker: ChapterMarker = {
      id: `mark_${Date.now()}`,
      time: currentTime,
      label,
    };
    setChapterMarkers((prev) => [...prev, newMarker].sort((a, b) => a.time - b.time));
    setNewMarkerLabel('');
  };

  const handleDeleteMarker = (id: string) => {
    setChapterMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  // Local Video Upload
  const handleLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      loadStream(blobUrl, 'html5_native', file.name);
    }
  };

  // Local Subtitle File Upload
  const handleSubtitleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSubtitlesText(event.target?.result as string);
        setSnapshotNotice(`Subtitles loaded: ${file.name}`);
        setTimeout(() => setSnapshotNotice(null), 2500);
      };
      reader.readAsText(file);
    }
  };

  // Reset Video Filters
  const handleResetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSepia(0);
    setInvert(0);
    setHueRotate(0);
    setBlurPx(0);
    setCrtMode(false);
    setFilmGrain(false);
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen?.();
            setIsFullscreen(true);
          } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
          }
          break;
        case 't':
          e.preventDefault();
          setIsTheaterMode((prev) => !prev);
          break;
        case 'm':
          e.preventDefault();
          handleToggleMute();
          break;
        case 'j':
        case 'arrowleft':
          e.preventDefault();
          handleSeek(currentTime - (e.key === 'j' ? 10 : 5));
          break;
        case 'l':
        case 'arrowright':
          e.preventDefault();
          handleSeek(currentTime + (e.key === 'l' ? 10 : 5));
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case ',':
          e.preventDefault();
          handleStepFrame(-1);
          break;
        case '.':
          e.preventDefault();
          handleStepFrame(1);
          break;
        case 's':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            captureScreenshot();
          }
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsModal((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, isPlaying, volume, isMuted]);

  const formatTime = (s: number) => {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const currentEngineObj = PLAYBACK_ENGINES.find((e) => e.id === activeEngine) || PLAYBACK_ENGINES[0];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#030709] flex flex-col overflow-hidden animate-in fade-in duration-200 select-none text-zinc-100 font-sans"
    >
      {/* Hidden File Pickers */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLocalFile}
        accept="video/*,.mp4,.mkv,.webm,.mov,.avi,.m3u8,.ts"
        className="hidden"
      />
      <input
        type="file"
        ref={subtitleInputRef}
        onChange={handleSubtitleFile}
        accept=".vtt,.srt,.txt"
        className="hidden"
      />

      {/* Top Header Bar */}
      <header className="h-14 border-b border-zinc-800/80 px-4 sm:px-6 bg-zinc-950/90 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Film size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide truncate max-w-xs sm:max-w-md">
                {videoTitle}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                {currentEngineObj.badge}
              </span>
            </div>
          </div>
        </div>

        {/* Top Header Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            title="Open local video file"
          >
            <Upload size={13} />
            <span className="hidden sm:inline">Open File</span>
          </button>

          <button
            onClick={captureScreenshot}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            title="Capture full resolution screenshot (S)"
          >
            <Camera size={13} />
            <span className="hidden md:inline">Snapshot</span>
          </button>

          <button
            onClick={() => setShowFiltersModal(true)}
            className={`px-3 py-1.5 rounded-lg border text-xs transition flex items-center gap-1.5 cursor-pointer ${
              computedFilterStyle !== 'none' || crtMode || filmGrain
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
            title="Video Color Filters & Shaders"
          >
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <button
            onClick={() => setShowMetricsHud(!showMetricsHud)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition flex items-center gap-1.5 cursor-pointer ${
              showMetricsHud ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
            title="HUD Telemetry"
          >
            <Activity size={13} />
            <span className="hidden md:inline">Stats</span>
          </button>

          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle size={15} />
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 text-xs font-medium transition cursor-pointer"
          >
            ✕ Close
          </button>
        </div>
      </header>

      {/* Snapshot Toast Notice */}
      {snapshotNotice && (
        <div className="absolute top-16 right-6 z-50 px-4 py-2 bg-zinc-900/95 border border-cyan-500/40 text-cyan-300 text-xs font-mono rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2">
          {snapshotNotice}
        </div>
      )}

      {/* Main Work Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Stage Area */}
        <div className={`flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-4 ${isTheaterMode ? 'max-w-full' : ''}`}>
          
          {/* Ambient Video Wrapper */}
          <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl flex items-center justify-center group min-h-[340px] sm:min-h-[460px]">
            {/* Ambient Backlight Canvas */}
            {ambientGlow && (
              <canvas
                ref={ambientCanvasRef}
                width={64}
                height={36}
                className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-50 pointer-events-none scale-110"
              />
            )}

            {/* CRT Scanline Overlay */}
            {crtMode && (
              <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px]" />
            )}

            {/* Film Grain Overlay */}
            {filmGrain && (
              <div className="absolute inset-0 pointer-events-none z-20 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[length:3px_3px]" />
            )}

            {/* Video Element */}
            <video
              ref={videoRef}
              playsInline
              crossOrigin="anonymous"
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onClick={togglePlay}
              style={{ filter: computedFilterStyle }}
              className={`w-full max-h-[72vh] relative z-10 transition-all cursor-pointer ${
                aspectRatio === '16:9'
                  ? 'aspect-video object-contain'
                  : aspectRatio === '21:9'
                  ? 'aspect-[21/9] object-contain'
                  : aspectRatio === '4:3'
                  ? 'aspect-[4/3] object-contain'
                  : aspectRatio === 'fill'
                  ? 'w-full h-full object-cover'
                  : 'object-contain'
              }`}
            />

            {/* Buffering Spinner */}
            {isBuffering && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 pointer-events-none">
                <div className="w-12 h-12 rounded-full border-3 border-cyan-400 border-t-transparent animate-spin mb-2" />
                <span className="text-xs font-mono text-cyan-300">Buffering Media Stream...</span>
              </div>
            )}

            {/* Subtitles Overlay */}
            {subtitlesText && (
              <div className="absolute bottom-16 inset-x-8 z-20 flex justify-center pointer-events-none">
                <div
                  className={`px-4 py-1.5 rounded-lg bg-black/80 text-yellow-300 font-medium text-center shadow-lg border border-yellow-500/20 max-w-2xl ${
                    subtitleSize === 'sm' ? 'text-xs' : subtitleSize === 'lg' ? 'text-lg' : 'text-sm'
                  }`}
                >
                  {subtitlesText.slice(0, 140)}
                </div>
              </div>
            )}

            {/* HUD Diagnostics Overlay */}
            {showMetricsHud && (
              <div className="absolute top-4 left-4 z-20 p-3 rounded-xl bg-black/85 border border-zinc-800 text-[11px] font-mono text-zinc-300 space-y-1 backdrop-blur-md pointer-events-none">
                <div className="text-cyan-400 font-bold border-b border-zinc-800 pb-1">VIDEO HUD TELEMETRY</div>
                <div>Engine: <span className="text-white">{currentEngineObj.name}</span></div>
                <div>Bitrate: <span className="text-emerald-400">{videoBitrate}</span></div>
                <div>Buffer: <span className="text-cyan-300">{bufferLength}s forward</span></div>
                <div>Dropped: <span className="text-amber-400">{droppedFrames} frames</span></div>
                <div>Audio Boost: <span className="text-purple-300">{Math.round(audioBoost * 100)}%</span></div>
                <div>Resolution: <span className="text-white">{videoRef.current?.videoWidth || 1920}x{videoRef.current?.videoHeight || 1080}</span></div>
              </div>
            )}
          </div>

          {/* Player Transport Controls Bar */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            {/* Seekbar with Chapter Markers and A-B Loop indicators */}
            <div className="relative group">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />

              {/* Loop Point A Marker */}
              {loopPointA !== null && duration > 0 && (
                <div
                  style={{ left: `${(loopPointA / duration) * 100}%` }}
                  className="absolute top-0 w-2 h-4 bg-emerald-400 rounded-sm -translate-x-1 pointer-events-none"
                  title={`Loop A: ${formatTime(loopPointA)}`}
                />
              )}

              {/* Loop Point B Marker */}
              {loopPointB !== null && duration > 0 && (
                <div
                  style={{ left: `${(loopPointB / duration) * 100}%` }}
                  className="absolute top-0 w-2 h-4 bg-rose-400 rounded-sm -translate-x-1 pointer-events-none"
                  title={`Loop B: ${formatTime(loopPointB)}`}
                />
              )}

              {/* Chapter Pins along seekbar */}
              {chapterMarkers.map((mark) => (
                <div
                  key={mark.id}
                  onClick={() => handleSeek(mark.time)}
                  style={{ left: `${(mark.time / (duration || 1)) * 100}%` }}
                  className="absolute top-0 w-1.5 h-3 bg-cyan-300 hover:scale-150 transition -translate-x-0.5 cursor-pointer rounded-full"
                  title={mark.label}
                />
              ))}
            </div>

            {/* Bottom Transport Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left Transport: Play/Pause, Step Frames, Time */}
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center transition cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>

                <button
                  onClick={() => handleStepFrame(-1)}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
                  title="Step 1 Frame Back (,)"
                >
                  <RotateCcw size={14} />
                </button>

                <button
                  onClick={() => handleStepFrame(1)}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
                  title="Step 1 Frame Forward (.)"
                >
                  <RotateCw size={14} />
                </button>

                <span className="text-xs font-mono text-zinc-300 ml-1">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Center Controls: Audio Boost & Volume */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                  <button onClick={handleToggleMute} className="text-zinc-400 hover:text-white cursor-pointer">
                    {isMuted || volume === 0 ? <VolumeX size={15} /> : volume < 0.5 ? <Volume1 size={15} /> : <Volume2 size={15} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 h-1.5 bg-zinc-700 rounded accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Audio Booster Control */}
                <div className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1.5 rounded-xl border border-zinc-800 text-xs font-mono">
                  <Zap size={13} className={audioBoost > 1 ? 'text-amber-400' : 'text-zinc-500'} />
                  <span className="text-zinc-400 hidden sm:inline">Boost:</span>
                  {[1.0, 1.5, 2.0, 3.0].map((b) => (
                    <button
                      key={b}
                      onClick={() => {
                        initAudioBooster();
                        setAudioBoost(b);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                        audioBoost === b
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {Math.round(b * 100)}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Controls: A-B Loop, Speed, Aspect, Theater */}
              <div className="flex items-center gap-1.5">
                {/* A-B Loop Buttons */}
                <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setLoopPointA(currentTime)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition ${
                      loopPointA !== null ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Set Loop Point A"
                  >
                    A {loopPointA !== null && formatTime(loopPointA)}
                  </button>
                  <button
                    onClick={() => setLoopPointB(currentTime)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition ${
                      loopPointB !== null ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Set Loop Point B"
                  >
                    B {loopPointB !== null && formatTime(loopPointB)}
                  </button>
                  {(loopPointA !== null || loopPointB !== null) && (
                    <button
                      onClick={() => {
                        setLoopPointA(null);
                        setLoopPointB(null);
                      }}
                      className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                      title="Clear A-B Loop"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>

                {/* Speed Dropdown */}
                <select
                  value={playbackSpeed}
                  onChange={(e) => handleSetSpeed(parseFloat(e.target.value))}
                  className="bg-zinc-900 text-xs font-mono text-zinc-300 border border-zinc-800 rounded-xl px-2 py-1.5 focus:outline-none"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1.0}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2.0}>2.0x</option>
                  <option value={3.0}>3.0x</option>
                </select>

                {/* Aspect Ratio Toggle */}
                <button
                  onClick={() => {
                    const ratios: Array<'16:9' | '21:9' | '4:3' | 'fill'> = ['16:9', '21:9', '4:3', 'fill'];
                    const next = ratios[(ratios.indexOf(aspectRatio as any) + 1) % ratios.length];
                    setAspectRatio(next);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono text-zinc-300 cursor-pointer"
                  title="Cycle Aspect Ratio"
                >
                  {aspectRatio}
                </button>

                {/* Theater Mode Toggle */}
                <button
                  onClick={() => setIsTheaterMode(!isTheaterMode)}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    isTheaterMode ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                  title="Theater View Mode (T)"
                >
                  <Tv size={15} />
                </button>

                {/* Native Fullscreen */}
                <button
                  onClick={() => {
                    if (!document.fullscreenElement) {
                      containerRef.current?.requestFullscreen?.();
                      setIsFullscreen(true);
                    } else {
                      document.exitFullscreen?.();
                      setIsFullscreen(false);
                    }
                  }}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                  title="Fullscreen (F)"
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* 10 Playback Core Engines Strip */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Cpu size={14} className="text-cyan-400" />
                <span>10 Playback Engines Available:</span>
              </span>
              <span className="text-zinc-500">Active: <span className="text-cyan-300">{currentEngineObj.name}</span></span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {PLAYBACK_ENGINES.map((eng) => {
                const isActive = activeEngine === eng.id;
                return (
                  <button
                    key={eng.id}
                    onClick={() => loadStream(streamUrl, eng.id, videoTitle)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-400/20'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                    }`}
                  >
                    <span>{eng.flag}</span>
                    <span>{eng.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Drawer: Sample Cinema Streams & Chapter Markers */}
        {!isTheaterMode && (
          <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-800/80 bg-zinc-950/70 p-4 sm:p-5 flex flex-col space-y-5 overflow-y-auto shrink-0">
            {/* Custom Stream URL Input */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white block">Stream Direct Video URL:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="https://... (.m3u8, .mp4, webm)"
                  value={customInputUrl}
                  onChange={(e) => setCustomInputUrl(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
                <button
                  onClick={() => {
                    if (customInputUrl.trim()) {
                      const autoEng = customInputUrl.includes('.m3u8') ? 'hls_js' : 'html5_native';
                      loadStream(customInputUrl.trim(), autoEng, 'Custom Direct Stream');
                      setCustomInputUrl('');
                    }
                  }}
                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Load
                </button>
              </div>
            </div>

            {/* Curated Sample Streams */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white block">Curated Stream Library:</span>
              <div className="space-y-2">
                {SAMPLE_STREAMS.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadStream(item.url, item.engine, item.title)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-3 ${
                      streamUrl === item.url
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                        : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                      <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold truncate">{item.title}</h4>
                      <p className="text-[10px] text-zinc-500 truncate">{item.category} · {item.resolution}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chapter Markers & Notes */}
            <div className="space-y-2 pt-2 border-t border-zinc-900">
              <span className="text-xs font-bold text-white block">Timeline Chapter Markers:</span>
              <form onSubmit={handleAddMarker} className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Marker label..."
                  value={newMarkerLabel}
                  onChange={(e) => setNewMarkerLabel(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>Pin</span>
                </button>
              </form>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {chapterMarkers.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleSeek(m.time)}
                    className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-mono flex items-center justify-between cursor-pointer border border-zinc-800/60"
                  >
                    <span className="text-cyan-400">{formatTime(m.time)}</span>
                    <span className="text-zinc-300 truncate max-w-[120px]">{m.label}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMarker(m.id);
                      }}
                      className="text-zinc-600 hover:text-rose-400 p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {chapterMarkers.length === 0 && (
                  <p className="text-[11px] text-zinc-600 italic">No markers pinned yet. Pin any moment!</p>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Video Filters & Color Grading Modal */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-cyan-400" />
                <span>Video Shaders & Post-Processing FX</span>
              </h3>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Brightness:</span>
                  <span className="font-mono text-cyan-400">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Contrast:</span>
                  <span className="font-mono text-cyan-400">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Saturation:</span>
                  <span className="font-mono text-cyan-400">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={300}
                  value={saturation}
                  onChange={(e) => setSaturation(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Sepia (Vintage Warmth):</span>
                  <span className="font-mono text-cyan-400">{sepia}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sepia}
                  onChange={(e) => setSepia(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Hue Rotation:</span>
                  <span className="font-mono text-cyan-400">{hueRotate}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={hueRotate}
                  onChange={(e) => setHueRotate(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Toggles: CRT, Film Grain, Ambient Glow */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCrtMode(!crtMode)}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    crtMode ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="font-bold">CRT Lines</div>
                  <div className="text-[10px] text-zinc-500">{crtMode ? 'Active' : 'Off'}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilmGrain(!filmGrain)}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    filmGrain ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="font-bold">Film Grain</div>
                  <div className="text-[10px] text-zinc-500">{filmGrain ? 'Active' : 'Off'}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAmbientGlow(!ambientGlow)}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    ambientGlow ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="font-bold">Ambient Glow</div>
                  <div className="text-[10px] text-zinc-500">{ambientGlow ? 'Active' : 'Off'}</div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Reset to Defaults
              </button>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Apply Shaders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle size={16} className="text-cyan-400" />
                <span>Player Keyboard Shortcuts</span>
              </h3>
              <button onClick={() => setShowShortcutsModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex justify-between">
                <span className="text-zinc-400">Play / Pause:</span>
                <span className="text-cyan-400 font-bold">Space / K</span>
              </div>
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex justify-between">
                <span className="text-zinc-400">Fullscreen:</span>
                <span className="text-cyan-400 font-bold">F</span>
              </div>
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex justify-between">
                <span className="text-zinc-400">Theater View:</span>
                <span className="text-cyan-400 font-bold">T</span>
              </div>
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex justify-between">
                <span className="text-zinc-400">Mute Audio:</span>
                <span className="text-cyan-400 font-bold">M</span>
              </div>
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex justify-between">
                <span className="text-zinc-400">Seek ±5s:</span>
                <span className="text-cyan-400 font-bold">← / →</span>
              </div>
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex justify-between">
                <span className="text-zinc-400">Seek ±10s:</span>
                <span className="text-cyan-400 font-bold">J / L</span>
              </div>
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex justify-between">
                <span className="text-zinc-400">Step 1 Frame:</span>
                <span className="text-cyan-400 font-bold">, / .</span>
              </div>
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex justify-between">
                <span className="text-zinc-400">Volume ±10%:</span>
                <span className="text-cyan-400 font-bold">↑ / ↓</span>
              </div>
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex justify-between col-span-2">
                <span className="text-zinc-400">Full Resolution Snapshot:</span>
                <span className="text-cyan-400 font-bold">S</span>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Legend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
