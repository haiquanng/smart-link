import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { downscaleToJpeg } from '@/lib/image';
import { clearSharedInbox } from '@/lib/shareInbox';

interface ShareSaveInput {
  url: string;
  note: string;
  files: File[];
}

/**
 * Saves a share through the normal ingest path (channel share_target): one
 * item per image, each carrying the link and note, or one link item. The
 * cached share is cleared only after everything saved, so a failure keeps it.
 */
export function useShareSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ url, note, files }: ShareSaveInput) => {
      if (files.length === 0) {
        await api.saveLink(url, note, 'share_target');
      } else {
        for (const file of files) {
          await api.saveScreenshot(await downscaleToJpeg(file), url, note, 'share_target');
        }
      }
      await clearSharedInbox();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}
