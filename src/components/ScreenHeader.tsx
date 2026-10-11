interface ScreenHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function ScreenHeader({ title, children }: ScreenHeaderProps) {
  return (
    <header
      className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      {children}
    </header>
  );
}
