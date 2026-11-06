import { useSyncExternalStore } from "react";
import { Parser } from "youtubei.js";

// Import external application audio engine and DB bindings
import { audioEngine as hostAudioEngine } from "../../lib/audioEngine";
import { saveTrack as hostSaveTrack } from "../../lib/db";

// Direct integration into api.tsx engine
import {
  itSearch,
  itVideo,
  absStream,
  formatTime,
  parseDuration as formatParseDuration,
  rememberAvatar,
} from "./api";
import type { Track } from "../../types";
export type { Track };

export const audioEngine = hostAudioEngine;
export const saveTrack = hostSaveTrack;

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

export type TranslationKeys = string;
export type SyncState = "synced" | "syncing" | "dirty" | "error";
export type Features = "search" | "library" | "player" | "list" | "settings" | "queue";
export type Context = "" | "search" | "playlists" | "collection" | "channels" | "queue" | "album";

export interface TrackItem {
  id: string;
  title: string;
  duration: string;
  author: string;
  authorId: string;
  img?: string;
  modified?: number;
  albumId?: string;
  albumTitle?: string;
  context?: {
    src: Context;
    id: string;
  };
}

export interface YTItem extends TrackItem {
  img?: string;
  albumId?: string;
  albumTitle?: string;
  subtext?: string;
  type: "video" | "song";
}

export interface ListItem {
  id: string;
  name: string;
  img: string;
  class?: string;
}

export interface YTChannelItem extends ListItem {
  type: "channel";
  subscribers?: string;
  videoCount?: string;
  description?: string;
  items?: YTItem[];
}

export interface YTPlaylistItem extends ListItem {
  type: "playlist";
  author?: string;
  videoCount?: string;
  items?: YTItem[];
  hasContinuation?: boolean;
}

export interface YTArtistItem extends ListItem {
  type: "artist";
  subscribers?: string;
  items?: YTItem[];
  albums?: YTAlbumItem[];
  eps?: YTAlbumItem[];
}

export interface YTAlbumItem extends ListItem {
  type: "album";
  author: string;
  year?: string;
  playlistId?: string;
  items?: YTItem[];
}

// ==========================================
// 2. UTILITIES
// ==========================================

