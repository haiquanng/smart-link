import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { downscaleToJpeg } from '@/lib/image';

interface ScreenshotInput {
  file: File;
  url: string;
  note: string;
}

/** Downscale, upload, ingest one screenshot. */
export function useSaveScreenshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, url, note }: ScreenshotInput) =>
      api.saveScreenshot(await downscaleToJpeg(file), url, note),
    onSettled: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}
