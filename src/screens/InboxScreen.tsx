import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ItemList } from '@/components/ItemList';
import { ItemSkeleton } from '@/components/ItemSkeleton';
import { AddLinkForm } from '@/components/AddLinkForm';
import { useItems } from '@/hooks/useItems';
import { vi } from '@/i18n/vi';

export function InboxScreen() {
  const { data, isLoading, isError, refetch } = useItems();

  return (
    <section>
      <ScreenHeader
        title={vi.inbox.title}
        subtitle={data?.length ? vi.inbox.count(data.length) : undefined}
      />

      {/* Desktop: the capture form stays pinned on the left while the list scrolls. */}
      <div className="flex flex-col gap-6 px-4 pt-1 lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-8 lg:px-0">
        <div className="lg:sticky lg:top-6">
          <AddLinkForm />
        </div>

        <div>
          {isLoading ? (
            <ItemSkeleton />
          ) : isError ? (
            <ErrorState message={vi.inbox.emptyError} onRetry={() => refetch()} />
          ) : !data || data.length === 0 ? (
            <EmptyState
              title={vi.inbox.emptyTitle}
              message={vi.inbox.empty}
              illustration="inboxEmpty"
            />
          ) : (
            <ItemList items={data} />
          )}
        </div>
      </div>
    </section>
  );
}
