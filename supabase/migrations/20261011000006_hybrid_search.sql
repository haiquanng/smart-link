-- Phase 4 hybrid search: full text (unaccented) + pgvector cosine similarity.
-- Called by the `search` edge function with the caller's JWT, so RLS applies.
-- `vector` was created without a schema (public); extensions is on the path
-- too in case the hosted project installed it there.
drop function if exists public.search_items(text, jsonb, int);

create or replace function public.search_items(
  query text,
  query_embedding vector(768) default null,
  filters jsonb default '{}'::jsonb,
  max_results int default 50
)
returns setof public.items
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with q as (
    select websearch_to_tsquery('simple', public.immutable_unaccent(query)) as tsq
  ),
  -- Filters first; every key is optional (absent or wrong type = no filter).
  filtered as (
    select i.*
    from public.items i
    where (jsonb_typeof(filters -> 'sources') is distinct from 'array'
           or i.source::text in (select jsonb_array_elements_text(filters -> 'sources')))
      and (jsonb_typeof(filters -> 'tags') is distinct from 'array'
           or exists (
             select 1
             from public.item_tags it
             join public.tags t on t.id = it.tag_id
             where it.item_id = i.id
               and t.name in (select jsonb_array_elements_text(filters -> 'tags'))))
      and (filters ->> 'collection_id' is null
           or exists (
             select 1
             from public.collection_items ci
             where ci.item_id = i.id
               and ci.collection_id = (filters ->> 'collection_id')::uuid))
      and (filters ->> 'from' is null
           or i.created_at >= (filters ->> 'from')::timestamptz)
      and (filters ->> 'to' is null
           or i.created_at <= (filters ->> 'to')::timestamptz)
  ),
  -- Raw ts_rank is tiny (~0.05), so the 0.6 text weight would be swamped by
  -- cosine similarity and an exact note match could rank below a merely
  -- related item (rule 3: the note is the strongest signal). Scale so the best
  -- text match in this result set scores 1.
  fts_hits as (
    select r.id, r.rank / nullif(max(r.rank) over (), 0) as rank
    from (
      select f.id, ts_rank(f.fts, q.tsq, 32) as rank
      from filtered f, q
      where f.fts @@ q.tsq
    ) r
  ),
  -- Nearest 50 embeddings, kept only above the similarity floor so unrelated
  -- items do not pad the results. gemini-embedding-2 scores unrelated
  -- Vietnamese pairs ~0.55-0.60 and related ones ~0.70, hence 0.65.
  vec_hits as (
    select n.id
    from (
      select f.id, 1 - (f.embedding <=> query_embedding) as sim
      from filtered f
      where query_embedding is not null and f.embedding is not null
      order by f.embedding <=> query_embedding
      limit 50
    ) n
    where n.sim >= 0.65
  ),
  candidates as (
    select id from fts_hits
    union
    select id from vec_hits
  )
  select f.*
  from candidates c
  join filtered f on f.id = c.id
  left join fts_hits h on h.id = c.id
  order by
    0.6 * coalesce(h.rank, 0)
      + 0.4 * coalesce(greatest(1 - (f.embedding <=> query_embedding), 0), 0) desc,
    f.created_at desc
  limit greatest(1, least(max_results, 100));
$$;

revoke execute on function public.search_items(text, vector, jsonb, int) from public, anon;
grant execute on function public.search_items(text, vector, jsonb, int) to authenticated;

-- Top tags for the search filter chips. Invoker, so RLS limits to the caller.
create or replace function public.user_tags()
returns table (name text, item_count int)
language sql
stable
security invoker
set search_path = public
as $$
  select t.name, count(*)::int as item_count
  from public.tags t
  join public.item_tags it on it.tag_id = t.id
  group by t.id, t.name
  order by item_count desc, t.name
  limit 20;
$$;

revoke execute on function public.user_tags() from public, anon;
grant execute on function public.user_tags() to authenticated;

-- Items saved before AI enrichment have no embedding, so semantic search would
-- never find them. Re-queue them; the retry-enrich cron (10 per 15 min, pending
-- older than 10 min) embeds them gradually.
update public.items
set status = 'pending', enrich_attempts = 0
where embedding is null and status = 'ready';
