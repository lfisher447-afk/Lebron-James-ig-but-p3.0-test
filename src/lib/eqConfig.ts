import { EQBandCount } from '../types';

export interface BandDef {
  index: number;
  freq: number;
  freqLabel: string;
  label: string;
  type: BiquadFilterType;
  defaultQ: number;
}

export const SUPPORTED_BAND_COUNTS: EQBandCount[] = [5, 7, 10, 12, 15, 20, 31];

export function formatFreq(hz: number): string {
  if (hz >= 1000) {
    const khz = hz / 1000;
    return khz % 1 === 0 ? `${khz} kHz` : `${khz.toFixed(1)} kHz`;
  }
  return `${hz} Hz`;
}

// Band Frequency Definitions for all modes
export const BAND_CONFIGURATIONS: Record<EQBandCount, BandDef[]> = {
  5: [
    { index: 0, freq: 60, freqLabel: '60 Hz', label: 'Sub-Bass', type: 'lowshelf', defaultQ: 0.7 },
    { index: 1, freq: 250, freqLabel: '250 Hz', label: 'Low-Mid', type: 'peaking', defaultQ: 1.0 },
    { index: 2, freq: 1000, freqLabel: '1.0 kHz', label: 'Vocal / Mid', type: 'peaking', defaultQ: 1.0 },
    { index: 3, freq: 4000, freqLabel: '4.0 kHz', label: 'High-Mid', type: 'peaking', defaultQ: 1.0 },
    { index: 4, freq: 12000, freqLabel: '12.0 kHz', label: 'Treble Air', type: 'highshelf', defaultQ: 0.7 },
  ],
  7: [
    { index: 0, freq: 60, freqLabel: '60 Hz', label: 'Sub-Bass', type: 'lowshelf', defaultQ: 0.7 },
    { index: 1, freq: 150, freqLabel: '150 Hz', label: 'Punch', type: 'peaking', defaultQ: 1.2 },
    { index: 2, freq: 400, freqLabel: '400 Hz', label: 'Body', type: 'peaking', defaultQ: 1.2 },
    { index: 3, freq: 1000, freqLabel: '1.0 kHz', label: 'Presence', type: 'peaking', defaultQ: 1.2 },
    { index: 4, freq: 2500, freqLabel: '2.5 kHz', label: 'Clarity', type: 'peaking', defaultQ: 1.2 },
    { index: 5, freq: 6000, freqLabel: '6.0 kHz', label: 'Sibilance', type: 'peaking', defaultQ: 1.2 },
    { index: 6, freq: 15000, freqLabel: '15.0 kHz', label: 'Air Brilliance', type: 'highshelf', defaultQ: 0.7 },
  ],
  10: [
    { index: 0, freq: 31, freqLabel: '31 Hz', label: 'Deep Sub', type: 'lowshelf', defaultQ: 0.7 },
    { index: 1, freq: 62, freqLabel: '62 Hz', label: 'Kick & Bass', type: 'peaking', defaultQ: 1.4 },
    { index: 2, freq: 125, freqLabel: '125 Hz', label: 'Bass Warmth', type: 'peaking', defaultQ: 1.4 },
    { index: 3, freq: 250, freqLabel: '250 Hz', label: 'Low Mid', type: 'peaking', defaultQ: 1.4 },
    { index: 4, freq: 500, freqLabel: '500 Hz', label: 'Body / Box', type: 'peaking', defaultQ: 1.4 },
    { index: 5, freq: 1000, freqLabel: '1.0 kHz', label: 'Vocal Center', type: 'peaking', defaultQ: 1.4 },
    { index: 6, freq: 2000, freqLabel: '2.0 kHz', label: 'Attack', type: 'peaking', defaultQ: 1.4 },
    { index: 7, freq: 4000, freqLabel: '4.0 kHz', label: 'Snap & Edge', type: 'peaking', defaultQ: 1.4 },
    { index: 8, freq: 8000, freqLabel: '8.0 kHz', label: 'Crisp High', type: 'peaking', defaultQ: 1.4 },
    { index: 9, freq: 16000, freqLabel: '16.0 kHz', label: 'Air Sheen', type: 'highshelf', defaultQ: 0.7 },
  ],
  12: [
    { index: 0, freq: 30, freqLabel: '30 Hz', label: 'Sub-Sonic', type: 'lowshelf', defaultQ: 0.8 },
    { index: 1, freq: 60, freqLabel: '60 Hz', label: 'Sub Punch', type: 'peaking', defaultQ: 1.6 },
    { index: 2, freq: 120, freqLabel: '120 Hz', label: 'Bassline', type: 'peaking', defaultQ: 1.6 },
    { index: 3, freq: 250, freqLabel: '250 Hz', label: 'Warmth', type: 'peaking', defaultQ: 1.6 },
    { index: 4, freq: 500, freqLabel: '500 Hz', label: 'Low Mid', type: 'peaking', defaultQ: 1.6 },
    { index: 5, freq: 1000, freqLabel: '1.0 kHz', label: 'Center Mid', type: 'peaking', defaultQ: 1.6 },
    { index: 6, freq: 2000, freqLabel: '2.0 kHz', label: 'Presence', type: 'peaking', defaultQ: 1.6 },
    { index: 7, freq: 4000, freqLabel: '4.0 kHz', label: 'Upper Presence', type: 'peaking', defaultQ: 1.6 },
    { index: 8, freq: 8000, freqLabel: '8.0 kHz', label: 'Definition', type: 'peaking', defaultQ: 1.6 },
    { index: 9, freq: 12000, freqLabel: '12.0 kHz', label: 'Top High', type: 'peaking', defaultQ: 1.6 },
    { index: 10, freq: 16000, freqLabel: '16.0 kHz', label: 'Ultra Air', type: 'peaking', defaultQ: 1.6 },
    { index: 11, freq: 20000, freqLabel: '20.0 kHz', label: 'Air Ceiling', type: 'highshelf', defaultQ: 0.8 },
  ],
  15: [
    { index: 0, freq: 25, freqLabel: '25 Hz', label: 'Sub Bottom', type: 'lowshelf', defaultQ: 0.9 },
    { index: 1, freq: 40, freqLabel: '40 Hz', label: 'Sub Bass', type: 'peaking', defaultQ: 2.1 },
    { index: 2, freq: 63, freqLabel: '63 Hz', label: 'Kick', type: 'peaking', defaultQ: 2.1 },
    { index: 3, freq: 100, freqLabel: '100 Hz', label: 'Bass', type: 'peaking', defaultQ: 2.1 },
    { index: 4, freq: 160, freqLabel: '160 Hz', label: 'Upper Bass', type: 'peaking', defaultQ: 2.1 },
    { index: 5, freq: 250, freqLabel: '250 Hz', label: 'Warmth', type: 'peaking', defaultQ: 2.1 },
    { index: 6, freq: 400, freqLabel: '400 Hz', label: 'Low Mid', type: 'peaking', defaultQ: 2.1 },
    { index: 7, freq: 630, freqLabel: '630 Hz', label: 'Midrange', type: 'peaking', defaultQ: 2.1 },
    { index: 8, freq: 1000, freqLabel: '1.0 kHz', label: 'Vocal Mid', type: 'peaking', defaultQ: 2.1 },
    { index: 9, freq: 1600, freqLabel: '1.6 kHz', label: 'High Mid', type: 'peaking', defaultQ: 2.1 },
    { index: 10, freq: 2500, freqLabel: '2.5 kHz', label: 'Attack', type: 'peaking', defaultQ: 2.1 },
    { index: 11, freq: 4000, freqLabel: '4.0 kHz', label: 'Crispness', type: 'peaking', defaultQ: 2.1 },
    { index: 12, freq: 6300, freqLabel: '6.3 kHz', label: 'Presence', type: 'peaking', defaultQ: 2.1 },
    { index: 13, freq: 10000, freqLabel: '10.0 kHz', label: 'Treble', type: 'peaking', defaultQ: 2.1 },
    { index: 14, freq: 16000, freqLabel: '16.0 kHz', label: 'Air Ceiling', type: 'highshelf', defaultQ: 0.9 },
  ],
  20: [
    { index: 0, freq: 20, freqLabel: '20 Hz', label: 'Infrasound', type: 'lowshelf', defaultQ: 1.0 },
    { index: 1, freq: 35, freqLabel: '35 Hz', label: 'Sub-Low', type: 'peaking', defaultQ: 2.8 },
    { index: 2, freq: 50, freqLabel: '50 Hz', label: 'Sub-Punch', type: 'peaking', defaultQ: 2.8 },
    { index: 3, freq: 75, freqLabel: '75 Hz', label: 'Kick Center', type: 'peaking', defaultQ: 2.8 },
    { index: 4, freq: 120, freqLabel: '120 Hz', label: 'Bass Boom', type: 'peaking', defaultQ: 2.8 },
    { index: 5, freq: 200, freqLabel: '200 Hz', label: 'Snare Body', type: 'peaking', defaultQ: 2.8 },
    { index: 6, freq: 320, freqLabel: '320 Hz', label: 'Mud Filter', type: 'peaking', defaultQ: 2.8 },
    { index: 7, freq: 500, freqLabel: '500 Hz', label: 'Low Vocal', type: 'peaking', defaultQ: 2.8 },
    { index: 8, freq: 800, freqLabel: '800 Hz', label: 'Mid Horn', type: 'peaking', defaultQ: 2.8 },
    { index: 9, freq: 1250, freqLabel: '1.25 kHz', label: 'Intelligibility', type: 'peaking', defaultQ: 2.8 },
    { index: 10, freq: 2000, freqLabel: '2.0 kHz', label: 'Vocal Edge', type: 'peaking', defaultQ: 2.8 },
    { index: 11, freq: 3150, freqLabel: '3.15 kHz', label: 'Guitar Bite', type: 'peaking', defaultQ: 2.8 },
    { index: 12, freq: 5000, freqLabel: '5.0 kHz', label: 'Lead Synth', type: 'peaking', defaultQ: 2.8 },
    { index: 13, freq: 7000, freqLabel: '7.0 kHz', label: 'Cymbal Bell', type: 'peaking', defaultQ: 2.8 },
    { index: 14, freq: 9000, freqLabel: '9.0 kHz', label: 'Sizzle', type: 'peaking', defaultQ: 2.8 },
    { index: 15, freq: 11000, freqLabel: '11.0 kHz', label: 'Metallic', type: 'peaking', defaultQ: 2.8 },
    { index: 16, freq: 13000, freqLabel: '13.0 kHz', label: 'Top Shine', type: 'peaking', defaultQ: 2.8 },
    { index: 17, freq: 15000, freqLabel: '15.0 kHz', label: 'Air Sparkle', type: 'peaking', defaultQ: 2.8 },
    { index: 18, freq: 18000, freqLabel: '18.0 kHz', label: 'Air Top', type: 'peaking', defaultQ: 2.8 },
    { index: 19, freq: 20000, freqLabel: '20.0 kHz', label: 'Super High', type: 'highshelf', defaultQ: 1.0 },
  ],
  31: [
    { index: 0, freq: 20, freqLabel: '20 Hz', label: '20Hz', type: 'lowshelf', defaultQ: 1.2 },
    { index: 1, freq: 25, freqLabel: '25 Hz', label: '25Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 2, freq: 31.5, freqLabel: '31.5 Hz', label: '31.5Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 3, freq: 40, freqLabel: '40 Hz', label: '40Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 4, freq: 50, freqLabel: '50 Hz', label: '50Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 5, freq: 63, freqLabel: '63 Hz', label: '63Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 6, freq: 80, freqLabel: '80 Hz', label: '80Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 7, freq: 100, freqLabel: '100 Hz', label: '100Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 8, freq: 125, freqLabel: '125 Hz', label: '125Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 9, freq: 160, freqLabel: '160 Hz', label: '160Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 10, freq: 200, freqLabel: '200 Hz', label: '200Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 11, freq: 250, freqLabel: '250 Hz', label: '250Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 12, freq: 315, freqLabel: '315 Hz', label: '315Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 13, freq: 400, freqLabel: '400 Hz', label: '400Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 14, freq: 500, freqLabel: '500 Hz', label: '500Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 15, freq: 630, freqLabel: '630 Hz', label: '630Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 16, freq: 800, freqLabel: '800 Hz', label: '800Hz', type: 'peaking', defaultQ: 4.3 },
    { index: 17, freq: 1000, freqLabel: '1.0 kHz', label: '1kHz', type: 'peaking', defaultQ: 4.3 },
    { index: 18, freq: 1250, freqLabel: '1.25 kHz', label: '1.25k', type: 'peaking', defaultQ: 4.3 },
    { index: 19, freq: 1600, freqLabel: '1.6 kHz', label: '1.6k', type: 'peaking', defaultQ: 4.3 },
    { index: 20, freq: 2000, freqLabel: '2.0 kHz', label: '2kHz', type: 'peaking', defaultQ: 4.3 },
    { index: 21, freq: 2500, freqLabel: '2.5 kHz', label: '2.5k', type: 'peaking', defaultQ: 4.3 },
    { index: 22, freq: 3150, freqLabel: '3.15 kHz', label: '3.15k', type: 'peaking', defaultQ: 4.3 },
    { index: 23, freq: 4000, freqLabel: '4.0 kHz', label: '4kHz', type: 'peaking', defaultQ: 4.3 },
    { index: 24, freq: 5000, freqLabel: '5.0 kHz', label: '5kHz', type: 'peaking', defaultQ: 4.3 },
    { index: 25, freq: 6300, freqLabel: '6.3 kHz', label: '6.3k', type: 'peaking', defaultQ: 4.3 },
    { index: 26, freq: 8000, freqLabel: '8.0 kHz', label: '8kHz', type: 'peaking', defaultQ: 4.3 },
    { index: 27, freq: 10000, freqLabel: '10.0 kHz', label: '10k', type: 'peaking', defaultQ: 4.3 },
    { index: 28, freq: 12500, freqLabel: '12.5 kHz', label: '12.5k', type: 'peaking', defaultQ: 4.3 },
    { index: 29, freq: 16000, freqLabel: '16.0 kHz', label: '16k', type: 'peaking', defaultQ: 4.3 },
    { index: 30, freq: 20000, freqLabel: '20.0 kHz', label: '20k', type: 'highshelf', defaultQ: 1.2 },
  ],
};

// Continuous curve interpolation for calculating preset gains across any band count
export interface CurveControlPoint {
  freq: number;
  gain: number;
}

export interface EQPresetDef {
  id?: string;
  name: string;
  category: 'Mastering' | 'Electronic' | 'Acoustic' | 'Vocal' | 'Special' | 'Custom';
  description: string;
  points: CurveControlPoint[];
  bandCount?: number;
  gains?: number[];
  preAmpGain?: number;
  autoGainCompensation?: boolean;
  qFactorMultiplier?: number;
  isCustom?: boolean;
  createdAt?: number;
}

export const MASTER_EQ_PRESETS: Record<string, EQPresetDef> = {
  'Flat Reference': {
    name: 'Flat Reference',
    category: 'Mastering',
    description: 'Uncolored studio reference monitoring curve with zero phase distortion',
    points: [
      { freq: 20, gain: 0 },
      { freq: 1000, gain: 0 },
      { freq: 20000, gain: 0 },
    ],
  },
  'Bass Boost 808': {
    name: 'Bass Boost 808',
    category: 'Electronic',
    description: 'Massive sub-bass weight (+9dB) & tight kick punch without muddying mids',
    points: [
      { freq: 20, gain: 9.5 },
      { freq: 60, gain: 8.5 },
      { freq: 120, gain: 5.5 },
      { freq: 300, gain: 0 },
      { freq: 1000, gain: -1.0 },
      { freq: 4000, gain: 1.5 },
      { freq: 12000, gain: 3.0 },
      { freq: 20000, gain: 2.0 },
    ],
  },
  'Sub Bass Destroyer': {
    name: 'Sub Bass Destroyer',
    category: 'Electronic',
    description: 'Extreme subterranean low-end focus tailored for trap, dubstep & car audio',
    points: [
      { freq: 20, gain: 11.0 },
      { freq: 45, gain: 10.5 },
      { freq: 90, gain: 6.0 },
      { freq: 200, gain: 1.0 },
      { freq: 1000, gain: -2.0 },
      { freq: 5000, gain: 1.0 },
      { freq: 15000, gain: 2.0 },
    ],
  },
  'Vocal Polish & Clarity': {
    name: 'Vocal Polish & Clarity',
    category: 'Vocal',
    description: 'Low-frequency rumble rolloff, presence peak at 2.5kHz-4kHz, and silky air',
    points: [
      { freq: 20, gain: -4.0 },
      { freq: 100, gain: -2.0 },
      { freq: 300, gain: 1.0 },
      { freq: 1000, gain: 4.5 },
      { freq: 3000, gain: 6.5 },
      { freq: 6000, gain: 4.0 },
      { freq: 12000, gain: 4.5 },
      { freq: 20000, gain: 3.0 },
    ],
  },
  'Crisp Podcast & Broadcast': {
    name: 'Crisp Podcast & Broadcast',
    category: 'Vocal',
    description: 'High-pass filter on ambient rumble, de-muds chestiness, boosts intelligibility',
    points: [
      { freq: 20, gain: -6.0 },
      { freq: 80, gain: -3.0 },
      { freq: 250, gain: -1.5 },
      { freq: 1000, gain: 3.0 },
      { freq: 2500, gain: 5.5 },
      { freq: 5000, gain: 3.5 },
      { freq: 8000, gain: -1.0 }, // de-ess notch
      { freq: 15000, gain: 2.0 },
    ],
  },
  'Cyberpunk Synthwave': {
    name: 'Cyberpunk Synthwave',
    category: 'Electronic',
    description: 'Warm analog synthesizer low-end with wide neon highs and scooped mids',
    points: [
      { freq: 20, gain: 7.0 },
      { freq: 70, gain: 7.5 },
      { freq: 200, gain: 3.0 },
      { freq: 600, gain: -2.0 },
      { freq: 2000, gain: 2.0 },
      { freq: 6000, gain: 6.0 },
      { freq: 14000, gain: 8.5 },
      { freq: 20000, gain: 7.0 },
    ],
  },
  'Club & EDM Soundstage': {
    name: 'Club & EDM Soundstage',
    category: 'Electronic',
    description: 'Classic DJ smile curve with club sub bass (+8dB) and high-energy top sizzle',
    points: [
      { freq: 20, gain: 8.0 },
      { freq: 60, gain: 9.0 },
      { freq: 150, gain: 5.0 },
      { freq: 500, gain: -1.0 },
      { freq: 1500, gain: 0.5 },
      { freq: 4000, gain: 4.5 },
      { freq: 10000, gain: 7.0 },
      { freq: 18000, gain: 6.0 },
    ],
  },
  'Acoustic Velvet': {
    name: 'Acoustic Velvet',
    category: 'Acoustic',
    description: 'Organic wood resonance, warm string body, and velvety un-hyped highs',
    points: [
      { freq: 20, gain: 1.0 },
      { freq: 100, gain: 2.5 },
      { freq: 350, gain: 5.0 },
      { freq: 1000, gain: 3.0 },
      { freq: 3000, gain: 1.5 },
      { freq: 8000, gain: 3.5 },
      { freq: 15000, gain: 4.0 },
    ],
  },
  'Lo-Fi Tape & Vinyl': {
    name: 'Lo-Fi Tape & Vinyl',
    category: 'Special',
    description: 'Vintage cassette warmth, rolled-off digital top-end, and mid-range saturation',
    points: [
      { freq: 20, gain: 2.0 },
      { freq: 100, gain: 5.0 },
      { freq: 300, gain: 6.5 },
      { freq: 1000, gain: 1.0 },
      { freq: 3000, gain: -2.5 },
      { freq: 7000, gain: -4.0 },
      { freq: 12000, gain: -6.0 },
      { freq: 20000, gain: -8.0 },
    ],
  },
  'Heavy Metal & Rock': {
    name: 'Heavy Metal & Rock',
    category: 'Acoustic',
    description: 'Deep kick drum punch, scooped 500Hz mid-range, aggressive guitar bite at 3.5kHz',
    points: [
      { freq: 20, gain: 6.0 },
      { freq: 80, gain: 7.5 },
      { freq: 250, gain: 2.0 },
      { freq: 500, gain: -4.0 },
      { freq: 1500, gain: 1.0 },
      { freq: 3500, gain: 6.5 },
      { freq: 8000, gain: 5.0 },
      { freq: 16000, gain: 4.0 },
    ],
  },
  'Jazz Club Warmth': {
    name: 'Jazz Club Warmth',
    category: 'Acoustic',
    description: 'Round upright bass presence, intimate brass clarity, and smooth brushed cymbals',
    points: [
      { freq: 20, gain: 3.0 },
      { freq: 90, gain: 5.0 },
      { freq: 300, gain: 4.5 },
      { freq: 1000, gain: 2.0 },
      { freq: 2500, gain: 2.0 },
      { freq: 7000, gain: 1.5 },
      { freq: 14000, gain: 2.5 },
    ],
  },
  'Air & Hi-Fi Sparkle': {
    name: 'Air & Hi-Fi Sparkle',
    category: 'Mastering',
    description: 'Subtle mastering curve with silky pop brilliance above 10kHz',
    points: [
      { freq: 20, gain: 2.0 },
      { freq: 80, gain: 2.0 },
      { freq: 300, gain: 0 },
      { freq: 1000, gain: 1.5 },
      { freq: 4000, gain: 4.0 },
      { freq: 10000, gain: 7.5 },
      { freq: 16000, gain: 9.5 },
      { freq: 20000, gain: 8.0 },
    ],
  },
  'Cinema Surround Dynamic': {
    name: 'Cinema Surround Dynamic',
    category: 'Special',
    description: 'Deep theatrical sub-rumble, crystal-clear center dialogue, dynamic ambience',
    points: [
      { freq: 20, gain: 8.5 },
      { freq: 50, gain: 8.0 },
      { freq: 150, gain: 3.5 },
      { freq: 600, gain: -1.5 },
      { freq: 1500, gain: 3.0 },
      { freq: 4000, gain: 5.0 },
      { freq: 10000, gain: 6.5 },
      { freq: 20000, gain: 5.5 },
    ],
  },
  'Drum & Bass Sub Slammer': {
    name: 'Drum & Bass Sub Slammer',
    category: 'Electronic',
    description: 'Sub-low rumble (40Hz-80Hz), tight snare snap (2kHz), and attenuated mud (300Hz)',
    points: [
      { freq: 20, gain: 10.0 },
      { freq: 45, gain: 9.5 },
      { freq: 90, gain: 7.0 },
      { freq: 250, gain: -2.0 },
      { freq: 1000, gain: 0 },
      { freq: 2500, gain: 4.5 },
      { freq: 8000, gain: 5.0 },
      { freq: 16000, gain: 6.0 },
    ],
  },
  'R&B Silk & Groove': {
    name: 'R&B Silk & Groove',
    category: 'Vocal',
    description: 'Silky vocal highs, luscious sub warmth, and velvety smooth acoustic mids',
    points: [
      { freq: 20, gain: 6.0 },
      { freq: 80, gain: 6.5 },
      { freq: 200, gain: 2.0 },
      { freq: 500, gain: 1.0 },
      { freq: 1500, gain: 3.5 },
      { freq: 4000, gain: 5.0 },
      { freq: 10000, gain: 6.5 },
      { freq: 18000, gain: 5.0 },
    ],
  },
  'Classical Symphony Hall': {
    name: 'Classical Symphony Hall',
    category: 'Acoustic',
    description: 'Wide natural acoustic dynamics, grand orchestral hall ambience, smooth strings',
    points: [
      { freq: 20, gain: 2.0 },
      { freq: 60, gain: 3.5 },
      { freq: 200, gain: 1.5 },
      { freq: 1000, gain: 1.0 },
      { freq: 3000, gain: 2.0 },
      { freq: 7000, gain: 4.0 },
      { freq: 14000, gain: 4.5 },
      { freq: 20000, gain: 3.0 },
    ],
  },
  'Gaming Footsteps & Cues': {
    name: 'Gaming Footsteps & Cues',
    category: 'Special',
    description: 'Boosts spatial footsteps (1kHz-3kHz), directional cues (6kHz), while cutting boom',
    points: [
      { freq: 20, gain: -6.0 },
      { freq: 80, gain: -3.0 },
      { freq: 200, gain: -1.0 },
      { freq: 800, gain: 3.0 },
      { freq: 2000, gain: 7.5 },
      { freq: 4000, gain: 8.0 },
      { freq: 8000, gain: 6.0 },
      { freq: 16000, gain: 2.0 },
    ],
  },
};

/**
 * Logarithmic frequency interpolation to project a control point curve onto any band count
 */
export function interpolateGainsForBands(bandCount: EQBandCount, points: CurveControlPoint[]): number[] {
  const bands = BAND_CONFIGURATIONS[bandCount];
  if (!bands || bands.length === 0) return [];

  // Sort control points by freq
  const sorted = [...points].sort((a, b) => a.freq - b.freq);

  return bands.map((band) => {
    const f = band.freq;
    // If f is below lowest point
    if (f <= sorted[0].freq) return sorted[0].gain;
    // If f is above highest point
    if (f >= sorted[sorted.length - 1].freq) return sorted[sorted.length - 1].gain;

    // Find adjacent points
    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i];
      const p2 = sorted[i + 1];
      if (f >= p1.freq && f <= p2.freq) {
        // Logarithmic interpolation
        const logF = Math.log10(f);
        const logP1 = Math.log10(p1.freq);
        const logP2 = Math.log10(p2.freq);
        const ratio = (logF - logP1) / (logP2 - logP1);
        const gain = p1.gain + ratio * (p2.gain - p1.gain);
        return Math.round(gain * 10) / 10;
      }
    }
    return 0;
  });
}

