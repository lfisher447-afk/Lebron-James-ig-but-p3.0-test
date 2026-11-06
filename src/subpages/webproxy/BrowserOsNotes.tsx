import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Link,
  Save,
  Clock,
  BookOpen,
} from 'lucide-react';
import { NoteItem } from './BrowserOsTypes';

interface BrowserOsNotesProps {
  activeBrowserUrl?: string;
  activeBrowserTitle?: string;
}

export const BrowserOsNotes: React.FC<BrowserOsNotesProps> = ({
  activeBrowserUrl,
  activeBrowserTitle,
}) => {
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('spotui_browser_os_notes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'welcome-note',
        title: 'BrowserOS Quick Scratchpad',
        content: `# Welcome to Spotui BrowserOS Notes\n\nThis scratchpad is persistent across your sessions. Take notes while researching, copy links, and export anytime.\n\n### Hot Features:\n- Auto-saves continuously to your local vault\n- One-click link insertion from your active browsing tab\n- Export as markdown file (.md)`,
        updatedAt: Date.now(),
      },
    ];
  });

  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('spotui_browser_os_notes', JSON.stringify(notes));
    } catch {}
  }, [notes]);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  const handleCreateNote = () => {
    const newNote: NoteItem = {
      id: 'note-' + Date.now(),
      title: 'Untitled Note',
      content: '',
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notes.length <= 1) {
      alert('Cannot delete the last remaining note.');
      return;
    }
    const filtered = notes.filter((n) => n.id !== id);
    setNotes(filtered);
    if (activeNoteId === id) {
      setActiveNoteId(filtered[0].id);
    }
  };

  const updateTitle = (newTitle: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId ? { ...n, title: newTitle, updatedAt: Date.now() } : n
      )
    );
  };

  const updateContent = (newContent: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId ? { ...n, content: newContent, updatedAt: Date.now() } : n
      )
    );
  };

  const insertCurrentTabLink = () => {
    if (!activeBrowserUrl) return;
    const linkMarkdown = `\n- [${activeBrowserTitle || 'Web Link'}](${activeBrowserUrl})\n`;
    updateContent((activeNote?.content || '') + linkMarkdown);
  };

  const copyNoteContent = () => {
    if (!activeNote) return;
    navigator.clipboard.writeText(activeNote.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadMarkdown = () => {
    if (!activeNote) return;
    const blob = new Blob([activeNote.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = activeNote?.content.trim()
    ? activeNote.content.trim().split(/\s+/).length
    : 0;

  return (
    <div className="flex-1 flex bg-[#040d10] text-zinc-200 overflow-hidden">
      {/* Sidebar: Notes List */}
      <div className="w-64 bg-[#03090b] border-r border-[#122e36] flex flex-col">
        <div className="p-3 border-b border-[#122e36] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <FileText size={14} className="text-[#48e4ff]" />
            <span>Vault Notes</span>
          </div>
          <button
            onClick={handleCreateNote}
            className="p-1 rounded-lg bg-[#143e47] hover:bg-[#1e5966] text-[#48e4ff] transition flex items-center gap-1 text-[11px] font-bold px-2"
            title="Create New Note"
          >
            <Plus size={13} />
            <span>New</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes.map((note) => {
            const isSelected = note.id === activeNoteId;
            return (
              <div
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`p-2.5 rounded-xl cursor-pointer transition text-xs group flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#0f2d35] text-white font-bold border border-[#1d4f5b]'
                    : 'text-zinc-400 hover:bg-[#07191e] hover:text-zinc-200'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="truncate text-xs">{note.title || 'Untitled Note'}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteNote(note.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 transition"
                  title="Delete Note"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Note Editor Area */}
      {activeNote ? (
        <div className="flex-1 flex flex-col bg-[#051114]">
          {/* Editor Header Bar */}
          <div className="px-5 py-3 border-b border-[#122e36] flex items-center justify-between gap-4">
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="Note Title..."
              className="bg-transparent text-base font-bold text-white focus:outline-none flex-1 border-b border-transparent focus:border-[#48e4ff] pb-0.5 transition"
            />

            <div className="flex items-center gap-2">
              {activeBrowserUrl && (
                <button
                  onClick={insertCurrentTabLink}
                  className="px-2.5 py-1 rounded-lg bg-[#0c242b] hover:bg-[#123640] border border-[#16414c] text-xs font-mono text-[#48e4ff] flex items-center gap-1.5 transition"
                  title="Insert Active Tab Link"
                >
                  <Link size={12} />
                  <span>Insert Current Tab</span>
                </button>
              )}

              <button
                onClick={copyNoteContent}
                className="p-1.5 rounded-lg bg-[#0c242b] hover:bg-[#123640] border border-[#16414c] text-zinc-300 hover:text-white transition"
                title="Copy Note Text"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>

              <button
                onClick={downloadMarkdown}
                className="p-1.5 rounded-lg bg-[#0c242b] hover:bg-[#123640] border border-[#16414c] text-zinc-300 hover:text-white transition"
                title="Download as Markdown (.md)"
              >
                <Download size={13} />
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="flex-1 p-5 flex flex-col">
            <textarea
              value={activeNote.content}
              onChange={(e) => updateContent(e.target.value)}
              placeholder="Write Markdown notes, research findings, cheat-sheets, or URLs here..."
              className="w-full flex-1 bg-transparent text-zinc-200 text-sm leading-relaxed focus:outline-none resize-none font-mono"
            />
          </div>

          {/* Editor Footer Info */}
          <div className="px-5 py-2 border-t border-[#122e36] bg-[#03090b] flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <div className="flex items-center gap-3">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{activeNote.content.length} characters</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <Check size={11} />
              <span>Synced with local vault</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
          Select or create a note to get started.
        </div>
      )}
    </div>
  );
};
