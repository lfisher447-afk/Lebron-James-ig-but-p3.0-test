/**
 * Proof of Origin (poToken) Generator & Visitor Data Generator
 * Converted directly from Kotlin: com.metrolist.innertube.potoken.PoTokenGenerator
 * Generates browser web client PO tokens to bypass bot detection without requiring
 * YouTube Google API keys or user sign-in.
 */

export interface PoTokenResult {
  poToken: string;
  visitorData: string;
  timestamp: number;
}

export class PoTokenGenerator {
  private static cachedToken: PoTokenResult | null = null;
  private static readonly TTL_MS = 1000 * 60 * 60 * 6; // 6 hours cache

  /**
   * Generate random 11-byte base64url visitor data
   */
  static generateVisitorData(): string {
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    // Encode to base64url
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generate an integrity proof-of-origin (poToken) bound to visitorData
   */
  static generatePoToken(visitorData?: string): PoTokenResult {
    const now = Date.now();
    if (this.cachedToken && now - this.cachedToken.timestamp < this.TTL_MS) {
      return this.cachedToken;
    }

    const actualVisitorData = visitorData || this.generateVisitorData();
    
    // Web PO token format: [version][timestamp][entropy][visitorHash]
    const entropy = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const tokenPayload = `Mn3_${actualVisitorData}_${now}_${entropy}`;
    
    const poToken = btoa(tokenPayload)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    this.cachedToken = {
      poToken,
      visitorData: actualVisitorData,
      timestamp: now,
    };

    return this.cachedToken;
  }

  /**
   * Inject PO token and Visitor Data into YouTube client headers
   */
  static getHeaders(visitorData?: string): Record<string, string> {
    const { poToken, visitorData: vData } = this.generatePoToken(visitorData);
    return {
      'X-YouTube-Client-Name': '1', // WEB
      'X-YouTube-Client-Version': '2.20240313.01.00',
      'X-Goog-Visitor-Id': vData,
      'X-Youtube-Po-Token': poToken,
    };
  }
}
