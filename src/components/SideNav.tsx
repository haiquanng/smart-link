import { Wordmark } from '@/components/Wordmark';
import { TABS, type TabId } from '@/components/navTabs';

interface SideNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  email: string | undefined;
}

/** Desktop navigation: a sticky sidebar instead of the phone tab bar. */
export function SideNav({ active, onChange, email }: SideNavProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-6 lg:flex">
      <div className="px-3">
        <Wordmark />
      </div>

      <nav className="mt-8 flex flex-col gap-0.5">
        {TABS.map(({ id, label, icon: TabIcon }) => {
          const selected = id === active;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={selected ? 'page' : undefined}
              className={`flex min-h-[40px] items-center gap-3 rounded-md px-3 text-sm ${
                selected
                  ? 'bg-stone-100 font-semibold text-ink'
                  : 'text-stone-500 hover:bg-stone-50 hover:text-ink'
              }`}
            >
              <TabIcon size={18} strokeWidth={selected ? 2.2 : 1.8} />
              {label}
            </button>
          );
        })}
      </nav>

      {email && (
        <p className="mt-auto truncate px-3 text-xs text-stone-400">{email}</p>
      )}
    </aside>
  );
}
