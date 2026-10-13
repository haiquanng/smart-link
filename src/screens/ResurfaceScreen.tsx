import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ItemCard } from '@/components/ItemCard';
import { ItemSkeleton } from '@/components/ItemSkeleton';
import { useResurface } from '@/hooks/useResurface';
import { useSignedImageUrls } from '@/hooks/useSignedImageUrls';
import { cardHref } from '@/lib/itemLink';
import { vi } from '@/i18n/vi';

/** Up to 3 old, unseen items a day; open or dismiss marks them seen (rules 15, 16). */
export function ResurfaceScreen() {
  const { data, isLoading, isError, refetch, markSeen } = useResurface();
  const imageUrls = useSignedImageUrls(data ?? []);

  return (
    <section>
      <ScreenHeader
        title={vi.resurface.title}
        subtitle={data?.length ? vi.resurface.count(data.length) : undefined}
      >
        <p className="mt-1 text-sm text-stone-500">{vi.resurface.subtitle}</p>
      </ScreenHeader>

      <div className="px-4 pt-1 lg:px-0">
        {isLoading ? (
          <ItemSkeleton count={3} />
        ) : isError ? (
          <ErrorState message={vi.resurface.loadError} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title={vi.resurface.emptyTitle}
            message={vi.resurface.empty}
            illustration="comingSoon"
          />
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {data.map((item) => {
              const imageUrl = item.image_path ? imageUrls[item.image_path] : undefined;
              const href = cardHref(item, imageUrl);
              const seen = () => markSeen.mutate(item.id);
              return (
                <li key={item.id} className="flex flex-col gap-2">
                  <ItemCard item={item} imageUrl={imageUrl} onOpen={seen} />
                  <div className="flex gap-2">
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={seen}
                        className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-ink text-sm font-semibold text-white hover:bg-stone-800"
                      >
                        {vi.resurface.open}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={seen}
                      className="min-h-[44px] flex-1 rounded-xl border border-line bg-white text-sm font-medium text-ink hover:bg-stone-50"
                    >
                      {vi.resurface.dismiss}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
