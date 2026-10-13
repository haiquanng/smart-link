import { expect, test } from '@playwright/test';
import { admin, insertItem, liveConfigured, liveUserId, signIn } from './helpers';

test.skip(!liveConfigured, 'needs a live Supabase (see helpers.ts)');

test('an old unseen item resurfaces and stays gone after dismiss', async ({ page }) => {
  const userId = await liveUserId();
  const marker = `resurface e2e ${Date.now()}`;
  // Older than anything else the live user has, so it is always picked.
  const itemId = await insertItem(userId, { note: marker, created_at: '2000-01-01T00:00:00Z' });

  try {
    await signIn(page);
    await page.getByRole('link', { name: 'Nhắc lại' }).first().click();
    const card = page.getByRole('listitem').filter({ hasText: marker });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Bỏ qua' }).click();
    await expect(page.getByText(marker)).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Nhắc lại' })).toBeVisible();
    await expect(page.getByText(marker)).toHaveCount(0);
  } finally {
    await admin(`/rest/v1/items?id=eq.${itemId}`, { method: 'DELETE' });
    await admin(`/rest/v1/resurface_picks?user_id=eq.${userId}`, { method: 'DELETE' });
  }
});
