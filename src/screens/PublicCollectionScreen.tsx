import { useParams } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ItemCard } from '@/components/ItemCard';
import { ItemSkeleton } from '@/components/ItemSkeleton';
import { Wordmark } from '@/components/Wordmark';
import { usePublicCollection } from '@/hooks/usePublicCollection';
import { NotFoundError, toCardItem } from '@/lib/publicCollection';
import { vi } from '@/i18n/vi';

/** Read-only view of a shared collection; works without signing in. */
export function PublicCollectionScreen() {
  const { slug = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = usePublicCollection(slug);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-12 lg:max-w-5xl lg:px-10">
      <header className="pb-4" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
        <a href="/" className="inline-block min-h-[44px] py-2">
          <Wordmark />
        </a>
        {data && (
          <>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink lg:text-3xl">
              {data.name}
            </h1>
            <p className="mt-1 text-sm text-stone-500">{vi.publicCollection.by}</p>
          </>
        )}
      </header>

      {isLoading ? (
        <ItemSkeleton />
      ) : isError && error instanceof NotFoundError ? (
        <EmptyState
          title={vi.publicCollection.notFoundTitle}
          message={vi.publicCollection.notFound}
          illustration="searchEmpty"
        />
      ) : isError ? (
        <ErrorState message={vi.publicCollection.loadError} onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState message={vi.publicCollection.empty} illustration="inboxEmpty" />
      ) : (
        <ul className="grid auto-rows-fr gap-2 xl:grid-cols-2">
          {data.items.map((p) => (
            <li key={p.id}>
              <ItemCard item={toCardItem(p)} imageUrl={p.image_url ?? undefined} />
            </li>
          ))}
        </ul>
      )}

      <a
        href="/"
        className="mt-8 flex min-h-[44px] items-center justify-center rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-stone-800"
      >
        {vi.publicCollection.cta}
      </a>
    </main>
  );
}
