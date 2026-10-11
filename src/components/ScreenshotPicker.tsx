import { useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { vi } from '@/i18n/vi';
import type { Shot } from '@/hooks/useScreenshotBatch';

interface ScreenshotPickerProps {
  shots: Shot[];
  notice: string | null;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

const STATUS_TEXT = {
  idle: vi.add.imageReady,
  uploading: vi.add.imageUploading,
  done: vi.add.imageDone,
  error: vi.add.imageFailed,
} as const;

/** Multi-image picker with a row per file showing its upload state. */
export function ScreenshotPicker({
  shots,
  notice,
  onAdd,
  onRemove,
  onRetry,
}: ScreenshotPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-2.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="screenshot-input"
        onChange={(e) => {
          onAdd([...(e.target.files ?? [])]);
          // Lets the same photo be picked again after removing it.
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex min-h-[44px] items-center gap-2 rounded-lg bg-stone-100 px-4 text-sm font-semibold text-ink hover:bg-stone-200"
      >
        <ImagePlus size={18} aria-hidden="true" />
        {vi.add.addImages}
      </button>
      {notice && <p className="mt-2 text-xs text-red-600">{notice}</p>}

      {shots.length > 0 && (
        <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-white">
          {shots.map((shot) => (
            <li key={shot.id} className="flex items-center gap-3 py-1.5 pl-2 pr-1">
              <img
                src={shot.previewUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-md bg-stone-100 object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {shot.file.name}
              </span>
              {shot.status === 'error' ? (
                <button
                  type="button"
                  onClick={() => onRetry(shot.id)}
                  className="min-h-[44px] shrink-0 px-2 text-xs font-semibold text-red-600"
                >
                  {vi.add.imageFailed}
                </button>
              ) : (
                <span
                  className={`shrink-0 text-xs ${
                    shot.status === 'done' ? 'text-emerald-700' : 'text-stone-400'
                  }`}
                >
                  {STATUS_TEXT[shot.status]}
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(shot.id)}
                disabled={shot.status === 'uploading'}
                aria-label={vi.add.removeImage}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-40"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
