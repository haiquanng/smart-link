import { Illustration, type IllustrationName } from '@/components/Illustration';

interface EmptyStateProps {
  message: string;
  title?: string;
  illustration?: IllustrationName;
}

export function EmptyState({ message, title, illustration }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-8 py-10 text-center">
      {illustration && <Illustration name={illustration} />}
      {title && <p className="mt-2 font-semibold text-ink">{title}</p>}
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-stone-500">{message}</p>
    </div>
  );
}
