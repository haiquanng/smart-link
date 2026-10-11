interface ScreenHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function ScreenHeader({ title, children }: ScreenHeaderProps) {
  return (
    <header
      className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
      {children}
    </header>
  );
}
