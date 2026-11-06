import React, { useState, useEffect, createContext, useContext } from "react";
import {
  SlidersHorizontal,
  Music2,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Repeat,
  Volume2,
  VolumeX,
  Sliders,
  Disc,
  ListMusic,
  Trash2,
  Heart,
  Video,
  Music,
  Search,
  Library,
  Settings,
  X,
  Plus,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";

import {
  Track,
  audioEngine,
  saveTrack,
  t,
  updateLang,
  useConfig,
  setConfig,
  usePlayerBackground,
  useCachingMode,
  setPlayerBackground,
  setCachingMode,
  themer,
  player,
  quickSwitch,
  store,
  setStore,
  useAppStore,
  navStore,
  setNavStore,
  useNavStore,
  playerStore,
  setPlayerStore,
  usePlayerStore,
  queueStore,
  setQueueStore,
  useQueueStore,
  searchStore,
  setSearchStore,
  useSearchStore,
  listStore,
  setListStore,
  useListStore,
  addToQueue,
  playNext,
  playPrev,
  resetList,
  getSearchResults,
  getSearchSuggestions,
  clearSuggestions,
  totalQueueDuration,
  closeSubView,
  getCollection,
  addToCollection,
  removeFromCollection,
  getCollectionItems,
  createCollection,
  getCollectionsKeys,
  CACHED_COLLECTION,
  ytMusicHandler,
  YtMusicTrack,
  stripTopic,
  isTopicAuthor,
  generateImageUrl,
  sortCollection,
  normalizeText,
  convertSStoHHMMSS,
  formatTimeSeconds,
  type MainFeature,
} from "./main.ts";

export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

interface YtMusicContextType {
  onPlayTrack?: (track: Track, trackList?: Track[]) => void;
  onTogglePlay?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  currentTrack?: Track | null;
  isPlaying?: boolean;
  hostQueue?: Track[];
}

const YtMusicContext = createContext<YtMusicContextType>({});

// ==========================================
// COMPONENT: COLLECTION SELECTOR
// ==========================================
export function CollectionSelector(_: { close?: () => void; data: any[] }) {
  const config = useConfig();

  const handleCollectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (!value) return;

    if (value === "+cl") {
      const title = prompt("Collection Title?")?.trim();
      if (title && _.data) {
        createCollection(title);
        addToCollection(title, _.data);
      }
    } else if (_.data) {
      if (value.startsWith("-cl")) {
        removeFromCollection(value.slice(3), _.data.map((item) => item.id));
      } else {
        addToCollection(value, _.data);
      }
    }

    if (_.close) _.close();
    e.target.selectedIndex = 0;
  };

  const getKeys = (add: boolean) => {
    if (!_.data || _.data.length === 0) return [];
    const keys = config.cachingMode === "off" ? getCollectionsKeys() : [...getCollectionsKeys(), CACHED_COLLECTION];
    return keys.filter((k) => {
      const itemIsIncluded = getCollection(k).includes(_.data[0].id);
      return add ? !itemIsIncluded : itemIsIncluded;
    });
  };

  const addKeys = getKeys(true);
  const removeKeys = getKeys(false);

  return (
    <select
      className="bg-transparent border-none text-xs text-zinc-400 cursor-pointer focus:ring-0"
      onChange={handleCollectionChange}
      defaultValue=""
      aria-label="Add to Collection"
    >
      <option value="" disabled>Add to playlist...</option>
      <option value="+cl">+ Create New</option>
      {addKeys.map((v) => <option key={v} value={v}>{v}</option>)}
      {removeKeys.map((v) => <option key={v} value={"-cl" + v}>Remove from {v}</option>)}
    </select>
  );
}

