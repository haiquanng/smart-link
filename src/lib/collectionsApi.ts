import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { ITEM_COLUMNS } from '@/lib/itemColumns';
import type { Item } from '@/types/item';

export const MAX_COLLECTION_NAME = 60;

export const collectionNameSchema = z.string().trim().min(1).max(MAX_COLLECTION_NAME);

const collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  public_slug: z.string().nullable(),
  share_notes: z.boolean(),
  share_images: z.boolean(),
  created_at: z.string(),
  item_count: z.number(),
});
export type Collection = z.infer<typeof collectionSchema>;

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('not signed in');
  return id;
}

/** Collections calls, exposed as `api.collections`. RLS scopes every query. */
export const collectionsApi = {
  async list(): Promise<Collection[]> {
    const { data, error } = await supabase.rpc('user_collections');
    if (error) throw error;
    return z.array(collectionSchema).parse(data ?? []);
  },

  async create(name: string): Promise<Collection> {
    const user_id = await currentUserId();
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id, name: collectionNameSchema.parse(name) })
      .select('id, name, public_slug, share_notes, share_images, created_at')
      .single();
    if (error) throw error;
    return collectionSchema.parse({ ...data, item_count: 0 });
  },

  async rename(id: string, name: string): Promise<void> {
    const { error } = await supabase
      .from('collections')
      .update({ name: collectionNameSchema.parse(name) })
      .eq('id', id);
    if (error) throw error;
  },

  /** Turning sharing on always mints a new slug; off kills the old link. */
  async setSharing(
    id: string,
    sharing: { enabled: boolean; notes: boolean; images: boolean },
  ): Promise<string | null> {
    const { data, error } = await supabase.rpc('set_collection_sharing', {
      p_collection: id,
      p_enabled: sharing.enabled,
      p_share_notes: sharing.notes,
      p_share_images: sharing.images,
    });
    if (error) throw error;
    return z.string().nullable().parse(data);
  },

  /** Memberships cascade; the items themselves stay. */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (error) throw error;
  },

  async listItems(collectionId: string): Promise<Item[]> {
    const { data, error } = await supabase
      .from('items')
      // Empty inner embed: filters by membership without returning its columns.
      .select(`${ITEM_COLUMNS}, collection_items!inner()`)
      .eq('collection_items.collection_id', collectionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Item[];
  },

  /** Ids of the collections an item belongs to. */
  async forItem(itemId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('collection_items')
      .select('collection_id')
      .eq('item_id', itemId);
    if (error) throw error;
    return (data ?? []).map((row) => row.collection_id as string);
  },

  async addItem(collectionId: string, itemId: string): Promise<void> {
    const user_id = await currentUserId();
    const { error } = await supabase
      .from('collection_items')
      .upsert(
        { collection_id: collectionId, item_id: itemId, user_id },
        { onConflict: 'collection_id,item_id', ignoreDuplicates: true },
      );
    if (error) throw error;
  },

  async removeItem(collectionId: string, itemId: string): Promise<void> {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('item_id', itemId);
    if (error) throw error;
  },
};
