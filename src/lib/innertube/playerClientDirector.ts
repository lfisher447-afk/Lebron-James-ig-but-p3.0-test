/**
 * Player Client Director
 * Converted directly from Kotlin: com.metrolist.innertubex.extraction.PlayerClientDirector
 * Manages playback client catalog (WEB, WEB_REMIX, ANDROID, IOS, VISIONOS),
 * client fallback chains, visitor data, poToken bindings, and response validation.
 */

import { PoTokenGenerator, PoTokenResult } from './potoken';
import { InnertubeStreamFormat } from './models';
import { ContentHints } from './formatSelector';

export interface YouTubeClientInfo {
  clientName: string;
  clientId: string;
  clientVersion: string;
  userAgent: string;
  osName?: string;
  osVersion?: string;
  deviceModel?: string;
}

export const YouTubeClient = {
  WEB: {
    clientName: 'WEB',
    clientId: '1',
    clientVersion: '2.20240313.01.00',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  } as YouTubeClientInfo,

  WEB_REMIX: {
    clientName: 'WEB_REMIX',
    clientId: '67',
    clientVersion: '1.20240313.01.00',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  } as YouTubeClientInfo,

  ANDROID: {
    clientName: 'ANDROID',
    clientId: '3',
    clientVersion: '19.09.37',
    userAgent: 'com.google.android.youtube/19.09.37 (Linux; U; Android 14; Pixel 8 Pro Build/UD1A.231105.004) gzip',
  } as YouTubeClientInfo,

  ANDROID_MUSIC: {
    clientName: 'ANDROID_MUSIC',
    clientId: '21',
    clientVersion: '6.43.52',
    userAgent: 'com.google.android.apps.youtube.music/6.43.52 (Linux; U; Android 14) gzip',
  } as YouTubeClientInfo,

  IOS: {
    clientName: 'IOS',
    clientId: '5',
    clientVersion: '19.09.3',
    userAgent: 'com.google.ios.youtube/19.09.3 (iPhone15,2; U; CPU iOS 17_3_1 like Mac OS X; en_US)',
  } as YouTubeClientInfo,

  VISIONOS: {
    clientName: 'VISIONOS',
    clientId: '113',
    clientVersion: '1.1.0',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  } as YouTubeClientInfo,

  TVHTML5: {
    clientName: 'TVHTML5',
    clientId: '31',
    clientVersion: '7.20240313.00.00',
    userAgent: 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/24.lts.4-gold (unlike Gecko) Starboard/16',
  } as YouTubeClientInfo,
};

export interface PlayablePlayerResponse {
  clientName: string;
  streamingDataPoToken?: string;
  response: {
    playabilityStatus: {
      status: string;
      reason?: string;
    };
    streamingData?: {
      formats?: InnertubeStreamFormat[];
      adaptiveFormats?: InnertubeStreamFormat[];
      hlsManifestUrl?: string;
      dashManifestUrl?: string;
      serverAbrStreamingUrl?: string;
    };
    videoDetails?: {
      videoId: string;
      title: string;
      lengthSeconds: string;
      author: string;
    };
  };
}

export interface PlayerClientBatchResult {
  playableResponses: PlayablePlayerResponse[];
  requestFailures: Array<{ clientName: string; error: string }>;
}

export class PlayerClientDirector {
  private visitorData: string = '';
  private cookie: string | null = null;
  private poTokenGenerator: PoTokenGenerator;
  private playerRequestTimeoutMs: number = 5000;

  constructor(timeoutMs = 5000) {
    this.poTokenGenerator = new PoTokenGenerator();
    this.playerRequestTimeoutMs = timeoutMs;
  }

  public setVisitorData(visitor: string) {
    this.visitorData = visitor;
  }

  public getVisitorData(): string {
    return this.visitorData;
  }

  public setCookie(cookie: string | null) {
    this.cookie = cookie;
  }

  /**
   * Resolve priority clients according to content hints
   */
  public resolveClients(hints?: ContentHints): YouTubeClientInfo[] {
    if (hints?.playbackClientOverrideId) {
      const match = (YouTubeClient as any)[hints.playbackClientOverrideId];
      if (match) return [match];
    }

    if (hints?.isLive) {
      return [YouTubeClient.WEB, YouTubeClient.ANDROID, YouTubeClient.IOS];
    }

    // Default fallback order
    return [
      YouTubeClient.WEB_REMIX,
      YouTubeClient.ANDROID_MUSIC,
      YouTubeClient.WEB,
      YouTubeClient.ANDROID,
      YouTubeClient.IOS,
      YouTubeClient.TVHTML5,
    ];
  }

  /**
   * Fetch player responses using fallback clients and poToken attestation
   */
  public async fetchPlayerResponses(
    videoId: string,
    hints?: ContentHints
  ): Promise<PlayerClientBatchResult> {
    const clients = this.resolveClients(hints);
    const playableResponses: PlayablePlayerResponse[] = [];
    const requestFailures: Array<{ clientName: string; error: string }> = [];

    // Obtain PO Token if visitor data is available
    let tokenResult: PoTokenResult | null = null;
    try {
      tokenResult = PoTokenGenerator.generatePoToken();
    } catch {
      // Degrades gracefully without blocking
    }

    for (const client of clients) {
      try {
        const payload: any = {
          videoId,
          context: {
            client: {
              clientName: client.clientName,
              clientVersion: client.clientVersion,
              hl: 'en',
              gl: 'US',
              visitorData: tokenResult?.visitorData || this.visitorData || undefined,
            },
          },
        };

        if (tokenResult?.poToken) {
          payload.serviceIntegrityDimensions = {
            poToken: tokenResult.poToken,
          };
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.playerRequestTimeoutMs);

        const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': client.userAgent,
            'X-YouTube-Client-Name': client.clientId,
            'X-YouTube-Client-Version': client.clientVersion,
            ...(this.cookie ? { Cookie: this.cookie } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!response.ok) {
          requestFailures.push({ clientName: client.clientName, error: `HTTP ${response.status}` });
          continue;
        }

        const data = await response.json();
        if (data.playabilityStatus?.status === 'OK') {
          playableResponses.push({
            clientName: client.clientName,
            streamingDataPoToken: tokenResult?.poToken,
            response: data,
          });
          // Stop on first viable playable client
          break;
        } else {
          requestFailures.push({
            clientName: client.clientName,
            error: data.playabilityStatus?.reason || data.playabilityStatus?.status || 'Unplayable',
          });
        }
      } catch (err: any) {
        requestFailures.push({ clientName: client.clientName, error: err.message || 'Request timeout' });
      }
    }

    return { playableResponses, requestFailures };
  }
}
