import { vi } from '@/i18n/vi';
import { formatRelativeTime } from '@/lib/formatDate';
import type { Item } from '@/types/item';

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

interface ItemCardProps {
  item: Item;
}

/** Shows the user's note first, then title, then summary (business rule 14). */
export function ItemCard({ item }: ItemCardProps) {
  const host = hostOf(item.url);
  const primary = item.note ?? item.title ?? item.summary ?? vi.inbox.noNote;

  return (
    <article className="border-b border-slate-800 px-4 py-3">
      <p className="whitespace-pre-wrap break-words text-[15px] leading-snug text-slate-100">
        {primary}
      </p>

      {item.note && item.title && (
        <p className="mt-1 break-words text-sm text-slate-400">{item.title}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
          {item.source}
        </span>
        {host && (
          <a
            href={item.url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sky-400 active:text-sky-300"
          >
            {host}
          </a>
        )}
        <span>·</span>
        <span>{formatRelativeTime(item.created_at)}</span>
        {item.status === 'pending' && (
          <span className="text-amber-400">· {vi.inbox.statusPending}</span>
        )}
        {item.status === 'enrich_failed' && (
          <span className="text-rose-400">· {vi.inbox.statusFailed}</span>
        )}
      </div>
    </article>
  );
}
