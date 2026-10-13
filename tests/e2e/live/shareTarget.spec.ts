import { expect, test } from '@playwright/test';
import { admin, liveConfigured, liveUserId, marker, signIn } from './helpers';

test.skip(!liveConfigured, 'needs a live Supabase with functions served (see helpers.ts)');

test('a shared link (GET fallback) is saved with a note via share_target', async ({ page }) => {
  const userId = await liveUserId();
  const note = marker('share');
  const shared = `https://www.threads.net/@user/post/${note}`;

  try {
    await signIn(page);
    await page.goto(`/share?title=Threads&text=${encodeURIComponent(`Bài hay ${shared}`)}`);
    await expect(page.getByText('Bài hay')).toBeVisible();
    await expect(page.getByLabel('Link')).toHaveValue(shared);
    await page.getByLabel('Ghi chú của bạn').fill(note);
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(page.getByText('Đã lưu vào Hộp lưu!')).toBeVisible();

    const rows = (await admin(
      `/rest/v1/items?user_id=eq.${userId}&note=eq.${note}&select=channel,source,url`,
    )) as { channel: string; source: string; url: string }[];
    expect(rows).toEqual([{ channel: 'share_target', source: 'threads', url: shared }]);
  } finally {
    await admin(`/rest/v1/items?user_id=eq.${userId}&note=eq.${note}`, { method: 'DELETE' });
  }
});
