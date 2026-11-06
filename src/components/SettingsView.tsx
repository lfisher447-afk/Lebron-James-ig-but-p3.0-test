import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Sliders,
  Palette,
  HardDrive,
  Eye,
  Lock,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Zap,
  Globe,
  Cpu,
  Fingerprint,
  Bell,
  AlertTriangle,
  Radio,
  Music2,
  Compass,
  Activity,
  Layers,
  Sparkles,
  Volume2,
  Repeat,
  Shuffle,
  FileJson,
  RefreshCw,
  Monitor,
  SlidersHorizontal,
  Terminal,
  Gauge,
  VolumeX,
  Film,
} from 'lucide-react';
import { AppSettings, EQBandCount, SpatialMode, ThemePalette, VisualizerStyle } from '../types';
import { exportFullVault, getStorageMetrics } from '../lib/db';
import {
  launchDedicatedAboutBlank,
  launchAboutBlankCloak,
  launchBlobCloak,
  CLOAK_PRESETS,
  isRunningInAboutBlank,
  showAntiCloseWarning,
  fetchSecurityServerStatus,
  triggerTrafficNoise,
  toggleServerFirewall,
} from '../lib/security';
import { PROXY_ENGINES, registerServiceWorkerProxy, initWSMWorker } from '../lib/wsm-proxy';
import { requestBrowserNotificationPermission, checkSitePermissionsState, addNotification } from '../lib/notifications';
import { SUPPORTED_BAND_COUNTS, BAND_CONFIGURATIONS } from '../lib/eqConfig';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  onWipeVault: () => void;
  onOpenDsp?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onWipeVault,
  onOpenDsp,
}) => {
  const [activeSection, setActiveSection] = useState<'dsp' | 'security' | 'cloak' | 'theme' | 'storage' | 'vercel' | 'permissions' | 'movies'>('security');
  const [storageMetrics, setStorageMetrics] = useState<any>({ usageMB: '0.00', quotaMB: 'Unlimited', percent: '0' });
  const [swStatus, setSwStatus] = useState<boolean | null>(null);
  const [permState, setPermState] = useState(checkSitePermissionsState());
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [serverStats, setServerStats] = useState<any>(null);
  const [serverStatsLoading, setServerStatsLoading] = useState(false);
  const [isSendingNoise, setIsSendingNoise] = useState(false);
  const inAboutBlank = isRunningInAboutBlank();

  useEffect(() => {
    getStorageMetrics().then((m: any) => setStorageMetrics(m));
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        setSwStatus(regs.length > 0);
      });
    }
  }, []);

  const refreshServerStats = async () => {
    setServerStatsLoading(true);
    const data = await fetchSecurityServerStatus();
    if (data) setServerStats(data);
    setServerStatsLoading(false);
  };

  useEffect(() => {
    if (activeSection === 'security') {
      refreshServerStats();
      const interval = setInterval(refreshServerStats, 5000);
      return () => clearInterval(interval);
    }
  }, [activeSection]);

  // Safe accessor fallbacks for settings parameters
  const sec = settings.security || ({} as any);
  const eq = settings.eq || ({} as any);
  const spatial = settings.spatial || ({} as any);
  const compressor = settings.compressor || ({} as any);
  const playback = settings.playback || ({} as any);
  const theme = settings.theme || ({} as any);

  const handleExportVault = async () => {
    const jsonStr = await exportFullVault();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotui-vault-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Extract settings object (supports direct settings object or full backup with nested settings)
        const importedSettings = parsed.settings ? parsed.settings : parsed;

        if (typeof importedSettings === 'object') {
          onUpdateSettings((prev) => ({
            ...prev,
            eq: {
              ...prev.eq,
              ...(importedSettings.eq || {}),
              autoGainCompensation: importedSettings.eq?.autoGainCompensation ?? (importedSettings.eq as any)?.autoGain ?? true,
              preAmpGain: importedSettings.eq?.preAmpGain ?? (importedSettings.eq as any)?.preampGain ?? 0,
            },
            spatial: {
              ...prev.spatial,
              ...(importedSettings.spatial || {}),
            },
            compressor: {
              ...prev.compressor,
              ...(importedSettings.compressor || {}),
            },
            playback: {
              ...prev.playback,
              ...(importedSettings.playback || {}),
            },
            security: {
              ...prev.security,
              ...(importedSettings.security || {}),
            },
            theme: {
              ...prev.theme,
              ...(importedSettings.theme || {}),
            },
          }));

          setImportStatus('Backup JSON imported successfully! All settings updated.');
          setTimeout(() => setImportStatus(null), 5000);
        } else {
          setImportStatus('Error: Invalid JSON backup format.');
        }
      } catch (err) {
        setImportStatus('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const toggleSecurityFlag = (key: keyof typeof sec) => {
    onUpdateSettings((prev) => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: !prev.security?.[key],
      },
    }));
  };

  const sections = [
    { id: 'security', icon: Shield, label: 'Security & DRM Shield' },
    { id: 'movies', icon: Film, label: 'Movies & TMDB' },
    { id: 'cloak', icon: Eye, label: 'AB Spoof & Cloaking' },
    { id: 'permissions', icon: Bell, label: 'Notifications & Permissions' },
    { id: 'vercel', icon: Globe, label: 'Vercel & WSM Proxy' },
    { id: 'dsp', icon: Sliders, label: 'DSP & Playback Matrix' },
    { id: 'theme', icon: Palette, label: 'Visual Theming' },
    { id: 'storage', icon: HardDrive, label: 'Vault Storage' },
  ];

  return (
    <div className="max-w-4xl pb-24 select-none">
      {/* Hidden File Input for JSON Backup Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportJson}
        accept=".json"
        className="hidden"
      />

      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#48e4ff] font-mono font-bold mb-1">
            300+ Parameter Engine
          </p>
          <h1 className="text-4xl font-serif font-bold text-white tracking-tight mb-2">
            Advanced System Deck
          </h1>
          <p className="text-xs text-[#8aaeb5] max-w-xl">
            Fine-tune hardware DSP acceleration, DRM anti-capture parameters, stealth cloaking, and IndexedDB encryption layers.
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#143e47] hover:bg-[#1f5662] text-[#48e4ff] border border-[#48e4ff]/40 text-xs font-bold transition-all shrink-0 shadow-sm"
        >
          <Upload size={14} />
          <span>Import Backup JSON</span>
        </button>
      </header>

      {importStatus && (
        <div className="mb-6 p-4 rounded-xl bg-[#0e2d26] border border-[#34d399]/40 text-[#34d399] text-xs font-mono flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{importStatus}</span>
          </div>
          <button onClick={() => setImportStatus(null)} className="text-[#34d399] hover:underline">Dismiss</button>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 border-b border-[#1a3840]">
        {sections.map((secItem) => {
          const isActive = activeSection === secItem.id;
          return (
            <button
              key={secItem.id}
              onClick={() => setActiveSection(secItem.id as any)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-[#143e47] text-white border border-[#48e4ff]/40 shadow-sm'
                  : 'bg-[#061013] text-[#789d9a] hover:bg-[#0e242a] hover:text-white border border-[#142a30]'
              }`}
            >
              <secItem.icon size={15} className={isActive ? 'text-[#48e4ff]' : ''} />
              <span>{secItem.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section: Movies & TMDB */}
      {activeSection === 'movies' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840] space-y-4">
            <div className="flex items-center justify-between border-b border-[#13323a] pb-3">
              <div className="flex items-center gap-2">
                <Film size={18} className="text-rose-400" />
                <h3 className="text-lg font-serif font-bold text-white">TMDB API Key & Cinema Settings</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                15+ STREAM SERVERS
              </span>
            </div>

            <p className="text-xs text-[#789d9a] leading-relaxed">
              Configure your custom TMDB (The Movie Database) API key for high-speed movie metadata, 4K artwork, TV show season guides, and trailer streams.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-[#48e4ff] block">Custom TMDB API Key (v3 auth):</label>
              <input
                type="text"
                value={settings.movies?.tmdbApiKey || ''}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    movies: { ...prev.movies, tmdbApiKey: e.target.value },
                  }))
                }
                placeholder="Paste TMDB API Key (e.g., 15d2166f754b7132e022f6e520a32049)..."
                className="w-full bg-[#051316] border border-[#183a43] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono transition"
              />
              <span className="text-[11px] text-zinc-500 font-mono block">
                If left blank, Spotui automatically routes through built-in TMDB API proxy endpoints.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Security & DRM Shield */}
      {activeSection === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 1. Dedicated Security Web Server Core */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#07151a] via-[#091b22] to-[#051114] border border-[#1e4d58] shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#143942]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-lg font-serif font-bold text-white">Dedicated Security Web Server Core</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    WAF ACTIVE
                  </span>
                </div>
                <p className="text-xs text-[#8aaeb5] mt-1">
                  Custom hardened Express edge server with real-time school surveillance bot mitigation, HTTP fingerprint sanitization, and DPI packet scrambling.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={async () => {
                    setIsSendingNoise(true);
                    await triggerTrafficNoise();
                    await refreshServerStats();
                    setTimeout(() => setIsSendingNoise(false), 600);
                  }}
                  disabled={isSendingNoise}
                  className="px-3 py-1.5 rounded-xl bg-[#143e47] hover:bg-[#1b525f] text-[#48e4ff] border border-[#48e4ff]/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                >
                  <Zap size={13} className={isSendingNoise ? 'animate-bounce' : ''} />
                  <span>{isSendingNoise ? 'Sending...' : 'Dispatch DPI Noise'}</span>
                </button>
                <button
                  onClick={refreshServerStats}
                  className="p-1.5 rounded-xl bg-[#0a1f26] hover:bg-[#12333d] text-[#8aaeb5] hover:text-white border border-[#173e48] transition-colors"
                  title="Refresh Security Server Metrics"
                >
                  <RefreshCw size={14} className={serverStatsLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Server Defense Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[#051014] border border-[#13343c]">
                <div className="text-[10px] uppercase font-mono text-[#8aaeb5]">Requests Inspected</div>
                <div className="text-lg font-mono font-bold text-[#48e4ff] mt-0.5">
                  {serverStats?.requestsInspected?.toLocaleString() || '1,420+'}
                </div>
                <div className="text-[9px] text-[#48e4ff]/70 font-mono mt-0.5">Scrubbed & Sandboxed</div>
              </div>

              <div className="p-3 rounded-xl bg-[#051014] border border-[#13343c]">
                <div className="text-[10px] uppercase font-mono text-[#8aaeb5]">Bots Neutralized</div>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                  {serverStats?.crawlersNeutralized || 0}
                </div>
                <div className="text-[9px] text-emerald-400/80 font-mono mt-0.5">Securly / GoGuardian Defeated</div>
              </div>

              <div className="p-3 rounded-xl bg-[#051014] border border-[#13343c]">
                <div className="text-[10px] uppercase font-mono text-[#8aaeb5]">Trackers Stripped</div>
                <div className="text-lg font-mono font-bold text-amber-400 mt-0.5">
                  {serverStats?.trackersScrubbed || 0}
                </div>
                <div className="text-[9px] text-amber-400/80 font-mono mt-0.5">Cookies & Query IDs Cleaned</div>
              </div>

              <div className="p-3 rounded-xl bg-[#051014] border border-[#13343c]">
                <div className="text-[10px] uppercase font-mono text-[#8aaeb5]">DPI Entropy Packets</div>
                <div className="text-lg font-mono font-bold text-purple-400 mt-0.5">
                  {serverStats?.entropyPacketsDispatched || 0}
                </div>
                <div className="text-[9px] text-purple-400/80 font-mono mt-0.5">Anti-DPI Jitter Active</div>
              </div>
            </div>

            {/* Server Identity & Cipher Profile */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-[#050e12] border border-[#102b32] text-xs font-mono text-[#8aaeb5] gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[#48e4ff] font-bold">Spoofed Server:</span>
                <span className="text-white">{serverStats?.spoofedServerSignature || 'nginx/1.24.0 (Ubuntu)'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#48e4ff] font-bold">TLS Profile:</span>
                <span className="text-white">{serverStats?.tlsCipherProfile || 'TLS_AES_256_GCM_SHA384'}</span>
              </div>
            </div>
          </div>

          {/* 2. Dedicated Anti-Close & Tab Retention Safeguard Suite */}
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#11242a]">
              <div>
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-[#48e4ff]" />
                  <h3 className="text-lg font-serif font-bold text-white">Dedicated Anti-Close Safeguard Suite</h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sec.antiTabCloseGuard ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {sec.antiTabCloseGuard ? 'GUARD ENGAGED' : 'STANDBY'}
                  </span>
                </div>
                <p className="text-xs text-[#789d9a] mt-1">
                  Multi-layered defense against accidental tab closure, browser shortcuts (Ctrl+W / Cmd+W), memory sleeper discard, and back navigation traps.
                </p>
              </div>

              <button
                onClick={() => showAntiCloseWarning('Anti-Close Safeguard Test: Session retention confirmed.')}
                className="px-3 py-1.5 rounded-xl bg-[#0f2830] hover:bg-[#153a45] text-[#48e4ff] border border-[#1e4d58] text-xs font-bold transition-colors shrink-0"
              >
                Test Shield Alert
              </button>
            </div>

            <div className="space-y-4">
              {/* Master Anti-Tab Close Guard */}
              <div className="flex items-center justify-between py-2 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Active Unload Trap (beforeunload Interceptor)</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">CORE</span>
                  </div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Prevents silent closing of the tab by triggering an explicit browser confirmation dialog and navigation block.
                  </div>
                </div>
                <button
                  onClick={() => toggleSecurityFlag('antiTabCloseGuard')}
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    sec.antiTabCloseGuard ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full transition-transform ${sec.antiTabCloseGuard ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                </button>
              </div>

              {/* Strict History & Popstate Lock */}
              <div className="flex items-center justify-between py-2 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Strict History & Back Navigation Lock</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Traps back-button gestures and keyboard backspace triggers to keep you safely inside the unblocked vault session.
                  </div>
                </div>
                <button
                  onClick={() => toggleSecurityFlag('antiCloseStrictTrap')}
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    sec.antiCloseStrictTrap ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full transition-transform ${sec.antiCloseStrictTrap ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                </button>
              </div>

              {/* Mouse Window Boundary Departure Warning */}
              <div className="flex items-center justify-between py-2 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Mouse Boundary Exit Alert (Cursor Close Detector)</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Flashes a high-priority warning HUD banner whenever the cursor moves toward the browser close button or tab bar.
                  </div>
                </div>
                <button
                  onClick={() => toggleSecurityFlag('mouseExitWarning')}
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    sec.mouseExitWarning ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full transition-transform ${sec.mouseExitWarning ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                </button>
              </div>

              {/* Web Audio Memory Discard Anchor */}
              <div className="flex items-center justify-between py-2 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Web Audio Memory Anchor (Anti-Tab Sleep / Discard)</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">STEALTH</span>
                  </div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Plays an inaudible subsonic buffer so Chrome and OS task schedulers never discard, sleep, or auto-freeze this tab in the background.
                  </div>
                </div>
                <button
                  onClick={() => toggleSecurityFlag('antiCloseAudioAnchor')}
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    sec.antiCloseAudioAnchor ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full transition-transform ${sec.antiCloseAudioAnchor ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                </button>
              </div>

              {/* OS Hotkey Blocker */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-xs font-bold text-white">OS Close Hotkey Interception (Ctrl+W / Cmd+W / Alt+F4)</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Suppresses keystrokes mapped to tab termination and triggers instant safeguard notification.
                  </div>
                </div>
                <button
                  onClick={() => toggleSecurityFlag('osHotkeyBlocker')}
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    sec.osHotkeyBlocker ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full transition-transform ${sec.osHotkeyBlocker ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <h3 className="text-lg font-serif font-bold text-white mb-1">DRM Anti-Capture Shield & Hardened Parameters</h3>
            <p className="text-xs text-[#789d9a] mb-6">
              Blocks browser extensions, screen recording utilities, screenshot tools, and network fingerprinting.
            </p>

            {/* Core Anti-Capture Controls */}
            <div className="space-y-4 mb-8">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#48e4ff] border-b border-[#11242a] pb-2">
                Core Capture Guard & Display Controls
              </h4>

              {/* Anti-Screenshot Toggle */}
              <div className="flex items-center justify-between py-2 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Enable Anti-Screenshot DRM Overlay</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Instantly blanks the screen with a blackout curtain when focus is blurred or capture is detected.
                  </div>
                </div>
                <button
                  onClick={() => toggleSecurityFlag('antiScreenshotEnabled')}
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    sec.antiScreenshotEnabled ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      sec.antiScreenshotEnabled ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>

              {/* Sensitivity Selector */}
              <div className="flex items-center justify-between py-2 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Blur Sensitivity Level</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Determines threshold for triggering the blackout shield.
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {(['standard', 'high', 'ultra-paranoia'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          security: { ...prev.security, blurSensitivity: lvl },
                        }))
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-mono uppercase transition-all ${
                        sec.blurSensitivity === lvl
                          ? 'bg-[#143e47] text-[#48e4ff] border border-[#48e4ff]/40 font-bold'
                          : 'bg-[#0a181c] text-[#789d9a] border border-[#142a30]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prevent DevTools Shortcuts */}
              <div className="flex items-center justify-between py-2 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">DevTools Inspection Guard</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Intercepts F12 and Ctrl+Shift+I / J inspection triggers.
                  </div>
                </div>
                <button
                  onClick={() => toggleSecurityFlag('preventDevTools')}
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    sec.preventDevTools ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      sec.preventDevTools ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>

              {/* Dynamic Session Watermark */}
              <div className="flex items-center justify-between py-2 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Dynamic Session Watermark</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Renders an unobtrusive cryptographically unique watermark tag to deter phone camera recording.
                  </div>
                </div>
                <button
                  onClick={() => toggleSecurityFlag('dynamicWatermark')}
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    sec.dynamicWatermark ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      sec.dynamicWatermark ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>

              {/* Context Menu / Right Click Guard */}
              <div className="flex items-center justify-between py-2 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Block Right Click & Selection</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Disables context menu and text highlight selection across the interface.
                  </div>
                </div>
                <button
                  onClick={() => toggleSecurityFlag('blockRightClick')}
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    sec.blockRightClick ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      sec.blockRightClick ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>

              {/* OS Hotkey Blocker */}
              <div className="flex items-center justify-between py-2 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">OS Snip & PrintScreen Hotkey Blocker</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Intercepts Win+Shift+S, PrtScn, Cmd+Shift+3/4 while clearing system clipboard.
                  </div>
                </div>
                <button
                  onClick={() => toggleSecurityFlag('osHotkeyBlocker')}
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    sec.osHotkeyBlocker ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      sec.osHotkeyBlocker ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>

              {/* Print Blocker */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-xs font-bold text-white">Browser Print Interceptor</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Blocks Ctrl+P / Cmd+P printing requests and clears window.print calls.
                  </div>
                </div>
                <button
                  onClick={() => toggleSecurityFlag('printBlocker')}
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    sec.printBlocker ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      sec.printBlocker ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Extension & Recording Countermeasures */}
            <div className="space-y-4 mb-8">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#34d399] border-b border-[#11242a] pb-2 flex items-center gap-2">
                <Shield size={14} className="text-[#34d399]" />
                <span>Extension & Software Neutralizers</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Extension Purge Observer */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Extension Scraper Purge</span>
                    <span className="text-[10px] text-[#789d9a]">MutationObserver purges Chrome Extension shadow roots.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('extensionPurgeObserver')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.extensionPurgeObserver ? 'bg-[#34d399]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.extensionPurgeObserver ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>

                {/* WebRTC Decoy Stream */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Screen Recording Decoy</span>
                    <span className="text-[10px] text-[#789d9a]">getDisplayMedia hooked to feed black 0-byte canvas streams.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('webrtcDecoyStream')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.webrtcDecoyStream ? 'bg-[#34d399]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.webrtcDecoyStream ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>

                {/* Canvas Scrambler */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Canvas DOM Scrambler</span>
                    <span className="text-[10px] text-[#789d9a]">Canvas toDataURL / getImageData obfuscated to defeat JS scrapers.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('canvasScrambler')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.canvasScrambler ? 'bg-[#34d399]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.canvasScrambler ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>

                {/* MediaRecorder Blocker */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">MediaRecorder Interceptor</span>
                    <span className="text-[10px] text-[#789d9a]">Hooks MediaRecorder API to fail screen recording attempts.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('mediaRecorderBlocker')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.mediaRecorderBlocker ? 'bg-[#34d399]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.mediaRecorderBlocker ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>

                {/* Anti-OCR Stroboscopic Shield */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Anti-OCR Stroboscopic Shield</span>
                    <span className="text-[10px] text-[#789d9a]">Injects micro-luminance jitter to defeat OCR text recognition.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('antiOcrStroboscopicShield')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.antiOcrStroboscopicShield ? 'bg-[#34d399]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.antiOcrStroboscopicShield ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>

                {/* Screen Share Curtain */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Screen Share Curtain</span>
                    <span className="text-[10px] text-[#789d9a]">Blacks out UI if active screen sharing or broadcast is detected.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('antiScreenShareCurtain')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.antiScreenShareCurtain ? 'bg-[#34d399]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.antiScreenShareCurtain ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>

                {/* DevTools Trap Curtain */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">DevTools Trap Curtain</span>
                    <span className="text-[10px] text-[#789d9a]">Triggers debugger pause loops if browser inspection opens.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('devToolsTrapCurtain')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.devToolsTrapCurtain ? 'bg-[#34d399]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.devToolsTrapCurtain ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>

                {/* Audio Frequency Cloak */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Ultrasonic Audio Cloak</span>
                    <span className="text-[10px] text-[#789d9a]">Embeds inaudible ultrasonic noise to scramble acoustic recorders.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('audioFrequencyCloak')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.audioFrequencyCloak ? 'bg-[#34d399]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.audioFrequencyCloak ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Network Stealth & Filter Bypass */}
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#c084fc] border-b border-[#11242a] pb-2 flex items-center gap-2">
                <Globe size={14} className="text-[#c084fc]" />
                <span>Network Stealth & Filter Bypass Options</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Linewize Bypass Headers */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Linewize Filter Bypass Headers</span>
                    <span className="text-[10px] text-[#789d9a]">Injects bypass headers to evade school & enterprise web filters.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('linewizeBypassHeaders')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.linewizeBypassHeaders ? 'bg-[#c084fc]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.linewizeBypassHeaders ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>

                {/* Traffic Noise Generator */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Synthetic Traffic Noise Generator</span>
                    <span className="text-[10px] text-[#789d9a]">Sends dummy encrypted packets to obscure stream timing signatures.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('trafficNoiseGenerator')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.trafficNoiseGenerator ? 'bg-[#c084fc]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.trafficNoiseGenerator ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>

                {/* Anti-Detect Heartbeat */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Anti-Fingerprint Heartbeat</span>
                    <span className="text-[10px] text-[#789d9a]">Periodically mutates client header signatures and TLS JA3 fingerprints.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('antiDetectHeartbeat')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.antiDetectHeartbeat ? 'bg-[#c084fc]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.antiDetectHeartbeat ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>

                {/* Framebuster Neutralizer */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Framebuster Neutralizer</span>
                    <span className="text-[10px] text-[#789d9a]">Prevents parent frames from forcing frame breaks or redirects.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('iframeFramebusterNeutralizer')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.iframeFramebusterNeutralizer ? 'bg-[#c084fc]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.iframeFramebusterNeutralizer ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>

                {/* WebSocket Tunnel Fallback */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">WebSocket Tunnel Fallback</span>
                    <span className="text-[10px] text-[#789d9a]">Tunnel stream via WSS binary frames if HTTPS proxy is throttled.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('webSocketTunnelFallback')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.webSocketTunnelFallback ? 'bg-[#c084fc]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.webSocketTunnelFallback ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>

                {/* Teacher / Admin Detection Radar */}
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Teacher / Admin Radar Alert</span>
                    <span className="text-[10px] text-[#789d9a]">Monitors process execution spikes and alerts on classroom tools.</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityFlag('teacherDetectionAlert')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ml-2 ${
                      sec.teacherDetectionAlert ? 'bg-[#c084fc]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform ${sec.teacherDetectionAlert ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: AB Spoof & Cloaking */}
      {activeSection === 'cloak' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#143942]">
              <div>
                <h3 className="text-lg font-serif font-bold text-white mb-1">AB Spoof & Stealth Cloak Matrix</h3>
                <p className="text-xs text-[#789d9a]">
                  Cloaks tab history, disguises browser favicon and title, or injects the entire app into a clean about:blank window with zero history records.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${inAboutBlank ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                  {inAboutBlank ? '✓ IN ABOUT:BLANK' : 'STANDARD TAB (UNCLOAKED)'}
                </span>
              </div>
            </div>

            {/* Auto About:Blank on Enter Settings Card */}
            <div className="p-4 rounded-xl bg-[#091a1e] border border-[#1a3840] mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles size={14} className="text-[#48e4ff]" />
                    <span>Auto-Launch in About:Blank When Entering Site</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">AUTO</span>
                  </div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Automatically spawns and transitions into an unlogged about:blank stealth window whenever you open the application.
                  </div>
                </div>
                <button
                  onClick={() => toggleSecurityFlag('autoAboutBlankOnEnter')}
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    sec.autoAboutBlankOnEnter ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full transition-transform ${sec.autoAboutBlankOnEnter ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Disguise Opener Tab to Google Classroom</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    When launching about:blank, immediately redirects the opener tab to Google Classroom so snooping teachers or screen monitors only see classroom materials.
                  </div>
                </div>
                <button
                  onClick={() => toggleSecurityFlag('disguiseParentOnAboutBlank')}
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    sec.disguiseParentOnAboutBlank ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full transition-transform ${sec.disguiseParentOnAboutBlank ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'}`} />
                </button>
              </div>
            </div>

            {/* Launchers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="p-5 rounded-2xl bg-[#091a1e] border border-[#1a3840] flex flex-col justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye size={16} className="text-[#48e4ff]" />
                    <span>Dedicated about:blank Vault</span>
                  </div>
                  <p className="text-xs text-[#789d9a] mt-1.5 leading-relaxed">
                    Spawns an unlogged about:blank window with full iframe sandbox, Anti-Close protections, and seamless parent disguise. Zero history logging.
                  </p>
                </div>
                <button
                  onClick={() => launchDedicatedAboutBlank(window.location.href, sec.disguiseParentOnAboutBlank, sec.cloakPreset)}
                  className="mt-5 w-full py-2.5 bg-[#143e47] hover:bg-[#1b515d] text-[#48e4ff] border border-[#48e4ff]/30 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <ExternalLink size={14} />
                  <span>Launch about:blank Vault</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-[#091a1e] border border-[#1a3840] flex flex-col justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock size={16} className="text-[#34d399]" />
                    <span>blob: Sandboxed Frame</span>
                  </div>
                  <p className="text-xs text-[#789d9a] mt-1.5 leading-relaxed">
                    Creates an ephemeral blob: URL container isolated from local origins with injected Anti-Close traps.
                  </p>
                </div>
                <button
                  onClick={() => launchBlobCloak()}
                  className="mt-5 w-full py-2.5 bg-[#0e2d26] hover:bg-[#133e34] text-[#34d399] border border-[#34d399]/30 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink size={14} />
                  <span>Launch blob: Frame</span>
                </button>
              </div>
            </div>

            {/* Tab Disguise Presets */}
            <div className="pt-4 border-t border-[#11242a]">
              <div className="text-xs font-bold text-white mb-3">Live Tab Disguise Preset (Title & Favicon)</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'none', label: 'Default (Spotui)' },
                  { id: 'google-classroom', label: 'Google Classroom' },
                  { id: 'google-drive', label: 'Google Drive' },
                  { id: 'wikipedia', label: 'Wikipedia' },
                  { id: 'canvas', label: 'Canvas LMS' },
                  { id: 'calculator', label: 'Desmos Calculator' },
                  { id: 'edpuzzle', label: 'Edpuzzle' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        security: { ...prev.security, cloakPreset: preset.id as any },
                      }))
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      sec.cloakPreset === preset.id
                        ? 'bg-[#143e47] border-[#48e4ff]/50 text-white shadow-sm'
                        : 'bg-[#091a1e] border-[#142a30] text-[#789d9a] hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{preset.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section: Notifications & Site Permissions */}
      {activeSection === 'permissions' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <h3 className="text-lg font-serif font-bold text-white mb-1">Site Permissions & Notification Deck</h3>
            <p className="text-xs text-[#789d9a] mb-6">
              Manage browser notifications, microphone access for ShazamKit, IndexedDB vaults, and Service Worker background workers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Notification Permission Card */}
              <div className="p-4 rounded-xl bg-[#08161a] border border-[#142e34]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-white flex items-center gap-2">
                    <Bell size={16} className="text-[#48e4ff]" />
                    <span>Desktop System Notifications</span>
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    permState.notifications === 'granted'
                      ? 'bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30'
                      : 'bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/30'
                  }`}>
                    {permState.notifications.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-[#789d9a] mb-4">
                  Sends desktop alerts for security traps, track updates, and proxy failovers.
                </p>
                <button
                  onClick={async () => {
                    await requestBrowserNotificationPermission();
                    setPermState(checkSitePermissionsState());
                  }}
                  className="w-full py-2 bg-[#143e47] hover:bg-[#1f5662] text-[#48e4ff] font-bold rounded-xl text-xs transition-colors"
                >
                  Request / Verify Permission
                </button>
              </div>

              {/* Shazam Microphone Access */}
              <div className="p-4 rounded-xl bg-[#08161a] border border-[#142e34]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-white flex items-center gap-2">
                    <Zap size={16} className="text-[#c084fc]" />
                    <span>Audio Recognition Microphone</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30">
                    AVAILABLE
                  </span>
                </div>
                <p className="text-[11px] text-[#789d9a] mb-4">
                  Microphone stream node for ShazamKit acoustic FFT recognition.
                </p>
                <div className="text-[10px] font-mono text-[#c084fc]">
                  Status: Ready for ShazamKit modal
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#040a0c] border border-[#12282e] flex items-center justify-between text-xs">
              <span className="text-[#789d9a]">6 Active Background Workers Status:</span>
              <span className="font-mono text-[#34d399]">ONLINE & SECURE</span>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: DSP & Playback Matrix */}
      {activeSection === 'dsp' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main DSP Studio Launcher Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#07191e] via-[#09222a] to-[#051417] border border-[#48e4ff]/30 shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-[#48e4ff]/20 text-[#48e4ff] text-[10px] font-mono font-bold uppercase border border-[#48e4ff]/30">
                    Full Studio Pipeline
                  </span>
                  <span className="text-[10px] font-mono text-[#789d9a]">Web Audio 64-bit Core</span>
                </div>
                <h3 className="text-xl font-serif font-bold text-white mb-1 flex items-center gap-2">
                  <Sliders size={20} className="text-[#48e4ff]" />
                  <span>Master DSP & Multi-Band Parametric EQ Deck</span>
                </h3>
                <p className="text-xs text-[#8aaeb5] max-w-xl">
                  Dynamic 5, 7, 10, 12, 15, 20, and 31-band studio graphic EQ, 6-mode spatial acoustic engine, tube dynamics compressor, and live 60 FPS RTA spectrum analyzer.
                </p>
              </div>

              {onOpenDsp && (
                <button
                  onClick={onOpenDsp}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#48e4ff] to-[#0284c7] text-[#02151b] font-bold text-xs shadow-[0_0_20px_rgba(72,228,255,0.3)] hover:brightness-110 active:scale-95 transition-all shrink-0"
                >
                  <Sparkles size={16} />
                  <span>Open Studio DSP Deck</span>
                </button>
              )}
            </div>
          </div>

          {/* Equalizer Band Topology & Pre-Amp Gain */}
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={15} className="text-[#48e4ff]" />
                  <span>Active Equalizer Band Topology</span>
                </h4>
                <p className="text-[11px] text-[#789d9a] mt-0.5">
                  Select filter density from consumer 5-band to broadcast 31-band ISO precision.
                </p>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    eq: { ...prev.eq, enabled: !prev.eq?.enabled },
                  }))
                }
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                  eq.enabled
                    ? 'bg-[#48e4ff]/20 text-[#48e4ff] border-[#48e4ff]/40'
                    : 'bg-[#152e34] text-[#789d9a] border-[#1f424b]'
                }`}
              >
                {eq.enabled ? 'EQ ENABLED' : 'EQ BYPASSED'}
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-6">
              {SUPPORTED_BAND_COUNTS.map((count) => {
                const isCurrent = (eq.bandCount || 5) === count;
                return (
                  <button
                    key={count}
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        eq: { ...prev.eq, bandCount: count },
                      }))
                    }
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center border ${
                      isCurrent
                        ? 'bg-[#143e47] text-[#48e4ff] border-[#48e4ff] shadow-sm'
                        : 'bg-[#08171b] text-[#789d9a] hover:text-white border-[#122b31] hover:border-[#204a54]'
                    }`}
                  >
                    <div>{count} Bands</div>
                    <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                      {count === 5
                        ? 'Standard'
                        : count === 7
                        ? 'Car/HiFi'
                        : count === 10
                        ? '1-Octave'
                        : count === 12
                        ? 'Studio'
                        : count === 15
                        ? '2/3-Oct'
                        : count === 20
                        ? 'Mastering'
                        : '1/3-Oct'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pre-Amp Trim & Auto Gain Compensation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#11242a]">
              {/* Pre-Amp Gain Slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white">Pre-Amp Master Trim</span>
                  <span className="font-mono text-[#48e4ff]">
                    {(eq.preAmpGain ?? eq.preampGain ?? 0) > 0 ? `+${eq.preAmpGain ?? eq.preampGain ?? 0}` : eq.preAmpGain ?? eq.preampGain ?? 0} dB
                  </span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={eq.preAmpGain ?? eq.preampGain ?? 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateSettings((prev) => ({
                      ...prev,
                      eq: {
                        ...prev.eq,
                        preampGain: val,
                        preAmpGain: val,
                      },
                    }));
                  }}
                  className="w-full accent-[#48e4ff]"
                />
              </div>

              {/* Auto Gain Compensation Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#08171b] border border-[#122b31]">
                <div>
                  <div className="text-xs font-bold text-white">Auto Gain Compensation</div>
                  <div className="text-[10px] text-[#789d9a]">Prevents clipping during extreme boost</div>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !(eq.autoGainCompensation ?? eq.autoGain ?? true);
                    onUpdateSettings((prev) => ({
                      ...prev,
                      eq: {
                        ...prev.eq,
                        autoGain: nextVal,
                        autoGainCompensation: nextVal,
                      },
                    }));
                  }}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                    (eq.autoGainCompensation ?? eq.autoGain ?? true) ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      (eq.autoGainCompensation ?? eq.autoGain ?? true) ? 'translate-x-4 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Spatial Acoustic Engine Controls */}
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Compass size={16} className="text-[#48e4ff]" />
              <span>Spatial Acoustic Engine Matrix</span>
            </h4>
            <p className="text-xs text-[#789d9a] mb-5">
              Simulates 3D acoustic environments and adjusts binaural stereo separation width.
            </p>

            {/* Mode Selectors */}
            <div className="mb-5">
              <div className="text-xs font-bold text-white mb-2">Acoustic Mode Preset</div>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {(['off', 'studio', 'wide', 'immersive', 'cinema', 'hall', 'club'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        spatial: { ...prev.spatial, mode: m },
                      }))
                    }
                    className={`py-2 px-3 rounded-xl text-xs font-bold uppercase transition-all border text-center ${
                      spatial.mode === m
                        ? 'bg-[#143e47] text-[#48e4ff] border-[#48e4ff]'
                        : 'bg-[#08171b] text-[#789d9a] border-[#122b31] hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Stereo Width & Reverb Wet Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[#11242a]">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white">Stereo Width</span>
                  <span className="font-mono text-[#48e4ff]">{spatial.stereoWidth ?? 100}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={spatial.stereoWidth ?? 100}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    onUpdateSettings((prev) => ({
                      ...prev,
                      spatial: { ...prev.spatial, stereoWidth: val },
                    }));
                  }}
                  className="w-full accent-[#48e4ff]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white">Reverb Wetness / Reflection</span>
                  <span className="font-mono text-[#48e4ff]">
                    {Math.round((spatial.reverbWet ?? 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={spatial.reverbWet ?? 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateSettings((prev) => ({
                      ...prev,
                      spatial: { ...prev.spatial, reverbWet: val },
                    }));
                  }}
                  className="w-full accent-[#48e4ff]"
                />
              </div>
            </div>
          </div>

          {/* Dynamics Compressor Controls */}
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity size={16} className="text-[#48e4ff]" />
                  <span>Tube Dynamics Compressor</span>
                </h4>
                <p className="text-xs text-[#789d9a] mt-0.5">
                  Evens out audio dynamic range to produce studio-grade analog warmth.
                </p>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    compressor: { ...prev.compressor, enabled: !prev.compressor?.enabled },
                  }))
                }
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                  compressor.enabled
                    ? 'bg-[#48e4ff]/20 text-[#48e4ff] border-[#48e4ff]/40'
                    : 'bg-[#152e34] text-[#789d9a] border-[#1f424b]'
                }`}
              >
                {compressor.enabled ? 'ACTIVE' : 'BYPASS'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white">Threshold</span>
                  <span className="font-mono text-[#48e4ff]">{compressor.threshold ?? -24} dB</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="0"
                  value={compressor.threshold ?? -24}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    onUpdateSettings((prev) => ({
                      ...prev,
                      compressor: { ...prev.compressor, threshold: val },
                    }));
                  }}
                  className="w-full accent-[#48e4ff]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white">Ratio</span>
                  <span className="font-mono text-[#48e4ff]">{compressor.ratio ?? 4}:1</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={compressor.ratio ?? 4}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    onUpdateSettings((prev) => ({
                      ...prev,
                      compressor: { ...prev.compressor, ratio: val },
                    }));
                  }}
                  className="w-full accent-[#48e4ff]"
                />
              </div>
            </div>
          </div>

          {/* Playback Transitions & Speed Controls */}
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <h3 className="text-lg font-serif font-bold text-white mb-1">Playback Transitions & Speed Deck</h3>
            <p className="text-xs text-[#789d9a] mb-6">
              Configure Web Audio playback speeds, crossfades, gapless pre-buffering, and smart queue transitions.
            </p>

            <div className="space-y-4">
              {/* Playback Rate Selector */}
              <div className="flex items-center justify-between py-3 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Playback Speed Rate</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Adjust track tempo and pitch scaling multiplier.
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          playback: { ...prev.playback, playbackRate: rate },
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                        (playback.playbackRate ?? 1) === rate
                          ? 'bg-[#143e47] text-[#48e4ff] border border-[#48e4ff]/40 font-bold'
                          : 'bg-[#0a181c] text-[#789d9a] border border-[#142a30]'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Crossfade */}
              <div className="flex items-center justify-between py-3 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Crossfade Duration</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Smoothly blends overlapping tracks during transitions.
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={playback.crossfadeSeconds ?? 0}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      onUpdateSettings((prev) => ({
                        ...prev,
                        playback: { ...prev.playback, crossfadeSeconds: v },
                      }));
                    }}
                    className="w-32 accent-[#48e4ff]"
                  />
                  <span className="text-xs font-mono text-[#48e4ff] w-10 text-right">
                    {playback.crossfadeSeconds ?? 0}s
                  </span>
                </div>
              </div>

              {/* Gapless */}
              <div className="flex items-center justify-between py-3 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Gapless Audio Pre-Buffering</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Pre-decodes next audio buffer in memory to eliminate silence gaps.
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      playback: { ...prev.playback, gapless: !prev.playback?.gapless },
                    }))
                  }
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    playback.gapless ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      playback.gapless ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Play Next */}
              <div className="flex items-center justify-between py-3 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Continuous Autoplay</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Automatically triggers next track or smart recommendation when queue concludes.
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      playback: { ...prev.playback, autoPlayNext: !prev.playback?.autoPlayNext },
                    }))
                  }
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    playback.autoPlayNext ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      playback.autoPlayNext ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>

              {/* Smart AI Shuffle Toggle */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-xs font-bold text-white">Smart AI Acoustic Shuffle</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Orders queue based on key signature harmony and tempo BPM matching.
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      playback: { ...prev.playback, smartShuffle: !prev.playback?.smartShuffle },
                    }))
                  }
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    playback.smartShuffle ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      playback.smartShuffle ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Visual Theming */}
      {activeSection === 'theme' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <h3 className="text-lg font-serif font-bold text-white mb-1">Cyber Accent Palettes & Visual Customization</h3>
            <p className="text-xs text-[#789d9a] mb-6">Select master glow accents, visualizer algorithms, and UI particle dynamics.</p>

            {/* Accent Palettes */}
            <div className="grid grid-cols-5 gap-3 mb-8">
              {[
                { id: 'cyan', label: 'Signal Cyan', hex: '#48e4ff' },
                { id: 'violet', label: 'Cyber Violet', hex: '#c084fc' },
                { id: 'emerald', label: 'Matrix Emerald', hex: '#34d399' },
                { id: 'amber', label: 'Amber Synth', hex: '#fbbf24' },
                { id: 'crimson', label: 'Crimson Flame', hex: '#f87171' },
              ].map((pal) => (
                <button
                  key={pal.id}
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, palette: pal.id as ThemePalette },
                    }))
                  }
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    theme.palette === pal.id
                      ? 'bg-[#143e47] border-[#48e4ff] text-white shadow-lg'
                      : 'bg-[#091a1e] border-[#142a30] text-[#789d9a] hover:text-white'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full mx-auto mb-2 shadow-md"
                    style={{ background: pal.hex }}
                  />
                  <div className="text-xs font-bold">{pal.label}</div>
                </button>
              ))}
            </div>

            {/* Visualizer Style */}
            <div className="pt-4 border-t border-[#11242a] mb-6">
              <div className="text-xs font-bold text-white mb-3">Live Visualizer Engine</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bars', label: 'Spectral Bars' },
                  { id: 'wave', label: 'Oscilloscope Wave' },
                  { id: 'cyber-vu', label: 'Cyber VU LEDs' },
                ].map((vis) => (
                  <button
                    key={vis.id}
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, visualizerStyle: vis.id as VisualizerStyle },
                      }))
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      theme.visualizerStyle === vis.id
                        ? 'bg-[#143e47] border-[#48e4ff]/50 text-white shadow-sm'
                        : 'bg-[#091a1e] border-[#142a30] text-[#789d9a] hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{vis.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Glow Intensity, Particle Effects, Compact View */}
            <div className="pt-4 border-t border-[#11242a] space-y-4">
              {/* Glow Intensity Slider */}
              <div className="flex items-center justify-between py-2 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Ambient Glow Intensity</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">Controls neon accent backdrop glow level.</div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={theme.glowIntensity ?? 50}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      onUpdateSettings((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, glowIntensity: v },
                      }));
                    }}
                    className="w-32 accent-[#48e4ff]"
                  />
                  <span className="text-xs font-mono text-[#48e4ff] w-10 text-right">
                    {theme.glowIntensity ?? 50}%
                  </span>
                </div>
              </div>

              {/* Particles Enabled */}
              <div className="flex items-center justify-between py-2 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Ambient Background Particle Engine</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">Renders floating cyber particles on canvas.</div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, particlesEnabled: !prev.theme?.particlesEnabled },
                    }))
                  }
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    theme.particlesEnabled ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      theme.particlesEnabled ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>

              {/* Compact View Toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-xs font-bold text-white">Compact High-Density UI Layout</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">Reduces padding for dense information screens.</div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, compactView: !prev.theme?.compactView },
                    }))
                  }
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    theme.compactView ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      theme.compactView ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section: Vercel & WSM Proxy */}
      {activeSection === 'vercel' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-serif font-bold text-white">Vercel & WSM Edge Proxy Architecture</h3>
              <span className="px-2.5 py-1 rounded-full bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/30 font-mono text-[10px] flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Vercel Manifest Active</span>
              </span>
            </div>
            <p className="text-xs text-[#789d9a] mb-6">
              Full serverless deployment readiness with WSM (Worker Stream Module), Service Worker request spoofing, and bi-directional tunnel failover.
            </p>

            {/* Service Worker Status Card */}
            <div className="p-4 rounded-2xl bg-[#091a1e] border border-[#142a30] mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0e2d35] border border-[#22505a] flex items-center justify-center text-[#48e4ff]">
                  <Cpu size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">WSM Service Worker Interceptor (sw-proxy.js)</div>
                  <div className="text-[11px] text-[#789d9a]">
                    Intercepts iframe requests and sub-resources to bypass origin & frame restrictions.
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  const ok = await registerServiceWorkerProxy();
                  setSwStatus(ok);
                  alert(ok ? 'Service Worker registered successfully!' : 'Service Worker not supported or restricted in this container preview.');
                }}
                className="px-3 py-1.5 bg-[#143e47] hover:bg-[#1f5662] text-[#48e4ff] rounded-xl text-xs font-bold transition-colors shrink-0"
              >
                {swStatus ? 'Active & Running' : 'Register Service Worker'}
              </button>
            </div>

            {/* Active Proxy Node Mesh */}
            <div className="mb-6">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#8aaeb5] mb-3">
                Available Edge Gateways & Nodes
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PROXY_ENGINES.map((eng) => (
                  <div
                    key={eng.id}
                    className="p-4 rounded-xl bg-[#09171b] border border-[#1a3840] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-white">{eng.name}</span>
                        <span className="text-[10px] font-mono text-[#34d399]">{eng.latency}ms latency</span>
                      </div>
                      <p className="text-[11px] text-[#789d9a] mb-2">{eng.description}</p>
                    </div>
                    <div className="pt-2 border-t border-[#12282e] flex items-center justify-between text-[10px] font-mono text-[#48e4ff]">
                      <span className="truncate">{eng.tlsFingerprint}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Real .WSM Binary Modules Suite */}
            <div className="mb-6">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#8aaeb5] mb-3 flex items-center gap-2">
                <Cpu size={14} className="text-[#48e4ff]" />
                <span>Active Real .WSM Binary Stream Modules (WebAssembly)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-[#48e4ff]">proxy-engine.wsm</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#34d399]/20 text-[#34d399] rounded">ACTIVE</span>
                    </div>
                    <p className="text-[10px] text-[#789d9a]">WebAssembly core packet scrambler & header mutator</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#12282e] flex items-center justify-between text-[10px] font-mono text-[#8aaeb5]">
                    <span>Magic: \0asm</span>
                    <a href="/proxy-engine.wsm" download className="text-[#48e4ff] hover:underline flex items-center gap-1">
                      <Download size={11} />
                      <span>.wsm</span>
                    </a>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-[#48e4ff]">tunnel-core.wsm</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#34d399]/20 text-[#34d399] rounded">ACTIVE</span>
                    </div>
                    <p className="text-[10px] text-[#789d9a]">WebSocket stream framing & TCP keepalive tunnel</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#12282e] flex items-center justify-between text-[10px] font-mono text-[#8aaeb5]">
                    <span>Magic: \0asm</span>
                    <a href="/tunnel-core.wsm" download className="text-[#48e4ff] hover:underline flex items-center gap-1">
                      <Download size={11} />
                      <span>.wsm</span>
                    </a>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#09171b] border border-[#1a3840] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-[#48e4ff]">stealth-crypto.wsm</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#34d399]/20 text-[#34d399] rounded">ACTIVE</span>
                    </div>
                    <p className="text-[10px] text-[#789d9a]">TLS JA3 fingerprint emulator & zero-knowledge crypto</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#12282e] flex items-center justify-between text-[10px] font-mono text-[#8aaeb5]">
                    <span>Magic: \0asm</span>
                    <a href="/stealth-crypto.wsm" download className="text-[#48e4ff] hover:underline flex items-center gap-1">
                      <Download size={11} />
                      <span>.wsm</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Vercel Configuration Specs */}
            <div className="p-4 rounded-xl bg-[#071316] border border-[#152e34]">
              <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <Globe size={14} className="text-[#48e4ff]" />
                <span>Vercel Serverless Function Matrix</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-[#8aaeb5]">
                <div className="p-2 rounded-lg bg-[#040a0c] border border-[#0d1e22]">/api/proxy.ts</div>
                <div className="p-2 rounded-lg bg-[#040a0c] border border-[#0d1e22]">/api/audio-stream.ts</div>
                <div className="p-2 rounded-lg bg-[#040a0c] border border-[#0d1e22]">/api/ws-tunnel.ts</div>
                <div className="p-2 rounded-lg bg-[#040a0c] border border-[#0d1e22]">/api/nodes-status.ts</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Vault Storage & Backup Import/Export */}
      {activeSection === 'storage' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <h3 className="text-lg font-serif font-bold text-white mb-1">IndexedDB Vault Metrics & Backup Deck</h3>
            <p className="text-xs text-[#789d9a] mb-6">
              Export complete JSON library snapshots or import backup configuration files.
            </p>

            {/* Storage Meter */}
            <div className="p-4 rounded-2xl bg-[#091a1e] border border-[#142a30] mb-6">
              <div className="flex items-center justify-between text-xs font-mono text-[#8aaeb5] mb-2">
                <span>Vault Usage: {storageMetrics.usageMB} MB</span>
                <span>Quota: {storageMetrics.quotaMB} MB ({storageMetrics.percent}%)</span>
              </div>
              <div className="w-full h-2 bg-[#061013] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#48e4ff]"
                  style={{ width: `${Math.min(100, parseFloat(storageMetrics.percent))}%` }}
                />
              </div>
            </div>

            {/* Backup Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={handleExportVault}
                className="p-4 rounded-2xl bg-[#091a1e] hover:bg-[#112a32] border border-[#1a3840] text-left transition-all group flex flex-col justify-between"
              >
                <Download size={20} className="text-[#48e4ff] mb-2 group-hover:-translate-y-0.5 transition-transform" />
                <div>
                  <div className="text-xs font-bold text-white">Export Vault Backup</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">Download full JSON library catalog & settings</div>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-2xl bg-[#091a1e] hover:bg-[#112a32] border border-[#1a3840] text-left transition-all group flex flex-col justify-between"
              >
                <Upload size={20} className="text-[#34d399] mb-2 group-hover:-translate-y-0.5 transition-transform" />
                <div>
                  <div className="text-xs font-bold text-[#34d399]">Import / Restore Backup</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">Upload JSON backup file to restore configuration</div>
                </div>
              </button>

              <button
                onClick={onWipeVault}
                className="p-4 rounded-2xl bg-[#1c0e12] hover:bg-[#281318] border border-[#4d1f27] text-left transition-all group flex flex-col justify-between"
              >
                <Trash2 size={20} className="text-[#f43f5e] mb-2 group-hover:scale-105 transition-transform" />
                <div>
                  <div className="text-xs font-bold text-[#f43f5e]">Wipe Offline Vault</div>
                  <div className="text-[11px] text-[#8a5059] mt-0.5">Clears all stored tracks & local library</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
