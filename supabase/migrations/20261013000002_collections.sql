-- Phase 5 collections: ordering, name rules, safer membership RLS, counts.
alter table public.collections
  add column created_at timestamptz not null default now(),
  add constraint collections_name_len check (char_length(btrim(name)) between 1 and 60);

-- The init policy only checked user_id, so a row could point at another
-- user's collection or item. Both ends must belong to the caller.
drop policy collection_items_owner on public.collection_items;
create policy collection_items_owner on public.collection_items
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.collections c
                where c.id = collection_id and c.user_id = auth.uid())
    and exists (select 1 from public.items i
                where i.id = item_id and i.user_id = auth.uid())
  );

create index collection_items_item_idx on public.collection_items (item_id);

-- The caller's collections with item counts, newest first (RLS applies).
create function public.user_collections()
returns table (id uuid, name text, public_slug text, created_at timestamptz, item_count int)
language sql
stable
security invoker
set search_path = public
as $$
  select c.id, c.name, c.public_slug, c.created_at,
         (select count(*)::int from public.collection_items ci where ci.collection_id = c.id)
  from public.collections c
  where c.user_id = auth.uid()
  order by c.created_at desc;
$$;

revoke all on function public.user_collections() from public, anon;
grant execute on function public.user_collections() to authenticated;
