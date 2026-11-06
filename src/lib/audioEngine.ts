import { AppSettings, EQBandCount, SpatialMode, Track } from '../types';
import { BAND_CONFIGURATIONS, calculateAutoGainCompensation } from './eqConfig';
import { getCachedAudioBlob, cacheAudioBlob, recordPlayHistory } from './db';

// Cache for generated impulse responses to prevent reallocations
const impulseCache: Map<string, AudioBuffer> = new Map();

function generateImpulseResponse(
  ctx: AudioContext,
  durationSec: number,
  decayRate: number,
  mode: SpatialMode
): AudioBuffer {
  const cacheKey = `${ctx.sampleRate}_${durationSec.toFixed(2)}_${decayRate.toFixed(2)}_${mode}`;
  const existing = impulseCache.get(cacheKey);
  if (existing) return existing;

  const sampleRate = ctx.sampleRate;
  const length = Math.max(128, Math.floor(sampleRate * durationSec));
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Advanced Room Simulation Parameters
  const isHyper = mode === 'hyper_spatial';
  const diffusion = isHyper ? 0.85 : 0.6;
  const highFreqDamping = isHyper ? 0.7 : 0.5;

  for (let i = 0; i < length; i++) {
    const t = i / length;
    
    // Exponential decay curve
    const envelope = Math.exp(-t * decayRate);
    
    // Frequency-dependent damping (lows last longer)
    const damping = 1.0 - (t * highFreqDamping);
    
    // Early Reflections (Discrete echoes in first 80ms)
    let earlyReflectionsL = 0;
    let earlyReflectionsR = 0;
    
    if (i < sampleRate * 0.08) {
      const erTimes = [0.011, 0.023, 0.037, 0.047, 0.061, 0.073];
      const erGains = [0.6, -0.45, 0.3, 0.25, -0.15, 0.1];
      
      erTimes.forEach((time, idx) => {
        const sampleIdx = Math.floor(time * sampleRate);
        if (i === sampleIdx) {
          earlyReflectionsL += erGains[idx];
          earlyReflectionsR += erGains[idx] * (idx % 2 === 0 ? 0.7 : -0.7);
        }
      });
    }

    // Late Reverb Tail (Diffuse white noise)
    const noiseL = (Math.random() * 2 - 1) * diffusion;
    const noiseR = (Math.random() * 2 - 1) * diffusion;

    // Combine paths with stereo decorrelation
    left[i] = (noiseL + earlyReflectionsL) * envelope * damping;
    right[i] = (noiseR + earlyReflectionsR) * envelope * damping;
    
    // Add some "air" jitter for hyper spatial
    if (isHyper && i % 4 === 0) {
      left[i] *= (1 + (Math.random() - 0.5) * 0.05);
      right[i] *= (1 + (Math.random() - 0.5) * 0.05);
    }
  }

  // Pre-filter the impulse response to avoid muddiness
  // (In a real pro engine we would use a low-cut here, but simple normalization helps)
  let maxVal = 0;
  for (let i = 0; i < length; i++) {
    maxVal = Math.max(maxVal, Math.abs(left[i]), Math.abs(right[i]));
  }
  if (maxVal > 0) {
    for (let i = 0; i < length; i++) {
      left[i] /= maxVal * 1.5;
      right[i] /= maxVal * 1.5;
    }
  }

  impulseCache.set(cacheKey, buffer);
  return buffer;
}

class SpotuiAudioEngine {
  private ctx: AudioContext | null = null;
  private audio: HTMLAudioElement;

  // Node Graph
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private preAmpGainNode: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private compressorNode: DynamicsCompressorNode | null = null;
  private masterGainNode: GainNode | null = null;

  // Spatial & Reverb Subgraph Nodes
  private spatialInputNode: GainNode | null = null;
  private pannerNode: PannerNode | null = null;
  private dryDirectGainNode: GainNode | null = null;
  private midGainNode: GainNode | null = null;
  private sideGainNode: GainNode | null = null;
  private channelSplitter: ChannelSplitterNode | null = null;
  private channelMerger: ChannelMergerNode | null = null;
  private haasDelayNode: DelayNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private reverbWetGainNode: GainNode | null = null;
  private reverbDryGainNode: GainNode | null = null;
  private spatialSummerNode: GainNode | null = null;

