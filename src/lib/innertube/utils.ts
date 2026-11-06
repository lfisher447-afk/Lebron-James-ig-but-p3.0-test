/**
 * Innertube Regexes and Utilities
 * Converted directly from Kotlin: com.metrolist.innertube.utils
 */

export const YOUTUBE_VIDEO_ID_REGEX = /(?:v=|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/|\/v\/|embeds\/videoseries\?.*?v=)([\w-]{11})/;
export const YOUTUBE_PLAYLIST_ID_REGEX = /[?&]list=([^#&?]+)/;
export const YOUTUBE_CHANNEL_ID_REGEX = /(?:channel\/|c\/|user\/|@)([\w-]+)/;

export function extractVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_VIDEO_ID_REGEX);
  return match ? match[1] : null;
}

export function extractPlaylistId(url: string): string | null {
  const match = url.match(YOUTUBE_PLAYLIST_ID_REGEX);
  return match ? match[1] : null;
}

export function extractChannelId(url: string): string | null {
  const match = url.match(YOUTUBE_CHANNEL_ID_REGEX);
  return match ? match[1] : null;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Converts a Uint8Array into a lower-case hex string.
 * Kotlin equivalent: ByteArray.toHex()
 */
export function toHex(byteArray: Uint8Array): string {
  return Array.from(byteArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Synchronous simple SHA-1 hashing implementation.
 * Kotlin equivalent: sha1(str: String): String
 */
export function sha1(str: string): string {
  // Simple synchronous SHA-1 hash for browser & node environments
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const utf8 = unescape(encodeURIComponent(str));
  const words: number[] = [];
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }

  const bitLen = utf8.length * 8;
  words[bitLen >> 5] |= 0x80 << (24 - (bitLen % 32));
  words[(((bitLen + 64) >> 9) << 4) + 15] = bitLen;

  const w = new Int32Array(80);

  for (let i = 0; i < words.length; i += 16) {
    for (let j = 0; j < 16; j++) {
      w[j] = words[i + j] || 0;
    }
    for (let j = 16; j < 80; j++) {
      const n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = (n << 1) | (n >>> 31);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j++) {
      let f = 0;
      let k = 0;

      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4);
}

/**
 * Parses HTTP Cookie header into key-value map.
 * Kotlin equivalent: parseCookieString(cookie: String): Map<String, String>
 */
export function parseCookieString(cookie: string): Record<string, string> {
  if (!cookie) return {};
  const map: Record<string, string> = {};
  const parts = cookie.split('; ');
  for (const part of parts) {
    if (!part.trim()) continue;
    const splitIndex = part.indexOf('=');
    if (splitIndex !== -1) {
      const key = part.substring(0, splitIndex).trim();
      const val = part.substring(splitIndex + 1).trim();
      map[key] = val;
    }
  }
  return map;
}

/**
 * Parses string time representations like "03:45" or "01:20:15" into seconds.
 * Kotlin equivalent: String.parseTime(): Int?
 */
export function parseTime(timeStr: string): number | null {
  if (!timeStr) return null;
  try {
    const parts = timeStr.split(':').map((p) => parseInt(p, 10));
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Checks if browseId is private.
 * Kotlin equivalent: isPrivateId(browseId: String): Boolean
 */
export function isPrivateId(browseId: string): boolean {
  return typeof browseId === 'string' && browseId.includes('privately');
}
