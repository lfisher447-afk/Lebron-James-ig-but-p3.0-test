import { Track } from '../../types';

export class SpotifyKeylessResolver {
  /**
   * Extract Spotify Track ID from URL or URI
   */
  static extractTrackId(input: string): string | null {
    if (!input) return null;
    const match = input.match(/(?:open\.spotify\.com\/track\/|spotify:track:)([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract Spotify Playlist ID from URL or URI
   */
  static extractPlaylistId(input: string): string | null {
    if (!input) return null;
    const match = input.match(/(?:open\.spotify\.com\/playlist\/|spotify:playlist:)([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract Spotify Album ID from URL or URI
   */
  static extractAlbumId(input: string): string | null {
    if (!input) return null;
    const match = input.match(/(?:open\.spotify\.com\/album\/|spotify:album:)([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Resolve any Spotify URL (track, playlist, or album) into structured metadata
   * using the backend public resolver
   */
  static async resolveUrl(url: string): Promise<{
    type: 'track' | 'playlist' | 'album';
    id: string;
    title: string;
    artwork?: string;
    embedUrl?: string;
    tracks: Track[];
  }> {
    const trimmed = url.trim();
    const res = await fetch(`/api/spotify/resolve-playlist?url=${encodeURIComponent(trimmed)}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.error || 'Could not resolve Spotify URL. Ensure it is a valid public Spotify link.');
    }

    const data = await res.json();
    const tracks: Track[] = (data.tracks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album || data.name || 'Spotify Collection',
      duration: t.duration || 210,
      durationText: t.durationText || '3:30',
      artwork: t.artwork || data.coverArt,
      source: 'spotify' as const,
      addedAt: Date.now(),
      streamUrl: t.audioPreview || `/api/audio/stream?id=${t.id}`,
    }));

    return {
      type: data.type || 'playlist',
      id: data.id,
      title: data.name || 'Spotify Collection',
      artwork: data.coverArt,
      embedUrl: data.embedUrl,
      tracks,
    };
  }
}
