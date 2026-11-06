/**
 * Spotui BrowserOS Stealth Proxy Utilities
 * Provides URL scrambling/obfuscation, DPI filter evasion, and tunnel profile helpers.
 */

const SCRAMBLE_KEY = 0x5a;
const PREFIX = 'sp_';

/**
 * Scrambles a URL into an obfuscated, DPI-proof string.
 * School and corporate firewalls (GoGuardian, Securly, Lightspeed, Cisco Umbrella, Fortinet)
 * inspect query strings for keywords like 'discord', 'reddit', 'youtube', 'games', 'spotify'.
 * Scrambled URLs are completely unreadable to string inspectors.
 */
export function scrambleUrl(url: string, key = SCRAMBLE_KEY): string {
  if (!url) return '';
  if (url.startsWith(PREFIX)) return url;
  try {
    const bytes = new TextEncoder().encode(url.trim());
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i] ^ key);
    }
    // URL-safe Base64
    const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return PREFIX + b64;
  } catch {
    return url;
  }
}

/**
 * Unscrambles an obfuscated proxy URL back to the original target URL.
 */
export function unscrambleUrl(scrambled: string, key = SCRAMBLE_KEY): string {
  if (!scrambled) return '';
  if (!scrambled.startsWith(PREFIX)) return scrambled;
  try {
    let b64 = scrambled.slice(PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i) ^ key;
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return scrambled;
  }
}

export interface TunnelProfile {
  id: string;
  name: string;
  location: string;
  flag: string;
  baseLatency: number;
  encryption: string;
  features: string[];
  stealthGrade: string;
  dpiBypass: string;
  description: string;
}

export const TUNNEL_PROFILES: TunnelProfile[] = [
  {
    id: 'vercel-edge',
    name: 'Vercel Anycast Edge',
    location: 'Global Anycast Mesh (100+ PoPs)',
    flag: '⚡',
    baseLatency: 8,
    encryption: 'TLS 1.3 / ChaCha20-Poly1305',
    features: ['Turbo Memory Cache (Sub-ms)', 'HTTP/2 Connection Pooling', 'Zero-Buffer Stream Pipe'],
    stealthGrade: 'A+ (Elite)',
    dpiBypass: 'Anycast Multipath Routing',
    description: 'Ultra-low latency global edge with in-memory caching and pipelined streaming for maximum speed.',
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet WSM Core',
    location: 'Frankfurt / Amsterdam',
    flag: '🇩🇪',
    baseLatency: 14,
    encryption: 'Wasm Scrambler / AES-256-GCM',
    features: ['Full URL Obfuscation', 'Dynamic Cookie Isolation', 'Deep DOM Link Rewrite'],
    stealthGrade: 'A+ (Undetectable)',
    dpiBypass: 'Polymorphic Query Scramble',
    description: 'High-security Wasm engine with bidirectional link rewriting and cookie sandboxing.',
  },
  {
    id: 'webroot',
    name: 'Webroot Stealth Router',
    location: 'Northern Virginia, US',
    flag: '🇺🇸',
    baseLatency: 18,
    encryption: 'AES-256-GCM / Ephemeral Key',
    features: ['Zero Proxy Signatures', 'Randomized Browser Fingerprints', 'Referrer Sanitizer'],
    stealthGrade: 'A+ (Ghost)',
    dpiBypass: 'Header Shuffling & Stripping',
    description: 'Ghost mode routing with zero proxy footprint and randomized real browser Client Hints.',
  },
  {
    id: 'insidious',
    name: 'Insidious Bypass Node',
    location: 'Tokyo, Japan',
    flag: '🇯🇵',
    baseLatency: 24,
    encryption: 'Obfs4 / TLS 1.3 / SNI Cloak',
    features: ['Anti-DPI Packet Shaper', 'Bot Guard Neutralizer', 'School Firewall Bypass'],
    stealthGrade: 'A+ (Fortified)',
    dpiBypass: 'L7 Packet Fragmentation',
    description: 'Specially engineered for aggressive school and enterprise filters with deep DPI circumvention.',
  },
  {
    id: 'mrbean',
    name: 'MrBean Shadow Tunnel',
    location: 'London, UK',
    flag: '🇬🇧',
    baseLatency: 28,
    encryption: 'Encrypted WebSocket Tunnel',
    features: ['Encrypted WS Fallback', 'WebSocket Proxying', 'Dynamic DNS Cloaking'],
    stealthGrade: 'A (Stealth)',
    dpiBypass: 'WebSocket Payload Wrapping',
    description: 'Shadow tunnel wrapping HTTP payloads in encrypted WebSocket streams to bypass HTTP-only inspectors.',
  },
];
