/**
 * What the iOS Shortcut and share sheets actually send is messy: Instagram and
 * Threads wrap the link in text, some copies drop the scheme. Recover the link
 * instead of rejecting the save (business rule 1). Deno mirror of
 * src/lib/sharedUrl.ts (authoritative, unit-tested); keep them identical.
 */
export interface SharedUrl {
  url?: string;
  /** The input had no usable link; the caller keeps it as note text. */
  text?: string;
}

const EMBEDDED_URL = /https?:\/\/[^\s<>"']+/i;
const BARE_DOMAIN = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:[/?#]\S*)?$/i;
// Sentence punctuation glued to the end of a link inside a text blob.
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;

export function coerceSharedUrl(raw: string): SharedUrl {
  const value = raw.trim();
  if (!value) return {};

  const embedded = value.match(EMBEDDED_URL);
  if (embedded) return { url: embedded[0].replace(TRAILING_PUNCTUATION, '') };

  if (BARE_DOMAIN.test(value)) return { url: `https://${value}` };

  return { text: value };
}
