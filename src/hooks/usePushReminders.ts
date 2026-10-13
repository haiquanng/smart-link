import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { env } from '@/lib/env';
import { currentPushEnvironment, pushAvailability } from '@/lib/pushSupport';

const KEY = ['push-subscribed'];

/** Reminder toggle state for this device. */
export function usePushReminders() {
  const qc = useQueryClient();
  const availability = pushAvailability(currentPushEnvironment(env.VITE_VAPID_PUBLIC_KEY));

  const subscribed = useQuery({
    queryKey: KEY,
    queryFn: () => api.push.isSubscribed(),
    enabled: availability === 'available',
  });
  const toggle = useMutation({
    mutationFn: (on: boolean) => (on ? api.push.subscribe() : api.push.unsubscribe()),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return { availability, subscribed: subscribed.data === true, toggle };
}
