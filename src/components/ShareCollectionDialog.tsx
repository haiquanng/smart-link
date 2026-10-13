import * as Dialog from '@radix-ui/react-dialog';
import { Share2 } from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';
import { Toggle } from '@/components/Toggle';
import { useCollectionSharing } from '@/hooks/useCollectionSharing';
import { shareUrl } from '@/lib/publicCollection';
import type { Collection } from '@/lib/collectionsApi';
import { vi } from '@/i18n/vi';

/** Owner controls for a collection's public read-only link (rules 19, 20). */
export function ShareCollectionDialog({ collection }: { collection: Collection }) {
  const sharing = useCollectionSharing(collection.id);
  const enabled = collection.public_slug !== null;
  const link = collection.public_slug ? shareUrl(collection.public_slug, window.location.origin) : null;
  const set = (next: Partial<{ enabled: boolean; notes: boolean; images: boolean }>) =>
    sharing.mutate({
      enabled,
      notes: collection.share_notes,
      images: collection.share_images,
      ...next,
    });

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={`flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium hover:bg-stone-100 ${
            enabled ? 'text-accent' : 'text-stone-500'
          }`}
        >
          <Share2 size={18} aria-hidden="true" />
          {enabled ? vi.collections.shared : vi.collections.share}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-fade" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl data-[state=open]:animate-fade sm:inset-0 sm:m-auto sm:h-fit sm:rounded-2xl sm:pb-5">
          <Dialog.Title className="text-base font-semibold text-ink">
            {vi.collections.shareTitle}
          </Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm text-stone-500">
            {vi.collections.shareHint}
          </Dialog.Description>

          <div className="mt-4 divide-y divide-line rounded-xl border border-line">
            <Toggle
              label={vi.collections.shareToggle}
              checked={enabled}
              disabled={sharing.isPending}
              onChange={(on) => set({ enabled: on })}
            />
            {enabled && (
              <>
                <Toggle
                  label={vi.collections.shareNotes}
                  checked={collection.share_notes}
                  disabled={sharing.isPending}
                  onChange={(on) => set({ notes: on })}
                />
                <Toggle
                  label={vi.collections.shareImages}
                  checked={collection.share_images}
                  disabled={sharing.isPending}
                  onChange={(on) => set({ images: on })}
                />
              </>
            )}
          </div>

          {link && (
            <div className="mt-4 flex items-center gap-2">
              <input
                readOnly
                value={link}
                aria-label={vi.collections.copyLink}
                onFocus={(e) => e.currentTarget.select()}
                className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-line bg-stone-50 px-3 text-sm text-ink"
              />
              <CopyButton value={link} label={vi.collections.copyLink} />
            </div>
          )}
          <p className="mt-3 text-xs text-stone-400">
            {sharing.isError ? (
              <span className="text-red-600">{vi.collections.shareError}</span>
            ) : (
              enabled && vi.collections.shareOffHint
            )}
          </p>

          <Dialog.Close className="mt-3 min-h-[44px] w-full rounded-xl border border-line text-sm font-medium text-ink hover:bg-stone-50">
            {vi.common.close}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
