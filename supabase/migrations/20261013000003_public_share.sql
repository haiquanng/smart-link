-- Public read-only collections (business rules 19, 20).
alter table public.collections
  add column share_notes boolean not null default false,
  add column share_images boolean not null default false;

-- Turns sharing on or off, or changes what a live link shows. A live link
-- keeps its slug; turning sharing off clears it, so the old link dies and the
-- next "on" gets a fresh one (rule 19). Security invoker: RLS limits it to
-- the caller's own collections. Returns the slug or null.
create function public.set_collection_sharing(
  p_collection uuid,
  p_enabled boolean,
  p_share_notes boolean default false,
  p_share_images boolean default false
) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_slug text;
begin
  update public.collections
  set public_slug = case when p_enabled then coalesce(
        public_slug,
        translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_')
      ) end,
      share_notes = p_enabled and p_share_notes,
      share_images = p_enabled and p_share_images
  where id = p_collection and user_id = auth.uid()
  returning public_slug into v_slug;
  if not found then
    raise exception 'collection not found';
  end if;
  return v_slug;
end;
$$;

revoke all on function public.set_collection_sharing(uuid, boolean, boolean, boolean) from public, anon;
grant execute on function public.set_collection_sharing(uuid, boolean, boolean, boolean) to authenticated;

-- Read side of a shared collection, keyed only by slug. Returns just the
-- fields rule 20 allows; note and image_path are null unless the owner
-- opted in. Called by the public-collection edge function (service role),
-- which turns image paths into short-lived signed URLs.
create function public.public_collection(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name', c.name,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'url', i.url,
        'source', i.source,
        'title', i.title,
        'summary', i.summary,
        'note', case when c.share_notes then i.note end,
        'image_path', case when c.share_images then i.image_path end,
        'preview_image_url', i.preview_image_url,
        'created_at', i.created_at
      ) order by i.created_at desc)
      from public.collection_items ci
      join public.items i on i.id = ci.item_id
      where ci.collection_id = c.id
    ), '[]'::jsonb)
  )
  from public.collections c
  where c.public_slug = p_slug and p_slug is not null;
$$;

revoke all on function public.public_collection(text) from public, anon, authenticated;
grant execute on function public.public_collection(text) to service_role;

-- Same as before plus the share flags (return type changed, so recreate).
drop function public.user_collections();
create function public.user_collections()
returns table (
  id uuid, name text, public_slug text, share_notes boolean, share_images boolean,
  created_at timestamptz, item_count int
)
language sql
stable
security invoker
set search_path = public
as $$
  select c.id, c.name, c.public_slug, c.share_notes, c.share_images, c.created_at,
         (select count(*)::int from public.collection_items ci where ci.collection_id = c.id)
  from public.collections c
  where c.user_id = auth.uid()
  order by c.created_at desc;
$$;

revoke all on function public.user_collections() from public, anon;
grant execute on function public.user_collections() to authenticated;
