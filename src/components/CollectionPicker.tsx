import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Check, FolderPlus } from 'lucide-react';
import { CollectionNameForm } from '@/components/CollectionNameForm';
import { Spinner } from '@/components/Spinner';
import { useCollections } from '@/hooks/useCollections';
import { useCollectionActions } from '@/hooks/useCollectionActions';
import { useItemCollections } from '@/hooks/useItemCollections';
import { vi } from '@/i18n/vi';

/** Folder button on a card; opens a sheet to toggle the item's collections. */
export function CollectionPicker({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  const collections = useCollections();
  const membership = useItemCollections(itemId, open);
  const { create } = useCollectionActions();

  function createAndAdd(name: string) {
    create.mutate(name, {
      onSuccess: (c) => membership.toggle.mutate({ collectionId: c.id, member: false }),
    });
  }

  const loading = collections.isLoading || membership.isLoading;
  const failed = collections.isError || membership.isError;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={vi.collections.addToCollection}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-ink"
        >
          <FolderPlus size={18} aria-hidden="true" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-fade" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl data-[state=open]:animate-fade sm:inset-0 sm:m-auto sm:h-fit sm:rounded-2xl sm:pb-5">
          <Dialog.Title className="text-base font-semibold text-ink">
            {vi.collections.pickerTitle}
          </Dialog.Title>
          <Dialog.Description className="sr-only">{vi.collections.pickerTitle}</Dialog.Description>

          <div className="-mx-2 mt-3 min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <Spinner />
            ) : failed ? (
              <p className="px-2 text-sm text-red-600">{vi.collections.loadError}</p>
            ) : collections.data?.length === 0 ? (
              <p className="px-2 text-sm text-stone-500">{vi.collections.pickerEmpty}</p>
            ) : (
              <ul>
                {collections.data?.map((c) => {
                  const member = membership.ids.includes(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={member}
                        onClick={() => membership.toggle.mutate({ collectionId: c.id, member })}
                        className="flex min-h-[48px] w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-stone-50"
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            member ? 'border-ink bg-ink text-white' : 'border-stone-300'
                          }`}
                        >
                          {member && <Check size={14} aria-hidden="true" />}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{c.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-4">
            <CollectionNameForm
              submitLabel={vi.collections.create}
              busy={create.isPending}
              onSubmit={createAndAdd}
              resetOnSubmit
            />
            {create.isError && (
              <p className="mt-1.5 text-xs text-red-600">{vi.collections.createError}</p>
            )}
          </div>

          <Dialog.Close className="mt-3 min-h-[44px] rounded-xl border border-line text-sm font-medium text-ink hover:bg-stone-50">
            {vi.common.close}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
