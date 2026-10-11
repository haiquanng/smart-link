import { vi } from '@/i18n/vi';
import { formatRelativeTime } from '@/lib/formatDate';
import type { Item } from '@/types/item';
import type { Source } from '@/lib/ingestPayload';

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

const SOURCE_STYLE: Record<Source, string> = {
  facebook: 'bg-blue-50 text-blue-600',
  instagram: 'bg-pink-50 text-pink-600',
  threads: 'bg-slate-100 text-slate-700',
  substack: 'bg-orange-50 text-orange-600',
  web: 'bg-slate-100 text-slate-600',
  screenshot: 'bg-brand-100 text-brand-700',
  other: 'bg-slate-100 text-slate-600',
};

interface ItemCardProps {
  item: Item;
}

/** Shows the user's note first, then title, then summary (business rule 14). */
export function ItemCard({ item }: ItemCardProps) {
  const host = hostOf(item.url);
  const primary = item.note ?? item.title ?? item.summary ?? vi.inbox.noNote;

  return (
    <article className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-snug text-slate-900">
          {primary}
        </p>

        {item.note && item.title && (
          <p className="mt-1 break-words text-sm text-slate-500">{item.title}</p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${SOURCE_STYLE[item.source]}`}
          >
            {item.source}
          </span>
          {host && (
            <a
              href={item.url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-medium text-brand-600 active:text-brand-700"
            >
              {host}
            </a>
          )}
          <span>·</span>
          <span>{formatRelativeTime(item.created_at)}</span>
          {item.status === 'pending' && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">
              {vi.inbox.statusPending}
            </span>
          )}
          {item.status === 'enrich_failed' && (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-600">
              {vi.inbox.statusFailed}
            </span>
          )}
        </div>
      </div>

      {item.preview_image_url && (
        <img
          src={item.preview_image_url}
          alt=""
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
      )}
    </article>
  );
}
