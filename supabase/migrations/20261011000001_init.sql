-- Phase 1 schema. Mirrors .claude/docs/architecture-overview.md.
-- Every table has user_id + RLS (architecture rule, no exceptions), including
-- the join tables, which are denormalized with user_id for that reason.

-- Extensions --------------------------------------------------------------
create extension if not exists unaccent;
create extension if not exists vector;

-- unaccent() is STABLE, so it cannot be used directly in a generated column.
-- Wrap it as IMMUTABLE with an explicit dictionary so fts can be generated.
create or replace function public.immutable_unaccent(text)
  returns text
  language sql
  immutable
  parallel safe
  strict
as $$
  select public.unaccent('public.unaccent', $1)
$$;

-- Enums -------------------------------------------------------------------
create type public.source_type as enum (
  'facebook', 'instagram', 'threads', 'substack', 'web', 'screenshot', 'other'
);
create type public.channel_type as enum (
  'shortcut', 'paste', 'upload', 'share_target', 'extension', 'manual'
);
create type public.item_status as enum ('pending', 'ready', 'enrich_failed');
create type public.tag_origin as enum ('user', 'ai');

-- items -------------------------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text,
  url_normalized text,
  source public.source_type not null default 'other',
  channel public.channel_type not null default 'shortcut',
  note text,
  title text,
  summary text,
  content_text text,
  image_path text,
  preview_image_url text,
  status public.item_status not null default 'pending',
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  fts tsvector generated always as (
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(note, ''))), 'A') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(title, ''))), 'B') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(summary, ''))), 'B') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(content_text, ''))), 'C')
  ) stored,
  embedding vector(1024),
  -- Business rule 2: at least one of url, note, or an image.
  constraint items_has_content check (
    url is not null or note is not null or image_path is not null
  )
);

-- Dedupe per user on the normalized URL (business rule 5).
create unique index items_user_url_norm_uniq
  on public.items (user_id, url_normalized)
  where url_normalized is not null;

create index items_fts_idx on public.items using gin (fts);
create index items_user_created_idx on public.items (user_id, created_at desc);

-- tags --------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  unique (user_id, name)
);

create table public.item_tags (
  item_id uuid not null references public.items (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  origin public.tag_origin not null default 'user',
  primary key (item_id, tag_id)
);

-- collections -------------------------------------------------------------
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  public_slug text unique
);

create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (collection_id, item_id)
);

-- api_tokens --------------------------------------------------------------
create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  label text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Row Level Security ------------------------------------------------------
-- Policies are user_id = auth.uid() on every table. The ingest edge function
-- uses the service role key (bypasses RLS) and sets user_id explicitly after
-- verifying the api token.
alter table public.items enable row level security;
alter table public.tags enable row level security;
alter table public.item_tags enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.api_tokens enable row level security;

create policy items_owner on public.items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tags_owner on public.tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy item_tags_owner on public.item_tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy collections_owner on public.collections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy collection_items_owner on public.collection_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy api_tokens_owner on public.api_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
