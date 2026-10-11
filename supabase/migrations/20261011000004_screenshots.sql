-- Screenshot upload: private bucket, owner-only storage RLS, orphan sweep.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy screenshots_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 1
    and storage.filename(name) ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$');
create policy screenshots_select_own on storage.objects for select to authenticated
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy screenshots_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- no update policy: objects immutable after ingest verifies them

create index items_image_path_idx on public.items (image_path) where image_path is not null;

create or replace function public.orphan_screenshots(max_rows int default 1000)
returns setof text language sql stable security definer set search_path = '' as $$
  select o.name from storage.objects o
  where o.bucket_id = 'screenshots' and o.created_at < now() - interval '24 hours'
    and not exists (select 1 from public.items i where i.image_path = o.name)
  order by o.created_at limit greatest(1, least(max_rows, 1000));
$$;
revoke all on function public.orphan_screenshots(int) from public, anon, authenticated;
grant execute on function public.orphan_screenshots(int) to service_role;

-- Vault secrets created by hand (not in git): project_url, cron_secret
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('sweep-screenshots', '17 3 * * *', $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/sweep-screenshots',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 10000);
$cron$);
