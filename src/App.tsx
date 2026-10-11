import { useState } from 'react';
import { BottomTabs, type TabId } from '@/components/BottomTabs';
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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="flex-1">
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
        {tab === 'settings' && (
          <SettingsScreen email={session.user.email} />
        )}
      </main>
      <BottomTabs active={tab} onChange={setTab} />
    </div>
  );
}
