import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { admin, liveConfigured, liveUserId, marker, signIn } from './helpers';

// The POST share target only works through the built service worker, so this
// runs against `vite preview` of a production build: set E2E_PREVIEW=1 and
// E2E_PORT to the preview server (see development-workflow.md).
test.skip(!liveConfigured || !process.env.E2E_PREVIEW, 'needs a preview build and live Supabase');

const PNG = readFileSync(fileURLToPath(new URL('../../fixtures/shot-a.png', import.meta.url)));

test('an Android share with an image lands in /share and saves a screenshot item', async ({ page }) => {
  const userId = await liveUserId();
  const note = marker('sharepost');

  try {
    await signIn(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

    // What Chrome does for a share target: a multipart form POST navigation.
    await page.evaluate(
      ({ bytes }) => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/share-target';
        form.enctype = 'multipart/form-data';
        const text = Object.assign(document.createElement('input'), {
          name: 'text',
          value: 'xem cái này https://www.instagram.com/p/C9xYz12AbCd/',
        });
        const input = Object.assign(document.createElement('input'), { type: 'file', name: 'images' });
        const dt = new DataTransfer();
        dt.items.add(new File([new Uint8Array(bytes)], 'shot.png', { type: 'image/png' }));
        input.files = dt.files;
        form.append(text, input);
        document.body.append(form);
        form.submit();
      },
      { bytes: [...PNG] },
    );

    await expect(page).toHaveURL(/\/share\?incoming=1$/);
    await expect(page.getByLabel('Link')).toHaveValue('https://www.instagram.com/p/C9xYz12AbCd/');
    await expect(page.getByText('1 ảnh')).toBeVisible();
    await page.getByLabel('Ghi chú của bạn').fill(note);
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(page.getByText('Đã lưu vào Hộp lưu!')).toBeVisible();

    const rows = (await admin(
      `/rest/v1/items?user_id=eq.${userId}&note=eq.${note}&select=channel,image_path`,
    )) as { channel: string; image_path: string | null }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].channel).toBe('share_target');
    expect(rows[0].image_path).toMatch(new RegExp(`^${userId}/`));

    // Saved shares are cleared, so reopening offers nothing.
    await page.goto('/share?incoming=1');
    await expect(page.getByText('Không nhận được gì để lưu')).toBeVisible();
  } finally {
    await admin(`/rest/v1/items?user_id=eq.${userId}&note=eq.${note}`, { method: 'DELETE' });
  }
});
