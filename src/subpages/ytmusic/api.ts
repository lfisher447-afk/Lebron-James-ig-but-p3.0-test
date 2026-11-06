"use client";

// ============================================================================
// UNIFIED YOUTUBE CLIENT & ENGINE (.tsx)
//
// Combined standalone bundle containing:
//   - yt-format.ts       (Formatting & time helpers)
//   - yt-avatar.ts       (Channel avatar localStorage cache)
//   - yt-theme.ts        (Theme engine & appearance prefs)
//   - yt-embed-api.ts    (Official YouTube IFrame API loader)
//   - yt-native.ts       (Native media bridge & background playback)
//   - innertube.ts       (InnerTube direct data engine)
//   - yt-api.ts          (Unified API client & source router)
//   - yt-router.ts       (Client-side router & zustand store)
//   - yt-store.ts        (Local persistence store for subs, history, likes)
//   - yt-playback.ts     (Persistent playback state & audio manager)
//   - CountdownCard.tsx  (Embedded auto-play next card)
//   - VideoPlayer.tsx    (Full featured standalone video player)
//   - VideoSurface.tsx   (The single persistent adopted video surface)
// ============================================================================

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import Hls from "hls.js";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { YtBackground as YtBackgroundNative } from "yt-background";
import type {
  YtBackgroundPlugin,
  YtBackgroundControlEvent,
  YtBackgroundEnableOptions,
  YtBackgroundUpdateOptions,
  YtBackgroundPipOnHomeOptions,
} from "yt-background";
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  ArrowLeft,
  Gauge,
  Check,
  ChevronRight,
  ChevronLeft,
  PictureInPicture2,
  Headphones,
  RotateCcw,
  RotateCw,
} from "lucide-react";

// ============================================================================
// SECTION: INLINE COMMUNITY / PIPED ADAPTER
// ============================================================================

export let activeCommunityInstance = "https://pipedapi.kavin.rocks";
export let pipedActiveInstance = activeCommunityInstance;

export async function probeCommunity(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${activeCommunityInstance}/trending?region=US`, { signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export function mapPipedItem(item: any): YtVideo | null {
  if (!item || (!item.url && !item.id)) return null;
  const id = item.id || item.url?.replace("/watch?v=", "") || "";
  return {
    id,
    title: item.title || "",
    channel: item.uploaderName || item.channel || "",
    channel_id: item.uploaderUrl?.replace("/channel/", "") || item.channelId || "",
    views: formatViews(item.views || 0),
    duration: typeof item.duration === "number" ? formatTime(item.duration) : item.duration || "0:00",
    published: item.uploadedDate || "",
    thumb: item.thumbnail || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    thumb_lg: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    is_live: !!item.isLive,
  };
}

export async function communityHome(category: string): Promise<{ category: string; source: string; results: YtVideo[] }> {
  try {
    const res = await fetch(`${activeCommunityInstance}/trending?region=US`);
    const data = await res.json();
    const results = (Array.isArray(data) ? data : []).map(mapPipedItem).filter(Boolean) as YtVideo[];
    return { category, source: "community", results };
  } catch {
    return { category, source: "community", results: [] };
  }
}

export async function communitySearch(q: string): Promise<{ query: string; channel?: YtChannelResult | null; results: YtVideo[] }> {
  try {
    const res = await fetch(`${activeCommunityInstance}/search?q=${encodeURIComponent(q)}&filter=videos`);
    const data = await res.json();
    const results = (data.items || []).map(mapPipedItem).filter(Boolean) as YtVideo[];
    return { query: q, channel: null, results };
  } catch {
    return { query: q, channel: null, results: [] };
  }
}

export async function communityVideo(id: string): Promise<YtVideoFull> {
  const res = await fetch(`${activeCommunityInstance}/streams/${id}`);
  const data = await res.json();
  return {
    id,
    ok: true,
    embed_fallback: false,
    title: data.title || "",
    channel: data.uploader || "",
    channel_id: data.uploaderUrl?.replace("/channel/", "") || "",
    channel_thumb: data.uploaderAvatar || "",
    views: data.views || 0,
    likes: data.likes || 0,
    duration: data.duration || 0,
    published: data.uploadDate || "",
    description: data.description || "",
    formats: (data.videoStreams || []).concat(data.audioStreams || []).map((s: any) => ({
      itag: s.itag || 0,
      mime: s.mimeType || "",
      codecs: s.codec || "",
      quality_label: s.quality || "",
      height: s.height || 0,
      width: s.width || 0,
      fps: s.fps || 0,
      bitrate: s.bitrate || 0,
      has_video: !s.audioOnly,
      has_audio: !s.videoOnly,
      url: s.url,
    })),
    hls: data.hls || null,
    captions: (data.subtitles || []).map((c: any) => ({
      lang: c.code,
      name: c.name,
      url: c.url,
    })),
    storyboard: null,
    related: (data.relatedStreams || []).map(mapPipedItem).filter(Boolean) as YtVideo[],
    chapters: (data.chapters || []).map((c: any) => ({ title: c.title, start: c.start })),
  };
}

export async function communityComments(id: string): Promise<{ comments: YtComment[]; count: number | null }> {
  try {
    const res = await fetch(`${activeCommunityInstance}/comments/${id}`);
    const data = await res.json();
    const comments = (data.comments || []).map((c: any) => ({
      author: c.author,
      author_id: c.authorUrl || "",
      author_thumb: c.thumbnail,
      text: c.commentText,
      likes: c.likeCount || 0,
      time: c.commentedTime,
      replies: c.replyCount || 0,
    }));
    return { comments, count: comments.length };
  } catch {
    return { comments: [], count: 0 };
  }
}

export async function communityChannel(id: string): Promise<YtChannel> {
  const res = await fetch(`${activeCommunityInstance}/channel/${id}`);
  const data = await res.json();
  return {
    id,
    name: data.name || "",
    description: data.description || "",
    avatar: data.avatarUrl || "",
    banner: data.bannerUrl || "",
    subscribers: `${formatCount(data.subscriberCount || 0)} subscribers`,
    videos: (data.relatedStreams || []).map(mapPipedItem).filter(Boolean) as YtVideo[],
  };
}

// ============================================================================
// SECTION: COUNTDOWN CARD
// ============================================================================

export function CountdownCard() {
  const countdown = usePlayback((s) => s.countdown);
  const cancel = usePlayback((s) => s.cancelCountdown);
  const next = usePlayback((s) => s.nextTrack);
  const [remaining, setRemaining] = useState(5);

  useEffect(() => {
    if (!countdown) return;
    const tick = () => {
      const diff = Math.max(0, Math.ceil((countdown.until - Date.now()) / 1000));
      setRemaining(diff);
    };
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [countdown]);

  if (!countdown) return null;

  return (
    <div className="absolute bottom-16 right-4 z-40 bg-zinc-900/95 border border-zinc-700/60 rounded-xl p-3 shadow-2xl flex items-center gap-3 backdrop-blur-md max-w-sm animate-in fade-in slide-in-from-bottom-2">
      {countdown.nextThumb && (
        <img src={countdown.nextThumb} alt="" className="w-16 h-10 object-cover rounded-md shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-zinc-400 font-medium">Up next in {remaining}s</p>
        <p className="text-xs text-white font-semibold truncate">{countdown.nextTitle}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={cancel}
          className="px-2 py-1 text-xs text-zinc-400 hover:text-white rounded hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          onClick={next}
          className="px-2.5 py-1 text-xs bg-white text-black font-semibold rounded hover:bg-zinc-200"
        >
          Play
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION: yt-format.ts — Formatting helpers
// ============================================================================

export function formatViews(views: number | string | undefined | null): string {
  if (views === undefined || views === null || views === "") return "";
  if (typeof views === "string") {
    return views.replace(/\s*views?/i, "").trim();
  }
  if (views >= 1e9) return `${(views / 1e9).toFixed(views % 1e9 === 0 ? 0 : 1)}B`;
  if (views >= 1e6) return `${(views / 1e6).toFixed(views % 1e6 === 0 ? 0 : 1)}M`;
  if (views >= 1e3) return `${(views / 1e3).toFixed(views % 1e3 === 0 ? 0 : 1)}K`;
  return String(views);
}

export function formatCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function normalizeCompactAge(s: string): string {
  const m = /^(\d+)\s*(s|m|h|d|w|mo|y|yr|yrs)\s*(ago)?$/i.exec(s.trim());
  if (!m) return s;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const map: Record<string, [string, string]> = {
    s: ["second", "seconds"],
    m: ["minute", "minutes"],
    h: ["hour", "hours"],
    d: ["day", "days"],
    w: ["week", "weeks"],
    mo: ["month", "months"],
    y: ["year", "years"],
    yr: ["year", "years"],
    yrs: ["year", "years"],
  };
  const pair = map[unit];
  if (!pair) return s;
  return `${n} ${n === 1 ? pair[0] : pair[1]} ago`;
}

export function timeAgo(published: string | undefined | null): string {
  if (!published) return "";
  const p0 = published.toLowerCase();
  const norm = normalizeCompactAge(published);
  if (norm !== published) return norm;
  const p = p0;
  if (/ago|streamed|premiere/.test(p)) return published.replace(/streamed|premiere[d]*/gi, "").trim();
  const d = new Date(published);
  if (!isNaN(d.getTime())) {
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return "today";
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
    if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
    const y = Math.floor(days / 365);
    return `${y} year${y > 1 ? "s" : ""} ago`;
  }
  return published;
}

export function fullDate(published: string | undefined | null): string {
  if (!published) return "";
  return published;
}

// ============================================================================
// SECTION: yt-avatar.ts — Channel avatar cache (localStorage backed)
// ============================================================================

const AVATAR_KEY = "yt_avatar_cache";
const AVATAR_MAX = 240;

type AvatarCache = Record<string, string>;

function readAvatarCache(): AvatarCache {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(AVATAR_KEY) || "{}") as AvatarCache;
  } catch {
    return {};
  }
}

function writeAvatarCache(c: AvatarCache) {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(c);
    if (keys.length > AVATAR_MAX) {
      for (const k of keys.slice(0, keys.length - AVATAR_MAX)) delete c[k];
    }
    window.localStorage.setItem(AVATAR_KEY, JSON.stringify(c));
  } catch {}
}

export function rememberAvatar(channelId: string, url: string) {
  if (!channelId || !url || !/^https?:/.test(url)) return;
  const c = readAvatarCache();
  if (c[channelId] === url) return;
  c[channelId] = url;
  writeAvatarCache(c);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("yt-avatars"));
  }
}

export function getAvatar(channelId: string): string {
  if (!channelId) return "";
  return readAvatarCache()[channelId] || "";
}

// ============================================================================
// SECTION: yt-theme.ts — Theme engine
// ============================================================================

export type ThemeMode = "dark" | "light" | "system";

export function resolveIsLight(mode: ThemeMode): boolean {
  if (mode === "light") return true;
  if (mode === "dark") return false;
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const light = resolveIsLight(mode);
  const root = document.documentElement;
  root.classList.toggle("yt-light", light);
  root.classList.toggle("yt-dark", !light);
}

export function watchSystemTheme(getMode: () => ThemeMode) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const onChange = () => {
    if (getMode() === "system") applyTheme("system");
  };
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export const THEME_BOOT_SCRIPT = `(function(){try{var m="dark";var raw=localStorage.getItem("yt-app-store");if(raw){var j=JSON.parse(raw);var p=j&&j.state&&j.state.prefs;if(p&&p.theme){m=p.theme;}}var l=m==="light"||(m==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches);var r=document.documentElement;r.classList.toggle("yt-light",l);r.classList.toggle("yt-dark",!l);var a=false;try{a=!!window.androidBridge||!!(window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==="android");}catch(e2){}r.classList.toggle("yt-android",a);}catch(e){}})();`;

// ============================================================================
// SECTION: yt-embed-api.ts — Official YouTube IFrame API loader
// ============================================================================

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: Record<string, unknown>
      ) => {
        destroy: () => void;
        [k: string]: unknown;
      };
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; [k: string]: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<NonNullable<Window["YT"]>> | null = null;

export function loadYouTubeIframeAPI(): Promise<NonNullable<Window["YT"]>> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        apiPromise = null;
        reject(new Error("iframe api timeout"));
      }, 8000);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        clearTimeout(timeout);
        if (window.YT) resolve(window.YT);
        else reject(new Error("iframe api missing"));
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => {
        clearTimeout(timeout);
        apiPromise = null;
        reject(new Error("iframe api failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

// ============================================================================
// SECTION: yt-native.ts — Native media bridge & Background service
// ============================================================================

let nativePlugin: YtBackgroundPlugin | null = null;

function getNative(): YtBackgroundPlugin | null {
  if (typeof window === "undefined") return null;
  if (nativePlugin !== null) return nativePlugin;
  if (!Capacitor.isNativePlatform()) return null;
  nativePlugin = YtBackgroundNative;
  return nativePlugin;
}

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (typeof Capacitor !== "undefined" && Capacitor.isNativePlatform?.()) return true;
  } catch {}
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export function isAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    androidBridge?: unknown;
    Capacitor?: { getPlatform?: () => string };
  };
  if (w.androidBridge) return true;
  try {
    return w.Capacitor?.getPlatform?.() === "android";
  } catch {
    return false;
  }
}

export function applyPlatformClass() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("yt-android", isAndroidApp());
}

export function nativeBackgroundEnable(opts: YtBackgroundEnableOptions) {
  getNative()?.enable(opts).catch(() => {});
}

export function nativeBackgroundUpdate(opts: YtBackgroundUpdateOptions) {
  getNative()?.update(opts).catch(() => {});
}

export function nativeBackgroundDisable() {
  getNative()?.disable().catch(() => {});
}

export function nativeKeepAwake(enable: boolean) {
  getNative()?.keepAwake({ enable }).catch(() => {});
}

export function nativeEnterPip() {
  getNative()?.enterPip().catch(() => {});
}

export function nativeSetPipOnHome(enable: boolean) {
  const opts: YtBackgroundPipOnHomeOptions = { enable };
  getNative()?.setPipOnHome(opts).catch(() => {});
}

export function addControlListener(
  cb: (e: YtBackgroundControlEvent) => void,
): () => void {
  const p = getNative();
  if (!p) return () => {};

  const w = window as unknown as {
    Capacitor?: {
      addListener?: (
        pluginName: string,
        eventName: string,
        callback: (data: YtBackgroundControlEvent) => void,
      ) => { remove?: () => void | Promise<void> } | string | Promise<unknown>;
      removeListener?: (pluginName: string, callbackId: string, eventName: string, callback: unknown) => void;
    };
  };
  const bridge = w.Capacitor?.addListener?.bind(w.Capacitor);
  if (bridge) {
    try {
      const ret = bridge("YtBackground", "control", cb) as
        | { remove?: () => void | Promise<void> }
        | string
        | Promise<unknown>;
      if (ret && typeof ret === "object" && typeof (ret as { remove?: unknown }).remove === "function") {
        const rm = (ret as { remove: () => void | Promise<void> }).remove;
        let disposed = false;
        return () => { if (!disposed) { disposed = true; Promise.resolve(rm()).catch(() => {}); } };
      }
      return () => {};
    } catch {}
  }

  let handle: PluginListenerHandle | null = null;
  let disposed = false;
  p.addListener("control", cb)
    .then((h) => {
      if (disposed) h.remove().catch(() => {});
      else handle = h;
    })
    .catch(() => {});
  return () => {
    disposed = true;
    handle?.remove().catch(() => {});
  };
}

const w3cSessionActive = () =>
  typeof navigator !== "undefined" && "mediaSession" in navigator && !isNativeApp();

type MsHandlers = {
  play?: () => void;
  pause?: () => void;
  next?: () => void;
  prev?: () => void;
  seek?: (to: number) => void;
  seekBy?: (d: number) => void;
};

export function setMediaMetadata(meta: { title?: string; artist?: string; artwork?: string; duration?: number }) {
  if (!w3cSessionActive()) return;
  try {
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: meta.title || "YouTube",
      artist: meta.artist || "",
      artwork: meta.artwork ? [{ src: meta.artwork, sizes: "480x360", type: "image/jpeg" }] : [],
    });
  } catch {}
}

export function setMediaPlaybackState(playing: boolean) {
  if (!w3cSessionActive()) return;
  try {
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  } catch {}
}

export function setMediaPositionState(position: number, duration: number, rate = 1) {
  if (!w3cSessionActive()) return;
  if (!isFinite(position) || !isFinite(duration) || duration <= 0) return;
  try {
    navigator.mediaSession.setPositionState?.({ position: Math.max(0, Math.min(duration, position)), duration, playbackRate: rate || 1 });
  } catch {}
}

export function setMediaHandlers(h: MsHandlers) {
  if (!w3cSessionActive()) return;
  const ms = navigator.mediaSession;
  const set = (action: MediaSessionAction, fn: ((d?: MediaSessionActionDetails) => void) | null) => {
    try {
      ms.setActionHandler(action, fn as ((d: MediaSessionActionDetails) => void) | null);
    } catch {}
  };
  set("play", h.play ? () => h.play?.() : null);
  set("pause", h.pause ? () => h.pause?.() : null);
  set("nexttrack", h.next ? () => h.next?.() : null);
  set("previoustrack", h.prev ? () => h.prev?.() : null);
  set("seekto", h.seek ? (d) => d?.seekTime != null && h.seek?.(d.seekTime) : null);
  set("seekbackward", h.seekBy ? (d) => h.seekBy?.(-(d?.seekOffset || 10)) : null);
  set("seekforward", h.seekBy ? (d) => h.seekBy?.(d?.seekOffset || 10) : null);
}

export function clearMediaHandlers() {
  setMediaHandlers({});
}

// ============================================================================
// SECTION: API Interfaces & Core Types
// ============================================================================

export interface YtVideo {
  id: string;
  title: string;
  channel: string;
  channel_id: string;
  channel_thumb?: string;
  views: string;
  duration: string;
  published: string;
  thumb: string;
  thumb_lg: string;
  is_live?: boolean;
  shorts?: boolean;
}

export interface YtFormat {
  itag: number;
  mime: string;
  codecs: string;
  quality_label: string;
  height: number;
  width: number;
  fps: number;
  bitrate: number;
  has_video: boolean;
  has_audio: boolean;
  url: string;
}

export interface YtCaption {
  lang: string;
  name: string;
  url: string;
}

export interface YtChapter {
  title: string;
  start: number;
}

export interface YtVideoFull extends Partial<YtVideo> {
  id: string;
  ok: boolean;
  embed_fallback: boolean;
  title: string;
  channel: string;
  channel_id: string;
  channel_thumb?: string;
  channel_subs?: string;
  views: number | string;
  likes: number;
  duration: number;
  published: string;
  description: string;
  is_live?: boolean;
  formats: YtFormat[];
  hls: string | null;
  captions: YtCaption[];
  storyboard: { width: number; height: number; columns: number; rows: number; interval: number; template_url: string; templateUrlPattern?: string } | null;
  related: YtVideo[];
  chapters: YtChapter[];
  playability_reason?: string | null;
  embed_blocked?: boolean;
  unavailable?: boolean;
}

export interface YtComment {
  author: string;
  author_id: string;
  author_thumb?: string;
  text: string;
  likes: number;
  time: string;
  replies: number;
  creator_heart?: boolean;
}

export interface YtChannel {
  id: string;
  name: string;
  description: string;
  avatar: string;
  banner: string;
  subscribers: string;
  videos: YtVideo[];
}

export interface SbSegment {
  category: string;
  action: string;
  start: number;
  end: number;
}

export interface YtFeedPage {
  results: YtVideo[];
  continuation: string | null;
}

export interface YtChannelResult {
  id: string;
  name: string;
  avatar: string;
  subscribers: string;
  description: string;
  verified?: boolean;
}

// ============================================================================
// SECTION: innertube.ts — Standalone InnerTube Data Engine
// ============================================================================

const WEB_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const ANDROID_KEY = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w";
const IT_HOST = "https://www.youtube.com";
const SUGGEST_URL = "https://suggestqueries-clients6.youtube.com/complete/search";

const WEB_CTX = { client: { clientName: "WEB", clientVersion: "2.20240726.00.00", hl: "en", gl: "US" } };
const VR_CTX = {
  client: {
    clientName: "ANDROID_VR", clientVersion: "1.60.19", deviceModel: "Quest 3",
    osName: "Android", osVersion: "12L", androidSdkVersion: 32, hl: "en", gl: "US",
  },
};
const TV_CTX_VERSION = "7.20260909.12.00";
const tvCtx = (visitorData?: string) => ({
  client: {
    clientName: "TVHTML5", clientVersion: TV_CTX_VERSION, hl: "en", gl: "US",
    ...(visitorData ? { visitorData } : {}),
  },
});

export class ItError extends Error {
  status: number;
  constructor(message: string, status = 0) { super(message); this.status = status; }
}

type AnyObj = Record<string, unknown>;

let relayAvailable: boolean | null = null;

function relayHref(): string {
  return "/api/ytb-relay?XTransformPort=3001";
}

async function probeRelay(): Promise<boolean> {
  if (relayAvailable !== null) return relayAvailable;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${relayHref()}&e=ping`, { signal: ctrl.signal });
    clearTimeout(timer);
    relayAvailable = res.ok;
  } catch { relayAvailable = false; }
  return relayAvailable;
}

