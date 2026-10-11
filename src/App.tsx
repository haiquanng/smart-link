import { vi } from '@/i18n/vi';

export default function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-100">{vi.appName}</h1>
      <p className="text-sm text-slate-400">{vi.tagline}</p>
    </main>
  );
}
