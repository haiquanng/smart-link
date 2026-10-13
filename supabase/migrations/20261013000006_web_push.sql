-- Web Push reminders for Resurface (business rule 17). One row per device.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  time_zone text not null default 'Asia/Ho_Chi_Minh',
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_owner on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- How many items each subscribed user could get resurfaced right now (same
-- rule as resurface_today: unseen, >= 3 days old). Used by send-reminders
-- (service role) to skip users with nothing to show.
create function public.resurface_candidates(p_users uuid[], p_min_age_days int default 3)
returns table (user_id uuid, candidates int)
language sql
stable
security definer
set search_path = public
as $$
  select i.user_id, count(*)::int
  from public.items i
  where i.user_id = any (p_users)
    and i.seen_at is null
    and i.created_at <= now() - make_interval(days => p_min_age_days)
  group by i.user_id;
$$;
revoke all on function public.resurface_candidates(uuid[], int) from public, anon, authenticated;
grant execute on function public.resurface_candidates(uuid[], int) to service_role;

-- Hourly; the function sends only where it is the reminder hour locally.
-- Same Vault secrets as the other jobs (project_url, cron_secret).
select cron.schedule('send-reminders', '5 * * * *', $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
$cron$);
