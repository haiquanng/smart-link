import { expect, test } from '@playwright/test';
import { liveConfigured, signIn } from './helpers';

test.skip(!liveConfigured, 'needs a live Supabase (see helpers.ts)');

// Web Push is paused: without VITE_VAPID_PUBLIC_KEY the whole push block is hidden.
const pushConfigured = !!process.env.VITE_VAPID_PUBLIC_KEY;

test('Settings shows the push block only when push is configured', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Cài đặt' }).first().click();
  // The Resurface card has rendered, so a missing push block is a real absence.
  await expect(page.getByRole('button', { name: 'Nhắc lại từ đầu' })).toBeVisible();
  const notice = page.getByText(/thêm Smart Link vào màn hình chính|chưa hỗ trợ thông báo/);
  if (pushConfigured) await expect(notice).toBeVisible();
  else await expect(notice).toHaveCount(0);
  // A browser tab is never the installed app, so the switch never shows here.
  await expect(page.getByRole('switch', { name: 'Nhắc tôi mỗi tối' })).toHaveCount(0);
});
