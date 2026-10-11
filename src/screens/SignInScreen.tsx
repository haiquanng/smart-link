import { useState } from 'react';
import { api } from '@/lib/api';
import { vi } from '@/i18n/vi';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError(vi.auth.invalidEmail);
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      await api.signInWithEmail(email.trim());
      setStatus('sent');
    } catch {
      setStatus('error');
      setError(vi.common.error);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-100">{vi.appName}</h1>
        <p className="mt-1 text-sm text-slate-400">{vi.tagline}</p>
      </div>

      {status === 'sent' ? (
        <p className="rounded-lg bg-slate-800 px-4 py-3 text-center text-sm text-slate-200">
          {vi.auth.sent}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-sm text-slate-300" htmlFor="email">
            {vi.auth.emailLabel}
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={vi.auth.emailPlaceholder}
            className="min-h-[48px] rounded-lg border border-slate-700 bg-slate-800 px-4 text-slate-100 outline-none focus:border-sky-500"
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={status === 'sending'}
            className="min-h-[48px] rounded-lg bg-sky-600 px-4 font-medium text-white active:bg-sky-700 disabled:opacity-60"
          >
            {status === 'sending' ? vi.auth.sending : vi.auth.send}
          </button>
        </form>
      )}
    </main>
  );
}
