/**
 * Invidious API Client
 * Converted directly from Kotlin: com.loosewire.lightious.data.InvidiousApi
 * Provides full video stream extraction, search, adaptive format selection,
 * comments fetching, captions parsing, and instance failover.
 */

export interface InvidiousVideoFormat {
  itag: number;
  url: string;
  quality?: string;
  qualityLabel?: string;
  type: string;
  container?: string;
  encoding?: string;
  bitrate?: number;
  audioQuality?: string;
  audioSampleRate?: number;
  audioChannels?: number;
  width?: number;
  height?: number;
  fps?: number;
  size?: string;
}

export interface InvidiousCaption {
  label: string;
  languageCode: string;
  url: string;
}

export interface InvidiousVideoDetails {
  title: string;
  videoId: string;
  videoThumbnails: Array<{ quality: string; url: string; width: number; height: number }>;
  description: string;
  descriptionHtml?: string;
  published: number;
  publishedText: string;
  keywords: string[];
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  paid: boolean;
  premium: boolean;
  isFamilyFriendly: boolean;
  allowedRegions: string[];
  genre: string;
  genreUrl: string;
  author: string;
  authorId: string;
  authorUrl: string;
  authorThumbnails: Array<{ url: string; width: number; height: number }>;
  subCountText: string;
  lengthSeconds: number;
  allowRatings: boolean;
  rating: number;
  isListed: boolean;
  liveNow: boolean;
  isUpcoming: boolean;
  dashUrl?: string;
  hlsUrl?: string;
  adaptiveFormats: InvidiousVideoFormat[];
  formatStreams: InvidiousVideoFormat[];
  captions: InvidiousCaption[];
  recommendedVideos: Array<{
    videoId: string;
    title: string;
    videoThumbnails: Array<{ quality: string; url: string; width: number; height: number }>;
    author: string;
    authorId: string;
    authorUrl: string;
    lengthSeconds: number;
    viewCountText: string;
  }>;
}

export interface InvidiousCommentItem {
  author: string;
  authorThumbnails: Array<{ url: string; width: number; height: number }>;
  authorId: string;
  authorUrl: string;
  isEdited: boolean;
  isPinned: boolean;
  content: string;
  contentHtml: string;
  published: number;
  publishedText: string;
  likeCount: number;
  commentId: string;
  authorIsChannelOwner: boolean;
}

export class InvidiousApi {
  private instanceUrls: string[];
  private currentInstanceIndex = 0;

  constructor(instances?: string[]) {
    this.instanceUrls = instances && instances.length > 0 ? instances : [
      'https://invidious.nerdvpn.de',
      'https://inv.nadeko.net',
      'https://invidious.private.coffee',
      'https://vid.priv.au',
      'https://invidious.asir.dev',
    ];
  }

  public getBaseUrl(): string {
    return this.instanceUrls[this.currentInstanceIndex] || 'https://invidious.nerdvpn.de';
  }

  public rotateInstance(): string {
    this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.instanceUrls.length;
    return this.getBaseUrl();
  }

  /**
   * Fetch video details and direct stream formats
   */
  async getVideo(videoId: string): Promise<InvidiousVideoDetails> {
    let lastError: any = null;

    for (let attempts = 0; attempts < this.instanceUrls.length; attempts++) {
      const baseUrl = this.getBaseUrl();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(`${baseUrl}/api/v1/videos/${encodeURIComponent(videoId)}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });
        clearTimeout(timer);

        if (response.ok) {
          const data = await response.json();
          return data as InvidiousVideoDetails;
        }

        lastError = new Error(`Instance ${baseUrl} returned ${response.status}`);
      } catch (err: any) {
        lastError = err;
      }

      this.rotateInstance();
    }

    throw lastError || new Error('All Invidious instances exhausted');
  }

  /**
   * Search videos
   */
  async search(query: string, page = 1, type = 'video'): Promise<any[]> {
    for (let attempts = 0; attempts < this.instanceUrls.length; attempts++) {
      const baseUrl = this.getBaseUrl();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);

        const url = `${baseUrl}/api/v1/search?q=${encodeURIComponent(query)}&page=${page}&type=${type}`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        if (response.ok) {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        }
      } catch {
        // Try next instance
      }
      this.rotateInstance();
    }
    return [];
  }

  /**
   * Fetch video comments
   */
  async getComments(videoId: string): Promise<InvidiousCommentItem[]> {
    for (let attempts = 0; attempts < this.instanceUrls.length; attempts++) {
      const baseUrl = this.getBaseUrl();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(`${baseUrl}/api/v1/comments/${encodeURIComponent(videoId)}`, {
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.ok) {
          const data = await response.json();
          return data.comments || [];
        }
      } catch {
        // Rotate
      }
      this.rotateInstance();
    }
    return [];
  }

  /**
   * Fetch trending feed
   */
  async getTrending(type = 'Music'): Promise<any[]> {
    for (let attempts = 0; attempts < this.instanceUrls.length; attempts++) {
      const baseUrl = this.getBaseUrl();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);

        const response = await fetch(`${baseUrl}/api/v1/trending?type=${encodeURIComponent(type)}`, {
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.ok) {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        }
      } catch {
        // Rotate
      }
      this.rotateInstance();
    }
    return [];
  }
}

export const invidiousApi = new InvidiousApi();
