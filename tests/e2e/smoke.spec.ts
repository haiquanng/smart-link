import { expect, test } from '@playwright/test';

test('boots to the sign-in screen at iPhone width', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Smart Link' }),
  ).toBeVisible();

  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Mật khẩu')).toBeVisible();

  const submit = page.getByRole('button', { name: 'Đăng nhập', exact: true });
  await expect(submit).toBeVisible();

  // Tap target at least 44px tall (coding standard).
  const box = await submit.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});
