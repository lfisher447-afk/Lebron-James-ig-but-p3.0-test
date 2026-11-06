import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Plus,
  Trash2,
  Heart,
  Search,
  Upload,
  RefreshCw,
  Sparkles,
  Music,
  Disc,
  ListMusic,
  Youtube,
  Music2,
  Radio,
  Sliders,
  Shield,
  Loader2,
  ExternalLink,
  Tv,
  Server,
  Zap,
  Volume2,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { WebProxyBrowser } from './components/WebProxyBrowser';
import { SyncModal } from './components/SyncModal';
import { NovaAcModal } from './components/NovaAcModal';
import { ShazamModal } from './components/ShazamModal';
import { AudioDspModal } from './components/AudioDspModal';
import { SetupWizardModal } from './components/SetupWizardModal';
import { ChangelogModal } from './components/ChangelogModal';
import { SettingsView } from './components/SettingsView';
import { SpotifyMain } from './subpages/spotify/SpotifyMain';
import { InvidiousMain } from './subpages/invidious/InvidiousMain';
import { MoviesMain } from './subpages/movies/MoviesMain';
import { YtMusicMain } from './subpages/ytmusic/YtMusicMain';
import { ytMusicHandler } from './subpages/ytmusic/handler/YtMusicHandler';
import { ProxiesMain } from './subpages/proxies/ProxiesMain';
import { WebProxyMain } from './subpages/webproxy/WebProxyMain';
import { VaultMain } from './subpages/vault/VaultMain';
import { ErrorBoundary } from './components/ErrorBoundary';

import { Track, Playlist, AppSettings } from './types';
import { audioEngine } from './lib/audioEngine';
import { initWSProxy, sendWSRequest } from './lib/ws-proxy';
import {
  initSecurityEngine,
  launchAboutBlankCloak,
  launchDedicatedAboutBlank,
  isRunningInAboutBlank,
  showAntiCloseWarning,
} from './lib/security';
import { applyThemePalette } from './lib/theme';
import {
  getAllTracks,
  getAllPlaylists,
  saveTrack,
  saveTracksBatch,
  savePlaylist,
  deleteTrack,
  deletePlaylist,
  getStoredSettings,
  saveStoredSettings,
  getDB,
} from './lib/db';

const STARTER_TRACKS: Track[] = [
  {
    id: 'yt_kJQP7kiw5Fk',
    title: 'Despacito',
    artist: 'Luis Fonsi ft. Daddy Yankee',
    album: 'VIDA',
    duration: 228,
    durationText: '3:48',
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
    source: 'youtube',
    addedAt: Date.now(),
    streamUrl: '/api/audio/stream?id=kJQP7kiw5Fk',
  },
  {
    id: 'yt_OPf0YbXqDm0',
    title: 'Uptown Funk',
    artist: 'Mark Ronson ft. Bruno Mars',
    album: 'Uptown Special',
    duration: 270,
    durationText: '4:30',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
    source: 'youtube',
    addedAt: Date.now() - 1000,
    streamUrl: '/api/audio/stream?id=OPf0YbXqDm0',
  },
  {
    id: 'yt_fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    duration: 354,
    durationText: '5:54',
    artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80',
    source: 'youtube',
    addedAt: Date.now() - 2000,
    streamUrl: '/api/audio/stream?id=fJ9rUzIMcZQ',
  },
  {
    id: 'yt_JGwWNGJdvx8',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: 'Divide',
    duration: 233,
    durationText: '3:53',
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80',
    source: 'youtube',
    addedAt: Date.now() - 3000,
    streamUrl: '/api/audio/stream?id=JGwWNGJdvx8',
  },
];

const defaultSettings: AppSettings = {
  eq: {
    enabled: true,
    bandCount: 5,
    gains: [2, 0, 1, 2, 3],
    modeGains: {
      5: [2, 0, 1, 2, 3],
    },
    preAmpGain: 0,
    autoGainCompensation: true,
    activePreset: 'Balanced Studio',
    qFactorMultiplier: 1.0,
    bass: 2,
    lowMid: 0,
    vocal: 1,
    highMid: 2,
    treble: 3,
  },
  spatial: {
    mode: 'studio',
    stereoWidth: 110,
    reverbWet: 0.1,
  },
  compressor: {
    enabled: true,
    threshold: -12,
    ratio: 3,
  },
  playback: {
    crossfadeSeconds: 3,
    gapless: true,
    playbackRate: 1.0,
    autoPlayNext: true,
    smartShuffle: false,
    volume: 0.85,
    muted: false,
    repeatMode: 'all',
    shuffle: false,
  },
  security: {
    antiScreenshotEnabled: false,
    blurSensitivity: 'standard',
    preventDevTools: false,
    dynamicWatermark: true,
    blockRightClick: false,
    clearSessionOnExit: false,
    sandboxBlobMode: false,
    cloakPreset: 'none',
    antiTabCloseGuard: true,
    antiCloseStrictTrap: true,
    antiCloseAudioAnchor: true,
    mouseExitWarning: true,
    linewizeBypassHeaders: true,
    extensionPurgeObserver: true,
    webrtcDecoyStream: true,
    canvasScrambler: true,
    mediaRecorderBlocker: true,
    osHotkeyBlocker: true,
    printBlocker: true,
    trafficNoiseGenerator: true,
    antiDetectHeartbeat: true,
    clipboardSanitizer: false,
    iframeFramebusterNeutralizer: true,
    webSocketTunnelFallback: true,
    fakeNetworkLatencyMask: false,
    autoAboutBlankLauncher: true,
    autoAboutBlankOnEnter: false,
    disguiseParentOnAboutBlank: true,
    pushNotificationsEnabled: true,
    teacherDetectionAlert: true,
    antiOcrStroboscopicShield: false,
    antiScreenShareCurtain: true,
    devToolsTrapCurtain: true,
    ephemeralMemoryWipe: false,
    audioFrequencyCloak: false,
  },
  theme: {
    palette: 'cyan',
    visualizerStyle: 'bars',
    glowIntensity: 60,
    particlesEnabled: true,
    compactView: false,
  },
};

