import { coerceSharedUrl } from '@/lib/sharedUrl';

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
}

export interface ParsedShare {
  url: string;
  /** Leftover caption or page title, shown as context, not saved as note. */
  context: string;
}

const EMBEDDED_URL = /https?:\/\/\S+/gi;

/**
 * Android apps put the link in `url`, `text` or even `title`, often inside a
 * caption (business rule 1: recover the link rather than reject the share).
 */
export function parseSharePayload(p: SharePayload): ParsedShare {
  const fields = [p.url, p.text, p.title].map((f) => f?.trim() ?? '');
  let url = '';
  for (const field of fields) {
    const found = field ? coerceSharedUrl(field).url : undefined;
    if (found) {
      url = found;
      break;
    }
  }
  // The caption beats the title: apps often set the title to their own name.
  const context =
    [p.text, p.title]
      .map((f) => (f ?? '').replace(EMBEDDED_URL, '').replace(/\s+/g, ' ').trim())
      .find((f) => f.length > 0) ?? '';
  return { url, context };
}