/**
 * Transforms an array of band gains:
 */
export function transformGains(
  gains: number[],
  action: 'flatten' | 'invert' | 'smooth' | 'bass-tilt' | 'treble-tilt' | 'random' | 'boost-3db' | 'cut-3db',
  maxRange = 12
): number[] {
  switch (action) {
    case 'flatten':
      return gains.map(() => 0);
    case 'invert':
      return gains.map((g) => Math.max(-maxRange, Math.min(maxRange, Math.round(-g * 10) / 10)));
    case 'smooth': {
      return gains.map((g, i) => {
        const prev = i > 0 ? gains[i - 1] : g;
        const next = i < gains.length - 1 ? gains[i + 1] : g;
        const avg = (prev + g * 2 + next) / 4;
        return Math.round(avg * 10) / 10;
      });
    }
    case 'bass-tilt': {
      const n = gains.length;
      return gains.map((g, i) => {
        const tilt = 5 - (i / (n - 1)) * 10; // +5 at bass down to -5 at treble
        const res = Math.max(-maxRange, Math.min(maxRange, g + tilt));
        return Math.round(res * 10) / 10;
      });
    }
    case 'treble-tilt': {
      const n = gains.length;
      return gains.map((g, i) => {
        const tilt = -5 + (i / (n - 1)) * 10; // -5 at bass up to +5 at treble
        const res = Math.max(-maxRange, Math.min(maxRange, g + tilt));
        return Math.round(res * 10) / 10;
      });
    }
    case 'boost-3db':
      return gains.map((g) => Math.min(maxRange, Math.round((g + 3) * 10) / 10));
    case 'cut-3db':
      return gains.map((g) => Math.max(-maxRange, Math.round((g - 3) * 10) / 10));
    case 'random': {
      // Create a smooth musical curve
      let curr = (Math.random() - 0.5) * 6;
      return gains.map((_, i) => {
        curr += (Math.random() - 0.5) * 3;
        curr = Math.max(-maxRange * 0.7, Math.min(maxRange * 0.7, curr));
        return Math.round(curr * 10) / 10;
      });
    }
    default:
      return gains;
  }
}

/**
 * Calculates auto-gain loudness compensation offset in dB
 */
export function calculateAutoGainCompensation(gains: number[]): number {
  if (gains.length === 0) return 0;
  const avg = gains.reduce((sum, g) => sum + g, 0) / gains.length;
  // Attenuate roughly 60% of average boost to preserve loudness parity
  return Math.round(-avg * 0.6 * 10) / 10;
}
