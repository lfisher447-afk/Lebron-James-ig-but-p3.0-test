/**
 * Advanced Universal Media URL & Stream Parser
 * Supports: YouTube, YouTube Music, Invidious, Piped, Spotify URLs, URIs, Timestamps, and Query Strings.
 */

export interface ParsedMediaUrl {
  type: 'youtube' | 'spotify' | 'invidious' | 'piped' | 'unknown';
  videoId?: string;
  playlistId?: string;
  spotifyType?: 'track' | 'album' | 'playlist' | 'artist';
  spotifyId?: string;
  timestamp?: number;
  rawUrl: string;
  cleanUrl: string;
  titleSuggestion?: string;
}

export class YouTubeUrlParser {
  /**
   * Parse any YouTube or YouTube Music URL or video ID string.
   */
  public static parse(input: string): ParsedMediaUrl | null {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // 1. Direct 11-character video ID check (e.g. dQw4w9WgXcQ, kJQP7kiw5Fk)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return {
        type: 'youtube',
        videoId: trimmed,
        rawUrl: trimmed,
        cleanUrl: `https://www.youtube.com/watch?v=${trimmed}`,
      };
    }

    // 2. Parse Spotify URL or URI
    const spotifyMatch = trimmed.match(
      /(?:open\.spotify\.com\/(track|playlist|album|artist)\/|spotify:(track|playlist|album|artist):)([a-zA-Z0-9]+)/
    );
    if (spotifyMatch) {
      const spotifyType = (spotifyMatch[1] || spotifyMatch[2]) as 'track' | 'album' | 'playlist' | 'artist';
      const spotifyId = spotifyMatch[3];
      return {
        type: 'spotify',
        spotifyType,
        spotifyId,
        rawUrl: trimmed,
        cleanUrl: `https://open.spotify.com/${spotifyType}/${spotifyId}`,
      };
    }

    // 3. Invidious or Piped instances
    if (trimmed.includes('/watch?v=') || trimmed.includes('/embed/') || trimmed.includes('/streams/')) {
      const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/) || trimmed.match(/\/(?:embed|streams|v)\/([a-zA-Z0-9_-]{11})/);
      if (vMatch) {
        const videoId = vMatch[1];
        const timestamp = this.parseTimestamp(trimmed);
        return {
          type: trimmed.includes('piped') ? 'piped' : 'invidious',
          videoId,
          timestamp,
          rawUrl: trimmed,
          cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }
    }

    // 4. Standard YouTube Patterns
    const ytPatterns = [
      /(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of ytPatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const videoId = match[1];
        const timestamp = this.parseTimestamp(trimmed);
        const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        const playlistId = listMatch ? listMatch[1] : undefined;

        return {
          type: 'youtube',
          videoId,
          playlistId,
          timestamp,
          rawUrl: trimmed,
          cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }
    }

    // 5. YouTube Playlist URL alone
    const playlistPattern = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/;
    const plMatch = trimmed.match(playlistPattern);
    if (plMatch && plMatch[1]) {
      return {
        type: 'youtube',
        playlistId: plMatch[1],
        rawUrl: trimmed,
        cleanUrl: `https://www.youtube.com/playlist?list=${plMatch[1]}`,
      };
    }

    return null;
  }

  /**
   * Parse timestamps like ?t=1m30s, &t=90, #t=120, etc.
   */
  public static parseTimestamp(url: string): number | undefined {
    try {
      const match = url.match(/[?&#]t=(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?(\d+)?/);
      if (!match) return undefined;

      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || match[4] || '0', 10);

      const total = hours * 3600 + minutes * 60 + seconds;
      return total > 0 ? total : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract video ID quickly
   */
  public static extractVideoId(url: string): string | null {
    const res = this.parse(url);
    return res?.videoId || null;
  }
}
