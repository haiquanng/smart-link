import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { useSharedInbox } from '@/hooks/useSharedInbox';
import { useShareSave } from '@/hooks/useShareSave';
import { parseSharePayload } from '@/lib/sharePayload';
import { vi } from '@/i18n/vi';

const FIELD =
  'w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink outline-none placeholder:text-stone-400 focus:border-stone-400';

/** Landing page for the Android share sheet: confirm the link, add a note, save. */
export function ShareScreen() {
  const [params] = useSearchParams();
  const inbox = useSharedInbox(params);
  const save = useShareSave();
  const parsed = useMemo(() => parseSharePayload(inbox.data?.payload ?? {}), [inbox.data]);
  const files = useMemo(() => inbox.data?.files ?? [], [inbox.data]);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  useEffect(() => setUrl(parsed.url), [parsed.url]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p)), [previews]);

  const nothing = !url.trim() && !note.trim() && files.length === 0;

  return (
    <section>
      <ScreenHeader title={vi.share.title} />
      <div className="px-4 pt-1 lg:max-w-xl lg:px-0">
        {inbox.isLoading ? (
          <Spinner />
        ) : params.get('error') === '1' || inbox.isError ? (
          <EmptyState message={vi.share.readError} illustration="searchEmpty" />
        ) : save.isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="font-semibold text-emerald-700">{vi.share.saved}</p>
            <Link to="/inbox" className="flex min-h-[44px] items-center rounded-xl bg-ink px-6 text-sm font-semibold text-white">
              {vi.share.toInbox}
            </Link>
          </div>
        ) : !inbox.data ? (
          <EmptyState message={vi.share.empty} illustration="inboxEmpty" />
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nothing) save.mutate({ url, note, files });
            }}
          >
            {parsed.context && <p className="text-sm text-stone-500">{parsed.context}</p>}
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-stone-500">{vi.share.urlLabel}</span>
              <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" className={`${FIELD} min-h-[46px]`} />
            </label>
            {previews.length > 0 && (
              <div>
                <span className="mb-1 block text-xs font-semibold text-stone-500">{vi.share.images(previews.length)}</span>
                <div className="flex gap-2 overflow-x-auto">
                  {previews.map((src) => (
                    <img key={src} src={src} alt="" className="h-20 w-20 shrink-0 rounded-lg border border-line object-cover" />
                  ))}
                </div>
              </div>
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-stone-500">{vi.share.noteLabel}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                autoFocus
                placeholder={vi.share.notePlaceholder}
                className={`${FIELD} py-2.5`}
              />
            </label>
            {save.isError && <p className="text-sm text-red-600">{vi.share.failed}</p>}
            <button
              type="submit"
              disabled={nothing || save.isPending}
              className="min-h-[48px] w-full rounded-xl bg-ink text-sm font-semibold text-white hover:bg-stone-800 disabled:bg-stone-300"
            >
              {save.isPending ? vi.share.saving : vi.share.save}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
