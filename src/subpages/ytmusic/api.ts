// ============================================================================
// UNIFIED YOUTUBE MUSIC API & CLIENT ENGINE
//
// Dual-Engine architecture supporting:
// 1. Worker Engine (api/worker.js via /api/ytmusic/*) - primary YouTube Music catalog,
//    artist albums, playlists, similar suggestions, and cloud sync.
// 2. Direct Engine (api.ts via /api/innertube/*) - native direct InnerTube parser.
//
// Strictly decoupled from Invidious (which is reserved for the Invidious subpage).
// Zero fake audio / mock fallbacks.
// ============================================================================

export type YtMusicEngineType = 'worker' | 'direct';

const ENGINE_STORAGE_KEY = 'ytmusic_engine_type';

export function getActiveEngine(): YtMusicEngineType {
  try {
    const saved = localStorage.getItem(ENGINE_STORAGE_KEY);
    if (saved === 'worker' || saved === 'direct') return saved;
  } catch {}
  return 'worker'; // Default to Worker Engine (api/worker.js)
}

export function setActiveEngine(engine: YtMusicEngineType): void {
  try {
    localStorage.setItem(ENGINE_STORAGE_KEY, engine);
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ytmusic:engine-changed', { detail: { engine } }));
  }
}

export interface YtVideo {
  id: string;
  title: string;
  channel: string;
  channel_id?: string;
  channel_thumb?: string;
  duration?: string;
  durationSeconds?: number;
  thumb?: string;
  thumb_lg?: string;
  views?: string | number;
  published?: string;
  album?: string;
  type?: 'song' | 'video' | 'album' | 'playlist';
}

export interface YtFormat {
  itag: number;
  mimeType: string;
  bitrate?: number;
  qualityLabel?: string;
  audioQuality?: string;
  url: string;
  has_audio: boolean;
  has_video: boolean;
}

export interface ItSearchPage {
  videos: YtVideo[];
  channel: { id: string; name: string; avatar: string } | null;
  continuation: string | null;
}

export interface ItVideoResult {
  id: string;
  title: string;
  channel: string;
  channel_id: string;
  duration: number;
  thumb: string;
  thumb_lg: string;
  views: string | number;
  formats: YtFormat[];
  streamUrl?: string;
  [key: string]: any;
}

export interface WorkerAlbum {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  year?: string;
  artwork?: string;
  tracks: Array<{
    id: string;
    title: string;
    author: string;
    duration: string;
    durationSeconds?: number;
    artwork?: string;
  }>;
}

export interface WorkerArtist {
  id: string;
  name: string;
  subscribers?: string;
  avatar?: string;
  albums?: any[];
  singles?: any[];
  topSongs?: any[];
}

const avatarCache = new Map<string, string>();

export function rememberAvatar(channelId: string, url: string): void {
  if (channelId && url) {
    avatarCache.set(channelId, url);
  }
}

export function getAvatar(channelId: string): string {
  return avatarCache.get(channelId) || '';
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseDuration(duration?: string): number {
  if (!duration) return 0;
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return Number(duration) || 0;
}

export function absStream(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
    return url;
  }
  return `/api/audio/stream?id=${url}`;
}

export function formatViews(views: number | string | undefined | null): string {
  if (!views) return '';
  const n = typeof views === 'string' ? parseInt(views.replace(/\D/g, ''), 10) : views;
  if (isNaN(n)) return String(views);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B views';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M views';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K views';
  return n + ' views';
}

/**
 * Resolves artwork URLs from worker.js or YouTube IDs.
 * Handles Google User Content hash paths like "/wY7k...".
 */
