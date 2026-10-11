import { NavLink } from 'react-router';
import { TABS } from '@/components/navTabs';

export function BottomTabs() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-2xl">
        {TABS.map(({ id, path, label, icon: TabIcon }) => (
          <NavLink
            key={id}
            to={path}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                isActive ? 'text-ink' : 'text-stone-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <TabIcon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
