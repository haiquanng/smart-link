import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Spinner } from '@/components/Spinner';
import { ErrorState } from '@/components/ErrorState';
import { CopyButton } from '@/components/CopyButton';
import { ResurfaceSettings } from '@/components/ResurfaceSettings';
import { ThemePicker } from '@/components/ThemePicker';
import { useCreateToken, useRevokeToken, useTokens } from '@/hooks/useTokens';
import { api } from '@/lib/api';
import { env } from '@/lib/env';
import { formatRelativeTime } from '@/lib/formatDate';
import { vi } from '@/i18n/vi';

const INGEST_ENDPOINT = `${env.VITE_SUPABASE_URL}/functions/v1/ingest`;

const SECTION = 'mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-stone-400';
const CARD = 'rounded-xl border border-line bg-white p-4';
const INPUT =
  'min-h-[44px] rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none placeholder:text-stone-400 focus:border-stone-400';
const PRIMARY =
  'min-h-[44px] shrink-0 rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-stone-800 disabled:bg-stone-300';
const SECONDARY =
  'min-h-[44px] shrink-0 rounded-lg border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-stone-50';

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

      <div className="space-y-6 px-4 py-2 lg:max-w-2xl lg:px-0">
        <div>
          <h2 className={SECTION}>{vi.settings.account}</h2>
          <div className={`flex items-center justify-between gap-3 ${CARD}`}>
            <span className="truncate text-sm text-ink">{email}</span>
            <button onClick={() => api.signOut()} className={SECONDARY}>
              {vi.auth.signOut}
            </button>
          </div>
        </div>

        <div>
          <h2 className={SECTION}>{vi.settings.themeTitle}</h2>
          <div className={CARD}>
            <ThemePicker />
          </div>
        </div>

        <div>
          <h2 className={SECTION}>{vi.settings.tokensTitle}</h2>
          <div className={CARD}>
            <p className="mb-3 text-xs text-stone-500">{vi.settings.tokensHint}</p>

            <div className="flex gap-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={vi.settings.newTokenPlaceholder}
                aria-label={vi.settings.newTokenLabel}
                className={`${INPUT} min-w-0 flex-1`}
              />
              <button
                onClick={onCreate}
                disabled={createToken.isPending || label.trim() === ''}
                className={PRIMARY}
              >
                {createToken.isPending
                  ? vi.settings.creating
                  : vi.settings.createToken}
              </button>
            </div>

            {freshToken && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <p className="mb-2 text-xs text-amber-700">
                  {vi.settings.tokenShownOnce}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg bg-white px-2 py-1 text-xs text-stone-900">
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
                <p className="text-sm text-stone-400">{vi.settings.noTokens}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {tokens.data.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-stone-800">
                          {t.label}
                        </p>
                        <p className="text-xs text-stone-400">
                          {t.last_used_at
                            ? `${vi.settings.lastUsed} ${formatRelativeTime(t.last_used_at)}`
                            : vi.settings.neverUsed}
                        </p>
                      </div>
                      {t.revoked_at ? (
                        <span className="shrink-0 text-xs text-stone-400">
                          {vi.settings.revoked}
                        </span>
                      ) : (
                        <ConfirmDialog
                          title={vi.settings.revokeTitle}
                          description={vi.settings.revokeDescription}
                          confirmLabel={vi.settings.revoke}
                          tone="danger"
                          onConfirm={() => revokeToken.mutate(t.id)}
                        >
                          <button className="min-h-[44px] shrink-0 px-2 text-sm font-medium text-red-600 hover:underline">
                            {vi.settings.revoke}
                          </button>
                        </ConfirmDialog>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className={SECTION}>{vi.settings.extensionTitle}</h2>
          <div className={CARD}>
            <p className="text-xs leading-relaxed text-stone-500">{vi.settings.extensionGuide}</p>
          </div>
        </div>

        <div>
          <h2 className={SECTION}>{vi.resurface.settingsTitle}</h2>
          <ResurfaceSettings />
        </div>

        <div>
          <h2 className={SECTION}>{vi.settings.shortcutGuideTitle}</h2>
          <div className={CARD}>
            <p className="mb-3 text-xs text-stone-500">
              {vi.settings.shortcutGuide}
            </p>
            <label className="text-xs text-stone-400">
              {vi.settings.endpointLabel}
            </label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-700">
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
