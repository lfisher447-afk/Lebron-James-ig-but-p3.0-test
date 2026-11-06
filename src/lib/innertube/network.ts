/**
 * Network Config & InnerTube Client Context
 * Converted directly from Kotlin: com.metrolist.innertube.network.NetworkConfig
 */

import { PoTokenGenerator } from './potoken';

export type InnertubeClientContext = 'WEB' | 'WEB_REMIX' | 'ANDROID' | 'IOS' | 'TVHTML5';

export interface ClientContextConfig {
  clientName: string;
  clientVersion: string;
  userAgent: string;
  osName: string;
  osVersion: string;
  platform: string;
}

export const CLIENT_CONFIGS: Record<InnertubeClientContext, ClientContextConfig> = {
  WEB: {
    clientName: 'WEB',
    clientVersion: '2.20240313.01.00',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    osName: 'Windows',
    osVersion: '10.0',
    platform: 'DESKTOP',
  },
  WEB_REMIX: {
    clientName: 'WEB_REMIX',
    clientVersion: '1.20240313.01.00',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    osName: 'Windows',
    osVersion: '10.0',
    platform: 'DESKTOP',
  },
  ANDROID: {
    clientName: 'ANDROID',
    clientVersion: '19.09.37',
    userAgent:
      'com.google.android.youtube/19.09.37 (Linux; U; Android 14; en_US; Pixel 8 Pro)',
    osName: 'Android',
    osVersion: '14',
    platform: 'MOBILE',
  },
  IOS: {
    clientName: 'IOS',
    clientVersion: '19.09.3',
    userAgent:
      'com.google.ios.youtube/19.09.3 (iPhone15,2; U; CPU iOS 17_4 like Mac OS X; en_US)',
    osName: 'iOS',
    osVersion: '17.4',
    platform: 'MOBILE',
  },
  TVHTML5: {
    clientName: 'TVHTML5',
    clientVersion: '7.20240313.11.00',
    userAgent:
      'Mozilla/5.0 (PlayStation 5; TV; rv:109.0) Gecko/20100101 Firefox/109.0',
    osName: 'FreeBSD',
    osVersion: 'PS5',
    platform: 'TV',
  },
};

export enum NetworkQuality {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  POOR = 'POOR',
  UNKNOWN = 'UNKNOWN',
}

export interface TimeoutConfig {
  connectTimeout: number;
  readTimeout: number;
  requestTimeout: number;
}

export class NetworkConfig {
  static readonly CONNECT_TIMEOUT_SECONDS = 30;
  static readonly READ_TIMEOUT_SECONDS = 60;
  static readonly WRITE_TIMEOUT_SECONDS = 60;
  static readonly REQUEST_TIMEOUT_MILLIS = 60000;
  static readonly CACHE_SIZE_MB = 50 * 1024 * 1024; // 50 MB

  /**
   * Get adaptive timeout values based on measured network quality
   */
  static getAdaptiveTimeouts(networkQuality: NetworkQuality): TimeoutConfig {
    switch (networkQuality) {
      case NetworkQuality.EXCELLENT:
        return {
          connectTimeout: 10000,
          readTimeout: 30000,
          requestTimeout: 45000,
        };
      case NetworkQuality.GOOD:
        return {
          connectTimeout: 20000,
          readTimeout: 45000,
          requestTimeout: 60000,
        };
      case NetworkQuality.POOR:
        return {
          connectTimeout: 30000,
          readTimeout: 60000,
          requestTimeout: 90000,
        };
      case NetworkQuality.UNKNOWN:
      default:
        return {
          connectTimeout: this.CONNECT_TIMEOUT_SECONDS * 1000,
          readTimeout: this.READ_TIMEOUT_SECONDS * 1000,
          requestTimeout: this.REQUEST_TIMEOUT_MILLIS,
        };
    }
  }

  /**
   * Build complete InnerTube JSON request body with context
   */
  static buildRequestBody(
    clientType: InnertubeClientContext = 'WEB_REMIX',
    extraPayload: Record<string, any> = {}
  ): Record<string, any> {
    const cfg = CLIENT_CONFIGS[clientType];
    const { visitorData } = PoTokenGenerator.generatePoToken();

    return {
      context: {
        client: {
          hl: 'en',
          gl: 'US',
          clientName: cfg.clientName,
          clientVersion: cfg.clientVersion,
          osName: cfg.osName,
          osVersion: cfg.osVersion,
          platform: cfg.platform,
          userAgent: cfg.userAgent,
          visitorData,
        },
        user: {
          lockedSafetyMode: false,
        },
        request: {
          useSsl: true,
          internalExperimentFlags: [],
        },
      },
      ...extraPayload,
    };
  }

  /**
   * Standard InnerTube HTTP request headers
   */
  static getHeaders(clientType: InnertubeClientContext = 'WEB_REMIX'): Record<string, string> {
    const cfg = CLIENT_CONFIGS[clientType];
    const poHeaders = PoTokenGenerator.getHeaders();

    return {
      'Content-Type': 'application/json',
      'User-Agent': cfg.userAgent,
      'X-YouTube-Client-Name': clientType === 'WEB_REMIX' ? '67' : '1',
      'X-YouTube-Client-Version': cfg.clientVersion,
      'X-Goog-Visitor-Id': poHeaders['X-Goog-Visitor-Id'],
      'X-Youtube-Po-Token': poHeaders['X-Youtube-Po-Token'],
      Origin: 'https://music.youtube.com',
      Referer: 'https://music.youtube.com/',
      Accept: '*/*',
    };
  }
}
