import { expect, test } from '@playwright/test';
import { admin, insertItem, liveConfigured, liveUserId, signIn } from './helpers';

test.skip(!liveConfigured, 'needs a live Supabase with functions served (see helpers.ts)');

test('owner shares a collection; a signed-out visitor sees it read-only', async ({ page, browser }) => {
  const userId = await liveUserId();
  const stamp = Date.now();
  const itemId = await insertItem(userId, { note: `secret note ${stamp}`, title: `Shared title ${stamp}`, url: 'https://example.com/x', source: 'web' });
  const [col] = (await admin('/rest/v1/collections', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, name: `Share ${stamp}` }),
  })) as { id: string }[];
  await admin('/rest/v1/collection_items', {
    method: 'POST',
    body: JSON.stringify({ collection_id: col.id, item_id: itemId, user_id: userId }),
  });

  try {
    await signIn(page);
    await page.goto(`/collections/${col.id}`);
    await page.getByRole('button', { name: 'Chia sẻ' }).click();
    await page.getByRole('switch', { name: 'Bật link chia sẻ' }).click();
    const linkBox = page.getByLabel('Sao chép link');
    await expect(linkBox).toHaveValue(/\/c\/[A-Za-z0-9_-]{24}$/);
    const link = await linkBox.inputValue();

    const visitor = await browser.newPage();
    await visitor.goto(link);
    await expect(visitor.getByRole('heading', { name: `Share ${stamp}` })).toBeVisible();
    await expect(visitor.getByText(`Shared title ${stamp}`)).toBeVisible();
    await expect(visitor.getByText(`secret note ${stamp}`)).toHaveCount(0);
    await expect(visitor.getByRole('button', { name: 'Xoá' })).toHaveCount(0);

    await page.getByRole('switch', { name: 'Bật link chia sẻ' }).click();
    await expect(page.getByRole('switch', { name: 'Bật link chia sẻ' })).toHaveAttribute('aria-checked', 'false');
    await visitor.reload();
    await expect(visitor.getByText('Link không còn hoạt động')).toBeVisible();
  } finally {
    await admin(`/rest/v1/collections?id=eq.${col.id}`, { method: 'DELETE' });
    await admin(`/rest/v1/items?id=eq.${itemId}`, { method: 'DELETE' });
  }
});