try {
  Parser.setParserErrorHandler(() => {});
} catch {}

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function convertSStoHHMMSS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function parseDuration(duration?: string): number {
  if (!duration) return 0;
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function isTopicAuthor(author?: string): boolean {
  return author?.endsWith(" - Topic") || false;
}

export function stripTopic(author?: string): string {
  if (!author) return "";
  return author.replace(" - Topic", "");
}

export function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function generateImageUrl(id?: string, size: "120" | "544" | "720" = "544"): string | null {
  if (!id) return null;
  if (id.startsWith("/")) return `https://yt3.ggpht.com${id}=s${size}-c-k-c0x00ffffff-no-rj`;
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

export function sortCollection(items: TrackItem[], sortBy: string, sortOrder: "asc" | "desc"): TrackItem[] {
  return [...items].sort((a, b) => {
    let valA: any = "";
    let valB: any = "";
    switch (sortBy) {
      case "name": valA = a.title; valB = b.title; break;
      case "artist": valA = a.author; valB = b.author; break;
      case "duration": valA = parseDuration(a.duration); valB = parseDuration(b.duration); break;
      case "modified": default: valA = a.modified || 0; valB = b.modified || 0; break;
    }
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });
}

export function lsGetJSON<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function lsSetJSON<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export function cleanTrackTitle(title: string): string {
  if (!title) return "Unknown Title";
  return title
    .replace(/\s*\(Official (Music Video|Audio|Video|Lyric Video|Visualizer)\)/gi, "")
    .replace(/\s*\[Official (Music Video|Audio|Video|Lyric Video|Visualizer)\]/gi, "")
    .replace(/\s*\(HD\)/gi, "")
    .replace(/\s*\(Lyrics\)/gi, "")
    .trim();
}

export function cleanArtistName(artist: string): string {
  if (!artist) return "Unknown Artist";
  return artist.replace(/\s*-\s*Topic$/i, "").trim();
}

export function formatTimeSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ==========================================
// 3. CONFIG & APP STATE
// ==========================================

export type PanelRatio = "1:1" | "2:3" | "3:4" | "1:2" | "2:5";
export type CachingMode = "auto" | "on-demand" | "off";
export type PlayerBackground = "none" | "frost" | "frost-motion" | "blur" | "blur-motion";

export let config = {
  language: "en",
  quality: "high" as "low" | "medium" | "high" | "worst",
  stableVolume: false,
  watchMode: "",
  history: true,
  searchSuggestions: true,
  loadImage: true,
  playerBackground: "none" as PlayerBackground,
  theme: "auto" as "auto" | "light" | "dark",
  persistentShuffle: false,
  similarContent: false,
  authorGrouping: false,
  searchFilter: "all",
  volume: "100",
  sortBy: "modified" as "modified" | "name" | "artist" | "duration",
  sortOrder: "desc" as "asc" | "desc",
  cachingMode: "auto" as CachingMode,
  sponsorblock: true,
  hasCompletedBoot: true,
};

type AppConfig = typeof config;
const lsKey = "ytmusic_config";
try {
  const saved = localStorage.getItem(lsKey);
  if (saved) Object.assign(config, JSON.parse(saved));
} catch {}

const configListeners = new Set<() => void>();
let configVersion = 0;
function notifyConfig() { configVersion++; configListeners.forEach((l) => l()); }

export function useConfig() {
  useSyncExternalStore(
    (onStoreChange) => { configListeners.add(onStoreChange); return () => configListeners.delete(onStoreChange); },
    () => configVersion
  );
  return config;
}

export function setConfig<K extends keyof AppConfig>(key: K, val: AppConfig[K]) {
  (config as any)[key] = val;
  localStorage.setItem(lsKey, JSON.stringify(config));
  notifyConfig();
}

export function useCachingMode() { useConfig(); return config.cachingMode; }
export function setCachingMode(m: CachingMode) { setConfig("cachingMode", m); }
export function usePlayerBackground() { useConfig(); return config.playerBackground; }
export function setPlayerBackground(b: PlayerBackground) { setConfig("playerBackground", b); }

export function themer() {
  const theme = config.theme === "auto" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : config.theme;
  document.documentElement.setAttribute("data-theme", theme);
}

export function cssVar(name: string, value?: string) {
  if (value !== undefined) document.documentElement.style.setProperty(name, value);
  return getComputedStyle(document.documentElement).getPropertyValue(name);
}

export let drawer = { recentSearches: [] as string[] };

// ==========================================
// 4. COLLECTIONS & VAULT
// ==========================================

export const DISCOVERY_COLLECTION = "discovery";
export const CACHED_COLLECTION = "cached";

export function getCollection(name: string): string[] { return lsGetJSON(`collection_${name}`, []); }
export function getCollectionItems(name: string): TrackItem[] { return lsGetJSON(`collection_items_${name}`, []); }

export function addToCollection(name: string, items: TrackItem[]) {
  const currentIds = getCollection(name);
  const currentItems = getCollectionItems(name);
  const newIds = [...currentIds];
  const newItems = [...currentItems];
  items.forEach((item) => {
    if (!newIds.includes(item.id)) {
      newIds.push(item.id);
      newItems.push({ ...item, modified: Date.now() });
    }
  });
  lsSetJSON(`collection_${name}`, newIds);
  lsSetJSON(`collection_items_${name}`, newItems);
  setStore("libraryUpdated", Date.now());
}

export function removeFromCollection(name: string, ids: string[]) {
  const currentIds = getCollection(name);
  const currentItems = getCollectionItems(name);
  lsSetJSON(`collection_${name}`, currentIds.filter((id) => !ids.includes(id)));
  lsSetJSON(`collection_items_${name}`, currentItems.filter((item) => !ids.includes(item.id)));
  setStore("libraryUpdated", Date.now());
}

export function createCollection(name: string) {
  const keys = getCollectionsKeys();
  if (!keys.includes(name)) {
    lsSetJSON("collection_keys", [...keys, name]);
    setStore("libraryUpdated", Date.now());
  }
}

export function getCollectionsKeys(): string[] {
  return lsGetJSON("collection_keys", ["history", "favorites", "liked", "listenLater"]);
}

// ==========================================
// 5. INNER-TUBE SEARCH & STREAM RESOLUTION
// ==========================================

export interface YtMusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  durationText: string;
  artwork: string;
  streamUrl: string;
  videoId: string;
  views?: string;
}

export class YtMusicHandler {
  async search(query: string, filter: "all" | "songs" | "albums" | "videos" = "songs"): Promise<YtMusicTrack[]> {
    if (!query.trim()) return [];

    try {
      const q = filter === "songs" ? `${query} audio` : query;
      const res = await itSearch(q);

      return res.videos.map((v) => {
        const title = cleanTrackTitle(v.title);
        const artist = cleanArtistName(v.channel || "YouTube Artist");
        const durSec = parseDuration(v.duration) || 195;

        return {
          id: `yt_${v.id}`,
          videoId: v.id,
          title,
          artist,
          album: "YouTube Music",
          duration: durSec,
          durationText: v.duration || formatTimeSeconds(durSec),
          artwork: v.thumb_lg || v.thumb || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
          streamUrl: `/api/audio/stream?id=${v.id}`,
          views: v.views ? String(v.views) : "",
        };
      });
    } catch (err) {
      console.warn("[YtMusicHandler] search failed:", err);
      return [];
    }
  }

  async getTrendingCharts(): Promise<YtMusicTrack[]> {
    try {
      const results = await this.search("Top Music Hits 2026", "songs");
      if (results.length > 0) return results;
      return await this.search("Popular Music Charts", "songs");
    } catch (e) {
      console.warn("[YtMusicHandler] getTrendingCharts error:", e);
      return [];
    }
  }

  toAudioTrack(track: YtMusicTrack): Track {
    return {
      id: track.videoId || track.id.replace("yt_", ""),
      title: track.title,
      artist: track.artist,
      album: track.album || "YouTube Music",
      duration: track.duration,
      durationText: track.durationText,
      artwork: track.artwork,
      source: "youtube",
      addedAt: Date.now(),
      streamUrl: track.streamUrl,
    };
  }
}

export const ytMusicHandler = new YtMusicHandler();

// ==========================================
// 6. STORE ENGINE & GLOBAL STATE
// ==========================================

export function createStore<T extends object>(initialState: T) {
  let state = { ...initialState };
  let version = 0;
  const listeners = new Set<() => void>();

  const notify = () => { version++; listeners.forEach((l) => l()); };
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };

  const setStore = (...args: any[]) => {
    if (args.length === 1) {
      if (typeof args[0] === "function") state = args[0](state);
      else if (typeof args[0] === "object" && args[0] !== null) state = { ...state, ...args[0] };
    } else if (args.length === 2) {
      const [key, val] = args;
      state = { ...state, [key]: typeof val === "function" ? val((state as any)[key]) : val };
    } else if (args.length === 3) {
      const [k1, k2, val] = args;
      const cur = (state as any)[k1] || {};
      state = { ...state, [k1]: { ...cur, [k2]: typeof val === "function" ? val(cur[k2]) : val } };
    }
    notify();
  };

  const proxy = new Proxy({} as T, {
    get(_, prop) { return (state as any)[prop]; },
    set(_, prop, val) { (state as any)[prop] = val; notify(); return true; },
  });

  const useStore = () => { useSyncExternalStore(subscribe, () => version); return proxy; };
  return [proxy, setStore, useStore, subscribe] as const;
}

