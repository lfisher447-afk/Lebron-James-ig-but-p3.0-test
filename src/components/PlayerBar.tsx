import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Heart,
  Sliders,
  Disc,
  Radio,
  Sparkles,
} from 'lucide-react';
import { Track, AppSettings } from '../types';
import { Visualizer } from './Visualizer';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  settings: AppSettings;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: (trackId: string) => void;
  onOpenDsp: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  settings,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onOpenDsp,
}) => {
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-r from-[#07090e]/98 via-[#0d121c]/98 to-[#07090e]/98 backdrop-blur-2xl border-t border-slate-800/80 px-6 flex items-center justify-between z-50 select-none shadow-[0_-10px_35px_rgba(0,0,0,0.8)]">
      {/* Left: Track Information */}
      <div className="flex items-center gap-4 w-1/4 min-w-[240px]">
        <div className="relative group w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 shadow-lg shrink-0 flex items-center justify-center">
          {currentTrack?.artwork ? (
            <img
              src={currentTrack.artwork}
              alt="Art"
              className={`w-full h-full object-cover ${isPlaying ? 'scale-105' : ''} transition-transform duration-700`}
            />
          ) : (
            <Disc className={`text-cyan-400/70 ${isPlaying ? 'animate-spin' : ''}`} size={28} />
          )}
          {currentTrack?.source && (
            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/80 text-[8px] font-mono font-bold text-cyan-300 uppercase backdrop-blur-md border border-cyan-500/30">
              {currentTrack.source}
            </span>
          )}
          {isPlaying && (
            <div className="absolute inset-0 bg-cyan-950/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-cyan-400 rounded-full equalizer-bar-1" />
                <span className="w-0.5 bg-sky-300 rounded-full equalizer-bar-2" />
                <span className="w-0.5 bg-emerald-400 rounded-full equalizer-bar-3" />
              </div>
            </div>
          )}
        </div>

        <div className="overflow-hidden min-w-0">
          <div className="font-bold text-sm text-slate-100 truncate hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1.5">
            <span>{currentTrack?.title || 'Studio Deck Ready'}</span>
          </div>
          <div className="text-xs text-slate-400 truncate flex items-center gap-1">
            <span>{currentTrack?.artist || 'Ready for stream playback'}</span>
          </div>
        </div>

        {currentTrack && (
          <button
            onClick={() => onToggleLike(currentTrack.id)}
            className="text-slate-500 hover:text-rose-400 transition-colors ml-auto p-1.5 rounded-lg hover:bg-slate-800/40"
          >
            <Heart
              size={18}
              className={currentTrack.liked ? 'fill-rose-500 text-rose-500' : ''}
            />
          </button>
        )}
      </div>

      {/* Middle: Controls & Scrub Bar */}
      <div className="flex-1 max-w-2xl px-6 flex flex-col items-center">
        {/* Buttons */}
        <div className="flex items-center gap-5 mb-2">
          <button
            onClick={onToggleShuffle}
            className={`p-1.5 rounded-lg transition-all ${
              settings.playback.shuffle ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:text-white'
            }`}
            title="Smart Shuffle"
          >
            <Shuffle size={15} />
          </button>

          <button
            onClick={onPrev}
            className="text-slate-300 hover:text-cyan-300 transition-colors p-1"
            title="Previous Track"
          >
            <SkipBack size={19} fill="currentColor" />
          </button>

          <button
            onClick={onPlayPause}
            className="w-11 h-11 bg-gradient-to-tr from-cyan-400 via-sky-400 to-emerald-400 text-slate-950 rounded-full flex items-center justify-center hover:scale-108 active:scale-95 transition-all shadow-[0_0_20px_rgba(56,189,248,0.4)] cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={19} fill="currentColor" />
            ) : (
              <Play size={19} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="text-slate-300 hover:text-cyan-300 transition-colors p-1"
            title="Next Track"
          >
            <SkipForward size={19} fill="currentColor" />
          </button>

          <button
            onClick={onToggleRepeat}
            className={`p-1.5 rounded-lg transition-all ${
              settings.playback.repeatMode !== 'off'
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Repeat Mode"
          >
            {settings.playback.repeatMode === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
          </button>
        </div>

        {/* Progress Bar & Timestamps */}
        <div className="w-full flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="w-9 text-right text-cyan-300 font-semibold">{formatTime(currentTime)}</span>
          <div
            className="flex-1 h-2 bg-slate-800/80 rounded-full overflow-hidden cursor-pointer relative group"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setHoverTime(ratio * duration);
            }}
            onMouseLeave={() => setHoverTime(null)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickPos = (e.clientX - rect.left) / rect.width;
              onSeek(clickPos * duration);
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 rounded-full relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {hoverTime !== null && (
              <div
                className="absolute top-[-22px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] text-white -translate-x-1/2 pointer-events-none font-mono"
                style={{ left: `${(hoverTime / duration) * 100}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>
          <span className="w-9 text-left text-slate-400">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Visualizer, DSP & Volume */}
      <div className="flex items-center justify-end gap-3.5 w-1/4 min-w-[240px]">
        {/* Live Audio Visualizer */}
        <div className="hidden xl:block">
          <Visualizer
            style={settings.theme.visualizerStyle}
            palette={settings.theme.palette}
            height={32}
          />
        </div>

        {/* DSP Studio Button */}
        <button
          onClick={onOpenDsp}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            settings?.eq?.enabled || (settings?.spatial?.mode && settings?.spatial?.mode !== 'off')
              ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
          title="Audio DSP & EQ Studio"
        >
          <Sliders size={14} className={settings?.eq?.enabled ? 'text-cyan-400 animate-pulse' : ''} />
          <span>DSP</span>
        </button>

        {/* Volume Control */}
        <div className="flex items-center gap-2 bg-slate-900/50 px-2.5 py-1.5 rounded-xl border border-slate-800">
          <button
            onClick={onToggleMute}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {settings.playback.muted || settings.playback.volume === 0 ? (
              <VolumeX size={16} className="text-rose-400" />
            ) : (
              <Volume2 size={16} className="text-cyan-300" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.playback.muted ? 0 : settings.playback.volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-20 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>
      </div>
    </footer>
  );
};

