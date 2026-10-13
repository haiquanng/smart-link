import { useState } from 'react';
import { MAX_COLLECTION_NAME } from '@/lib/collectionsApi';
import { vi } from '@/i18n/vi';

interface CollectionNameFormProps {
  initialName?: string;
  submitLabel: string;
  busy?: boolean;
  /** Called with the trimmed name; the form clears itself when `resetOnSubmit`. */
  onSubmit: (name: string) => void;
  resetOnSubmit?: boolean;
  autoFocus?: boolean;
}

/** One-line name input used for creating and renaming a collection. */
export function CollectionNameForm({
  initialName = '',
  submitLabel,
  busy = false,
  onSubmit,
  resetOnSubmit = false,
  autoFocus = false,
}: CollectionNameFormProps) {
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || busy) return;
    onSubmit(trimmed);
    if (resetOnSubmit) setName('');
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={MAX_COLLECTION_NAME}
        placeholder={vi.collections.namePlaceholder}
        aria-label={vi.collections.nameLabel}
        autoFocus={autoFocus}
        className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink outline-none placeholder:text-stone-400 focus:border-stone-400"
      />
      <button
        type="submit"
        disabled={!trimmed || busy}
        className="min-h-[44px] shrink-0 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-stone-800 disabled:bg-stone-300"
      >
        {submitLabel}
      </button>
    </form>
  );
}