// ==========================================
// COMPONENT: STREAM ITEM
// ==========================================
export function StreamItem(data: any) {
  const [image, setImage] = useState(data.img || data.thumbnail || "");
  const [imgError, setImgError] = useState(false);
  const { onPlayTrack } = useContext(YtMusicContext);

  useEffect(() => {
    if (data.img || data.thumbnail || data.id) {
      setImage(data.img || data.thumbnail || generateImageUrl(data.id) || "");
    }
  }, [data.id, data.img, data.thumbnail]);

  const title = data.title || "Unknown Track";
  const author = data.author || data.artist || "YouTube Music";
  const videoId = data.id || data.videoId || "";

  const handleItemClick = () => {
    setPlayerStore("stream", data);
    const audioTrack: Track = {
      id: videoId.replace(/^yt_/, ""),
      title,
      artist: author,
      album: data.album || "YouTube Music",
      duration: data.durationSeconds || (typeof data.duration === "number" ? data.duration : 210),
      durationText: typeof data.duration === "string" ? data.duration : formatTimeSeconds(data.duration || 210),
      artwork: image || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      source: "youtube",
      addedAt: Date.now(),
      streamUrl: `/api/audio/stream?id=${videoId.replace(/^yt_/, "")}`,
    };

    if (onPlayTrack) {
      onPlayTrack(audioTrack);
    }
    player(videoId);
  };

  return (
    <div
      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
      onClick={handleItemClick}
    >
      <div className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        {image && !imgError ? (
          <img src={image} alt={title} onError={() => setImgError(true)} className="w-full h-full object-cover" />
        ) : (
          <Music className="w-5 h-5 text-cyan-400" />
        )}
      </div>

      <div className="flex-grow min-w-0">
        <h4 className="text-sm font-medium text-white truncate group-hover:text-[#48e4ff] transition-colors">{title}</h4>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate mt-0.5">
          <span>{stripTopic(author)}</span>
          {data.duration && (
            <>
              <span>•</span>
              <span>{typeof data.duration === "number" ? formatTimeSeconds(data.duration) : data.duration}</span>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setStore("actionsMenu", data);
        }}
        className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition"
      >
        •••
      </button>
    </div>
  );
}

// ==========================================
// COMPONENT: MINI PLAYER
// ==========================================
export function MiniPlayer() {
  const pStore = usePlayerStore();
  const { currentTrack, isPlaying: hostIsPlaying, onTogglePlay, onNext } = useContext(YtMusicContext);

  const activeTitle = currentTrack?.title || pStore.stream?.title;
  const activeAuthor = currentTrack?.artist || pStore.stream?.author;
  const activeArtwork = currentTrack?.artwork || pStore.mediaArtwork;
  const isPlaying = hostIsPlaying !== undefined ? hostIsPlaying : pStore.playbackState === "playing";
  const progress = pStore.fullDuration > 0 ? (pStore.currentTime / pStore.fullDuration) * 100 : 0;

  if (!activeTitle) return null;

  return (
    <div
      className="h-16 flex flex-col z-40 cursor-pointer hover:bg-white/5 transition-colors border-t border-zinc-900/60"
      onClick={() => setNavStore("player", "state", true)}
    >
      <div className="h-0.5 bg-zinc-800 w-full overflow-hidden">
        <div className="h-full bg-[#48e4ff]" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center justify-between px-4 h-full">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
            {activeArtwork ? (
              <img src={activeArtwork} alt="" className="w-full h-full object-cover" />
            ) : (
              <Music size={16} className="text-cyan-400" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{activeTitle || "YouTube Music"}</h4>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest truncate">{activeAuthor || "YouTube Artist"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onTogglePlay) {
                onTogglePlay();
              } else {
                if (isPlaying) {
                  audioEngine.pause();
                  setPlayerStore("playbackState", "paused");
                } else {
                  audioEngine.play().catch(() => {});
                  setPlayerStore("playbackState", "playing");
                }
              }
            }}
            className="w-9 h-9 rounded-full bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 flex items-center justify-center transition"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onNext) {
                onNext();
              } else {
                playNext();
              }
            }}
            className="w-9 h-9 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT: NAVBAR
