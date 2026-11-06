/**
 * Proxy Node Utilities
 */

export interface ProxyNode {
  id: string;
  name: string;
  url: string;
  protocol: 'invidious' | 'piped' | 'cobalt' | 'wisp' | 'cors' | 'native';
  region: string;
  secure: boolean;
  latencyMs?: number;
  status?: 'online' | 'degraded' | 'offline' | 'checking';
}

export function getLatencyBadge(latencyMs?: number): { color: string; label: string } {
  if (latencyMs === undefined || latencyMs < 0) return { color: 'text-zinc-500 bg-zinc-900 border-zinc-700', label: 'Offline' };
  if (latencyMs < 120) return { color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40', label: `${latencyMs}ms (Fast)` };
  if (latencyMs < 350) return { color: 'text-amber-400 bg-amber-950/40 border-amber-500/40', label: `${latencyMs}ms (Good)` };
  return { color: 'text-rose-400 bg-rose-950/40 border-rose-500/40', label: `${latencyMs}ms (Slow)` };
}