export const DEFAULT_EN_TRANSLATIONS: Record<string, string> = {
  nav_search: "Search",
  nav_library: "Library",
  nav_list: "List",
  nav_queue: "Queue",
  nav_settings: "Settings",
  close: "Close",
  loading: "Loading...",
  player_from: "from $",
  player_play_next: "Play next",
  queue_clear: "Clear Queue",
  queue_shuffle: "Shuffle",
  queue_remove_mode: "Remove",
  search_placeholder: "Search songs, albums, artists...",
  search_filter_all: "All",
  search_filter_music_songs: "Songs",
  library_history: "History",
  library_favorites: "Favorites",
  library_liked_songs: "Liked Songs",
  actions_menu_enqueue: "Add to Queue",
};

export const [store, setStore, useAppStore] = createStore({
  api: "/api/ytmusic",
  translations: { ...DEFAULT_EN_TRANSLATIONS },
  libraryUpdated: 0,
  actionsMenu: undefined as TrackItem | undefined,
  snackbar: "",
});

export function t(key: string, value: string = ""): string {
  const trans = store.translations;
  const str = (trans as any)[key] || (DEFAULT_EN_TRANSLATIONS as any)[key] || key;
  return value ? str.replace("$", value) : str;
}

export async function updateLang() {}

export type MainFeature = "queue" | "search" | "library" | "list" | "settings";

