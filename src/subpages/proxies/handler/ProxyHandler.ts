/**
 * Proxy Matrix Handler - Benchmarking, Latency Probing & Failover
 */
import { ProxyNode } from '../util/proxyUtils';

class ProxyHandler {
  private defaultNodes: ProxyNode[] = [
    { id: 'inv-1', name: 'Invidious NerdVPN', url: 'https://invidious.nerdvpn.de', protocol: 'invidious', region: 'Germany', secure: true },
    { id: 'inv-2', name: 'Invidious Nadeko', url: 'https://inv.nadeko.net', protocol: 'invidious', region: 'US East', secure: true },
    { id: 'inv-3', name: 'Invidious PrivateCoffee', url: 'https://invidious.private.coffee', protocol: 'invidious', region: 'Austria', secure: true },
    { id: 'piped-1', name: 'Piped Kavin Edge', url: 'https://pipedapi.kavin.rocks', protocol: 'piped', region: 'US West', secure: true },
    { id: 'piped-2', name: 'Piped AdminForge', url: 'https://pipedapi.adminforge.de', protocol: 'piped', region: 'Germany', secure: true },
    { id: 'cobalt-1', name: 'Cobalt Multi-Streamer', url: 'https://api.cobalt.tools', protocol: 'cobalt', region: 'Global', secure: true },
    { id: 'wisp-1', name: 'WISP WebSocket Tunnel', url: 'wss://wisp.mercurywork.shop', protocol: 'wisp', region: 'Cloudflare', secure: true },
    { id: 'wisp-2', name: 'Anura Stealth Proxy', url: 'wss://anura.pro', protocol: 'wisp', region: 'EU Central', secure: true },
    { id: 'direct-1', name: 'Native Innertube Opus Pipeline', url: 'http://localhost:3000/api/health', protocol: 'native', region: 'Localhost', secure: true },
  ];

  async getNodes(): Promise<ProxyNode[]> {
    try {
      const res = await fetch('/api/invidious/instances');
      if (res.ok) {
        const data = await res.json();
        if (data.instances && data.instances.length > 0) {
          return data.instances;
        }
      }
    } catch {}
    return this.defaultNodes;
  }

  async pingNode(node: ProxyNode): Promise<{ latencyMs: number; status: 'online' | 'degraded' | 'offline' }> {
    try {
      const pingUrl = `/api/proxy/ping?url=${encodeURIComponent(node.url)}`;
      const res = await fetch(pingUrl);
      if (res.ok) {
        const data = await res.json();
        return {
          latencyMs: data.pingMs,
          status: data.status || 'online',
        };
      }
    } catch {}

    return { latencyMs: -1, status: 'offline' };
  }

  async benchmarkAll(
    nodes: ProxyNode[],
    onProgress?: (updatedNode: ProxyNode) => void
  ): Promise<ProxyNode[]> {
    const benchmarked: ProxyNode[] = [];
    for (const node of nodes) {
      if (onProgress) onProgress({ ...node, status: 'checking' });
      const { latencyMs, status } = await this.pingNode(node);
      const updated: ProxyNode = { ...node, latencyMs, status };
      benchmarked.push(updated);
      if (onProgress) onProgress(updated);
    }
    return benchmarked.sort((a, b) => {
      if ((a.latencyMs || 9999) < 0) return 1;
      if ((b.latencyMs || 9999) < 0) return -1;
      return (a.latencyMs || 9999) - (b.latencyMs || 9999);
    });
  }
}

export const proxyHandler = new ProxyHandler();
