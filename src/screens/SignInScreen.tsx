import { useState } from 'react';
import { api } from '@/lib/api';
import { Wordmark } from '@/components/Wordmark';
import { vi } from '@/i18n/vi';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = 'signin' | 'signup';

export function SignInScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError(vi.auth.invalidEmail);
      return;
    }
    if (password.length < 6) {
      setError(vi.auth.weakPassword);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await api.signUp(email.trim(), password);
        if (needsConfirmation) setNotice(vi.auth.needConfirm);
      } else {
        await api.signIn(email.trim(), password);
      }
    } catch {
      setError(vi.auth.failed);
    } finally {
      setBusy(false);
    }
  }

  const isSignUp = mode === 'signup';

  const field =
    'min-h-[48px] rounded-lg border border-line bg-white px-3.5 text-[15px] text-ink outline-none placeholder:text-stone-400 focus:border-stone-400';

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm animate-fade">
        <h1>
          <Wordmark large />
        </h1>
        <p className="mt-2 text-stone-500">{vi.auth.heroTitle}</p>

        <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">
            {isSignUp ? vi.auth.signUpTitle : vi.auth.signInTitle}
          </h2>

          <label className="sr-only" htmlFor="email">
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
            className={field}
          />

          <label className="sr-only" htmlFor="password">
            {vi.auth.passwordLabel}
          </label>
          <input
            id="password"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={vi.auth.passwordPlaceholder}
            className={field}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-emerald-700">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 min-h-[48px] rounded-lg bg-ink px-4 font-semibold text-white hover:bg-stone-800 disabled:bg-stone-400"
          >
            {busy
              ? vi.auth.working
              : isSignUp
                ? vi.auth.signUpAction
                : vi.auth.signInAction}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(isSignUp ? 'signin' : 'signup');
              setError(null);
              setNotice(null);
            }}
            className="min-h-[44px] text-sm text-stone-500 underline-offset-2 hover:text-ink hover:underline"
          >
            {isSignUp ? vi.auth.toggleToSignIn : vi.auth.toggleToSignUp}
          </button>
        </form>
      </div>
    </main>
  );
}
