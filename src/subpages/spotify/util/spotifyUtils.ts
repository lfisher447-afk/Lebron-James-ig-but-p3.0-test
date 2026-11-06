/**
 * Spotify Utility Functions
 */

export interface SpotifyTrackMeta {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  durationText: string;
  artwork: string;
  audioPreview?: string;
  streamUrl?: string;
}

export function parseSpotifyUrl(input: string): { type: 'track' | 'playlist' | 'album'; id: string } | null {
  if (!input) return null;
  const match = input.trim().match(/(?:open\.spotify\.com\/(track|playlist|album)\/|spotify:(track|playlist|album):)([a-zA-Z0-9]+)/);
  if (!match) return null;
  return {
    type: (match[1] || match[2]) as 'track' | 'playlist' | 'album',
    id: match[3],
  };
}

export function formatMsToTime(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function cleanSpotifyTitle(title: string): string {
  return title
    .replace(/\s*-\s*Remastered\s*\d*/gi, '')
    .replace(/\s*\(Remastered\s*\d*\)/gi, '')
    .replace(/\s*\(Official (Audio|Video|Music Video)\)/gi, '')
    .trim();
}
