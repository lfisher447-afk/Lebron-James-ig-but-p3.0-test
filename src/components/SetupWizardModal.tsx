import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Server,
  Sliders,
  Palette,
  CheckCircle2,
  Zap,
  ArrowRight,
  Shield,
  Volume2,
  Radio,
  Tv,
  X,
} from 'lucide-react';
import { YOUTUBE_PROXY_SERVERS, setActiveServerId, getActiveServerId } from '../lib/innertube/servers';
import { AppSettings, ThemePalette } from '../types';

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServerId, setSelectedServerId] = useState(getActiveServerId());
  const [selectedPalette, setSelectedPalette] = useState<ThemePalette>(settings.theme.palette || 'cyan');
  const [selectedEqPreset, setSelectedEqPreset] = useState<'neutral' | 'bass' | 'studio' | 'vocal'>('studio');

  if (!isOpen) return null;

  const handleFinishSetup = () => {
    setActiveServerId(selectedServerId);

    // Update settings
    let eqSettings = { ...settings.eq };
    if (selectedEqPreset === 'bass') {
      eqSettings = { ...eqSettings, enabled: true, bandCount: 5, gains: [6, 3, 0, 1, 2], bass: 6, lowMid: 3, vocal: 0, highMid: 1, treble: 2 };
    } else if (selectedEqPreset === 'studio') {
      eqSettings = { ...eqSettings, enabled: true, bandCount: 5, gains: [2, 0, 1, 2, 3], bass: 2, lowMid: 0, vocal: 1, highMid: 2, treble: 3 };
    } else if (selectedEqPreset === 'vocal') {
      eqSettings = { ...eqSettings, enabled: true, bandCount: 5, gains: [-1, 1, 5, 3, 2], bass: -1, lowMid: 1, vocal: 5, highMid: 3, treble: 2 };
    } else {
      eqSettings = { ...eqSettings, enabled: true, bandCount: 5, gains: [0, 0, 0, 0, 0], bass: 0, lowMid: 0, vocal: 0, highMid: 0, treble: 0 };
    }

    onUpdateSettings({
      ...settings,
      theme: {
        ...settings.theme,
        palette: selectedPalette,
      },
      eq: eqSettings,
    });

    localStorage.setItem('spotui_setup_completed', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#081518] border border-[#1a3d46] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Banner */}
        <div className="bg-gradient-to-r from-[#0d2328] via-[#102e35] to-[#0d2328] px-8 py-6 border-b border-[#183d47] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#22d3ee]/20 border border-[#22d3ee]/40 text-[#22d3ee] shadow-inner">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono tracking-widest text-[#22d3ee] font-bold">
                First-Time Configuration Wizard
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Spotui Web Setup</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Step {currentStep} of 4</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-zinc-400 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Wizard Progress Bar */}
        <div className="w-full bg-[#061214] h-1.5 flex">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-full flex-1 transition-all duration-300 ${
                step <= currentStep ? 'bg-[#22d3ee]' : 'bg-[#102428]'
              }`}
            />
          ))}
        </div>

        {/* Wizard Step Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: Welcome & Philosophy */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center max-w-lg mx-auto space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-[#22d3ee]/10 border border-[#22d3ee]/30 flex items-center justify-center text-[#22d3ee] mx-auto shadow-lg shadow-cyan-950/50">
                  <Shield size={32} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-white">
                  Zero Keys. Full Freedom.
                </h3>
                <p className="text-xs text-[#789d9a] leading-relaxed">
                  Spotui Web operates entirely through server-side reverse proxies and keyless InnerTube stream decipher engines. No YouTube API keys or Spotify developer accounts required.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#0c1f24] border border-[#183c45] space-y-2">
                  <div className="flex items-center gap-2 text-[#22d3ee] font-bold text-xs">
                    <Radio size={16} /> Keyless Innertube
                  </div>
                  <p className="text-[11px] text-[#789d9a] leading-normal">
                    Parses YouTube & Spotify tracks directly without rate limits or quotas.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#0c1f24] border border-[#183c45] space-y-2">
                  <div className="flex items-center gap-2 text-[#22d3ee] font-bold text-xs">
                    <Server size={16} /> 12 Proxy Nodes
                  </div>
                  <p className="text-[11px] text-[#789d9a] leading-normal">
                    Active stream balancing across Invidious, Piped, Cobalt, and WISP WebSocket tunnels.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#0c1f24] border border-[#183c45] space-y-2">
                  <div className="flex items-center gap-2 text-[#22d3ee] font-bold text-xs">
                    <Sliders size={16} /> 5-Band Audio DSP
                  </div>
                  <p className="text-[11px] text-[#789d9a] leading-normal">
                    Real-time equalizer, spatial reverb, and dynamic compression.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Select Default Proxy Node (12 Servers) */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Server size={18} className="text-[#22d3ee]" /> Select Active YouTube Proxy Server
                </h3>
                <p className="text-xs text-[#789d9a]">
                  Choose your primary stream node. You can switch between all 12 servers anytime from the YouTube player subpage or Settings.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                {YOUTUBE_PROXY_SERVERS.map((server) => {
                  const isSelected = selectedServerId === server.id;
                  return (
                    <div
                      key={server.id}
                      onClick={() => setSelectedServerId(server.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-[#123138] border-[#22d3ee] shadow-lg shadow-cyan-950/40'
                          : 'bg-[#0a1b1e] border-[#153840] hover:border-[#22d3ee]/50'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'border-[#22d3ee] bg-[#22d3ee] text-black'
                            : 'border-zinc-600'
                        }`}
                      >
                        {isSelected && <CheckCircle2 size={12} className="stroke-[3]" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">{server.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-[#22d3ee]">
                            {server.region}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#789d9a] line-clamp-1">
                          {server.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Audio DSP & Equalizer Preset */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Volume2 size={18} className="text-[#22d3ee]" /> Audio Quality & DSP Tuning
                </h3>
                <p className="text-xs text-[#789d9a]">
                  Select your default Web Audio equalizer curve and stream processing profile.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    id: 'studio',
                    title: 'Studio Clarity (Recommended)',
                    desc: 'Balanced acoustic response with crisp high-end and tight bass punch.',
                  },
                  {
                    id: 'bass',
                    title: 'Deep Bass Boost',
                    desc: 'Enhanced sub-bass frequencies (+6dB) for electronic, hip-hop, and synthwave.',
                  },
                  {
                    id: 'vocal',
                    title: 'Vocal & Podcast Polish',
                    desc: 'Midrange frequency boost (+5dB) for crystal clear vocal separation.',
                  },
                  {
                    id: 'neutral',
                    title: 'Flat Audio Pass-Through',
                    desc: 'Zero EQ coloration for reference monitoring.',
                  },
                ].map((preset) => {
                  const isSelected = selectedEqPreset === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedEqPreset(preset.id as any)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? 'bg-[#123138] border-[#22d3ee] shadow-lg shadow-cyan-950/40'
                          : 'bg-[#0a1b1e] border-[#153840] hover:border-[#22d3ee]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs text-white">
                        <span>{preset.title}</span>
                        {isSelected && <Zap size={14} className="text-[#22d3ee]" />}
                      </div>
                      <p className="text-[11px] text-[#789d9a] leading-normal">{preset.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Interface Theme */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Palette size={18} className="text-[#22d3ee]" /> Theme Accent & Layout Style
                </h3>
                <p className="text-xs text-[#789d9a]">
                  Personalize your visual atmosphere with custom accent palettes.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'cyan', name: 'Cyber Cyan', color: '#22d3ee' },
                  { id: 'emerald', name: 'Obsidian Emerald', color: '#10b981' },
                  { id: 'purple', name: 'Synthwave Purple', color: '#a855f7' },
                  { id: 'rose', name: 'Neon Crimson', color: '#f43f5e' },
                  { id: 'amber', name: 'Solar Amber', color: '#f59e0b' },
                ].map((theme) => {
                  const isSelected = selectedPalette === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => setSelectedPalette(theme.id as any)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-[#123138] border-[#22d3ee] shadow-lg'
                          : 'bg-[#0a1b1e] border-[#153840] hover:border-[#22d3ee]/50'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-2xl shadow-inner border border-white/20"
                        style={{ backgroundColor: theme.color }}
                      />
                      <span className="text-xs font-bold text-white">{theme.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-[#050e10] px-8 py-5 border-t border-[#122e35] flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-5 py-2.5 rounded-xl bg-[#0e2226] border border-[#1b3e47] text-xs font-bold text-zinc-300 hover:text-white transition"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="px-6 py-2.5 rounded-xl bg-[#22d3ee] hover:bg-[#06b6d4] text-black font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-950/50"
            >
              <span>Next Step</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleFinishSetup}
              className="px-8 py-2.5 rounded-xl bg-[#22d3ee] hover:bg-[#06b6d4] text-black font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-950/50"
            >
              <span>Complete Setup & Enter Studio</span>
              <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
