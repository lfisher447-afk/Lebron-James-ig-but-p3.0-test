import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  Zap,
  Activity,
  Compass,
  RotateCcw,
  Volume2,
  Play,
  Pause,
  Radio,
  Music2,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  Wand2,
  Maximize2,
  Copy,
  Download,
  Upload,
  BarChart2,
  Shuffle,
  TrendingUp,
  TrendingDown,
  Volume1,
  RefreshCw,
  Bookmark,
  Trash2,
} from 'lucide-react';
import { AppSettings, EQBandCount, SpatialMode, Track } from '../types';
import { audioEngine } from '../lib/audioEngine';
import { saveEqPreset, getAllEqPresets, deleteEqPreset, onDBChange } from '../lib/db';
import {
  BAND_CONFIGURATIONS,
  SUPPORTED_BAND_COUNTS,
  MASTER_EQ_PRESETS,
  formatFreq,
  interpolateGainsForBands,
  transformGains,
  calculateAutoGainCompensation,
  EQPresetDef,
} from '../lib/eqConfig';

interface AudioDspModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  currentTrack?: Track | null;
}

export const AudioDspModal: React.FC<AudioDspModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  currentTrack,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'eq' | 'spatial' | 'compressor' | 'analyzer'>('eq');
  const [playingTone, setPlayingTone] = useState<string | null>(null);
  const [presetCategory, setPresetCategory] = useState<string>('All');
  const [presetSearch, setPresetSearch] = useState('');
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [analyzerFftSize, setAnalyzerFftSize] = useState<number>(512);
  const [gainReductionDb, setGainReductionDb] = useState<number>(0);
  const [peakFrequencyHz, setPeakFrequencyHz] = useState<number>(0);
  const [customPresets, setCustomPresets] = useState<EQPresetDef[]>([]);
  const [customPresetName, setCustomPresetName] = useState('');
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
  const [soundstageX, setSoundstageX] = useState<number>(0);
  const [soundstageY, setSoundstageY] = useState<number>(0);
  const [soundstageZ, setSoundstageZ] = useState<number>(-1);

  useEffect(() => {
    if (isOpen) {
      getAllEqPresets().then((presets) => setCustomPresets(presets)).catch(() => {});
    }
    const unsub = onDBChange((ev) => {
      if (ev === 'presets-changed') {
        getAllEqPresets().then((presets) => setCustomPresets(presets)).catch(() => {});
      }
    });
    return unsub;
  }, [isOpen]);

  // Safe settings accessors to prevent any render crash
  const eqSettings = settings?.eq || {
    enabled: true,
    bandCount: 5,
    gains: [0, 0, 0, 0, 0],
    modeGains: { 5: [0, 0, 0, 0, 0] },
    bass: 0,
    lowMid: 0,
    vocal: 0,
    highMid: 0,
    treble: 0,
    preAmpGain: 0,
    autoGainCompensation: true,
  };

  const spatialSettings = settings?.spatial || {
    mode: 'off' as SpatialMode,
    stereoWidth: 100,
    reverbWet: 0.1,
  };

  const compressorSettings = settings?.compressor || {
    enabled: true,
    threshold: -12,
    ratio: 3,
  };

  // Active band count and configuration
  const activeBandCount: EQBandCount = (eqSettings.bandCount as EQBandCount) || 5;
  const currentBandDefs = useMemo(() => {
    return BAND_CONFIGURATIONS[activeBandCount] || BAND_CONFIGURATIONS[5];
  }, [activeBandCount]);

  // Current active gains array for the current band count
  const currentGains = useMemo(() => {
    if (Array.isArray(eqSettings.gains) && eqSettings.gains.length === activeBandCount) {
      return eqSettings.gains.map((g) => (typeof g === 'number' && !isNaN(g) ? g : 0));
    }
    if (eqSettings.modeGains && Array.isArray(eqSettings.modeGains[activeBandCount])) {
      return eqSettings.modeGains[activeBandCount]!.map((g) => (typeof g === 'number' && !isNaN(g) ? g : 0));
    }
    // Fallback if legacy 5-band properties exist
    if (activeBandCount === 5) {
      return [
        eqSettings.bass ?? 0,
        eqSettings.lowMid ?? 0,
        eqSettings.vocal ?? 0,
        eqSettings.highMid ?? 0,
        eqSettings.treble ?? 0,
      ];
    }
    return new Array(activeBandCount).fill(0);
  }, [eqSettings, activeBandCount]);

  // Calculated auto gain offset
  const autoGainOffset = useMemo(() => {
    return calculateAutoGainCompensation(currentGains);
  }, [currentGains]);

  // Handle band count switch with curve preservation/interpolation
  const handleSelectBandCount = (count: EQBandCount) => {
    if (count === activeBandCount) return;

    let targetGains: number[];
    if (settings.eq.modeGains && settings.eq.modeGains[count]) {
      targetGains = settings.eq.modeGains[count]!;
    } else {
      // Intelligently interpolate existing curve to new band count
      const existingBands = currentBandDefs;
      const points = existingBands.map((b, i) => ({
        freq: b.freq,
        gain: currentGains[i] ?? 0,
      }));
      targetGains = interpolateGainsForBands(count, points);
    }

    onUpdateSettings((prev) => {
      const updatedModeGains = {
        ...(prev.eq.modeGains || {}),
        [activeBandCount]: currentGains,
        [count]: targetGains,
      };

      return {
        ...prev,
        eq: {
          ...prev.eq,
          bandCount: count,
          gains: targetGains,
          modeGains: updatedModeGains,
          // Sync legacy 5-band keys if switching to or from 5 bands
          ...(count === 5
            ? {
                bass: targetGains[0],
                lowMid: targetGains[1],
                vocal: targetGains[2],
                highMid: targetGains[3],
                treble: targetGains[4],
              }
            : {}),
        },
      };
    });
  };

  // Update single band gain
  const handleBandGainChange = (bandIndex: number, gainVal: number) => {
    const clampedGain = Math.max(-12, Math.min(12, Math.round(gainVal * 10) / 10));
    const newGains = [...currentGains];
    newGains[bandIndex] = clampedGain;

    onUpdateSettings((prev) => {
      const updatedModeGains = {
        ...(prev.eq.modeGains || {}),
        [activeBandCount]: newGains,
      };

      return {
        ...prev,
        eq: {
          ...prev.eq,
          gains: newGains,
          modeGains: updatedModeGains,
          activePreset: undefined,
          ...(activeBandCount === 5
            ? {
                bass: newGains[0],
                lowMid: newGains[1],
                vocal: newGains[2],
                highMid: newGains[3],
                treble: newGains[4],
              }
            : {}),
        },
      };
    });
  };

  // Apply master preset with curve interpolation
  const handleApplyPreset = (presetKey: string) => {
    const preset = MASTER_EQ_PRESETS[presetKey];
    if (!preset) return;

    const targetGains = interpolateGainsForBands(activeBandCount, preset.points);

    onUpdateSettings((prev) => ({
      ...prev,
      eq: {
        ...prev.eq,
        enabled: true,
        activePreset: presetKey,
        gains: targetGains,
        modeGains: {
          ...(prev.eq.modeGains || {}),
          [activeBandCount]: targetGains,
        },
        ...(activeBandCount === 5
          ? {
              bass: targetGains[0],
              lowMid: targetGains[1],
              vocal: targetGains[2],
              highMid: targetGains[3],
              treble: targetGains[4],
            }
          : {}),
      },
    }));
  };

  // Save current curve to dedicated IndexedDB EQ presets store
  const handleSaveCustomPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = customPresetName.trim() || `Custom ${activeBandCount}B Curve`;
    const presetId = `eq_custom_${Date.now()}`;
    const newPreset: EQPresetDef = {
      id: presetId,
      name,
      category: 'Custom',
      description: `User-crafted ${activeBandCount}-band custom equalization curve`,
      points: currentBandDefs.map((b, i) => ({ freq: b.freq, gain: currentGains[i] ?? 0 })),
      bandCount: activeBandCount,
      preAmpGain: eqSettings.preAmpGain || 0,
      autoGainCompensation: eqSettings.autoGainCompensation || false,
      qFactorMultiplier: (eqSettings as any).qFactorMultiplier || 1.0,
      isCustom: true,
      createdAt: Date.now(),
    };

    await saveEqPreset(newPreset);
    setCustomPresets((prev) => [newPreset, ...prev]);
    setCustomPresetName('');
    setShowSavePresetDialog(false);
    setCopiedStatus(`Saved "${name}" to Dedicated IndexedDB Vault!`);
    setTimeout(() => setCopiedStatus(null), 3000);
  };

  const handleDeleteCustomPreset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteEqPreset(id);
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
  };

  // Transform current gains (flatten, invert, smooth, tilts, boosts)
  const handleTransform = (
    action: 'flatten' | 'invert' | 'smooth' | 'bass-tilt' | 'treble-tilt' | 'boost-3db' | 'cut-3db' | 'random'
  ) => {
    const newGains = transformGains(currentGains, action, 12);
    onUpdateSettings((prev) => ({
      ...prev,
      eq: {
        ...prev.eq,
        gains: newGains,
        activePreset: action === 'flatten' ? 'Flat Reference' : undefined,
        modeGains: {
          ...(prev.eq.modeGains || {}),
          [activeBandCount]: newGains,
        },
        ...(activeBandCount === 5
          ? {
              bass: newGains[0],
              lowMid: newGains[1],
              vocal: newGains[2],
              highMid: newGains[3],
              treble: newGains[4],
            }
          : {}),
      },
    }));
  };

  // Test tone / Noise generation handlers
  const handleToggleTestTone = (label: string, freq?: number, type: OscillatorType = 'sine') => {
    if (playingTone === label) {
      audioEngine.stopTestTone();
      setPlayingTone(null);
    } else {
      if (label === 'pink-noise') {
        audioEngine.playPinkNoise();
      } else if (label === 'sweep') {
        audioEngine.playSweep(4);
      } else if (freq) {
        audioEngine.playTestTone(freq, type);
      }
      setPlayingTone(label);
    }
  };

  // Export EQ curve to clipboard
  const handleExportEQ = () => {
    const exportData = {
      name: eqSettings.activePreset || 'Custom Spotui Curve',
      bandCount: activeBandCount,
      gains: currentGains,
      preAmpGain: eqSettings.preAmpGain || 0,
      autoGainCompensation: eqSettings.autoGainCompensation || false,
      qFactorMultiplier: (eqSettings as any).qFactorMultiplier || 1.0,
      bands: currentBandDefs.map((b, i) => ({
        freq: b.freq,
        label: b.label,
        gain: currentGains[i] ?? 0,
      })),
      timestamp: Date.now(),
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopiedStatus('Exported JSON to Clipboard!');
    setTimeout(() => setCopiedStatus(null), 2500);
  };

  // Import custom JSON curve
  const handleImportEQ = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (Array.isArray(parsed.gains)) {
        const importGains: number[] = parsed.gains.map((g: any) =>
          typeof g === 'number' ? Math.max(-12, Math.min(12, g)) : 0
        );

        let finalCount: EQBandCount = activeBandCount;
        if (SUPPORTED_BAND_COUNTS.includes(parsed.bandCount)) {
          finalCount = parsed.bandCount;
        } else if (SUPPORTED_BAND_COUNTS.includes(importGains.length as any)) {
          finalCount = importGains.length as any;
        }

        onUpdateSettings((prev) => ({
          ...prev,
          eq: {
            ...prev.eq,
            enabled: true,
            bandCount: finalCount,
            gains: importGains,
            preAmpGain: typeof parsed.preAmpGain === 'number' ? parsed.preAmpGain : prev.eq.preAmpGain,
            autoGainCompensation: Boolean(parsed.autoGainCompensation),
            activePreset: parsed.name || 'Imported User Preset',
            modeGains: {
              ...(prev.eq.modeGains || {}),
              [finalCount]: importGains,
            },
          },
        }));

        setShowImportDialog(false);
        setImportJsonText('');
        setCopiedStatus('Preset Loaded Successfully!');
        setTimeout(() => setCopiedStatus(null), 2500);
      } else {
        alert('Invalid preset JSON. Missing "gains" array.');
      }
    } catch (e) {
      alert('Failed to parse JSON preset. Please check formatting.');
    }
  };

  const lastThrottledUpdateRef = useRef<number>(0);

  // Real-time canvas spectrum visualization loop
  useEffect(() => {
    if (!isOpen) return;

    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      try {
        const freqData = audioEngine.getFrequencyData();
        const width = canvas.width;
        const height = canvas.height;

        // Throttle React state updates to 4 FPS max to prevent UI freeze
        const now = Date.now();
        if (now - lastThrottledUpdateRef.current > 250) {
          lastThrottledUpdateRef.current = now;
          const red = audioEngine.getCompressionReduction();
          setGainReductionDb(Math.round(red * 10) / 10);

          let maxBinVal = 0;
          let maxBinIdx = 0;
          for (let i = 0; i < freqData.length; i++) {
            if (freqData[i] > maxBinVal) {
              maxBinVal = freqData[i];
              maxBinIdx = i;
            }
          }
          if (maxBinVal > 30) {
            const nyquist = 24000;
            const estHz = Math.round((maxBinIdx / freqData.length) * nyquist);
            setPeakFrequencyHz(estHz);
          }
        }

        ctx.clearRect(0, 0, width, height);

        // Grid background lines
        ctx.strokeStyle = 'rgba(72, 228, 255, 0.07)';
        ctx.lineWidth = 1;

        // Horizontal dB guidelines (+12dB, +6dB, 0dB, -6dB, -12dB)
        const dBLabels = ['+12dB', '+6dB', '0dB', '-6dB', '-12dB'];
        const dbYSteps = [
          0.08 * height,
          0.28 * height,
          0.5 * height,
          0.72 * height,
          0.92 * height,
        ];

        dbYSteps.forEach((y, i) => {
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = i === 2 ? 'rgba(72, 228, 255, 0.4)' : 'rgba(120, 157, 154, 0.25)';
          ctx.font = '9px monospace';
          ctx.fillText(dBLabels[i], 8, y - 2);
        });

        // Frequency spectrum bars (64 bars)
        const barCount = 64;
        const barSpacing = 2;
        const barWidth = (width - (barCount - 1) * barSpacing) / barCount;

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * (freqData.length * 0.8));
          const val = freqData[dataIndex] || 0;
          const percent = val / 255;
          const barHeight = Math.max(2, percent * (height * 0.85));

          const x = i * (barWidth + barSpacing);
          const y = height - barHeight;

          const grad = ctx.createLinearGradient(0, height, 0, 0);
          grad.addColorStop(0, '#04171d');
          grad.addColorStop(0.3, '#0e4250');
          grad.addColorStop(0.7, '#38bdf8');
          grad.addColorStop(1, '#86efac');

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barHeight);
        }

        // Draw active multi-band response curve overlay
        if (eqSettings.enabled && currentBandDefs.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = '#48e4ff';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#48e4ff';
          ctx.shadowBlur = 10;

          const points: { x: number; y: number }[] = [];

          currentBandDefs.forEach((def, idx) => {
            const gain = currentGains[idx] ?? 0;
            const logMin = Math.log10(20);
            const logMax = Math.log10(20000);
            const logF = Math.log10(Math.max(20, Math.min(20000, def.freq)));
            const normX = (logF - logMin) / (logMax - logMin);

            const ptX = normX * (width - 40) + 20;
            const ptY = height * 0.5 - (gain / 12) * (height * 0.4);

            points.push({ x: ptX, y: ptY });
          });

          const validPoints = points.filter((pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y));

          if (validPoints.length > 1) {
            ctx.moveTo(validPoints[0].x, validPoints[0].y);
            for (let i = 0; i < validPoints.length - 1; i++) {
              const p0 = i > 0 ? validPoints[i - 1] : validPoints[i];
              const p1 = validPoints[i];
              const p2 = validPoints[i + 1];
              const p3 = i < validPoints.length - 2 ? validPoints[i + 2] : p2;

              const cp1x = p1.x + (p2.x - p0.x) / 6;
              const cp1y = p1.y + (p2.y - p0.y) / 6;
              const cp2x = p2.x - (p3.x - p1.x) / 6;
              const cp2y = p2.y - (p3.y - p1.y) / 6;

              ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
            }
            ctx.stroke();

            validPoints.forEach((pt) => {
              ctx.beginPath();
              ctx.fillStyle = '#ffffff';
              ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#0e3843';
              ctx.lineWidth = 1.5;
              ctx.stroke();
            });
          } else if (validPoints.length === 1) {
            ctx.beginPath();
            ctx.fillStyle = '#ffffff';
            ctx.arc(validPoints[0].x, validPoints[0].y, 4, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.shadowBlur = 0;
        }
      } catch (err) {
        // Suppress any non-fatal animation frame draw glitches
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      audioEngine.stopTestTone();
    };
  }, [isOpen, eqSettings.enabled, activeBandCount, currentGains, currentBandDefs]);

  // Filtered preset list combining built-in and IndexedDB custom presets
  const filteredPresets = useMemo(() => {
    const list: Array<{
      key: string;
      name: string;
      category: string;
      description: string;
      points?: any;
      gains?: any;
      isCustom?: boolean;
      id?: string;
    }> = [];

    customPresets.forEach((cp) => {
      list.push({
        key: cp.id || cp.name,
        name: cp.name,
        category: 'Custom',
        description: cp.description || `Custom ${cp.bandCount || activeBandCount}-band curve`,
        points: cp.points,
        gains: cp.gains,
        isCustom: true,
        id: cp.id,
      });
    });

    Object.entries(MASTER_EQ_PRESETS).forEach(([key, p]) => {
      list.push({
        key,
        name: p.name,
        category: p.category,
        description: p.description,
        points: p.points,
        isCustom: false,
      });
    });

    return list.filter((p) => {
      const matchesCategory = presetCategory === 'All' || p.category === presetCategory;
      const matchesSearch =
        presetSearch === '' ||
        p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(presetSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [customPresets, presetCategory, presetSearch, activeBandCount]);

  if (!isOpen) return null;

  return (
    <div
      id="audio-dsp-modal"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 select-none animate-in fade-in duration-200"
    >
      <div className="bg-gradient-to-b from-[#09171b] via-[#061215] to-[#040e11] border border-[#234b54] rounded-3xl w-full max-w-5xl p-5 md:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col max-h-[94vh]">
        {/* Ambient Top Glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#48e4ff]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#34d399]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#183942] relative z-10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#143e47] to-[#0a1f24] border border-[#48e4ff]/40 flex items-center justify-center text-[#48e4ff] shadow-lg shadow-cyan-500/20">
              <Sliders size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-serif font-bold text-white tracking-tight">
                  Spotui Multi-Band Studio DSP Deck
                </h2>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-[#48e4ff] border border-cyan-500/30 font-bold">
                  {activeBandCount}-BAND ACTIVE
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#34d399] border border-emerald-500/30">
                  {audioEngine.getSampleRate()}Hz 32-Bit Float
                </span>
              </div>
              <p className="text-xs text-[#8aaeb5] mt-0.5">
                Switchable 5, 7, 10, 12, 15, 20 & 31-Band Parametric Equalizer, Spatial Acoustics & Dynamic Limiting
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              audioEngine.stopTestTone();
              onClose();
            }}
            className="p-2 rounded-xl bg-[#0e242a] text-[#789d9a] hover:text-white hover:bg-[#153842] transition-colors cursor-pointer"
            title="Close Equalizer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Primary Tabs Navigation */}
        <div className="flex items-center justify-between gap-2 pt-3 pb-2 border-b border-[#143139] shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('eq')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'eq'
                  ? 'bg-[#48e4ff] text-[#051a20] shadow-md shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0c2227]'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Multi-Band EQ ({activeBandCount}B)</span>
            </button>

            <button
              onClick={() => setActiveTab('spatial')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'spatial'
                  ? 'bg-[#48e4ff] text-[#051a20] shadow-md shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0c2227]'
              }`}
            >
              <Compass size={14} />
              <span>Spatial Acoustics & 3D</span>
            </button>

            <button
              onClick={() => setActiveTab('compressor')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'compressor'
                  ? 'bg-[#48e4ff] text-[#051a20] shadow-md shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0c2227]'
              }`}
            >
              <Activity size={14} />
              <span>Dynamics Limiter</span>
            </button>

            <button
              onClick={() => setActiveTab('analyzer')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'analyzer'
                  ? 'bg-[#48e4ff] text-[#051a20] shadow-md shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-[#0c2227]'
              }`}
            >
              <BarChart2 size={14} />
              <span>RTA Spectrum Diagnostics</span>
            </button>
          </div>

          {/* Quick DSP Power Toggle */}
          <div className="flex items-center gap-3 pr-1">
            <span className="text-[11px] font-mono text-[#789d9a] hidden sm:inline">Master DSP:</span>
            <button
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  eq: { ...prev.eq, enabled: !prev.eq.enabled },
                }))
              }
              className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center cursor-pointer ${
                eqSettings.enabled ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
              }`}
              title="Toggle Master DSP Active / Bypass"
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform ${
                  eqSettings.enabled ? 'translate-x-6 bg-[#051a20]' : 'bg-[#789d9a]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Scrollable Work Area */}
        <div className="flex-1 overflow-y-auto space-y-5 pt-4 pr-1">
          {/* Real-time Spectrum & Response Curve Canvas */}
          <div className="p-4 rounded-2xl bg-[#051114] border border-[#16363e] relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${eqSettings.enabled ? 'bg-[#48e4ff] animate-pulse' : 'bg-zinc-600'}`} />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Live Master Bus FFT Spectrum & {activeBandCount}-Band Curve Plot
                </span>
                {eqSettings.activePreset && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800 text-cyan-300">
                    Preset: {eqSettings.activePreset}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono text-[#789d9a]">
                {peakFrequencyHz > 0 && (
                  <span className="text-emerald-400 font-bold">Peak: {formatFreq(peakFrequencyHz)}</span>
                )}
                {eqSettings.autoGainCompensation && (
                  <span className="text-cyan-300 font-bold">Auto-Comp: {autoGainOffset > 0 ? `+${autoGainOffset}` : autoGainOffset}dB</span>
                )}
                <span>20Hz - 20kHz</span>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={800}
              height={120}
              className="w-full h-28 rounded-xl bg-[#030a0c] border border-[#0e242a]"
            />
          </div>

          {/* TAB 1: MULTI-BAND EQUALIZER */}
          {activeTab === 'eq' && (
            <div className="space-y-5">
              {/* Band Count Selector Matrix (5, 7, 10, 12, 15, 20, 31 Bands) */}
              <div className="p-4 rounded-2xl bg-[#07171a] border border-[#173a43] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Layers size={15} className="text-[#48e4ff]" />
                    <span>Select Equalizer Topology / Band Count:</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#789d9a]">
                    Dynamic Biquad Filter Array
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {SUPPORTED_BAND_COUNTS.map((count) => {
                    const isSelected = activeBandCount === count;
                    return (
                      <button
                        key={count}
                        onClick={() => handleSelectBandCount(count)}
                        className={`py-2.5 px-3 rounded-xl font-mono text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#48e4ff] text-[#051a20] shadow-md shadow-cyan-500/25 border border-cyan-300'
                            : 'bg-[#091f24] hover:bg-[#0f2e36] text-zinc-300 hover:text-white border border-[#183d47]'
                        }`}
                      >
                        <span className="text-sm font-black">{count} BAND</span>
                        <span className={`text-[9px] ${isSelected ? 'text-[#06242b]' : 'text-[#789d9a]'}`}>
                          {count === 5
                            ? 'Parametric'
                            : count === 7
                            ? 'Pro Audio'
                            : count === 10
                            ? '1-Octave'
                            : count === 12
                            ? 'Semi-Graphic'
                            : count === 15
                            ? '2/3-Octave'
                            : count === 20
                            ? 'Mastering'
                            : '1/3-ISO Graphic'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Curve Transformation & Utility Toolbar */}
              <div className="p-3.5 rounded-2xl bg-[#061215] border border-[#15343d] flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono uppercase text-[#789d9a] px-1 font-bold">
                    Curve Tools:
                  </span>

                  <button
                    onClick={() => handleTransform('flatten')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0a1e24] hover:bg-[#143e47] border border-[#193d47] text-[11px] font-mono text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1"
                    title="Reset all band gains to 0 dB"
                  >
                    <RotateCcw size={12} />
                    <span>Flatten (0dB)</span>
                  </button>

                  <button
                    onClick={() => handleTransform('invert')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0a1e24] hover:bg-[#143e47] border border-[#193d47] text-[11px] font-mono text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1"
                    title="Invert current frequency curve (+ to -)"
                  >
                    <Shuffle size={12} />
                    <span>Invert</span>
                  </button>

                  <button
                    onClick={() => handleTransform('smooth')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0a1e24] hover:bg-[#143e47] border border-[#193d47] text-[11px] font-mono text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1"
                    title="Gaussian smooth adjacent band gains"
                  >
                    <Wand2 size={12} />
                    <span>Smooth</span>
                  </button>

                  <button
                    onClick={() => handleTransform('bass-tilt')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0a1e24] hover:bg-[#143e47] border border-[#193d47] text-[11px] font-mono text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1"
                    title="Warm bass tilt slope"
                  >
                    <TrendingUp size={12} />
                    <span>Bass Tilt</span>
                  </button>

                  <button
                    onClick={() => handleTransform('treble-tilt')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0a1e24] hover:bg-[#143e47] border border-[#193d47] text-[11px] font-mono text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1"
                    title="Bright treble tilt slope"
                  >
                    <TrendingDown size={12} />
                    <span>Treble Tilt</span>
                  </button>

                  <button
                    onClick={() => handleTransform('boost-3db')}
                    className="px-2 py-1.5 rounded-lg bg-[#0a1e24] hover:bg-[#143e47] border border-[#193d47] text-[11px] font-mono text-cyan-300 hover:text-white transition cursor-pointer"
                    title="Boost all bands by +3dB"
                  >
                    +3dB All
                  </button>

                  <button
                    onClick={() => handleTransform('cut-3db')}
                    className="px-2 py-1.5 rounded-lg bg-[#0a1e24] hover:bg-[#143e47] border border-[#193d47] text-[11px] font-mono text-amber-300 hover:text-white transition cursor-pointer"
                    title="Cut all bands by -3dB"
                  >
                    -3dB All
                  </button>
                </div>

                {/* Pre-Amp Gain & Auto Gain Toggle */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          eq: { ...prev.eq, autoGainCompensation: !prev.eq.autoGainCompensation },
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        eqSettings.autoGainCompensation
                          ? 'bg-emerald-500/20 text-[#34d399] border border-emerald-500/40'
                          : 'bg-[#0a1e24] text-zinc-400 border border-[#193d47]'
                      }`}
                    >
                      <Sparkles size={11} />
                      <span>Auto-Gain Loudness Comp</span>
                    </button>
                  </div>

                  {/* PreAmp Slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#789d9a]">Pre-Amp:</span>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={eqSettings.preAmpGain ?? 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onUpdateSettings((prev) => ({
                          ...prev,
                          eq: { ...prev.eq, preAmpGain: val },
                        }));
                      }}
                      className="w-20 accent-[#48e4ff] cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-[#48e4ff] font-bold w-12 text-right">
                      {(eqSettings.preAmpGain ?? 0) > 0 ? `+${eqSettings.preAmpGain}` : eqSettings.preAmpGain ?? 0}dB
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Interactive Slider Deck for the Active Band Count */}
              <div className="p-4 md:p-5 rounded-2xl bg-[#061215] border border-[#15343d]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <SlidersHorizontal size={14} className="text-[#48e4ff]" />
                    <span>{activeBandCount}-Band Slider Deck (±12 dB Precision Range)</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#789d9a]">
                    Click dB badge to zero band
                  </span>
                </div>

                {/* Adaptive Scroll / Flex Slider Grid */}
                <div
                  className={`flex gap-2.5 overflow-x-auto pb-3 pt-2 ${
                    activeBandCount <= 7 ? 'justify-around' : 'justify-start'
                  }`}
                >
                  {currentBandDefs.map((band, idx) => {
                    const val = currentGains[idx] ?? 0;
                    const isBoost = val > 0;
                    const isCut = val < 0;

                    return (
                      <div
                        key={`${activeBandCount}-${band.index}-${band.freq}`}
                        className={`p-3 rounded-xl bg-[#081b20] border border-[#193e48] flex flex-col items-center text-center relative group shrink-0 ${
                          activeBandCount >= 20 ? 'min-w-[56px] w-[56px]' : activeBandCount >= 12 ? 'min-w-[64px] w-[64px]' : 'flex-1 min-w-[72px]'
                        }`}
                      >
                        {/* Frequency Header */}
                        <span className="text-[11px] font-mono text-[#48e4ff] font-bold truncate w-full">
                          {band.freqLabel}
                        </span>
                        <span className="text-[9px] font-mono text-[#789d9a] truncate w-full mb-4">
                          {band.label}
                        </span>

                        {/* Vertical Slider */}
                        <div className="h-36 flex items-center justify-center my-3 relative">
                          {/* Center Zero Line Indicator */}
                          <div className="absolute w-full h-[1px] bg-cyan-500/20 top-1/2 pointer-events-none" />

                          <input
                            type="range"
                            min="-12"
                            max="12"
                            step="0.2"
                            disabled={!eqSettings.enabled}
                            value={val}
                            onChange={(e) => {
                              handleBandGainChange(idx, parseFloat(e.target.value));
                            }}
                            className="w-36 -rotate-90 accent-[#48e4ff] cursor-pointer disabled:opacity-30"
                          />
                        </div>

                        {/* Interactive dB readout badge (click to zero) */}
                        <button
                          onClick={() => handleBandGainChange(idx, 0)}
                          disabled={!eqSettings.enabled}
                          className={`mt-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer w-full truncate ${
                            isBoost
                              ? 'bg-cyan-950/80 border-cyan-700 text-[#48e4ff]'
                              : isCut
                              ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                              : 'bg-[#040e11] border-[#14323a] text-zinc-400'
                          }`}
                          title="Click to reset to 0 dB"
                        >
                          {val > 0 ? `+${val}` : val} dB
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Master Presets Browser & Filter */}
              <div className="p-5 rounded-2xl bg-[#07171a] border border-[#173a43] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <Sparkles size={14} className="text-[#48e4ff]" />
                      <span>Pro Mastering & Acoustic EQ Presets (Continuous Interpolation)</span>
                    </h3>
                    <p className="text-[11px] text-[#789d9a] mt-0.5">
                      Curves mathematically project to {activeBandCount} bands in real time.
                    </p>
                  </div>

                  {/* Category Pills & Save Custom Curve Button */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowSavePresetDialog(true)}
                      className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Bookmark size={12} />
                      <span>Save Current Curve to Vault</span>
                    </button>

                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {['All', 'Custom', 'Mastering', 'Electronic', 'Acoustic', 'Vocal', 'Special'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setPresetCategory(cat)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                            presetCategory === cat
                              ? 'bg-[#48e4ff] text-[#051a20]'
                              : 'bg-[#0a1e24] text-zinc-400 hover:text-white'
                          }`}
                        >
                          {cat} {cat === 'Custom' && customPresets.length > 0 && `(${customPresets.length})`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preset Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {filteredPresets.map((p) => {
                    const isCurrent = eqSettings.activePreset === (p.id || p.key || p.name);
                    return (
                      <div
                        key={p.key}
                        onClick={() => {
                          if (p.isCustom) {
                            let targetGains: number[];
                            if (p.points) {
                              targetGains = interpolateGainsForBands(activeBandCount, p.points);
                            } else if (Array.isArray(p.gains) && p.gains.length === activeBandCount) {
                              targetGains = p.gains;
                            } else {
                              targetGains = new Array(activeBandCount).fill(0);
                            }

                            onUpdateSettings((prev) => ({
                              ...prev,
                              eq: {
                                ...prev.eq,
                                enabled: true,
                                activePreset: p.name,
                                gains: targetGains,
                                modeGains: {
                                  ...(prev.eq.modeGains || {}),
                                  [activeBandCount]: targetGains,
                                },
                              },
                            }));
                          } else {
                            handleApplyPreset(p.key);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer group flex flex-col justify-between relative ${
                          isCurrent
                            ? 'bg-[#12363f] border-[#48e4ff] text-white shadow-md shadow-cyan-500/20'
                            : 'bg-[#08181c] hover:bg-[#0f2e36] border-[#163840] hover:border-[#48e4ff]/40 text-[#8aaeb5]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white group-hover:text-[#48e4ff] truncate">
                            {p.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                p.isCustom
                                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                                  : 'bg-[#040e11] text-[#48e4ff] border-cyan-900'
                              }`}
                            >
                              {p.category}
                            </span>
                            {p.isCustom && p.id && (
                              <button
                                onClick={(e) => handleDeleteCustomPreset(p.id!, e)}
                                className="p-1 text-zinc-500 hover:text-rose-400 rounded transition cursor-pointer"
                                title="Delete Custom Preset"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-[#789d9a] line-clamp-2">{p.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPATIAL ACOUSTICS & 3D SOUNDSTAGE */}
          {activeTab === 'spatial' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-[#061215] border border-[#15343d] space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Compass size={16} className="text-[#48e4ff]" />
                    <span>Spatial Acoustics & Binaural 3D Soundstage</span>
                  </h3>
                  <p className="text-xs text-[#789d9a] mt-0.5">
                    Psychoacoustic stereo field widening, binaural room reflections, and virtual venue acoustics.
                  </p>
                </div>

                {/* Spatial Mode Selector Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {[
                    { id: 'off', label: 'Bypass (Off)', desc: 'Standard Direct Stereo' },
                    { id: 'studio', label: 'Studio Room', desc: 'Acoustically Treated' },
                    { id: 'wide', label: 'Ultra-Wide', desc: 'Expanded Pan Field' },
                    { id: 'immersive', label: 'Immersive 3D', desc: 'Binaural Surround' },
                    { id: 'hyper_spatial', label: 'Hyper-Spatial', desc: 'Extreme Soundstage' },
                    { id: 'cinema', label: 'Cinema Hall', desc: 'Deep Spatial Scale' },
                    { id: 'hall', label: 'Symphony Hall', desc: 'Grand Reverb Tail' },
                    { id: 'club', label: 'Binaural Club', desc: 'Sub & Venues Pan' },
                  ].map((m) => {
                    const isSelected = spatialSettings.mode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() =>
                          onUpdateSettings((prev) => ({
                            ...prev,
                            spatial: { ...prev.spatial, mode: m.id as SpatialMode },
                          }))
                        }
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#48e4ff] text-[#051a20] border-cyan-300 shadow-md shadow-cyan-500/25'
                            : 'bg-[#081a1e] text-zinc-300 hover:bg-[#0f2e36] border-[#183d47]'
                        }`}
                      >
                        <div className="text-xs font-bold uppercase truncate">{m.label}</div>
                        <div className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-[#06242b]' : 'text-[#789d9a]'}`}>
                          {m.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Stereo Width Slider */}
                <div className="space-y-2 pt-4 border-t border-[#133139]">
                  <div className="flex items-center justify-between text-xs text-white">
                    <span className="font-bold">Stereo Width Multiplier:</span>
                    <span className="font-mono text-[#48e4ff] font-bold">
                      {spatialSettings.stereoWidth}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="5"
                    value={spatialSettings.stereoWidth}
                    onChange={(e) => {
                      const w = parseInt(e.target.value);
                      onUpdateSettings((prev) => ({
                        ...prev,
                        spatial: { ...prev.spatial, stereoWidth: w },
                      }));
                    }}
                    className="w-full accent-[#48e4ff] cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>0% (Mono Collapsed)</span>
                    <span>100% (Standard Stereo)</span>
                    <span>200% (Ultra-Wide Psychoacoustic)</span>
                  </div>
                </div>

                {/* Ambient Reverb Wetness Slider */}
                <div className="space-y-2 pt-3 border-t border-[#133139]">
                  <div className="flex items-center justify-between text-xs text-white">
                    <span className="font-bold">Acoustic Room Wetness:</span>
                    <span className="font-mono text-[#34d399] font-bold">
                      {Math.round((spatialSettings.reverbWet ?? 0.1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={spatialSettings.reverbWet ?? 0.1}
                    onChange={(e) => {
                      const rw = parseFloat(e.target.value);
                      onUpdateSettings((prev) => ({
                        ...prev,
                        spatial: { ...prev.spatial, reverbWet: rw },
                      }));
                    }}
                    className="w-full accent-[#34d399] cursor-pointer"
                  />
                </div>

                {/* 3D HRTF Soundstage Coordinates & Interactive Orbit Pad */}
                <div className="pt-4 border-t border-[#133139] space-y-3">
                  <div className="flex items-center justify-between text-xs text-white">
                    <span className="font-bold flex items-center gap-1.5">
                      <Compass size={14} className="text-[#48e4ff]" />
                      <span>3D HRTF Spatial Soundstage Panner Coordinates:</span>
                    </span>
                    <span className="font-mono text-[#48e4ff] text-[11px]">
                      X: {soundstageX > 0 ? `+${soundstageX.toFixed(1)}` : soundstageX.toFixed(1)} | Y: {soundstageY > 0 ? `+${soundstageY.toFixed(1)}` : soundstageY.toFixed(1)} | Z: {soundstageZ.toFixed(1)}
                    </span>
                  </div>

                  {/* Quick Preset Buttons for 3D Soundstage */}
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { name: 'Center Stage', x: 0, y: 0, z: -1 },
                      { name: 'Wide Left-Right', x: -3, y: 0, z: -2 },
                      { name: 'Behind Listener', x: 0, y: 0, z: 2 },
                      { name: 'Elevated Hall', x: 0, y: 2.5, z: -4 },
                      { name: 'Surround Orbit', x: 2.5, y: 1, z: -2 },
                    ].map((p) => (
                      <button
                        key={p.name}
                        onClick={() => {
                          setSoundstageX(p.x);
                          setSoundstageY(p.y);
                          setSoundstageZ(p.z);
                          audioEngine.set3DSpatialPosition(p.x, p.y, p.z);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                          soundstageX === p.x && soundstageY === p.y && soundstageZ === p.z
                            ? 'bg-[#48e4ff] text-[#051a20]'
                            : 'bg-[#0a1e24] text-zinc-300 hover:bg-[#12363f]'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>

                  {/* Interactive Soundstage Pad */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-[#030d0f] border border-[#143842] space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono text-white">
                        <span>Left/Right Pan (X):</span>
                        <span className="text-[#48e4ff] font-bold">{soundstageX.toFixed(1)}m</span>
                      </div>
                      <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.2"
                        value={soundstageX}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSoundstageX(val);
                          audioEngine.set3DSpatialPosition(val, soundstageY, soundstageZ);
                        }}
                        className="w-full accent-[#48e4ff] cursor-pointer"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-[#030d0f] border border-[#143842] space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono text-white">
                        <span>Elevation (Y):</span>
                        <span className="text-[#34d399] font-bold">{soundstageY.toFixed(1)}m</span>
                      </div>
                      <input
                        type="range"
                        min="-3"
                        max="5"
                        step="0.2"
                        value={soundstageY}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSoundstageY(val);
                          audioEngine.set3DSpatialPosition(soundstageX, val, soundstageZ);
                        }}
                        className="w-full accent-[#34d399] cursor-pointer"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-[#030d0f] border border-[#143842] space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono text-white">
                        <span>Depth Distance (Z):</span>
                        <span className="text-purple-300 font-bold">{soundstageZ.toFixed(1)}m</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="3"
                        step="0.2"
                        value={soundstageZ}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSoundstageZ(val);
                          audioEngine.set3DSpatialPosition(soundstageX, soundstageY, val);
                        }}
                        className="w-full accent-purple-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Acoustic Reverb & Spatial HRTF Audition */}
                <div className="pt-4 border-t border-[#133139] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#789d9a]">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Convolver: 32-Bit Float HRTF
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      Delay: {spatialSettings.mode === 'immersive' ? '22ms' : '15ms'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                      Room: {spatialSettings.mode.toUpperCase()}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (playingTone === 'spatial-audition') {
                        audioEngine.stopTestTone();
                        setPlayingTone(null);
                      } else {
                        audioEngine.playTestTone(528, 'sine');
                        setPlayingTone('spatial-audition');
                        setTimeout(() => {
                          audioEngine.stopTestTone();
                          setPlayingTone(null);
                        }, 2200);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-900 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-cyan-500/10"
                  >
                    <Volume2 size={14} className={playingTone === 'spatial-audition' ? 'animate-bounce text-emerald-400' : ''} />
                    <span>{playingTone === 'spatial-audition' ? 'Auditioning 3D Acoustics...' : 'Audition Room Acoustics'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DYNAMICS COMPRESSOR & PEAK LIMITER */}
          {activeTab === 'compressor' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-[#061215] border border-[#15343d] space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity size={16} className="text-[#48e4ff]" />
                      <span>Hardware Dynamics Compressor & Peak Limiter</span>
                    </h3>
                    <p className="text-xs text-[#789d9a] mt-0.5">
                      Smooth dynamic peaks, tighten punch, and prevent harmonic clipping during aggressive EQ boosts.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        compressor: { ...prev.compressor, enabled: !prev.compressor.enabled },
                      }))
                    }
                    className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center cursor-pointer ${
                      compressorSettings.enabled ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full transition-transform ${
                        compressorSettings.enabled ? 'translate-x-6 bg-[#051a20]' : 'bg-[#789d9a]'
                      }`}
                    />
                  </button>
                </div>

                {/* Real-time Gain Reduction Meter */}
                <div className="p-4 rounded-xl bg-[#040d10] border border-[#122e36] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#789d9a]">Real-Time Gain Reduction (GR):</span>
                    <span className={`font-bold ${gainReductionDb < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {gainReductionDb < 0 ? `${gainReductionDb} dB` : '0.0 dB (Clean Headroom)'}
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[#081b20] overflow-hidden p-0.5 border border-[#163842]">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 rounded-full transition-all duration-75"
                      style={{ width: `${Math.min(100, Math.abs(gainReductionDb) * 5)}%` }}
                    />
                  </div>
                </div>

                {/* Controls Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#081b20] border border-[#183d47] space-y-2">
                    <div className="flex items-center justify-between text-xs text-white font-bold">
                      <span>Threshold Level:</span>
                      <span className="font-mono text-[#48e4ff]">
                        {compressorSettings.threshold} dB
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="0"
                      step="1"
                      disabled={!compressorSettings.enabled}
                      value={compressorSettings.threshold}
                      onChange={(e) => {
                        const t = parseInt(e.target.value);
                        onUpdateSettings((prev) => ({
                          ...prev,
                          compressor: { ...prev.compressor, threshold: t },
                        }));
                      }}
                      className="w-full accent-[#48e4ff] cursor-pointer disabled:opacity-40"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-[#081b20] border border-[#183d47] space-y-2">
                    <div className="flex items-center justify-between text-xs text-white font-bold">
                      <span>Compression Ratio:</span>
                      <span className="font-mono text-[#48e4ff]">
                        {compressorSettings.ratio}:1
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      disabled={!compressorSettings.enabled}
                      value={compressorSettings.ratio}
                      onChange={(e) => {
                        const r = parseFloat(e.target.value);
                        onUpdateSettings((prev) => ({
                          ...prev,
                          compressor: { ...prev.compressor, ratio: r },
                        }));
                      }}
                      className="w-full accent-[#48e4ff] cursor-pointer disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RTA SPECTRUM DIAGNOSTICS & AUDITION SIGNALS */}
          {activeTab === 'analyzer' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-[#061215] border border-[#15343d] space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart2 size={16} className="text-[#48e4ff]" />
                    <span>Acoustic Calibration & Test Signal Generators</span>
                  </h3>
                  <p className="text-xs text-[#789d9a] mt-0.5">
                    Generate pure reference sine tones, calibrated pink noise, or logarithmic sweeps to audition EQ response.
                  </p>
                </div>

                {/* Signal Generator Buttons Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'sub-30', label: '30 Hz Sub', freq: 30, type: 'sine' as const },
                    { id: 'sub-60', label: '60 Hz Bass', freq: 60, type: 'sine' as const },
                    { id: 'kick-120', label: '120 Hz Kick', freq: 120, type: 'sine' as const },
                    { id: 'concert-440', label: '440 Hz Concert A', freq: 440, type: 'sine' as const },
                    { id: 'mid-1k', label: '1.0 kHz Mid', freq: 1000, type: 'sine' as const },
                    { id: 'snap-4k', label: '4.0 kHz Snap', freq: 4000, type: 'sine' as const },
                    { id: 'sheen-10k', label: '10.0 kHz Top', freq: 10000, type: 'sine' as const },
                    { id: 'air-16k', label: '16.0 kHz Air', freq: 16000, type: 'sine' as const },
                  ].map((sig) => {
                    const isPlaying = playingTone === sig.id;
                    return (
                      <button
                        key={sig.id}
                        onClick={() => handleToggleTestTone(sig.id, sig.freq, sig.type)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-mono text-xs ${
                          isPlaying
                            ? 'bg-[#48e4ff] text-[#051a20] font-bold border-cyan-300 shadow-md shadow-cyan-500/25'
                            : 'bg-[#081a1e] text-zinc-300 hover:bg-[#0f2e36] border-[#183d47]'
                        }`}
                      >
                        <div className="font-bold">{sig.label}</div>
                        <div className={`text-[10px] ${isPlaying ? 'text-[#06242b]' : 'text-[#789d9a]'}`}>
                          {isPlaying ? 'Active Playing' : 'Audition Sine'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Noise & Sweep Generators */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#133139]">
                  <button
                    onClick={() => handleToggleTestTone('pink-noise')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      playingTone === 'pink-noise'
                        ? 'bg-[#34d399] text-[#051a20] font-bold border-emerald-300'
                        : 'bg-[#081a1e] text-zinc-300 hover:bg-[#0f2e36] border-[#183d47]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">Calibrated Pink Noise (1/f)</div>
                      <div className={`text-[10px] ${playingTone === 'pink-noise' ? 'text-[#051a20]' : 'text-[#789d9a]'}`}>
                        Flat energy per octave for room tuning
                      </div>
                    </div>
                    {playingTone === 'pink-noise' ? <Pause size={18} /> : <Play size={18} />}
                  </button>

                  <button
                    onClick={() => handleToggleTestTone('sweep')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      playingTone === 'sweep'
                        ? 'bg-[#38bdf8] text-[#051a20] font-bold border-sky-300'
                        : 'bg-[#081a1e] text-zinc-300 hover:bg-[#0f2e36] border-[#183d47]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">Logarithmic Sine Sweep (20Hz - 20kHz)</div>
                      <div className={`text-[10px] ${playingTone === 'sweep' ? 'text-[#051a20]' : 'text-[#789d9a]'}`}>
                        Full audio spectrum frequency sweep
                      </div>
                    </div>
                    {playingTone === 'sweep' ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Import Preset Modal Dialog */}
        {showImportDialog && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex items-center justify-center p-6">
            <div className="bg-[#08181c] border border-[#234b54] p-6 rounded-2xl w-full max-w-lg space-y-4">
              <h4 className="text-sm font-bold text-white">Import Custom EQ Preset (JSON)</h4>
              <p className="text-xs text-[#789d9a]">
                Paste your exported Spotui EQ configuration JSON below:
              </p>
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{"name": "My Custom Curve", "bandCount": 10, "gains": [2, 1, 0, ...]}'
                className="w-full h-36 bg-[#040e11] border border-[#15343d] rounded-xl p-3 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowImportDialog(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportEQ}
                  className="px-4 py-2 bg-[#48e4ff] text-[#051a20] font-bold rounded-xl text-xs"
                >
                  Load Preset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Custom Preset to IndexedDB Dialog */}
        {showSavePresetDialog && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex items-center justify-center p-6">
            <form onSubmit={handleSaveCustomPreset} className="bg-[#08181c] border border-[#234b54] p-6 rounded-2xl w-full max-w-md space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Bookmark size={18} className="text-emerald-400" />
                <span>Save Current Curve to Dedicated Vault</span>
              </div>
              <p className="text-xs text-[#789d9a]">
                Stores your {activeBandCount}-band EQ curve with current pre-amp, Q-factors, and gains into IndexedDB and syncs to your Cloud Vault.
              </p>
              <input
                type="text"
                placeholder={`e.g. My Studio Vocal Boost (${activeBandCount}B)`}
                value={customPresetName}
                onChange={(e) => setCustomPresetName(e.target.value)}
                autoFocus
                className="w-full bg-[#030d0f] border border-[#143c44] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#48e4ff]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSavePresetDialog(false)}
                  className="px-4 py-2 bg-[#0d272d] text-zinc-300 hover:text-white rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs cursor-pointer"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="mt-4 pt-3 border-t border-[#183942] flex flex-wrap items-center justify-between gap-3 relative z-10 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleTransform('flatten')}
              className="px-3 py-2 rounded-xl bg-[#0e242a] hover:bg-[#143e47] text-xs text-zinc-300 hover:text-white border border-[#1d3c45] transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset Curve</span>
            </button>

            <button
              onClick={handleExportEQ}
              className="px-3 py-2 rounded-xl bg-[#0e242a] hover:bg-[#143e47] text-xs text-cyan-300 hover:text-white border border-[#1d3c45] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Copy size={13} />
              <span>{copiedStatus || 'Export JSON'}</span>
            </button>

            <button
              onClick={() => setShowImportDialog(true)}
              className="px-3 py-2 rounded-xl bg-[#0e242a] hover:bg-[#143e47] text-xs text-zinc-300 hover:text-white border border-[#1d3c45] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Upload size={13} />
              <span>Import JSON</span>
            </button>
          </div>

          <button
            onClick={() => {
              audioEngine.stopTestTone();
              onClose();
            }}
            className="px-6 py-2.5 bg-[#48e4ff] hover:bg-[#8df5be] text-[#051a20] font-bold rounded-xl text-xs transition shadow-lg shadow-cyan-500/25 cursor-pointer"
          >
            Apply & Return to Deck
          </button>
        </div>
      </div>
    </div>
  );
};
