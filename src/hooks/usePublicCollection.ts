import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { NotFoundError, type PublicCollection } from '@/lib/publicCollection';

export function usePublicCollection(slug: string) {
  return useQuery<PublicCollection>({
    queryKey: ['public-collection', slug],
    queryFn: () => api.publicCollection(slug),
    // A dead link stays dead; retrying only delays the message.
    retry: (count, err) => !(err instanceof NotFoundError) && count < 2,
  });
}