// ==========================================
export function NavBar() {
  const nav = useNavStore();

  const navItems: { feature: MainFeature; label: string; icon: React.ReactNode }[] = [
    { feature: "search", label: "Search", icon: <Search size={18} /> },
    { feature: "library", label: "Library", icon: <Library size={18} /> },
    { feature: "queue", label: "Queue", icon: <ListMusic size={18} /> },
    { feature: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  return (
    <nav className="h-14 flex items-center justify-around px-4 w-full border-t border-zinc-900 bg-zinc-950/90 backdrop-blur-md">
      {navItems.map((item) => (
        <button
          key={item.feature}
          onClick={() => setNavStore("active", item.feature)}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
            nav.active === item.feature ? "text-[#48e4ff]" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {item.icon}
          <span className="text-[10px] font-bold tracking-wider">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ==========================================
// FEATURE: SEARCH DECK
// ==========================================
export function SearchFeature() {
  const sStore = useSearchStore();

  useEffect(() => {
    if (sStore.results.length === 0 && !sStore.isLoading) {
      setSearchStore("isLoading", true);
      ytMusicHandler
        .getTrendingCharts()
        .then((items) => {
          const converted = items.map((item) => ({
            id: item.videoId,
            title: item.title,
            author: item.artist,
            authorId: "",
            duration: item.durationText,
            img: item.artwork,
            type: "song" as const,
          }));
          setSearchStore("results", converted);
        })
        .finally(() => {
          setSearchStore("isLoading", false);
        });
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="p-4 border-b border-zinc-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            getSearchResults();
          }}
          className="flex gap-2"
        >
          <input
            type="search"
            value={sStore.query}
            onChange={(e) => {
              setSearchStore("query", e.target.value);
              getSearchSuggestions(e.target.value);
            }}
            placeholder="Search songs, artists, mixes..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 px-5 text-sm text-white focus:outline-none focus:border-[#48e4ff]"
          />
          <button type="submit" className="px-5 py-2 bg-[#48e4ff] text-black rounded-full font-bold text-xs hover:bg-[#38bdf8] transition">
            Search
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {sStore.isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin text-[#48e4ff]" />
            <span className="text-xs mt-2 font-mono">Fetching streams...</span>
          </div>
        ) : (
          sStore.results.map((item, idx) => (
            <StreamItem key={item.id || idx} {...item} />
          ))
        )}
      </div>
    </div>
  );
}

// ==========================================
// FEATURE: LIBRARY DECK
// ==========================================
export function LibraryFeature() {
  const [selectedKey, setSelectedKey] = useState<string>("favorites");
  const keys = getCollectionsKeys();
  const items = getCollectionItems(selectedKey);

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-4 overflow-hidden">
      <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-zinc-900 shrink-0">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => setSelectedKey(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition ${
              selectedKey === k ? "bg-[#48e4ff] text-black" : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pt-4 space-y-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-center">
            <Library className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-sm font-medium text-zinc-400">No tracks saved in {selectedKey}</p>
            <p className="text-xs text-zinc-600 mt-1">Search songs and use the context menu to add to your collections.</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <StreamItem key={item.id || idx} {...item} />
          ))
        )}
      </div>
    </div>
  );
}

// ==========================================
// FEATURE: QUEUE DECK
// ==========================================
export function QueueFeature() {
  const qStore = useQueueStore();
  const { hostQueue } = useContext(YtMusicContext);
  const items = hostQueue && hostQueue.length > 0 ? hostQueue : qStore.list;

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-4 overflow-hidden">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white">Up Next</h3>
          <span className="text-xs text-zinc-500 font-mono">({items.length} tracks)</span>
        </div>
        <button
          onClick={() => {
            setQueueStore("list", []);
          }}
          className="text-xs text-zinc-400 hover:text-rose-400 transition"
        >
          Clear Queue
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-4 space-y-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-center">
            <ListMusic className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-sm font-medium text-zinc-400">Queue is empty</p>
            <p className="text-xs text-zinc-600 mt-1">Play any song to begin a playback queue.</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <StreamItem key={item.id || idx} {...item} />
          ))
        )}
      </div>
    </div>
  );
}

