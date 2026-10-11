import { ScreenHeader } from '@/components/ScreenHeader';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ItemCard } from '@/components/ItemCard';
import { AddLinkForm } from '@/components/AddLinkForm';
import { useItems } from '@/hooks/useItems';
import { vi } from '@/i18n/vi';

export function InboxScreen() {
  const { data, isLoading, isError, refetch } = useItems();

  return (
    <section>
      <ScreenHeader title={vi.inbox.title} />

      <div className="px-4 pt-4">
        <AddLinkForm />
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState message={vi.inbox.emptyError} onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState message={vi.inbox.empty} icon="🔗" />
      ) : (
        <ul className="flex flex-col gap-3 p-4">
          {data.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
