import { ScreenHeader } from '@/components/ScreenHeader';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ItemCard } from '@/components/ItemCard';
import { useItems } from '@/hooks/useItems';
import { vi } from '@/i18n/vi';

export function InboxScreen() {
  const { data, isLoading, isError, refetch } = useItems();

  return (
    <section>
      <ScreenHeader title={vi.inbox.title} />
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState message={vi.inbox.emptyError} onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState message={vi.inbox.empty} />
      ) : (
        <ul>
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