export function resetTransportCache() { relayAvailable = null; }

interface ItResponse { status: number; json: AnyObj | null }

async function relayPost(endpoint: string, body: AnyObj, key: string): Promise<ItResponse> {
  const tryFetch = async (method: "POST" | "GET"): Promise<Response> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      if (method === "POST") {
        return await fetch(`${relayHref()}&e=${encodeURIComponent(endpoint)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, key, body }),
          signal: ctrl.signal,
        });
      }
      return await fetch(`${relayHref()}&e=${encodeURIComponent(endpoint)}&k=${encodeURIComponent(key)}&b=${encodeURIComponent(JSON.stringify(body))}`, {
        signal: ctrl.signal,
      });
    } finally { clearTimeout(timer); }
  };
  let res: Response;
  try {
    res = await tryFetch("POST");
    if (!res.ok && res.status >= 500) res = await tryFetch("GET");
  } catch {
    res = await tryFetch("GET");
  }
  const json = await res.json().catch(() => null);
  return { status: res.status, json: (json as AnyObj | null) ?? null };
}

async function ytPost(endpoint: string, body: AnyObj, key = WEB_KEY): Promise<AnyObj> {
  if (isNativeApp()) {
    try {
      const { CapacitorHttp } = await import("@capacitor/core");
      const res = await CapacitorHttp.post({
        url: `${IT_HOST}/youtubei/v1/${endpoint}?key=${key}&prettyPrint=false`,
        headers: { "Content-Type": "application/json" },
        data: body,
        connectTimeout: 15000,
        readTimeout: 20000,
      });
      if (res.status >= 200 && res.status < 300 && res.data) return res.data as AnyObj;
      const errMsg = (res.data as AnyObj | null)?.error as { message?: string } | undefined;
      throw new ItError(errMsg?.message || `YouTube API error (HTTP ${res.status})`, res.status);
    } catch (e) {
      if (e instanceof ItError) throw e;
      throw new ItError("Could not reach YouTube", 0);
    }
  }

  if (await probeRelay()) {
    const r = await relayPost(endpoint, body, key);
    if (r.json && (r.json as { error?: { message?: string } }).error) {
      throw new ItError((r.json as { error: { message?: string } }).error.message || "YouTube API error", r.status);
    }
    if (r.json) return r.json;
    throw new ItError("Relay returned an invalid response", r.status);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${IT_HOST}/youtubei/v1/${endpoint}?key=${key}&prettyPrint=false`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) throw new ItError("Could not reach YouTube directly", res.status);
    return json as AnyObj;
  } catch (e) {
    if (e instanceof ItError) throw e;
    throw new ItError("Could not reach YouTube", 0);
  } finally { clearTimeout(timer); }
}