export default function App() {
  // Read initial tab from URL hash if present (e.g. #/movies -> movies)
  const getInitialTab = () => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    const validTabs = ['home', 'movies', 'yt-music', 'yt-player', 'spotify', 'servers', 'web-proxy', 'library', 'search', 'settings'];
    return validTabs.includes(hash) ? hash : 'home';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // AI Oracle State
  const [searchSubMode, setSearchSubMode] = useState<'stealth' | 'oracle'>('stealth');
  const [oraclePrompt, setOraclePrompt] = useState('');
  const [selectedAiModel, setSelectedAiModel] = useState<'gemini-3.8-flash' | 'gemini-4-argon' | 'gemini-3.1-flash-lite'>('gemini-3.8-flash');
  const [oracleResponse, setOracleResponse] = useState<{ answer: string; groundingMetadata: any; model?: string } | null>(null);
  const [oracleLoading, setOracleLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);

  // Modals
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [showShazamModal, setShowShazamModal] = useState(false);
  const [showDspModal, setShowDspModal] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const handleOpenDsp = useCallback(() => {
    try {
      const overlay = document.getElementById('anti-screenshot-overlay');
      if (overlay) {
        overlay.style.display = 'none';
        overlay.style.pointerEvents = 'none';
      }
    } catch {}
    setShowDspModal(true);
  }, []);
  const [showSetupWizard, setShowSetupWizard] = useState(() => {
    return !localStorage.getItem('spotui_setup_completed');
  });

  // OAuth State
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);

  // About:Blank Cloak & Anti-Close Status
  const [inAboutBlank, setInAboutBlank] = useState(false);
  const [showAboutBlankBanner, setShowAboutBlankBanner] = useState(() => {
    return !sessionStorage.getItem('spotui_dismiss_ab_banner');
  });

  // Check if currently running inside an about:blank iframe container
  useEffect(() => {
    const isAb = isRunningInAboutBlank();
    setInAboutBlank(isAb);
    if (isAb) {
      setShowAboutBlankBanner(false);
    }
  }, []);

  // Dedicated Auto About:Blank on Enter Trigger
  useEffect(() => {
    if (settings.security.autoAboutBlankOnEnter && !isRunningInAboutBlank()) {
      const timer = setTimeout(() => {
        launchDedicatedAboutBlank(
          window.location.href,
          settings.security.disguiseParentOnAboutBlank,
          settings.security.cloakPreset as any
        );
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [settings.security.autoAboutBlankOnEnter]);

  // Toggle Anti-Close Protection quickly from top bar
  const toggleAntiCloseQuick = () => {
    setSettings((prev) => {
      const nextVal = !prev.security.antiTabCloseGuard;
      if (nextVal) {
        showAntiCloseWarning('Anti-Close Guard manually engaged. Session protected.');
      }
      return {
        ...prev,
        security: {
          ...prev.security,
          antiTabCloseGuard: nextVal,
          antiCloseStrictTrap: nextVal,
          mouseExitWarning: nextVal,
        },
      };
    });
  };

  // File Upload input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize hash with activeTab for full multi-page navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const validTabs = ['home', 'movies', 'yt-music', 'yt-player', 'spotify', 'servers', 'web-proxy', 'library', 'search', 'settings'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when activeTab changes
  const navigateToTab = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  };

  // Synchronized playback refs to prevent stale closure bugs when songs end
  const queueRef = useRef<Track[]>(queue);
  const tracksRef = useRef<Track[]>(tracks);
  const currentTrackRef = useRef<Track | null>(currentTrack);
  const settingsRef = useRef<AppSettings>(settings);
  const isPlayingRef = useRef<boolean>(isPlaying);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const handleNextTrackRef = useRef<((isAuto?: boolean) => Promise<void> | void) | null>(null);

  // 1. Initialize Engine, WS, DB and Security
  useEffect(() => {
    initWSProxy();

    // Check for popup Spotify OAuth callback redirect
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get('code');
      const authError = urlParams.get('error');
      if ((authCode || authError) && window.opener) {
        window.opener.postMessage({
          type: 'SPOTIFY_AUTH_SUCCESS',
          code: authCode || '',
          error: authError || '',
        }, '*');
        setTimeout(() => window.close(), 600);
      }
    } catch {}

    // Load initial settings and library from IndexedDB
    const initApp = async () => {
      try {
        const stored = await getStoredSettings();
        if (stored) {
          setSettings((prev) => ({
            ...prev,
            ...stored,
            security: { ...prev.security, ...(stored.security || {}) },
            theme: { ...prev.theme, ...(stored.theme || {}) },
          }));
        }
        let loadedTracks = await getAllTracks();
        const loadedPlaylists = await getAllPlaylists();

        if (loadedTracks.length === 0) {
          await saveTracksBatch(STARTER_TRACKS);
          loadedTracks = STARTER_TRACKS;
        }

        setTracks(loadedTracks);
        setPlaylists(loadedPlaylists);

        if (loadedTracks.length > 0 && !currentTrack) {
          setCurrentTrack(loadedTracks[0]);
        }
      } catch (err) {
        console.warn('Init error:', err);
      }
    };
    initApp();

    // Setup Audio Engine Callbacks
    audioEngine.onTimeUpdate((curr, dur) => {
      setCurrentTime(curr);
      setDuration(dur);
    });

    // When song ends, call latest handleNextTrackRef with isAuto = true
    audioEngine.onEnded(() => {
      if (handleNextTrackRef.current) {
        handleNextTrackRef.current(true);
      }
    });
  }, []);

  // 2. Apply Security Engine & Theme on settings change
  useEffect(() => {
    applyThemePalette(settings.theme.palette);
    initSecurityEngine(settings);
    audioEngine.applySettings(settings);
    saveStoredSettings(settings);
  }, [settings]);

  // Handle Play/Pause
  const handlePlayPause = async () => {
    const active = currentTrackRef.current || currentTrack;
    const currentTracks = tracksRef.current.length > 0 ? tracksRef.current : tracks;

    if (!active && currentTracks.length > 0) {
      await handlePlayTrack(currentTracks[0]);
      return;
    }
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      await audioEngine.play();
      setIsPlaying(true);
      isPlayingRef.current = true;
    }
  };

  // Play Specific Track
  const handlePlayTrack = async (track: Track, trackList?: Track[]) => {
    try {
      setCurrentTrack(track);
      currentTrackRef.current = track;
      setIsPlaying(true);
      isPlayingRef.current = true;

      if (trackList && trackList.length > 0) {
        setQueue(trackList);
        queueRef.current = trackList;
      } else {
        // Ensure track is part of queue to maintain prev/next continuity
        setQueue((prev) => {
          if (!prev.some((t) => t.id === track.id)) {
            const nextQ = [...prev, track];
            queueRef.current = nextQ;
            return nextQ;
          }
          return prev;
        });
      }

      // Sync OS MediaSession API (lock screens, headsets, media keys)
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist || 'Spotui Web',
            album: track.album || 'Spotui Signal Room',
            artwork: [
              {
                src: track.artwork || '/favicon.ico',
                sizes: '512x512',
                type: 'image/jpeg',
              },
            ],
          });
          navigator.mediaSession.setActionHandler('play', () => handlePlayPause());
          navigator.mediaSession.setActionHandler('pause', () => handlePlayPause());
          navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrack());
          navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrack(false));
        } catch {}
      }

      await audioEngine.playTrack(track);
    } catch (e) {
      console.warn('Playback error:', e);
    }
  };

  // Next Track (isAuto = true when triggered by song ending)
  const handleNextTrack = async (isAuto = false) => {
    const currentQueue = queueRef.current;
    const currentTracks = tracksRef.current;
    const activeTrack = currentTrackRef.current;
    const currentSettings = settingsRef.current;

    // 1. Repeat Single Track Mode
    if (isAuto && currentSettings.playback.repeatMode === 'one' && activeTrack) {
      await handlePlayTrack(activeTrack);
      return;
    }

    let listToUse = currentQueue.length > 0 ? currentQueue : currentTracks;

    // If currently playing a single YouTube song with no queue, auto-fetch trending charts to keep music playing
    if (listToUse.length === 0 || (listToUse.length === 1 && listToUse[0].id === activeTrack?.id)) {
      if (activeTrack && activeTrack.source === 'youtube') {
        try {
          const charts = await ytMusicHandler.getTrendingCharts();
          if (charts && charts.length > 0) {
            const mapped = charts.map((c) => ytMusicHandler.toAudioTrack(c)).filter((c) => c.id !== activeTrack.id);
            if (mapped.length > 0) {
              const extended = [activeTrack, ...mapped];
              setQueue(extended);
              queueRef.current = extended;
              listToUse = extended;
            }
          }
        } catch (e) {
          console.warn('[AutoPlayNext] Chart fallback failed:', e);
        }
      }
    }

    if (listToUse.length === 0) return;

    const currentIndex = activeTrack ? listToUse.findIndex((t) => t.id === activeTrack.id) : -1;

    // 2. Repeat Mode: OFF check at end of playlist/queue
    if (
      isAuto &&
      currentSettings.playback.repeatMode === 'off' &&
      currentIndex !== -1 &&
      currentIndex >= listToUse.length - 1
    ) {
      if (!currentSettings.playback.autoPlayNext) {
        setIsPlaying(false);
        isPlayingRef.current = false;
        audioEngine.pause();
        return;
      }
    }

    let nextIndex: number;
    if (currentSettings.playback.shuffle) {
      if (listToUse.length <= 1) {
        nextIndex = 0;
      } else {
        do {
          nextIndex = Math.floor(Math.random() * listToUse.length);
        } while (nextIndex === currentIndex && listToUse.length > 1);
      }
    } else {
      nextIndex = (currentIndex + 1) % listToUse.length;
    }

    await handlePlayTrack(listToUse[nextIndex]);
  };

  handleNextTrackRef.current = handleNextTrack;

  // Prev Track
  const handlePrevTrack = async () => {
    const currentQueue = queueRef.current;
    const currentTracks = tracksRef.current;
    const activeTrack = currentTrackRef.current;

    const listToUse = currentQueue.length > 0 ? currentQueue : currentTracks;
    if (listToUse.length === 0) return;

    const currentIndex = activeTrack ? listToUse.findIndex((t) => t.id === activeTrack.id) : -1;
    const prevIndex = (currentIndex - 1 + listToUse.length) % listToUse.length;
    await handlePlayTrack(listToUse[prevIndex]);
  };

  // Seek
  const handleSeek = (secs: number) => {
    audioEngine.seek(secs);
    setCurrentTime(secs);
  };

  // Volume
  const handleVolumeChange = (vol: number) => {
    setSettings((prev) => ({
      ...prev,
      playback: { ...prev.playback, volume: vol, muted: false },
    }));
  };

  // Mute
  const handleToggleMute = () => {
    setSettings((prev) => ({
      ...prev,
      playback: { ...prev.playback, muted: !prev.playback.muted },
    }));
  };

  // Shuffle & Repeat
  const handleToggleShuffle = () => {
    setSettings((prev) => ({
      ...prev,
      playback: { ...prev.playback, shuffle: !prev.playback.shuffle },
    }));
  };

  const handleToggleRepeat = () => {
    setSettings((prev) => {
      const nextMode =
        prev.playback.repeatMode === 'off'
          ? 'all'
          : prev.playback.repeatMode === 'all'
          ? 'one'
          : 'off';
      return { ...prev, playback: { ...prev.playback, repeatMode: nextMode } };
    });
  };

  // Like Track
  const handleToggleLike = async (trackId: string) => {
    const updated = tracks.map((t) => (t.id === trackId ? { ...t, liked: !t.liked } : t));
    setTracks(updated);
    const target = updated.find((t) => t.id === trackId);
    if (target) {
      await saveTrack(target);
    }
  };

  // Delete Track
  const handleDeleteTrack = async (trackId: string) => {
    await deleteTrack(trackId);
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    if (currentTrack?.id === trackId) {
      const remaining = tracks.filter((t) => t.id !== trackId);
      if (remaining.length > 0) handlePlayTrack(remaining[0]);
      else {
        audioEngine.pause();
        setCurrentTrack(null);
        setIsPlaying(false);
      }
    }
  };

  // Queue Management
  const handleAddToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track]);
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearQueue = () => {
    setQueue([]);
  };

  // YouTube / Spoofed Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await sendWSRequest('yt_search', { query: searchQuery });
      if (Array.isArray(results)) {
        setSearchResults(results);
      }
    } catch (err: any) {
      alert('Search failed: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Google Search Grounded Music & Cinema Oracle query
  const handleOracleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!oraclePrompt.trim()) return;
    setOracleLoading(true);
    setOracleResponse(null);
    setTtsAudioUrl(null);
    try {
      const res = await fetch('/api/ai/oracle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: oraclePrompt, model: selectedAiModel }),
      });
      if (res.ok) {
        const data = await res.json();
        setOracleResponse(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert('Oracle issue: ' + (errData.error || 'Failed to reach AI server.'));
      }
    } catch (err: any) {
      alert('Network issue: ' + err.message);
    } finally {
      setOracleLoading(false);
    }
  };

  // Text-to-Speech Synthesis Handler using Gemini 3.8 Flash Lite TTS
  const handleSynthesizeSpeech = async (text: string) => {
    if (!text) return;
    setTtsLoading(true);
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: 'Kore' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audioUrl = `data:audio/wav;base64,${data.audioBase64}`;
          setTtsAudioUrl(audioUrl);
          const audio = new Audio(audioUrl);
          audio.play().catch(() => {});
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTtsLoading(false);
    }
  };

  // Direct Local Audio Import
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newTracks: Track[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const track: Track = {
        id: `local_${Date.now()}_${i}`,
        title: f.name.replace(/\.[^/.]+$/, ''),
        artist: 'Local Vault Audio',
        album: 'Direct Uploads',
        duration: 210,
        source: 'local',
        fileName: f.name,
        size: f.size,
        addedAt: Date.now(),
        blob: f,
      };
      await saveTrack(track);
      newTracks.push(track);
    }

    setTracks((prev) => [...newTracks, ...prev]);
    if (!currentTrack && newTracks.length > 0) {
      handlePlayTrack(newTracks[0]);
    }
    alert(`Imported ${newTracks.length} tracks into local Vault!`);
  };

  // Connect Spotify OAuth Flow
  const handleConnectSpotify = async () => {
    try {
      const res = await fetch('/api/auth/spotify/url');
      const data = await res.json();
      window.open(data.url, 'spotify_login', 'width=600,height=700');

      const handler = async (e: MessageEvent) => {
        if (e.data?.type === 'SPOTIFY_AUTH_SUCCESS') {
          window.removeEventListener('message', handler);
          const code = e.data.code;
          const tokenRes = await fetch('/api/auth/spotify/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });
          const tokenData = await tokenRes.json();
          if (tokenData.access_token) {
            setIsSpotifyConnected(true);
            alert('Spotify Connected! Ready to sync playlists.');
          }
        }
      };
      window.addEventListener('message', handler);
    } catch {
      setIsSpotifyConnected(true);
      alert('Spotify Web API Ready!');
    }
  };

  // Reload Library from IndexedDB
  const reloadLibrary = async () => {
    const loadedTracks = await getAllTracks();
    const loadedPlaylists = await getAllPlaylists();
    setTracks(loadedTracks);
    setPlaylists(loadedPlaylists);
  };

  // Wipe Vault
  const handleWipeVault = async () => {
    if (!confirm('Are you sure you want to wipe all local tracks and playlists?')) return;
    const db = await getDB();
    await db.clear('tracks');
    await db.clear('playlists');
    setTracks([]);
    setPlaylists([]);
    setCurrentTrack(null);
    setIsPlaying(false);
    audioEngine.pause();
    alert('Vault wiped clean.');
  };

  return (
    <div className="h-screen w-screen bg-[#050c0e] text-[#e5f8fc] font-sans flex overflow-hidden selection:bg-[#48e4ff] selection:text-[#051a20]">
      {/* Hidden File Input for Audio Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept="audio/*,.mp3,.flac,.m4a,.aac,.ogg,.opus,.wav,.webm"
        className="hidden"
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        onOpenSync={() => setShowSyncModal(true)}
        onOpenNovaAc={() => setShowNovaModal(true)}
        onOpenShazam={() => setShowShazamModal(true)}
        onOpenDsp={handleOpenDsp}
        onOpenChangelog={() => setShowChangelogModal(true)}
        onLaunchCloak={() =>
          launchDedicatedAboutBlank(
            window.location.href,
            settings.security.disguiseParentOnAboutBlank,
            settings.security.cloakPreset as any
          )
        }
        isSpotifyConnected={isSpotifyConnected}
        palette={settings.theme.palette}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Ambient Top Right Glow */}
        <div className="absolute top-[-15%] right-[-10%] w-[50vw] h-[50vw] bg-[#143e47] rounded-full blur-[140px] opacity-25 pointer-events-none" />

        {/* Top Security & Control Bar */}
        <div className="h-14 border-b border-slate-800/80 bg-[#060a0f]/95 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
              WORKSPACE: <span className="text-white">{activeTab.toUpperCase()}</span>
            </span>
            {inAboutBlank && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ABOUT:BLANK SECURED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Dedicated Anti-Close Quick Toggle */}
            <button
              onClick={toggleAntiCloseQuick}
              title={
                settings.security.antiTabCloseGuard
                  ? 'Anti-Close Protection is ACTIVE (Click to toggle)'
                  : 'Anti-Close Protection is DISABLED (Click to engage)'
              }
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                settings.security.antiTabCloseGuard
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Shield size={13} className={settings.security.antiTabCloseGuard ? 'text-cyan-400 animate-pulse' : 'text-slate-500'} />
              <span>{settings.security.antiTabCloseGuard ? 'ANTI-CLOSE: ON' : 'ANTI-CLOSE: OFF'}</span>
            </button>

            {/* About:Blank Launcher */}
            <button
              onClick={() =>
                launchDedicatedAboutBlank(
                  window.location.href,
                  settings.security.disguiseParentOnAboutBlank,
                  settings.security.cloakPreset as any
                )
              }
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
              title="Launch site in an about:blank stealth window"
            >
              <ExternalLink size={13} className="text-[#48e4ff]" />
              <span>about:blank</span>
            </button>

            {/* Security Server Status */}
            <button
              onClick={() => navigateToTab('settings')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Dedicated Security Server Settings"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="hidden sm:inline">WAF Core</span>
            </button>
          </div>
        </div>

        {/* Unlogged About:Blank Advisory Banner on Entering Site */}
        {!inAboutBlank && showAboutBlankBanner && (
          <div className="bg-gradient-to-r from-[#07191e] via-[#0b262f] to-[#051317] border-b border-[#1b4b57] px-6 py-2.5 flex items-center justify-between text-xs text-[#8aaeb5] z-20 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-mono text-[#48e4ff] font-bold">[ STEALTH ADVISORY ]</span>
              <span>Run in an unlogged <strong>about:blank</strong> stealth window to leave zero URL & browser history records.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  launchDedicatedAboutBlank(
                    window.location.href,
                    settings.security.disguiseParentOnAboutBlank,
                    settings.security.cloakPreset as any
                  )
                }
                className="px-3 py-1 bg-[#143e47] hover:bg-[#1b525f] text-[#48e4ff] border border-[#48e4ff]/40 rounded-lg font-bold font-mono text-[11px] flex items-center gap-1 transition-all"
              >
                <ExternalLink size={12} />
                <span>Launch in about:blank</span>
              </button>
              <button
                onClick={() => {
                  setShowAboutBlankBanner(false);
                  sessionStorage.setItem('spotui_dismiss_ab_banner', 'true');
                }}
                className="text-[#789d9a] hover:text-white px-2 py-0.5 text-xs font-bold"
                title="Dismiss banner"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-10 pb-32 z-10">
          {/* TAB 1: SIGNAL ROOM (HOME) */}
          {activeTab === 'home' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              {/* Hero Banner */}
              <div className="relative overflow-hidden rounded-3xl p-8 lg:p-12 min-h-[300px] flex flex-col justify-end bg-gradient-to-br from-[#071317] via-[#091a1e] to-[#040e11] border border-[#1d3d45] shadow-2xl">
                <div
                  className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{
                    backgroundImage:
                      'radial-gradient(rgba(72, 228, 255, 0.15) 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#48e4ff]/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-2xl">
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#48e4ff] mb-2 font-bold">
                    <Sparkles size={14} />
                    <span>Innertube 12-Server Decoupled Matrix</span>
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-serif font-bold tracking-tight text-white mb-3">
                    Signal Room Master Deck.
                  </h1>
                  <p className="text-sm text-[#8aaeb5] leading-relaxed mb-6">
                    Full keyless YouTube & Spotify portal powered by Kotlin-ported Innertube algorithms, a 12-node proxy matrix, hardware DSP equalization, and stealth routing.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => navigateToTab('yt-player')}
                      className="px-6 py-3 bg-[#f43f5e] text-white font-bold rounded-2xl text-xs hover:scale-95 transition-all shadow-[0_0_25px_rgba(244,63,94,0.35)] flex items-center gap-2"
                    >
                      <Youtube size={15} />
                      <span>YouTube Video Player</span>
                    </button>

                    <button
                      onClick={() => navigateToTab('spotify')}
                      className="px-5 py-3 bg-[#1db954] text-[#051a20] font-bold rounded-2xl text-xs hover:scale-95 transition-all shadow-[0_0_25px_rgba(29,185,84,0.3)] flex items-center gap-2"
                    >
                      <Music2 size={15} />
                      <span>Spotify Keyless Player</span>
                    </button>

                    <button
                      onClick={() => navigateToTab('servers')}
                      className="px-5 py-3 bg-[#0a1b20] hover:bg-[#112a32] text-[#48e4ff] border border-[#1d3c45] font-bold rounded-2xl text-xs flex items-center gap-2 transition-colors"
                    >
                      <Server size={14} />
                      <span>12-Server Matrix</span>
                    </button>

                    <button
                      onClick={handleOpenDsp}
                      className="px-5 py-3 bg-[#0a1b20] hover:bg-[#112a32] text-[#c084fc] border border-[#1d3c45] font-bold rounded-2xl text-xs flex items-center gap-2 transition-colors"
                    >
                      <Sliders size={14} />
                      <span>Live EQ</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-Pages Quick Launch Portal */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-serif font-bold text-white">Media Engine Portals & Sub-Pages</h3>
                    <p className="text-xs text-[#789d9a] mt-0.5">Deep-linked standalone sub-pages for dedicated media playback and routing.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* YouTube Player Card */}
                  <div
                    onClick={() => navigateToTab('yt-player')}
                    className="p-5 rounded-2xl bg-gradient-to-br from-[#240d12] to-[#0d0407] border border-[#4a1822] hover:border-[#f43f5e] hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden group shadow-lg"
                  >
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-[#f43f5e]/15 rounded-full blur-xl group-hover:bg-[#f43f5e]/25 transition" />
                    <div className="w-10 h-10 rounded-xl bg-[#f43f5e]/20 border border-[#f43f5e]/40 flex items-center justify-center text-[#f43f5e] mb-3">
                      <Tv size={20} />
                    </div>
                    <h4 className="font-bold text-base text-white mb-1">YouTube Player</h4>
                    <p className="text-xs text-[#9d727b] leading-relaxed mb-3">
                      High-fidelity video playback with real-time audio deciphering.
                    </p>
                    <span className="text-[11px] font-mono text-[#f43f5e] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open YouTube Player →
                    </span>
                  </div>

                  {/* Spotify Player Card */}
                  <div
                    onClick={() => navigateToTab('spotify')}
                    className="p-5 rounded-2xl bg-gradient-to-br from-[#0a2314] to-[#040f08] border border-[#144728] hover:border-[#1db954] hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden group shadow-lg"
                  >
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-[#1db954]/15 rounded-full blur-xl group-hover:bg-[#1db954]/25 transition" />
                    <div className="w-10 h-10 rounded-xl bg-[#1db954]/20 border border-[#1db954]/40 flex items-center justify-center text-[#1db954] mb-3">
                      <Music2 size={20} />
                    </div>
                    <h4 className="font-bold text-base text-white mb-1">Spotify Player</h4>
                    <p className="text-xs text-[#6e9b7e] leading-relaxed mb-3">
                      Paste any public playlist or album to resolve and stream tracks.
                    </p>
                    <span className="text-[11px] font-mono text-[#1db954] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open Spotify Player →
                    </span>
                  </div>

                  {/* DSP EQ Card */}
                  <div
                    onClick={handleOpenDsp}
                    className="p-5 rounded-2xl bg-gradient-to-br from-[#0c2328] to-[#050f11] border border-[#17444d] hover:border-[#48e4ff] hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden group shadow-lg"
                  >
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-[#48e4ff]/15 rounded-full blur-xl group-hover:bg-[#48e4ff]/25 transition" />
                    <div className="w-10 h-10 rounded-xl bg-[#48e4ff]/20 border border-[#48e4ff]/40 flex items-center justify-center text-[#48e4ff] mb-3">
                      <Sliders size={20} />
                    </div>
                    <h4 className="font-bold text-base text-white mb-1">5-Band Web Audio DSP</h4>
                    <p className="text-xs text-[#70959b] leading-relaxed mb-3">
                      Hardware accelerated EQ, spatial stereo widening, and dynamic compression.
                    </p>
                    <span className="text-[11px] font-mono text-[#48e4ff] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open Audio DSP →
                    </span>
                  </div>

                  {/* Web Proxy Browser Card */}
                  <div
                    onClick={() => navigateToTab('web-proxy')}
                    className="p-5 rounded-2xl bg-gradient-to-br from-[#1b152b] to-[#0a0712] border border-[#352955] hover:border-[#a855f7] hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden group shadow-lg"
                  >
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-[#a855f7]/15 rounded-full blur-xl group-hover:bg-[#a855f7]/25 transition" />
                    <div className="w-10 h-10 rounded-xl bg-[#a855f7]/20 border border-[#a855f7]/40 flex items-center justify-center text-[#a855f7] mb-3">
                      <Shield size={20} />
                    </div>
                    <h4 className="font-bold text-base text-white mb-1">Web Proxy Browser</h4>
                    <p className="text-xs text-[#8f7ca5] leading-relaxed mb-3">
                      Unblocked web navigation with isolated sandboxed browsing.
                    </p>
                    <span className="text-[11px] font-mono text-[#a855f7] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Launch Browser →
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Jump Playlists / Stations */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-serif font-bold text-white">Your Stations & Synced Vaults</h3>
                  <span className="text-xs font-mono text-[#789d9a]">{tracks.length} Tracks in Vault</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {playlists.length === 0 ? (
                    <div
                      onClick={() => setShowSyncModal(true)}
                      className="p-6 rounded-2xl bg-[#091a1e] border border-dashed border-[#234b54] hover:border-[#48e4ff] cursor-pointer transition-all flex flex-col items-center justify-center text-center group"
                    >
                      <ListMusic size={32} className="text-[#48e4ff] mb-2 group-hover:scale-110 transition-transform" />
                      <div className="text-sm font-bold text-white">Synchronize First Playlist</div>
                      <div className="text-xs text-[#789d9a] mt-1">Mirror your Spotify or YT library</div>
                    </div>
                  ) : (
                    playlists.map((pl) => (
                      <div
                        key={pl.id}
                        onClick={() => navigateToTab('library')}
                        className="p-5 rounded-2xl bg-gradient-to-br from-[#0c2228] to-[#071518] border border-[#1d3c45] hover:border-[#48e4ff]/60 hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden group shadow-lg"
                      >
                        <div className="absolute -right-8 -top-8 w-24 h-24 bg-[#48e4ff]/10 rounded-full blur-xl group-hover:bg-[#48e4ff]/20 transition-colors" />
                        <span className="text-[10px] font-mono uppercase text-[#48e4ff] font-bold">
                          {pl.source}
                        </span>
                        <h4 className="text-base font-bold text-white mt-4 mb-1 truncate">{pl.name}</h4>
                        <span className="text-xs text-[#789d9a] font-mono">
                          {pl.trackIds?.length || 0} tracks synchronized
                        </span>
                      </div>
                    ))
                  )}

                  {/* Liked Songs Card */}
                  <div
                    onClick={() => navigateToTab('library')}
                    className="p-5 rounded-2xl bg-gradient-to-br from-[#2a1322] to-[#12070e] border border-[#4a1f3a] hover:border-[#f43f5e]/60 hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden shadow-lg"
                  >
                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-[#f43f5e]/15 rounded-full blur-xl" />
                    <Heart size={20} className="text-[#f43f5e] fill-current" />
                    <h4 className="text-base font-bold text-white mt-4 mb-1">Liked Tracks</h4>
                    <span className="text-xs text-[#b87c95] font-mono">
                      {tracks.filter((t) => t.liked).length} Favorites
                    </span>
                  </div>
                </div>
              </div>

              {/* Recently Added Tracks Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-serif font-bold text-white">Vault Stream</h3>
                  <button
                    onClick={() => setActiveTab('library')}
                    className="text-xs font-mono text-[#48e4ff] hover:underline"
                  >
                    View All Tracks
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tracks.slice(0, 6).map((t) => {
                    const isCurrent = currentTrack?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handlePlayTrack(t)}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group ${
                          isCurrent
                            ? 'bg-[#143e47] border-[#48e4ff]/50 shadow-md'
                            : 'bg-[#08171b] border-[#142a30] hover:bg-[#0e242a] hover:border-[#234b54]'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#0e242a] border border-[#1a3840] shrink-0 flex items-center justify-center relative">
                            {t.artwork ? (
                              <img src={t.artwork} alt="Art" className="w-full h-full object-cover" />
                            ) : (
                              <Music size={18} className="text-[#48e4ff]" />
                            )}
                            {isCurrent && isPlaying && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Disc size={18} className="text-[#48e4ff] animate-spin" />
                              </div>
                            )}
                          </div>

                          <div className="overflow-hidden">
                            <div className="font-bold text-xs text-white truncate">{t.title}</div>
                            <div className="text-[11px] text-[#789d9a] truncate mt-0.5">{t.artist}</div>
                          </div>
                        </div>

                        <button className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-[#48e4ff] text-[#051a20] transition-opacity">
                          <Play size={12} fill="currentColor" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VAULT LIBRARY DEDICATED SUBPAGE */}
          {activeTab === 'library' && (
            <VaultMain
              onPlayTrack={handlePlayTrack}
              onAddToQueue={handleAddToQueue}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              tracks={tracks}
              playlists={playlists}
              onTracksChange={(updated) => {
                setTracks(updated);
                tracksRef.current = updated;
              }}
              onPlaylistsChange={(updated) => {
                setPlaylists(updated);
              }}
              onOpenDsp={handleOpenDsp}
            />
          )}

          {/* TAB 3: SPOOFED SEARCH */}
          {activeTab === 'search' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#48e4ff] mb-1 font-bold">
                  <Radio size={14} />
                  <span>Stealth Operations & Intelligence Deck</span>
                </div>
                <h1 className="text-3xl font-serif font-bold text-white mb-2">
                  Music Intelligence Center
                </h1>
                <p className="text-xs text-[#789d9a]">
                  Conceal search footprint using WebSocket tunneling or query the live Google Search grounded Gemini intelligence oracle.
                </p>
              </div>

              {/* Sub-Tab Navigation */}
              <div className="flex items-center gap-2 border-b border-[#163842] pb-4">
                <button
                  onClick={() => setSearchSubMode('stealth')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    searchSubMode === 'stealth'
                      ? 'bg-[#48e4ff] text-[#051a20]'
                      : 'text-zinc-400 hover:text-white hover:bg-[#12282e]/40'
                  }`}
                >
                  <Search size={14} />
                  <span>Stealth Music Search</span>
                </button>
                <button
                  onClick={() => setSearchSubMode('oracle')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    searchSubMode === 'oracle'
                      ? 'bg-[#48e4ff] text-[#051a20]'
                      : 'text-zinc-400 hover:text-white hover:bg-[#12282e]/40'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>AI Artist & Music Oracle</span>
                </button>
              </div>

              {searchSubMode === 'stealth' ? (
                <div className="space-y-6">
                  {/* Search Box */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search size={18} className="absolute left-4 top-3.5 text-[#5c828a]" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search any song, artist, album on YouTube Music..."
                        className="w-full bg-[#071317] border border-[#1a3840] text-white rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:border-[#48e4ff] text-sm transition-colors shadow-inner"
                      />
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="px-6 py-3.5 bg-[#48e4ff] text-[#051a20] font-bold rounded-2xl text-xs hover:bg-[#8df5be] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg"
                    >
                      {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                    </button>
                  </div>

                  {/* Search Results Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                    {searchResults.map((item, i) => (
                      <div
                        key={item.id || i}
                        className="p-4 rounded-2xl bg-[#071317] border border-[#1a3840] hover:border-[#48e4ff]/60 transition-all flex flex-col justify-between group shadow-lg"
                      >
                        <div>
                          <div className="w-full h-36 rounded-xl overflow-hidden mb-3 bg-[#040e11] relative">
                            <img
                              src={item.thumbnail}
                              alt="Thumb"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white backdrop-blur-sm">
                              {item.durationText || '3:30'}
                            </div>
                          </div>
                          <h4 className="font-bold text-sm text-white truncate mb-0.5">{item.title}</h4>
                          <div className="text-xs text-[#789d9a] truncate">{item.artist}</div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#12282e] flex items-center justify-between">
                          <span className="text-[10px] font-mono text-[#5c828a]">{item.views || 'Innertube'}</span>
                          <button
                            onClick={async () => {
                              const track: Track = {
                                id: item.id,
                                title: item.title,
                                artist: item.artist,
                                album: 'YouTube Stream',
                                duration: item.duration || 210,
                                artwork: item.thumbnail,
                                source: 'youtube',
                                addedAt: Date.now(),
                              };
                              await saveTrack(track);
                              setTracks((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
                              handlePlayTrack(track);
                            }}
                            className="px-3 py-1.5 bg-[#143e47] hover:bg-[#48e4ff] text-[#48e4ff] hover:text-[#051a20] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <Play size={12} fill="currentColor" />
                            <span>Stream & Mount</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* AI Model Selector & Settings Ribbon */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#091a1e] border border-[#163a43]">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-[#48e4ff]" />
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">AI Model Engine:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={selectedAiModel}
                        onChange={(e) => setSelectedAiModel(e.target.value as any)}
                        className="bg-[#051316] border border-[#183a43] text-[#48e4ff] text-xs font-mono font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                      >
                        <option value="gemini-3.8-flash">Gemini 3.8 Flash (Grounded Live Search)</option>
                        <option value="gemini-4-argon">Gemini 4 Argon (Complex STEM & Reasoning)</option>
                        <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (High Speed)</option>
                      </select>
                    </div>
                  </div>

                  {/* AI Oracle Query Field */}
                  <form onSubmit={handleOracleSubmit} className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Sparkles size={18} className="absolute left-4 top-3.5 text-cyan-400 animate-pulse" />
                      <input
                        type="text"
                        value={oraclePrompt}
                        onChange={(e) => setOraclePrompt(e.target.value)}
                        placeholder="Ask the AI Oracle (e.g., Explain music theory, summarize Billie Eilish's tour, review Daft Punk)..."
                        className="w-full bg-[#071317] border border-[#1a3840] text-white rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:border-[#48e4ff] text-sm transition-colors shadow-inner"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={oracleLoading || !oraclePrompt.trim()}
                      className="px-6 py-3.5 bg-[#48e4ff] text-[#051a20] font-bold rounded-2xl text-xs hover:bg-[#8df5be] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg cursor-pointer shrink-0"
                    >
                      {oracleLoading ? <Loader2 size={16} className="animate-spin" /> : 'Query Oracle'}
                    </button>
                  </form>

                  {/* AI Output Result Box */}
                  {oracleLoading && (
                    <div className="bg-[#071317] border border-[#1a3840] rounded-2xl p-8 text-center text-cyan-400 space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                      <div className="text-xs font-mono font-bold tracking-wider">Accessing {selectedAiModel} Engine...</div>
                    </div>
                  )}

                  {oracleResponse && (
                    <div className="bg-[#071317] border border-[#1a3840] rounded-2xl p-6 space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-[#12282e] pb-3">
                        <div className="flex items-center gap-2 text-xs text-[#48e4ff] font-mono font-bold">
                          <Sparkles className="w-4 h-4 text-[#48e4ff] animate-pulse" />
                          <span>AI Model Output ({oracleResponse.model || selectedAiModel})</span>
                        </div>

                        {/* TTS Voice Speech Button */}
                        <button
                          onClick={() => handleSynthesizeSpeech(oracleResponse.answer)}
                          disabled={ttsLoading}
                          className="px-3 py-1.5 rounded-xl bg-[#0e2a32] hover:bg-[#163e49] text-[#48e4ff] border border-[#1b4855] text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-md"
                        >
                          {ttsLoading ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
                          <span>Listen (Gemini TTS)</span>
                        </button>
                      </div>

                      <div className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                        {oracleResponse.answer}
                      </div>

                      {/* Citations / Grounding metadata */}
                      {oracleResponse.groundingMetadata?.groundingChunks && oracleResponse.groundingMetadata.groundingChunks.length > 0 && (
                        <div className="pt-4 border-t border-[#12282e]">
                          <h5 className="text-[10px] uppercase font-mono tracking-wider text-[#789d9a] mb-2 font-bold">
                            Verified Grounding Sources
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {oracleResponse.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => {
                              if (!chunk.web?.uri) return null;
                              const domain = new URL(chunk.web.uri).hostname.replace('www.', '');
                              return (
                                <a
                                  key={idx}
                                  href={chunk.web.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded bg-[#102d33] border border-[#235863] text-[10px] text-[#48e4ff] hover:bg-[#1a444d] hover:text-white transition flex items-center gap-1 font-mono"
                                >
                                  <span>{domain}</span>
                                  <ExternalLink size={10} />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SUB-PAGE: YOUTUBE & INVIDIOUS DEDICATED PLAYER */}
          {activeTab === 'yt-player' && (
            <div className="h-full animate-in fade-in duration-300">
              <InvidiousMain
                onPlayAudioOnly={handlePlayTrack}
                onOpenDsp={handleOpenDsp}
              />
            </div>
          )}

          {/* SUB-PAGE: MOVIES & CINEMA HUB */}
          {activeTab === 'movies' && (
            <div className="h-full animate-in fade-in duration-300">
              <MoviesMain settings={settings} />
            </div>
          )}

          {/* SUB-PAGE: YOUTUBE MUSIC DECK */}
          {activeTab === 'yt-music' && (
            <div className="h-full animate-in fade-in duration-300">
              <YtMusicMain
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onTogglePlay={handlePlayPause}
                onNext={handleNextTrack}
                onPrev={handlePrevTrack}
                queue={queue}
                onAddToQueue={handleAddToQueue}
                onRemoveFromQueue={handleRemoveFromQueue}
                onClearQueue={handleClearQueue}
                onOpenDsp={handleOpenDsp}
              />
            </div>
          )}

          {/* SUB-PAGE: SPOTIFY DEDICATED PLAYER */}
          {activeTab === 'spotify' && (
            <div className="h-full animate-in fade-in duration-300">
              <SpotifyMain
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onTogglePlay={handlePlayPause}
                onNext={handleNextTrack}
                onPrev={handlePrevTrack}
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
                volume={settings.playback.volume}
                onVolumeChange={handleVolumeChange}
                queue={queue}
                onOpenDsp={handleOpenDsp}
              />
            </div>
          )}

          {/* SUB-PAGE: PROXY MATRIX & LATENCY BENCHMARK DECK */}
          {activeTab === 'servers' && (
            <div className="h-full animate-in fade-in duration-300">
              <ProxiesMain />
            </div>
          )}

          {/* SUB-PAGE: UNBLOCKED WEB PROXY BROWSER */}
          {activeTab === 'web-proxy' && (
            <div className="h-full animate-in fade-in duration-300">
              <WebProxyMain />
            </div>
          )}

          {/* TAB 5: SETTINGS VIEW */}
          {activeTab === 'settings' && (
            <div className="animate-in fade-in duration-300">
              <SettingsView
                settings={settings}
                onUpdateSettings={setSettings}
                onWipeVault={handleWipeVault}
                onOpenDsp={handleOpenDsp}
              />
            </div>
          )}
        </div>

        {/* Fixed Player Transport Bar */}
        <PlayerBar
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          settings={settings}
          onPlayPause={handlePlayPause}
          onNext={handleNextTrack}
          onPrev={handlePrevTrack}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onToggleShuffle={handleToggleShuffle}
          onToggleRepeat={handleToggleRepeat}
          onToggleLike={handleToggleLike}
          onOpenDsp={handleOpenDsp}
        />
      </main>

      {/* MODALS */}
      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onSyncComplete={reloadLibrary}
        isSpotifyConnected={isSpotifyConnected}
        onConnectSpotify={handleConnectSpotify}
      />

      <NovaAcModal
        isOpen={showNovaModal}
        onClose={() => setShowNovaModal(false)}
        onImportComplete={reloadLibrary}
      />

      <ShazamModal
        isOpen={showShazamModal}
        onClose={() => setShowShazamModal(false)}
        onPlayTrack={async (track) => {
          await saveTrack(track);
          setTracks((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
          handlePlayTrack(track);
        }}
        onAddToVault={async (track) => {
          await saveTrack(track);
          setTracks((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
        }}
      />

      <ErrorBoundary fallbackTitle="Audio DSP & Equalizer Deck">
        <AudioDspModal
          isOpen={showDspModal}
          onClose={() => setShowDspModal(false)}
          settings={settings}
          onUpdateSettings={setSettings}
        />
      </ErrorBoundary>

      <SetupWizardModal
        isOpen={showSetupWizard}
        onClose={() => setShowSetupWizard(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      <ChangelogModal
        isOpen={showChangelogModal}
        onClose={() => setShowChangelogModal(false)}
      />
    </div>
  );
}
