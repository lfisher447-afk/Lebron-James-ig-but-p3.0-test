/**
 * Invidious & YouTube Video Handler with Multi-Node Fallback
 */
import { extractYouTubeId, formatSecondsToTimestamp } from '../util/invidiousUtils';

export interface VideoStreamFormat {
  itag: number;
  mimeType: string;
  bitrate?: number;
  qualityLabel?: string;
  audioQuality?: string;
  url?: string;
}

export interface VideoMetadata {
  videoId: string;
  title: string;
  author: string;
  authorId?: string;
  durationSeconds: number;
  durationFormatted: string;
  viewCountFormatted?: string;
  description: string;
  thumbnail: string;
  embedUrl: string;
  streamUrl: string;
  availableResolutions: string[];
  formats: VideoStreamFormat[];
  relatedVideos: Array<{
    id: string;
    title: string;
    author: string;
    duration: string;
    thumbnail: string;
  }>;
}

export interface VideoComment {
  id: string;
  author: string;
  authorThumb: string;
  content: string;
  publishedText: string;
  likeCount: number;
}

class InvidiousHandler {
  // Fetch detailed video metadata
  async getVideoInfo(videoIdOrUrl: string): Promise<VideoMetadata> {
    const videoId = extractYouTubeId(videoIdOrUrl) || videoIdOrUrl;
    const res = await fetch(`/api/innertube/video-info?id=${encodeURIComponent(videoId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to fetch video information');
    }
    return await res.json();
  }

  // Search videos
  async search(query: string, page: number = 1): Promise<any[]> {
    if (!query.trim()) return [];
    const res = await fetch(`/api/innertube/search?q=${encodeURIComponent(query.trim())}&page=${page}`);
    if (!res.ok) throw new Error('Search request failed');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
  }

  // Fetch trending video list
  async getTrending(category: string = 'trending music videos'): Promise<any[]> {
    try {
      const res = await fetch(`/api/invidious/trending?category=${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error('Failed to load trending');
      const data = await res.json();
      return data.videos || [];
    } catch {
      return [];
    }
  }

  // Fetch comments
  async getComments(videoId: string): Promise<VideoComment[]> {
    try {
      const res = await fetch(`/api/invidious/comments?id=${encodeURIComponent(videoId)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.comments || [];
    } catch {
      return [];
    }
  }
}

export const invidiousHandler = new InvidiousHandler();