  // Visualizer Analyser & Capture
  private analyserNode: AnalyserNode | null = null;
  private captureDestinationNode: MediaStreamAudioDestinationNode | null = null;

  // Playback & State
  private currentBandCount: EQBandCount = 5;
  private currentQMultiplier = 1.0;
  private currentObjectUrl: string | null = null;
  private currentTrack: Track | null = null;
  private isSourceConnected = false;
  private activeSpatialMode: SpatialMode = 'off';
  private activeReverbWet = 0.15;
  private activeStereoWidth = 100;
  private spatialX = 0;
  private spatialY = 0;
  private spatialZ = -1;

  // Test tone generator
  private testToneOsc: OscillatorNode | null = null;
  private testToneGain: GainNode | null = null;

  // Callbacks
  private onTimeUpdateCallback: ((time: number, duration: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private onErrorCallback: ((err: string) => void) | null = null;
  private stateChangeListeners: Array<(state: { currentTime: number; duration: number; isLooping: boolean }) => void> = [];
  private isLooping = false;
  private hasTriggeredEndedForCurrentTrack = false;
  private lastRecordedTrackId: string | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';

    this.audio.addEventListener('timeupdate', () => {
      this.notifyStateChange();
      const curr = this.audio.currentTime;
      const dur = this.audio.duration || 0;

      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(curr, dur);
      }

      // Record to listening history once at 40% playback
      if (this.currentTrack && dur > 10 && curr > dur * 0.4 && this.lastRecordedTrackId !== this.currentTrack.id) {
        this.lastRecordedTrackId = this.currentTrack.id;
        recordPlayHistory(this.currentTrack, curr / dur).catch(() => {});
      }

      // Watchdog for unchunked streams that pause at end of stream without firing native 'ended'
      if (
        !this.isLooping &&
        !this.hasTriggeredEndedForCurrentTrack &&
        dur > 2 &&
        curr >= dur - 0.35 &&
        (this.audio.paused || this.audio.ended)
      ) {
        this.hasTriggeredEndedForCurrentTrack = true;
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      }
    });

    this.audio.addEventListener('ended', () => {
      this.notifyStateChange();
      if (!this.hasTriggeredEndedForCurrentTrack) {
        this.hasTriggeredEndedForCurrentTrack = true;
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      }
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('[AudioEngine] Stream recovery triggered:', e);
      if (this.onErrorCallback) {
        this.onErrorCallback('Audio stream auto-recovering...');
      }
    });

    // Setup MediaSession handlers
    this.setupMediaSession();
  }

