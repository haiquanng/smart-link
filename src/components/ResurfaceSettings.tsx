import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PushSettings } from '@/components/PushSettings';
import { useResetResurface } from '@/hooks/useResurface';
import { vi } from '@/i18n/vi';

/** Settings card: optional push reminders, and letting seen items come back (rules 16, 17). */
export function ResurfaceSettings() {
  const reset = useResetResurface();

  return (
    <div className="space-y-4 rounded-xl border border-line bg-white p-4">
      <PushSettings />
      <div className="border-t border-line pt-4">
        <p className="text-xs text-stone-500">{vi.resurface.resetHint}</p>
        <div className="mt-3 flex items-center gap-3">
          <ConfirmDialog
            title={vi.resurface.resetTitle}
            description={vi.resurface.resetDescription}
            confirmLabel={vi.resurface.reset}
            onConfirm={() => reset.mutate()}
          >
            <button
              type="button"
              disabled={reset.isPending}
              className="min-h-[44px] shrink-0 rounded-lg border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-stone-50 disabled:opacity-60"
            >
              {vi.resurface.reset}
            </button>
          </ConfirmDialog>
          {reset.isSuccess && <span className="text-xs text-emerald-700">{vi.resurface.resetDone}</span>}
          {reset.isError && <span className="text-xs text-red-600">{vi.common.error}</span>}
        </div>
      </div>
    </div>
  );
}
