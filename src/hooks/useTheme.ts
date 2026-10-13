import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { applyTheme } from '@/lib/applyTheme';
import type { ThemeId } from '@/lib/themes';

const KEY = ['profile-theme'];

/** The profile's theme, applied on load; changing it applies at once. */
export function useTheme(enabled: boolean) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: KEY, queryFn: () => api.profile.getTheme(), enabled });

  useEffect(() => {
    if (query.data) applyTheme(query.data);
  }, [query.data]);

  const setTheme = useMutation({
    mutationFn: (id: ThemeId) => api.profile.setTheme(id),
    onMutate: (id) => {
      const previous = qc.getQueryData<ThemeId>(KEY);
      qc.setQueryData(KEY, id);
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
  });

  return { theme: query.data, setTheme };
}
