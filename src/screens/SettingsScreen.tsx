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
    const name = label.trim() || vi.settings.newTokenPlaceholder;
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
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {vi.settings.account}
          </h2>
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm text-slate-300">{email}</span>
            <button
              onClick={() => api.signOut()}
              className="min-h-[44px] shrink-0 rounded-lg bg-slate-800 px-4 text-sm text-slate-200 active:bg-slate-700"
            >
              {vi.auth.signOut}
            </button>
          </div>
        </div>

        {/* Tokens */}
        <div>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {vi.settings.tokensTitle}
          </h2>
          <p className="mb-3 text-xs text-slate-400">{vi.settings.tokensHint}</p>

          <div className="flex gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={vi.settings.newTokenPlaceholder}
              aria-label={vi.settings.newTokenLabel}
              className="min-h-[44px] flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
            <button
              onClick={onCreate}
              disabled={createToken.isPending}
              className="min-h-[44px] shrink-0 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white active:bg-sky-700 disabled:opacity-60"
            >
              {createToken.isPending
                ? vi.settings.creating
                : vi.settings.createToken}
            </button>
          </div>

          {freshToken && (
            <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="mb-2 text-xs text-amber-200">
                {vi.settings.tokenShownOnce}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-slate-900 px-2 py-1 text-xs text-slate-100">
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
              <p className="text-sm text-slate-500">{vi.settings.noTokens}</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {tokens.data.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-200">
                        {t.label}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t.last_used_at
                          ? `${vi.settings.lastUsed} ${formatRelativeTime(t.last_used_at)}`
                          : vi.settings.neverUsed}
                      </p>
                    </div>
                    {t.revoked_at ? (
                      <span className="shrink-0 text-xs text-slate-500">
                        {vi.settings.revoked}
                      </span>
                    ) : (
                      <button
                        onClick={() => revokeToken.mutate(t.id)}
                        className="min-h-[44px] shrink-0 rounded-lg px-3 text-sm text-rose-400 active:text-rose-300"
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

        {/* Shortcut guide */}
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {vi.settings.shortcutGuideTitle}
          </h2>
          <p className="mb-3 text-xs text-slate-400">
            {vi.settings.shortcutGuide}
          </p>
          <label className="text-xs text-slate-500">
            {vi.settings.endpointLabel}
          </label>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-slate-800 px-2 py-2 text-xs text-slate-200">
              {INGEST_ENDPOINT}
            </code>
            <CopyButton value={INGEST_ENDPOINT} />
          </div>
        </div>
      </div>
    </section>
  );
}
