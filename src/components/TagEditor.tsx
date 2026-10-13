import { useState } from 'react';
import { X } from 'lucide-react';
import { useItemTags } from '@/hooks/useItemTags';
import { vi } from '@/i18n/vi';

/** Tag chips for one item; AI tags are marked and removable (rule 8). */
export function TagEditor({ itemId }: { itemId: string }) {
  const tags = useItemTags(itemId, true);
  const [draft, setDraft] = useState('');

  function add() {
    if (!draft.trim()) return;
    tags.add.mutate(draft);
    setDraft('');
  }

  return (
    <div>
      {tags.data && tags.data.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {tags.data.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-1 rounded-full border border-line bg-stone-50 py-0.5 pl-3 pr-0.5 text-sm text-ink"
            >
              #{t.name}
              {t.origin === 'ai' && (
                <span title={vi.edit.aiHint} className="rounded bg-stone-200 px-1 text-[10px] font-bold text-stone-500">
                  {vi.edit.aiBadge}
                </span>
              )}
              <button
                type="button"
                aria-label={vi.edit.removeTag(t.name)}
                onClick={() => tags.remove.mutate(t.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-200 hover:text-ink"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !tags.isLoading && <p className="text-sm text-stone-400">{vi.edit.noTags}</p>
      )}
      {/* A div, not a nested form: this sits inside the edit form. */}
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds the tag instead of submitting the edit form.
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          maxLength={30}
          placeholder={vi.edit.addTagPlaceholder}
          aria-label={vi.edit.addTagPlaceholder}
          className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none placeholder:text-stone-400 focus:border-stone-400"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || tags.add.isPending}
          className="min-h-[44px] shrink-0 rounded-lg border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-stone-50 disabled:opacity-50"
        >
          {vi.edit.addTag}
        </button>
      </div>
    </div>
  );
}
