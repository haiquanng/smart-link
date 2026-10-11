import { useState } from 'react';
import { api } from '@/lib/api';
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
        // Otherwise the session change signs the user in automatically.
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-100">{vi.appName}</h1>
        <p className="mt-1 text-sm text-slate-400">{vi.tagline}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-slate-200">
          {isSignUp ? vi.auth.signUpTitle : vi.auth.signInTitle}
        </h2>

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

        <label className="text-sm text-slate-300" htmlFor="password">
          {vi.auth.passwordLabel}
        </label>
        <input
          id="password"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={vi.auth.passwordPlaceholder}
          className="min-h-[48px] rounded-lg border border-slate-700 bg-slate-800 px-4 text-slate-100 outline-none focus:border-sky-500"
        />

        {error && <p className="text-sm text-rose-400">{error}</p>}
        {notice && <p className="text-sm text-emerald-400">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="min-h-[48px] rounded-lg bg-sky-600 px-4 font-medium text-white active:bg-sky-700 disabled:opacity-60"
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
          className="min-h-[44px] text-sm text-sky-400 active:text-sky-300"
        >
          {isSignUp ? vi.auth.toggleToSignIn : vi.auth.toggleToSignUp}
        </button>
      </form>
    </main>
  );
}
