-- Single search entry point (architecture rule: the frontend never builds
-- search SQL). Phase 2 is text-only; Phase 4 adds vector similarity and the
-- `filters` are applied. `query` is unaccented so a no-diacritics search
-- matches accented notes (business rule 11).
create or replace function public.search_items(
  query text,
  filters jsonb default '{}'::jsonb,
  max_results int default 50
)
returns setof public.items
language sql
stable
security invoker
set search_path = public
as $$
  select i.*
  from public.items i,
       websearch_to_tsquery('simple', public.immutable_unaccent(query)) as q(tsq)
  where i.fts @@ q.tsq
  order by ts_rank(i.fts, q.tsq) desc, i.created_at desc
  limit greatest(1, least(max_results, 100));
$$;

grant execute on function public.search_items(text, jsonb, int) to authenticated;
