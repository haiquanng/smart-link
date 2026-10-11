interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, children }: ScreenHeaderProps) {
  return (
    <header
      className="sticky top-0 z-10 bg-canvas px-4 pb-3 lg:static lg:px-0 lg:pt-10"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
