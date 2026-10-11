import { useRef, useState } from 'react';
import { useSaveLink } from '@/hooks/useSaveLink';
import { vi } from '@/i18n/vi';

const FIELD =
  'min-h-[46px] w-full bg-transparent px-3.5 text-[15px] text-ink outline-none placeholder:text-stone-400';

/** In-app capture: paste a link + optional note, saved via the ingest endpoint. */
export function AddLinkForm() {
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const noteRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const save = useSaveLink();

  const canSave = url.trim() !== '' || note.trim() !== '';

  // iOS asks for paste permission; if refused, fall back to the keyboard.
  async function onPaste() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) {
        setUrl(text);
        noteRef.current?.focus();
        return;
      }
    } catch {
      /* clipboard read denied or unsupported */
    }
    urlRef.current?.focus();
  }

  // Clear at once so saving feels instant; put the text back if it fails.
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    const input = { url, note };
    setUrl('');
    setNote('');
    save.mutate(input, {
      onError: () => {
        setUrl(input.url);
        setNote(input.note);
      },
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white focus-within:border-stone-400">
        <div className="flex items-center pr-1.5">
          <input
            ref={urlRef}
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={vi.add.urlPlaceholder}
            aria-label={vi.add.urlPlaceholder}
            className={FIELD}
          />
          {url === '' && (
            <button
              type="button"
              onClick={onPaste}
              className="min-h-[34px] shrink-0 rounded-md bg-stone-100 px-3 text-xs font-semibold text-ink hover:bg-stone-200"
            >
              {vi.add.paste}
            </button>
          )}
        </div>
        <input
          ref={noteRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={vi.add.notePlaceholder}
          aria-label={vi.add.notePlaceholder}
          className={FIELD}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <span
          key={save.submittedAt}
          className={`animate-fade text-xs ${
            save.isError
              ? 'text-red-600'
              : save.isSuccess
                ? 'text-emerald-700'
                : 'text-stone-400'
          }`}
        >
          {save.isError ? vi.add.failed : save.isSuccess ? vi.add.saved : vi.add.hint}
        </span>
        <button
          type="submit"
          disabled={!canSave}
          className="min-h-[44px] shrink-0 rounded-lg bg-ink px-6 text-sm font-semibold text-white hover:bg-stone-800 disabled:bg-stone-300"
        >
          {vi.add.save}
        </button>
      </div>
    </form>
  );
}
