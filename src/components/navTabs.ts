import {
  BookMarked,
  Inbox,
  RotateCcw,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { vi } from '@/i18n/vi';

export type TabId =
  | 'inbox'
  | 'search'
  | 'collections'
  | 'resurface'
  | 'settings';

export const TABS: {
  id: TabId;
  path: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: 'inbox', path: '/inbox', label: vi.tabs.inbox, icon: Inbox },
  { id: 'search', path: '/search', label: vi.tabs.search, icon: Search },
  { id: 'collections', path: '/collections', label: vi.tabs.collections, icon: BookMarked },
  { id: 'resurface', path: '/resurface', label: vi.tabs.resurface, icon: RotateCcw },
  { id: 'settings', path: '/settings', label: vi.tabs.settings, icon: Settings },
];
