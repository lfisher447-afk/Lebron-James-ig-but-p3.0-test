import React, { useState, useEffect } from 'react';
import {
  Globe,
  RotateCw,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Music2,
  Youtube,
  Search,
  Plus,
  X,
  Layers,
  Server,
  Zap,
  Lock,
  Eye,
  Radio,
  Cpu,
  Fingerprint,
} from 'lucide-react';
import { launchAboutBlankCloak, launchBlobCloak } from '../lib/security';
import { PROXY_ENGINES, registerServiceWorkerProxy, initWSMWorker } from '../lib/wsm-proxy';

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  engine: 'vercel-edge' | 'webroot' | 'insidious' | 'mrbean' | 'wsm-sw';
}

export const WebProxyBrowser: React.FC = () => {
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab-1',
      title: 'Spotify Web Player',
      url: 'https://open.spotify.com',
      engine: 'vercel-edge',
    },
    {
      id: 'tab-2',
      title: 'YouTube Music Web',
      url: 'https://music.youtube.com',
      engine: 'insidious',
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [inputUrl, setInputUrl] = useState('https://open.spotify.com');
  const [isLoading, setIsLoading] = useState(false);
  const [proxyEngine, setProxyEngine] = useState<'vercel-edge' | 'webroot' | 'insidious' | 'mrbean' | 'wsm-sw'>('vercel-edge');
  const [isSwActive, setIsSwActive] = useState(false);
  const [showSpoofBanner, setShowSpoofBanner] = useState(true);
  const [nodeLatency, setNodeLatency] = useState<Record<string, number>>({
    'vercel-edge': 8,
    webroot: 12,
    insidious: 20,
    mrbean: 28,
  });

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    if (activeTab) {
      setInputUrl(activeTab.url);
      setProxyEngine(activeTab.engine);
    }
  }, [activeTabId]);

  useEffect(() => {
    // Register Service Worker & WSM Worker
    registerServiceWorkerProxy().then((ok) => setIsSwActive(ok));
    initWSMWorker();

    // Fetch live node latencies
    fetch('/api/nodes/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes) {
          const mapped: Record<string, number> = {};
          data.nodes.forEach((n: any) => {
            mapped[n.engine || n.id] = n.latency;
          });
          setNodeLatency((prev) => ({ ...prev, ...mapped }));
        }
      })
      .catch(() => {});
  }, []);

  const presets = [
    { name: 'Spotify Web', url: 'https://open.spotify.com', icon: Music2, color: '#1DB954' },
    { name: 'YouTube Music', url: 'https://music.youtube.com', icon: Youtube, color: '#FF0000' },
    { name: 'SoundCloud', url: 'https://soundcloud.com', icon: Globe, color: '#FF5500' },
    { name: 'Genius Lyrics', url: 'https://genius.com', icon: Search, color: '#FFFF64' },
    { name: 'Discord Web', url: 'https://discord.com/app', icon: Layers, color: '#5865F2' },
    { name: 'Reddit', url: 'https://reddit.com', icon: Radio, color: '#FF4500' },
  ];

  const handleNavigate = (url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
        finalUrl = 'https://' + finalUrl;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
      }
    }

    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              url: finalUrl,
              title: finalUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || 'Web Tab',
            }
          : t
      )
    );
    setInputUrl(finalUrl);
    setIsLoading(true);
  };

  const handleCreateNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: BrowserTab = {
      id: newId,
      title: 'New Stealth Tab',
      url: 'https://music.youtube.com',
      engine: proxyEngine,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[0].id);
    }
  };

  const getProxyEndpoint = (engine: string) => {
    switch (engine) {
      case 'vercel-edge':
        return '/api/proxy';
      case 'insidious':
        return '/api/backup1/proxy';
      case 'mrbean':
        return '/api/mrbean/proxy';
      case 'wsm-sw':
        return '/api/proxy';
      default:
        return '/api/proxy';
    }
  };

  const currentProxySrc = `${getProxyEndpoint(activeTab.engine)}?url=${encodeURIComponent(activeTab.url)}`;
  const currentEngineProfile = PROXY_ENGINES.find((p) => p.id === activeTab.engine) || PROXY_ENGINES[0];

  return (
    <div className="flex flex-col h-full bg-[#050c0e] rounded-3xl border border-[#1a3840] overflow-hidden shadow-2xl">
      {/* Top Browser Tab Bar */}
      <div className="bg-[#040a0c] px-3 pt-2.5 flex items-center gap-1.5 border-b border-[#142a30] overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-semibold max-w-[200px] cursor-pointer transition-all border-t border-x ${
                isActive
                  ? 'bg-[#09171b] text-white border-[#1f424b] shadow-md'
                  : 'bg-[#061114] text-[#6b8e96] hover:bg-[#08181c] hover:text-white border-transparent'
              }`}
            >
              <Globe size={13} className={isActive ? 'text-[#48e4ff]' : 'text-[#4d6d74]'} />
              <span className="truncate flex-1">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="p-0.5 rounded-md text-[#597b83] hover:text-[#ef4444] hover:bg-black/30 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={handleCreateNewTab}
          className="p-1.5 rounded-lg bg-[#08181c] text-[#789d9a] hover:text-white hover:bg-[#102d35] transition-colors mb-1 ml-1"
          title="Open New Tab"
        >
          <Plus size={14} />
        </button>

        {/* Engine & User-Agent Switcher */}
        <div className="ml-auto mb-1 flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#527e88] uppercase hidden md:inline">
            Proxy Routing:
          </span>
          <select
            value={activeTab.engine}
            onChange={(e) => {
              const newEng = e.target.value as any;
              setProxyEngine(newEng);
              setTabs((prev) =>
                prev.map((t) => (t.id === activeTabId ? { ...t, engine: newEng } : t))
              );
            }}
            className="bg-[#091a1e] border border-[#1a3840] text-[#48e4ff] text-[11px] font-mono rounded-lg px-2 py-1 outline-none cursor-pointer"
          >
            <option value="vercel-edge">Vercel Edge Gateway ({nodeLatency['vercel-edge'] || 8}ms)</option>
            <option value="webroot">Signal Webroot ({nodeLatency.webroot || 12}ms)</option>
            <option value="insidious">Insidious Fast-Node ({nodeLatency.insidious || 20}ms)</option>
            <option value="mrbean">MrBean Stealth Tunnel ({nodeLatency.mrbean || 28}ms)</option>
          </select>
        </div>
      </div>

      {/* Omnibox URL Navigation Bar */}
      <div className="bg-[#09171b] px-5 py-3 border-b border-[#1a3840] flex items-center justify-between gap-4">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const iframe = document.getElementById('proxy-frame') as HTMLIFrameElement;
              iframe?.contentWindow?.history.back();
            }}
            className="p-1.5 rounded-lg bg-[#0e242a] text-[#789d9a] hover:text-white hover:bg-[#143e47] transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={() => {
              const iframe = document.getElementById('proxy-frame') as HTMLIFrameElement;
              iframe?.contentWindow?.history.forward();
            }}
            className="p-1.5 rounded-lg bg-[#0e242a] text-[#789d9a] hover:text-white hover:bg-[#143e47] transition-colors"
          >
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => {
              setIsLoading(true);
              const iframe = document.getElementById('proxy-frame') as HTMLIFrameElement;
              if (iframe) iframe.src = currentProxySrc;
            }}
            className="p-1.5 rounded-lg bg-[#0e242a] text-[#789d9a] hover:text-white hover:bg-[#143e47] transition-colors"
          >
            <RotateCw size={16} className={isLoading ? 'animate-spin text-[#48e4ff]' : ''} />
          </button>
        </div>

        {/* Omnibox / URL Bar */}
        <div className="flex-1 flex items-center gap-2 bg-[#050f12] border border-[#1f424b] rounded-xl px-3 py-1.5 text-sm">
          <ShieldCheck size={16} className="text-[#34d399] shrink-0" />
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNavigate(inputUrl)}
            placeholder="Search or enter URL (e.g. spotify.com, music.youtube.com, discord.com)..."
            className="w-full bg-transparent text-white outline-none text-xs font-mono"
          />
          <button
            onClick={() => handleNavigate(inputUrl)}
            className="px-2.5 py-1 bg-[#143e47] hover:bg-[#1c5460] text-[#48e4ff] rounded-lg text-xs font-bold transition-colors"
          >
            Go
          </button>
        </div>

        {/* Multi-Window URL Spawn Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => launchAboutBlankCloak(currentProxySrc)}
            className="px-2 py-1.5 rounded-lg bg-[#0e242a] text-[#48e4ff] hover:bg-[#143e47] transition-colors text-[11px] font-mono flex items-center gap-1 border border-[#1d3c45]"
            title="Open in about:blank stealth window"
          >
            <Eye size={13} />
            <span className="hidden sm:inline">about:blank</span>
          </button>

          <button
            onClick={() => launchBlobCloak(currentProxySrc)}
            className="px-2 py-1.5 rounded-lg bg-[#0e242a] text-[#34d399] hover:bg-[#0e2d26] transition-colors text-[11px] font-mono flex items-center gap-1 border border-[#1d3c45]"
            title="Open in blob: sandboxed frame"
          >
            <Lock size={13} />
            <span className="hidden sm:inline">blob:</span>
          </button>

          <button
            onClick={() => window.open(activeTab.url, '_blank')}
            className="p-2 rounded-lg bg-[#0e242a] text-[#789d9a] hover:text-white transition-colors"
            title="Open in new external tab"
          >
            <ExternalLink size={15} />
          </button>
        </div>
      </div>

      {/* Preset Quick Access Portals */}
      <div className="bg-[#071316] px-5 py-2 border-b border-[#152e34] flex items-center gap-3 overflow-x-auto">
        <span className="text-[10px] font-mono text-[#5c828a] uppercase tracking-wider shrink-0">
          Fast Portals:
        </span>
        {presets.map((p) => {
          const isCurrent = activeTab.url.includes(p.url.replace('https://', ''));
          return (
            <button
              key={p.name}
              onClick={() => handleNavigate(p.url)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                isCurrent
                  ? 'bg-[#143e47] text-white border border-[#48e4ff]/40 shadow-sm'
                  : 'bg-[#091a1e] text-[#8aaeb5] hover:bg-[#102b32] hover:text-white border border-[#1a3840]'
              }`}
            >
              <p.icon size={13} style={{ color: p.color }} />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Spoofing & WSM Telemetry Bar */}
      {showSpoofBanner && (
        <div className="bg-[#03090b] px-5 py-1.5 border-b border-[#102428] flex items-center justify-between text-[10px] font-mono text-[#52828b]">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-[#34d399]">
              <Fingerprint size={12} />
              <span>{currentEngineProfile.tlsFingerprint}</span>
            </div>
            <div className="flex items-center gap-1 text-[#48e4ff]">
              <Cpu size={12} />
              <span>WSM Worker: ACTIVE</span>
            </div>
            <div className="hidden md:flex items-center gap-1 text-[#8aaeb5]">
              <ShieldCheck size={12} className="text-[#34d399]" />
              <span>CSP Stripped • Framebuster Bypassed • Sec-CH-UA Spoofed</span>
            </div>
          </div>
          <button
            onClick={() => setShowSpoofBanner(false)}
            className="text-[#406269] hover:text-[#7baab4] ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Embedded Iframe via Selected Proxy Gateway */}
      <div className="flex-1 relative bg-[#071013]">
        <iframe
          id="proxy-frame"
          key={`${activeTab.id}_${activeTab.engine}_${activeTab.url}`}
          src={currentProxySrc}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-none bg-transparent"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
          title="Unblocked Multi-Proxy Gateway"
        />
      </div>
    </div>
  );
};
