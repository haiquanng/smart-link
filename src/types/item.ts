import type { Channel, Source } from '@/lib/ingestPayload';

export type ItemStatus = 'pending' | 'ready' | 'enrich_failed';

export interface Item {
  id: string;
  url: string | null;
  url_normalized: string | null;
  source: Source;
  channel: Channel;
  note: string | null;
  title: string | null;
  summary: string | null;
  content_text: string | null;
  image_path: string | null;
  preview_image_url: string | null;
  status: ItemStatus;
  seen_at: string | null;
  created_at: string;
}

export interface ApiToken {
  id: string;
  label: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}
