import { useState } from 'react';
import { BottomTabs } from '@/components/BottomTabs';
import { SideNav } from '@/components/SideNav';
import type { TabId } from '@/components/navTabs';
import { Spinner } from '@/components/Spinner';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { SignInScreen } from '@/screens/SignInScreen';
import { InboxScreen } from '@/screens/InboxScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { useSession } from '@/hooks/useSession';
import { vi } from '@/i18n/vi';

export default function App() {
  const { session, loading } = useSession();
  const [tab, setTab] = useState<TabId>('inbox');

  if (loading) {
    return (
      <main className="min-h-dvh">
        <Spinner />
      </main>
    );
  }

  if (!session) {
    return <SignInScreen />;
  }

  return (
    <div className="lg:flex">
      <SideNav active={tab} onChange={setTab} email={session.user.email} />
      <main className="mx-auto min-h-dvh w-full max-w-2xl pb-24 lg:max-w-5xl lg:px-10 lg:pb-12">
        {tab === 'inbox' && <InboxScreen />}
        {tab === 'search' && <SearchScreen />}
        {tab === 'collections' && (
          <PlaceholderScreen
            title={vi.tabs.collections}
            message={vi.placeholder.collections}
          />
        )}
        {tab === 'resurface' && (
          <PlaceholderScreen
            title={vi.tabs.resurface}
            message={vi.placeholder.resurface}
          />
        )}
        {tab === 'settings' && <SettingsScreen email={session.user.email} />}
      </main>
      <BottomTabs active={tab} onChange={setTab} />
    </div>
  );
}
