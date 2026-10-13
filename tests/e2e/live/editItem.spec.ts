import { expect, test } from '@playwright/test';
import { admin, insertItem, liveConfigured, liveUserId, signIn } from './helpers';

test.skip(!liveConfigured, 'needs a live Supabase with functions served (see helpers.ts)');

test('edit the note and add a tag; search finds the new note', async ({ page }) => {
  const userId = await liveUserId();
  const stamp = Date.now();
  const itemId = await insertItem(userId, { note: `ghi chu cu ${stamp}`, url: 'https://example.com/e', source: 'web' });
  const tag = `edit${stamp % 100000}`;

  try {
    await signIn(page);
    const card = page.getByRole('article').filter({ hasText: `ghi chu cu ${stamp}` });
    await card.getByRole('button', { name: 'Sửa' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Ghi chú').fill(`bánh xèo miền Tây ${stamp}`);
    await sheet.getByLabel('Thêm thẻ').fill(tag);
    await sheet.getByRole('button', { name: 'Thêm', exact: true }).click();
    await expect(sheet.getByText(`#${tag}`)).toBeVisible();
    await sheet.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByText(`bánh xèo miền Tây ${stamp}`)).toBeVisible();

    await page.goto(`/search?q=${encodeURIComponent(`banh xeo mien tay ${stamp}`)}`);
    await expect(page.getByText(`bánh xèo miền Tây ${stamp}`)).toBeVisible();
  } finally {
    await admin(`/rest/v1/items?id=eq.${itemId}`, { method: 'DELETE' });
    await admin(`/rest/v1/tags?user_id=eq.${userId}&name=eq.${tag}`, { method: 'DELETE' });
  }
});
