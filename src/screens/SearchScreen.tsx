import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ItemCard } from '@/components/ItemCard';
import { useDebounced } from '@/hooks/useDebounced';
import { useSearchItems } from '@/hooks/useSearchItems';
import { vi } from '@/i18n/vi';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 300);
  const { data, isLoading, isError, isFetching, refetch } =
    useSearchItems(debounced);
  const hasQuery = debounced.trim().length > 0;

  return (
    <section>
      <ScreenHeader title={vi.search.title}>
        <input
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={vi.search.placeholder}
          aria-label={vi.search.title}
          className="mt-3 min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-800 px-4 text-slate-100 outline-none focus:border-sky-500"
        />
      </ScreenHeader>

      {!hasQuery ? (
        <EmptyState message={vi.search.hint} />
      ) : isLoading || isFetching ? (
        <Spinner />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState message={vi.search.empty} />
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
