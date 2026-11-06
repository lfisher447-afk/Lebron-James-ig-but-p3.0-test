import React from 'react';
import {
  Home,
  Library,
  Search,
  Settings,
  Mic,
  Globe,
  Sliders,
  UploadCloud,
  RefreshCw,
  Shield,
  Music2,
  Music,
  Youtube,
  Disc,
  Server,
  Sparkles,
  Film,
} from 'lucide-react';
import { ThemePalette } from '../types';
import { PALETTES } from '../lib/theme';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSync: () => void;
  onOpenNovaAc: () => void;
  onOpenShazam: () => void;
  onOpenDsp: () => void;
  onOpenChangelog?: () => void;
  onLaunchCloak: () => void;
  isSpotifyConnected: boolean;
  palette: ThemePalette;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSync,
  onOpenNovaAc,
  onOpenShazam,
  onOpenDsp,
  onOpenChangelog,
  onLaunchCloak,
  palette,
}) => {
  const currentTheme = PALETTES[palette] || PALETTES.cyan;
  const navItems = [
    { id: 'home', icon: Home, label: 'Signal Deck', desc: 'Overview & telemetry' },
    { id: 'movies', icon: Film, label: 'Movies & Series', badge: '15+ Servers', desc: 'TMDB Cinema Hub' },
    { id: 'yt-music', icon: Music, label: 'YouTube Music', badge: 'Opus 48k', desc: 'Hi-Fi streams' },
    { id: 'yt-player', icon: Youtube, label: 'Invidious Cinema', badge: '12 Mirrors', desc: 'No-ad video player' },
    { id: 'spotify', icon: Music2, label: 'Spotify Bridge', badge: 'Keyless', desc: 'Playlists & albums' },
    { id: 'servers', icon: Server, label: 'Proxy Matrix', badge: '12 Nodes', desc: 'Latency & health' },
    { id: 'web-proxy', icon: Globe, label: 'Web Proxy Browser', desc: 'Unblocked sandbox' },
    { id: 'library', icon: Library, label: 'Vault Stash', desc: 'Offline storage' },
    { id: 'search', icon: Search, label: 'Omni Search & AI', badge: 'Gemini', desc: 'Grounded search' },
    { id: 'settings', icon: Settings, label: 'Control Deck', desc: 'Preferences & keys' },
  ];

  return (
    <aside className="w-72 border-r border-slate-800/80 bg-gradient-to-b from-[#07090e] via-[#0b0f17] to-[#080a10] p-4 flex flex-col z-20 shrink-0 select-none overflow-y-auto">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6 p-2 rounded-2xl bg-gradient-to-r from-slate-900/60 to-slate-800/30 border border-slate-800/60 shadow-lg">
        <div className={`w-10 h-10 rounded-xl ${currentTheme.iconBg} flex items-center justify-center relative overflow-hidden shrink-0`}>
          <Disc className="text-slate-950 animate-spin" style={{ animationDuration: '6s' }} size={22} />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            SpotUI <span className="text-[10px] px-2 py-0.5 rounded-full font-mono border" style={{ backgroundColor: currentTheme.badgeBg, color: currentTheme.badgeText, borderColor: currentTheme.badgeBorder }}>Studio v3.5</span>
          </div>
          <div className="text-[10px] text-slate-400 tracking-wider uppercase font-mono truncate flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            Universal Audio Mesh
          </div>
        </div>
      </div>

      {/* Main Navigation with Sub-Pages */}
      <nav className="space-y-1 mb-5">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2 mb-2 flex items-center justify-between">
          <span>Command Center</span>
          <span className="text-[9px] font-mono" style={{ color: currentTheme.primary }}>9 MODULES</span>
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                window.location.hash = `#/${item.id}`;
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-xs text-left group ${
                isActive
                  ? `${currentTheme.navActive} shadow-md`
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800/40 text-slate-400 group-hover:text-slate-200'}`}>
                  <item.icon size={16} />
                </div>
                <div className="truncate">
                  <div className={`font-semibold ${isActive ? 'text-white' : 'text-slate-300'}`}>{item.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{item.desc}</div>
                </div>
              </div>
              {item.badge && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-mono shrink-0 border"
                  style={
                    item.badge === 'Gemini'
                      ? { backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#d8b4fe', borderColor: 'rgba(168, 85, 247, 0.3)' }
                      : { backgroundColor: currentTheme.badgeBg, color: currentTheme.badgeText, borderColor: currentTheme.badgeBorder }
                  }
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Audio & Vault Engines */}
      <div className="space-y-1.5 mb-6">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2 mb-1.5 flex items-center justify-between">
          <span>DSP & Audio Rigs</span>
          <span className="text-[9px] font-mono text-emerald-400">DSP ON</span>
        </div>

        <button
          onClick={onOpenDsp}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-xs font-semibold text-slate-200 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Sliders size={15} className="text-cyan-400 group-hover:rotate-45 transition-transform" />
            <span>5-Band Parametric EQ</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Studio</span>
        </button>

        <button
          onClick={onOpenShazam}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-purple-500/40 rounded-xl text-xs font-semibold text-slate-200 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Mic size={15} className="text-purple-400 group-hover:scale-110 transition-transform" />
            <span>Acoustic Wave Match</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Mic</span>
        </button>

        <button
          onClick={onOpenNovaAc}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-xs font-semibold text-slate-200 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <UploadCloud size={15} className="text-emerald-400 group-hover:-translate-y-0.5 transition-transform" />
            <span>Archive Importer</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">.novaac</span>
        </button>

        <button
          onClick={onOpenSync}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-amber-500/40 rounded-xl text-xs font-semibold text-slate-200 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <RefreshCw size={15} className="text-amber-400 group-hover:rotate-180 transition-transform duration-500" />
            <span>Vault Cloud Sync</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">IDB</span>
        </button>
      </div>

      {/* Stealth Panic Button & Status */}
      <div className="mt-auto pt-4 border-t border-slate-800/80 space-y-2">
        {onOpenChangelog && (
          <button
            onClick={onOpenChangelog}
            className="w-full py-2 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-mono font-bold transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span>Changelog & Notes</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">v4.5</span>
          </button>
        )}

        <button
          onClick={onLaunchCloak}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-950/40 to-slate-900/60 hover:from-rose-900/50 hover:to-rose-950/60 text-rose-400 border border-rose-900/50 hover:border-rose-500/50 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <Shield size={14} />
          <span>Stealth about:blank Tab</span>
        </button>

        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>12 Proxy Nodes Active</span>
          </div>
          <span className="text-cyan-400 flex items-center gap-1">
            <Sparkles size={11} /> AI Oracle
          </span>
        </div>
      </div>
    </aside>
  );
};

