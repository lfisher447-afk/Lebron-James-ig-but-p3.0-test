import { BookmarkItem, ProxyNodeInfo } from './BrowserOsTypes';

export const SEARCH_ENGINES = [
  { id: 'duckduckgo', name: 'DuckDuckGo', queryUrl: 'https://duckduckgo.com/?q=', icon: '🦆' },
  { id: 'google', name: 'Google', queryUrl: 'https://www.google.com/search?q=', icon: '🔍' },
  { id: 'brave', name: 'Brave Search', queryUrl: 'https://search.brave.com/search?q=', icon: '🦁' },
  { id: 'bing', name: 'Bing', queryUrl: 'https://www.bing.com/search?q=', icon: '🌐' },
  { id: 'wikipedia', name: 'Wikipedia', queryUrl: 'https://en.wikipedia.org/wiki/Special:Search?search=', icon: '📚' },
  { id: 'youtube', name: 'YouTube', queryUrl: 'https://www.youtube.com/results?search_query=', icon: '▶️' },
  { id: 'reddit', name: 'Reddit', queryUrl: 'https://www.reddit.com/search/?q=', icon: '🤖' },
  { id: 'ecosia', name: 'Ecosia', queryUrl: 'https://www.ecosia.org/search?q=', icon: '🌱' },
];

