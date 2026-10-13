import { expect, test } from '@playwright/test';
import { liveConfigured, signIn } from './helpers';

test.skip(!liveConfigured, 'needs a live Supabase (see helpers.ts)');

test('in a browser tab, Settings explains that push needs the Home Screen app', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Cài đặt' }).first().click();
  await expect(page.getByText(/thêm Smart Link vào màn hình chính|chưa hỗ trợ thông báo/)).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Nhắc tôi mỗi tối' })).toHaveCount(0);
});
