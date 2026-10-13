import { supabase } from '@/lib/supabase';
import { isThemeId } from '@/lib/applyTheme';
import type { ThemeId } from '@/lib/themes';

/** Profile settings, exposed as `api.profile`. RLS: own row only. */
export const profileApi = {
  async getTheme(): Promise<ThemeId> {
    const { data, error } = await supabase.from('profiles').select('theme').maybeSingle();
    if (error) throw error;
    return isThemeId(data?.theme) ? data.theme : 'default';
  },

  async setTheme(theme: ThemeId): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('not signed in');
    const { error } = await supabase.from('profiles').update({ theme }).eq('id', id);
    if (error) throw error;
  },
};
