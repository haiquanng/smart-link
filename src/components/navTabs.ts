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

export const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'inbox', label: vi.tabs.inbox, icon: Inbox },
  { id: 'search', label: vi.tabs.search, icon: Search },
  { id: 'collections', label: vi.tabs.collections, icon: BookMarked },
  { id: 'resurface', label: vi.tabs.resurface, icon: RotateCcw },
  { id: 'settings', label: vi.tabs.settings, icon: Settings },
];
