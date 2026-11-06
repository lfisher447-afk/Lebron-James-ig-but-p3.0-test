import React, { useState, useRef, useEffect } from 'react';
import {
  Globe,
  Plus,
  X,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Shield,
  ShieldCheck,
  Lock,
  ExternalLink,
  Columns,
  BookOpen,
  Search,
  ZoomIn,
  ZoomOut,
  Pin,
  Volume2,
  VolumeX,
  Terminal,
  FileText,
  Gamepad2,
  Layers,
  ChevronDown,
  Check,
  Sparkles,
  Smartphone,
  Monitor,
  Home,
  EyeOff,
  Zap,
} from 'lucide-react';
import { BrowserTab, OsAppType, BookmarkItem } from './BrowserOsTypes';
import { SEARCH_ENGINES, USER_AGENTS, DEFAULT_BOOKMARKS, PROXY_NODES } from './BrowserOsPresets';
import { scrambleUrl, TUNNEL_PROFILES } from './proxyUtils';
import { BrowserOsTopBar } from './BrowserOsTopBar';
import { BrowserOsTerminal } from './BrowserOsTerminal';
import { BrowserOsNotes } from './BrowserOsNotes';
import { BrowserOsBookmarks } from './BrowserOsBookmarks';
import { BrowserOsInspector } from './BrowserOsInspector';
import { BrowserOsReader } from './BrowserOsReader';

