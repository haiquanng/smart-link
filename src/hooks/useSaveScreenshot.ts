import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { downscaleToJpeg } from '@/lib/image';
import type { Channel } from '@/lib/ingestPayload';

interface ScreenshotInput {
  file: File;
  url: string;
  note: string;
  channel?: Channel;
}

/** Downscale, upload, ingest one screenshot. */
export function useSaveScreenshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, url, note, channel }: ScreenshotInput) =>
      api.saveScreenshot(await downscaleToJpeg(file), url, note, channel),
    onSettled: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}
