import { useSearchParams } from 'react-router';
import { Search } from 'lucide-react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ItemList } from '@/components/ItemList';
import { ItemSkeleton } from '@/components/ItemSkeleton';
import { SearchFilterBar } from '@/components/SearchFilterBar';
import { useDebounced } from '@/hooks/useDebounced';
import { useSearchItems } from '@/hooks/useSearchItems';
import { useTopTags } from '@/hooks/useTopTags';
import {
  parseSearchParams,
  serializeSearchParams,
  type SearchFilters,
} from '@/lib/searchParams';
import { vi } from '@/i18n/vi';

export function SearchScreen() {
  // Query and filters live in the URL so a refresh or shared link keeps them.
  const [params, setParams] = useSearchParams();
  const { query, filters } = parseSearchParams(params);
  const setQuery = (q: string) =>
    setParams(serializeSearchParams(q, filters), { replace: true });
  const setFilters = (f: SearchFilters) =>
    setParams(serializeSearchParams(query, f), { replace: true });
  const debounced = useDebounced(query, 300);
  const tags = useTopTags();
  const { data, isLoading, isError, isPlaceholderData, refetch } =
    useSearchItems(debounced, filters);
  const hasQuery = debounced.trim().length > 0;

  return (
    <section>
      <ScreenHeader title={vi.search.title}>
        <label className="mt-3 flex items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 focus-within:border-stone-400 lg:max-w-xl">
          <Search size={18} className="shrink-0 text-stone-400" />
          <input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={vi.search.placeholder}
            aria-label={vi.search.title}
            className="min-h-[46px] w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-stone-400"
          />
        </label>
        <SearchFilterBar filters={filters} tags={tags} onChange={setFilters} />
      </ScreenHeader>

      <div className="px-4 pt-1 lg:px-0">
        {!hasQuery ? (
          <div className="py-4">
            <p className="text-sm text-stone-500">{vi.search.hint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {vi.search.examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setQuery(ex)}
                  className="min-h-[36px] rounded-md border border-line bg-white px-3 text-sm text-ink hover:bg-stone-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : isLoading ? (
          <ItemSkeleton count={2} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title={vi.search.emptyTitle}
            message={vi.search.empty}
            illustration="searchEmpty"
          />
        ) : (
          <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
            <ItemList items={data} />
          </div>
        )}
      </div>
    </section>
  );
}
