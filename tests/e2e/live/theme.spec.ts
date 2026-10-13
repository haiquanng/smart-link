import { expect, test } from '@playwright/test';
import { liveConfigured, signIn } from './helpers';

test.skip(!liveConfigured, 'needs a live Supabase (see helpers.ts)');

test('a chosen theme applies at once and comes back from the profile on another device', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings');
  try {
    await page.getByRole('radio', { name: 'Tối' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('radio', { name: 'Tối' })).toHaveAttribute('aria-checked', 'true');

    // "Another device": nothing cached locally, the profile still says dark.
    await page.evaluate(() => localStorage.removeItem('smart-link-theme'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  } finally {
    await page.getByRole('radio', { name: 'Mặc định' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'default');
  }
});
