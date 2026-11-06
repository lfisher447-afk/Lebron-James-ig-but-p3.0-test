// ============================================================================
// UNIFIED YOUTUBE MUSIC API & CLIENT ENGINE
//
// Provides backend-backed streaming, search, and metadata services for
// the YouTube Music subpage.
// ============================================================================

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

const avatarCache = new Map<string, string>();

export function rememberAvatar(channelId: string, url: string): void {
  if (channelId && url) {
    avatarCache.set(channelId, url);
  }
}

export function getAvatar(channelId: string): string {
  return avatarCache.get(channelId) || "";
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function parseDuration(duration?: string): number {
  if (!duration) return 0;
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return Number(duration) || 0;
}

export function absStream(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }
  return `/api/audio/stream?id=${url}`;
}

export function formatViews(views: number | string | undefined | null): string {
  if (!views) return "";
  const n = typeof views === "string" ? parseInt(views.replace(/\D/g, ""), 10) : views;
  if (isNaN(n)) return String(views);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B views";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M views";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K views";
  return n + " views";
}

export async function itSearch(q: string): Promise<ItSearchPage> {
  if (!q || !q.trim()) {
    return { videos: [], channel: null, continuation: null };
  }

  try {
    const res = await fetch(`/api/innertube/search?q=${encodeURIComponent(q.trim())}`);
    if (res.ok) {
      const data = await res.json();
      const results: YtVideo[] = (data.results || []).map((r: any) => ({
        id: r.id,
        title: r.title || "YouTube Track",
        channel: r.artist || r.author || "YouTube Music",
        channel_id: r.authorId || "",
        duration: r.durationText || "3:30",
        durationSeconds: r.duration || 210,
        thumb: r.thumbnail || `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg`,
        thumb_lg: r.thumbnail || `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg`,
        views: r.views || "",
      }));

      return {
        videos: results,
        channel: null,
        continuation: null,
      };
    }
  } catch (e) {
    console.warn("[itSearch] Fetch error, returning fallback:", e);
  }

  return { videos: [], channel: null, continuation: null };
}

export async function itVideo(id: string): Promise<ItVideoResult> {
  const cleanId = id.replace(/^yt_/, "");

  try {
    const res = await fetch(`/api/innertube/video-info?id=${encodeURIComponent(cleanId)}`);
    if (res.ok) {
      const data = await res.json();
      const formats: YtFormat[] = (data.formats || []).map((f: any) => ({
        itag: f.itag || 140,
        mimeType: f.mimeType || "audio/mp4",
        bitrate: f.bitrate || 128000,
        qualityLabel: f.qualityLabel || "",
        audioQuality: f.audioQuality || "AUDIO_QUALITY_MEDIUM",
        url: f.url || "",
        has_audio: !f.mimeType || f.mimeType.includes("audio"),
        has_video: !f.mimeType || f.mimeType.includes("video"),
      }));

      return {
        id: cleanId,
        title: data.title || "YouTube Track",
        channel: data.author || "YouTube Artist",
        channel_id: data.authorId || "",
        duration: data.durationSeconds || 210,
        thumb: data.thumbnail || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
        thumb_lg: data.thumbnail || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
        views: data.viewCountFormatted || "",
        formats,
        streamUrl: data.streamUrl || `/api/audio/stream?id=${cleanId}`,
      };
    }
  } catch (e) {
    console.warn("[itVideo] Fetch error:", e);
  }

  return {
    id: cleanId,
    title: "YouTube Track",
    channel: "YouTube Artist",
    channel_id: "",
    duration: 210,
    thumb: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
    thumb_lg: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
    views: "",
    formats: [
      {
        itag: 140,
        mimeType: "audio/mp4",
        bitrate: 128000,
        url: `/api/audio/stream?id=${cleanId}`,
        has_audio: true,
        has_video: false,
      },
    ],
    streamUrl: `/api/audio/stream?id=${cleanId}`,
  };
}