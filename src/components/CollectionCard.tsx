import { Link } from 'react-router';
import { BookMarked } from 'lucide-react';
import { vi } from '@/i18n/vi';
import type { Collection } from '@/lib/collectionsApi';

export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link
      to={`/collections/${collection.id}`}
      className="flex min-h-[64px] items-center gap-3 rounded-xl border border-line bg-white p-4 outline-none transition-colors hover:border-stone-300 focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
        <BookMarked size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{collection.name}</span>
        <span className="text-xs text-stone-400">
          {vi.collections.itemCount(collection.item_count)}
        </span>
      </span>
    </Link>
  );
}
