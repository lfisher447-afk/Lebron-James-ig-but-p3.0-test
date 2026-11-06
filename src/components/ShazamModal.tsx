import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Radio,
  Play,
  CheckCircle2,
  AlertCircle,
  Music2,
  Sparkles,
  Plus,
  Search,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { Track } from '../types';

interface ShazamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayTrack: (track: Track) => void;
  onAddToVault?: (track: Track) => void;
}

export const ShazamModal: React.FC<ShazamModalProps> = ({
  isOpen,
  onClose,
  onPlayTrack,
  onAddToVault,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [dominantFreq, setDominantFreq] = useState<number>(0);
  const [detectedPitch, setDetectedPitch] = useState<string>('--');
  const [micError, setMicError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopMic();
      setSearchResults([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const frequencyToNote = (freq: number): string => {
    if (freq < 20 || freq > 8000) return '--';
    const noteNum = 12 * (Math.log(freq / 440) / Math.log(2));
    const midi = Math.round(noteNum) + 69;
    const noteIndex = (midi % 12 + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return `${noteStrings[noteIndex]}${octave}`;
  };

  const startMic = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      renderSpectrum();
    } catch (err: any) {
      console.error('Microphone error:', err);
      setMicError('Microphone permission denied or device not found.');
      setIsListening(false);
    }
  };

  const stopMic = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsListening(false);
    setDominantFreq(0);
    setDetectedPitch('--');
  };

  const renderSpectrum = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Find dominant peak
      let maxVal = 0;
      let maxIdx = 0;
      for (let i = 2; i < bufferLength; i++) {
        if (dataArray[i] > maxVal) {
          maxVal = dataArray[i];
          maxIdx = i;
        }
      }

      if (maxVal > 50 && audioCtxRef.current) {
        const nyquist = audioCtxRef.current.sampleRate / 2;
        const peakFreq = Math.round((maxIdx * nyquist) / bufferLength);
        setDominantFreq(peakFreq);
        setDetectedPitch(frequencyToNote(peakFreq));
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const hue = (i / bufferLength) * 180 + 170; // Cyan to purple gradient
        ctx.fillStyle = `hsl(${hue}, 90%, 55%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  };

  const handleSearchSong = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/innertube/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (e) {
      console.error('Song match error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlayResult = (item: any) => {
    const track: Track = {
      id: item.id,
      title: item.title,
      artist: item.artist,
      album: 'Matched Audio Stream',
      duration: item.duration || 210,
      durationText: item.durationText || '3:30',
      artwork: item.thumbnail,
      source: 'youtube',
      addedAt: Date.now(),
      streamUrl: `/api/audio/stream?id=${item.id}`,
    };
    onPlayTrack(track);
    onClose();
  };

  const handleAddToVault = (item: any) => {
    if (!onAddToVault) return;
    const track: Track = {
      id: item.id,
      title: item.title,
      artist: item.artist,
      album: 'Matched Audio Stream',
      duration: item.duration || 210,
      durationText: item.durationText || '3:30',
      artwork: item.thumbnail,
      source: 'youtube',
      addedAt: Date.now(),
      streamUrl: `/api/audio/stream?id=${item.id}`,
    };
    onAddToVault(track);
    setAddedIds((prev) => new Set(prev).add(item.id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Acoustic Spectrum & Song Match
              </h3>
              <p className="text-xs text-zinc-400">
                Real microphone FFT frequency spectrum analyzer & instant song search
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Live Mic Spectrum Analyzer Box */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isListening ? 'bg-rose-500 animate-pulse' : 'bg-zinc-600'
                  }`}
                />
                <span className="text-xs font-semibold text-zinc-300">
                  {isListening ? 'Listening via Microphone...' : 'Microphone Inactive'}
                </span>
              </div>

              {/* Pitch & Freq display */}
              {isListening && (
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-zinc-400">
                    Peak:{' '}
                    <strong className="text-cyan-400 font-bold">{dominantFreq} Hz</strong>
                  </span>
                  <span className="text-zinc-400">
                    Pitch:{' '}
                    <strong className="text-purple-400 font-bold">{detectedPitch}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Visualizer Canvas */}
            <div className="w-full h-32 bg-black rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center relative">
              <canvas
                ref={canvasRef}
                width={560}
                height={128}
                className="w-full h-full object-cover"
              />
              {!isListening && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-1 bg-black/60">
                  <Mic size={24} className="opacity-40" />
                  <span className="text-xs font-mono">
                    Click 'Start Microphone' to capture acoustic frequencies
                  </span>
                </div>
              )}
            </div>

            {micError && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{micError}</span>
              </div>
            )}

            {/* Mic Toggle Button */}
            <div className="flex justify-center">
              {isListening ? (
                <button
                  onClick={stopMic}
                  className="px-5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 font-semibold text-xs border border-zinc-700 flex items-center gap-2 transition"
                >
                  <MicOff size={15} />
                  <span>Stop Microphone</span>
                </button>
              ) : (
                <button
                  onClick={startMic}
                  className="px-6 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-cyan-500/20"
                >
                  <Mic size={15} />
                  <span>Start Microphone Analyzer</span>
                </button>
              )}
            </div>
          </div>

          {/* Song Match & Search by Lyrics/Audio */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Search size={14} className="text-cyan-400" />
              <span>Search Song by Title, Artist, or Lyrics</span>
            </h4>

            <form onSubmit={handleSearchSong} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter song name, lyrics, or hummed lyrics..."
                className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSearching ? <RefreshCw size={14} className="animate-spin" /> : 'Find Song'}
              </button>
            </form>

            {/* Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-10 h-10 rounded-lg object-cover border border-zinc-800 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">{item.artist}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handlePlayResult(item)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Play size={12} fill="currentColor" />
                        <span>Play</span>
                      </button>
                      {onAddToVault && (
                        <button
                          onClick={() => handleAddToVault(item)}
                          disabled={addedIds.has(item.id)}
                          className={`p-1.5 rounded-lg border transition ${
                            addedIds.has(item.id)
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                          }`}
                        >
                          {addedIds.has(item.id) ? (
                            <CheckCircle2 size={14} className="text-emerald-400" />
                          ) : (
                            <Plus size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
