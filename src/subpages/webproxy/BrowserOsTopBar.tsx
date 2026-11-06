import React, { useState, useEffect } from 'react';
import {
  Globe,
  Zap,
  Clock,
  Maximize2,
  Minimize2,
  Flame,
  Shield,
  Radio,
  Cpu,
  HardDrive,
  Sliders,
  CheckCircle2,
  ChevronDown,
  Terminal,
  FileText,
  Gamepad2,
  Search,
  ExternalLink,
} from 'lucide-react';
import { OsAppType, ProxyNodeInfo } from './BrowserOsTypes';
import { PROXY_NODES } from './BrowserOsPresets';

interface BrowserOsTopBarProps {
  activeApp: OsAppType;
  setActiveApp: (app: OsAppType) => void;
  currentEngine: string;
  onChangeEngine: (engine: any) => void;
  onPanicCloak: (preset: 'classroom' | 'drive' | 'canvas' | 'calculator' | 'blank') => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  tabCount: number;
}

export const BrowserOsTopBar: React.FC<BrowserOsTopBarProps> = ({
  activeApp,
  setActiveApp,
  currentEngine,
  onChangeEngine,
  onPanicCloak,
  isFullscreen,
  onToggleFullscreen,
  tabCount,
}) => {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [showPanicMenu, setShowPanicMenu] = useState(false);
  const [nodePings, setNodePings] = useState<Record<string, number>>({});
  const [isTestingNodes, setIsTestingNodes] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ hits: number; misses: number; totalBytesSavedMb: string } | null>(null);

  const fetchCacheStats = async () => {
    try {
      const res = await fetch('/api/browser/cache/stats');
      const data = await res.json();
      setCacheStats(data);
    } catch {}
  };

  useEffect(() => {
    fetchCacheStats();
    const interval = setInterval(fetchCacheStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTestAllNodes = async () => {
    setIsTestingNodes(true);
    const newPings: Record<string, number> = {};
    for (const node of PROXY_NODES) {
      const start = performance.now();
      try {
        await fetch(`/api/browser/ping?host=${encodeURIComponent('https://cloudflare.com')}&engine=${node.id}`);
        const rtt = Math.round(performance.now() - start);
        newPings[node.id] = Math.max(4, Math.min(120, rtt));
      } catch {
        newPings[node.id] = node.latency;
      }
    }
    setNodePings(newPings);
    setIsTestingNodes(false);
  };

  const handleFlushCache = async () => {
    try {
      await fetch('/api/browser/cache/clear', { method: 'POST' });
      fetchCacheStats();
    } catch {}
  };

  const activeNode = PROXY_NODES.find((n) => n.id === currentEngine) || PROXY_NODES[0];
  const activeLatencyDisplay = nodePings[currentEngine] || activeNode.latency;

  return (
    <div className="h-10 bg-[#03090b] border-b border-[#122e36] px-3.5 flex items-center justify-between text-xs select-none relative z-30 shadow-md">
      {/* Left: Brand & Active App Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-mono font-bold text-white tracking-wider">
          <div className="w-2.5 h-2.5 rounded-full bg-[#48e4ff] animate-pulse shadow-[0_0_8px_#48e4ff]" />
          <span className="text-[#48e4ff]">SPOTUI</span>
          <span className="bg-[#12313a] text-[10px] px-1.5 py-0.5 rounded text-[#8aaeb5] border border-[#1b4b57]">
            BrowserOS 4.2 Pro
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[#143942]" />

        {/* Quick App Badges */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveApp('browser')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
              activeApp === 'browser'
                ? 'bg-[#143e47] text-[#48e4ff] border border-[#48e4ff]/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#0c2328]'
            }`}
          >
            <Globe size={12} />
            <span>Browser</span>
            <span className="text-[9px] px-1 rounded bg-[#091a1e] font-mono text-[#48e4ff]">
              {tabCount}
            </span>
          </button>

          <button
            onClick={() => setActiveApp('terminal')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
              activeApp === 'terminal'
                ? 'bg-[#143e47] text-[#48e4ff] border border-[#48e4ff]/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#0c2328]'
            }`}
          >
            <Terminal size={12} />
            <span>Terminal</span>
          </button>

          <button
            onClick={() => setActiveApp('notes')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
              activeApp === 'notes'
                ? 'bg-[#143e47] text-[#48e4ff] border border-[#48e4ff]/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#0c2328]'
            }`}
          >
            <FileText size={12} />
            <span>Notes</span>
          </button>

          <button
            onClick={() => setActiveApp('bookmarks')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
              activeApp === 'bookmarks'
                ? 'bg-[#143e47] text-[#48e4ff] border border-[#48e4ff]/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#0c2328]'
            }`}
          >
            <Gamepad2 size={12} />
            <span>App Hub</span>
          </button>
        </div>
      </div>

      {/* Right: Panic Button, Node Status, System Clock & Fullscreen */}
      <div className="flex items-center gap-3">
        {/* Panic Button Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPanicMenu(!showPanicMenu)}
            className="px-2.5 py-1 rounded-lg bg-[#26090e] hover:bg-[#3d0f17] text-[#f43f5e] border border-[#591823] font-mono font-bold text-[11px] flex items-center gap-1.5 transition shadow-sm"
            title="Emergency Cloak Panic Button"
          >
            <Flame size={12} className="text-[#f43f5e] animate-bounce" />
            <span>PANIC CLOAK</span>
            <ChevronDown size={11} />
          </button>

          {showPanicMenu && (
            <div className="absolute right-0 top-9 w-52 bg-[#091518] border border-[#1b3d45] rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="text-[10px] uppercase font-mono text-[#789d9a] px-2 py-1 font-bold">
                Instant Tab Disguise
              </div>
              <button
                onClick={() => {
                  onPanicCloak('classroom');
                  setShowPanicMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#112d34] text-zinc-200 hover:text-white flex items-center gap-2"
              >
                <span>🎓</span> Google Classroom
              </button>
              <button
                onClick={() => {
                  onPanicCloak('drive');
                  setShowPanicMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#112d34] text-zinc-200 hover:text-white flex items-center gap-2"
              >
                <span>📁</span> Google Drive
              </button>
              <button
                onClick={() => {
                  onPanicCloak('canvas');
                  setShowPanicMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#112d34] text-zinc-200 hover:text-white flex items-center gap-2"
              >
                <span>⭕</span> Canvas LMS Portal
              </button>
              <button
                onClick={() => {
                  onPanicCloak('calculator');
                  setShowPanicMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#112d34] text-zinc-200 hover:text-white flex items-center gap-2"
              >
                <span>📐</span> Desmos Calculator
              </button>
              <button
                onClick={() => {
                  onPanicCloak('blank');
                  setShowPanicMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#112d34] text-zinc-200 hover:text-white flex items-center gap-2"
              >
                <span>📄</span> about:blank Stealth Window
              </button>
            </div>
          )}
        </div>

        {/* Node Latency Indicator & Engine Selector */}
        <div className="relative">
          <button
            onClick={() => setShowNodeMenu(!showNodeMenu)}
            className="px-2 py-1 rounded-lg bg-[#071a1f] hover:bg-[#0c2a32] border border-[#163a43] text-[11px] font-mono flex items-center gap-1.5 transition text-zinc-300"
            title="Stealth Tunnel Hub & Diagnostics"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>{activeNode.flag} {activeNode.name.split(' ')[0]}</span>
            <span className="text-[#48e4ff] font-bold">{activeLatencyDisplay}ms</span>
            <ChevronDown size={11} className="text-zinc-500" />
          </button>

          {showNodeMenu && (
            <div className="absolute right-0 top-9 w-80 bg-[#061418] border border-[#1b4b57] rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-[#123640] mb-2">
                <div>
                  <div className="text-[11px] uppercase font-mono text-[#48e4ff] font-bold flex items-center gap-1.5">
                    <Zap size={12} />
                    <span>Stealth Tunnel Hub</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">Undetectable 4.2 Engine</div>
                </div>

                <button
                  onClick={handleTestAllNodes}
                  disabled={isTestingNodes}
                  className="px-2 py-1 rounded-lg bg-[#143e47] hover:bg-[#1f5664] text-[#48e4ff] font-mono text-[10px] font-bold border border-[#48e4ff]/30 transition disabled:opacity-50"
                >
                  {isTestingNodes ? 'Testing...' : '⚡ Test All'}
                </button>
              </div>

              {/* Cache Stats Bar */}
              {cacheStats && (
                <div className="bg-[#030d10] border border-[#0f323a] rounded-xl p-2 mb-2 flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <HardDrive size={11} className="text-[#48e4ff]" />
                    <span>Turbo Cache:</span>
                    <span className="text-emerald-400 font-bold">{cacheStats.hits} Hits</span>
                    <span className="text-zinc-500">({cacheStats.totalBytesSavedMb} MB saved)</span>
                  </div>
                  <button
                    onClick={handleFlushCache}
                    className="text-zinc-500 hover:text-rose-400 transition"
                    title="Purge Turbo LRU Cache"
                  >
                    Flush
                  </button>
                </div>
              )}

              {/* Node List */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {PROXY_NODES.map((node) => {
                  const isSelected = node.id === currentEngine;
                  const currentPing = nodePings[node.id] || node.latency;
                  return (
                    <button
                      key={node.id}
                      onClick={() => {
                        onChangeEngine(node.id);
                        setShowNodeMenu(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs transition border flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-[#0e2f38] text-white border-[#48e4ff]/50 shadow-md'
                          : 'bg-[#040e11] text-zinc-300 border-[#0f2830] hover:bg-[#091e25] hover:border-[#17434f]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate font-semibold">
                          <span className="text-sm">{node.flag}</span>
                          <span className="truncate">{node.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                            {node.stealthGrade || 'A+'}
                          </span>
                          <span className="font-mono text-[11px] text-[#48e4ff] font-bold">
                            {currentPing}ms
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-zinc-400 truncate flex items-center justify-between">
                        <span>{node.location}</span>
                        <span className="font-mono text-zinc-500 text-[9px]">{node.dpiBypass}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#0d282f] transition"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>

        {/* Live Clock */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#061215] border border-[#11292f] text-[11px] font-mono text-zinc-300">
          <Clock size={11} className="text-[#48e4ff]" />
          <span>{time}</span>
        </div>
      </div>
    </div>
  );
};
