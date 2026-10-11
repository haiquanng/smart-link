import type { ReactNode } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { vi } from '@/i18n/vi';

interface ConfirmDialogProps {
  /** The control that opens the dialog; must accept a ref (button, etc.). */
  children: ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
  /** `danger` for destructive actions (delete, revoke). */
  tone?: 'default' | 'danger';
  onConfirm: () => void;
}

/**
 * Shared confirm step for any action the user might regret (shadcn-style
 * AlertDialog on Radix). Replaces window.confirm, which iOS standalone PWAs
 * render as an unstyled system alert.
 */
export function ConfirmDialog({
  children,
  title,
  description,
  confirmLabel,
  tone = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const confirmClass =
    tone === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-ink text-white hover:bg-stone-800';

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{children}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-fade" />
        <AlertDialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl data-[state=open]:animate-fade sm:inset-0 sm:m-auto sm:h-fit sm:rounded-2xl sm:pb-5">
          <AlertDialog.Title className="text-base font-semibold text-ink">
            {title}
          </AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="mt-1.5 text-sm text-stone-500">
              {description}
            </AlertDialog.Description>
          )}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel className="min-h-[44px] rounded-xl border border-line px-4 text-sm font-medium text-ink hover:bg-stone-50">
              {vi.common.cancel}
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={onConfirm}
              className={`min-h-[44px] rounded-xl px-4 text-sm font-semibold ${confirmClass}`}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
