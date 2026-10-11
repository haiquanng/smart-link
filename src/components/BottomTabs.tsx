import { TABS, type TabId } from '@/components/navTabs';

interface BottomTabsProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function BottomTabs({ active, onChange }: BottomTabsProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-2xl">
        {TABS.map(({ id, label, icon: TabIcon }) => {
          const selected = id === active;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={selected ? 'page' : undefined}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                selected ? 'text-ink' : 'text-stone-400'
              }`}
            >
              <TabIcon size={22} strokeWidth={selected ? 2.2 : 1.8} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
