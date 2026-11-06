/**
 * Format Selector Module
 * Converted directly from Kotlin: com.metrolist.innertube.FormatSelector
 * Selects highest quality audio streams (Opus itag 251, 160kbps, 48kHz stereo)
 * and optimal video streams according to bandwidth and user preference.
 */

import { InnertubeStreamFormat } from './models';

export type AudioQualityPreference = 'high' | 'medium' | 'low';
export type VideoResolutionPreference = '1080p' | '720p' | '480p' | '360p' | 'auto';

export enum AudioQuality {
  LOW = 'LOW',
  AUTO = 'AUTO',
  HIGH = 'HIGH',
}

export interface ContentHints {
  endpointParams?: string;
  maxVideoHeight?: number;
  isLive?: boolean;
  playbackClientOverrideId?: string;
}

/**
 * Append or replace YouTube client playback nonce (cpn)
 * Converted directly from com.metrolist.innertubex.extraction.appendClientPlaybackNonce
 */
export function appendClientPlaybackNonce(url: string, nonce: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    // Nonce mutation only allows valid video domains and standard ports
    if (!parsed.hostname.endsWith('googlevideo.com') || (parsed.port && parsed.port !== '443' && parsed.port !== '80')) {
      return url;
    }
    parsed.searchParams.set('cpn', nonce);
    return parsed.toString();
  } catch {
    return url;
  }
}

export function replaceClientPlaybackNonce(url: string, nonce: string): string {
  if (!nonce || nonce.length < 16) return url;
  return appendClientPlaybackNonce(url, nonce);
}

/**
 * Functional format selection ported directly from AudioFormatSelectorTest & VideoFormatSelectorTest
 */
export function selectBestAudioFormat(
  formats: InnertubeStreamFormat[],
  quality: AudioQuality = AudioQuality.HIGH,
  requireUrl = true
): InnertubeStreamFormat | null {
  if (!formats || formats.length === 0) return null;

  let candidates = formats.filter((f) => {
    if (requireUrl && !f.url && !f.cipher && !f.signatureCipher) return false;
    const isAudioMime = f.mimeType && f.mimeType.startsWith('audio/');
    const isAudioOnly = !f.width && (f.audioQuality || f.audioChannels);
    return isAudioMime || isAudioOnly;
  });

  if (candidates.length === 0) {
    candidates = formats.filter((f) => !requireUrl || f.url || f.cipher || f.signatureCipher);
  }
  if (candidates.length === 0) return null;

  if (quality === AudioQuality.LOW) {
    // lowQualityPrefersLowestMp4ThenLowestBitrate:
    // Prefers itag 140 or lowest mp4, then lowest bitrate
    const mp4Formats = candidates.filter((f) => f.mimeType?.includes('audio/mp4') || f.itag === 140);
    if (mp4Formats.length > 0) {
      return mp4Formats.sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0))[0];
    }
    return candidates.sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0))[0];
  }

  if (quality === AudioQuality.HIGH) {
    // highQualityPrefersStereoBeforeBitrate & higher sample rate
    // Prefer stereo (audioChannels == 2) before bitrate
    return candidates.sort((a, b) => {
      const aChannels = a.audioChannels || 2;
      const bChannels = b.audioChannels || 2;
      if (bChannels !== aChannels) return bChannels - aChannels;

      const aRate = a.audioSampleRate || 44100;
      const bRate = b.audioSampleRate || 44100;
      if (bRate !== aRate) return bRate - aRate;

      return (b.bitrate || 0) - (a.bitrate || 0);
    })[0];
  }

  // AUTO prefers Opus (itag 251/250) or falls back to best non-webm format
  const opus = candidates.find((f) => f.itag === 251 || f.mimeType?.includes('codecs="opus"'));
  if (opus && (!requireUrl || opus.url)) return opus;

  const fallbackAac = candidates.filter((f) => f.mimeType?.includes('audio/mp4'));
  if (fallbackAac.length > 0) {
    return fallbackAac.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
  }

  return candidates.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
}

