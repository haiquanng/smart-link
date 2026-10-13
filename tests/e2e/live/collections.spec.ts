import { expect, test } from '@playwright/test';
import { admin, insertItem, liveConfigured, liveUserId, signIn } from './helpers';

test.skip(!liveConfigured, 'needs a live Supabase (see helpers.ts)');

test('create a collection, add an item, rename, delete it', async ({ page }) => {
  const userId = await liveUserId();
  const marker = `e2e ${Date.now()}`;
  const name = `Quán ăn ${Date.now() % 10000}`;
  const itemId = await insertItem(userId, { note: marker });

  try {
    await signIn(page);

    await page.getByRole('link', { name: 'Bộ sưu tập' }).first().click();
    await page.getByLabel('Tên bộ sưu tập').fill(name);
    await page.getByRole('button', { name: 'Tạo', exact: true }).click();
    await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();

    await page.getByRole('link', { name: 'Hộp lưu' }).first().click();
    const card = page.getByRole('article').filter({ hasText: marker });
    await card.getByRole('button', { name: 'Thêm vào bộ sưu tập' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('checkbox', { name }).click();
    await expect(sheet.getByRole('checkbox', { name })).toHaveAttribute('aria-checked', 'true');
    await sheet.getByRole('button', { name: 'Đóng' }).last().click();

    await page.getByRole('link', { name: 'Bộ sưu tập' }).first().click();
    await page.getByRole('link', { name: new RegExp(name) }).click();
    await expect(page.getByText(marker)).toBeVisible();
    await expect(page.getByText('1 mục')).toBeVisible();

    await page.getByRole('button', { name: 'Đổi tên' }).click();
    await page.getByLabel('Tên bộ sưu tập').fill(`${name} mới`);
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(page.getByRole('heading', { name: `${name} mới` })).toBeVisible();

    await page.getByRole('button', { name: 'Xoá bộ sưu tập' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xoá bộ sưu tập' }).click();
    await expect(page).toHaveURL(/\/collections$/);
    await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(0);

    // Deleting the collection keeps the item.
    await page.getByRole('link', { name: 'Hộp lưu' }).first().click();
    await expect(page.getByText(marker)).toBeVisible();
  } finally {
    await admin(`/rest/v1/collections?user_id=eq.${userId}&name=like.${encodeURIComponent('Quán ăn*')}`, {
      method: 'DELETE',
    });
    await admin(`/rest/v1/items?id=eq.${itemId}`, { method: 'DELETE' });
  }
});
