-- Per-user profile row. Auth itself lives in auth.users (Supabase manages
-- email + hashed password); this holds app-level profile data and is the
-- table app code joins against. Created automatically on signup via a trigger.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_owner on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Insert a profile whenever a new auth user is created. SECURITY DEFINER so it
-- can write to public.profiles from the auth insert context.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any users that already exist.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
