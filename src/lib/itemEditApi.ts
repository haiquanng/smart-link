import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { normalizeTags } from '@/lib/aiPatch';
import type { ItemPatch } from '@/lib/itemEdit';

const itemTagSchema = z.object({
  origin: z.enum(['user', 'ai']),
  tags: z.object({ id: z.string(), name: z.string() }),
});
export interface ItemTag {
  id: string;
  name: string;
  origin: 'user' | 'ai';
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('not signed in');
  return id;
}

/** Item editing calls, exposed as `api.itemEdit`. RLS scopes every write. */
export const itemEditApi = {
  async update(itemId: string, patch: ItemPatch): Promise<void> {
    const { error } = await supabase.from('items').update(patch).eq('id', itemId);
    if (error) throw error;
  },

  async listTags(itemId: string): Promise<ItemTag[]> {
    const { data, error } = await supabase
      .from('item_tags')
      .select('origin, tags(id, name)')
      .eq('item_id', itemId);
    if (error) throw error;
    return z
      .array(itemTagSchema)
      .parse(data ?? [])
      .map((r) => ({ id: r.tags.id, name: r.tags.name, origin: r.origin }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  },

  /** Adds a user tag; an existing AI tag of the same name becomes the user's. */
  async addTag(itemId: string, raw: string): Promise<void> {
    const [name] = normalizeTags([raw]);
    if (!name) return;
    const user_id = await currentUserId();
    const { error: tagError } = await supabase
      .from('tags')
      .upsert({ user_id, name }, { onConflict: 'user_id,name', ignoreDuplicates: true });
    if (tagError) throw tagError;
    const { data: tag, error: findError } = await supabase
      .from('tags')
      .select('id')
      .eq('name', name)
      .single();
    if (findError) throw findError;
    const { error } = await supabase
      .from('item_tags')
      .upsert({ item_id: itemId, tag_id: tag.id, user_id, origin: 'user' }, { onConflict: 'item_id,tag_id' });
    if (error) throw error;
  },

  async removeTag(itemId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('item_tags')
      .delete()
      .eq('item_id', itemId)
      .eq('tag_id', tagId);
    if (error) throw error;
  },

  /** Re-embeds after an edit; summary and tags are not regenerated. */
  async refreshEmbedding(itemId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('enrich', {
      body: { item_id: itemId, mode: 'embed' },
    });
    if (error) throw error;
  },

  /** Full enrichment again, for an item that failed (issue #10). */
  async retryEnrich(itemId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('enrich', {
      body: { item_id: itemId, mode: 'retry' },
    });
    if (error) throw error;
  },
};
