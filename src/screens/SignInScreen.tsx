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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-3xl shadow-lg">
          🔗
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient-brand">
          {vi.appName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{vi.tagline}</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold text-slate-900">
          {isSignUp ? vi.auth.signUpTitle : vi.auth.signInTitle}
        </h2>

        <label className="text-sm font-medium text-slate-600" htmlFor="email">
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
          className="min-h-[48px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none focus:border-brand-500"
        />

        <label className="text-sm font-medium text-slate-600" htmlFor="password">
          {vi.auth.passwordLabel}
        </label>
        <input
          id="password"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={vi.auth.passwordPlaceholder}
          className="min-h-[48px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none focus:border-brand-500"
        />

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {notice && <p className="text-sm text-emerald-600">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 min-h-[48px] rounded-xl bg-brand-600 px-4 font-semibold text-white shadow-sm active:bg-brand-700 disabled:opacity-50"
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
          className="min-h-[44px] text-sm font-medium text-brand-600 active:text-brand-700"
        >
          {isSignUp ? vi.auth.toggleToSignIn : vi.auth.toggleToSignUp}
        </button>
      </form>
    </main>
  );
}
