/**
 * Innertube Suite Main Entry & YouTube Client Object
 * Converted directly from Kotlin: com.metrolist.innertube.YouTube
 */

import { PlayerResponse, SearchResponse } from './models';
import { YouTubeUrlParser } from './parser';
import { NetworkConfig, InnertubeClientContext } from './network';
import { parseCookieString, sha1 } from './utils';

export * from './parser';
export * from './cipher';
export * from './potoken';
export * from './formatSelector';
export * from './network';
export * from './spotify';
export * from './servers';
export * from './playerClientDirector';
export * from './sabrStream';
export * from './invidiousApi';
export * from './companionSync';

export class YouTubeConstants {
  static readonly DEFAULT_TOP_RESULT = 'Top result';
  static readonly DEFAULT_OTHER_RESULTS = 'Other';
}

export class SearchFilter {
  static readonly FILTER_SONG = new SearchFilter('EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D');
  static readonly FILTER_VIDEO = new SearchFilter('EgWKAQIQAWoKEAkQChAFEAMQBA%3D%3D');

  constructor(public readonly value: string) {}
}

export interface YouTubeLocale {
  gl: string;
  hl: string;
}

export class InnerTubeClient {
  locale: YouTubeLocale = { gl: 'US', hl: 'en' };
  visitorData?: string;
  dataSyncId?: string;
  cookie?: string;
  cookieMap: Record<string, string> = {};
  proxyUrl?: string;
  useLoginForBrowse: boolean = false;

  setCookie(cookieValue: string) {
    this.cookie = cookieValue;
    this.cookieMap = parseCookieString(cookieValue);
  }

  async search(query: string, filterValue?: string): Promise<any> {
    const body = NetworkConfig.buildRequestBody('WEB_REMIX', {
      query,
      params: filterValue,
    });
    const headers = NetworkConfig.getHeaders('WEB_REMIX');

    try {
      const res = await fetch('/api/innertube/search?q=' + encodeURIComponent(query));
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    return { results: [] };
  }

  async player(videoId: string, playlistId?: string): Promise<PlayerResponse | null> {
    try {
      const res = await fetch(`/api/innertube/video-info?id=${videoId}`);
      if (res.ok) {
        const info = await res.json();
        return info as PlayerResponse;
      }
    } catch {}
    return null;
  }
}

/**
 * YouTube Singleton API Wrapper
 * Converted from Kotlin: com.metrolist.innertube.YouTube
 */
export class YouTube {
  private static client = new InnerTubeClient();

  static get locale(): YouTubeLocale {
    return this.client.locale;
  }
  static set locale(value: YouTubeLocale) {
    this.client.locale = value;
  }

  static get visitorData(): string | undefined {
    return this.client.visitorData;
  }
  static set visitorData(value: string | undefined) {
    this.client.visitorData = value;
  }

  static get cookie(): string | undefined {
    return this.client.cookie;
  }
  static set cookie(value: string | undefined) {
    if (value) this.client.setCookie(value);
  }

  static async search(query: string, filter: SearchFilter = SearchFilter.FILTER_SONG): Promise<any[]> {
    const res = await this.client.search(query, filter.value);
    return res.results || [];
  }

  static async player(videoId: string, playlistId?: string): Promise<PlayerResponse | null> {
    return await this.client.player(videoId, playlistId);
  }

  static parseUrl(url: string) {
    return YouTubeUrlParser.parse(url);
  }
}
