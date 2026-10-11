import { vi } from '@/i18n/vi';

export type TabId =
  | 'inbox'
  | 'search'
  | 'collections'
  | 'resurface'
  | 'settings';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'inbox', label: vi.tabs.inbox, icon: '🗂️' },
  { id: 'search', label: vi.tabs.search, icon: '🔍' },
  { id: 'collections', label: vi.tabs.collections, icon: '📚' },
  { id: 'resurface', label: vi.tabs.resurface, icon: '✨' },
  { id: 'settings', label: vi.tabs.settings, icon: '⚙️' },
];

interface BottomTabsProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function BottomTabs({ active, onChange }: BottomTabsProps) {
  return (
    <nav
      className="sticky bottom-0 z-10 flex border-t border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            aria-current={selected ? 'page' : undefined}
            className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              selected ? 'text-brand-600' : 'text-slate-400'
            }`}
          >
            <span
              className={`text-lg leading-none transition-transform ${
                selected ? 'scale-110' : ''
              }`}
            >
              {tab.icon}
            </span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
