import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { vi } from '@/i18n/vi';
import { formatRelativeTime } from '@/lib/formatDate';
import { isEnriching } from '@/lib/itemStatus';
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

// Each network's own brand color, used only for the small source label.
const SOURCE_COLOR: Record<Source, string> = {
  facebook: 'text-[#1877f2]',
  instagram: 'text-[#d62976]',
  threads: 'text-ink',
  substack: 'text-[#ff6719]',
  web: 'text-stone-600',
  screenshot: 'text-stone-600',
  other: 'text-stone-600',
};

const SOCIAL = new Set<Source>(['facebook', 'instagram', 'threads']);

interface ItemCardProps {
  item: Item;
  /** Signed URL of the uploaded screenshot; wins over the scraped preview. */
  imageUrl?: string;
  onDelete?: (item: Item) => void;
}

/** Shows the user's note first, then title, then summary (business rule 14). */
export function ItemCard({ item, imageUrl, onDelete }: ItemCardProps) {
  const [imageBroken, setImageBroken] = useState(false);
  // The source label already names social networks; the domain only adds
  // information for ordinary websites.
  const host = SOCIAL.has(item.source) ? null : hostOf(item.url);
  const primary = item.note ?? item.title ?? item.summary ?? vi.inbox.noNote;
  const secondary = item.note ? item.title : null;
  const enriching = isEnriching(item, Date.now());
  const imageSrc = imageUrl ?? item.preview_image_url;
  const showImage = imageSrc && !imageBroken;

  return (
    // h-full + clamped text keeps every card in the grid the same height.
    <article className="flex h-full animate-fade gap-3 rounded-xl border border-line bg-white p-4 transition-colors hover:border-stone-300">
      <div className="flex min-w-0 flex-1 flex-col">
        <p
          title={primary}
          className="line-clamp-2 whitespace-pre-line break-words font-semibold leading-snug text-ink"
        >
          {primary}
        </p>

        {secondary && (
          <p className="mt-1 line-clamp-1 break-words text-sm leading-snug text-stone-500">
            {secondary}
          </p>
        )}

        <p className="mt-auto flex min-w-0 items-center gap-1.5 pt-2.5 text-xs text-stone-400">
          {item.url && !host ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`shrink-0 font-semibold underline-offset-2 hover:underline ${SOURCE_COLOR[item.source]}`}
            >
              {vi.sources[item.source]}
            </a>
          ) : (
            <span className={`shrink-0 font-semibold ${SOURCE_COLOR[item.source]}`}>
              {vi.sources[item.source]}
            </span>
          )}
          {host && (
            <>
              <span aria-hidden="true">·</span>
              <a
                href={item.url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate underline-offset-2 hover:text-ink hover:underline"
              >
                {host}
              </a>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{formatRelativeTime(item.created_at)}</span>
          {enriching && (
            <span className="shrink-0 text-accent">· {vi.inbox.statusPending}</span>
          )}
        </p>
      </div>

      {showImage && (
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          // Social CDNs often reject hotlinks that carry our origin as referrer.
          referrerPolicy="no-referrer"
          onError={() => setImageBroken(true)}
          className="h-[72px] w-[72px] shrink-0 rounded-lg border border-line bg-stone-100 object-cover"
        />
      )}

      {onDelete && (
        <ConfirmDialog
          title={vi.inbox.deleteTitle}
          description={vi.inbox.deleteDescription}
          confirmLabel={vi.inbox.delete}
          tone="danger"
          onConfirm={() => onDelete(item)}
        >
          <button
            type="button"
            aria-label={vi.inbox.delete}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-red-600"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </ConfirmDialog>
      )}
    </article>
  );
}
