import { supabase } from '@/lib/supabase';
import { ITEM_COLUMNS } from '@/lib/itemColumns';
import type { Item } from '@/types/item';

/** Resurface calls, exposed as `api.resurface`. */
export const resurfaceApi = {
  /** Today's picks (made on first call of the day, then stable). */
  async today(localDate: string): Promise<Item[]> {
    const { data, error } = await supabase
      .rpc('resurface_today', { p_today: localDate })
      .select(ITEM_COLUMNS);
    if (error) throw error;
    return (data ?? []) as unknown as Item[];
  },

  /** Opened or dismissed (rule 16): never resurfaced again unless reset. */
  async markSeen(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('items')
      .update({ seen_at: new Date().toISOString() })
      .eq('id', itemId);
    if (error) throw error;
  },

  async reset(): Promise<void> {
    const { error } = await supabase.rpc('resurface_reset');
    if (error) throw error;
  },
};
