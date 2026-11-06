export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isLoading?: boolean;
  engine: 'vercel-edge' | 'ultraviolet' | 'webroot' | 'insidious' | 'mrbean' | 'direct';
  zoom: number; // 0.75, 1, 1.25, etc.
  isPinned: boolean;
  isMuted: boolean;
  history: string[];
  historyIndex: number;
  readerMode: boolean;
  adblockEnabled: boolean;
  rewriteLinks: boolean;
  scrambleUrl?: boolean;
  userAgent: string;
}

export type OsAppType =
  | 'browser'
  | 'terminal'
  | 'notes'
  | 'bookmarks'
  | 'history'
  | 'inspector'
  | 'cloaking'
  | 'radar';

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  category: 'media' | 'games' | 'tools' | 'social' | 'custom';
  description?: string;
  iconName?: string;
  color?: string;
  badge?: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  url: string;
  timestamp: number;
  favicon?: string;
}

export interface ConsoleLogItem {
  id: string;
  timestamp: number;
  type: 'log' | 'info' | 'warn' | 'error' | 'network';
  content: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface ProxyNodeInfo {
  id: string;
  name: string;
  location: string;
  flag: string;
  latency: number;
  status: 'optimal' | 'stable' | 'slow';
  encryption: string;
  stealthGrade?: string;
  dpiBypass?: string;
  description?: string;
  features?: string[];
}
