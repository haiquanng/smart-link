import { useCallback, useEffect, useRef, useState } from 'react';
import { useSaveScreenshot } from '@/hooks/useSaveScreenshot';
import { vi } from '@/i18n/vi';
import { checkImageFile, MAX_IMAGES } from '@/lib/image';

export type ShotStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface Shot {
  id: string;
  file: File;
  previewUrl: string;
  status: ShotStatus;
  url: string;
  note: string;
}

/** Queue of screenshots picked in the form. Files are sent one at a time so a
 *  single failure never blocks the rest. */
export function useScreenshotBatch() {
  const [shots, setShots] = useState<Shot[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const running = useRef(false);
  const shotsRef = useRef(shots);
  shotsRef.current = shots;
  const { mutateAsync } = useSaveScreenshot();

  useEffect(
    () => () => shotsRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl)),
    [],
  );

  const patch = (id: string, change: Partial<Shot>) =>
    setShots((all) => all.map((s) => (s.id === id ? { ...s, ...change } : s)));

  const add = useCallback((files: File[]) => {
    const valid = files.filter(checkImageFile);
    // Finished shots are dropped when new ones arrive, freeing their slots.
    const kept = shotsRef.current.filter((s) => s.status !== 'done');
    shotsRef.current
      .filter((s) => s.status === 'done')
      .forEach((s) => URL.revokeObjectURL(s.previewUrl));
    const room = MAX_IMAGES - kept.length;
    const accepted = valid.slice(0, Math.max(0, room));

    setNotice(
      accepted.length < valid.length
        ? vi.add.tooManyImages(MAX_IMAGES)
        : valid.length < files.length
          ? vi.add.unsupportedImage
          : null,
    );
    setShots([
      ...kept,
      ...accepted.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'idle' as const,
        url: '',
        note: '',
      })),
    ]);
  }, []);

  const remove = useCallback((id: string) => {
    const shot = shotsRef.current.find((s) => s.id === id);
    if (shot) URL.revokeObjectURL(shot.previewUrl);
    setShots((all) => all.filter((s) => s.id !== id));
  }, []);

  async function send(shot: Shot) {
    patch(shot.id, { status: 'uploading' });
    try {
      await mutateAsync({ file: shot.file, url: shot.url, note: shot.note });
      patch(shot.id, { status: 'done' });
    } catch {
      patch(shot.id, { status: 'error' });
    }
  }

  /** Applies the form's url/note to every waiting shot, then sends in order. */
  async function submit(url: string, note: string) {
    if (running.current) return;
    running.current = true;
    const waiting = shotsRef.current
      .filter((s) => s.status === 'idle')
      .map((s) => ({ ...s, url, note }));
    setShots((all) =>
      all.map((s) => (s.status === 'idle' ? { ...s, url, note } : s)),
    );
    try {
      for (const shot of waiting) await send(shot);
    } finally {
      running.current = false;
    }
  }

  const retry = (id: string) => {
    const shot = shotsRef.current.find((s) => s.id === id);
    if (shot) void send(shot);
  };

  const hasWaiting = shots.some((s) => s.status === 'idle');
  const busy = shots.some((s) => s.status === 'uploading');
  return { shots, notice, hasWaiting, busy, add, remove, retry, submit };
}