// ==========================================
// FEATURE: SETTINGS DECK
// ==========================================
export function SettingsFeature() {
  const config = useConfig();

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-6 overflow-y-auto space-y-6">
      <div>
        <h3 className="text-base font-bold text-white">YouTube Music Preferences</h3>
        <p className="text-xs text-zinc-400 mt-0.5">Configure streaming, audio quality, and offline caching modes.</p>
      </div>

      <div className="space-y-4 max-w-lg">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Streaming Quality</div>
            <div className="text-xs text-zinc-500">Audio bitrate selection for Opus and AAC streams</div>
          </div>
          <select
            value={config.quality}
            onChange={(e) => setConfig("quality", e.target.value as any)}
            className="bg-zinc-800 border border-zinc-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="high">High (256 kbps)</option>
            <option value="medium">Medium (128 kbps)</option>
            <option value="low">Low (64 kbps)</option>
          </select>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Caching Mode</div>
            <div className="text-xs text-zinc-500">Local indexed audio buffer strategy</div>
          </div>
          <select
            value={config.cachingMode}
            onChange={(e) => setCachingMode(e.target.value as any)}
            className="bg-zinc-800 border border-zinc-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="auto">Automatic</option>
            <option value="on-demand">On Demand</option>
            <option value="off">Disabled</option>
          </select>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">SponsorBlock Filter</div>
            <div className="text-xs text-zinc-500">Skip music video intro skits and outro silences</div>
          </div>
          <input
            type="checkbox"
            checked={config.sponsorblock}
            onChange={(e) => setConfig("sponsorblock", e.target.checked)}
            className="w-4 h-4 accent-[#48e4ff]"
          />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT: MAIN DESKTOP & MOBILE DECK VIEW
// ==========================================
export interface YtMusicMainProps {
  currentTrack?: Track | null;
  isPlaying?: boolean;
  onPlayTrack?: (track: Track, trackList?: Track[]) => void;
  onTogglePlay?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  queue?: Track[];
  onAddToQueue?: (track: Track) => void;
  onRemoveFromQueue?: (idOrIndex: string | number) => void;
  onClearQueue?: () => void;
  onOpenDsp?: () => void;
}

export const YtMusicMain: React.FC<YtMusicMainProps> = ({
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onNext,
  onPrev,
  queue,
  onOpenDsp,
}) => {
  const nav = useNavStore();

  return (
    <YtMusicContext.Provider
      value={{
        onPlayTrack,
        onTogglePlay,
        onNext,
        onPrev,
        currentTrack,
        isPlaying,
        hostQueue: queue,
      }}
    >
      <div className="relative h-[calc(100vh-64px)] bg-black overflow-hidden font-sans text-zinc-100 flex flex-col">
        <div className="h-11 px-4 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">YouTube Music Subpage</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800 text-cyan-300">
              Direct Native Stream
            </span>
          </div>
          {onOpenDsp && (
            <button
              type="button"
              onClick={onOpenDsp}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800 text-cyan-300 text-[11px] font-mono font-bold"
            >
              <SlidersHorizontal size={13} />
              <span>DSP Deck</span>
            </button>
          )}
        </div>

        <main className="flex flex-1 w-full overflow-hidden">
          <div className="w-full flex-grow bg-zinc-950 overflow-hidden flex flex-col">
            <div className="flex-grow overflow-hidden">
              {nav.active === "search" && <SearchFeature />}
              {nav.active === "library" && <LibraryFeature />}
              {nav.active === "queue" && <QueueFeature />}
              {nav.active === "settings" && <SettingsFeature />}
            </div>

            <div className="flex-shrink-0 border-t border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
              <MiniPlayer />
              <NavBar />
            </div>
          </div>
        </main>
      </div>
    </YtMusicContext.Provider>
  );
};

export default YtMusicMain;