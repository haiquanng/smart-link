import { ingestBody, ingestOutcome, screenshotPath, type Outcome } from './ingest';
import { getSession, supabase } from './session';

declare const __INGEST_URL__: string;
const BUCKET = 'screenshots';

/**
 * Saves through the single ingest endpoint with the user's session, like the
 * web app. A screenshot is uploaded to the user's folder first; ingest then
 * checks ownership and that the object exists. Never logs tokens or notes.
 */
export async function save(url: string, note: string, image?: Blob): Promise<Outcome> {
  const session = await getSession();
  if (!session) return 'signed-out';

  let imagePath: string | undefined;
  if (image) {
    imagePath = screenshotPath(session.user.id, crypto.randomUUID());
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(imagePath, image, { contentType: 'image/jpeg', upsert: false });
    if (error) return 'error';
  }

  let outcome: Outcome;
  try {
    const res = await fetch(__INGEST_URL__, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(ingestBody(url, note, imagePath)),
    });
    outcome = ingestOutcome(res.status, await res.json().catch(() => null));
  } catch {
    outcome = 'error';
  }

  // Best effort; the daily sweep removes anything left behind.
  if (imagePath && outcome !== 'saved' && outcome !== 'duplicate') {
    await supabase.storage.from(BUCKET).remove([imagePath]);
  }
  return outcome;
}
