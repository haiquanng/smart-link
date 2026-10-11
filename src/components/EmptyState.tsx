interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <p className="px-6 py-16 text-center text-sm text-slate-400">{message}</p>
  );
}
