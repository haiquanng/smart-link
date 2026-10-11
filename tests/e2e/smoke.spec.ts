import { expect, test } from '@playwright/test';

test('boots to the sign-in screen at iPhone width', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Smart Link' }),
  ).toBeVisible();

  const email = page.getByLabel('Email');
  await expect(email).toBeVisible();

  const send = page.getByRole('button', { name: 'Gửi link đăng nhập' });
  await expect(send).toBeVisible();

  // Tap target at least 44px tall (coding standard).
  const box = await send.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});
