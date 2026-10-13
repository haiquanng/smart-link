-- Fixed-window rate limit counters for ingest and search (security rule).
-- Kept in Postgres so no external service is needed. Only reachable through
-- hit_rate_limit(); RLS is on with no policies, so clients cannot read or
-- reset their own counters.
create table public.rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (user_id, bucket, window_start)
);
alter table public.rate_limits enable row level security;

-- Counts one hit and returns 0 when allowed, otherwise the seconds until the
-- window resets (for Retry-After). p_user defaults to the caller; a signed-in
-- user may only count against themselves, the service role may name anyone.
create function public.hit_rate_limit(
  p_bucket text,
  p_limit int,
  p_window_seconds int,
  p_user uuid default auth.uid()
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_hits int;
begin
  if p_user is null then
    raise exception 'hit_rate_limit: no user';
  end if;
  if auth.uid() is not null and p_user <> auth.uid() then
    raise exception 'hit_rate_limit: not allowed';
  end if;
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'hit_rate_limit: bad limit';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as r (user_id, bucket, window_start, hits)
  values (p_user, p_bucket, v_window, 1)
  on conflict (user_id, bucket, window_start)
  do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Old windows are never read again; drop them so the table stays tiny.
  delete from public.rate_limits
  where user_id = p_user and bucket = p_bucket and window_start < v_window;

  if v_hits <= p_limit then
    return 0;
  end if;
  return greatest(
    1,
    ceil(extract(epoch from (v_window + make_interval(secs => p_window_seconds) - now())))::int
  );
end;
$$;

revoke all on function public.hit_rate_limit(text, int, int, uuid) from public, anon;
grant execute on function public.hit_rate_limit(text, int, int, uuid) to authenticated, service_role;
