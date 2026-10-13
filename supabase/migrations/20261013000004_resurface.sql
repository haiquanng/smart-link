-- Resurface (business rules 15, 16). Picks are made lazily the first time the
-- tab is opened on a day and stored, so the same items show all day.
create table public.resurface_picks (
  user_id uuid not null references auth.users (id) on delete cascade,
  pick_date date not null,
  item_id uuid not null references public.items (id) on delete cascade,
  primary key (user_id, pick_date, item_id)
);
alter table public.resurface_picks enable row level security;
create policy resurface_picks_owner on public.resurface_picks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index items_resurface_idx on public.items (user_id, created_at) where seen_at is null;

-- Today's picks for the caller, still unseen. p_today is the user's local
-- date (the browser knows the timezone); it only keys the stored picks.
create function public.resurface_today(p_today date, p_max int default 3, p_min_age_days int default 3)
returns setof public.items
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  if not exists (select 1 from public.resurface_picks
                 where user_id = auth.uid() and pick_date = p_today) then
    insert into public.resurface_picks (user_id, pick_date, item_id)
    select auth.uid(), p_today, i.id
    from public.items i
    where i.user_id = auth.uid()
      and i.seen_at is null
      and i.created_at <= now() - make_interval(days => p_min_age_days)
    order by i.created_at asc
    limit least(greatest(p_max, 0), 10)
    on conflict do nothing;
  end if;

  return query
    select i.*
    from public.resurface_picks p
    join public.items i on i.id = p.item_id
    where p.user_id = auth.uid() and p.pick_date = p_today and i.seen_at is null
    order by i.created_at asc;
end;
$$;

-- "Remind me again": clears seen_at on every item and today's picks.
create function public.resurface_reset()
returns void
language sql
security invoker
set search_path = public
as $$
  update public.items set seen_at = null where user_id = auth.uid() and seen_at is not null;
  delete from public.resurface_picks where user_id = auth.uid();
$$;

revoke all on function public.resurface_today(date, int, int) from public, anon;
revoke all on function public.resurface_reset() from public, anon;
grant execute on function public.resurface_today(date, int, int) to authenticated;
grant execute on function public.resurface_reset() to authenticated;