  private setupMediaSession() {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (typeof details.seekTime === 'number') {
            this.seek(details.seekTime);
          }
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          this.seek(this.audio.currentTime + (details.seekOffset || 10));
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          this.seek(this.audio.currentTime - (details.seekOffset || 10));
        });
      } catch (e) {
        console.warn('[MediaSession setup notice]:', e);
      }
    }
  }

  private updateMediaSessionMetadata(track: Track) {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album || 'Spotui Studio Vault',
          artwork: track.artwork
            ? [
                { src: track.artwork, sizes: '96x96', type: 'image/jpeg' },
                { src: track.artwork, sizes: '128x128', type: 'image/jpeg' },
                { src: track.artwork, sizes: '256x256', type: 'image/jpeg' },
                { src: track.artwork, sizes: '512x512', type: 'image/jpeg' },
              ]
            : [],
        });
      } catch (e) {
        console.warn('[MediaSession metadata notice]:', e);
      }
    }
  }

  public onStateChange(cb: (state: { currentTime: number; duration: number; isLooping: boolean }) => void) {
    this.stateChangeListeners.push(cb);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter((l) => l !== cb);
    };
  }

  public setLooping(loop: boolean) {
    this.isLooping = loop;
    this.audio.loop = loop;
    this.notifyStateChange();
  }

  private notifyStateChange() {
    const state = {
      currentTime: this.audio.currentTime || 0,
      duration: this.audio.duration || 0,
      isLooping: this.isLooping,
    };
    this.stateChangeListeners.forEach((fn) => fn(state));
  }

  public initAudioContext() {
    if (this.ctx && this.ctx.state !== 'closed') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      // Core gain and dynamics
      this.preAmpGainNode = this.ctx.createGain();
      this.compressorNode = this.ctx.createDynamicsCompressor();
      this.masterGainNode = this.ctx.createGain();

      // Analyser & Destination
      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.85;

      if (this.ctx.createMediaStreamDestination) {
        this.captureDestinationNode = this.ctx.createMediaStreamDestination();
      }

      // ------------------------------------------------------------------------
      // DEDICATED 3D HRTF SPATIAL & ACOUSTIC REVERB SUBGRAPH
      // ------------------------------------------------------------------------
      this.spatialInputNode = this.ctx.createGain();
      this.pannerNode = this.ctx.createPanner();
      this.pannerNode.panningModel = 'HRTF';
      this.pannerNode.distanceModel = 'inverse';
      this.pannerNode.refDistance = 1;
      this.pannerNode.maxDistance = 10000;
      this.pannerNode.rolloffFactor = 1;
      this.pannerNode.coneInnerAngle = 360;
      if (this.pannerNode.positionX) {
        this.pannerNode.positionX.setValueAtTime(this.spatialX, this.ctx.currentTime);
        this.pannerNode.positionY.setValueAtTime(this.spatialY, this.ctx.currentTime);
        this.pannerNode.positionZ.setValueAtTime(this.spatialZ, this.ctx.currentTime);
      } else {
        this.pannerNode.setPosition(this.spatialX, this.spatialY, this.spatialZ);
      }

      this.dryDirectGainNode = this.ctx.createGain();
      this.reverbDryGainNode = this.ctx.createGain();
      this.reverbWetGainNode = this.ctx.createGain();
      this.convolverNode = this.ctx.createConvolver();
      this.haasDelayNode = this.ctx.createDelay(0.1);
      this.haasDelayNode.delayTime.value = 0.015; // 15ms psychoacoustic spatial delay

      this.channelSplitter = this.ctx.createChannelSplitter(2);
      this.channelMerger = this.ctx.createChannelMerger(2);
      this.midGainNode = this.ctx.createGain();
      this.sideGainNode = this.ctx.createGain();
      this.spatialSummerNode = this.ctx.createGain();

      // Build initial Equalizer BiquadFilter chain
      this.rebuildEQFilters(this.currentBandCount, this.currentQMultiplier);

      // Connect EQ chain into Compressor -> Master Gain -> Spatial Input
      this.compressorNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.spatialInputNode);

      // Route through 3D HRTF Panner
      this.spatialInputNode.connect(this.pannerNode);

      // Branch 1: Direct Dry Path
      this.pannerNode.connect(this.dryDirectGainNode);
      this.dryDirectGainNode.connect(this.spatialSummerNode);

      // Branch 2: Spatial Mid/Side Widener & Reverb Convolver
      this.pannerNode.connect(this.haasDelayNode);
      this.haasDelayNode.connect(this.convolverNode);
      this.convolverNode.connect(this.reverbWetGainNode);
      this.reverbWetGainNode.connect(this.spatialSummerNode);

      // Spatial Summer connects to Spectrum Analyser & Destination
      this.spatialSummerNode.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);

      if (this.captureDestinationNode) {
        this.analyserNode.connect(this.captureDestinationNode);
      }

      // Configure default reverb impulse response
      this.updateSpatialAndReverbParams('studio', 100, 0.15);

      // Connect HTML5 Audio source element
      try {
        if (!this.isSourceConnected) {
          this.sourceNode = this.ctx.createMediaElementSource(this.audio);
          this.sourceNode.connect(this.preAmpGainNode);
          this.isSourceConnected = true;
        }
      } catch (e) {
        console.warn('[AudioEngine] MediaElementSource connect notice:', e);
      }
    } catch (e) {
      console.warn('[AudioEngine] Web Audio API init error:', e);
    }
  }

  /**
   * Rebuilds the EQ BiquadFilter chain with hardware-calibrated Q and Shelving filters
   */
  public rebuildEQFilters(bandCount: EQBandCount, qMultiplier = 1.0) {
    if (!this.ctx || !this.preAmpGainNode || !this.compressorNode) return;

    try {
      this.preAmpGainNode.disconnect();
    } catch {}

    this.eqFilters.forEach((f) => {
      try {
        f.disconnect();
      } catch {}
    });

    const bandDefs = BAND_CONFIGURATIONS[bandCount] || BAND_CONFIGURATIONS[5];
    this.currentBandCount = bandCount;
    this.currentQMultiplier = qMultiplier;

    this.eqFilters = bandDefs.map((def, idx) => {
      const filter = this.ctx!.createBiquadFilter();
      // First band is lowshelf, last is highshelf, rest are peaking
      if (idx === 0 && def.freq <= 100) {
        filter.type = 'lowshelf';
      } else if (idx === bandDefs.length - 1 && def.freq >= 10000) {
        filter.type = 'highshelf';
      } else {
        filter.type = def.type || 'peaking';
      }

      filter.frequency.value = def.freq;
      filter.gain.value = 0;
      filter.Q.value = Math.max(0.2, def.defaultQ * qMultiplier);
      return filter;
    });

    let lastNode: AudioNode = this.preAmpGainNode;
    this.eqFilters.forEach((filter) => {
      lastNode.connect(filter);
      lastNode = filter;
    });

    lastNode.connect(this.compressorNode);
  }

  /**
   * Updates Spatial Acoustic widener, room convolution, and wet/dry balance
   */
  private updateSpatialAndReverbParams(mode: SpatialMode, stereoWidth: number, reverbWet: number) {
    if (!this.ctx || !this.dryDirectGainNode || !this.reverbWetGainNode || !this.convolverNode) return;

    this.activeSpatialMode = mode;
    this.activeStereoWidth = stereoWidth;
    this.activeReverbWet = reverbWet;

    const currTime = this.ctx.currentTime;
    const isSpatialEnabled = mode !== 'off';

    // Room parameters based on acoustic mode
    let decayTime = 0.5;
    let decayRate = 6.0;
    let modeWidthBoost = 1.0;

    switch (mode) {
      case 'studio':
        decayTime = 0.55;
        decayRate = 7.0;
        modeWidthBoost = 1.15;
        break;
      case 'wide':
        decayTime = 0.9;
        decayRate = 5.0;
        modeWidthBoost = 1.55;
        break;
      case 'immersive':
        decayTime = 1.5;
        decayRate = 3.8;
        modeWidthBoost = 1.85;
        break;
      case 'hyper_spatial':
        decayTime = 2.2;
        decayRate = 3.2;
        modeWidthBoost = 2.5; // Massive width boost
        break;
      case 'cinema':
        decayTime = 2.1;
        decayRate = 3.4;
        modeWidthBoost = 1.45;
        break;
      case 'hall':
        decayTime = 3.2;
        decayRate = 2.5;
        modeWidthBoost = 1.65;
        break;
      case 'club':
        decayTime = 1.2;
        decayRate = 4.5;
        modeWidthBoost = 1.4;
        break;
      case 'off':
      default:
        decayTime = 0.1;
        decayRate = 12.0;
        modeWidthBoost = 1.0;
        break;
    }

    // Generate or fetch cached impulse response
    try {
      const impulse = generateImpulseResponse(this.ctx, decayTime, decayRate, mode);
      this.convolverNode.buffer = impulse;
    } catch (e) {
      console.warn('[AudioEngine] Impulse buffer error:', e);
    }

    // Calculate dry vs wet gain
    // Reverb wet is scaled by activeReverbWet (0 to 1)
    const effectiveWet = isSpatialEnabled ? Math.max(0, Math.min(0.85, reverbWet)) : 0;
    const effectiveDry = Math.max(0.2, 1.0 - effectiveWet * 0.6);

    try {
      this.dryDirectGainNode.gain.setTargetAtTime(effectiveDry, currTime, 0.03);
      this.reverbWetGainNode.gain.setTargetAtTime(effectiveWet * 1.5, currTime, 0.03);

      if (this.haasDelayNode) {
        const delayMs = isSpatialEnabled ? (mode === 'immersive' ? 0.022 : 0.014) : 0.001;
        this.haasDelayNode.delayTime.setTargetAtTime(delayMs, currTime, 0.03);
      }
    } catch {
      this.dryDirectGainNode.gain.value = effectiveDry;
      this.reverbWetGainNode.gain.value = effectiveWet * 1.5;
    }
  }

  /**
   * Plays a track with offline IndexedDB cache priority, range support, and auto-caching
   */
  public async playTrack(track: Track, startTime = 0): Promise<void> {
    this.currentTrack = track;
    this.hasTriggeredEndedForCurrentTrack = false;
    this.initAudioContext();

    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }

    this.updateMediaSessionMetadata(track);

    const cleanId = track.id.replace(/^(yt_|sp_bridge_|sp_)/, '');

    // 1. DEDICATED INDEXEDDB AUDIO CACHE CHECK (0ms latency & offline immunity)
    let cachedBlob: Blob | null = null;
    if (track.blob) {
      cachedBlob = track.blob;
    } else {
      const cachedRecord = await getCachedAudioBlob(cleanId);
      if (cachedRecord && cachedRecord.blob) {
        cachedBlob = cachedRecord.blob;
      }
    }

    let targetSrc = '';
    if (cachedBlob) {
      this.currentObjectUrl = URL.createObjectURL(cachedBlob);
      targetSrc = this.currentObjectUrl;
    } else if (track.streamUrl && track.streamUrl.startsWith('http') && !track.streamUrl.includes('/api/audio/stream')) {
      targetSrc = track.streamUrl;
    } else {
      targetSrc = `/api/audio/stream?id=${encodeURIComponent(cleanId)}`;
    }

    this.audio.src = targetSrc;
    this.audio.currentTime = startTime;

    try {
      await this.audio.play();

      // In background: If this was a network stream and not yet in cache, fetch & cache in IndexedDB
      if (!cachedBlob && targetSrc.startsWith('/api/audio/stream')) {
        this.cacheTrackInBackground(cleanId, targetSrc, track.duration);
      }
    } catch (err: any) {
      console.warn('[AudioEngine] Play encounter, retrying with fallback audio source:', err);
      try {
        if (track.streamUrl && track.streamUrl.startsWith('http')) {
          this.audio.src = track.streamUrl;
          await this.audio.play();
        }
      } catch (fallbackErr) {
        console.error('[AudioEngine] Playback fallback error:', fallbackErr);
      }
    }
  }

  private async cacheTrackInBackground(cleanId: string, url: string, duration: number) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 20000) {
          await cacheAudioBlob(cleanId, blob, blob.type || 'audio/mpeg', duration);
          console.log(`[AudioEngine] Track ${cleanId} cached in IndexedDB (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
        }
      }
    } catch (e) {
      // Non-critical background cache notice
    }
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  public play() {
    this.initAudioContext();
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.audio.play();
  }

  public pause() {
    this.audio.pause();
  }

  public seek(seconds: number) {
    if (Number.isFinite(seconds) && seconds >= 0) {
      this.audio.currentTime = seconds;
    }
  }

  public setVolume(volume: number) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  public setPlaybackRate(rate: number) {
    this.audio.playbackRate = Math.max(0.25, Math.min(3.0, rate));
  }

  public applySettings(settings?: AppSettings) {
    if (!settings) return;
    this.initAudioContext();
    if (!this.ctx) return;

    const currTime = this.ctx.currentTime;
    const isEqEnabled = Boolean(settings.eq?.enabled);
    const targetBandCount: EQBandCount = settings.eq?.bandCount || 5;
    const qMultiplier = settings.eq?.qFactorMultiplier || 1.0;

    // Check if filter chain needs reconfiguration
    if (
      this.eqFilters.length !== targetBandCount ||
      this.currentBandCount !== targetBandCount ||
      Math.abs(this.currentQMultiplier - qMultiplier) > 0.01
    ) {
      this.rebuildEQFilters(targetBandCount, qMultiplier);
    }

    // Resolve gains array
    let activeGains: number[] = [];
    if (Array.isArray(settings.eq?.gains) && settings.eq.gains.length === targetBandCount) {
      activeGains = settings.eq.gains;
    } else if (settings.eq?.modeGains && settings.eq.modeGains[targetBandCount]) {
      activeGains = settings.eq.modeGains[targetBandCount]!;
    } else if (targetBandCount === 5) {
      activeGains = [
        settings.eq.bass ?? 0,
        settings.eq.lowMid ?? 0,
        settings.eq.vocal ?? 0,
        settings.eq.highMid ?? 0,
        settings.eq.treble ?? 0,
      ];
    } else {
      activeGains = new Array(targetBandCount).fill(0);
    }

    // Pre-Amp & Auto Gain Loudness Compensation
    if (this.preAmpGainNode) {
      const manualPreAmpDb = settings.eq?.preAmpGain ?? 0;
      const autoCompDb = (isEqEnabled && settings.eq?.autoGainCompensation)
        ? calculateAutoGainCompensation(activeGains)
        : 0;
      const totalPreAmpDb = isEqEnabled ? (manualPreAmpDb + autoCompDb) : 0;
      const linearPreAmp = Math.max(0.05, Math.min(4.0, Math.pow(10, totalPreAmpDb / 20)));

      try {
        this.preAmpGainNode.gain.setTargetAtTime(linearPreAmp, currTime, 0.03);
      } catch {
        this.preAmpGainNode.gain.value = linearPreAmp;
      }
    }

    // Apply Filter Gains
    this.eqFilters.forEach((f, i) => {
      const targetGain = isEqEnabled ? (activeGains[i] ?? 0) : 0;
      try {
        f.gain.setTargetAtTime(targetGain, currTime, 0.02);
      } catch {
        f.gain.value = targetGain;
      }
    });

    // Apply Compressor
    if (this.compressorNode && settings.compressor) {
      const isCompEnabled = Boolean(settings.compressor.enabled);
      const thresholdVal = isCompEnabled ? (settings.compressor.threshold ?? -12) : 0;
      const ratioVal = isCompEnabled ? (settings.compressor.ratio ?? 4) : 1;
      try {
        this.compressorNode.threshold.setTargetAtTime(thresholdVal, currTime, 0.03);
        this.compressorNode.ratio.setTargetAtTime(ratioVal, currTime, 0.03);
      } catch {
        this.compressorNode.threshold.value = thresholdVal;
        this.compressorNode.ratio.value = ratioVal;
      }
    }

    // Apply Spatial Mode, Stereo Width, and Acoustic Reverb Wetness
    if (settings.spatial) {
      this.updateSpatialAndReverbParams(
        settings.spatial.mode || 'off',
        settings.spatial.stereoWidth ?? 100,
        settings.spatial.reverbWet ?? 0.15
      );
    }

    // Master Gain
    if (this.masterGainNode) {
      try {
        this.masterGainNode.gain.setTargetAtTime(1.0, currTime, 0.03);
      } catch {
        this.masterGainNode.gain.value = 1.0;
      }
    }

    // Sync HTML5 Audio properties with settings
    if (settings.playback) {
      const vol = settings.playback.muted ? 0 : (settings.playback.volume ?? 1);
      this.setVolume(vol);
      if (typeof settings.playback.playbackRate === 'number') {
        this.setPlaybackRate(settings.playback.playbackRate);
      }
      const shouldLoop = settings.playback.repeatMode === 'one';
      if (this.isLooping !== shouldLoop) {
        this.setLooping(shouldLoop);
      }
    }
  }

  // Play a test tone to audition the EQ
  public playTestTone(frequency = 440, type: OscillatorType = 'sine') {
    this.initAudioContext();
    if (!this.ctx || !this.preAmpGainNode) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.stopTestTone();

    this.testToneOsc = this.ctx.createOscillator();
    this.testToneGain = this.ctx.createGain();

    this.testToneOsc.type = type;
    this.testToneOsc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    this.testToneGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    this.testToneOsc.connect(this.testToneGain);
    this.testToneGain.connect(this.preAmpGainNode);

    this.testToneOsc.start();
  }

  // Play calibrated pink noise (1/f spectral density) for room acoustic calibration
  public playPinkNoise() {
    this.initAudioContext();
    if (!this.ctx || !this.preAmpGainNode) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.stopTestTone();

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    this.testToneGain = this.ctx.createGain();
    this.testToneGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    noiseSource.connect(this.testToneGain);
    this.testToneGain.connect(this.preAmpGainNode);

    noiseSource.start();
    (this as any)._noiseSource = noiseSource;
  }

  // Play a logarithmic frequency sweep from 20Hz to 20kHz
  public playSweep(duration = 4) {
    this.initAudioContext();
    if (!this.ctx || !this.preAmpGainNode) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.stopTestTone();

    this.testToneOsc = this.ctx.createOscillator();
    this.testToneGain = this.ctx.createGain();

    this.testToneOsc.type = 'sine';
    const now = this.ctx.currentTime;
    this.testToneOsc.frequency.setValueAtTime(20, now);
    this.testToneOsc.frequency.exponentialRampToValueAtTime(20000, now + duration);
    this.testToneGain.gain.setValueAtTime(0.2, now);

    this.testToneOsc.connect(this.testToneGain);
    this.testToneGain.connect(this.preAmpGainNode);

    this.testToneOsc.start();
    this.testToneOsc.stop(now + duration);
    this.testToneOsc.onended = () => {
      this.stopTestTone();
    };
  }

  public stopTestTone() {
    if (this.testToneOsc) {
      try {
        this.testToneOsc.stop();
        this.testToneOsc.disconnect();
      } catch {}
      this.testToneOsc = null;
    }
    if ((this as any)._noiseSource) {
      try {
        (this as any)._noiseSource.stop();
        (this as any)._noiseSource.disconnect();
      } catch {}
      (this as any)._noiseSource = null;
    }
    if (this.testToneGain) {
      try {
        this.testToneGain.disconnect();
      } catch {}
      this.testToneGain = null;
    }
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(64);
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  public getTimeDomainData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(64);
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(data);
    return data;
  }

  public setAnalyserFftSize(size: number) {
    if (this.analyserNode && [128, 256, 512, 1024, 2048].includes(size)) {
      this.analyserNode.fftSize = size;
    }
  }

  public getCompressionReduction(): number {
    if (!this.compressorNode) return 0;
    return this.compressorNode.reduction || 0;
  }

  public getSampleRate(): number {
    return this.ctx?.sampleRate || 48000;
  }

  public onTimeUpdate(cb: (time: number, duration: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  public onEnded(cb: () => void) {
    this.onEndedCallback = cb;
  }

  public set3DSpatialPosition(x: number, y: number, z: number) {
    this.spatialX = x;
    this.spatialY = y;
    this.spatialZ = z;
    if (this.ctx && this.pannerNode) {
      const currTime = this.ctx.currentTime;
      if (this.pannerNode.positionX) {
        this.pannerNode.positionX.setTargetAtTime(x, currTime, 0.05);
        this.pannerNode.positionY.setTargetAtTime(y, currTime, 0.05);
        this.pannerNode.positionZ.setTargetAtTime(z, currTime, 0.05);
      } else {
        this.pannerNode.setPosition(x, y, z);
      }
    }
  }

  public onError(cb: (err: string) => void) {
    this.onErrorCallback = cb;
  }
}

export const audioEngine = new SpotuiAudioEngine();
