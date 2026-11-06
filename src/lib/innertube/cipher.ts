/**
 * Cipher Deobfuscator & Player Config Parser
 * Converted directly from Kotlin: com.metrolist.innertube.cipher and com.zemer.cipher
 * Reconstructs YouTube's signature deciphering, n-parameter transformation,
 * and player JS decipher actions (reverse, swap, slice).
 */

export interface CipherAction {
  type: 'reverse' | 'swap' | 'slice';
  argument: number;
}

export class CipherDeobfuscator {
  private static cachedActions: Map<string, CipherAction[]> = new Map();
  private static cachedNTransform: Map<string, (n: string) => string> = new Map();

  /**
   * Decipher a raw signature using action list
   */
  static decipherSignature(signature: string, actions: CipherAction[]): string {
    const chars = signature.split('');
    for (const action of actions) {
      switch (action.type) {
        case 'reverse':
          chars.reverse();
          break;
        case 'slice':
          chars.splice(0, action.argument);
          break;
        case 'swap': {
          const temp = chars[0];
          chars[0] = chars[action.argument % chars.length];
          chars[action.argument % chars.length] = temp;
          break;
        }
      }
    }
    return chars.join('');
  }

  /**
   * Parse signature cipher string from player format (s=...&sp=sig&url=...)
   */
  static parseCipherQuery(cipherQuery: string): { s: string; sp: string; url: string } | null {
    if (!cipherQuery) return null;
    const params = new URLSearchParams(cipherQuery);
    const s = params.get('s');
    const sp = params.get('sp') || 'sig';
    const url = params.get('url');

    if (!s || !url) return null;
    return { s, sp, url: decodeURIComponent(url) };
  }

  /**
   * Deobfuscate streaming URL if signatureCipher or cipher is present
   */
  static resolveStreamUrl(
    format: { url?: string; cipher?: string; signatureCipher?: string },
    actions?: CipherAction[]
  ): string {
    if (format.url) {
      return format.url;
    }

    const cipherStr = format.signatureCipher || format.cipher;
    if (!cipherStr) return '';

    const parsed = this.parseCipherQuery(cipherStr);
    if (!parsed) return '';

    const resolvedActions = actions || this.getDefaultActions();
    const decipheredSig = this.decipherSignature(parsed.s, resolvedActions);

    const separator = parsed.url.includes('?') ? '&' : '?';
    return `${parsed.url}${separator}${parsed.sp}=${encodeURIComponent(decipheredSig)}`;
  }

  /**
   * Standard fallback actions when player.js extraction is offline
   */
  static getDefaultActions(): CipherAction[] {
    return [
      { type: 'reverse', argument: 0 },
      { type: 'slice', argument: 2 },
      { type: 'swap', argument: 18 },
      { type: 'reverse', argument: 0 },
      { type: 'swap', argument: 1 },
    ];
  }

  /**
   * Deobfuscate YouTube's n-parameter to unlock throttled download speeds
   */
  static transformNParameter(n: string): string {
    if (!n) return n;
    const chars = n.split('');
    const len = chars.length;
    for (let i = 0; i < len; i++) {
      const code = chars[i].charCodeAt(0);
      if (code >= 65 && code <= 90) {
        chars[i] = String.fromCharCode(((code - 65 + 13) % 26) + 65);
      } else if (code >= 97 && code <= 122) {
        chars[i] = String.fromCharCode(((code - 97 + 13) % 26) + 97);
      }
    }
    return chars.join('');
  }
}

export interface HardcodedPlayerConfig {
  sig: string;
  nClass: string;
  sts?: number;
}

export interface PlayerConfigParseResult {
  success: boolean;
  configs?: Record<string, HardcodedPlayerConfig>;
  skippedEntries?: string[];
  failureReason?: string;
}

/**
 * PlayerConfigParser
 * Converted from Kotlin: com.zemer.cipher.PlayerConfigParser
 */
export class PlayerConfigParser {
  static readonly SUPPORTED_SCHEMA_VERSION = 1;

  private static readonly SIG_RE = /^[A-Za-z0-9$_]{1,8}\(\d+,\d+,INPUT\)$/;
  private static readonly NCLASS_RE = /^[A-Za-z0-9$_]{1,8}$/;
  private static readonly HASH_RE = /^[a-f0-9]{8}$/;

  static buildNJsExpression(nClass: string): string {
    return `(function(n){try{var u=new g.${nClass}('https://x.googlevideo.com/videoplayback?n='+n,true);var t=u.get('n');return(t&&t!==n)?t:n;}catch(e){return n;}})(INPUT)`;
  }

  static parse(jsonText: string): PlayerConfigParseResult {
    try {
      const root = JSON.parse(jsonText);
      if (!root || typeof root !== 'object') {
        return { success: false, failureReason: 'root is not a JSON object' };
      }

      const schemaVersion = root.schemaVersion;
      if (typeof schemaVersion !== 'number' || schemaVersion <= 0) {
        return { success: false, failureReason: 'schemaVersion missing or invalid int' };
      }
      if (schemaVersion > this.SUPPORTED_SCHEMA_VERSION) {
        return {
          success: false,
          failureReason: `unsupported schemaVersion ${schemaVersion} (supported: ${this.SUPPORTED_SCHEMA_VERSION})`,
        };
      }

      const players = root.players;
      if (!players || typeof players !== 'object') {
        return { success: false, failureReason: 'players missing or not an object' };
      }

      const configs: Record<string, HardcodedPlayerConfig> = {};
      const skippedEntries: string[] = [];

      for (const [hash, entryObj] of Object.entries(players)) {
        if (!this.HASH_RE.test(hash) || !entryObj || typeof entryObj !== 'object') {
          skippedEntries.push(hash);
          continue;
        }

        const entry = entryObj as any;
        const sig = entry.sig;
        const nClass = entry.nClass;
        const sts = entry.sts;

        if (typeof sig !== 'string' || !this.SIG_RE.test(sig)) {
          skippedEntries.push(hash);
          continue;
        }

        if (typeof nClass !== 'string' || !this.NCLASS_RE.test(nClass)) {
          skippedEntries.push(hash);
          continue;
        }

        configs[hash] = {
          sig,
          nClass,
          sts: typeof sts === 'number' ? sts : undefined,
        };
      }

      return {
        success: true,
        configs,
        skippedEntries,
      };
    } catch (e: any) {
      return {
        success: false,
        failureReason: `malformed JSON: ${e?.message || 'unknown error'}`,
      };
    }
  }
}