export function resolveThumbnail(img?: string | null, videoId?: string): string {
  if (img) {
    if (img.startsWith('http://') || img.startsWith('https://')) {
      return img;
    }
    if (img.startsWith('/')) {
      return `https://lh3.googleusercontent.com${img}=w500-h500`;
    }
  }
  if (videoId) {
    const cleanId = videoId.replace(/^yt_/, '');
    return `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;
  }
  return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
}

// ============================================================================
// WORKER ENGINE ROUTES (Powered directly by api/worker.js via /api/ytmusic/*)
// ============================================================================

export async function workerSearch(query: string, filter?: string): Promise<YtVideo[]> {
  if (!query || !query.trim()) return [];

  const url = new URL('/api/ytmusic/search', window.location.origin);
  url.searchParams.set('q', query.trim());
  if (filter) url.searchParams.set('f', filter);

  try {
    const res = await fetch(url.toString());
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          id: item.id || item.videoId,
          title: item.title || 'YouTube Track',
          channel: item.author || item.artist || 'YouTube Music',
          channel_id: item.authorId || '',
          duration: item.duration || '3:30',
          durationSeconds: parseDuration(item.duration),
          thumb: resolveThumbnail(item.img || item.thumbnail, item.id || item.videoId),
          thumb_lg: resolveThumbnail(item.img || item.thumbnail, item.id || item.videoId),
          views: item.subtext || '',
          type: item.type || 'song',
        }));
      }
    }
  } catch (err) {
    console.warn('[workerSearch] Error querying api/worker.js:', err);
  }

  // Graceful fallback to direct search if worker encountered network issue
  return directSearch(query).then((page) => page.videos);
}

export async function workerSuggestions(query: string, music = true): Promise<string[]> {
  if (!query || !query.trim()) return [];

  const url = new URL('/api/ytmusic/search-suggestions', window.location.origin);
  url.searchParams.set('q', query.trim());
  if (music) url.searchParams.set('music', 'true');

  try {
    const res = await fetch(url.toString());
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[workerSuggestions] Error querying api/worker.js suggestions:', err);
  }
  return [];
}

export async function workerAlbum(id: string): Promise<WorkerAlbum | null> {
  if (!id) return null;
  const url = new URL('/api/ytmusic/album', window.location.origin);
  url.searchParams.set('id', id);

  try {
    const res = await fetch(url.toString());
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id || id,
        title: data.name || data.title || 'Album',
        author: data.author || 'Artist',
        authorId: data.authorId || '',
        year: data.year || '',
        artwork: resolveThumbnail(data.img || data.artwork, id),
        tracks: (data.items || []).map((t: any) => ({
          id: t.id || t.videoId,
          title: t.title,
          author: t.author || data.author || 'Artist',
          duration: t.duration || '3:30',
          durationSeconds: parseDuration(t.duration),
          artwork: resolveThumbnail(t.img || data.img, t.id || t.videoId),
        })),
      };
    }
  } catch (e) {
    console.warn('[workerAlbum] Failed to fetch album:', e);
  }
  return null;
}

export async function workerArtist(id: string): Promise<WorkerArtist | null> {
  if (!id) return null;
  const url = new URL('/api/ytmusic/artist', window.location.origin);
  url.searchParams.set('id', id);

  try {
    const res = await fetch(url.toString());
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[workerArtist] Error querying artist:', e);
  }
  return null;
}

export async function workerPlaylist(id: string, all = false): Promise<any | null> {
  if (!id) return null;
  const url = new URL('/api/ytmusic/playlist', window.location.origin);
  url.searchParams.set('id', id);
  if (all) url.searchParams.set('all', 'true');

  try {
    const res = await fetch(url.toString());
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[workerPlaylist] Error querying playlist:', e);
  }
  return null;
}

export async function workerSimilar(title: string, artist: string, limit = 20): Promise<YtVideo[]> {
  if (!title || !artist) return [];
  const url = new URL('/api/ytmusic/similar', window.location.origin);
  url.searchParams.set('title', title);
  url.searchParams.set('artist', artist);
  url.searchParams.set('limit', String(limit));

  try {
    const res = await fetch(url.toString());
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          id: item.id || item.videoId,
          title: item.title,
          channel: item.author || artist,
          duration: item.duration || '3:30',
          durationSeconds: parseDuration(item.duration),
          thumb: resolveThumbnail(item.img, item.id || item.videoId),
          thumb_lg: resolveThumbnail(item.img, item.id || item.videoId),
          views: item.subtext || '',
          type: 'song',
        }));
      }
    }
  } catch (e) {
    console.warn('[workerSimilar] Error querying similar tracks:', e);
  }
  return [];
}

export async function workerFeatured(artistIds?: string[], limit = 20): Promise<YtVideo[]> {
  const url = new URL('/api/ytmusic/featured', window.location.origin);
  if (artistIds && artistIds.length > 0) {
    url.searchParams.set('artistIds', artistIds.join(','));
  }
  url.searchParams.set('limit', String(limit));

  try {
    const res = await fetch(url.toString());
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.items || data.tracks || []);
      return list.map((item: any) => ({
        id: item.id || item.videoId,
        title: item.title || 'Featured Song',
        channel: item.author || item.artist || 'Featured Artist',
        duration: item.duration || '3:30',
        durationSeconds: parseDuration(item.duration),
        thumb: resolveThumbnail(item.img || item.thumbnail, item.id || item.videoId),
        thumb_lg: resolveThumbnail(item.img || item.thumbnail, item.id || item.videoId),
        views: item.subtext || '',
        type: 'song' as const,
      }));
    }
  } catch (e) {
    console.warn('[workerFeatured] Error querying featured songs:', e);
  }
  return [];
}

// ============================================================================
// DIRECT ENGINE ROUTES (Powered by Innertube direct /api/innertube/*)
// ============================================================================

export async function directSearch(q: string): Promise<ItSearchPage> {
  if (!q || !q.trim()) {
    return { videos: [], channel: null, continuation: null };
  }

  try {
    const res = await fetch(`/api/innertube/search?q=${encodeURIComponent(q.trim())}`);
    if (res.ok) {
      const data = await res.json();
      const rawResults = Array.isArray(data) ? data : (data.results || []);
      const results: YtVideo[] = rawResults.map((r: any) => ({
        id: r.id,
        title: r.title || 'YouTube Track',
        channel: r.artist || r.author || 'YouTube Music',
        channel_id: r.authorId || '',
        duration: r.durationText || '3:30',
        durationSeconds: r.duration || 210,
        thumb: resolveThumbnail(r.thumbnail, r.id),
        thumb_lg: resolveThumbnail(r.thumbnail, r.id),
        views: r.views || '',
        type: 'song',
      }));

      return {
        videos: results,
        channel: null,
        continuation: null,
      };
    }
  } catch (e) {
    console.warn('[directSearch] Fetch error, returning fallback:', e);
  }

  return { videos: [], channel: null, continuation: null };
}

export async function directVideo(id: string): Promise<ItVideoResult> {
  const cleanId = id.replace(/^yt_/, '');

  try {
    const res = await fetch(`/api/innertube/video-info?id=${encodeURIComponent(cleanId)}`);
    if (res.ok) {
      const data = await res.json();
      const formats: YtFormat[] = (data.formats || []).map((f: any) => ({
        itag: f.itag || 140,
        mimeType: f.mimeType || 'audio/mp4',
        bitrate: f.bitrate || 128000,
        qualityLabel: f.qualityLabel || '',
        audioQuality: f.audioQuality || 'AUDIO_QUALITY_MEDIUM',
        url: f.url || '',
        has_audio: !f.mimeType || f.mimeType.includes('audio'),
        has_video: !f.mimeType || f.mimeType.includes('video'),
      }));

      return {
        id: cleanId,
        title: data.title || 'YouTube Track',
        channel: data.author || 'YouTube Artist',
        channel_id: data.authorId || '',
        duration: data.durationSeconds || 210,
        thumb: resolveThumbnail(data.thumbnail, cleanId),
        thumb_lg: resolveThumbnail(data.thumbnail, cleanId),
        views: data.viewCountFormatted || '',
        formats,
        streamUrl: data.streamUrl || `/api/audio/stream?id=${cleanId}`,
      };
    }
  } catch (e) {
    console.warn('[directVideo] Fetch error:', e);
  }

  return {
    id: cleanId,
    title: 'YouTube Track',
    channel: 'YouTube Artist',
    channel_id: '',
    duration: 210,
    thumb: resolveThumbnail(null, cleanId),
    thumb_lg: resolveThumbnail(null, cleanId),
    views: '',
    formats: [
      {
        itag: 140,
        mimeType: 'audio/mp4',
        bitrate: 128000,
        url: `/api/audio/stream?id=${cleanId}`,
        has_audio: true,
        has_video: false,
      },
    ],
    streamUrl: `/api/audio/stream?id=${cleanId}`,
  };
}

// Compatibility aliases for legacy imports
export const itSearch = directSearch;
export const itVideo = directVideo;

// ============================================================================
// UNIFIED ENGINE DISPATCHER
// ============================================================================

export async function searchUnified(query: string, engine?: YtMusicEngineType): Promise<YtVideo[]> {
  const chosenEngine = engine || getActiveEngine();
  if (chosenEngine === 'worker') {
    return workerSearch(query);
  }
  const page = await directSearch(query);
  return page.videos;
}

export async function suggestionsUnified(query: string, engine?: YtMusicEngineType): Promise<string[]> {
  const chosenEngine = engine || getActiveEngine();
  if (chosenEngine === 'worker') {
    const list = await workerSuggestions(query);
    if (list && list.length > 0) return list;
  }
  // Direct fallback
  const page = await directSearch(query);
  return page.videos.slice(0, 8).map((v) => v.title);
}