export async function itSuggest(q: string): Promise<string[]> {
  const query = q.trim();
  if (!query) return [];
  const url = `${SUGGEST_URL}?client=youtube&ds=yt&q=${encodeURIComponent(query)}`;
  let text = "";
  if (isNativeApp()) {
    try {
      const { CapacitorHttp } = await import("@capacitor/core");
      const res = await CapacitorHttp.get({ url, readTimeout: 8000 });
      text = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    } catch { return []; }
  } else if (await probeRelay()) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`/api/ytb-suggest?XTransformPort=3001&q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const j = await res.json() as { suggestions?: string[] };
        return j.suggestions || [];
      }
    } catch { return []; }
  } else {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      text = await res.text();
    } catch { return []; }
  }
  return parseSuggestJsonp(text);
}

export function parseSuggestJsonp(text: string): string[] {
  try {
    const start = text.indexOf("(");
    const end = text.lastIndexOf(")");
    if (start < 0 || end <= start) return [];
    const data = JSON.parse(text.slice(start + 1, end)) as unknown[];
    const arr = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
    return arr
      .map((item: unknown) => (Array.isArray(item) ? String(item[0] || "") : ""))
      .filter((s: string) => s.length > 0)
      .slice(0, 12);
  } catch { return []; }
}

function runsText(x: unknown): string {
  const r = (x as { runs?: { text?: string }[] })?.runs;
  return r ? r.map(t => t.text || "").join("") : "";
}

function parseThumb(list: unknown): string {
  const arr = (list as { url?: string; width?: number }[]) || [];
  let best = "";
  let w = 0;
  for (const t of arr) { if ((t.width || 0) >= w) { w = t.width || 0; best = t.url || ""; } }
  return best;
}

function parseVideoRenderer(vr: AnyObj): YtVideo | null {
  const id = vr.videoId as string;
  if (!id) return null;
  const title = runsText(vr.title) || (vr.title as { simpleText?: string })?.simpleText || "";
  const ownerRuns = (vr.ownerText as { runs?: { text?: string; navigationEndpoint?: { browseEndpoint?: { browseId?: string } } }[] })?.runs;
  const channel = ownerRuns?.[0]?.text || runsText(vr.longBylineText) || "";
  const channel_id = ownerRuns?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
    || (vr.longBylineText as { runs?: { navigationEndpoint?: { browseEndpoint?: { browseId?: string } } }[] })?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
    || "";
  const views = ((vr.shortViewCountText as { simpleText?: string })?.simpleText)
    || ((vr.viewCountText as { simpleText?: string })?.simpleText)
    || runsText(vr.shortViewCountText) || "";
  const published = ((vr.publishedTimeText as { simpleText?: string })?.simpleText || "");
  let duration = ((vr.lengthText as { simpleText?: string })?.simpleText || "");
  let is_live = false;
  const badges = JSON.stringify(vr.thumbnailOverlays || "");
  if (/BADGE_STYLE_TYPE_LIVE/.test(badges) || /LIVE/i.test(duration) || /watching/i.test(views)) { is_live = true; duration = "LIVE"; }
  const thumb = parseThumb((vr.thumbnail as { thumbnails?: unknown })?.thumbnails) || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  return {
    id, title, channel, channel_id,
    views: formatViews(views.replace(/ views/i, "")),
    duration: is_live ? "LIVE" : duration,
    published,
    thumb, thumb_lg: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    is_live, shorts: false,
  };
}

function parseLockup(lv: AnyObj): YtVideo | null {
  const id = lv.contentId as string;
  if (!id) return null;
  const img = (lv.contentImage as AnyObj | undefined) || {};
  if (img.collectionThumbnailViewModel) return null;
  if (/^(RD|PL|VL|UU|OL)/.test(id)) return null;
  const meta = (lv.metadata as { lockupMetadataViewModel?: {
    title?: { content?: string };
    metadata?: { contentMetadataViewModel?: { metadataRows?: unknown[] } };
    image?: { sources?: { url?: string }[] };
  } })?.lockupMetadataViewModel;
  const title = meta?.title?.content || "";
  if (!title) return null;
  const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows as
    { metadataParts?: { text?: { content?: string }; avatar?: { image?: { sources?: { url?: string }[] } } }[] }[] | undefined;
  const parts: { text: string; avatar: string }[] = [];
  for (const row of rows || []) {
    for (const p of row.metadataParts || []) {
      const t = p.text?.content || "";
      const av = p.avatar?.image?.sources?.[0]?.url || "";
      if (t) parts.push({ text: t, avatar: av });
    }
  }
  const isTime = (t: string) => /ago|streamed|premiere|hour|day|week|month|year|minute|second/i.test(t);
  const isViewsWord = (t: string) => /views|watching/i.test(t);
  const isCompactCount = (t: string) => /^[\d.,]+\s*[KM]?$/.test(t.trim());
  const cleaned = parts.filter(p => !/full playlist|^\d+ videos?$/i.test(p.text));
  const channelPart = cleaned.find(p => !isTime(p.text) && !isViewsWord(p.text) && !isCompactCount(p.text));
  const channel = channelPart?.text && !/video|playlist|mix/i.test(channelPart.text) ? channelPart.text : "";
  const channelAvatar = channelPart?.avatar || "";
  const viewsPart = cleaned.find(p => isViewsWord(p.text))?.text
    || cleaned.find(p => !isTime(p.text) && isCompactCount(p.text))?.text
    || "";
  const timePart = cleaned.find(p => isTime(p.text))?.text || "";
  const tv = img.thumbnailViewModel;
  const thumb = tv?.image?.sources?.[0]?.url || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  let duration = "";
  let is_live = false;
  const readBadge = (b: AnyObj) => {
    const t = (b.thumbnailBadgeViewModel?.text as string) || "";
    if (!t) return;
    if (/^\d+(:\d+)+/.test(t)) duration = t;
    else if (/live/i.test(t)) { is_live = true; duration = "LIVE"; }
  };
  for (const o of tv?.overlays || []) {
    for (const b of (o.thumbnailOverlayBadgeViewModel?.badges as AnyObj[] | undefined) || []) readBadge(b);
    for (const b of ((o.thumbnailBottomOverlayViewModel as AnyObj)?.badges as AnyObj[] | undefined) || []) readBadge(b);
  }
  if (isViewsWord(viewsPart) && /watching/i.test(viewsPart)) is_live = true;
  return {
    id, title, channel, channel_id: "",
    channel_thumb: channelAvatar || undefined,
    views: formatViews(viewsPart.replace(/ views| watching/i, "")),
    duration: is_live ? "LIVE" : duration,
    published: timePart,
    thumb, thumb_lg: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    is_live, shorts: false,
  };
}

function parseRichItem(ri: AnyObj): YtVideo | null {
  const content = (ri.content as AnyObj | undefined);
  if (!content) return null;
  const vr = content.videoRenderer;
  if (vr) return parseVideoRenderer(vr);
  const lv = content.lockupViewModel;
  if (lv) return parseLockup(lv);
  const gvr = content.gridVideoRenderer;
  if (gvr) return parseVideoRenderer(gvr);
  return null;
}

export function extractVideosAndToken(node: unknown, depth = 0): { videos: YtVideo[]; token: string | null } {
  const videos: YtVideo[] = [];
  let token: string | null = null;
  let sectionToken: string | null = null;
  const visit = (n: unknown, d: number) => {
    if (!n || typeof n !== "object" || d > 14) return;
    if (Array.isArray(n)) { for (const item of n) visit(item, d + 1); return; }
    const obj = n as AnyObj;
    if (obj.videoRenderer) { const v = parseVideoRenderer(obj.videoRenderer as AnyObj); if (v) videos.push(v); }
    else if (obj.lockupViewModel) {
      const v = parseLockup(obj.lockupViewModel as AnyObj);
      if (v) videos.push(v);
    } else if (obj.richItemRenderer) {
      const v = parseRichItem(obj.richItemRenderer as AnyObj);
      if (v) videos.push(v);
    } else if (obj.gridVideoRenderer) {
      const v = parseVideoRenderer(obj.gridVideoRenderer as AnyObj);
      if (v) videos.push(v);
    } else if (obj.continuationItemRenderer) {
      const tok = ((obj.continuationItemRenderer as AnyObj).continuationEndpoint as { continuationCommand?: { token?: string } })?.continuationCommand?.token;
      if (tok) token = tok;
    } else if (obj.sectionListRenderer) {
      const conts = (obj.sectionListRenderer as AnyObj).continuations as { nextContinuationData?: { continuation?: string } }[] | undefined;
      const tok = conts?.[0]?.nextContinuationData?.continuation;
      if (tok && !sectionToken) sectionToken = tok;
    } else if (obj.richGridRenderer) {
      const conts = (obj.richGridRenderer as AnyObj).continuations as { nextContinuationData?: { continuation?: string } }[] | undefined;
      const tok = conts?.[0]?.nextContinuationData?.continuation;
      if (tok && !sectionToken) sectionToken = tok;
    }
    for (const k of Object.keys(obj)) {
      if (k === "videoRenderer" || k === "lockupViewModel" || k === "richItemRenderer" || k === "gridVideoRenderer" || k === "continuationItemRenderer") continue;
      visit(obj[k], d + 1);
    }
  };
  visit(node, depth);
  return { videos, token: sectionToken || token };
}

function dedupe(videos: YtVideo[]): YtVideo[] {
  const seen = new Set<string>();
  const out: YtVideo[] = [];
  for (const v of videos) {
    if (!v.id || seen.has(v.id) || !v.title) continue;
    seen.add(v.id);
    out.push(v);
  }
  return out;
}

const CATEGORY_QUERIES: Record<string, string> = {
  all: "trending",
  music: "popular music",
  gaming: "gaming",
  news: "breaking news today",
  movies: "full movies",
  live: "live stream",
  tech: "technology",
  sports: "sports highlights",
  learning: "learning",
  comedy: "comedy",
  podcasts: "podcast",
  cooking: "cooking",
  trailers: "movie trailer",
};

export interface ItFeedPage { videos: YtVideo[]; continuation: string | null; source: string }

const HOME_SEED_QUERIES = ["trending", "most viewed this month", "viral this week", "popular this week"];

function homeCont(seedIdx: number, token: string | null | undefined): string | null {
  return token ? `rot:${seedIdx}:${token}` : null;
}
function parseHomeCont(c: string): { seedIdx: number; token: string } | null {
  const m = /^rot:(\d+):(.+)$/.exec(c);
  if (!m) return null;
  return { seedIdx: parseInt(m[1], 10), token: m[2] };
}

export async function itHome(category: string, continuation?: string): Promise<ItFeedPage> {
  const isLive = category === "live";
  const seeds = category === "all"
    ? HOME_SEED_QUERIES
    : [CATEGORY_QUERIES[category] || category || "trending"];

  if (continuation) {
    const parsed = parseHomeCont(continuation);
    if (parsed) {
      const page = await itSearchRaw(seeds[Math.min(parsed.seedIdx, seeds.length - 1)], parsed.token, "innertube:home", isLive);
      if (page.videos.length >= 3 && page.continuation) {
        return { videos: page.videos, continuation: homeCont(parsed.seedIdx, page.continuation), source: "innertube:home" };
      }
      const nextIdx = parsed.seedIdx + 1;
      if (nextIdx < seeds.length && category === "all") {
        const fresh = await itSearchRaw(seeds[nextIdx], undefined, "innertube:home", isLive);
        return {
          videos: [...page.videos, ...fresh.videos],
          continuation: homeCont(nextIdx, fresh.continuation),
          source: "innertube:home",
        };
      }
      return { videos: page.videos, continuation: homeCont(parsed.seedIdx, page.continuation), source: "innertube:home" };
    }
    return itSearchRaw(seeds[0], continuation, "innertube:home", isLive);
  }

  const pages = await Promise.all(
    seeds.map(query => itSearchRaw(query, undefined, "innertube:home", isLive))
  );
  const merged: YtVideo[] = [];
  const seen = new Set<string>();
  const maxLen = Math.max(...pages.map(p => p.videos.length));
  for (let i = 0; i < maxLen; i++) {
    for (const page of pages) {
      const v = page.videos[i];
      if (v && !seen.has(v.id) && v.title) { seen.add(v.id); merged.push(v); }
    }
  }
  const firstCont = pages.find(p => p.continuation)?.continuation || null;
  const cont = category === "all" ? homeCont(0, firstCont) : firstCont;
  return { videos: merged, continuation: cont, source: "innertube:home" };
}

function searchContinuationToken(json: AnyObj): string | null {
  const cmds = (json.onResponseReceivedCommands as AnyObj[]) || [];
  for (const cmd of cmds) {
    const app = (cmd.appendContinuationItemsCommand as { continuationItems?: AnyObj[] } | undefined);
    if (app?.continuationItems?.length) {
      const last = app.continuationItems[app.continuationItems.length - 1];
      const tok = ((last?.continuationItemRenderer as AnyObj)?.continuationEndpoint as { continuationCommand?: { token?: string } })?.continuationCommand?.token;
      if (tok) return tok;
    }
  }
  const slr = ((json.contents as AnyObj)?.twoColumnSearchResultsRenderer as AnyObj)?.primaryContents?.sectionListRenderer as AnyObj | undefined;
  const sections = (slr?.contents as AnyObj[]) || [];
  let best: string | null = null;
  for (const sec of sections) {
    const isr = sec.itemSectionRenderer as AnyObj | undefined;
    if (!isr) continue;
    const items = (isr.contents as AnyObj[]) || [];
    const hasVideos = items.some(it => it.videoRenderer);
    const last = items[items.length - 1];
    const tok = ((last?.continuationItemRenderer as AnyObj)?.continuationEndpoint as { continuationCommand?: { token?: string } })?.continuationCommand?.token;
    if (tok && hasVideos) best = tok;
  }
  return best;
}

export async function itSearchRaw(q: string, continuation: string | null | undefined, source = "innertube:search", liveOnly = false): Promise<ItFeedPage> {
  const body: AnyObj = continuation
    ? { context: WEB_CTX, continuation }
    : { context: WEB_CTX, query: q, ...(liveOnly ? { params: "EgJAAQ==" } : {}) };
  const json = await ytPost("search", body);
  const { videos, token } = extractVideosAndToken(json);
  const better = searchContinuationToken(json);
  const estimated = parseInt((json.estimatedResults as string) || "", 10);
  const honest = !isNaN(estimated) && estimated === 0 ? [] : dedupe(videos);
  return { videos: honest, continuation: estimated === 0 ? null : (better || token), source };
}

function parseChannelFromSearch(json: AnyObj): YtChannelResult | null {
  let found: YtChannelResult | null = null;
  const visit = (n: unknown, d: number) => {
    if (found || !n || typeof n !== "object" || d > 14) return;
    if (Array.isArray(n)) { for (const item of n) visit(item, d + 1); return; }
    const obj = n as AnyObj;
    const cr = obj.channelRenderer as AnyObj | undefined;
    if (cr) {
      const id = cr.channelId as string;
      const name = ((cr.title as { simpleText?: string })?.simpleText) || runsText(cr.title) || "";
      if (id && name && /^UC/.test(id)) {
        found = {
          id, name,
          avatar: parseThumb((cr.thumbnail as { thumbnails?: unknown })?.thumbnails),
          subscribers: ((cr.subscriberCountText as { simpleText?: string })?.simpleText || "").replace(/subscribers?/i, "subscribers"),
          description: runsText(cr.descriptionSnippet).slice(0, 160),
          verified: /verified/i.test(JSON.stringify(cr.ownerBadges || "")),
        };
        return;
      }
    }
    for (const k of Object.keys(obj)) visit(obj[k], d + 1);
  };
  visit(json, 0);
  return found;
}

export interface ItSearchPage { videos: YtVideo[]; channel: YtChannelResult | null; continuation: string | null }

export async function itSearch(q: string): Promise<ItSearchPage> {
  const json = await ytPost("search", { context: WEB_CTX, query: q });
  const { videos, token } = extractVideosAndToken(json);
  const results = dedupe(videos);
  let channel = parseChannelFromSearch(json);
  if (!channel) {
    const withCh = results.find(v => v.channel_id && v.channel);
    if (withCh) channel = { id: withCh.channel_id, name: withCh.channel, avatar: "", subscribers: "", description: "", verified: false };
  }
  return { videos: results, channel, continuation: token };
}

export const itSearchFull = itSearch;

function parseNextMetadata(json: AnyObj): Partial<YtVideoFull> & { commentsToken?: string | null; relatedToken?: string | null } {
  const tc = (json.contents as AnyObj | undefined)?.twoColumnWatchNextResults as AnyObj | undefined;
  const results = (tc?.results as { results?: { contents?: unknown[] } } | undefined)?.results?.contents as AnyObj[] | undefined;
  let primary: AnyObj | undefined;
  let secondary: AnyObj | undefined;
  let commentsToken: string | null = null;
  for (const c of results || []) {
    if (c.videoPrimaryInfoRenderer) primary = c.videoPrimaryInfoRenderer as AnyObj;
    if (c.videoSecondaryInfoRenderer) secondary = c.videoSecondaryInfoRenderer as AnyObj;
    if (c.itemSectionRenderer) {
      const isr = c.itemSectionRenderer as AnyObj;
      if ((isr.sectionIdentifier as string) === "comment-item-section" || JSON.stringify(isr).includes("commentCount")) {
        const m = JSON.stringify(isr).match(/"token":"([^"]{20,})"/);
        if (m) commentsToken = m[1];
      }
    }
  }
  const title = runsText(primary?.title) || "";
  const vc = (primary?.viewCount as { videoViewCountRenderer?: { viewCount?: { simpleText?: string }; extraShortViewCount?: { simpleText?: string } } })?.videoViewCountRenderer;
  const viewsText = vc?.extraShortViewCount?.simpleText
    || vc?.viewCount?.simpleText
    || ((primary?.viewCountText as { simpleText?: string })?.simpleText) || runsText(primary?.viewCountText) || "";
  const dateText = ((primary?.dateText as { simpleText?: string })?.simpleText) || "";
  const likeA11y = (primary?.videoActions as unknown) || primary || {};
  let likes = 0;
  const likeMatch = /(\d[\d,.]*)\s+(?:other )?people/i.exec(JSON.stringify(likeA11y));
  if (likeMatch) {
    const num = likeMatch[1].replace(/,/g, "");
    const n = parseFloat(num);
    likes = isNaN(n) ? 0 : (num.endsWith("M") ? Math.round(n * 1e6) : num.endsWith("K") ? Math.round(n * 1e3) : Math.round(n));
  }
  const owner = (secondary?.owner as { videoOwnerRenderer?: AnyObj } | undefined)?.videoOwnerRenderer as AnyObj | undefined;
  const ownerRuns = (owner?.title as { runs?: { text?: string; navigationEndpoint?: { browseEndpoint?: { browseId?: string } } }[] })?.runs;
  const channel = ownerRuns?.[0]?.text || "";
  const channel_id = ownerRuns?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || "";
  const channel_thumb = parseThumb((owner?.thumbnail as { thumbnails?: unknown })?.thumbnails);
  const subs = ((owner?.subscriberCountText as { simpleText?: string })?.simpleText || runsText(owner?.subscriberCountText) || "");
  const description = ((secondary?.attributedDescription as { content?: string })?.content) || "";

  const sec = (tc?.secondaryResults as { secondaryResults?: { results?: unknown[] } } | undefined)?.secondaryResults?.results;
  const { videos: related, token: relatedToken } = extractVideosAndToken({ list: sec });

  const chapters: { title: string; start: number }[] = [];
  const visitChapters = (n: unknown, d: number) => {
    if (!n || typeof n !== "object" || d > 12) return;
    if (Array.isArray(n)) { for (const item of n) visitChapters(item, d + 1); return; }
    const obj = n as AnyObj;
    if (obj.macroMarkersListItemRenderer) {
      const m = obj.macroMarkersListItemRenderer as AnyObj;
      const t = runsText(m.title);
      const timeStr = ((m.timeDescription as { simpleText?: string })?.simpleText) || "";
      const parts = timeStr.split(":").map(Number);
      let start = 0;
      if (parts.length && parts.every(p => !isNaN(p))) {
        start = parts.reduce((acc, p) => acc * 60 + p, 0);
      }
      if (t && timeStr) chapters.push({ title: t, start });
      return;
    }
    for (const k of Object.keys(obj)) visitChapters(obj[k], d + 1);
  };
  visitChapters(json.engagementPanels, 0);

  return {
    title, channel, channel_id, channel_thumb,
    channel_subs: subs.replace(/subscribers?/i, m => (m === "subscriber" ? "subscriber" : "subscribers")),
    views: formatViews(viewsText.replace(/ views|watching/i, "")),
    likes, published: dateText, description,
    related: related.slice(0, 24),
    relatedToken: relatedToken || undefined,
    commentsToken,
  } as Partial<YtVideoFull> & { commentsToken?: string | null };
}

function parsePlayerStreams(json: AnyObj): {
  ok: boolean; playability: string; reason?: string;
  formats: YtVideoFull["formats"]; hls: string | null; captions: YtCaption[];
  duration: number; views: number; title: string;
} {
  const ps = (json.playabilityStatus as { status?: string; reason?: string }) || {};
  const sd = (json.streamingData as { formats?: unknown[]; adaptiveFormats?: unknown[]; hlsManifestUrl?: string }) || {};
  const vd = (json.videoDetails as { lengthSeconds?: string; viewCount?: string; title?: string; isLiveContent?: boolean }) || {};
  const formats: YtVideoFull["formats"] = [];

  const AUDIO_CODEC = /mp4a|opus|ac-3|ec-3|vorbis|flac/i;
  const VIDEO_CODEC = /avc1|avc3|vp9|vp09|vp8|av01|hev1|hvc1|mp4v|theora/i;
  const toFmt = (f: AnyObj) => {
    const mime = (f.mimeType as string) || "";
    const itag = (f.itag as number) || 0;
    const url = (f.url as string) || "";
    if (!url) return;
    const codecs = /codecs="?([^"]+)"?/.exec(mime)?.[1] || "";
    formats.push({
      itag, mime, codecs,
      quality_label: (f.qualityLabel as string) || "",
      height: (f.height as number) || 0, width: (f.width as number) || 0,
      fps: (f.fps as number) || 0, bitrate: (f.bitrate as number) || 0,
      has_video: VIDEO_CODEC.test(codecs) || /video/.test(mime),
      has_audio: AUDIO_CODEC.test(codecs) || /audio/.test(mime),
      url,
    });
  };
  (sd.formats as AnyObj[] || []).forEach(toFmt);
  (sd.adaptiveFormats as AnyObj[] || []).forEach(toFmt);
  const captions: YtCaption[] = [];
  const tracks = ((json.captions as { playerCaptionsTracklistRenderer?: { captionTracks?: AnyObj[] } })?.playerCaptionsTracklistRenderer?.captionTracks) || [];
  for (const t of tracks) {
    const url = (t.baseUrl as string) || "";
    if (url) captions.push({
      lang: (t.languageCode as string) || "",
      name: ((t.name as { simpleText?: string })?.simpleText) || runsText(t.name) || (t.languageCode as string) || "",
      url: url.startsWith("http") ? url : `${IT_HOST}${url}`,
    });
  }
  return {
    ok: ps.status === "OK" && (!!sd.hlsManifestUrl || formats.length > 0),
    playability: ps.status || "UNKNOWN",
    reason: ps.reason,
    formats, hls: sd.hlsManifestUrl || null, captions,
    duration: parseInt(vd.lengthSeconds || "0", 10) || 0,
    views: parseInt(vd.viewCount || "0", 10) || 0,
    title: vd.title || "",
  };
}

export interface ItVideoResult extends YtVideoFull {
  playability_reason?: string | null;
  embed_blocked?: boolean;
  unavailable?: boolean;
  relatedToken?: string | null;
  commentsToken?: string | null;
}

export async function itVideo(id: string): Promise<ItVideoResult> {
  const base: ItVideoResult = {
    id, ok: true, embed_fallback: true,
    title: "", channel: "", channel_id: "", channel_thumb: "",
    views: 0, likes: 0, duration: 0, published: "", description: "",
    formats: [], hls: null, captions: [], storyboard: null, related: [], chapters: [],
  };

  let nextMeta: ReturnType<typeof parseNextMetadata> = {};
  let visitorData: string | undefined;
  try {
    const nextJson = await ytPost("next", { context: WEB_CTX, videoId: id });
    nextMeta = parseNextMetadata(nextJson);
    visitorData = (nextJson.responseContext as { visitorData?: string } | undefined)?.visitorData || undefined;
  } catch {}

  if (nextMeta.channel_id && nextMeta.channel_thumb) {
    rememberAvatar(nextMeta.channel_id as string, nextMeta.channel_thumb as string);
  }

  let streams: ReturnType<typeof parsePlayerStreams> | null = null;
  let playability_reason: string | null = null;
  let embed_blocked = false;
  let unavailable = false;
  try {
    const playerJson = await ytPost("player", { context: VR_CTX, videoId: id, contentCheckOk: true, racyCheckOk: true }, ANDROID_KEY);
    streams = parsePlayerStreams(playerJson);
    playability_reason = streams.reason || null;
    if (streams.playability === "ERROR" && /blocked it from display on this website|embed/i.test(streams.reason || "")) embed_blocked = true;
    if (streams.playability === "ERROR" || streams.playability === "UNPLAYABLE") unavailable = true;
    if (streams.playability === "LIVE_STREAM_OFFLINE") unavailable = true;
  } catch {}

  if (!streams?.ok) {
    try {
      const tvJson = await ytPost("player", { context: tvCtx(visitorData), videoId: id, contentCheckOk: true, racyCheckOk: true }, WEB_KEY);
      const tvStreams = parsePlayerStreams(tvJson);
      if (tvStreams.ok && (tvStreams.hls || tvStreams.formats.length > 0)) {
        streams = {
          ...tvStreams,
          captions: tvStreams.captions.length ? tvStreams.captions : (streams?.captions || []),
          duration: tvStreams.duration || streams?.duration || 0,
          views: tvStreams.views || streams?.views || 0,
        };
        playability_reason = null;
        unavailable = false;
      }
    } catch {}
  }

  const title = nextMeta.title || streams?.title || "";
  const views = nextMeta.views || (streams && streams.views ? formatViews(streams.views) : 0);
  const directPlayable = !!streams?.ok && (!!streams.hls || streams.formats.some(f => f.has_video && f.has_audio));

  const result: ItVideoResult = {
    ...base,
    ...nextMeta,
    thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    thumb_lg: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    title,
    channel: nextMeta.channel || "",
    channel_id: nextMeta.channel_id || "",
    channel_thumb: nextMeta.channel_thumb || "",
    channel_subs: nextMeta.channel_subs || "",
    views,
    likes: nextMeta.likes || 0,
    duration: streams?.duration || 0,
    published: nextMeta.published || "",
    description: nextMeta.description || "",
    formats: streams?.formats || [],
    hls: streams?.hls || null,
    captions: streams?.captions || [],
    related: nextMeta.related || [],
    chapters: (nextMeta.chapters as never[]) || [],
    relatedToken: nextMeta.relatedToken ?? null,
    commentsToken: nextMeta.commentsToken ?? null,
    embed_fallback: !directPlayable,
    playability_reason,
    embed_blocked,
    unavailable: unavailable && !title,
    is_live: streams?.formats.some(f => /live/i.test(f.quality_label)) || undefined,
  };

  if (unavailable && !title && !streams?.title) {
    return { ...result, ok: false, playability_reason: playability_reason || "This video is unavailable" };
  }
  return result;
}

export async function itComments(id: string, sort: "top" | "new" = "top"): Promise<{ comments: YtComment[]; count: number | null; token: string | null }> {
  const nextJson = await ytPost("next", { context: WEB_CTX, videoId: id });
  let token: string | null = null;
  let count: number | null = null;
  const visit = (n: unknown, d: number) => {
    if (!n || typeof n !== "object" || d > 14) return;
    if (Array.isArray(n)) { for (const item of n) visit(item, d + 1); return; }
    const obj = n as AnyObj;
    if (obj.commentCount && !count) count = parseCountLike(obj.commentCount);
    const isr = obj.itemSectionRenderer as AnyObj | undefined;
    if (isr && isr.sectionIdentifier === "comment-item-section") {
      const m = JSON.stringify(isr).match(/"token":"([^"]{20,})"/);
      if (m) token = m[1];
    }
    for (const k of Object.keys(obj)) visit(obj[k], d + 1);
  };
  visit(nextJson, 0);
  if (!token) return { comments: [], count, token: null };
  return itCommentsContinue(token, sort);
}

export const itCommentsFirst = itComments;

function parseCountLike(x: unknown): number | null {
  const s = typeof x === "string" ? x : ((x as { text?: string })?.text) || "";
  const m = /([\d,.]+)\s*(K|M|B|million|billion|thousand)?/i.exec(s.replace(/,/g, ","));
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  if (isNaN(n)) return null;
  const suffix = (m[2] || "").toLowerCase();
  if (/k|thousand/.test(suffix)) return Math.round(n * 1e3);
  if (/m|million/.test(suffix)) return Math.round(n * 1e6);
  if (/b|billion/.test(suffix)) return Math.round(n * 1e9);
  return Math.round(n);
}

export async function itCommentsContinue(token: string, _sort: "top" | "new" = "top"): Promise<{ comments: YtComment[]; count: number | null; token: string | null }> {
  const json = await ytPost("next", { context: WEB_CTX, continuation: token });
  const s = JSON.stringify(json);
  const comments: YtComment[] = [];

  const fu = (json.frameworkUpdates as { entityBatchUpdate?: { mutations?: { payload?: { commentEntityPayload?: AnyObj } }[] } } | undefined);
  const mutations = fu?.entityBatchUpdate?.mutations || [];
  const payloads = mutations.map(m => (m.payload as { commentEntityPayload?: AnyObj } | undefined)?.commentEntityPayload).filter(Boolean) as AnyObj[];

  const legacyComments: YtComment[] = [];
  const visitLegacy = (n: unknown, d: number) => {
    if (!n || typeof n !== "object" || d > 14) return;
    if (Array.isArray(n)) { for (const item of n) visitLegacy(item, d + 1); return; }
    const obj = n as AnyObj;
    if (obj.commentRenderer) {
      const cr = obj.commentRenderer as AnyObj;
      legacyComments.push({
        author: runsText(cr.authorText) || ((cr.authorText as { simpleText?: string })?.simpleText) || "",
        author_id: "",
        author_thumb: parseThumb((cr.authorThumbnail as { thumbnails?: unknown })?.thumbnails),
        text: ((cr.contentText as unknown) && runsText(cr.contentText)) || "",
        likes: parseInt(((cr.voteCount as { simpleText?: string })?.simpleText || "0").replace(/[,.]/g, ""), 10) || parseCountLike(cr.voteCount) || 0,
        time: ((cr.publishedTimeText as { simpleText?: string })?.simpleText) || runsText(cr.publishedTimeText) || "",
        replies: parseInt(((cr.replyCount as number) || 0).toString(), 10) || 0,
        creator_heart: !!cr.creatorHeart,
      });
      return;
    }
    for (const k of Object.keys(obj)) visitLegacy(obj[k], d + 1);
  };
  visitLegacy(json, 0);

  if (payloads.length > 0) {
    for (const p of payloads) {
      const author = (p.author as { displayName?: string } | undefined)?.displayName || "";
      const avatar = (p.author as AnyObj | undefined)?.avatarImageUrl as string | undefined;
      const text = ((p.properties as { content?: { content?: string } })?.content?.content) || "";
      const time = ((p.properties as { publishedTime?: string })?.publishedTime) || "";
      const toolbar = JSON.stringify(p.toolbar || {});
      const likes = parseCountLike((JSON.parse(toolbar) as { likeCountNotliked?: string })?.likeCountNotliked) || 0;
      const replies = parseCountLike((JSON.parse(toolbar) as { replyCount?: string })?.replyCount) || 0;
      comments.push({
        author, author_id: "", author_thumb: avatar || "",
        text, likes, time, replies,
        creator_heart: false,
      });
    }
  }
  const final = comments.length ? comments : legacyComments;

  let nextToken: string | null = null;
  const m = s.match(/"continuationCommand":\{"token":"([^"]{20,})"[^}]*\}/g);
  const lastCont = m && m.length ? m[m.length - 1] : null;
  if (lastCont) {
    const tok = /"token":"([^"]{20,})"/.exec(lastCont)?.[1];
    if (tok) nextToken = tok;
  }
  return { comments: final, count: null, token: nextToken };
}

export async function itChannel(id: string): Promise<YtChannel & { continuation: string | null }> {
  const json = await ytPost("browse", { context: WEB_CTX, browseId: id, params: "EgZ2aWRlb3nyBgQKAjoA" });
  const metadata = ((json.metadata as { channelMetadataRenderer?: AnyObj })?.channelMetadataRenderer) || {};
  const headerJson = JSON.stringify(json.header || {});
  const fullJson = JSON.stringify(json);
  const amp = String.fromCharCode(38);
  const avatarUrl = (() => {
    const t = parseThumb((metadata.avatar as { thumbnails?: unknown })?.thumbnails);
    if (t) return t;
    const m = /https:\/\/yt3\.ggpht\.com\/[^"\s]+/.exec(headerJson);
    return m ? m[0].split(String.fromCharCode(92) + "u0026").join(amp) : "";
  })();
  const name = (metadata.title as string) || (() => {
    const m = /"title":\{"content":"([^"]+)"\}/.exec(headerJson) || /"pageTitle":"([^"]+)"/.exec(headerJson);
    return m ? m[1] : "";
  })();
  const description = (metadata.description as string) || "";
  const bannerUrl = (() => {
    const og = (metadata.ogImage as string) || "";
    if (/yt3\.(?:ggpht|googleusercontent)\.com/.test(og)) return og;
    const m = /https:\/\/yt3\.(?:ggpht|googleusercontent)\.com\/[^"\s]*(?:banner|fxj|fJ|w1067|w1707|fcrop)[^"\s]*/.exec(fullJson);
    return m ? m[0].split(String.fromCharCode(92) + "u0026").join(amp) : "";
  })();
  const subs = (() => {
    const m = /"content":"([\d.,]+[KM]?) subscribers"/.exec(headerJson) ||
      /"subscriberCountText":\{[^}]*"simpleText":"([^"]+)"/.exec(fullJson);
    return m ? `${m[1]} subscribers` : "";
  })();
  const { videos, token } = extractVideosAndToken(json);
  if (id && avatarUrl) rememberAvatar(id, avatarUrl);
  return {
    id, name, description, avatar: avatarUrl, banner: bannerUrl, subscribers: subs,
    videos: dedupe(videos).slice(0, 60),
    continuation: token,
  };
}

export async function itChannelContinue(token: string): Promise<ItFeedPage> {
  const json = await ytPost("browse", { context: WEB_CTX, continuation: token });
  const { videos, token: nextToken } = extractVideosAndToken(json);
  return { videos: dedupe(videos), continuation: nextToken, source: "innertube:channel" };
}

export interface YtShort {
  id: string;
  title: string;
  views: string;
}

function parseShortsLockup(sl: AnyObj): YtShort | null {
  const reel = (sl.onTap as { innertubeCommand?: { reelWatchEndpoint?: { videoId?: string } } })?.innertubeCommand?.reelWatchEndpoint;
  const id = (reel?.videoId as string) || (sl.contentId as string) || "";
  if (!id) return null;
  const a11y = (sl.accessibilityText as string) || "";
  let title = a11y;
  let views = "";
  const m = /^(.*),\s*([\d.,]+\s*(?:million|billion|thousand|[KM])?\s*views?)\s*-\s*play Short$/i.exec(a11y);
  if (m) {
    title = m[1].trim();
    views = formatViews(m[2].replace(/views?/i, "").replace(/\s+/g, "").replace(/million/i, "M").replace(/billion/i, "B").replace(/thousand/i, "K"));
  }
  return { id, title, views };
}

const SHORTS_SEEDS = ["funny shorts", "shorts", "viral shorts", "amazing shorts", "comedy shorts"];

function extractShorts(node: unknown): { shorts: YtShort[]; token: string | null } {
  const shorts: YtShort[] = [];
  let token: string | null = null;
  const visit = (n: unknown, d: number) => {
    if (!n || typeof n !== "object" || d > 14) return;
    if (Array.isArray(n)) { for (const item of n) visit(item, d + 1); return; }
    const obj = n as AnyObj;
    if (obj.shortsLockupViewModel) {
      const s = parseShortsLockup(obj.shortsLockupViewModel as AnyObj);
      if (s) shorts.push(s);
      return;
    } else if (obj.continuationItemRenderer) {
      const tok = ((obj.continuationItemRenderer as AnyObj).continuationEndpoint as { continuationCommand?: { token?: string } })?.continuationCommand?.token;
      if (tok) token = tok;
    } else if (obj.sectionListRenderer) {
      const conts = (obj.sectionListRenderer as AnyObj).continuations as { nextContinuationData?: { continuation?: string } }[] | undefined;
      const tok = conts?.[0]?.nextContinuationData?.continuation;
      if (tok) token = tok;
    }
    for (const k of Object.keys(obj)) visit(obj[k], d + 1);
  };
  visit(node, 0);
  return { shorts, token };
}

export async function itShortsFeed(continuation?: string): Promise<{ shorts: YtShort[]; continuation: string | null }> {
  if (continuation) {
    const json = await ytPost("search", { context: WEB_CTX, continuation });
    const { shorts, token } = extractShorts(json);
    const better = searchContinuationToken(json);
    return { shorts, continuation: better || token };
  }
  const pages = await Promise.all(
    SHORTS_SEEDS.slice(0, 3).map(q => ytPost("search", { context: WEB_CTX, query: q }))
  );
  const merged: YtShort[] = [];
  const seen = new Set<string>();
  let token: string | null = null;
  for (const json of pages) {
    const { shorts, token: t } = extractShorts(json);
    const better = searchContinuationToken(json);
    if (!token && (better || t)) token = better || t;
    for (const s of shorts) {
      if (!seen.has(s.id) && s.title) { seen.add(s.id); merged.push(s); }
    }
  }
  return { shorts: merged, continuation: token };
}

export async function itValidateShorts(ids: string[]): Promise<Set<string>> {
  const valid = new Set(ids);
  await Promise.all(ids.map(async id => {
    try {
      if (isNativeApp()) {
        const { CapacitorHttp } = await import("@capacitor/core");
        const res = await CapacitorHttp.get({
          url: `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
          connectTimeout: 6000,
          readTimeout: 8000,
        });
        if (res.status < 200 || res.status >= 300) valid.delete(id);
      } else {
        if (!(await probeRelay())) return;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        try {
          const res = await fetch(`/api/ytb-oembed?XTransformPort=3001&id=${encodeURIComponent(id)}`, { signal: ctrl.signal });
          const json = await res.json().catch(() => null) as { ok?: boolean } | null;
          if (json && json.ok === false) valid.delete(id);
        } finally { clearTimeout(timer); }
      }
    } catch {}
  }));
  return valid;
}