export const [navStore, setNavStore, useNavStore] = createStore({
  active: "search" as MainFeature,
  player: { state: false },
});

export function openSubView(feature: MainFeature) { setNavStore("active", feature); }
export function closeSubView() { setNavStore("active", "search"); }

export const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
export function updateParam(key: string, value?: string) {
  if (typeof window === "undefined") return;
  if (value) params.set(key, value); else params.delete(key);
  window.history.replaceState({}, "", window.location.pathname + (params.toString() ? "?" + params.toString() : ""));
}

export const [playerStore, setPlayerStore, usePlayerStore] = createStore({
  audio: typeof Audio !== "undefined" ? new Audio() : (null as any),
  playbackState: "none" as "none" | "playing" | "paused" | "loading",
  context: { id: "", src: "" as Context },
  status: "",
  currentTime: 0,
  fullDuration: 0,
  loop: false,
  volume: 1.0,
  stream: { title: "", author: "", authorId: "", id: "", duration: "" } as TrackItem,
  mediaArtwork: "",
  isMusic: true,
  isWatching: false,
  saveProgress: false,
});

export const [queueStore, setQueueStore, useQueueStore] = createStore({
  list: [] as TrackItem[],
  history: [] as TrackItem[],
  removeMode: false,
  isLoading: false,
});

export function addToQueue(items: TrackItem[], options: { replace?: boolean; prepend?: boolean } = {}) {
  setQueueStore("list", (prev: TrackItem[]) => {
    return options.replace ? items : options.prepend ? [...items, ...prev] : [...prev, ...items];
  });
}

export function playNext() {
  const next = queueStore.list[0];
  if (next) {
    setPlayerStore("stream", next);
    setQueueStore("list", (prev: TrackItem[]) => prev.slice(1));
    player(next.id);
  }
}

export function playPrev() {
  const prev = queueStore.history[0];
  if (prev) {
    setPlayerStore("stream", prev);
    setQueueStore("history", (h: TrackItem[]) => h.slice(1));
    player(prev.id);
  }
}

export function totalQueueDuration(list: TrackItem[]): string {
  const total = list.reduce((acc, item) => acc + parseDuration(item.duration), 0);
  return convertSStoHHMMSS(total);
}

export const [searchStore, setSearchStore, useSearchStore] = createStore({
  query: "",
  results: [] as YTItem[],
  isLoading: false,
  page: 1,
  suggestions: { data: [] as string[], index: -1, controller: new AbortController() },
});

