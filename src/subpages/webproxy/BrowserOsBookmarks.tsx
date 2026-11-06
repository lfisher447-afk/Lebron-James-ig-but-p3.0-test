import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Music,
  Wrench,
  MessageSquare,
  Bookmark,
  Plus,
  Search,
  ExternalLink,
  Columns,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { BookmarkItem } from './BrowserOsTypes';
import { DEFAULT_BOOKMARKS } from './BrowserOsPresets';

interface BrowserOsBookmarksProps {
  onOpenUrl: (url: string, newTab?: boolean, splitScreen?: boolean) => void;
}

export const BrowserOsBookmarks: React.FC<BrowserOsBookmarksProps> = ({ onOpenUrl }) => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try {
      const saved = localStorage.getItem('spotui_browser_os_bookmarks');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_BOOKMARKS;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCat, setNewCat] = useState<BookmarkItem['category']>('tools');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('spotui_browser_os_bookmarks', JSON.stringify(bookmarks));
    } catch {}
  }, [bookmarks]);

  const categories = [
    { id: 'all', label: 'All Apps', icon: Sparkles },
    { id: 'media', label: 'Media & Streaming', icon: Music },
    { id: 'games', label: 'Unblocked Games', icon: Gamepad2 },
    { id: 'tools', label: 'Tools & Utilities', icon: Wrench },
    { id: 'social', label: 'Communities', icon: MessageSquare },
    { id: 'custom', label: 'My Bookmarks', icon: Bookmark },
  ];

  const filtered = bookmarks.filter((bm) => {
    const matchesCat = selectedCategory === 'all' || bm.category === selectedCategory;
    const matchesQuery =
      bm.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bm.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bm.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    let cleanUrl = newUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const newItem: BookmarkItem = {
      id: 'custom-' + Date.now(),
      title: newTitle.trim(),
      url: cleanUrl,
      category: newCat,
      description: newDesc.trim() || 'Custom user bookmark',
      color: '#48e4ff',
      badge: 'Custom',
    };

    setBookmarks([newItem, ...bookmarks]);
    setShowAddModal(false);
    setNewTitle('');
    setNewUrl('');
    setNewDesc('');
  };

  const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarks(bookmarks.filter((b) => b.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col bg-[#040d10] text-zinc-200 overflow-y-auto p-6 select-none">
      {/* Header & Category Filter */}
      <div className="max-w-6xl mx-auto w-full space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Gamepad2 className="text-[#48e4ff]" size={22} />
              <span>BrowserOS App Directory & Unblocked Hub</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Curated web games, media services, tools, and custom bookmarked destinations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-zinc-500" size={13} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search web apps & games..."
                className="bg-[#07191e] border border-[#143e47] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#48e4ff] w-48 sm:w-64 transition"
              />
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#143e47] hover:bg-[#1e5764] text-[#48e4ff] font-bold text-xs flex items-center gap-1.5 transition border border-[#48e4ff]/30 shadow-sm shrink-0"
            >
              <Plus size={13} />
              <span>Add Custom Bookmark</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#122e36]">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#143e47] text-white font-bold border border-[#48e4ff]/50 shadow-sm'
                    : 'bg-[#06161a] text-zinc-400 hover:text-white hover:bg-[#0c242b] border border-[#103038]'
                }`}
              >
                <Icon size={13} className={isSelected ? 'text-[#48e4ff]' : 'text-zinc-400'} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bookmarks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-2">
          {filtered.map((bm) => (
            <div
              key={bm.id}
              className="bg-[#06161b] hover:bg-[#091f26] border border-[#11323b] hover:border-[#1d5260] rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between group shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-bold text-sm text-white group-hover:text-[#48e4ff] transition truncate">
                    {bm.title}
                  </div>
                  {bm.badge && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0c262e] border border-[#17424d] text-[#48e4ff] font-bold shrink-0">
                      {bm.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                  {bm.description || bm.url}
                </p>
              </div>

              <div className="pt-2 border-t border-[#0e272e] flex items-center justify-between text-xs">
                <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[120px]">
                  {new URL(bm.url).hostname}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenUrl(bm.url, false, true)}
                    className="p-1.5 rounded-lg bg-[#092228] hover:bg-[#123a44] text-zinc-300 hover:text-[#48e4ff] transition"
                    title="Open in Split Screen"
                  >
                    <Columns size={12} />
                  </button>

                  <button
                    onClick={() => onOpenUrl(bm.url, true)}
                    className="p-1.5 rounded-lg bg-[#092228] hover:bg-[#123a44] text-zinc-300 hover:text-[#48e4ff] transition"
                    title="Open in New Tab"
                  >
                    <Plus size={12} />
                  </button>

                  <button
                    onClick={() => onOpenUrl(bm.url, false)}
                    className="px-2.5 py-1 rounded-lg bg-[#143e47] hover:bg-[#1d5764] text-[#48e4ff] font-bold text-xs flex items-center gap-1 transition"
                  >
                    <span>Launch</span>
                    <ExternalLink size={11} />
                  </button>

                  {bm.id.startsWith('custom-') && (
                    <button
                      onClick={(e) => handleDeleteBookmark(bm.id, e)}
                      className="p-1.5 rounded-lg hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 transition"
                      title="Delete Bookmark"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-zinc-500 text-xs">
            No bookmarks found matching your query.
          </div>
        )}
      </div>

      {/* Add Custom Bookmark Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#07191e] border border-[#164550] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bookmark className="text-[#48e4ff]" size={16} />
              <span>Add Custom Bookmark</span>
            </h2>

            <form onSubmit={handleAddBookmark} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. My School Portal, Reddit, etc."
                  required
                  className="w-full bg-[#030d10] border border-[#133a43] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#48e4ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Target URL</label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="w-full bg-[#030d10] border border-[#133a43] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#48e4ff] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Category</label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value as any)}
                  className="w-full bg-[#030d10] border border-[#133a43] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#48e4ff]"
                >
                  <option value="tools">Tools & Utilities</option>
                  <option value="games">Unblocked Games</option>
                  <option value="media">Media & Music</option>
                  <option value="social">Social & Communities</option>
                  <option value="custom">Custom Bookmark</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Quick note about this link..."
                  className="w-full bg-[#030d10] border border-[#133a43] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#48e4ff]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-[#0c242b] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#143e47] hover:bg-[#1d5764] text-[#48e4ff] font-bold text-xs transition border border-[#48e4ff]/40"
                >
                  Save Bookmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
