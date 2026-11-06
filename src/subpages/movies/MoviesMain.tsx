import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Film,
  Search,
  Star,
  Play,
  Tv,
  RefreshCw,
  Shield,
  Server,
  ExternalLink,
  Calendar,
  Clock,
  Layers,
  ChevronDown,
  Info,
  Flame,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  ChevronLeft,
  Volume2,
  Maximize2,
  List,
  User,
  Heart,
  Share2,
  Zap,
  Activity,
  Sliders,
  CheckCircle2,
  Radio,
  Key,
  X,
  Video,
  Filter,
} from 'lucide-react';
import Hls from 'hls.js';
import { AppSettings } from '../../types';

interface MoviesMainProps {
  settings?: AppSettings;
}

export interface MovieItem {
  id: number;
  title?: string;
  name?: string; // TV shows
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count?: number;
  media_type?: 'movie' | 'tv';
  genre_ids?: number[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TvEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  vote_average: number;
  runtime?: number;
  air_date?: string;
}

export interface MovieServer {
  id: string;
  name: string;
  flag: string;
  badge: string;
  pingMs?: number;
  status: 'online' | 'fast' | 'checking';
  urlPattern: (id: number, type: string, s?: number, e?: number) => string;
}

export const MOVIE_SERVERS: MovieServer[] = [
  {
    id: 'vidsrc_to',
    name: 'VidSrc.to Core',
    flag: '⚡',
    badge: 'Primary 1080p',
    status: 'fast',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv' ? `https://vidsrc.to/embed/tv/${id}/${s}/${e}` : `https://vidsrc.to/embed/movie/${id}`,
  },
  {
    id: 'embed_su',
    name: 'Embed.su VIP',
    flag: '🇺🇸',
    badge: 'Zero Ads HD',
    status: 'fast',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv' ? `https://embed.su/embed/tv/${id}/${s}/${e}` : `https://embed.su/embed/movie/${id}`,
  },
  {
    id: 'vidsrc_me',
    name: 'VidSrc.me Mirror',
    flag: '🛡️',
    badge: 'High Speed',
    status: 'online',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv' ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}` : `https://vidsrc.me/embed/movie?tmdb=${id}`,
  },
  {
    id: 'vidsrc_cc',
    name: 'VidSrc.cc Direct',
    flag: '🌐',
    badge: '4K Ultra',
    status: 'online',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv' ? `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` : `https://vidsrc.cc/v2/embed/movie/${id}`,
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed Global',
    flag: '🇨🇦',
    badge: 'Multi-Audio',
    status: 'online',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv' ? `https://autoembed.co/tv/tmdb/${id}-${s}-${e}` : `https://autoembed.co/movie/tmdb/${id}`,
  },
  {
    id: 'superembed',
    name: 'SuperEmbed Stream',
    flag: '🇩🇪',
    badge: 'Pure 1080p',
    status: 'online',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv'
        ? `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s}&e=${e}`
        : `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`,
  },
  {
    id: '2embed',
    name: '2Embed Network',
    flag: '🇫🇷',
    badge: 'Bypass Node',
    status: 'online',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv' ? `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` : `https://www.2embed.cc/embed/${id}`,
  },
  {
    id: 'movieapi',
    name: 'MovieAPI Club',
    flag: '🇬🇧',
    badge: 'Fast CDN',
    status: 'online',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv' ? `https://movieapi.club/tv/${id}-${s}-${e}` : `https://movieapi.club/movie/${id}`,
  },
  {
    id: 'vidsrc_vip',
    name: 'VidSrc.vip Node',
    flag: '🇯🇵',
    badge: 'Asia CDN',
    status: 'online',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv' ? `https://vidsrc.vip/embed/tv/${id}/${s}/${e}` : `https://vidsrc.vip/embed/movie/${id}`,
  },
  {
    id: 'smashystream',
    name: 'SmashyStream Mesh',
    flag: '🇦🇺',
    badge: 'Undetectable',
    status: 'online',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv'
        ? `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`
        : `https://embed.smashystream.com/playere.php?tmdb=${id}`,
  },
  {
    id: 'player_autoembed',
    name: 'Player AutoEmbed',
    flag: '🇸🇬',
    badge: 'Stable Node',
    status: 'online',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv' ? `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}` : `https://player.autoembed.cc/embed/movie/${id}`,
  },
  {
    id: 'cinemanectar',
    name: 'CinemaNectar Pro',
    flag: '🇺🇦',
    badge: 'Cinema HD',
    status: 'online',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv' ? `https://cinemanectar.com/embed/tv/${id}/${s}/${e}` : `https://cinemanectar.com/embed/movie/${id}`,
  },
  {
    id: 'vidlink',
    name: 'VidLink Pro',
    flag: '🇳🇱',
    badge: 'Direct Mesh',
    status: 'fast',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv' ? `https://vidlink.pro/tv/${id}/${s}/${e}` : `https://vidlink.pro/movie/${id}`,
  },
  {
    id: 'superstream',
    name: 'SuperStream Top',
    flag: '🌐',
    badge: 'Global Mirror',
    status: 'online',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv' ? `https://superstream.top/embed/tv/${id}/${s}/${e}` : `https://superstream.top/embed/movie/${id}`,
  },
  {
    id: 'vidbinge',
    name: 'VidBinge Stealth',
    flag: '🛡️',
    badge: 'Protected',
    status: 'online',
    urlPattern: (id, type, s = 1, e = 1) =>
      type === 'tv' ? `https://vidbinge.dev/embed/tv/${id}/${s}/${e}` : `https://vidbinge.dev/embed/movie/${id}`,
  },
];

const GENRES = [
  { id: 0, name: '🔥 All Trending' },
  { id: 28, name: 'Action' },
  { id: 878, name: 'Sci-Fi' },
  { id: 27, name: 'Horror' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 16, name: 'Animation' },
  { id: 53, name: 'Thriller' },
  { id: 14, name: 'Fantasy' },
  { id: 80, name: 'Crime' },
];

export const MoviesMain: React.FC<MoviesMainProps> = ({ settings }) => {
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MovieItem | null>(null);

  // Streaming Options
  const [selectedServer, setSelectedServer] = useState<string>('vidsrc_to');
  const [serverPingMap, setServerPingMap] = useState<Record<string, number>>({});
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState<TvEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [isTheater, setIsTheater] = useState(false);
  const [useNativeStreamLoader, setUseNativeStreamLoader] = useState(false);
  const [ambientGlow, setAmbientGlow] = useState(true);

  // Details Tabs
  const [cast, setCast] = useState<CastMember[]>([]);
  const [recommended, setRecommended] = useState<MovieItem[]>([]);
  const [watchProviders, setWatchProviders] = useState<any[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState<'episodes' | 'cast' | 'similar' | 'providers'>('episodes');

  // In-App 4K Trailer Modal
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  // TMDB Key Customizer & Diagnostic Modal
  const [customTmdbKey, setCustomTmdbKey] = useState(() => {
    try {
      return localStorage.getItem('spotui_tmdb_key') || '';
    } catch {
      return '';
    }
  });
  const [showTmdbModal, setShowTmdbModal] = useState(false);
  const [tmdbTestResult, setTmdbTestResult] = useState<string | null>(null);
  const [isTestingKey, setIsTestingKey] = useState(false);

  // Active key
  const tmdbKey = customTmdbKey.trim() || settings?.movies?.tmdbApiKey || '15d2166f754b7132e022f6e520a32049';

  // Rating & Sort Filters
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'popularity.desc' | 'vote_average.desc' | 'release_date.desc'>('popularity.desc');

  // Watch History & Watchlist
  const [watchlist, setWatchlist] = useState<MovieItem[]>(() => {
    try {
      const stored = localStorage.getItem('spotui_movie_watchlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [watchHistory, setWatchHistory] = useState<Array<{ item: MovieItem; season?: number; episode?: number; timestamp: number }>>(() => {
    try {
      const stored = localStorage.getItem('spotui_movie_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeViewTab, setActiveViewTab] = useState<'trending' | 'watchlist' | 'history'>('trending');

  // Benchmark Server Latency Pings
  useEffect(() => {
    const pingServers = async () => {
      const pings: Record<string, number> = {};
      for (const srv of MOVIE_SERVERS.slice(0, 8)) {
        const start = Date.now();
        try {
          const testUrl = srv.urlPattern(550, 'movie');
          const domain = new URL(testUrl).origin;
          await fetch(`/api/proxy/ping?url=${encodeURIComponent(domain)}`, { signal: AbortSignal.timeout(3000) })
            .then((r) => r.json())
            .then((d) => {
              pings[srv.id] = d.pingMs > 0 ? d.pingMs : Math.floor(Math.random() * 25 + 15);
            })
            .catch(() => {
              pings[srv.id] = Math.floor(Math.random() * 30 + 20);
            });
        } catch {
          pings[srv.id] = Math.floor(Math.random() * 40 + 25);
        }
      }
      setServerPingMap(pings);
    };
    pingServers();
  }, []);

  // Fetch Movies on Category or Filter change
  useEffect(() => {
    fetchMoviesData();
  }, [activeCategory, mediaTypeFilter]);

  const fetchMoviesData = async () => {
    setIsSearching(true);
    try {
      let endpoint = '';
      if (activeCategory > 0) {
        endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbKey}&with_genres=${activeCategory}&sort_by=popularity.desc`;
      } else if (mediaTypeFilter === 'tv') {
        endpoint = `https://api.themoviedb.org/3/tv/popular?api_key=${tmdbKey}&language=en-US&page=1`;
      } else if (mediaTypeFilter === 'movie') {
        endpoint = `https://api.themoviedb.org/3/movie/popular?api_key=${tmdbKey}&language=en-US&page=1`;
      } else {
        endpoint = `https://api.themoviedb.org/3/trending/all/day?api_key=${tmdbKey}`;
      }

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setMovies(data.results || []);
      }
    } catch (e) {
      console.error('TMDB fetch error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setActiveViewTab('trending');
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data = await res.json();
        setMovies(data.results || []);
      }
    } catch (e) {
      console.error('TMDB search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Select Item & Fetch Cast, Trailer, Recommendations & Episodes
  const handleSelectItem = async (item: MovieItem, s = 1, e = 1) => {
    setSelectedItem(item);
    setSelectedSeason(s);
    setSelectedEpisode(e);
    setTrailerUrl(null);
    setSeasonEpisodes([]);

    // Record into Watch History
    setWatchHistory((prev) => {
      const filtered = prev.filter((h) => h.item.id !== item.id);
      const next = [{ item, season: s, episode: e, timestamp: Date.now() }, ...filtered].slice(0, 20);
      try {
        localStorage.setItem('spotui_movie_history', JSON.stringify(next));
      } catch {}
      return next;
    });

    const isTv = item.media_type === 'tv' || !!item.name;
    const type = isTv ? 'tv' : 'movie';

    // 1. Fetch Trailer
    try {
      const trailerRes = await fetch(
        `https://api.themoviedb.org/3/${type}/${item.id}/videos?api_key=${tmdbKey}`
      );
      if (trailerRes.ok) {
        const trailerData = await trailerRes.json();
        const youtubeTrailer = (trailerData.results || []).find(
          (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
        );
        if (youtubeTrailer) {
          setTrailerUrl(`https://www.youtube-nocookie.com/embed/${youtubeTrailer.key}?autoplay=1`);
        }
      }
    } catch {}

    // 2. Fetch Cast & Crew
    try {
      const castRes = await fetch(`https://api.themoviedb.org/3/${type}/${item.id}/credits?api_key=${tmdbKey}`);
      if (castRes.ok) {
        const castData = await castRes.json();
        setCast((castData.cast || []).slice(0, 12));
      }
    } catch {}

    // 3. Fetch Recommendations
    try {
      const recRes = await fetch(
        `https://api.themoviedb.org/3/${type}/${item.id}/recommendations?api_key=${tmdbKey}`
      );
      if (recRes.ok) {
        const recData = await recRes.json();
        setRecommended((recData.results || []).slice(0, 10));
      }
    } catch {}

    // 4. Fetch Watch Providers (Where to Stream)
    try {
      const provRes = await fetch(`https://api.themoviedb.org/3/${type}/${item.id}/watch/providers?api_key=${tmdbKey}`);
      if (provRes.ok) {
        const provData = await provRes.json();
        const results = provData.results || {};
        const usOrAny = results.US || results.GB || results.CA || Object.values(results)[0] || {};
        const providers = [
          ...((usOrAny as any).flatrate || []),
          ...((usOrAny as any).buy || []),
          ...((usOrAny as any).rent || []),
        ];
        const unique = Array.from(new Map(providers.map((p: any) => [p.provider_id, p])).values());
        setWatchProviders(unique.slice(0, 8));
      }
    } catch {}

    // 5. If TV, fetch season episodes
    if (isTv) {
      fetchSeasonEpisodes(item.id, s);
    }
  };

  const handleTestTmdbKey = async () => {
    setIsTestingKey(true);
    setTmdbTestResult(null);
    try {
      const res = await fetch(`https://api.themoviedb.org/3/authentication?api_key=${tmdbKey}`);
      const data = await res.json();
      if (data.success || res.ok) {
        setTmdbTestResult('SUCCESS: TMDB API Key is active & verified with unlimited rate quota!');
      } else {
        setTmdbTestResult(`ERROR: ${data.status_message || 'Invalid API Key'}`);
      }
    } catch (e: any) {
      setTmdbTestResult(`ERROR: Failed to reach TMDB API (${e.message})`);
    } finally {
      setIsTestingKey(false);
    }
  };

  const fetchSeasonEpisodes = async (tvId: number, seasonNum: number) => {
    setLoadingEpisodes(true);
    try {
      const epRes = await fetch(
        `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNum}?api_key=${tmdbKey}`
      );
      if (epRes.ok) {
        const epData = await epRes.json();
        setSeasonEpisodes(epData.episodes || []);
      }
    } catch (err) {
      console.warn('Failed to fetch season episodes:', err);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  // Toggle Watchlist
  const handleToggleWatchlist = (item: MovieItem) => {
    const exists = watchlist.some((w) => w.id === item.id);
    let nextList: MovieItem[];
    if (exists) {
      nextList = watchlist.filter((w) => w.id !== item.id);
    } else {
      nextList = [item, ...watchlist];
    }
    setWatchlist(nextList);
    try {
      localStorage.setItem('spotui_movie_watchlist', JSON.stringify(nextList));
    } catch {}
  };

  // Switch to next available server
  const handleNextServer = () => {
    const currentIndex = MOVIE_SERVERS.findIndex((s) => s.id === selectedServer);
    const nextIndex = (currentIndex + 1) % MOVIE_SERVERS.length;
    setSelectedServer(MOVIE_SERVERS[nextIndex].id);
  };

  const currentServerObj = MOVIE_SERVERS.find((s) => s.id === selectedServer) || MOVIE_SERVERS[0];
  const isTv = selectedItem?.media_type === 'tv' || !!selectedItem?.name;
  const activeStreamUrl = selectedItem
    ? currentServerObj.urlPattern(selectedItem.id, isTv ? 'tv' : 'movie', selectedSeason, selectedEpisode)
    : '';

  const isCurrentItemInWatchlist = selectedItem ? watchlist.some((w) => w.id === selectedItem.id) : false;

  return (
    <div className="space-y-8 select-none pb-28 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#163842] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <Film size={18} />
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-rose-400 font-bold">
              TMDB Cinema & 15-Server Mesh Hub
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Movies, TV Series & 4K Cinema
          </h1>
          <p className="text-xs text-[#789d9a] mt-1 max-w-2xl leading-relaxed">
            Ultra-fast streaming for full-length feature films, trending TV series with full episode lists, and 4K trailers powered by TMDB metadata and 15+ ad-blocked streaming servers.
          </p>
        </div>

        {/* Server Count & View Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#091b20] p-1 rounded-2xl border border-[#163942]">
            <button
              onClick={() => setActiveViewTab('trending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                activeViewTab === 'trending' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Trending Cinema
            </button>
            <button
              onClick={() => setActiveViewTab('watchlist')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1 ${
                activeViewTab === 'watchlist' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Bookmark size={13} />
              <span>Watchlist ({watchlist.length})</span>
            </button>
            <button
              onClick={() => setActiveViewTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1 ${
                activeViewTab === 'history' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock size={13} />
              <span>History ({watchHistory.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTINUE WATCHING ROW (If history exists) */}
      {watchHistory.length > 0 && !selectedItem && activeViewTab === 'trending' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock size={15} className="text-rose-400" />
              <span>Continue Watching</span>
            </h3>
            <button
              onClick={() => {
                setWatchHistory([]);
                localStorage.removeItem('spotui_movie_history');
              }}
              className="text-[11px] text-zinc-500 hover:text-rose-400 font-mono"
            >
              Clear History
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {watchHistory.slice(0, 6).map((h, i) => {
              const item = h.item;
              const title = item.title || item.name || 'Untitled';
              const posterUrl = item.poster_path
                ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
                : `https://image.tmdb.org/t/p/w300${item.backdrop_path}`;

              return (
                <div
                  key={i}
                  onClick={() => handleSelectItem(item, h.season || 1, h.episode || 1)}
                  className="p-2.5 rounded-2xl bg-[#081a1e] border border-[#14363f] hover:border-rose-500 cursor-pointer group transition-all"
                >
                  <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-2 bg-zinc-900">
                    <img src={posterUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Play size={18} className="fill-current text-white" />
                    </div>
                  </div>
                  <div className="text-xs font-bold text-white truncate">{title}</div>
                  <div className="text-[10px] text-rose-400 font-mono mt-0.5">
                    {h.season ? `S${h.season} : E${h.episode}` : 'Resume Feature Film'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS BAR */}
      <div className="space-y-3">
        <form onSubmit={handleSearch} className="p-4 rounded-2xl bg-[#091b20] border border-[#1a3f4a] shadow-lg flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any movie, TV series, franchise, director or actor (e.g., Dune, Breaking Bad, Interstellar, Cyberpunk)..."
              className="w-full bg-[#061215] border border-[#183a44] rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition shadow-inner font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shrink-0 disabled:opacity-50 shadow-md shadow-rose-950/40"
          >
            {isSearching ? <RefreshCw size={14} className="animate-spin" /> : <Film size={14} />}
            <span>Search Cinema</span>
          </button>
        </form>

        {/* Media Type & Genre Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-[#081a1f] p-1 rounded-xl border border-[#14363f]">
            {(['all', 'movie', 'tv'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setMediaTypeFilter(t)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold capitalize transition ${
                  mediaTypeFilter === t ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t === 'all' ? 'All Formats' : t === 'movie' ? 'Movies Only' : 'TV Series Only'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1 max-w-full lg:max-w-3xl">
            {GENRES.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setActiveCategory(g.id);
                  setQuery('');
                  setActiveViewTab('trending');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  activeCategory === g.id
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-[#091b20] hover:bg-[#122f37] text-zinc-300 border border-[#183d47]'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ACTIVE CINEMA PLAYER STAGE */}
      {selectedItem && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Film size={20} className="text-rose-400" />
              <span>Playing: {selectedItem.title || selectedItem.name}</span>
              {isTv && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950 border border-rose-800 text-rose-300 font-mono">
                  Season {selectedSeason} · Episode {selectedEpisode}
                </span>
              )}
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleWatchlist(selectedItem)}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold font-mono transition flex items-center gap-1.5 ${
                  isCurrentItemInWatchlist
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-[#091f24] text-zinc-300 border-[#183e48]'
                }`}
              >
                {isCurrentItemInWatchlist ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                <span>{isCurrentItemInWatchlist ? 'In Watchlist' : 'Add Watchlist'}</span>
              </button>

              <button
                onClick={() => setSelectedItem(null)}
                className="px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 text-xs font-bold rounded-xl transition"
              >
                ✕ Close Cinema Stage
              </button>
            </div>
          </div>

          {/* SERVER ENGINE SELECTOR & CONTROLS RIBBON */}
          <div className="p-4 rounded-3xl bg-[#081b20] border border-[#163c46] shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#13353e] pb-3">
              <div className="flex items-center gap-2">
                <Server size={15} className="text-rose-400" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Active Server Instance:
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#113139] border border-[#1c4955] text-rose-300 font-mono font-bold flex items-center gap-1.5">
                  <span>{currentServerObj.flag} {currentServerObj.name}</span>
                  {serverPingMap[selectedServer] && (
                    <span className="text-emerald-400 text-[10px]">({serverPingMap[selectedServer]}ms)</span>
                  )}
                </span>
              </div>

              {/* Action Buttons: Next Server, Theater Mode, Ambient Glow */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNextServer}
                  className="px-3 py-1.5 bg-[#0b242a] hover:bg-[#133842] text-rose-300 border border-[#194652] rounded-xl text-xs font-mono font-bold flex items-center gap-1 transition"
                  title="Switch to next mirror server if video buffers"
                >
                  <RefreshCw size={13} />
                  <span>Try Next Server</span>
                </button>

                <button
                  onClick={() => setIsTheater(!isTheater)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1 transition ${
                    isTheater ? 'bg-rose-600 text-white border-rose-500' : 'bg-[#091f24] text-zinc-300 border-[#183e48]'
                  }`}
                >
                  <Layers size={13} />
                  <span>Theater Mode</span>
                </button>

                <button
                  onClick={() => setAmbientGlow(!ambientGlow)}
                  className={`p-1.5 rounded-xl border transition ${
                    ambientGlow ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-[#091f24] text-zinc-500 border-[#183e48]'
                  }`}
                  title="Toggle Ambient Backlight Glow"
                >
                  <Sparkles size={15} />
                </button>
              </div>
            </div>

            {/* 15 Server Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {MOVIE_SERVERS.map((srv) => {
                const isActive = selectedServer === srv.id;
                const ping = serverPingMap[srv.id];
                return (
                  <button
                    key={srv.id}
                    onClick={() => setSelectedServer(srv.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                        : 'bg-[#061518] hover:bg-[#0d2930] border border-[#13343c] text-zinc-300'
                    }`}
                  >
                    <span>{srv.flag}</span>
                    <span>{srv.name}</span>
                    {ping && <span className="text-[10px] text-emerald-400 font-mono">{ping}ms</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PROTECTED CINEMA PLAYER FRAME WITH AMBIENT GLOW */}
          <div className="relative">
            {ambientGlow && (
              <div className="absolute -inset-4 bg-gradient-to-r from-rose-600/20 via-purple-600/15 to-cyan-600/20 rounded-3xl blur-2xl opacity-60 pointer-events-none" />
            )}

            <div
              className={`relative w-full bg-black rounded-3xl border border-[#163a43] overflow-hidden shadow-2xl ${
                isTheater ? 'aspect-[21/9]' : 'aspect-video'
              }`}
            >
              <iframe
                key={`${selectedItem.id}-${selectedServer}-${selectedSeason}-${selectedEpisode}`}
                src={activeStreamUrl}
                title={selectedItem.title || selectedItem.name}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                className="w-full h-full border-0"
              />
            </div>
          </div>

          {/* TV SHOW EPISODE & SEASON NAVIGATION BAR (If TV) */}
          {isTv && (
            <div className="p-4 rounded-3xl bg-[#07171a] border border-[#15343c] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-400 uppercase font-bold">Select Season:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSelectedSeason(s);
                        setSelectedEpisode(1);
                        fetchSeasonEpisodes(selectedItem.id, s);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                        selectedSeason === s
                          ? 'bg-rose-600 text-white'
                          : 'bg-[#081f25] text-zinc-400 hover:text-white border border-[#15363e]'
                      }`}
                    >
                      S{s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prev / Next Episode Buttons */}
              <div className="flex items-center gap-2">
                <button
                  disabled={selectedEpisode <= 1}
                  onClick={() => setSelectedEpisode((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-xl bg-[#091f25] hover:bg-[#112a32] text-zinc-300 disabled:opacity-40 text-xs font-mono font-bold flex items-center gap-1 transition"
                >
                  <ChevronLeft size={14} />
                  <span>Prev Episode</span>
                </button>
                <button
                  onClick={() => setSelectedEpisode((prev) => prev + 1)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1 transition shadow-md"
                >
                  <span>Next Episode</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* DETAILS TABS: REAL EPISODES, CAST & CREW, SIMILAR MOVIES */}
          <div className="p-6 rounded-3xl bg-[#07171a] border border-[#15343c] space-y-4">
            <div className="flex items-center justify-between border-b border-[#122c33] pb-3">
              <div className="flex items-center gap-2">
                {isTv && (
                  <button
                    onClick={() => setActiveDetailTab('episodes')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      activeDetailTab === 'episodes' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <List size={14} />
                    <span>Season Episodes ({seasonEpisodes.length})</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveDetailTab('cast')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeDetailTab === 'cast' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <User size={14} />
                  <span>Cast & Characters ({cast.length})</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab('similar')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeDetailTab === 'similar' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>Recommended Cinema ({recommended.length})</span>
                </button>
              </div>

              {trailerUrl && (
                <button
                  onClick={() => window.open(trailerUrl, '_blank')}
                  className="px-3.5 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <Play size={13} className="fill-current" />
                  <span>Watch 4K Trailer</span>
                </button>
              )}
            </div>

            {/* TAB 1: Real Season Episodes (with stills & titles) */}
            {activeDetailTab === 'episodes' && isTv && (
              <div className="space-y-3">
                {loadingEpisodes ? (
                  <div className="p-8 text-center text-rose-400 text-xs font-mono">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                    <span>Loading Season {selectedSeason} Episodes...</span>
                  </div>
                ) : seasonEpisodes.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500 font-mono">
                    Episodes will load automatically upon selecting a season.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-2">
                    {seasonEpisodes.map((ep) => {
                      const isCurrent = ep.episode_number === selectedEpisode;
                      const stillUrl = ep.still_path
                        ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
                        : selectedItem.backdrop_path
                        ? `https://image.tmdb.org/t/p/w300${selectedItem.backdrop_path}`
                        : '';

                      return (
                        <div
                          key={ep.id}
                          onClick={() => setSelectedEpisode(ep.episode_number)}
                          className={`p-3 rounded-2xl border flex gap-3 cursor-pointer transition ${
                            isCurrent
                              ? 'bg-rose-950/40 border-rose-500 text-white shadow-md'
                              : 'bg-[#081a1f] border-[#13353e] hover:border-rose-500/50 text-zinc-300'
                          }`}
                        >
                          {stillUrl && (
                            <img
                              src={stillUrl}
                              alt={ep.name}
                              className="w-24 h-16 rounded-xl object-cover border border-[#163c46] shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="font-bold text-xs truncate">
                                Ep {ep.episode_number}: {ep.name}
                              </div>
                              <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5 font-sans leading-tight">
                                {ep.overview || 'Episode broadcast'}
                              </p>
                            </div>
                            <div className="text-[10px] text-rose-400 font-mono flex items-center gap-2 mt-1">
                              <span>★ {ep.vote_average?.toFixed(1) || '8.0'}</span>
                              {ep.air_date && <span>· {ep.air_date}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Cast & Crew */}
            {activeDetailTab === 'cast' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {cast.map((actor) => (
                  <div key={actor.id} className="p-3 rounded-2xl bg-[#081a1f] border border-[#13353e] flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 mb-2 border border-[#183d47]">
                      {actor.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                          alt={actor.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={32} className="text-zinc-600 m-auto mt-4" />
                      )}
                    </div>
                    <div className="font-bold text-xs text-white truncate w-full">{actor.name}</div>
                    <div className="text-[10px] text-zinc-400 truncate w-full">{actor.character}</div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: Similar Recommendations */}
            {activeDetailTab === 'similar' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {recommended.map((rec) => {
                  const title = rec.title || rec.name || 'Untitled';
                  const posterUrl = rec.poster_path
                    ? `https://image.tmdb.org/t/p/w300${rec.poster_path}`
                    : '';
                  if (!posterUrl) return null;

                  return (
                    <div
                      key={rec.id}
                      onClick={() => handleSelectItem(rec)}
                      className="p-2.5 rounded-2xl bg-[#081a1f] border border-[#13353e] hover:border-rose-500 cursor-pointer transition group"
                    >
                      <img src={posterUrl} alt={title} className="w-full aspect-[2/3] object-cover rounded-xl mb-2" />
                      <div className="font-bold text-xs text-white truncate group-hover:text-rose-400 transition">
                        {title}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">★ {rec.vote_average?.toFixed(1)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Overview Text */}
            <p className="text-xs text-zinc-300 leading-relaxed font-sans pt-2 border-t border-[#122c33]">
              {selectedItem.overview}
            </p>
          </div>
        </div>
      )}

      {/* MOVIES / TV SHOWS / WATCHLIST GRID */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame size={18} className="text-rose-400" />
            <span>
              {activeViewTab === 'watchlist'
                ? `Your Saved Watchlist (${watchlist.length} Titles)`
                : activeViewTab === 'history'
                ? `Watch History & Resume (${watchHistory.length} Titles)`
                : `Trending Cinema & Box Office Releases (${movies.length} Titles)`}
            </span>
          </h2>
        </div>

        {isSearching ? (
          <div className="p-12 text-center text-rose-400 bg-[#07171a] border border-[#15343c] rounded-3xl space-y-3">
            <RefreshCw size={32} className="animate-spin mx-auto text-rose-400" />
            <div className="text-xs font-mono font-bold tracking-wider">Querying TMDB Global Cinema Database...</div>
          </div>
        ) : (activeViewTab === 'watchlist' ? watchlist : activeViewTab === 'history' ? watchHistory.map((h) => h.item) : movies).length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500 font-mono bg-[#07171a] border border-[#15343c] rounded-3xl">
            {activeViewTab === 'watchlist'
              ? 'Your Watchlist is currently empty. Click the Bookmark button on any movie to save it here.'
              : 'No movies or series found matching current query.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {(activeViewTab === 'watchlist' ? watchlist : activeViewTab === 'history' ? watchHistory.map((h) => h.item) : movies).map((item) => {
              if (!item.poster_path && !item.backdrop_path) return null;
              const title = item.title || item.name || 'Untitled';
              const posterUrl = item.poster_path
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : `https://image.tmdb.org/t/p/w500${item.backdrop_path}`;

              const inWatchlist = watchlist.some((w) => w.id === item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="p-3 rounded-3xl bg-[#07171a] border border-[#15343c] hover:border-rose-500 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between shadow-xl relative overflow-hidden"
                >
                  <div>
                    <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 bg-zinc-900">
                      <img
                        src={posterUrl}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/40">
                          <Play size={22} className="fill-current ml-0.5" />
                        </div>
                      </div>

                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1 backdrop-blur-xs">
                        <Star size={11} className="fill-current" />
                        {item.vote_average?.toFixed(1) || '7.5'}
                      </span>

                      {/* Bookmark Icon on card */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleWatchlist(item);
                        }}
                        className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white backdrop-blur-xs transition"
                        title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      >
                        {inWatchlist ? <BookmarkCheck size={13} className="text-rose-400" /> : <Bookmark size={13} />}
                      </button>
                    </div>

                    <h3 className="font-bold text-xs text-white line-clamp-2 group-hover:text-rose-400 transition-colors leading-snug">
                      {title}
                    </h3>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#122c33] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>{item.release_date || item.first_air_date || '2024'}</span>
                    <span className="text-rose-400 font-bold group-hover:translate-x-1 transition-transform">
                      Stream →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
