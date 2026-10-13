import { chromium, expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { admin, liveConfigured, liveUser, liveUserId, marker } from './helpers';

// Loads the built extension (npm run build:extension, same VITE_SUPABASE_URL)
// into Chromium and drives its popup against the live ingest function.
const DIST = fileURLToPath(new URL('../../../extension/dist', import.meta.url));
test.skip(!liveConfigured || !existsSync(`${DIST}/manifest.json`), 'needs the built extension and a live Supabase');

test('popup signs in, saves the tab on the extension channel, then shows it as saved', async () => {
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

    await expect(popup.getByText('Đăng nhập bằng tài khoản Smart Link')).toBeVisible();
    await popup.getByLabel('Email').fill(liveUser.email);
    await popup.getByLabel('Mật khẩu').fill('wrong-password');
    await popup.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(popup.getByText('Email hoặc mật khẩu không đúng.')).toBeVisible();

    await popup.getByLabel('Mật khẩu').fill(liveUser.password);
    await popup.getByRole('button', { name: 'Đăng nhập' }).click();
    // Wait for the signed-in view: until then the Email box is the first
    // textbox, and on a slow runner the note would be typed into it.
    await expect(popup.getByText(liveUser.email)).toBeVisible();
    // Not a site that blocks reading, so no screenshot by default.
    await expect(popup.getByLabel('Kèm ảnh chụp màn hình')).not.toBeChecked();
    await popup.getByPlaceholder('Ghi chú của bạn (tuỳ chọn)').fill(note);
    await popup.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(popup.getByText('Đã lưu!')).toBeVisible();

    // Reopened, the popup knows the page is saved from its on-device list.
    // (A fresh page: after a save the popup closes itself.)
    const again = await context.newPage();
    await again.addInitScript((url) => {
      const c = (globalThis as unknown as { chrome: { tabs: { query: unknown } } }).chrome;
      c.tabs.query = async () => [{ url, title: 'Bài viết thử' }];
    }, pageUrl);
    await again.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(again.getByText('Trang này đã có trong Smart Link.')).toBeVisible();

    const rows = (await admin(
      `/rest/v1/items?user_id=eq.${userId}&note=eq.${note}&select=channel,url`,
    )) as { channel: string; url: string }[];
    expect(rows).toEqual([{ channel: 'extension', url: pageUrl }]);
  } finally {
    await context.close();
    await admin(`/rest/v1/items?user_id=eq.${userId}&note=eq.${note}`, { method: 'DELETE' });
  }
});
