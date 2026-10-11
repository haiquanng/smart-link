import { vi } from '@/i18n/vi';

export function Wordmark({ large = false }: { large?: boolean }) {
  return (
    <span
      className={`font-extrabold tracking-tight text-ink ${large ? 'text-3xl' : 'text-lg'}`}
    >
      {vi.appName}
      <span className="text-accent">.</span>
    </span>
  );
}
