import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useSaveLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ url, note }: { url: string; note: string }) =>
      api.saveLink(url, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}
