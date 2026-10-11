// Deno mirror of src/lib/metadata.ts (authoritative + unit-tested there).
export interface PageMetadata {
  title?: string;
  image?: string;
}

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ');
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
