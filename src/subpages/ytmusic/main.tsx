import React, { useState, useEffect, useRef } from "react";
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
} from "./main";

export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

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

  useEffect(() => {
    if (data.img || data.thumbnail || data.id) {
      setImage(data.img || data.thumbnail || generateImageUrl(data.id) || "");
    }
  }, [data.id, data.img, data.thumbnail]);

  const title = data.title || "Unknown Track";
  const author = data.author || data.artist || "YouTube Music";

  return (
    <div
      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
      onClick={() => {
        setPlayerStore("stream", data);
        player(data.id || data.videoId);
      }}
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
  const playerStore = usePlayerStore();
  const progress = playerStore.fullDuration > 0 ? (playerStore.currentTime / playerStore.fullDuration) * 100 : 0;
  const isPlaying = playerStore.playbackState === "playing";

  if (!playerStore.stream?.id) return null;

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
            {playerStore.mediaArtwork ? (
              <img src={playerStore.mediaArtwork} alt="" className="w-full h-full object-cover" />
            ) : (
              <Music size={16} className="text-cyan-400" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{playerStore.stream?.title || "Unknown"}</h4>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest truncate">{playerStore.stream?.author || "YouTube Music"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isPlaying) {
                audioEngine.pause();
                setPlayerStore("playbackState", "paused");
              } else {
                audioEngine.play().catch(() => {});
                setPlayerStore("playbackState", "playing");
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
              playNext();
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
  const navStore = useNavStore();

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
            navStore.active === item.feature ? "text-[#48e4ff]" : "text-zinc-500 hover:text-zinc-300"
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
  const searchStore = useSearchStore();

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
            value={searchStore.query}
            onChange={(e) => {
              setSearchStore("query", e.target.value);
              getSearchSuggestions(e.target.value);
            }}
            placeholder="Search songs, artists, mixes..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 px-5 text-sm text-white focus:outline-none focus:border-[#48e4ff]"
          />
          <button type="submit" className="px-5 py-2 bg-[#48e4ff] text-black rounded-full font-bold text-xs">
            Search
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {searchStore.isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin text-[#48e4ff]" />
            <span className="text-xs mt-2 font-mono">Fetching streams...</span>
          </div>
        ) : (
          searchStore.results.map((item, idx) => (
            <StreamItem key={item.id || idx} {...item} />
          ))
        )}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT: MAIN DESKTOP & MOBILE DECK VIEW
// ==========================================
export const YtMusicMain: React.FC<any> = ({ onOpenDsp }) => {
  const navStore = useNavStore();

  return (
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
            <SearchFeature />
          </div>

          <div className="flex-shrink-0 border-t border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
            <MiniPlayer />
            <NavBar />
          </div>
        </div>
      </main>
    </div>
  );
};

export default YtMusicMain;