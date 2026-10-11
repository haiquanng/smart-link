// Deno mirror of src/lib/metadata.ts (authoritative + unit-tested there).
export interface PageMetadata {
  title?: string;
  image?: string;
  description?: string;
}

function fromCodePoint(code: number): string {
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
}

function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&');
}

function attr(tag: string, name: string): string | undefined {
  const m = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag);
  if (!m) return undefined;
  return m[2] ?? m[3];
}

export function parseMetadata(html: string): PageMetadata {
  const byKey: Record<string, string> = {};
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const key = (attr(tag, 'property') ?? attr(tag, 'name'))?.toLowerCase();
    const content = attr(tag, 'content');
    if (key && content && !(key in byKey)) byKey[key] = content;
  }

  const result: PageMetadata = {};
  const title = byKey['og:title'] ?? byKey['twitter:title'];
  const image =
    byKey['og:image'] ?? byKey['og:image:url'] ?? byKey['twitter:image'];

  const description = byKey['og:description'] ?? byKey['description'];
  if (description) {
    const cleaned = decodeEntities(description).replace(/\s+/g, ' ').trim();
    if (cleaned) result.description = cleaned;
  }

  if (title) result.title = decodeEntities(title).trim();
  if (!result.title) {
    const tm = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (tm) result.title = decodeEntities(tm[1]).replace(/\s+/g, ' ').trim();
  }
  if (image) {
    const cleaned = decodeEntities(image).trim();
    if (/^https?:\/\//i.test(cleaned)) result.image = cleaned;
  }

  if (result.title === '') delete result.title;
  return result;
}
