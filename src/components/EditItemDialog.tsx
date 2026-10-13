import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Pencil } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TagEditor } from '@/components/TagEditor';
import { useEditItem } from '@/hooks/useEditItem';
import { planItemEdit } from '@/lib/itemEdit';
import type { Item } from '@/types/item';
import { vi } from '@/i18n/vi';

const LABEL = 'mb-1 block text-xs font-semibold text-stone-500';
const FIELD =
  'w-full rounded-lg border border-line bg-white px-3 text-[15px] text-ink outline-none placeholder:text-stone-400 focus:border-stone-400';

function AiBadge() {
  return (
    <span title={vi.edit.aiHint} className="ml-1.5 rounded bg-stone-100 px-1 text-[10px] font-bold text-stone-500">
      {vi.edit.aiBadge}
    </span>
  );
}

interface EditItemDialogProps {
  item: Item;
  onDelete?: (item: Item) => void;
}

/** Pencil button on a card; opens a sheet to edit note, title, summary, tags. */
export function EditItemDialog({ item, onDelete }: EditItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(item.note ?? '');
  const [title, setTitle] = useState(item.title ?? '');
  const [removeSummary, setRemoveSummary] = useState(false);
  const edit = useEditItem(item.id);
  const plan = planItemEdit(item, { note, title, removeSummary });

  function onOpenChange(next: boolean) {
    // Start from the saved values each time the sheet opens.
    if (next) {
      setNote(item.note ?? '');
      setTitle(item.title ?? '');
      setRemoveSummary(false);
      edit.reset();
    }
    setOpen(next);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!plan.ok) return;
    if (Object.keys(plan.patch).length === 0) return setOpen(false);
    edit.mutate(plan.patch, { onSuccess: () => setOpen(false) });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={vi.edit.open}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-ink"
        >
          <Pencil size={18} aria-hidden="true" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-fade" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl data-[state=open]:animate-fade sm:inset-0 sm:m-auto sm:h-fit sm:rounded-2xl">
          <form onSubmit={save} className="flex min-h-0 flex-col">
            <div className="min-h-0 space-y-4 overflow-y-auto p-5">
              <Dialog.Title className="text-base font-semibold text-ink">{vi.edit.title}</Dialog.Title>
              <Dialog.Description className="sr-only">{vi.edit.title}</Dialog.Description>

              <label className="block">
                <span className={LABEL}>{vi.edit.noteLabel}</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder={vi.edit.notePlaceholder}
                  className={`${FIELD} py-2.5`}
                />
              </label>

              <label className="block">
                <span className={LABEL}>
                  {vi.edit.titleLabel}
                  {item.title_origin === 'ai' && title === item.title && <AiBadge />}
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={vi.edit.titlePlaceholder}
                  className={`${FIELD} min-h-[44px]`}
                />
              </label>

              {item.summary && (
                <div>
                  <span className={LABEL}>
                    {vi.edit.summaryLabel}
                    <AiBadge />
                  </span>
                  <p className={`text-sm ${removeSummary ? 'text-stone-400 line-through' : 'text-stone-600'}`}>
                    {item.summary}
                  </p>
                  <button
                    type="button"
                    onClick={() => setRemoveSummary((r) => !r)}
                    className="mt-1 min-h-[44px] text-sm font-medium text-stone-500 underline-offset-2 hover:text-ink hover:underline"
                  >
                    {removeSummary ? vi.edit.undoRemove : vi.edit.removeSummary}
                  </button>
                </div>
              )}

              <div>
                <span className={LABEL}>{vi.edit.tagsLabel}</span>
                <TagEditor itemId={item.id} />
              </div>

              {!plan.ok && <p className="text-xs text-red-600">{vi.edit.needSomething}</p>}
              {edit.isError && <p className="text-xs text-red-600">{vi.edit.saveError}</p>}
            </div>

            <div className="flex gap-2 border-t border-line p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
              {onDelete && (
                <ConfirmDialog
                  title={vi.inbox.deleteTitle}
                  description={vi.inbox.deleteDescription}
                  confirmLabel={vi.inbox.delete}
                  tone="danger"
                  onConfirm={() => {
                    setOpen(false);
                    onDelete(item);
                  }}
                >
                  <button
                    type="button"
                    className="min-h-[44px] rounded-xl px-4 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    {vi.inbox.delete}
                  </button>
                </ConfirmDialog>
              )}
              <Dialog.Close className="ml-auto min-h-[44px] rounded-xl border border-line px-4 text-sm font-medium text-ink hover:bg-stone-50">
                {vi.common.cancel}
              </Dialog.Close>
              <button
                type="submit"
                disabled={!plan.ok || edit.isPending}
                className="min-h-[44px] rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-stone-800 disabled:bg-stone-300"
              >
                {edit.isPending ? vi.edit.saving : vi.edit.save}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