export const [listStore, setListStore, useListStore] = createStore({
  isLoading: false,
  list: [] as TrackItem[],
  name: "",
  id: "",
  type: "collection" as "channels" | "playlists" | "collection" | "album",
  reservedCollections: ["history", "favorites", "liked", "listenLater", "cached", "discovery"],
  artistAlbums: [] as YTAlbumItem[],
  artistEps: [] as YTAlbumItem[],
});

export async function getSearchResults() {
  if (!searchStore.query) return;
  setSearchStore("isLoading", true);
  try {
    const r = await ytMusicHandler.search(searchStore.query);
    const converted = r.map((item) => ({
      id: item.videoId,
      title: item.title,
      author: item.artist,
      authorId: "",
      duration: item.durationText,
      img: item.artwork,
      type: "song" as const,
    }));
    setSearchStore("results", converted);
  } finally {
    setSearchStore("isLoading", false);
  }
}

export async function getSearchSuggestions(query: string) {
  if (!query) return;
  try {
    const suggs = await itSearch(query);
    setSearchStore("suggestions", "data", suggs.videos.slice(0, 8).map(v => v.title));
  } catch {}
}

export function clearSuggestions() {
  setSearchStore("suggestions", "data", []);
}

export function resetList() {
  setListStore({ list: [], name: "", id: "", type: "collection", artistAlbums: [], artistEps: [] });
}

// ==========================================
// 7. DIRECT STREAM RESOLUTION CONTROLLER
// ==========================================

export async function player(id: string) {
  if (!id) return;
  const cleanId = id.replace(/^yt_/, "");

  setPlayerStore("status", "Resolving audio stream...");
  setPlayerStore("playbackState", "loading");

  try {
    // 1. Query InnerTube for progressive audio streams via api.tsx
    const videoData = await itVideo(cleanId);

    // Pick best audio-only stream (Opus, AAC, m4a)
    const audioFmt = videoData.formats
      ?.filter(f => f.has_audio && !f.has_video && !!f.url)
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]
      || videoData.formats?.find(f => f.has_audio);

    const directUrl = audioFmt?.url ? absStream(audioFmt.url) : `/api/audio/stream?id=${cleanId}`;

    const track: Track = {
      id: cleanId,
      title: videoData.title || playerStore.stream?.title || "YouTube Music Track",
      artist: videoData.channel || playerStore.stream?.author || "YouTube Artist",
      album: "YouTube Music",
      duration: videoData.duration || 210,
      durationText: formatTime(videoData.duration || 210),
      source: "youtube",
      addedAt: Date.now(),
      streamUrl: directUrl,
      artwork: videoData.thumb_lg || videoData.thumb || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
    };

    setPlayerStore("stream", {
      id: cleanId,
      title: track.title,
      author: track.artist,
      authorId: videoData.channel_id || "",
      duration: track.durationText || "3:30",
      img: track.artwork,
    });
    setPlayerStore("mediaArtwork", track.artwork);

    // 2. Play through host audio engine
    await audioEngine.playTrack(track);

    setPlayerStore("playbackState", "playing");
    setPlayerStore("status", "");
  } catch (error) {
    console.warn("Direct stream error, falling back:", error);
    try {
      const fallbackTrack: Track = {
        id: cleanId,
        title: playerStore.stream?.title || "YouTube Music Track",
        artist: playerStore.stream?.author || "YouTube Artist",
        album: "YouTube Music",
        duration: 210,
        source: "youtube",
        addedAt: Date.now(),
        streamUrl: `/api/audio/stream?id=${cleanId}`,
        artwork: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
      };
      await audioEngine.playTrack(fallbackTrack);
      setPlayerStore("playbackState", "playing");
      setPlayerStore("status", "");
    } catch {
      setPlayerStore("status", "Error playing stream");
      setPlayerStore("playbackState", "none");
    }
  }
}

export function quickSwitch() {
  if (playerStore.stream?.id) player(playerStore.stream.id);
}

export const playback = { player, quickSwitch };