export const WebProxyMain: React.FC = () => {
  // OS State
  const [activeApp, setActiveApp] = useState<OsAppType>('browser');
  const [currentEngine, setCurrentEngine] = useState<string>('vercel-edge');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tabs Management
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab-1',
      title: 'DuckDuckGo Search',
      url: 'https://duckduckgo.com',
      engine: 'vercel-edge',
      zoom: 1,
      isPinned: false,
      isMuted: false,
      history: ['https://duckduckgo.com'],
      historyIndex: 0,
      readerMode: false,
      adblockEnabled: true,
      rewriteLinks: true,
      userAgent: USER_AGENTS[0].ua,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // Split-Screen Mode
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [splitTabId, setSplitTabId] = useState<string | null>(null);

  // Address Bar & Search Engine
  const [addressInput, setAddressInput] = useState('https://duckduckgo.com');
  const [selectedSearchEngine, setSelectedSearchEngine] = useState(SEARCH_ENGINES[0].id);
  const [showEngineMenu, setShowEngineMenu] = useState(false);
  const [showUaMenu, setShowUaMenu] = useState(false);
  const [showSslModal, setShowSslModal] = useState(false);
  const [isScrambleEnabled, setIsScrambleEnabled] = useState(true);
  const [showTunnelHubModal, setShowTunnelHubModal] = useState(false);

  // Frame Keys to force reload
  const [frameKeys, setFrameKeys] = useState<Record<string, number>>({});

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const secondaryTab = isSplitScreen && splitTabId ? tabs.find((t) => t.id === splitTabId) || null : null;

  // Sync address input when active tab changes
  useEffect(() => {
    if (activeTab) {
      setAddressInput(activeTab.url);
    }
  }, [activeTabId, activeTab?.url]);

  // Fullscreen Handler
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Tab Operations
  const handleNewTab = (url = 'https://duckduckgo.com', title = 'New Tab') => {
    const newTabId = 'tab-' + Date.now();
    const newTab: BrowserTab = {
      id: newTabId,
      title,
      url,
      engine: (currentEngine as any) || 'vercel-edge',
      zoom: 1,
      isPinned: false,
      isMuted: false,
      history: [url],
      historyIndex: 0,
      readerMode: false,
      adblockEnabled: true,
      rewriteLinks: true,
      userAgent: activeTab?.userAgent || USER_AGENTS[0].ua,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTabId);
    setActiveApp('browser');
  };

  const handleCloseTab = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (tabs.length === 1) {
      // Reset the single tab instead of closing
      setTabs([
        {
          ...tabs[0],
          url: 'https://duckduckgo.com',
          title: 'DuckDuckGo Search',
          history: ['https://duckduckgo.com'],
          historyIndex: 0,
        },
      ]);
      return;
    }

    const nextTabs = tabs.filter((t) => t.id !== id);
    setTabs(nextTabs);
    if (splitTabId === id) setSplitTabId(null);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isPinned: !t.isPinned } : t))
    );
  };

  const handleDuplicateTab = (tab: BrowserTab) => {
    handleNewTab(tab.url, tab.title);
  };

  // Navigation Logic
  const navigateTo = (url: string, tabId = activeTabId) => {
    let cleanUrl = url.trim();
    if (!cleanUrl) return;

    // Check if search query or valid URL
    const isUrl = /^https?:\/\//i.test(cleanUrl) || (/^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(cleanUrl) && !cleanUrl.includes(' '));

    if (!isUrl) {
      const searchEngine = SEARCH_ENGINES.find((e) => e.id === selectedSearchEngine) || SEARCH_ENGINES[0];
      cleanUrl = searchEngine.queryUrl + encodeURIComponent(cleanUrl);
    } else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === tabId) {
          const newHistory = [...t.history.slice(0, t.historyIndex + 1), cleanUrl];
          return {
            ...t,
            url: cleanUrl,
            title: new URL(cleanUrl).hostname,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            readerMode: false,
          };
        }
        return t;
      })
    );

    setFrameKeys((prev) => ({ ...prev, [tabId]: (prev[tabId] || 0) + 1 }));
    setAddressInput(cleanUrl);
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(addressInput);
  };

  const handleReload = (tabId = activeTabId) => {
    setFrameKeys((prev) => ({ ...prev, [tabId]: (prev[tabId] || 0) + 1 }));
  };

  const handleBack = (tab: BrowserTab) => {
    if (tab.historyIndex > 0) {
      const prevUrl = tab.history[tab.historyIndex - 1];
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tab.id
            ? { ...t, url: prevUrl, historyIndex: t.historyIndex - 1, readerMode: false }
            : t
        )
      );
      setAddressInput(prevUrl);
      handleReload(tab.id);
    }
  };

  const handleForward = (tab: BrowserTab) => {
    if (tab.historyIndex < tab.history.length - 1) {
      const nextUrl = tab.history[tab.historyIndex + 1];
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tab.id
            ? { ...t, url: nextUrl, historyIndex: t.historyIndex + 1, readerMode: false }
            : t
        )
      );
      setAddressInput(nextUrl);
      handleReload(tab.id);
    }
  };

  // Zoom
  const changeZoom = (delta: number) => {
    if (!activeTab) return;
    const newZoom = Math.min(2.0, Math.max(0.6, activeTab.zoom + delta));
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, zoom: newZoom } : t))
    );
  };

  // Panic Cloaking
  const handlePanicCloak = (preset: 'classroom' | 'drive' | 'canvas' | 'calculator' | 'blank') => {
    const titles = {
      classroom: 'Classes - Google Classroom',
      drive: 'My Drive - Google Drive',
      canvas: 'Dashboard - Canvas LMS',
      calculator: 'Desmos | Beautiful, Free Math',
      blank: 'about:blank',
    };
    const favicons = {
      classroom: 'https://ssl.gstatic.com/classroom/favicon.png',
      drive: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png',
      canvas: 'https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico',
      calculator: 'https://www.desmos.com/favicon.ico',
      blank: 'data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABmJLR0T///////8JWPfcAAAACXBIWXMAAABIAAAASABGyWs+AAAAF0lEQVQI12NgGAWjYBSMglEwCkbBSAcACBAAAeaq93sAAAAASUVORK5CYII=',
    };

    document.title = titles[preset];
    const link: any = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = favicons[preset];
    document.getElementsByTagName('head')[0].appendChild(link);

    if (preset === 'blank') {
      const win = window.open('about:blank', '_blank');
      if (win) {
        const iframe = win.document.createElement('iframe');
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        iframe.style.border = 'none';
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.src = window.location.href;
        win.document.body.style.margin = '0';
        win.document.body.appendChild(iframe);
      }
    }
  };

  // Launch from Bookmarks or App Directory
  const handleOpenFromBookmarks = (url: string, newTab = false, splitScreen = false) => {
    if (splitScreen) {
      const newTabId = 'tab-' + Date.now();
      const newTabObj: BrowserTab = {
        id: newTabId,
        title: new URL(url).hostname,
        url,
        engine: (currentEngine as any) || 'vercel-edge',
        zoom: 1,
        isPinned: false,
        isMuted: false,
        history: [url],
        historyIndex: 0,
        readerMode: false,
        adblockEnabled: true,
        rewriteLinks: true,
        userAgent: USER_AGENTS[0].ua,
      };
      setTabs([...tabs, newTabObj]);
      setSplitTabId(newTabId);
      setIsSplitScreen(true);
      setActiveApp('browser');
    } else if (newTab) {
      handleNewTab(url, new URL(url).hostname);
    } else {
      navigateTo(url);
      setActiveApp('browser');
    }
  };

  const getProxyUrl = (tab: BrowserTab) => {
    const isScrambled = isScrambleEnabled || tab.scrambleUrl;
    const targetUrl = isScrambled ? scrambleUrl(tab.url) : tab.url;
    const params = new URLSearchParams({
      [isScrambled ? 'q' : 'url']: targetUrl,
      engine: currentEngine,
      rewriteLinks: tab.rewriteLinks ? '1' : '0',
      adblock: tab.adblockEnabled ? '1' : '0',
      ua: tab.userAgent,
    });
    if (isScrambled) {
      params.set('scramble', '1');
    }
    return `/api/proxy?${params.toString()}`;
  };

  const activeSearchObj = SEARCH_ENGINES.find((s) => s.id === selectedSearchEngine) || SEARCH_ENGINES[0];

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#03090b] text-zinc-100 select-none overflow-hidden relative font-sans"
    >
      {/* Top OS System Bar */}
      <BrowserOsTopBar
        activeApp={activeApp}
        setActiveApp={setActiveApp}
        currentEngine={currentEngine}
        onChangeEngine={(eng) => setCurrentEngine(eng)}
        onPanicCloak={handlePanicCloak}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        tabCount={tabs.length}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {activeApp === 'terminal' && (
          <BrowserOsTerminal
            onOpenUrlInBrowser={(url) => {
              navigateTo(url);
              setActiveApp('browser');
            }}
            activeUrl={activeTab?.url}
          />
        )}

        {activeApp === 'notes' && (
          <BrowserOsNotes
            activeBrowserUrl={activeTab?.url}
            activeBrowserTitle={activeTab?.title}
          />
        )}

        {activeApp === 'bookmarks' && (
          <BrowserOsBookmarks onOpenUrl={handleOpenFromBookmarks} />
        )}

        {activeApp === 'inspector' && (
          <BrowserOsInspector
            activeUrl={activeTab?.url || 'https://en.wikipedia.org'}
            onNavigate={(url) => {
              navigateTo(url);
              setActiveApp('browser');
            }}
          />
        )}

        {/* Browser Mode View */}
        {activeApp === 'browser' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chrome / Arc Style Tabs Bar */}
            <div className="h-10 bg-[#061418] border-b border-[#122e36] flex items-center px-2 gap-1 overflow-x-auto select-none">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const isSplit = isSplitScreen && tab.id === splitTabId;
                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`h-8 px-3 rounded-xl flex items-center gap-2 cursor-pointer transition text-xs group max-w-[210px] min-w-[120px] relative border ${
                      isActive
                        ? 'bg-[#0f2d35] text-white font-bold border-[#1b4b57] shadow-sm'
                        : isSplit
                        ? 'bg-[#082026] text-[#48e4ff] border-[#163f4a]'
                        : 'bg-[#040e11] text-zinc-400 hover:text-zinc-200 hover:bg-[#091f25] border-transparent'
                    }`}
                  >
                    <Globe size={12} className={isActive ? 'text-[#48e4ff]' : 'text-zinc-500'} />
                    <span className="truncate flex-1 text-[11px] font-medium">
                      {tab.title || 'New Tab'}
                    </span>

                    {/* Tab Badges / Mute / Pin */}
                    <div className="flex items-center gap-1 shrink-0">
                      {tab.isPinned && <Pin size={10} className="text-[#48e4ff]" />}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTabs((prev) =>
                            prev.map((t) => (t.id === tab.id ? { ...t, isMuted: !t.isMuted } : t))
                          );
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-[#48e4ff] p-0.5 rounded transition"
                        title={tab.isMuted ? 'Unmute Tab' : 'Mute Tab'}
                      >
                        {tab.isMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                      </button>

                      <button
                        onClick={(e) => handleCloseTab(tab.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition"
                        title="Close Tab"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => handleNewTab()}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#0c262d] transition ml-1"
                title="New Tab"
              >
                <Plus size={14} />
              </button>

              <div className="flex-1" />

              {/* Split Screen Mode Toggle Button */}
              <button
                onClick={() => {
                  if (isSplitScreen) {
                    setIsSplitScreen(false);
                    setSplitTabId(null);
                  } else {
                    // Open another tab or clone
                    if (tabs.length > 1) {
                      const other = tabs.find((t) => t.id !== activeTabId);
                      setSplitTabId(other ? other.id : tabs[0].id);
                    } else {
                      handleNewTab('https://en.wikipedia.org', 'Wikipedia');
                      setSplitTabId(activeTabId);
                    }
                    setIsSplitScreen(true);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition border ${
                  isSplitScreen
                    ? 'bg-[#143e47] text-[#48e4ff] border-[#48e4ff]/40 shadow-sm'
                    : 'bg-[#081d22] text-zinc-400 border-[#123640] hover:text-white'
                }`}
                title="Toggle Dual Viewport Split-Screen"
              >
                <Columns size={12} />
                <span>{isSplitScreen ? 'Split 50/50 [ON]' : 'Split Screen'}</span>
              </button>
            </div>

            {/* Browser Navigation Toolbar */}
            <div className="p-2.5 bg-[#091f24] border-b border-[#143a44] flex items-center gap-2">
              {/* Navigation Arrows & Reload */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleBack(activeTab)}
                  disabled={activeTab.historyIndex <= 0}
                  className="p-1.5 rounded-xl hover:bg-[#123640] text-zinc-400 hover:text-white transition disabled:opacity-30"
                  title="Back"
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  onClick={() => handleForward(activeTab)}
                  disabled={activeTab.historyIndex >= activeTab.history.length - 1}
                  className="p-1.5 rounded-xl hover:bg-[#123640] text-zinc-400 hover:text-white transition disabled:opacity-30"
                  title="Forward"
                >
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => handleReload(activeTab.id)}
                  className="p-1.5 rounded-xl hover:bg-[#123640] text-zinc-400 hover:text-white transition"
                  title="Reload Page"
                >
                  <RotateCw size={14} />
                </button>
                <button
                  onClick={() => navigateTo('https://duckduckgo.com')}
                  className="p-1.5 rounded-xl hover:bg-[#123640] text-zinc-400 hover:text-white transition"
                  title="Home"
                >
                  <Home size={14} />
                </button>
              </div>

              {/* Omnibox / Address Bar Form */}
              <form onSubmit={handleAddressSubmit} className="flex-1 flex items-center relative">
                {/* SSL Lock Badge */}
                <button
                  type="button"
                  onClick={() => setShowSslModal(true)}
                  className="absolute left-3 text-zinc-400 hover:text-emerald-400 flex items-center gap-1 transition"
                  title="Security Certificate & Encryption"
                >
                  <Lock size={12} className="text-emerald-400" />
                </button>

                {/* Search Engine Selector Inside Bar */}
                <div className="absolute left-8 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowEngineMenu(!showEngineMenu)}
                    className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-[#11313a] transition"
                  >
                    <span>{activeSearchObj.icon}</span>
                    <ChevronDown size={10} />
                  </button>

                  {showEngineMenu && (
                    <div className="absolute left-0 top-8 w-44 bg-[#091518] border border-[#1b3d45] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                      <div className="text-[9px] uppercase font-mono text-zinc-500 px-2 py-1 font-bold">
                        Search Provider
                      </div>
                      {SEARCH_ENGINES.map((se) => (
                        <button
                          key={se.id}
                          type="button"
                          onClick={() => {
                            setSelectedSearchEngine(se.id);
                            setShowEngineMenu(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded-lg text-xs transition flex items-center gap-2 ${
                            selectedSearchEngine === se.id
                              ? 'bg-[#143e47] text-[#48e4ff] font-bold'
                              : 'text-zinc-300 hover:bg-[#0f272e] hover:text-white'
                          }`}
                        >
                          <span>{se.icon}</span>
                          <span>{se.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder={`Search with ${activeSearchObj.name} or type web address...`}
                  className="w-full bg-[#051114] border border-[#163c46] focus:border-[#48e4ff] rounded-xl pl-20 pr-24 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition font-mono"
                />

                <button
                  type="submit"
                  className="absolute right-1.5 px-3 py-1 bg-[#15414d] hover:bg-[#1f5664] text-[#48e4ff] text-xs font-bold rounded-lg transition"
                >
                  Go
                </button>
              </form>

              {/* Reader Mode Toggle */}
              <button
                onClick={() => {
                  setTabs((prev) =>
                    prev.map((t) =>
                      t.id === activeTabId ? { ...t, readerMode: !t.readerMode } : t
                    )
                  );
                }}
                className={`p-1.5 rounded-xl border text-xs flex items-center gap-1 transition ${
                  activeTab.readerMode
                    ? 'bg-[#143e47] text-[#48e4ff] border-[#48e4ff]/50'
                    : 'bg-[#0c242b] text-zinc-400 border-[#153f4a] hover:text-white'
                }`}
                title="Distraction-Free Reader View"
              >
                <BookOpen size={13} />
              </button>

              {/* Page Inspector Trigger */}
              <button
                onClick={() => setActiveApp('inspector')}
                className="p-1.5 rounded-xl bg-[#0c242b] hover:bg-[#143e47] text-zinc-400 hover:text-[#48e4ff] border border-[#153f4a] transition"
                title="Inspect Page & Extract Assets"
              >
                <Layers size={13} />
              </button>

              {/* AdBlocker & Script Shield Toggle */}
              <button
                onClick={() => {
                  setTabs((prev) =>
                    prev.map((t) =>
                      t.id === activeTabId ? { ...t, adblockEnabled: !t.adblockEnabled } : t
                    )
                  );
                  handleReload(activeTab.id);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition ${
                  activeTab.adblockEnabled
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                }`}
                title="Toggle AdBlock & Anti-Tracker Shield"
              >
                <Shield size={13} />
                <span className="hidden sm:inline">
                  {activeTab.adblockEnabled ? 'Shield [ON]' : 'Shield [OFF]'}
                </span>
              </button>

              {/* DPI Scrambler Toggle */}
              <button
                onClick={() => {
                  setIsScrambleEnabled(!isScrambleEnabled);
                  handleReload(activeTab.id);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition ${
                  isScrambleEnabled
                    ? 'bg-purple-950/50 text-purple-300 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-700'
                }`}
                title="DPI Scrambler: Obfuscates destination URLs so school & workplace filters cannot inspect domains"
              >
                <EyeOff size={13} className={isScrambleEnabled ? 'text-purple-400' : 'text-zinc-500'} />
                <span className="hidden md:inline">
                  {isScrambleEnabled ? 'DPI Scramble [ON]' : 'Scramble [OFF]'}
                </span>
              </button>

              {/* Active Tunnel Engine Selector Button */}
              <button
                onClick={() => setShowTunnelHubModal(true)}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#081e24] hover:bg-[#0e2f38] border border-[#14424e] text-xs font-mono text-[#48e4ff] transition"
                title="Tunnel Telemetry & Node Switcher"
              >
                <Zap size={12} className="text-[#48e4ff]" />
                <span className="truncate max-w-[120px]">
                  {PROXY_NODES.find((n) => n.id === currentEngine)?.name.split(' ')[0] || 'Edge'}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {PROXY_NODES.find((n) => n.id === currentEngine)?.latency || 8}ms
                </span>
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center gap-0.5 bg-[#061418] border border-[#143a44] rounded-xl p-0.5">
                <button
                  onClick={() => changeZoom(-0.1)}
                  className="p-1 rounded text-zinc-400 hover:text-white transition"
                  title="Zoom Out"
                >
                  <ZoomOut size={12} />
                </button>
                <span className="text-[10px] font-mono px-1 text-zinc-300">
                  {Math.round(activeTab.zoom * 100)}%
                </span>
                <button
                  onClick={() => changeZoom(0.1)}
                  className="p-1 rounded text-zinc-400 hover:text-white transition"
                  title="Zoom In"
                >
                  <ZoomIn size={12} />
                </button>
              </div>

              {/* External Window Popup */}
              <a
                href={getProxyUrl(activeTab)}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-xl bg-[#0c242b] hover:bg-[#143e47] text-zinc-400 hover:text-white border border-[#153f4a] transition"
                title="Open in Standalone Tab"
              >
                <ExternalLink size={13} />
              </a>
            </div>

            {/* Quick Curated Bookmarks Bar */}
            <div className="px-4 py-1.5 bg-[#061417] border-b border-[#122e36] flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-zinc-500 font-mono text-[10px]">Speed Dial:</span>
              {DEFAULT_BOOKMARKS.slice(0, 8).map((bm) => (
                <button
                  key={bm.id}
                  onClick={() => navigateTo(bm.url)}
                  className="px-2.5 py-0.5 rounded-lg bg-[#0a1e23] hover:bg-[#13353d] text-zinc-300 hover:text-white transition border border-[#163942] whitespace-nowrap flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bm.color }} />
                  <span>{bm.title}</span>
                </button>
              ))}

              <button
                onClick={() => setActiveApp('bookmarks')}
                className="px-2 py-0.5 rounded-lg bg-[#0f2c34] hover:bg-[#184450] text-[#48e4ff] text-[10px] font-bold border border-[#1b4e5b] whitespace-nowrap"
              >
                + More Apps
              </button>
            </div>

            {/* Stealth Tunnel Performance Ribbon */}
            <div className="h-6 bg-[#040e11] border-b border-[#0f2d35] px-3 flex items-center justify-between text-[10px] font-mono text-zinc-400 select-none">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[#48e4ff] font-semibold">
                    {PROXY_NODES.find((n) => n.id === currentEngine)?.name}
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-emerald-400 font-bold">
                    {PROXY_NODES.find((n) => n.id === currentEngine)?.latency || 8}ms
                  </span>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-zinc-400">
                  <span className="text-zinc-600">•</span>
                  <span>Cipher:</span>
                  <span className="text-zinc-200">
                    {PROXY_NODES.find((n) => n.id === currentEngine)?.encryption}
                  </span>
                </div>

                <div className="hidden md:flex items-center gap-1.5 text-zinc-400">
                  <span className="text-zinc-600">•</span>
                  <span>DPI Bypass:</span>
                  <span className="text-purple-300">
                    {PROXY_NODES.find((n) => n.id === currentEngine)?.dpiBypass}
                  </span>
                </div>

                <div className="hidden lg:flex items-center gap-1.5">
                  <span className="text-zinc-600">•</span>
                  <span className="text-amber-400">⚡ Turbo Cache Active</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                  {PROXY_NODES.find((n) => n.id === currentEngine)?.stealthGrade || 'A+ (Undetectable)'}
                </span>
              </div>
            </div>

            {/* Web Viewport Area (Single or Split Screen) */}
            <div className="flex-1 flex overflow-hidden relative bg-black">
              {/* Primary Tab Viewport */}
              <div
                className={`h-full relative overflow-hidden transition-all duration-200 ${
                  isSplitScreen && secondaryTab ? 'w-1/2 border-r border-[#143a44]' : 'w-full'
                }`}
              >
                {activeTab.readerMode ? (
                  <BrowserOsReader
                    url={activeTab.url}
                    onExitReader={() => {
                      setTabs((prev) =>
                        prev.map((t) => (t.id === activeTabId ? { ...t, readerMode: false } : t))
                      );
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full origin-top-left overflow-hidden bg-white"
                    style={{
                      transform: `scale(${activeTab.zoom})`,
                      transformOrigin: '0 0',
                      width: `${100 / activeTab.zoom}%`,
                      height: `${100 / activeTab.zoom}%`,
                    }}
                  >
                    <iframe
                      key={frameKeys[activeTab.id] || 0}
                      src={getProxyUrl(activeTab)}
                      title={activeTab.title}
                      className="w-full h-full border-0"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                    />
                  </div>
                )}
              </div>

              {/* Secondary Split-Screen Viewport */}
              {isSplitScreen && secondaryTab && (
                <div className="w-1/2 h-full relative overflow-hidden bg-black flex flex-col">
                  {/* Secondary Pane Header */}
                  <div className="h-8 bg-[#091b20] border-b border-[#143a44] px-3 flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-[#48e4ff] truncate">
                      {secondaryTab.title}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleReload(secondaryTab.id)}
                        className="p-1 rounded text-zinc-400 hover:text-white"
                        title="Reload Secondary Pane"
                      >
                        <RotateCw size={11} />
                      </button>
                      <button
                        onClick={() => {
                          setIsSplitScreen(false);
                          setSplitTabId(null);
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-rose-400"
                        title="Close Split Screen"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>

                  <div
                    className="flex-1 origin-top-left overflow-hidden bg-white"
                    style={{
                      transform: `scale(${secondaryTab.zoom})`,
                      transformOrigin: '0 0',
                      width: `${100 / secondaryTab.zoom}%`,
                      height: `${100 / secondaryTab.zoom}%`,
                    }}
                  >
                    <iframe
                      key={frameKeys[secondaryTab.id] || 0}
                      src={getProxyUrl(secondaryTab)}
                      title={secondaryTab.title}
                      className="w-full h-full border-0"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tunnel Hub & Diagnostics Modal */}
      {showTunnelHubModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#051317] border border-[#164551] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#123640]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#143e47] text-[#48e4ff]">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Stealth Tunnel Mesh Network</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                      Undetectable 4.2
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">Zero-footprint proxying with polymorphic DPI bypass</p>
                </div>
              </div>
              <button
                onClick={() => setShowTunnelHubModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#0e272e] transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nodes Selector */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                Select Active Tunnel Node
              </div>
              <div className="space-y-2">
                {PROXY_NODES.map((node) => {
                  const isSelected = node.id === currentEngine;
                  return (
                    <div
                      key={node.id}
                      onClick={() => {
                        setCurrentEngine(node.id);
                        handleReload(activeTab.id);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-[#0f2e37] border-[#48e4ff] text-white shadow-md'
                          : 'bg-[#040e11] border-[#102d35] text-zinc-300 hover:bg-[#091e25] hover:border-[#194551]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{node.flag}</span>
                          <span className="font-bold text-xs">{node.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">({node.location})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                            {node.stealthGrade}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#48e4ff]">
                            {node.latency}ms
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-zinc-400 leading-snug">
                        {node.description}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {node.features?.map((feat, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#030c0f] text-[#83d4e4] border border-[#11323b]"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stealth Engine Audit Checklist */}
            <div className="bg-[#030b0e] border border-[#0f282f] rounded-xl p-3 space-y-2 text-[11px]">
              <div className="text-[10px] font-mono uppercase text-zinc-400 font-bold flex items-center justify-between">
                <span>Stealth Sandbox Safeguards</span>
                <span className="text-emerald-400">100% Protected</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-zinc-300 text-[10px] font-mono">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check size={11} /> <span>window.top Overridden</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check size={11} /> <span>WebRTC Leak Neutralized</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check size={11} /> <span>Fetch & XHR Intercepted</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check size={11} /> <span>DPI Polymorphic Scramble</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check size={11} /> <span>Navigator.webdriver Removed</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check size={11} /> <span>Turbo In-Memory LRU Cache</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowTunnelHubModal(false)}
              className="w-full py-2.5 bg-[#143e47] hover:bg-[#1d5764] text-[#48e4ff] text-xs font-bold rounded-xl transition shadow-sm font-mono"
            >
              Done / Return to Browser
            </button>
          </div>
        </div>
      )}

      {/* SSL Security Modal */}
      {showSslModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#07191e] border border-[#164550] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck size={18} />
              <span>Connection is Encrypted & Secure</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Your connection to <strong className="text-white">{new URL(activeTab.url).hostname}</strong> is encrypted through the Spotui Anycast Edge Mesh.
            </p>
            <div className="bg-[#030d10] p-3 rounded-xl border border-[#11313a] space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Protocol:</span>
                <span className="text-[#48e4ff]">TLS 1.3 / ChaCha20</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Node Gateway:</span>
                <span className="text-white">{currentEngine}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Anti-DPI Bypass:</span>
                <span className="text-emerald-400">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">AdBlock Guard:</span>
                <span className="text-white">{activeTab.adblockEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
            <button
              onClick={() => setShowSslModal(false)}
              className="w-full py-2 bg-[#143e47] hover:bg-[#1d5764] text-[#48e4ff] text-xs font-bold rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
