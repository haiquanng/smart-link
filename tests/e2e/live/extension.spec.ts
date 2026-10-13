import { chromium, expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { admin, liveConfigured, liveUserId, marker } from './helpers';

// Loads the built extension (npm run build:extension, same VITE_SUPABASE_URL)
// into Chromium and drives its popup against the live ingest function.
const DIST = fileURLToPath(new URL('../../../extension/dist', import.meta.url));
const TOKEN = process.env.SMART_LINK_INGEST_TOKEN ?? '';

test.skip(!liveConfigured || !TOKEN || !existsSync(`${DIST}/manifest.json`), 'needs the built extension and a live Supabase');

test('popup saves the current tab with a note on the extension channel', async () => {
  const userId = await liveUserId();
  const note = marker('ext');
  const pageUrl = `https://example.com/article/${note}`;
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
  });

  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const extensionId = new URL(worker.url()).host;
    const popup = await context.newPage();
    // In a real popup the active tab is the page being read; here the popup
    // is itself the active tab, so report the article instead.
    await popup.addInitScript((url) => {
      const c = (globalThis as unknown as { chrome: { tabs: { query: unknown } } }).chrome;
      c.tabs.query = async () => [{ url, title: 'Bài viết thử' }];
    }, pageUrl);
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(popup.getByText('Dán token từ Smart Link')).toBeVisible();
    await popup.getByLabel(/Token/).fill('wrong-token');
    await popup.getByRole('button', { name: 'Lưu token' }).click();
    await popup.getByRole('textbox').first().fill(note);
    await popup.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(popup.getByText(/Token không đúng/)).toBeVisible();

    await popup.getByLabel(/Token/).fill(TOKEN);
    await popup.getByRole('button', { name: 'Lưu token' }).click();
    await popup.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(popup.getByText('Đã lưu!')).toBeVisible();

    const rows = (await admin(
      `/rest/v1/items?user_id=eq.${userId}&note=eq.${note}&select=channel,url`,
    )) as { channel: string; url: string }[];
    expect(rows).toEqual([{ channel: 'extension', url: pageUrl }]);
  } finally {
    await context.close();
    await admin(`/rest/v1/items?user_id=eq.${userId}&note=eq.${note}`, { method: 'DELETE' });
  }
});
