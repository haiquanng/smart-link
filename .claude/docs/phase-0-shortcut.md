# Phase 0 — iOS Shortcut spike

Goal: prove the iOS Shortcut can POST a shared URL + a note to our ingest
endpoint, and record what Facebook, Instagram, Threads and Substack actually
hand the Shortcut. No UI, no real backend yet.

## 1. Run the capture server

```bash
export SPIKE_INGEST_TOKEN="$(openssl rand -hex 24)"   # 48 chars; keep it, you'll paste it into the Shortcut
echo "$SPIKE_INGEST_TOKEN"
npm run spike                                          # listens on http://localhost:8787/ingest
```

If port 8787 is taken, override it: `SPIKE_PORT=8911 npm run spike`.

## 2. Expose it over HTTPS (the Shortcut needs a public URL)

Use any tunnel, e.g.:

```bash
cloudflared tunnel --url http://localhost:8787
# or: ngrok http 8787
```

Copy the public `https://…` URL. Your endpoint is `<public-url>/ingest`.

## 3. Build the Shortcut (iPhone → Shortcuts app)

Create a new Shortcut, enable **Show in Share Sheet**, accept input types
**URLs** and **Text**, then add these actions in order:

1. **Receive** input from Share Sheet (URLs and Text).
2. **Text** action → value = `Shortcut Input` (captures whatever was shared,
   URL or blob — we want to see both).
3. **Ask for Input** (Text) → prompt "Ghi chú" → allow empty. This is the note
   (type or dictate).
4. **URL** action → set to `<public-url>/ingest`.
5. **Get Contents of URL**:
   - Method: `POST`
   - Headers: `Authorization` = `Bearer <SPIKE_INGEST_TOKEN>`,
     `Content-Type` = `application/json`
   - Request Body: **JSON**
     - `url` = the Text from step 2
     - `note` = the Ask for Input result from step 3
     - `channel` = `shortcut`
6. (Optional) **Show Result** of the previous action to see `{id,status}`.

> Note: the `url` field may receive a text blob rather than a clean URL for
> Instagram/Threads. That is expected — capturing it is the point of the spike.
> Phase 1's `normalizeUrl` will extract and clean it.

## 4. Capture the four sources

Open each app, Share → the Shortcut, add a short note:

- **Facebook** — share a post; prefer a `facebook.com/share/…` link to capture
  the redirect case.
- **Instagram** — share a reel/post (expect `igshid`, maybe a text blob).
- **Threads** — share a post.
- **Substack** — share an article (expect `utm_*`).

Each successful POST writes a file to `tests/fixtures/captures/` and a line to
`captures/log.ndjson`.

## 5. Record findings

For each source note in this file (or a PR comment) what was actually sent:
clean URL vs. text blob vs. no URL, and which tracking params appeared. Add the
real cleaned URLs to `tests/fixtures/urls.json`.

## Expected responses

- `201 {id,status:"pending",duplicate:false}` — saved.
- `200 {…,duplicate:true}` — same URL sent twice this session.
- `400` — neither url nor note, or bad JSON.
- `401` — missing/wrong bearer token.

## Privacy

`tests/fixtures/captures/*.json` and `log.ndjson` are git-ignored because they
can contain your private notes. Commit only sanitized URLs into
`tests/fixtures/urls.json`.
