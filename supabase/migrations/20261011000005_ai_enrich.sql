-- Phase 3 AI enrichment: title provenance, retry counter, 768-dim embeddings,
-- and a cron job that retries stuck items.
alter table public.items
  add column title_origin public.tag_origin,
  add column enrich_attempts int not null default 0;

-- gemini-embedding-2 at 768 dims. Nothing is embedded yet; null first so the
-- type change cannot fail on old 1024-dim values.
update public.items set embedding = null where embedding is not null;
alter table public.items alter column embedding type vector(768);
create index items_embedding_idx on public.items using hnsw (embedding vector_cosine_ops);

-- Uses the Vault secrets created for sweep-screenshots (project_url, cron_secret).
-- cron.schedule with an existing job name updates it, so re-running is safe.
select cron.schedule('retry-enrich', '*/15 * * * *', $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/enrich',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"retry_stuck": true}'::jsonb, timeout_milliseconds := 60000);
$cron$);
