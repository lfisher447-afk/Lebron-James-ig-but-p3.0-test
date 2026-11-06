/**
 * Proxy Server Matrix & Instance Manager
 * Includes all public Invidious instances, alternative web nodes, and stream proxies (12 servers).
 */

export interface ProxyServerNode {
  id: string;
  name: string;
  url: string;
  protocol: 'native' | 'invidious' | 'ytify' | 'vivid' | 'piped' | 'cobalt' | 'wisp' | 'gateway';
  region: string;
  country: string;
  flag: string;
  secure: boolean;
  pingMs?: number;
  status: 'online' | 'degraded' | 'offline' | 'checking';
  description: string;
  sourceCodeUrl?: string;
  captchaStatus: string;
  badge?: string;
  embedFormat?: (videoId: string) => string;
}

export const YOUTUBE_PROXY_SERVERS: ProxyServerNode[] = [
  {
    id: 'inv-nerdvpn',
    name: 'invidious.nerdvpn.de',
    url: 'https://invidious.nerdvpn.de',
    protocol: 'invidious',
    region: 'UA',
    country: 'Ukraine',
    flag: '🇺🇦',
    secure: true,
    status: 'online',
    pingMs: 29,
    badge: 'Fastest',
    description: 'High-availability Ukrainian Invidious instance. Clean streaming without Go-away captcha blocks.',
    sourceCodeUrl: 'https://git.nerdvpn.de/NerdVPN.de/invidious',
    captchaStatus: 'None',
    embedFormat: (id: string) => `https://invidious.nerdvpn.de/embed/${id}?autoplay=1`,
  },
  {
    id: 'inv-tiekoetter',
    name: 'invidious.tiekoetter.com',
    url: 'https://invidious.tiekoetter.com',
    protocol: 'invidious',
    region: 'DE',
    country: 'Germany',
    flag: '🇩🇪',
    secure: true,
    status: 'online',
    pingMs: 34,
    badge: 'High Speed',
    description: 'German Invidious node with reliable fast video and audio format delivery.',
    sourceCodeUrl: 'https://github.com/tiekoetter/invidious',
    captchaStatus: 'None',
    embedFormat: (id: string) => `https://invidious.tiekoetter.com/embed/${id}?autoplay=1`,
  },
  {
    id: 'inv-chocolatemoo',
    name: 'yt.chocolatemoo53.com',
    url: 'https://yt.chocolatemoo53.com',
    protocol: 'invidious',
    region: 'US',
    country: 'United States',
    flag: '🇺🇸',
    secure: true,
    status: 'online',
    pingMs: 24,
    badge: 'US West',
    description: 'United States Invidious node with low-latency media deciphering.',
    sourceCodeUrl: 'https://git.nadeko.net/Fijxu/invidious',
    captchaStatus: 'None',
    embedFormat: (id: string) => `https://yt.chocolatemoo53.com/embed/${id}?autoplay=1`,
  },
  {
    id: 'inv-f5si',
    name: 'invidious.f5.si',
    url: 'https://invidious.f5.si',
    protocol: 'invidious',
    region: 'JP',
    country: 'Japan',
    flag: '🇯🇵',
    secure: true,
    status: 'online',
    pingMs: 65,
    badge: 'Asia-Pacific',
    description: 'Japan Invidious mirror instance with Asia-Pacific routing.',
    sourceCodeUrl: 'https://github.com/iv-org/invidious',
    captchaStatus: 'None',
    embedFormat: (id: string) => `https://invidious.f5.si/embed/${id}?autoplay=1`,
  },
  {
    id: 'inv-perennial',
    name: 'invidious.perennialtechtips.com',
    url: 'https://invidious.perennialtechtips.com',
    protocol: 'invidious',
    region: 'CA',
    country: 'Canada',
    flag: '🇨🇦',
    secure: true,
    status: 'online',
    pingMs: 42,
    badge: 'North America',
    description: 'Canadian high-bandwidth Invidious instance with fast CDN caching.',
    sourceCodeUrl: 'https://github.com/iv-org/invidious',
    captchaStatus: 'None',
    embedFormat: (id: string) => `https://invidious.perennialtechtips.com/embed/${id}?autoplay=1`,
  },
  {
    id: 'inv-tuxpizza',
    name: 'inv.tux.pizza',
    url: 'https://inv.tux.pizza',
    protocol: 'invidious',
    region: 'FR',
    country: 'France',
    flag: '🇫🇷',
    secure: true,
    status: 'online',
    pingMs: 39,
    badge: 'EU Central',
    description: 'French Invidious mirror offering privacy-friendly, unthrottled streaming.',
    sourceCodeUrl: 'https://github.com/iv-org/invidious',
    captchaStatus: 'None',
    embedFormat: (id: string) => `https://inv.tux.pizza/embed/${id}?autoplay=1`,
  },
  {
    id: 'inv-privatecoffee',
    name: 'invidious.private.coffee',
    url: 'https://invidious.private.coffee',
    protocol: 'invidious',
    region: 'AT',
    country: 'Austria',
    flag: '🇦🇹',
    secure: true,
    status: 'online',
    pingMs: 48,
    badge: 'EU Privacy',
    description: 'Hardened Austrian Invidious server with strict zero-logging configuration.',
    sourceCodeUrl: 'https://github.com/iv-org/invidious',
    captchaStatus: 'None',
    embedFormat: (id: string) => `https://invidious.private.coffee/embed/${id}?autoplay=1`,
  },
  {
    id: 'node-ytify',
    name: 'ytify.pp.ua',
    url: 'https://ytify.pp.ua',
    protocol: 'ytify',
    region: 'UA',
    country: 'Ukraine',
    flag: '🇺🇦',
    secure: true,
    status: 'online',
    pingMs: 38,
    badge: 'Web App',
    description: 'Modern lightweight YouTube web client and player without ads.',
    sourceCodeUrl: 'https://github.com/ytify/ytify',
    captchaStatus: 'None',
    embedFormat: (id: string) => `/api/proxy?url=${encodeURIComponent(`https://ytify.pp.ua/?s=${id}`)}`,
  },
  {
    id: 'node-vivid',
    name: 'vivid.errexe.xyz',
    url: 'https://vivid.errexe.xyz',
    protocol: 'vivid',
    region: 'ES',
    country: 'Spain',
    flag: '🌐',
    secure: true,
    status: 'online',
    pingMs: 50,
    badge: 'Vivid Cinema',
    description: 'Vivid Web YouTube privacy-focused player and frontend.',
    sourceCodeUrl: 'https://github.com/errexe/vivid',
    captchaStatus: 'None',
    embedFormat: (id: string) => `/api/proxy?url=${encodeURIComponent(`https://vivid.errexe.xyz/#/watch?v=${id}`)}`,
  },
  {
    id: 'node-piped',
    name: 'piped.video',
    url: 'https://piped.video',
    protocol: 'piped',
    region: 'GLOBAL',
    country: 'Global Mesh',
    flag: '🛡️',
    secure: true,
    status: 'online',
    pingMs: 33,
    badge: 'Piped Mesh',
    description: 'Libre YouTube client routing video via decentralized backend proxy networks.',
    sourceCodeUrl: 'https://github.com/TeamPiped/Piped',
    captchaStatus: 'None',
    embedFormat: (id: string) => `https://piped.video/embed/${id}?autoplay=1`,
  },
  {
    id: 'yt-nocookie',
    name: 'YouTube HD Privacy Embed',
    url: 'https://www.youtube-nocookie.com',
    protocol: 'native',
    region: 'GLOBAL',
    country: 'Global',
    flag: '🛡️',
    secure: true,
    status: 'online',
    pingMs: 10,
    badge: 'Zero Cookies',
    description: 'Official YouTube Privacy-Enhanced Stream with zero third-party tracking cookies.',
    captchaStatus: 'None',
    embedFormat: (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&enablejsapi=1`,
  },
  {
    id: 'direct-html5',
    name: 'SpotUI Multi-Node Decipher Pipeline',
    url: '/api/video/stream',
    protocol: 'native',
    region: 'LOCAL',
    country: 'Decipher Engine',
    flag: '⚡',
    secure: true,
    status: 'online',
    pingMs: 2,
    badge: 'Web Audio DSP',
    description: 'Direct HTML5 streaming proxy routing through Kotlin-ported cipher deobfuscation pipeline with 5-band DSP integration.',
    captchaStatus: 'None',
  },
  {
    id: 'inv-nadeko',
    name: 'inv.nadeko.net',
    url: 'https://inv.nadeko.net',
    protocol: 'invidious',
    region: 'CL',
    country: 'Chile',
    flag: '🇨🇱',
    secure: true,
    status: 'degraded',
    pingMs: 45,
    badge: 'CAPTCHA Alert',
    description: 'Chilean Invidious instance (Protected by Go-away CAPTCHA: may restrict iframe embedding).',
    sourceCodeUrl: 'https://git.nadeko.net/Fijxu/invidious',
    captchaStatus: 'Go-away CAPTCHA active',
    embedFormat: (id: string) => `https://inv.nadeko.net/embed/${id}?autoplay=1`,
  },
];

const STORAGE_KEY = 'spotui_active_proxy_server_id';

export function getActiveServerId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'inv-nerdvpn';
  } catch {
    return 'inv-nerdvpn';
  }
}

export function setActiveServerId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

export function getActiveServerNode(): ProxyServerNode {
  const currentId = getActiveServerId();
  const node = YOUTUBE_PROXY_SERVERS.find((s) => s.id === currentId);
  return node || YOUTUBE_PROXY_SERVERS[0];
}

export async function pingProxyServerNode(node: ProxyServerNode): Promise<number> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const testUrl = node.url.startsWith('http') ? `/api/proxy?url=${encodeURIComponent(node.url)}` : node.url;
    const res = await fetch(testUrl, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    const ping = Math.round(performance.now() - start);
    return res.ok || res.status === 302 || res.status === 403 ? ping : 999;
  } catch {
    return 999;
  }
}