export const USER_AGENTS = [
  {
    id: 'chrome-win',
    name: 'Chrome 124 (Windows 11)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },
  {
    id: 'safari-mac',
    name: 'Safari 17 (macOS Sonoma)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  },
  {
    id: 'firefox-linux',
    name: 'Firefox 125 (Linux x86_64)',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
  },
  {
    id: 'iphone-ios',
    name: 'iPhone 15 Pro (iOS 17.4)',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  },
  {
    id: 'android-pixel',
    name: 'Pixel 8 Pro (Android 14)',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  },
];

export const PROXY_NODES: ProxyNodeInfo[] = [
  {
    id: 'vercel-edge',
    name: 'Vercel Anycast Edge',
    location: 'Global Anycast Mesh (100+ PoPs)',
    flag: '⚡',
    latency: 8,
    status: 'optimal',
    encryption: 'TLS 1.3 / ChaCha20',
    stealthGrade: 'A+ (Elite)',
    dpiBypass: 'Anycast Multipath Routing',
    description: 'Sub-millisecond turbo in-memory cache with zero-buffer streaming pipeline.',
    features: ['Turbo Memory Cache (<1ms)', 'Zero-Buffer Stream Pipe', 'HTTP/2 Multiplexing'],
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet WSM Core',
    location: 'Frankfurt / Amsterdam',
    flag: '🇩🇪',
    latency: 14,
    status: 'optimal',
    encryption: 'Wasm Scrambler',
    stealthGrade: 'A+ (Undetectable)',
    dpiBypass: 'Polymorphic Query Scramble',
    description: 'High-security Wasm engine with bidirectional link rewriting and cookie sandboxing.',
    features: ['URL Obfuscation', 'Dynamic Cookie Isolation', 'Deep DOM Link Rewrite'],
  },
  {
    id: 'webroot',
    name: 'Webroot Stealth Router',
    location: 'Northern Virginia, US',
    flag: '🇺🇸',
    latency: 18,
    status: 'stable',
    encryption: 'AES-256-GCM',
    stealthGrade: 'A+ (Ghost)',
    dpiBypass: 'Zero-Signature Headers',
    description: 'Ghost mode routing with zero proxy footprint and randomized real browser Client Hints.',
    features: ['Zero Proxy Footprint', 'Randomized Fingerprints', 'Referrer Sanitizer'],
  },
  {
    id: 'insidious',
    name: 'Insidious Bypass Node',
    location: 'Tokyo, Japan',
    flag: '🇯🇵',
    latency: 24,
    status: 'stable',
    encryption: 'Obfs4 / TLS 1.3',
    stealthGrade: 'A+ (Fortified)',
    dpiBypass: 'L7 Packet Fragmentation',
    description: 'Specially engineered for aggressive school and enterprise filters with deep DPI circumvention.',
    features: ['Anti-DPI Packet Shaper', 'Bot Guard Neutralizer', 'School Firewall Bypass'],
  },
  {
    id: 'mrbean',
    name: 'MrBean Shadow Tunnel',
    location: 'London, UK',
    flag: '🇬🇧',
    latency: 29,
    status: 'stable',
    encryption: 'Encrypted WebSocket',
    stealthGrade: 'A (Stealth)',
    dpiBypass: 'WS Stream Wrapping',
    description: 'Shadow tunnel wrapping HTTP payloads in encrypted WebSocket streams to bypass HTTP-only inspectors.',
    features: ['Encrypted WS Fallback', 'WebSocket Proxying', 'Dynamic DNS Cloaking'],
  },
];

export const DEFAULT_BOOKMARKS: BookmarkItem[] = [
  // Media & Music
  { id: 'bm-sp', title: 'Spotify Web Player', url: 'https://open.spotify.com', category: 'media', description: 'Stream millions of songs and podcasts', color: '#1db954', badge: 'Audio' },
  { id: 'bm-ytm', title: 'YouTube Music', url: 'https://music.youtube.com', category: 'media', description: 'Music streaming service by YouTube', color: '#f43f5e', badge: 'Audio' },
  { id: 'bm-sc', title: 'SoundCloud', url: 'https://soundcloud.com', category: 'media', description: 'Discover underground music and tracks', color: '#ff5500', badge: 'Mixes' },
  { id: 'bm-bc', title: 'Bandcamp', url: 'https://bandcamp.com', category: 'media', description: 'Direct artist discovery & high-res FLAC', color: '#629aa9', badge: 'Indie' },
  { id: 'bm-rg', title: 'Radio Garden', url: 'https://radio.garden', category: 'media', description: 'Explore live global radio stations on a 3D globe', color: '#10b981', badge: 'Globe' },

  // Unblocked Games & Emulators
  { id: 'bm-2048', title: '2048 Game', url: 'https://play2048.co', category: 'games', description: 'Classic tile-matching puzzle game', color: '#edc22e', badge: 'Puzzle' },
  { id: 'bm-chess', title: 'Chess.com', url: 'https://www.chess.com', category: 'games', description: 'Play chess online against players or bots', color: '#7fa650', badge: 'Board' },
  { id: 'bm-paper', title: 'Paper.io 2', url: 'https://paper-io.com', category: 'games', description: 'Multiplayer territory conquest arcade game', color: '#ec4899', badge: 'Arcade' },
  { id: 'bm-cc', title: 'Cookie Clicker', url: 'https://orteil.dashnet.org/cookieclicker/', category: 'games', description: 'The legendary incremental baking simulator', color: '#d97706', badge: 'Idle' },
  { id: 'bm-wordle', title: 'Wordle Unlimited', url: 'https://wordleunlimited.org', category: 'games', description: 'Guess hidden 5-letter words with clues', color: '#22c55e', badge: 'Word' },

  // Tools & Knowledge
  { id: 'bm-wiki', title: 'Wikipedia Portal', url: 'https://en.wikipedia.org/wiki/Main_Page', category: 'tools', description: 'The free encyclopedia anyone can edit', color: '#ffffff', badge: 'Wiki' },
  { id: 'bm-arch', title: 'Internet Archive Wayback Machine', url: 'https://archive.org', category: 'tools', description: 'Digital library of millions of free books, movies & sites', color: '#a855f7', badge: 'Archive' },
  { id: 'bm-hn', title: 'Hacker News', url: 'https://news.ycombinator.com', category: 'tools', description: 'Tech, startup and computer science headlines', color: '#ff6600', badge: 'Tech' },
  { id: 'bm-gh', title: 'GitHub Open Source', url: 'https://github.com', category: 'tools', description: 'Global software repository and developer hub', color: '#6e40c9', badge: 'Code' },
  { id: 'bm-desmos', title: 'Desmos Graphing Calculator', url: 'https://www.desmos.com/calculator', category: 'tools', description: 'Interactive graphing & STEM math suite', color: '#2563eb', badge: 'Math' },
  { id: 'bm-photopea', title: 'Photopea Web Photoshop', url: 'https://www.photopea.com', category: 'tools', description: 'Full advanced online photo editor with PSD support', color: '#14b8a6', badge: 'Design' },
  { id: 'bm-excali', title: 'Excalidraw Whiteboard', url: 'https://excalidraw.com', category: 'tools', description: 'Virtual collaborative hand-drawn sketch canvas', color: '#f59e0b', badge: 'Draw' },
  { id: 'bm-chef', title: 'CyberChef Swiss Army Knife', url: 'https://gchq.github.io/CyberChef/', category: 'tools', description: 'Encryption, encoding, regex, and data converter', color: '#ef4444', badge: 'Crypto' },

  // Social & Communities
  { id: 'bm-reddit', title: 'Reddit Frontpage', url: 'https://www.reddit.com', category: 'social', description: 'Community discussions and trending subreddits', color: '#ff4500', badge: 'Forum' },
  { id: 'bm-discord', title: 'Discord Web App', url: 'https://discord.com/app', category: 'social', description: 'Talk, chat, and hang out with communities', color: '#5865f2', badge: 'Chat' },
  { id: 'bm-bluesky', title: 'Bluesky Social', url: 'https://bsky.app', category: 'social', description: 'Open, decentralized social timeline', color: '#0284c7', badge: 'Feed' },
];
