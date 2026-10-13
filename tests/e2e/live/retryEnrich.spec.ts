import { expect, test } from '@playwright/test';
import { admin, insertItem, liveConfigured, liveUserId, marker, signIn } from './helpers';

test.skip(!liveConfigured, 'needs a live Supabase with functions served (see helpers.ts)');

test('retry on a failed card re-enriches it without a reload', async ({ page }) => {
  const userId = await liveUserId();
  const note = marker('retry');
  const itemId = await insertItem(userId, { note, status: 'enrich_failed', enrich_attempts: 3 });

  try {
    await signIn(page);
    const card = page.getByRole('article').filter({ hasText: note });
    await expect(card.getByText(/chưa xử lý được/)).toBeVisible();
    await card.getByRole('button', { name: 'Xử lý lại' }).click();
    await expect(card.getByText(/chưa xử lý được/)).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Xử lý lại' })).toHaveCount(0);
    const [row] = (await admin(`/rest/v1/items?id=eq.${itemId}&select=status`)) as { status: string }[];
    expect(row.status).toBe('ready');
  } finally {
    await admin(`/rest/v1/items?id=eq.${itemId}`, { method: 'DELETE' });
  }
});
