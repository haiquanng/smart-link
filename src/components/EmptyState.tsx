interface EmptyStateProps {
  message: string;
  icon?: string;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
      {icon && <span className="text-4xl">{icon}</span>}
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
