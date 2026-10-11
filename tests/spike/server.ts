/**
 * Phase 0 spike capture server. NOT production ingest — a throwaway harness to
 * prove the iOS Shortcut path and record real payloads as fixtures. The real
 * endpoint is the Supabase `ingest` edge function (Phase 1), which reuses
 * `ingestPayloadSchema` from src/lib.
 *
 * Run:  SPIKE_INGEST_TOKEN=<token> npm run spike
 * Then expose it (e.g. `cloudflared tunnel --url http://localhost:8787`) and
 * point the Shortcut at <public-url>/ingest.
 */
import { createServer, type IncomingMessage } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseIngestPayload } from '@/lib/ingestPayload';

const PORT = Number(process.env.SPIKE_PORT ?? 8787);
const TOKEN = process.env.SPIKE_INGEST_TOKEN;

const here = dirname(fileURLToPath(import.meta.url));
const capturesDir = join(here, '..', 'fixtures', 'captures');

if (!TOKEN || TOKEN.length < 16) {
  console.error(
    'Set SPIKE_INGEST_TOKEN to a random 16+ char value before starting the spike server.',
  );
  process.exit(1);
}

/** Guess the source app from the URL so captured fixtures self-label. */
function detectSource(url: string | undefined): string {
  if (!url) return 'none';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('facebook') || host === 'fb.com') return 'facebook';
    if (host.includes('instagram')) return 'instagram';
    if (host.includes('threads')) return 'threads';
    if (host.includes('substack')) return 'substack';
    return 'web';
  } catch {
    return 'other';
  }
}

function tokenOk(header: string | undefined): boolean {
  const presented = header?.replace(/^Bearer\s+/i, '') ?? '';
  const a = Buffer.from(presented);
  const b = Buffer.from(TOKEN as string);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 1_000_000) throw new Error('payload too large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Exact-URL in-memory dedupe, only to exercise the duplicate response shape. */
const seenUrls = new Set<string>();

const server = createServer((req, res) => {
  void (async () => {
    const send = (code: number, body: Record<string, unknown>) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (req.method !== 'POST' || req.url !== '/ingest') {
      return send(404, { error: 'not found' });
    }
    if (!tokenOk(req.headers.authorization)) {
      return send(401, { error: 'invalid token' });
    }

    let raw: string;
    try {
      raw = await readBody(req);
    } catch {
      return send(413, { error: 'payload too large' });
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return send(400, { error: 'invalid json' });
    }

    const parsed = parseIngestPayload(json);
    if (!parsed.success) {
      return send(400, { error: 'invalid payload', issues: parsed.error.issues });
    }

    const payload = parsed.data;
    const source = detectSource(payload.url);
    const id = randomUUID();
    const duplicate = payload.url !== undefined && seenUrls.has(payload.url);
    if (payload.url) seenUrls.add(payload.url);

    // Persist the raw capture as a fixture (the point of the spike).
    const record = {
      id,
      receivedAt: new Date().toISOString(),
      source,
      channel: payload.channel,
      raw: json,
      parsed: payload,
    };
    await mkdir(capturesDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await writeFile(
      join(capturesDir, `${stamp}-${source}.json`),
      JSON.stringify(record, null, 2),
    );
    await appendFile(join(capturesDir, 'log.ndjson'), JSON.stringify(record) + '\n');

    // Rule: do not log URLs/notes at info level.
    console.log(`captured ${source} id=${id} duplicate=${duplicate}`);

    return send(duplicate ? 200 : 201, {
      id,
      status: 'pending',
      duplicate,
    });
  })();
});

server.listen(PORT, () => {
  console.log(`spike capture server on http://localhost:${PORT}/ingest`);
});
