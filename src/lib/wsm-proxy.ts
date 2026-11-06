// WSM (Worker Stream Module) & Multi-Engine Spoofing Proxy System with Real .wsm Binary Integration
import { loadWsmModule, WsmModuleInstance } from './wsm-loader';

export interface ProxyEngineProfile {
  id: string;
  name: string;
  endpoint: string;
  engine: 'vercel-edge' | 'webroot' | 'insidious' | 'mrbean' | 'wsm-sw';
  description: string;
  status: 'online' | 'degraded' | 'offline';
  latency: number;
  tlsFingerprint: string;
  wsmModule?: string;
}

export const PROXY_ENGINES: ProxyEngineProfile[] = [
  {
    id: 'vercel-edge',
    name: 'Vercel Edge Global Mesh',
    endpoint: '/api/proxy',
    engine: 'vercel-edge',
    description: 'Vercel Serverless Edge runtime with dynamic header mutator and CORS de-restriction',
    status: 'online',
    latency: 8,
    tlsFingerprint: 'JA3: 771,4865-4866-4867 (Chrome 122 Windows)',
    wsmModule: '/proxy-engine.wsm',
  },
  {
    id: 'webroot',
    name: 'Signal Webroot Gateway',
    endpoint: '/api/proxy',
    engine: 'webroot',
    description: 'Primary Express Webroot proxy with CSP stripping & framebuster injection',
    status: 'online',
    latency: 12,
    tlsFingerprint: 'JA3: 771,4865-4866-4867-4868 (Chrome 122 Linux)',
    wsmModule: '/tunnel-core.wsm',
  },
  {
    id: 'insidious',
    name: 'Insidious Fast-Node Alpha',
    endpoint: '/api/backup1/proxy',
    engine: 'insidious',
    description: 'High-throughput streaming router with Innertube deobfuscation and audio caching',
    status: 'online',
    latency: 22,
    tlsFingerprint: 'JA3: 771,49195-49199 (Chrome 121 macOS)',
    wsmModule: '/proxy-engine.wsm',
  },
  {
    id: 'mrbean',
    name: 'MrBean Stealth Tunnel Beta',
    endpoint: '/api/mrbean/proxy',
    engine: 'mrbean',
    description: 'Encrypted tunnel proxy with synthetic IP spoofing & custom stealth headers',
    status: 'online',
    latency: 29,
    tlsFingerprint: 'JA3: 771,4865-4866 (Firefox 123 Win64)',
    wsmModule: '/stealth-crypto.wsm',
  },
];

let isSwRegistered = false;
let wsmWorkerInstance: Worker | null = null;
const loadedModules = new Map<string, WsmModuleInstance>();

export async function initWsmBinaries() {
  try {
    const [pEngine, tCore, sCrypto] = await Promise.all([
      loadWsmModule('/proxy-engine.wsm', 'wsm_proxy_engine_core'),
      loadWsmModule('/tunnel-core.wsm', 'wsm_tunnel_protocol_v2'),
      loadWsmModule('/stealth-crypto.wsm', 'wsm_stealth_crypto_tls'),
    ]);
    loadedModules.set('proxy-engine', pEngine);
    loadedModules.set('tunnel-core', tCore);
    loadedModules.set('stealth-crypto', sCrypto);
    console.log('[WSM Binary System] All 3 real .wsm stream modules initialized into WASM memory space.');
  } catch (e) {
    console.warn('[WSM Binary System] Init notice:', e);
  }
}

export async function registerServiceWorkerProxy(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw-proxy.js', { scope: '/' });
      isSwRegistered = true;
      console.log('[WSM SW Proxy] Service Worker registered with scope:', reg.scope);
      return true;
    } catch (err) {
      console.warn('[WSM SW Proxy] Service Worker registration notice:', err);
      return false;
    }
  }
  return false;
}

export function initWSMWorker() {
  if (wsmWorkerInstance) return wsmWorkerInstance;

  try {
    wsmWorkerInstance = new Worker('/wsm-worker.js');
    wsmWorkerInstance.onmessage = (e) => {
      if (e.data.type === 'WSM_READY') {
        console.log('[WSM Worker Engine] Dedicated stream spoofer online:', e.data.session);
      }
    };
    wsmWorkerInstance.postMessage({ action: 'INIT_WSM' });
  } catch (e) {
    console.warn('[WSM Worker Engine] Fallback to main thread:', e);
  }

  // Preload binaries
  initWsmBinaries();

  return wsmWorkerInstance;
}

export function getProxyUrl(targetUrl: string, engineId = 'vercel-edge'): string {
  let cleanUrl = targetUrl.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }

  const selectedEngine = PROXY_ENGINES.find((p) => p.id === engineId) || PROXY_ENGINES[0];
  return `${selectedEngine.endpoint}?url=${encodeURIComponent(cleanUrl)}`;
}

export async function sendVercelTunnelRequest(type: string, payload: any = {}): Promise<any> {
  const res = await fetch('/api/ws-tunnel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, ...payload }),
  });
  return res.json();
}
