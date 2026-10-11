import { z } from 'zod';

/**
 * Channels that can reach the ingest endpoint. Matches the `channel` enum in
 * the data model (architecture-overview.md). No chat-bot channel by product
 * decision. `shortcut` is the default: Phase 0 only exercises the iOS Shortcut.
 */
export const channelSchema = z
  .enum(['shortcut', 'paste', 'upload', 'share_target', 'extension', 'manual'])
  .default('shortcut');

export type Channel = z.infer<typeof channelSchema>;

/** Source app, classified from the URL. Matches the source_type DB enum. */
export const sourceSchema = z.enum([
  'facebook',
  'instagram',
  'threads',
  'substack',
  'web',
  'screenshot',
  'other',
]);

export type Source = z.infer<typeof sourceSchema>;

const trimmedOptional = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const httpUrl = trimmedOptional.refine(
  (value) => value === undefined || /^https?:\/\//i.test(value),
  { message: 'url must be http(s)' },
);

/** `{user_id}/{uuid}.ext` in the private `screenshots` bucket. */
export const IMAGE_PATH_PATTERN =
  /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

const imagePath = z.string().regex(IMAGE_PATH_PATTERN).optional();

/** Ingest only trusts an image the caller's own folder holds. */
export function imagePathOwnedBy(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/`);
}

/**
 * The ingest contract body. Shared so the Phase 0 spike server, the frontend
 * api layer, and the Phase 1 edge function all validate the same shape.
 * Business rule 2: at least one of url, note, or image_path.
 */
export const ingestPayloadSchema = z
  .object({
    url: httpUrl,
    note: trimmedOptional,
    channel: channelSchema,
    image_path: imagePath,
  })
  .refine(
    (value) =>
      value.url !== undefined ||
      value.note !== undefined ||
      value.image_path !== undefined,
    {
      message: 'at least one of url, note or image_path is required',
      path: ['url'],
    },
  );

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;

export function parseIngestPayload(
  input: unknown,
): z.SafeParseReturnType<unknown, IngestPayload> {
  return ingestPayloadSchema.safeParse(input);
}