export function selectBestVideoFormat(
  formats: InnertubeStreamFormat[],
  maxHeight = 1080
): InnertubeStreamFormat | null {
  if (!formats || formats.length === 0) return null;
  const videoFormats = formats.filter((f) => f.mimeType && f.mimeType.startsWith('video/'));
  if (videoFormats.length === 0) return formats[0] || null;

  // Video selector honors height cap and degrades above cap
  const underCap = videoFormats.filter((f) => (f.height || 0) <= maxHeight);
  if (underCap.length > 0) {
    return underCap.sort((a, b) => (b.height || 0) - (a.height || 0) || (b.bitrate || 0) - (a.bitrate || 0))[0];
  }

  // Degrade above cap gracefully (pick lowest available above cap)
  return videoFormats.sort((a, b) => (a.height || 0) - (b.height || 0))[0];
}

export class FormatSelector {
  /**
   * Prioritized list of audio itags
   * 251: WebM / Opus ~160kbps (highest audio quality)
   * 140: MP4 / AAC 128kbps (broadest hardware compatibility)
   * 250: WebM / Opus ~70kbps
   * 249: WebM / Opus ~50kbps
   * 139: MP4 / AAC 48kbps
   */
  private static readonly AUDIO_ITAG_PRIORITY = [251, 140, 250, 249, 139];

  /**
   * Select best audio format from a list of adaptive formats
   */
  static selectAudioFormat(
    formats: InnertubeStreamFormat[],
    preference: AudioQualityPreference = 'high'
  ): InnertubeStreamFormat | null {
    if (!formats || formats.length === 0) return null;

    // Filter audio formats only
    const audioFormats = formats.filter(
      (f) =>
        f.mimeType &&
        (f.mimeType.startsWith('audio/') || (!f.width && f.audioQuality !== undefined))
    );

    if (audioFormats.length === 0) {
      // Fall back to any format with audio channels
      const fallback = formats.filter((f) => f.audioChannels && f.audioChannels > 0);
      return fallback[0] || formats[0];
    }

    if (preference === 'high') {
      // Sort by priority itags first, then bitrate descending
      return (
        audioFormats.find((f) => f.itag === 251) ||
        audioFormats.find((f) => f.itag === 140) ||
        audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]
      );
    }

    if (preference === 'medium') {
      return (
        audioFormats.find((f) => f.itag === 140) ||
        audioFormats.find((f) => f.itag === 250) ||
        audioFormats[0]
      );
    }

    // Low bandwidth
    return (
      audioFormats.find((f) => f.itag === 249) ||
      audioFormats.find((f) => f.itag === 139) ||
      audioFormats[audioFormats.length - 1]
    );
  }

  /**
   * Select video stream format based on resolution preference
   */
  static selectVideoFormat(
    formats: InnertubeStreamFormat[],
    targetRes: VideoResolutionPreference = '720p',
    preferCombined = false
  ): InnertubeStreamFormat | null {
    if (!formats || formats.length === 0) return null;

    const videoFormats = formats.filter((f) => f.mimeType && f.mimeType.startsWith('video/'));
    if (videoFormats.length === 0) return formats[0];

    if (preferCombined) {
      // Formats with both audio and video (e.g. itag 18 / 22)
      const combined = videoFormats.filter((f) => f.audioChannels && f.audioChannels > 0);
      if (combined.length > 0) {
        if (targetRes === '720p') {
          return combined.find((f) => f.height === 720) || combined[0];
        }
        return combined.find((f) => f.height === 360) || combined[0];
      }
    }

    const resMap: Record<string, number> = {
      '1080p': 1080,
      '720p': 720,
      '480p': 480,
      '360p': 360,
    };

    const targetHeight = resMap[targetRes] || 720;

    // Try exact match
    const exact = videoFormats.find((f) => f.height === targetHeight);
    if (exact) return exact;

    // Find closest resolution without exceeding target if possible
    const sorted = [...videoFormats].sort((a, b) => Math.abs((a.height || 0) - targetHeight) - Math.abs((b.height || 0) - targetHeight));
    return sorted[0] || null;
  }

  /**
   * Extract list of available resolutions (e.g. ["1080p", "720p", "480p", "360p"])
   */
  static getAvailableResolutions(formats: InnertubeStreamFormat[]): string[] {
    const heights = new Set<number>();
    for (const f of formats) {
      if (f.height && f.height > 0) {
        heights.add(f.height);
      }
    }
    return Array.from(heights)
      .sort((a, b) => b - a)
      .map((h) => `${h}p`);
  }
}
