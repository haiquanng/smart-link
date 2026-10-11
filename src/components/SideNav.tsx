import { NavLink } from 'react-router';
import { Wordmark } from '@/components/Wordmark';
import { TABS } from '@/components/navTabs';

/** Desktop navigation: a sticky sidebar instead of the phone tab bar. */
export function SideNav({ email }: { email: string | undefined }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-6 lg:flex">
      <div className="px-3">
        <Wordmark />
      </div>

      <nav className="mt-8 flex flex-col gap-0.5">
        {TABS.map(({ id, path, label, icon: TabIcon }) => (
          <NavLink
            key={id}
            to={path}
            className={({ isActive }) =>
              `flex min-h-[40px] items-center gap-3 rounded-md px-3 text-sm ${
                isActive
                  ? 'bg-stone-100 font-semibold text-ink'
                  : 'text-stone-500 hover:bg-stone-50 hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <TabIcon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {email && (
        <p className="mt-auto truncate px-3 text-xs text-stone-400">{email}</p>
      )}
    </aside>
  );
}
