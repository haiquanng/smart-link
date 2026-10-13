import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ItemSkeleton } from '@/components/ItemSkeleton';
import { CollectionCard } from '@/components/CollectionCard';
import { CollectionNameForm } from '@/components/CollectionNameForm';
import { useCollections } from '@/hooks/useCollections';
import { useCollectionActions } from '@/hooks/useCollectionActions';
import { vi } from '@/i18n/vi';

export function CollectionsScreen() {
  const { data, isLoading, isError, refetch } = useCollections();
  const { create } = useCollectionActions();

  return (
    <section>
      <ScreenHeader
        title={vi.collections.title}
        subtitle={data?.length ? vi.collections.count(data.length) : undefined}
      />

      <div className="flex flex-col gap-6 px-4 pt-1 lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-8 lg:px-0">
        <div className="lg:sticky lg:top-6">
          <CollectionNameForm
            submitLabel={vi.collections.create}
            busy={create.isPending}
            onSubmit={(name) => create.mutate(name)}
            resetOnSubmit
          />
          {create.isError && (
            <p className="mt-1.5 text-xs text-red-600">{vi.collections.createError}</p>
          )}
        </div>

        <div>
          {isLoading ? (
            <ItemSkeleton />
          ) : isError ? (
            <ErrorState message={vi.collections.loadError} onRetry={() => refetch()} />
          ) : !data || data.length === 0 ? (
            <EmptyState
              title={vi.collections.emptyTitle}
              message={vi.collections.empty}
              illustration="inboxEmpty"
            />
          ) : (
            <ul className="grid gap-2 xl:grid-cols-2">
              {data.map((c) => (
                <li key={c.id}>
                  <CollectionCard collection={c} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
