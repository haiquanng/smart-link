import { Navigate, Route, Routes, useLocation } from 'react-router';
import { BottomTabs } from '@/components/BottomTabs';
import { SideNav } from '@/components/SideNav';
import { Spinner } from '@/components/Spinner';
import { SignInScreen } from '@/screens/SignInScreen';
import { InboxScreen } from '@/screens/InboxScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { CollectionsScreen } from '@/screens/CollectionsScreen';
import { CollectionScreen } from '@/screens/CollectionScreen';
import { PublicCollectionScreen } from '@/screens/PublicCollectionScreen';
import { ResurfaceScreen } from '@/screens/ResurfaceScreen';
import { useSession } from '@/hooks/useSession';

export default function App() {
  const { session, loading } = useSession();
  const { pathname } = useLocation();

  // Shared collections are public: no session, no app chrome.
  if (pathname.startsWith('/c/')) {
    return (
      <Routes>
        <Route path="/c/:slug" element={<PublicCollectionScreen />} />
      </Routes>
    );
  }

  if (loading) {
    return (
      <main className="min-h-dvh">
        <Spinner />
      </main>
    );
  }

  // Sign-in renders in place without changing the URL, so the user lands back
  // on the page they opened once signed in.
  if (!session) {
    return <SignInScreen />;
  }

  return (
    <div className="lg:flex">
      <SideNav email={session.user.email} />
      <main className="mx-auto min-h-dvh w-full max-w-2xl pb-24 lg:max-w-5xl lg:px-10 lg:pb-12">
        <Routes>
          <Route path="/inbox" element={<InboxScreen />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/collections" element={<CollectionsScreen />} />
          <Route path="/collections/:id" element={<CollectionScreen />} />
          <Route path="/resurface" element={<ResurfaceScreen />} />
          <Route
            path="/settings"
            element={<SettingsScreen email={session.user.email} />}
          />
          <Route path="*" element={<Navigate to="/inbox" replace />} />
        </Routes>
      </main>
      <BottomTabs />
    </div>
  );
}
