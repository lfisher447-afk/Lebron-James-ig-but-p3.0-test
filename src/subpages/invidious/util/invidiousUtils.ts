/**
 * Invidious and YouTube Utility Functions
 */

export const YOUTUBE_URL_REGEX = /(?:v=|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/|\/v\/|embeds\/videoseries\?.*?v=)([\w-]{11})/;

export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const match = input.trim().match(YOUTUBE_URL_REGEX);
  if (match) return match[1];
  if (/^[\w-]{11}$/.test(input.trim())) return input.trim();
  return null;
}

export function formatViews(views: string | number): string {
  if (!views) return '';
  const num = typeof views === 'number' ? views : parseInt(views.replace(/\D/g, ''), 10);
  if (isNaN(num)) return String(views);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B views';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M views';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K views';
  return `${num} views`;
}

export function formatSecondsToTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
