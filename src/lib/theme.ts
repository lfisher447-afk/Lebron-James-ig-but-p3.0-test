import { ThemePalette } from '../types';

export interface PaletteConfig {
  id: ThemePalette;
  label: string;
  primary: string;
  glow: string;
  glowHex: string;
  border: string;
  bgDark: string;
  bgPanel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  hoverBg: string;
  activeBg: string;
  navActive: string;
  btnActive: string;
  iconBg: string;
  progressBarGradient: string;
}

export const PALETTES: Record<ThemePalette, PaletteConfig> = {
  cyan: {
    id: 'cyan',
    label: 'Signal Cyan',
    primary: '#48e4ff',
    glow: 'rgba(72, 228, 255, 0.35)',
    glowHex: '#143e47',
    border: '#1a3840',
    bgDark: '#040d10',
    bgPanel: '#071317',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    badgeText: '#38bdf8',
    badgeBorder: 'rgba(56, 189, 248, 0.3)',
    hoverBg: 'rgba(72, 228, 255, 0.1)',
    activeBg: 'rgba(20, 62, 71, 0.6)',
    navActive: 'bg-gradient-to-r from-cyan-950/60 via-sky-900/40 to-slate-900/50 text-white border-cyan-500/40 shadow-cyan-500/10',
    btnActive: 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]',
    iconBg: 'bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 shadow-[0_0_20px_rgba(56,189,248,0.4)]',
    progressBarGradient: 'from-cyan-400 via-sky-400 to-emerald-400',
  },
  violet: {
    id: 'violet',
    label: 'Cyber Violet',
    primary: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.35)',
    glowHex: '#2e1245',
    border: '#3b1d54',
    bgDark: '#0d0414',
    bgPanel: '#13071d',
    badgeBg: 'rgba(192, 132, 252, 0.15)',
    badgeText: '#c084fc',
    badgeBorder: 'rgba(192, 132, 252, 0.3)',
    hoverBg: 'rgba(192, 132, 252, 0.1)',
    activeBg: 'rgba(46, 18, 69, 0.6)',
    navActive: 'bg-gradient-to-r from-purple-950/60 via-violet-900/40 to-slate-900/50 text-white border-purple-500/40 shadow-purple-500/10',
    btnActive: 'bg-purple-950/60 border-purple-500/50 text-purple-300 shadow-[0_0_12px_rgba(192,132,252,0.2)]',
    iconBg: 'bg-gradient-to-br from-purple-400 via-violet-500 to-pink-600 shadow-[0_0_20px_rgba(192,132,252,0.4)]',
    progressBarGradient: 'from-purple-400 via-violet-400 to-fuchsia-400',
  },
  emerald: {
    id: 'emerald',
    label: 'Matrix Emerald',
    primary: '#34d399',
    glow: 'rgba(52, 211, 153, 0.35)',
    glowHex: '#0f382a',
    border: '#154a37',
    bgDark: '#03120c',
    bgPanel: '#061a12',
    badgeBg: 'rgba(52, 211, 153, 0.15)',
    badgeText: '#34d399',
    badgeBorder: 'rgba(52, 211, 153, 0.3)',
    hoverBg: 'rgba(52, 211, 153, 0.1)',
    activeBg: 'rgba(15, 56, 42, 0.6)',
    navActive: 'bg-gradient-to-r from-emerald-950/60 via-teal-900/40 to-slate-900/50 text-white border-emerald-500/40 shadow-emerald-500/10',
    btnActive: 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.2)]',
    iconBg: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 shadow-[0_0_20px_rgba(52,211,153,0.4)]',
    progressBarGradient: 'from-emerald-400 via-teal-400 to-green-400',
  },
  amber: {
    id: 'amber',
    label: 'Amber Synth',
    primary: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.35)',
    glowHex: '#3d2e0a',
    border: '#4d3a0f',
    bgDark: '#120d03',
    bgPanel: '#1a1306',
    badgeBg: 'rgba(251, 191, 36, 0.15)',
    badgeText: '#fbbf24',
    badgeBorder: 'rgba(251, 191, 36, 0.3)',
    hoverBg: 'rgba(251, 191, 36, 0.1)',
    activeBg: 'rgba(61, 46, 10, 0.6)',
    navActive: 'bg-gradient-to-r from-amber-950/60 via-yellow-900/40 to-slate-900/50 text-white border-amber-500/40 shadow-amber-500/10',
    btnActive: 'bg-amber-950/60 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]',
    iconBg: 'bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 shadow-[0_0_20px_rgba(251,191,36,0.4)]',
    progressBarGradient: 'from-amber-400 via-orange-400 to-yellow-400',
  },
  crimson: {
    id: 'crimson',
    label: 'Crimson Flame',
    primary: '#f87171',
    glow: 'rgba(248, 113, 113, 0.35)',
    glowHex: '#3d1212',
    border: '#541c1c',
    bgDark: '#120404',
    bgPanel: '#1a0707',
    badgeBg: 'rgba(248, 113, 113, 0.15)',
    badgeText: '#f87171',
    badgeBorder: 'rgba(248, 113, 113, 0.3)',
    hoverBg: 'rgba(248, 113, 113, 0.1)',
    activeBg: 'rgba(61, 18, 18, 0.6)',
    navActive: 'bg-gradient-to-r from-rose-950/60 via-red-900/40 to-slate-900/50 text-white border-rose-500/40 shadow-rose-500/10',
    btnActive: 'bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-[0_0_12px_rgba(248,113,113,0.2)]',
    iconBg: 'bg-gradient-to-br from-rose-400 via-red-500 to-orange-600 shadow-[0_0_20px_rgba(248,113,113,0.4)]',
    progressBarGradient: 'from-rose-400 via-red-400 to-orange-400',
  },
};

export function applyThemePalette(palette: ThemePalette = 'cyan') {
  const p = PALETTES[palette] || PALETTES.cyan;
  const root = document.documentElement;

  root.style.setProperty('--accent-primary', p.primary);
  root.style.setProperty('--accent-glow', p.glow);
  root.style.setProperty('--accent-glow-hex', p.glowHex);
  root.style.setProperty('--accent-border', p.border);
  root.style.setProperty('--accent-badge-bg', p.badgeBg);
  root.style.setProperty('--accent-badge-text', p.badgeText);
  root.style.setProperty('--accent-badge-border', p.badgeBorder);
  root.style.setProperty('--accent-hover-bg', p.hoverBg);
  root.style.setProperty('--accent-active-bg', p.activeBg);

  document.body.setAttribute('data-theme', p.id);
}
