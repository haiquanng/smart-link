import { useEffect, useRef } from 'react';

// Loaded on demand: the engine (~45KB gzipped) and each animation are only
// fetched when an empty state is shown. The light build has no expression
// engine (and no eval); these files use no expressions.
const SOURCES = {
  inboxEmpty: () => import('@/assets/lottie/inbox-empty.json'),
  searchEmpty: () => import('@/assets/lottie/search-empty.json'),
  comingSoon: () => import('@/assets/lottie/coming-soon.json'),
} as const;

export type IllustrationName = keyof typeof SOURCES;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function Illustration({ name }: { name: IllustrationName }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroy: (() => void) | undefined;
    let cancelled = false;

    Promise.all([import('lottie-web/build/player/lottie_light'), SOURCES[name]()])
      .then(([engine, animation]) => {
        if (cancelled || !box.current) return;
        const anim = engine.default.loadAnimation({
          container: box.current,
          renderer: 'svg',
          loop: true,
          autoplay: !prefersReducedMotion(),
          animationData: animation.default,
        });
        destroy = () => anim.destroy();
      })
      .catch(() => {
        /* decorative only; the text still explains the state */
      });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [name]);

  // Fixed box so the text below doesn't jump when the animation arrives.
  return <div ref={box} className="h-40 w-40" aria-hidden="true" />;
}
