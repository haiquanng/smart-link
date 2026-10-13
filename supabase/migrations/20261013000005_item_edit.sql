-- Editing items (business rules 8, 9). Users now write item_tags themselves,
-- so the init policy (user_id only) must also check that the item and the tag
-- belong to the caller.
drop policy item_tags_owner on public.item_tags;
create policy item_tags_owner on public.item_tags
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid())
    and exists (select 1 from public.tags t where t.id = tag_id and t.user_id = auth.uid())
  );

alter table public.tags
  add constraint tags_name_len check (char_length(btrim(name)) between 1 and 30);
