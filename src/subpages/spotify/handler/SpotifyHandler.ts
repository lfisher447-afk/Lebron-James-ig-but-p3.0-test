/**
 * Spotify Handler - Resolves, Searches, and Manages Spotify Collections
 */
import { Track } from '../../../types';
import { parseSpotifyUrl, formatMsToTime } from '../util/spotifyUtils';

export interface SpotifyCollection {
  type: 'playlist' | 'album' | 'track';
  id: string;
  name: string;
  description?: string;
  coverArt: string;
  tracks: Track[];
}

export interface SpotifyFeaturedItem {
  id: string;
  name: string;
  type: 'playlist' | 'album';
  description: string;
  coverArt: string;
  trackCount: number;
}

class SpotifyHandler {
  // Fetch featured Spotify playlists/albums
  async getFeaturedCatalogs(): Promise<SpotifyFeaturedItem[]> {
    try {
      const res = await fetch('/api/spotify/featured');
      if (!res.ok) throw new Error('Failed to fetch featured playlists');
      const data = await res.json();
      return data.collections || [];
    } catch (e) {
      console.warn('Fallback to local featured catalog:', e);
      return [
        {
          id: '37i9dQZF1DXcBWIGoYBM5M',
          name: "Today's Top Hits",
          type: 'playlist',
          description: 'Jung Kook, Olivia Rodrigo, Billie Eilish, Sabrina Carpenter & the hottest tracks.',
          coverArt: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
          trackCount: 50,
        },
        {
          id: '37i9dQZF1DX0XUsuxWHRQd',
          name: 'RapCaviar',
          type: 'playlist',
          description: 'New music from Drake, Kendrick Lamar, Travis Scott, Metro Boomin and 21 Savage.',
          coverArt: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80',
          trackCount: 45,
        },
        {
          id: '4m2880jivSbbyEGAKfITCa',
          name: 'Random Access Memories',
          type: 'album',
          description: 'Daft Punk - Iconic Grammy-winning masterwork featuring Get Lucky, Instant Crush.',
          coverArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80',
          trackCount: 13,
        },
        {
          id: '37i9dQZF1DX4WYpdgoIcn6',
          name: 'Chill Tracks & Lo-Fi',
          type: 'playlist',
          description: 'Softer beats, organic downtempo rhythms, and relaxing nocturnal grooves.',
          coverArt: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80',
          trackCount: 60,
        },
      ];
    }
  }

  // Resolve any Spotify URL or ID
  async resolve(urlOrId: string): Promise<SpotifyCollection> {
    const parsed = parseSpotifyUrl(urlOrId);
    const targetUrl = parsed
      ? `https://open.spotify.com/${parsed.type}/${parsed.id}`
      : urlOrId.startsWith('http')
      ? urlOrId
      : `https://open.spotify.com/playlist/${urlOrId}`;

    const res = await fetch(`/api/spotify/resolve-playlist?url=${encodeURIComponent(targetUrl)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to resolve Spotify resource');
    }

    const data = await res.json();
    const tracks: Track[] = (data.tracks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: data.name || t.album || 'Spotify Music',
      duration: t.duration || 210,
      durationText: t.durationText || formatMsToTime((t.duration || 210) * 1000),
      artwork: t.artwork || data.coverArt,
      source: 'spotify' as const,
      addedAt: Date.now(),
      streamUrl: t.audioPreview || `/api/audio/stream?id=${t.id.replace('sp_', '')}`,
    }));

    return {
      type: data.type || 'playlist',
      id: data.id || 'spotify_collection',
      name: data.name || 'Spotify Collection',
      coverArt: data.coverArt,
      tracks,
    };
  }

  // Search Spotify by text query
  async search(query: string): Promise<{ tracks: Track[]; albums: any[]; playlists: any[] }> {
    if (!query.trim()) return { tracks: [], albums: [], playlists: [] };
    const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) throw new Error('Failed to search Spotify');
    return await res.json();
  }
}

export const spotifyHandler = new SpotifyHandler();
