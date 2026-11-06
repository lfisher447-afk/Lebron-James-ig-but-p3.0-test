import React from 'react';
import { Sparkles, Calendar, CheckCircle2, Shield, Tv, Film, Cpu, Zap, X } from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CHANGELOG_ENTRIES = [
  {
    version: 'v4.5.0-ULTIMATE',
    date: '2026-10-23',
    badge: 'Major Release',
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    title: 'Movies & Cinema Hub, Multi-Model AI Engine & Infinite Invidious Streamer',
    highlights: [
      'Movies & Cinema Hub Tab: Full TMDB integration with 15+ protected & undetectable streaming server mirrors (VidSrc, Embed.su, AutoEmbed, Multiembed, SmashyStream, etc.).',
      'YouTube Channel Profile Inspector: View any YouTube channel, browse uploads from most recent, search within channels, and filter by popularity.',
      'Infinite Autoloading Search: Autoload next page of YouTube & Invidious search results seamlessly as you scroll down.',
      'Explicit Upload Dates: Display exact published dates (e.g. Oct 14, 2024 - 2 years ago) on all video cards and player details.',
      'Multi-Model AI Rework: Gemini 3.8 Flash (Grounded Search), Gemini 4 Argon (Complex Reasoning), Gemini 3.1 Flash Lite, and Gemini 3.8 TTS voice synthesis.',
      'Virtual Multi-Tab Browser Workspace: Internal SPA canvas tab manager supporting unlimited tab instances with independent URL navigation and proxy node selector.',
      'Dedicated Changelog & System Updates: Complete release timeline and security advisory logs.',
    ],
  },
  {
    version: 'v4.2.0-DETACHED',
    date: '2026-10-20',
    badge: 'Security Patch',
    color: 'bg-[#48e4ff]/20 text-[#48e4ff] border-[#48e4ff]/30',
    title: 'Innertube 12-Node Decoupled Stream Matrix & Web Audio DSP',
    highlights: [
      'Universal Stream Deciphering: Direct URL deciphering without embeds, routing streams through node mirrors.',
      '5-Band Hardware Web Audio DSP: Custom Biquad equalizer filters, spatial stereo widening, and dynamic compression.',
      'IndexedDB Hybrid Storage: Offline persistence for tracks, playlists, and settings with local fallback.',
      'About:Blank Stealth Cloaking: Automatic about:blank launcher and domain mask.',
    ],
  },
  {
    version: 'v4.0.0-CORE',
    date: '2026-10-15',
    badge: 'Base Build',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    title: 'Spotui Signal Room Architecture & Spotify Keyless Resolver',
    highlights: [
      'Spotify Public Resolver: Keyless resolution of Spotify tracks, albums, and playlists into YouTube audio streams.',
      '12-Server Proxy Matrix: Real-time latency benchmarking across global nodes.',
      'WebSocket Tunneling: Fallback HTTP/SSE longpoll tunnel dispatcher.',
    ],
  },
];

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#07171a] border border-[#163a43] rounded-3xl shadow-2xl flex flex-col overflow-hidden select-none">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#13323a] flex items-center justify-between bg-[#040e10]">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-[#48e4ff]/10 border border-[#48e4ff]/30 text-[#48e4ff]">
              <Sparkles size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">System Changelog & Release Notes</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v4.5.0-ULTIMATE
                </span>
              </div>
              <p className="text-xs text-[#789d9a] mt-0.5">
                Complete timeline of updates, architectural patches, and newly deployed modules
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#0a2024] hover:bg-[#12333b] text-zinc-400 hover:text-white transition border border-[#163840]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content - Scrollable Changelog List */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {CHANGELOG_ENTRIES.map((entry) => (
            <div
              key={entry.version}
              className="p-5 rounded-2xl bg-[#091f24] border border-[#183d46] space-y-3 relative overflow-hidden group shadow-lg"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#123138] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-sm text-white">{entry.version}</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${entry.color}`}>
                    {entry.badge}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono text-[#789d9a]">
                  <Calendar size={13} />
                  <span>{entry.date}</span>
                </div>
              </div>

              <h3 className="font-bold text-sm text-[#48e4ff]">{entry.title}</h3>

              <ul className="space-y-2 text-xs text-zinc-300">
                {entry.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 leading-relaxed">
                    <CheckCircle2 size={14} className="text-[#48e4ff] shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#13323a] bg-[#040e10] flex items-center justify-between text-xs text-[#789d9a] font-mono">
          <span>Current Active Protocol: Innertube Mesh v4.5</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#48e4ff] hover:bg-[#32c8e3] text-[#051a20] font-bold rounded-xl transition"
          >
            Close Logs
          </button>
        </div>
      </div>
    </div>
  );
};
