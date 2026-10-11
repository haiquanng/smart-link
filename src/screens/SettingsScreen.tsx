import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Spinner } from '@/components/Spinner';
import { ErrorState } from '@/components/ErrorState';
import { CopyButton } from '@/components/CopyButton';
import { useCreateToken, useRevokeToken, useTokens } from '@/hooks/useTokens';
import { api } from '@/lib/api';
import { env } from '@/lib/env';
import { formatRelativeTime } from '@/lib/formatDate';
import { vi } from '@/i18n/vi';

const INGEST_ENDPOINT = `${env.VITE_SUPABASE_URL}/functions/v1/ingest`;

const SECTION = 'mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400';
const CARD = 'rounded-2xl border border-slate-100 bg-white p-4 shadow-sm';

interface SettingsScreenProps {
  email: string | undefined;
}

export function SettingsScreen({ email }: SettingsScreenProps) {
  const tokens = useTokens();
  const createToken = useCreateToken();
  const revokeToken = useRevokeToken();
  const [label, setLabel] = useState('');
  const [freshToken, setFreshToken] = useState<string | null>(null);

  async function onCreate() {
    const name = label.trim();
    if (!name) return;
    const { token } = await createToken.mutateAsync(name);
    setFreshToken(token);
    setLabel('');
  }

  return (
    <section className="pb-6">
      <ScreenHeader title={vi.settings.title} />

      <div className="space-y-6 px-4 py-4">
        {/* Account */}
        <div>
          <h2 className={SECTION}>{vi.settings.account}</h2>
          <div className={`flex items-center justify-between gap-3 ${CARD}`}>
            <span className="truncate text-sm text-slate-700">{email}</span>
            <button
              onClick={() => api.signOut()}
              className="min-h-[44px] shrink-0 rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-700 active:bg-slate-200"
            >
              {vi.auth.signOut}
            </button>
          </div>
        </div>

        {/* Tokens */}
        <div>
          <h2 className={SECTION}>{vi.settings.tokensTitle}</h2>
          <div className={CARD}>
            <p className="mb-3 text-xs text-slate-500">{vi.settings.tokensHint}</p>

            <div className="flex gap-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={vi.settings.newTokenPlaceholder}
                aria-label={vi.settings.newTokenLabel}
                className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-brand-500"
              />
              <button
                onClick={onCreate}
                disabled={createToken.isPending || label.trim() === ''}
                className="min-h-[44px] shrink-0 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white active:bg-brand-700 disabled:opacity-40"
              >
                {createToken.isPending
                  ? vi.settings.creating
                  : vi.settings.createToken}
              </button>
            </div>

            {freshToken && (
              <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="mb-2 text-xs text-amber-700">
                  {vi.settings.tokenShownOnce}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg bg-white px-2 py-1 text-xs text-slate-900">
                    {freshToken}
                  </code>
                  <CopyButton value={freshToken} />
                </div>
              </div>
            )}

            <div className="mt-4">
              {tokens.isLoading ? (
                <Spinner />
              ) : tokens.isError ? (
                <ErrorState onRetry={() => tokens.refetch()} />
              ) : !tokens.data || tokens.data.length === 0 ? (
                <p className="text-sm text-slate-400">{vi.settings.noTokens}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {tokens.data.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {t.label}
                        </p>
                        <p className="text-xs text-slate-400">
                          {t.last_used_at
                            ? `${vi.settings.lastUsed} ${formatRelativeTime(t.last_used_at)}`
                            : vi.settings.neverUsed}
                        </p>
                      </div>
                      {t.revoked_at ? (
                        <span className="shrink-0 text-xs text-slate-400">
                          {vi.settings.revoked}
                        </span>
                      ) : (
                        <button
                          onClick={() => revokeToken.mutate(t.id)}
                          className="min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-medium text-rose-600 active:text-rose-700"
                        >
                          {vi.settings.revoke}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Shortcut guide */}
        <div>
          <h2 className={SECTION}>{vi.settings.shortcutGuideTitle}</h2>
          <div className={CARD}>
            <p className="mb-3 text-xs text-slate-500">
              {vi.settings.shortcutGuide}
            </p>
            <label className="text-xs text-slate-400">
              {vi.settings.endpointLabel}
            </label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-700">
                {INGEST_ENDPOINT}
              </code>
              <CopyButton value={INGEST_ENDPOINT} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
