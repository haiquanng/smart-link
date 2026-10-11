import { useState } from 'react';
import { useSaveLink } from '@/hooks/useSaveLink';
import { vi } from '@/i18n/vi';

/** In-app capture: paste a link + optional note, saved via the ingest endpoint. */
export function AddLinkForm() {
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const save = useSaveLink();

  const canSave = (url.trim() !== '' || note.trim() !== '') && !save.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    try {
      await save.mutateAsync({ url, note });
      setUrl('');
      setNote('');
    } catch {
      /* error surfaced via save.isError below */
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <input
        type="url"
        inputMode="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={vi.add.urlPlaceholder}
        aria-label={vi.add.urlPlaceholder}
        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-900 outline-none focus:border-brand-500"
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={vi.add.notePlaceholder}
        aria-label={vi.add.notePlaceholder}
        className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-900 outline-none focus:border-brand-500"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        {save.isError ? (
          <span className="text-xs text-rose-600">{vi.add.failed}</span>
        ) : save.isSuccess ? (
          <span className="text-xs text-emerald-600">{vi.add.saved}</span>
        ) : (
          <span className="text-xs text-slate-400">{vi.add.hint}</span>
        )}
        <button
          type="submit"
          disabled={!canSave}
          className="min-h-[44px] rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white active:bg-brand-700 disabled:opacity-40"
        >
          {save.isPending ? vi.add.saving : vi.add.save}
        </button>
      </div>
    </form>
  );
}
