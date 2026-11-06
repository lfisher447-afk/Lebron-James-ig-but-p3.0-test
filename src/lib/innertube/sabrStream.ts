/**
 * YouTube SABR (Server-driven Adaptive BitRate) & UMP (Universal Media Protocol) Stream Parser
 * Converted directly from Kotlin: com.metrolist.innertubex.sabr.SabrAudioStream
 * Handles binary streaming decoding for application/vnd.yt-ump frames.
 */

export enum UmpPartType {
  UNKNOWN = 0,
  FORMAT_INITIALIZATION_METADATA = 1,
  MEDIA_HEADER = 2,
  MEDIA = 3,
  MEDIA_END = 4,
  END_OF_TRACK = 5,
}

export interface SabrFormatId {
  itag: number;
  lastModified: number;
}

export interface SabrBootstrapConfig {
  serverAbrStreamingUrl: string;
  selectedAudioFormat: SabrFormatId;
  selectedVideoFormat?: SabrFormatId;
  selectedVideoWidth?: number;
  selectedVideoHeight?: number;
  selectedVideoContentLengthBytes?: number;
  selectedVideoMimeType?: string;
  contentLengthBytes?: number;
  clientPlaybackNonce: string;
  poToken?: string;
}

export interface UmpPart {
  type: UmpPartType;
  headerId?: number;
  itag?: number;
  isInit?: boolean;
  data: Uint8Array;
}

export class SabrProtocolException extends Error {
  constructor(message: string) {
    super(`SabrProtocolException: ${message}`);
    this.name = 'SabrProtocolException';
  }
}

/**
 * UMP Part Decoder
 * Decodes varint headers and payload slices from raw binary buffer
 */
export class UmpPartDecoder {
  static decodeParts(buffer: Uint8Array): UmpPart[] {
    const parts: UmpPart[] = [];
    let offset = 0;

    while (offset < buffer.length) {
      if (offset + 1 > buffer.length) break;

      const partTypeByte = buffer[offset++];
      const partType: UmpPartType =
        partTypeByte <= 5 ? (partTypeByte as UmpPartType) : UmpPartType.UNKNOWN;

      // Decode varint payload length
      let length = 0;
      let shift = 0;
      while (offset < buffer.length) {
        const b = buffer[offset++];
        length |= (b & 0x7f) << shift;
        if ((b & 0x80) === 0) break;
        shift += 7;
      }

      if (offset + length > buffer.length) {
        // Truncated packet
        break;
      }

      const payload = buffer.slice(offset, offset + length);
      offset += length;

      parts.push({
        type: partType,
        data: payload,
      });
    }

    return parts;
  }
}

/**
 * SabrAudioStream reader
 */
export class SabrAudioStream {
  private config: SabrBootstrapConfig;

  constructor(config: SabrBootstrapConfig) {
    this.config = config;
  }

  /**
   * Request SABR audio chunks from YouTube endpoint
   */
  async fetchAudioChunks(): Promise<Uint8Array[]> {
    if (!this.config.serverAbrStreamingUrl) {
      throw new SabrProtocolException('Missing serverAbrStreamingUrl');
    }

    const targetUrl = new URL(this.config.serverAbrStreamingUrl);
    targetUrl.searchParams.set('cpn', this.config.clientPlaybackNonce);
    targetUrl.searchParams.set('rn', '0');
    if (this.config.poToken) {
      targetUrl.searchParams.set('pot', this.config.poToken);
    }

    const response = await fetch(targetUrl.toString(), {
      headers: {
        Accept: 'application/vnd.yt-ump',
        'X-YouTube-Client-Playback-Nonce': this.config.clientPlaybackNonce,
      },
    });

    if (!response.ok) {
      throw new SabrProtocolException(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const parts = UmpPartDecoder.decodeParts(new Uint8Array(arrayBuffer));

    const mediaChunks: Uint8Array[] = [];
    for (const p of parts) {
      if (p.type === UmpPartType.MEDIA || p.type === UmpPartType.FORMAT_INITIALIZATION_METADATA) {
        if (p.data.length > 0) {
          mediaChunks.push(p.data);
        }
      }
    }

    return mediaChunks;
  }
}