// ============================================================================
// SECTION: yt-api.ts — Master Data Source & Fetcher Layer
// ============================================================================

let runtimeApiBase: string | null = null;

export function getApiBase(): string {
  if (runtimeApiBase !== null) return runtimeApiBase;
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("yt_api_base");
    if (stored !== null) {
      runtimeApiBase = stored;
      return stored;
    }
  }
  runtimeApiBase = process.env.NEXT_PUBLIC_API_BASE || "";
  return runtimeApiBase;
}

export function setApiBase(base: string) {
  const clean = base.trim().replace(/\/+$/, "");
  runtimeApiBase = clean;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("yt_api_base", clean);
  }
  invalidateDataSource();
}

export function apiHref(path: string): string {
  const base = getApiBase();
  if (!base && path.startsWith("/api/")) {
    const sep = path.includes("?") ? "&" : "?";
    return `${path}${sep}XTransformPort=3001`;
  }
  return `${base}${path}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, opts: { timeoutMs?: number } = {}): Promise<T> {
  const url = apiHref(path);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20000);
  let status = 0;
  let text = "";
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    status = res.status;
    text = await res.text();
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "AbortError";
    throw new ApiError(timedOut ? "The request timed out" : "Could not reach the server");
  } finally {
    clearTimeout(timer);
  }
  const t = text.trimStart();
  if (!t.startsWith("{") && !t.startsWith("[")) {
    throw new ApiError(status === 404 ? "No API server at this address" : "The server returned an invalid response", status);
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError("The server returned an invalid response", status);
  }
  if (status < 200 || status >= 300) {
    const msg = (data as { error?: string })?.error || `HTTP ${status}`;
    throw new ApiError(msg, status);
  }
  return data as T;
}

export type DataSource = "server" | "standalone" | "community";
let activeSource: DataSource | null = null;
let sourceProbe: Promise<DataSource> | null = null;

export function getActiveSource(): DataSource | null {
  return activeSource;
}

export function getActiveSourceLabel(): string {
  if (activeSource === "server") {
    const b = getApiBase();
    return b ? `server · ${b}` : "server · same-origin";
  }
  if (activeSource === "standalone") return "on-device · YouTube direct";
  if (activeSource === "community") return activeCommunityInstance ? `community · ${activeCommunityInstance.replace(/^https?:\/\//, "")}` : "community";
  return "not connected";
}

export function invalidateDataSource() {
  activeSource = null;
  sourceProbe = null;
  resetTransportCache();
}

let forcedSource: DataSource | null = null;
if (typeof window !== "undefined") {
  const p = new URLSearchParams(window.location.search);
  const v = p.get("src");
  if (v === "standalone" || v === "server" || v === "community") forcedSource = v;
}

export async function resolveDataSource(): Promise<DataSource> {
  if (activeSource) return activeSource;
  if (forcedSource) { activeSource = forcedSource; return forcedSource; }
  if (!sourceProbe) {
    sourceProbe = (async () => {
      const base = getApiBase();
      const canBeServer = !!base || !isNativeApp();
      if (canBeServer) {
        try {
          await api<{ ok: boolean }>("/api/health", { timeoutMs: base ? 5000 : 3500 });
          activeSource = "server";
          return "server" as const;
        } catch {}
      }
      if (isNativeApp()) {
        activeSource = "standalone";
        return "standalone" as const;
      }
      try {
        const sugg = await itSuggest("a");
        if (sugg.length > 0 || isNativeApp()) {
          activeSource = "standalone";
          return "standalone" as const;
        }
      } catch {}
      const ok = await probeCommunity();
      if (ok) {
        activeSource = "community";
        return "community" as const;
      }
      throw new ApiError("No data source reachable");
    })();
    sourceProbe.catch(() => { sourceProbe = null; });
  }
  return sourceProbe;
}

export async function fetchHome(category: string): Promise<{ category: string; source: string; results: YtVideo[]; continuation: string | null }> {
  const mode = await resolveDataSource();
  if (mode === "standalone") {
    const page = await itHome(category);
    return { category, source: page.source, results: page.videos, continuation: page.continuation };
  }
  if (mode === "community") {
    const r = await communityHome(category);
    return { ...r, continuation: null };
  }
  return api<{ category: string; source: string; results: YtVideo[] }>(`/api/home?category=${encodeURIComponent(category)}`, { timeoutMs: 60000 }).then(r => ({ ...r, continuation: null }));
}

export async function fetchHomeMore(category: string, token: string): Promise<YtFeedPage> {
  const mode = await resolveDataSource();
  if (mode === "standalone") {
    const page = await itHome(category, token);
    return { results: page.videos, continuation: page.continuation };
  }
  return { results: [], continuation: null };
}

export async function fetchSearch(q: string): Promise<{ query: string; channel?: YtChannelResult | null; results: YtVideo[]; continuation: string | null }> {
  const mode = await resolveDataSource();
  if (mode === "standalone") {
    const r = await itSearchFull(q);
    return { query: q, channel: r.channel, results: r.videos, continuation: r.continuation };
  }
  if (mode === "community") {
    const r = await communitySearch(q);
    return { ...r, continuation: null };
  }
  return api<{ query: string; channel?: YtChannelResult | null; results: YtVideo[] }>(`/api/search?q=${encodeURIComponent(q)}&type=video`, { timeoutMs: 60000 }).then(r => ({ ...r, continuation: null }));
}

export async function fetchSearchMore(token: string): Promise<YtFeedPage> {
  const mode = await resolveDataSource();
  if (mode === "standalone") {
    const page = await itSearchRaw("", token, "innertube:search");
    return { results: page.videos, continuation: page.continuation };
  }
  return { results: [], continuation: null };
}

export async function fetchSuggestions(q: string): Promise<string[]> {
  try {
    return await itSuggest(q);
  } catch {
    return [];
  }
}

export async function fetchVideo(id: string): Promise<YtVideoFull> {
  const mode = await resolveDataSource();
  if (mode === "standalone") return itVideo(id);
  if (mode === "community") return communityVideo(id);
  return api<YtVideoFull>(`/api/video/${id}`, { timeoutMs: 60000 });
}

export async function fetchComments(id: string, sort: "top" | "new" = "top"): Promise<{ comments: YtComment[]; count: number | null; error?: string; continuation?: string | null }> {
  const mode = await resolveDataSource();
  if (mode === "standalone") {
    try {
      const r = await itCommentsFirst(id, sort);
      return { comments: r.comments, count: r.count, continuation: r.token };
    } catch {
      return { comments: [], count: null, error: "Comments unavailable" };
    }
  }
  if (mode === "community") return communityComments(id);
  return api<{ comments: YtComment[]; count: number | null; error?: string }>(`/api/video/${id}/comments?sort=${sort}`, { timeoutMs: 60000 });
}

export async function fetchCommentsMore(token: string): Promise<{ comments: YtComment[]; continuation: string | null }> {
  const mode = await resolveDataSource();
  if (mode === "standalone") {
    const r = await itCommentsContinue(token);
    return { comments: r.comments, continuation: r.token };
  }
  throw new ApiError("No more comments in this mode");
}

export async function fetchChannel(id: string): Promise<YtChannel> {
  const mode = await resolveDataSource();
  if (mode === "standalone") return itChannel(id);
  if (mode === "community") return communityChannel(id);
  return api<YtChannel>(`/api/channel/${id}`, { timeoutMs: 60000 });
}

export async function fetchChannelMore(token: string): Promise<YtFeedPage> {
  const mode = await resolveDataSource();
  if (mode === "standalone") {
    const page = await itChannelContinue(token);
    return { results: page.videos, continuation: page.continuation };
  }
  throw new ApiError("No more pages in this mode");
}

export async function fetchSponsorBlock(id: string): Promise<{ segments: SbSegment[]; source: string | null; unreachable?: boolean }> {
  const mode = await resolveDataSource();
  if (mode === "server") {
    return api<{ segments: SbSegment[]; source: string | null; unreachable?: boolean }>(`/api/sponsorblock/${id}`, { timeoutMs: 12000 });
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${encodeURIComponent(id)}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return { segments: [], source: null, unreachable: true };
    const data = await res.json() as { category?: string; actionType?: string; segment?: number[] }[];
    const segments = (Array.isArray(data) ? data : []).map(s => ({
      category: s.category || "sponsor",
      action: s.actionType === "skip" ? "skip" : s.actionType || "skip",
      start: (s.segment && s.segment[0]) || 0,
      end: (s.segment && s.segment[1]) || 0,
    })).filter(s => s.end > s.start);
    return { segments, source: "sponsor.ajay.app" };
  } catch {
    return { segments: [], source: null, unreachable: true };
  }
}

export async function fetchHealth(): Promise<{ ok: boolean; po_token: boolean; uptime: number }> {
  return api<{ ok: boolean; po_token: boolean; uptime: number }>(`/api/health`, { timeoutMs: 8000 });
}

export function absStream(url: string | null | undefined): string {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  const base = getApiBase();
  if (base) return `${base}${url}`;
  if (url.includes("XTransformPort=")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}XTransformPort=3001`;
}

// ============================================================================
// SECTION: yt-router.ts — Router & Route Store
// ============================================================================

export type Route =
  | { name: "home"; category?: string }
  | { name: "search"; q: string }
  | { name: "watch"; v: string; t?: number }
  | { name: "channel"; id: string }
  | { name: "subscriptions" }
  | { name: "shorts" }
  | { name: "history" }
  | { name: "liked" }
  | { name: "later" }
  | { name: "playlists" }
  | { name: "settings" };

export function parseRoute(): Route {
  if (typeof window === "undefined") return { name: "home" };
  const p = new URLSearchParams(window.location.search);
  if (p.has("v")) return { name: "watch", v: p.get("v") || "", t: p.has("t") ? Number(p.get("t")) || 0 : 0 };
  if (p.has("q")) return { name: "search", q: p.get("q") || "" };
  if (p.has("channel")) return { name: "channel", id: p.get("channel") || "" };
  if (p.has("cat")) return { name: "home", category: p.get("cat") || "all" };
  const page = p.get("page");
  switch (page) {
    case "subscriptions": return { name: "subscriptions" };
    case "shorts": return { name: "shorts" };
    case "history": return { name: "history" };
    case "liked": return { name: "liked" };
    case "later": return { name: "later" };
    case "playlists": return { name: "playlists" };
    case "settings": return { name: "settings" };
    default: return { name: "home" };
  }
}

export function href(route: Route): string {
  switch (route.name) {
    case "home": return route.category && route.category !== "all" ? `/?cat=${encodeURIComponent(route.category)}` : "/";
    case "search": return `/?q=${encodeURIComponent(route.q)}`;
    case "watch": return `/?v=${encodeURIComponent(route.v)}${route.t ? `&t=${route.t}` : ""}`;
    case "channel": return `/?channel=${encodeURIComponent(route.id)}`;
    default: return `/?page=${route.name}`;
  }
}

interface RouterStore {
  route: Route;
  setRoute: (r: Route) => void;
}

export const useRouterStore = create<RouterStore>(set => ({
  route: { name: "home" },
  setRoute: r => set({ route: r }),
}));

if (typeof window !== "undefined") {
  useRouterStore.getState().setRoute(parseRoute());
  window.addEventListener("popstate", () => {
    useRouterStore.getState().setRoute(parseRoute());
  });
}

export function useRouter() {
  const route = useRouterStore(s => s.route);
  const setRoute = useRouterStore(s => s.setRoute);

  useEffect(() => {
    const current = parseRoute();
    const stored = useRouterStore.getState().route;
    if (JSON.stringify(current) !== JSON.stringify(stored)) setRoute(current);
  }, [setRoute]);

  const navigate = (r: Route, replace = false) => {
    const url = href(r);
    if (replace) window.history.replaceState({}, "", url);
    else window.history.pushState({}, "", url);
    setRoute(r);
    if (!replace) window.scrollTo({ top: 0 });
  };

  return { route, navigate };
}

// ============================================================================
// SECTION: yt-store.ts — Persistent App Store
// ============================================================================

export interface HistoryEntry {
  id: string;
  title: string;
  channel: string;
  channel_id: string;
  thumb: string;
  views: string;
  duration: string;
  published: string;
  progress?: number;
  length?: number;
  watchedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  videoIds: string[];
  createdAt: number;
}

interface YtStore {
  subs: { id: string; name: string; avatar: string; subscribers: string }[];
  toggleSub: (ch: { id: string; name: string; avatar: string; subscribers: string }) => void;
  isSubbed: (id: string) => boolean;

  history: HistoryEntry[];
  addHistory: (e: Omit<HistoryEntry, "watchedAt">) => void;
  setProgress: (id: string, progress: number, length: number) => void;
  clearHistory: () => void;
  removeHistory: (id: string) => void;

  liked: HistoryEntry[];
  toggleLike: (e: Omit<HistoryEntry, "watchedAt">) => void;
  isLiked: (id: string) => boolean;

  later: HistoryEntry[];
  toggleLater: (e: Omit<HistoryEntry, "watchedAt">) => void;
  isLater: (id: string) => boolean;

  playlists: Playlist[];
  createPlaylist: (name: string) => string;
  addToPlaylist: (playlistId: string, videoId: string) => void;
  removeFromPlaylist: (playlistId: string, videoId: string) => void;
  deletePlaylist: (playlistId: string) => void;

  disliked: string[];
  toggleDislike: (id: string) => void;
  isDisliked: (id: string) => boolean;

  commentVotes: Record<string, 1 | -1>;
  voteComment: (commentId: string, vote: 1 | -1) => void;

  hiddenVideos: string[];
  hiddenChannels: string[];
  hideVideo: (id: string) => void;
  hideChannel: (id: string) => void;

  prefs: {
    sponsorblock: boolean;
    autoplay: boolean;
    defaultQuality: "auto" | number;
    theme: "dark" | "light" | "system";
    backgroundPlay: boolean;
    audioOnly: boolean;
    dataSaver: boolean;
    pipOnHome: boolean;
  };
  setPrefs: (p: Partial<YtStore["prefs"]>) => void;
}

const entry = (e: Omit<HistoryEntry, "watchedAt">): HistoryEntry => ({ ...e, watchedAt: Date.now() });

export const useYt = create<YtStore>()(
  persist(
    (set, get) => ({
      subs: [],
      toggleSub: (ch) => {
        const { subs } = get();
        if (subs.some(s => s.id === ch.id)) set({ subs: subs.filter(s => s.id !== ch.id) });
        else set({ subs: [ch, ...subs] });
      },
      isSubbed: (id) => get().subs.some(s => s.id === id),

      history: [],
      addHistory: (e) => {
        const { history } = get();
        const he = entry(e);
        set({ history: [he, ...history.filter(h => h.id !== e.id)].slice(0, 500) });
      },
      setProgress: (id, progress, length) => {
        const { history } = get();
        set({ history: history.map(h => (h.id === id ? { ...h, progress, length } : h)) });
      },
      clearHistory: () => set({ history: [] }),
      removeHistory: (id) => set({ history: get().history.filter(h => h.id !== id) }),

      liked: [],
      toggleLike: (e) => {
        const { liked } = get();
        if (liked.some(l => l.id === e.id)) set({ liked: liked.filter(l => l.id !== e.id), disliked: get().disliked.filter(d => d !== e.id) });
        else set({ liked: [entry(e), ...liked], disliked: get().disliked.filter(d => d !== e.id) });
      },
      isLiked: (id) => get().liked.some(l => l.id === id),

      later: [],
      toggleLater: (e) => {
        const { later } = get();
        if (later.some(l => l.id === e.id)) set({ later: later.filter(l => l.id !== e.id) });
        else set({ later: [entry(e), ...later] });
      },
      isLater: (id) => get().later.some(l => l.id === id),

      playlists: [],
      createPlaylist: (name) => {
        const id = `pl_${Date.now()}`;
        set({ playlists: [{ id, name, videoIds: [], createdAt: Date.now() }, ...get().playlists] });
        return id;
      },
      addToPlaylist: (playlistId, videoId) => {
        set({
          playlists: get().playlists.map(p =>
            p.id === playlistId && !p.videoIds.includes(videoId) ? { ...p, videoIds: [videoId, ...p.videoIds] } : p
          ),
        });
      },
      removeFromPlaylist: (playlistId, videoId) => {
        set({ playlists: get().playlists.map(p => (p.id === playlistId ? { ...p, videoIds: p.videoIds.filter(v => v !== videoId) } : p)) });
      },
      deletePlaylist: (playlistId) => set({ playlists: get().playlists.filter(p => p.id !== playlistId) }),

      disliked: [],
      toggleDislike: (id) => {
        const { disliked, liked } = get();
        if (disliked.includes(id)) set({ disliked: disliked.filter(d => d !== id) });
        else set({ disliked: [id, ...disliked], liked: liked.filter(l => l.id !== id) });
      },

      commentVotes: {},
      voteComment: (commentId, vote) => {
        const cur = get().commentVotes[commentId];
        set(s => {
          const next = { ...s.commentVotes };
          if (cur === vote) delete next[commentId];
          else next[commentId] = vote;
          return { commentVotes: next };
        });
      },

      hiddenVideos: [],
      hiddenChannels: [],
      hideVideo: (id) => set(s => ({ hiddenVideos: [...s.hiddenVideos, id] })),
      hideChannel: (id) => set(s => ({ hiddenChannels: [...s.hiddenChannels, id] })),
      isDisliked: (id) => get().disliked.includes(id),

      prefs: {
        sponsorblock: true,
        autoplay: true,
        defaultQuality: "auto",
        theme: "dark",
        backgroundPlay: true,
        audioOnly: false,
        dataSaver: false,
        pipOnHome: true,
      },
      setPrefs: (p) => set({ prefs: { ...get().prefs, ...p } }),
    }),
    {
      name: "yt-app-store",
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<YtStore>;
        return {
          ...current,
          ...p,
          prefs: { ...current.prefs, ...(p.prefs || {}) },
        };
      },
    }
  )
);

// ============================================================================
// SECTION: yt-playback.ts — Persistent Playback State & Audio Engine
// ============================================================================

export type SurfaceMode = "direct" | "embed" | "none";
export type DockTarget = "watch" | "mini" | "parked";

export interface PlaybackEngine {
  togglePlay(): void;
  pause(): void;
  seekTo(seconds: number): void;
  seekBy(delta: number): void;
  restart(): void;
  toggleMute(): void;
  stop(): void;
}

export interface Countdown {
  nextId: string;
  nextTitle: string;
  nextThumb: string;
  nextChannel: string;
  until: number;
}

const COUNTDOWN_MS = 5000;
const FORCE_EMBED_TTL = 15 * 60 * 1000;

interface PlaybackState {
  video: YtVideoFull | null;
  videoId: string;
  startAt: number;
  mode: SurfaceMode;
  docked: DockTarget;
  miniOpen: boolean;
  wasMini: boolean;

  playing: boolean;
  current: number;
  duration: number;
  buffered: number;
  waiting: boolean;
  error: string | null;

  queue: YtVideo[];
  playedIds: string[];
  countdown: Countdown | null;
  forceEmbedIds: Record<string, number>;

  watchSlot: HTMLElement | null;
  miniFrame: HTMLElement | null;
  engine: PlaybackEngine | null;

  load: (video: YtVideoFull, opts?: { startAt?: number; mode?: SurfaceMode }) => void;
  setEmbed: (id: string) => void;
  isForcedEmbed: (id: string) => boolean;
  setQueue: (related: YtVideo[]) => void;
  setEngineMirror: (m: Partial<Pick<PlaybackState, "playing" | "current" | "duration" | "buffered" | "waiting" | "error">>) => void;
  setDocked: (d: DockTarget) => void;
  registerEngine: (e: PlaybackEngine | null) => void;
  registerWatchSlot: (el: HTMLElement | null) => void;
  registerMiniFrame: (el: HTMLElement | null) => void;
  dockMini: () => void;
  undockMini: () => void;
  closeMini: () => void;
  expandMini: () => void;
  pauseAndDock: () => void;
  reopenIfWasMini: () => void;
  advance: () => void;
  cancelCountdown: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  navigateWatch: (id: string) => void;
  seekTo: (seconds: number) => void;
}

export const usePlayback = create<PlaybackState>()((set, get) => ({
  video: null,
  videoId: "",
  startAt: 0,
  mode: "none",
  docked: "parked",
  miniOpen: false,
  wasMini: false,
  playing: false,
  current: 0,
  duration: 0,
  buffered: 0,
  waiting: false,
  error: null,
  queue: [],
  playedIds: [],
  countdown: null,
  forceEmbedIds: {},
  watchSlot: null,
  miniFrame: null,
  engine: null,

  load: (video, opts) => {
    const prev = get();
    const mode = opts?.mode ?? "direct";
    const sameVideo = prev.videoId === video.id;
    set({
      video,
      videoId: video.id,
      startAt: opts?.startAt || 0,
      mode,
      miniOpen: false,
      countdown: null,
      queue: mode === "direct" && sameVideo ? prev.queue : [],
      playedIds:
        mode === "direct" && !sameVideo && video.id
          ? [...prev.playedIds.filter(id => id !== video.id), video.id].slice(-50)
          : prev.playedIds,
      error: null,
    });
    if (mode !== "direct" && prev.mode === "direct" && prev.playing) {
      prev.engine?.stop();
    }
  },

  setEmbed: (id) => {
    const st = get();
    if (st.videoId === id && st.mode === "direct") {
      st.engine?.stop();
      set({ mode: "embed", miniOpen: false, countdown: null });
    }
    set(s => ({ forceEmbedIds: { ...s.forceEmbedIds, [id]: Date.now() } }));
  },

  isForcedEmbed: (id) => {
    const at = get().forceEmbedIds[id];
    return !!at && Date.now() - at < FORCE_EMBED_TTL;
  },

  setQueue: (related) => set({ queue: (related || []).filter(r => !!r.id) }),
  setEngineMirror: (m) => set(m),
  setDocked: (d) => set({ docked: d }),
  registerEngine: (e) => set({ engine: e }),
  registerWatchSlot: (el) => set({ watchSlot: el }),
  registerMiniFrame: (el) => set({ miniFrame: el }),

  dockMini: () => {
    if (get().mode === "direct") set({ miniOpen: true });
  },

  undockMini: () => set({ miniOpen: false }),

  closeMini: () => {
    get().engine?.stop();
    set({ miniOpen: false });
  },

  expandMini: () => {
    const { videoId, miniOpen } = get();
    if (!videoId || !miniOpen) return;
    const r = useRouterStore.getState().route;
    if (r.name === "watch" && r.v === videoId) {
      set({ miniOpen: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      get().navigateWatch(videoId);
    }
  },

  pauseAndDock: () => {
    const { engine, miniOpen } = get();
    engine?.pause();
    set({ wasMini: miniOpen, miniOpen: false });
  },

  reopenIfWasMini: () => {
    if (get().wasMini) set({ wasMini: false, miniOpen: true });
    else set({ wasMini: false });
  },

  advance: () => {
    const { queue, playedIds } = get();
    const next = queue.find(q => !playedIds.includes(q.id)) || queue[0];
    if (!next) return;
    set({
      countdown: {
        nextId: next.id,
        nextTitle: next.title || "",
        nextThumb: next.thumb || "",
        nextChannel: next.channel || "",
        until: Date.now() + COUNTDOWN_MS,
      },
    });
  },

  cancelCountdown: () => set({ countdown: null }),

  nextTrack: () => {
    const { queue, countdown, playedIds } = get();
    set({ countdown: null });
    const next = (countdown?.nextId && queue.find(q => q.id === countdown.nextId)) || queue[0];
    if (next && next.id !== get().videoId) get().navigateWatch(next.id);
    else if (next?.id === get().videoId) get().engine?.restart();
  },

  prevTrack: () => {
    const { playedIds, videoId } = get();
    set({ countdown: null });
    const prev = [...playedIds].reverse().find(id => id !== videoId);
    if (prev) get().navigateWatch(prev);
    else get().engine?.restart();
  },

  navigateWatch: (id) => {
    if (typeof window === "undefined") return;
    const route: Route = { name: "watch", v: id };
    const url = `/?v=${encodeURIComponent(id)}`;
    window.history.pushState({}, "", url);
    useRouterStore.getState().setRoute(route);
    window.scrollTo({ top: 0 });
  },

  seekTo: (seconds) => {
    get().engine?.seekTo(seconds);
  },
}));

let lastRoute: Route | null = null;
export function initPlaybackRouting() {
  if (typeof window === "undefined") return;
  if (lastRoute) return;
  lastRoute = useRouterStore.getState().route;
  useRouterStore.subscribe(s => {
    const prev = lastRoute;
    lastRoute = s.route;
    if (!prev) return;
    if (prev.name === s.route.name) return;
    const st = usePlayback.getState();
    if (s.route.name === "shorts" && prev.name !== "shorts") {
      st.pauseAndDock();
      return;
    }
    if (prev.name === "shorts" && s.route.name !== "shorts") {
      st.reopenIfWasMini();
      return;
    }
    if (prev.name === "watch" && s.route.name !== "watch" && s.route.name !== "shorts") {
      if (st.mode === "direct" && st.playing && st.videoId) st.dockMini();
    }
  });
}

// ============================================================================
// SECTION: VideoPlayer.tsx — Full Standalone Video Player Component
// ============================================================================

export interface VideoPlayerProps {
  video: YtVideoFull;
  startAt?: number;
  onEnded?: () => void;
  onNext?: () => void;
  onProgress?: (current: number, duration: number) => void;
  onFallback?: () => void;
  minimal?: boolean;
}

export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer({
  video, startAt = 0, onEnded, onNext, onProgress, onFallback, minimal = false,
}, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekHoverRef = useRef<HTMLDivElement>(null);
  const manifestOkRef = useRef(false);
  const onFallbackRef = useRef(onFallback);
  useEffect(() => { onFallbackRef.current = onFallback; }, [onFallback]);

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menu, setMenu] = useState<null | "main" | "speed" | "quality" | "captions">(null);
  const [levels, setLevels] = useState<{ index: number; label: string; height: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState<YtCaption[]>(video.captions || []);
  const [activeCaption, setActiveCaption] = useState<string>("");
  const [sbSegments, setSbSegments] = useState<SbSegment[]>([]);
  const [sbToast, setSbToast] = useState<string | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [ripple, setRipple] = useState<{ dir: "fwd" | "back"; key: number } | null>(null);
  const rippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapRef = useRef<{ t: number; zone: "left" | "right" | "mid" } | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoplay = useYt(s => s.prefs.autoplay);
  const setAutoplay = useYt(s => s.setPrefs);
  const backgroundPlay = useYt(s => s.prefs.backgroundPlay);
  const audioOnly = useYt(s => s.prefs.audioOnly);
  const dataSaver = useYt(s => !!s.prefs.dataSaver);
  const defaultQuality = useYt(s => s.prefs.defaultQuality || "auto");

  const [scrubbing, setScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [longPress2x, setLongPress2x] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speedRef = useRef(1);
  const preDuckVolRef = useRef<number | null>(null);
  const pickCaptionRef = useRef<(lang: string) => void>(() => {});
  const captionsRef = useRef<YtCaption[]>([]);
  const activeCaptionRef = useRef("");

  const onNextRef = useRef(onNext);
  useEffect(() => { onNextRef.current = onNext; }, [onNext]);
  const bgActiveRef = useRef(false);
  const userPausedRef = useRef(false);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const lastSyncRef = useRef(0);
  const loadedVideoRef = useRef<string>("");

  const fallbackFormat = useMemo(() => {
    const combined = video.formats.filter(f => f.has_video && f.has_audio && /mp4/.test(f.mime));
    return combined.sort((a, b) => (b.height || 0) - (a.height || 0)).find(f => (f.height || 0) <= 720) || combined[0] || video.formats.find(f => f.has_video && f.has_audio);
  }, [video.formats]);

  const audioFormat = useMemo(() => {
    const audio = video.formats.filter(f => f.has_audio && !f.has_video && !!f.url);
    const rank = (f: YtFormat) => (/mp4|m4a/.test(f.mime) ? 0 : /webm/.test(f.mime) ? 1 : 2);
    return audio.sort((a, b) => rank(a) - rank(b) || (b.bitrate || 0) - (a.bitrate || 0))[0] || null;
  }, [video.formats]);

  const noSource = !video.hls && !fallbackFormat?.url && !(audioOnly && audioFormat?.url);

  useEffect(() => {
    if (noSource) onFallbackRef.current?.();
  }, [noSource]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let hls: Hls | null = null;
    manifestOkRef.current = false;

    const isToggle = loadedVideoRef.current === video.id;
    loadedVideoRef.current = video.id;
    const keepPos = isToggle ? positionRef.current : 0;
    const wasPlaying = isToggle ? playing : true;
    const resumeAfterLoad = () => {
      const apply = () => {
        if (keepPos > 0.5) {
          try { el.currentTime = keepPos; } catch {}
        }
        if (wasPlaying) el.play().catch(() => {});
      };
      el.addEventListener("loadedmetadata", apply, { once: true });
    };

    const switchToProgressive = () => {
      hls?.destroy();
      if (hlsRef.current === hls) hlsRef.current = null;
      if (fallbackFormat?.url) {
        el.src = absStream(fallbackFormat.url);
        el.play().catch(() => {});
      } else {
        onFallbackRef.current?.();
      }
    };

    const useAudio = audioOnly && audioFormat?.url;
    if (useAudio) {
      const src = absStream(audioFormat!.url!);
      el.src = `${src}${src.includes("?") ? "&" : "?"}_=${Date.now()}`;
      resumeAfterLoad();
    } else if (video.hls && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        backBufferLength: 30,
        capLevelToPlayerSize: false,
      });
      hlsRef.current = hls;
      const src = absStream(video.hls);
      hls.loadSource(`${src}${src.includes("?") ? "&" : "?"}_=${Date.now()}`);
      hls.attachMedia(el);
      resumeAfterLoad();
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        manifestOkRef.current = true;
        const lv = data.levels
          .map((l, i) => ({ index: i, label: l.height ? `${l.height}p` : `${Math.round((l.bitrate || 0) / 1000)}kbps`, height: l.height || 0 }))
          .sort((a, b) => b.height - a.height);
        setLevels(lv);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          switchToProgressive();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
        } else {
          onFallbackRef.current?.();
        }
      });
    } else if (video.hls && el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = absStream(video.hls);
      resumeAfterLoad();
    } else if (fallbackFormat?.url) {
      el.src = absStream(fallbackFormat.url);
      resumeAfterLoad();
    }

    return () => {
      hls?.destroy();
      if (hlsRef.current === hls) hlsRef.current = null;
    };
  }, [video.id, video.hls, fallbackFormat?.url, audioOnly, audioFormat?.url, dataSaver, defaultQuality]);

  const userStart = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    setMuted(false);
    el.volume = volume;
    el.play().catch(() => {});
    setStarted(true);
    if (!minimal) nativeKeepAwake(true);
  }, [volume, minimal]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { userPausedRef.current = false; if (!started) userStart(); else el.play().catch(() => {}); }
    else { userPausedRef.current = true; el.pause(); }
  }, [started, userStart]);

  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className={`${minimal ? "relative w-full h-full" : "yt-player-shell relative w-full aspect-video"} bg-black ${minimal ? "rounded-lg sm:rounded-xl" : "rounded-xl"} overflow-hidden select-none`}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        autoPlay
        muted
        poster={video.thumb_lg || video.thumb}
      />
    </div>
  );
});

// ============================================================================
// SECTION: VideoSurface.tsx — Single Persistent Adopted Video Element
// ============================================================================

let surfaceVideoEl: HTMLVideoElement | null = null;
let surfaceHolderEl: HTMLDivElement | null = null;

function getSurfaceVideo(): HTMLVideoElement {
  if (!surfaceVideoEl) {
    const el = document.createElement("video");
    el.playsInline = true;
    el.muted = true;
    el.autoplay = true;
    el.setAttribute("data-player-surface", "1");
    el.className = "w-full h-full object-contain bg-black";
    surfaceVideoEl = el;
  }
  return surfaceVideoEl;
}

function moveSurfaceVideo(target: HTMLElement) {
  const el = surfaceVideoEl;
  if (!el || el.parentElement === target) return;
  target.appendChild(el);
}

function parkSurfaceVideo() {
  if (surfaceHolderEl) moveSurfaceVideo(surfaceHolderEl);
}

export function parkSurfaceVideoIfInside(host: HTMLElement | null) {
  const el = surfaceVideoEl;
  if (!el || !host) return;
  if (el === host || host.contains(el)) parkSurfaceVideo();
}

export function VideoSurface() {
  const video = usePlayback(s => s.video);
  const videoId = usePlayback(s => s.videoId);
  const startAt = usePlayback(s => s.startAt);
  const mode = usePlayback(s => s.mode);
  const miniOpen = usePlayback(s => s.miniOpen);
  const watchSlot = usePlayback(s => s.watchSlot);
  const miniFrame = usePlayback(s => s.miniFrame);
  const docked = usePlayback(s => s.docked);
  const queueLen = usePlayback(s => s.queue.length);
  const nextTrack = usePlayback(s => s.nextTrack);
  const setDocked = usePlayback(s => s.setDocked);
  const registerEngine = usePlayback(s => s.registerEngine);
  const setEngineMirror = usePlayback(s => s.setEngineMirror);
  const { route: { name: routeName } } = useRouter();

  const autoplay = useYt(s => s.prefs.autoplay);
  const setAutoplay = useYt(s => s.setPrefs);
  const backgroundPlay = useYt(s => s.prefs.backgroundPlay);
  const audioOnly = useYt(s => s.prefs.audioOnly);
  const dataSaver = useYt(s => !!s.prefs.dataSaver);
  const defaultQuality = useYt(s => s.prefs.defaultQuality || "auto");
  const pipOnHome = useYt(s => s.prefs.pipOnHome !== false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  if (typeof document !== "undefined" && !videoRef.current) {
    videoRef.current = getSurfaceVideo();
  }

  const holderRefCb = useCallback((el: HTMLDivElement | null) => {
    surfaceHolderEl = el;
    if (el && surfaceVideoEl && !surfaceVideoEl.isConnected) el.appendChild(surfaceVideoEl);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manifestOkRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menu, setMenu] = useState<null | "main" | "speed" | "quality" | "captions">(null);
  const [levels, setLevels] = useState<{ index: number; label: string; height: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState<YtVideoFull["captions"]>([]);
  const [activeCaption, setActiveCaption] = useState<string>("");
  const [sbSegments, setSbSegments] = useState<SbSegment[]>([]);
  const [sbToast, setSbToast] = useState<string | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [ripple, setRipple] = useState<{ dir: "fwd" | "back"; key: number } | null>(null);
  const rippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapRef = useRef<{ t: number; zone: "left" | "right" | "mid" } | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [longPress2x, setLongPress2x] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speedRef = useRef(1);
  const preDuckVolRef = useRef<number | null>(null);
  const pickCaptionRef = useRef<(lang: string) => void>(() => {});
  const captionsRef = useRef<YtVideoFull["captions"]>([]);
  const activeCaptionRef = useRef("");

  const autoplayRef = useRef(autoplay);
  const routeRef = useRef(routeName);
  const dockedRef = useRef(docked);
  const startedRef = useRef(started);
  useEffect(() => { autoplayRef.current = autoplay; routeRef.current = routeName; dockedRef.current = docked; startedRef.current = started; });

  const bgActiveRef = useRef(false);
  const userPausedRef = useRef(false);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const lastSyncRef = useRef(0);
  const loadedVideoRef = useRef<string>("");

  const fallbackFormat = useMemo(() => {
    if (!video?.formats) return null;
    const combined = video.formats.filter(f => f.has_video && f.has_audio && /mp4/.test(f.mime));
    return combined.sort((a, b) => (b.height || 0) - (a.height || 0)).find(f => (f.height || 0) <= 720) || combined[0] || video.formats.find(f => f.has_video && f.has_audio);
  }, [video?.formats]);

  const audioFormat = useMemo(() => {
    if (!video?.formats) return null;
    const audio = video.formats.filter(f => f.has_audio && !f.has_video && !!f.url);
    const rank = (f: YtFormat) => (/mp4|m4a/.test(f.mime) ? 0 : /webm/.test(f.mime) ? 1 : 2);
    return audio.sort((a, b) => rank(a) - rank(b) || (b.bitrate || 0) - (a.bitrate || 0))[0] || null;
  }, [video?.formats]);

  const noSource = !!video && mode === "direct" && !video.hls && !fallbackFormat?.url && !(audioOnly && audioFormat?.url);

  useEffect(() => {
    if (noSource && video) usePlayback.getState().setEmbed(video.id);
  }, [noSource, video]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.poster = video?.thumb_lg || video?.thumb || "";
    setCaptions(video?.captions || []);
    setDuration(video?.duration || 0);
  }, [videoId, video?.thumb_lg, video?.thumb, video?.captions, video?.duration]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video || mode !== "direct") return;
    let hls: Hls | null = null;
    manifestOkRef.current = false;

    const isToggle = loadedVideoRef.current === video.id;
    loadedVideoRef.current = video.id;
    const keepPos = isToggle ? positionRef.current : 0;
    const wasPlaying = isToggle ? playing : true;
    const resumeAfterLoad = () => {
      const apply = () => {
        if (keepPos > 0.5) {
          try { el.currentTime = keepPos; } catch {}
        }
        if (wasPlaying) el.play().catch(() => {});
      };
      el.addEventListener("loadedmetadata", apply, { once: true });
    };

    const switchToProgressive = () => {
      hls?.destroy();
      if (hlsRef.current === hls) hlsRef.current = null;
      if (fallbackFormat?.url) {
        el.src = absStream(fallbackFormat.url);
        el.play().catch(() => {});
      } else {
        usePlayback.getState().setEmbed(video.id);
      }
    };

    const useAudio = audioOnly && audioFormat?.url;
    if (useAudio) {
      const src = absStream(audioFormat!.url!);
      el.src = `${src}${src.includes("?") ? "&" : "?"}_=${Date.now()}`;
      resumeAfterLoad();
    } else if (video.hls && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        backBufferLength: 30,
        capLevelToPlayerSize: false,
      });
      hlsRef.current = hls;
      const src = absStream(video.hls);
      hls.loadSource(`${src}${src.includes("?") ? "&" : "?"}_=${Date.now()}`);
      hls.attachMedia(el);
      resumeAfterLoad();
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        manifestOkRef.current = true;
        const lv = data.levels
          .map((l, i) => ({ index: i, label: l.height ? `${l.height}p` : `${Math.round((l.bitrate || 0) / 1000)}kbps`, height: l.height || 0 }))
          .sort((a, b) => b.height - a.height);
        setLevels(lv);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        switchToProgressive();
      });
    } else if (video.hls && el.canPlayType("application/vnd.apple.mpegurl")) {
      const src2 = absStream(video.hls);
      el.src = `${src2}${src2.includes("?") ? "&" : "?"}_=${Date.now()}`;
      resumeAfterLoad();
    } else if (fallbackFormat?.url) {
      el.src = absStream(fallbackFormat.url);
      resumeAfterLoad();
    }

    return () => {
      hls?.destroy();
      if (hlsRef.current === hls) hlsRef.current = null;
    };
  }, [videoId, video, mode, fallbackFormat?.url, audioOnly, audioFormat?.url, dataSaver, defaultQuality]);

  const ensureBgEnabled = useCallback(() => {
    if (!backgroundPlay || bgActiveRef.current) return;
    bgActiveRef.current = true;
    nativeBackgroundEnable({
      title: video?.title || "YouTube",
      artist: video?.channel || "",
      artwork: video?.thumb_lg || video?.thumb || "",
      duration: durationRef.current || video?.duration || 0,
    });
  }, [backgroundPlay, video?.title, video?.channel, video?.thumb_lg, video?.thumb, video?.duration]);

  const userStart = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    setMuted(false);
    el.volume = volume;
    el.play().catch(() => {});
    setStarted(true);
    ensureBgEnabled();
    nativeKeepAwake(true);
  }, [volume, ensureBgEnabled]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen?.();
  }, []);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      userPausedRef.current = false;
      if (!started) userStart();
      else { el.play().catch(() => {}); ensureBgEnabled(); }
    } else { userPausedRef.current = true; el.pause(); }
  }, [started, userStart, ensureBgEnabled]);

  const pause = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    userPausedRef.current = true;
    el.pause();
    setPlaying(false);
    setEngineMirror({ playing: false });
  }, [setEngineMirror]);

  const seekTo = useCallback((seconds: number) => {
    const el = videoRef.current;
    if (!el || !isFinite(seconds)) return;
    usePlayback.getState().cancelCountdown();
    el.currentTime = Math.max(0, Math.min((el.duration || duration) - 0.2, seconds));
  }, [duration]);

  const seekBy = useCallback((d: number) => {
    const el = videoRef.current;
    if (!el) return;
    usePlayback.getState().cancelCountdown();
    el.currentTime = Math.max(0, Math.min((el.duration || duration) - 0.2, el.currentTime + d));
  }, [duration]);

  const restart = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    usePlayback.getState().cancelCountdown();
    el.currentTime = 0;
    userPausedRef.current = false;
    if (!started) userStart();
    else { el.play().catch(() => {}); ensureBgEnabled(); }
  }, [started, userStart, ensureBgEnabled]);

  const stop = useCallback(() => {
    const el = videoRef.current;
    userPausedRef.current = true;
    el?.pause();
    nativeKeepAwake(false);
    if (bgActiveRef.current) {
      bgActiveRef.current = false;
      nativeBackgroundDisable();
    }
    setPlaying(false);
    setEngineMirror({ playing: false });
  }, [setEngineMirror]);

  const setVol = useCallback((v: number) => {
    const el = videoRef.current;
    if (el) { el.muted = false; el.volume = v; setMuted(false); setVolume(v); }
  }, []);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (el) {
      el.muted = !el.muted;
      setMuted(el.muted);
      if (!el.muted) {
        ensureBgEnabled();
        if (el.volume === 0) setVol(0.5);
      }
    }
  }, [setVol, ensureBgEnabled]);

  useEffect(() => {
    const engine = { togglePlay, pause, seekTo, seekBy, restart, toggleMute, stop };
    registerEngine(engine);
    return () => {
      if (usePlayback.getState().engine === engine) registerEngine(null);
    };
  }, [togglePlay, pause, seekTo, seekBy, restart, toggleMute, stop, registerEngine]);

  const portalVisible = !!(watchSlot && !miniOpen && mode === "direct" && videoId);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let target: HTMLElement | null = null;
    if (mode === "direct" && routeName !== "shorts") {
      if (miniOpen && miniFrame) target = miniFrame;
      else if (portalVisible && watchSlot) target = watchSlot;
    }
    if (target) {
      moveSurfaceVideo(target);
      setDocked(miniOpen ? "mini" : "watch");
    } else if (!el.isConnected && surfaceHolderEl) {
      surfaceHolderEl.appendChild(el);
      setDocked("parked");
    } else {
      setDocked("parked");
    }
  }, [mode, routeName, miniOpen, miniFrame, watchSlot, portalVisible, setDocked]);

  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const displayTime = scrubbing ? scrubTime : current;
  const pct = duration > 0 ? (displayTime / duration) * 100 : 0;
  const bufPct = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;

  if (!video || !portalVisible) {
    return (
      <div ref={holderRefCb} className="fixed top-0 left-0 w-px h-px overflow-hidden opacity-0 pointer-events-none" aria-hidden="true" />
    );
  }

  return (
    <>
      <div ref={holderRefCb} className="fixed top-0 left-0 w-px h-px overflow-hidden opacity-0 pointer-events-none" aria-hidden="true" />
      {createPortal(
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-hidden group/player select-none"
          data-player-surface="1"
          data-testid="video-surface"
        >
          {error && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/90" data-player-surface="1">
              <p className="text-[#aaa] text-sm">{error}</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-full bg-[#272727] text-sm hover:bg-[#3f3f3f]">Reload</button>
            </div>
          )}

          {/* AUDIO ONLY ARTWORK - SYNTAX REPAIRED */}
          {audioOnly && audioFormat && !error && (
            <div className="absolute inset-0 z-[5] overflow-hidden bg-black" data-player-surface="1" data-testid="audio-mode-art">
              {(video.thumb_lg || video.thumb) && (
                <img
                  src={video.thumb_lg || video.thumb}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-40"
                />
              )}
              <div className="relative h-full flex items-center justify-center gap-4 sm:gap-7 px-5 sm:px-10">
                {(video.thumb_lg || video.thumb) && (
                  <img
                    src={video.thumb_lg || video.thumb}
                    alt=""
                    className="w-[42%] max-w-[260px] aspect-video object-cover rounded-lg sm:rounded-xl shadow-2xl shrink-0"
                  />
                )}
                <div className="min-w-0 hidden xs:block max-w-[46%]">
                  <p className="text-white text-[15px] sm:text-[17px] font-medium leading-[22px] clamp-2">{video.title}</p>
                  {video.channel && <p className="text-white/75 text-[13px] mt-1.5 truncate">{video.channel}</p>}
                  <p className="mt-3 inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-white/10 text-white text-[12px] font-medium">
                    <Headphones className="w-3.5 h-3.5" /> Audio mode — data saver
                  </p>
                </div>
              </div>
            </div>
          )}

          {waiting && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" data-player-surface="1">
              <div className="w-12 h-12 rounded-full border-[3px] border-white/25 border-t-white animate-spin" role="status" aria-label="Loading" />
            </div>
          )}

          {!error && muted && playing && (
            <button
              onClick={() => toggleMute()}
              className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 h-9 rounded-lg bg-black/80 text-white text-[13px] hover:bg-black"
            >
              <VolumeX className="w-5 h-5" /> Tap to unmute
            </button>
          )}

          {/* Center controls */}
          {!waiting && !error && (controlsVisible || !playing) && (
            <div className="absolute inset-0 z-20 flex items-center justify-center gap-7 sm:gap-10 pointer-events-none" data-testid="center-controls">
              <button onClick={() => seekBy(-10)} aria-label="Rewind 10s" className="pointer-events-auto w-14 h-14 flex items-center justify-center text-white active:scale-90 transition-transform">
                <RotateCcw className="w-10 h-10" />
              </button>
              <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="pointer-events-auto w-14 h-14 flex items-center justify-center text-white active:scale-90 transition-transform">
                {playing ? <Pause className="w-12 h-12" fill="white" /> : <Play className="w-12 h-12 ml-1" fill="white" />}
              </button>
              <button onClick={() => seekBy(10)} aria-label="Forward 10s" className="pointer-events-auto w-14 h-14 flex items-center justify-center text-white active:scale-90 transition-transform">
                <RotateCw className="w-10 h-10" />
              </button>
            </div>
          )}

          {/* Bottom Bar */}
          <div className="yt-controls absolute left-0 right-0 bottom-0 z-20 yt-scrim-bottom pt-8 pb-2 px-3 sm:px-4 flex items-center gap-2 text-white">
            <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center">
              {playing ? <Pause className="w-5 h-5" fill="white" /> : <Play className="w-5 h-5" fill="white" />}
            </button>
            <span className="text-[12px] tabular-nums text-white/90">
              {formatTime(displayTime)} / {formatTime(duration)}
            </span>
            <div className="flex-1" />
            <button onClick={toggleFullscreen} className="w-8 h-8 flex items-center justify-center">
              {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>

          <CountdownCard />
        </div>,
        watchSlot!
      )}
    </>
  );
}

export default VideoSurface;