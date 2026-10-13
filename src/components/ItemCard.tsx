import { useState, type ReactNode } from 'react';
import { CollectionPicker } from '@/components/CollectionPicker';
import { EditItemDialog } from '@/components/EditItemDialog';
import { vi } from '@/i18n/vi';
import { formatRelativeTime } from '@/lib/formatDate';
import { cardHref } from '@/lib/itemLink';
import { isEnriching, needsRetry } from '@/lib/itemStatus';
import { RetryEnrichButton } from '@/components/RetryEnrichButton';
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

interface MainAreaProps {
  href: string | null;
  onOpen?: () => void;
  children: ReactNode;
}

function MainArea({ href, onOpen, children }: MainAreaProps) {
  const layout = 'flex min-w-0 flex-1 gap-3';
  if (!href) return <div className={layout}>{children}</div>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpen}
      className={`${layout} rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent`}
    >
      {children}
    </a>
  );
}

interface ItemCardProps {
  item: Item;
  /** Signed URL of the uploaded screenshot; wins over the scraped preview. */
  imageUrl?: string;
  onDelete?: (item: Item) => void;
  /** Shows the add-to-collection button (owner views only). */
  canOrganize?: boolean;
  /** Called when the user taps through to the source. */
  onOpen?: () => void;
}

/** Shows the user's note first, then title, then summary (business rule 14). */
export function ItemCard({ item, imageUrl, onDelete, canOrganize = false, onOpen }: ItemCardProps) {
  const [imageBroken, setImageBroken] = useState(false);
  // The source label already names social networks; the domain only adds
  // information for ordinary websites.
  const host = SOCIAL.has(item.source) ? null : hostOf(item.url);
  const primary = item.note ?? item.title ?? item.summary ?? vi.inbox.noNote;
  // Rule 14 order: note, then title, then summary; the second line shows
  // whichever comes next after the primary one.
  const secondary = item.note ? (item.title ?? item.summary) : item.title ? item.summary : null;
  // Rule 8: AI-made content must be visibly distinct from the user's own.
  const aiTitle = !item.note && !!item.title && item.title_origin === 'ai';
  const now = Date.now();
  const enriching = isEnriching(item, now);
  // Only the owner can retry; public views have no actions.
  const failed = canOrganize && needsRetry(item, now);
  const imageSrc = imageUrl ?? item.preview_image_url;
  const showImage = imageSrc && !imageBroken;
  const href = cardHref(item, imageUrl);

  return (
    // h-full + clamped text keeps every card in the grid the same height.
    <article className="flex h-full animate-fade gap-3 rounded-xl border border-line bg-white p-4 transition-colors hover:border-stone-300">
      <MainArea href={href} onOpen={onOpen}>
        <div className="flex min-w-0 flex-1 flex-col">
          <p
            title={primary}
            className="line-clamp-2 whitespace-pre-line break-words font-semibold leading-snug text-ink"
          >
            {primary}
            {aiTitle && (
              <span
                role="img"
                aria-label={vi.inbox.aiMade}
                title={vi.inbox.aiMade}
                className="ml-1.5 inline-block rounded bg-stone-100 px-1 align-middle text-[10px] font-bold leading-4 text-stone-500"
              >
                AI
              </span>
            )}
          </p>

          {secondary && (
            <p className="mt-1 line-clamp-1 break-words text-sm leading-snug text-stone-500">
              {secondary}
            </p>
          )}

          <p className="mt-auto flex min-w-0 items-center gap-1.5 pt-2.5 text-xs text-stone-400">
            <span className={`shrink-0 font-semibold ${SOURCE_COLOR[item.source]}`}>
              {vi.sources[item.source]}
            </span>
            {host && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{host}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{formatRelativeTime(item.created_at)}</span>
            {enriching && <span className="shrink-0 text-accent">· {vi.inbox.statusPending}</span>}
            {failed && <span className="shrink-0 text-amber-600">· {vi.inbox.statusFailed}</span>}
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
      </MainArea>

      {(onDelete || canOrganize) && (
        <div className="-mr-2 -mt-2 flex shrink-0 flex-col">
          {canOrganize && <CollectionPicker itemId={item.id} />}
          {failed && <RetryEnrichButton itemId={item.id} />}
          {onDelete && <EditItemDialog item={item} onDelete={onDelete} />}
        </div>
      )}
    </article>
  );
}
