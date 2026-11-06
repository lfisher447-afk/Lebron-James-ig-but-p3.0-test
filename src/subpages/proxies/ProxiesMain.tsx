import React, { useState, useEffect } from 'react';
import {
  Server,
  Zap,
  RefreshCw,
  ShieldCheck,
  Globe,
  Radio,
  Plus,
  Check,
  Cpu,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { proxyHandler } from './handler/ProxyHandler';
import { ProxyNode, getLatencyBadge } from './util/proxyUtils';

interface ProxiesMainProps {
  activeServerId?: string;
  onSelectServer?: (id: string) => void;
}

export const ProxiesMain: React.FC<ProxiesMainProps> = ({
  activeServerId = 'direct-1',
  onSelectServer,
}) => {
  const [nodes, setNodes] = useState<ProxyNode[]>([]);
  const [selectedId, setSelectedId] = useState(activeServerId);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Custom node input
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customProtocol, setCustomProtocol] = useState<'invidious' | 'piped' | 'cobalt' | 'wisp'>('invidious');

  useEffect(() => {
    proxyHandler.getNodes().then(setNodes);
  }, []);

  const handleBenchmark = async () => {
    setIsBenchmarking(true);
    try {
      const results = await proxyHandler.benchmarkAll(nodes, (updated) => {
        setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      });
      setNodes(results);
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleAddCustomNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customUrl.trim()) return;

    const newNode: ProxyNode = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      url: customUrl.trim(),
      protocol: customProtocol,
      region: 'Custom Node',
      secure: customUrl.startsWith('https://') || customUrl.startsWith('wss://'),
      latencyMs: 0,
      status: 'online',
    };

    setNodes((prev) => [newNode, ...prev]);
    setCustomName('');
    setCustomUrl('');
    setShowAddCustom(false);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (onSelectServer) onSelectServer(id);
  };

  return (
    <div className="space-y-8 select-none pb-24 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#163842] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#48e4ff]/20 border border-[#48e4ff]/40 text-[#48e4ff]">
              <Server size={18} />
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#48e4ff] font-bold">
              Multi-Protocol Node Matrix
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Proxy & Latency Benchmark Deck
          </h1>
          <p className="text-xs text-[#789d9a] mt-1 max-w-xl">
            Live latency telemetry, automatic multi-instance failover, and hardware routing across Invidious, Piped, Cobalt, and WISP WebSocket tunnels.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddCustom(!showAddCustom)}
            className="px-4 py-2.5 bg-[#091b20] hover:bg-[#122e36] text-zinc-300 hover:text-white border border-[#163942] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Add Custom Node</span>
          </button>
          <button
            onClick={handleBenchmark}
            disabled={isBenchmarking}
            className="px-5 py-2.5 bg-[#48e4ff] hover:bg-[#38bdf8] text-black font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-cyan-900/30 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isBenchmarking ? 'animate-spin' : ''} />
            <span>{isBenchmarking ? 'Probing Latencies...' : 'Run Benchmark'}</span>
          </button>
        </div>
      </div>

      {/* Add Custom Node Panel */}
      {showAddCustom && (
        <form
          onSubmit={handleAddCustomNode}
          className="p-5 rounded-2xl bg-[#091b20] border border-[#1a3f4a] shadow-xl space-y-4"
        >
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <Radio size={14} className="text-[#48e4ff]" /> Register Custom Proxy Node
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Node Name (e.g. My Private Invidious)"
              className="bg-[#061215] border border-[#183a44] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#48e4ff]"
            />
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Instance URL (e.g. https://...)"
              className="bg-[#061215] border border-[#183a44] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#48e4ff]"
            />
            <select
              value={customProtocol}
              onChange={(e) => setCustomProtocol(e.target.value as any)}
              className="bg-[#061215] border border-[#183a44] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#48e4ff]"
            >
              <option value="invidious">Invidious API</option>
              <option value="piped">Piped API</option>
              <option value="cobalt">Cobalt Tools</option>
              <option value="wisp">WISP WebSocket Tunnel</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddCustom(false)}
              className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#48e4ff] text-black font-bold text-xs rounded-xl"
            >
              Save Node
            </button>
          </div>
        </form>
      )}

      {/* Nodes Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nodes.map((node) => {
          const isSelected = selectedId === node.id;
          const latencyBadge = getLatencyBadge(node.latencyMs);

          return (
            <div
              key={node.id}
              onClick={() => handleSelect(node.id)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between shadow-xl relative overflow-hidden group ${
                isSelected
                  ? 'bg-gradient-to-br from-[#0c2830] to-[#061417] border-[#48e4ff] shadow-[0_0_24px_rgba(72,228,255,0.2)]'
                  : 'bg-[#07171a] border-[#15343c] hover:border-[#204c57] hover:bg-[#0b2127]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border font-bold ${
                      node.protocol === 'invidious'
                        ? 'bg-purple-950/40 text-purple-400 border-purple-500/40'
                        : node.protocol === 'piped'
                        ? 'bg-amber-950/40 text-amber-400 border-amber-500/40'
                        : node.protocol === 'cobalt'
                        ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/40'
                        : node.protocol === 'wisp'
                        ? 'bg-blue-950/40 text-blue-400 border-blue-500/40'
                        : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                    }`}
                  >
                    {node.protocol}
                  </span>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${latencyBadge.color}`}
                  >
                    {node.status === 'checking' ? 'Probing...' : latencyBadge.label}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-white truncate">{node.name}</h3>
                <div className="text-[11px] font-mono text-zinc-500 truncate mt-1">{node.url}</div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#122c33] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#789d9a] flex items-center gap-1">
                  <Globe size={12} /> {node.region}
                </span>

                <div className="flex items-center gap-1.5">
                  {isSelected ? (
                    <span className="text-[11px] font-mono text-[#48e4ff] font-bold flex items-center gap-1">
                      <Check size={14} /> Active Node
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-zinc-400 group-hover:text-white">
                      Select →
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
