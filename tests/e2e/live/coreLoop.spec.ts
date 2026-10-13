import { expect, test } from '@playwright/test';
import { admin, liveConfigured, liveUserId, marker, signIn } from './helpers';

// Testing rule: the core loop at 390x844, through the real ingest and search
// functions. Gemini is not configured locally, so search is full text only.
test.skip(!liveConfigured, 'needs a live Supabase with functions served (see helpers.ts)');

test('sign in, save, see it in Inbox, find it by note with and without diacritics', async ({ page }) => {
  const userId = await liveUserId();
  const tag = marker('core');
  const note = `cách định giá phần mềm ${tag}`;
  const url = `https://example.substack.com/p/${tag}`;

  try {
    await signIn(page);

    await page.getByPlaceholder('Dán link vào đây…').fill(url);
    await page.getByPlaceholder('Ghi chú của bạn (tuỳ chọn)').fill(note);
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(page.getByText('Đã lưu!')).toBeVisible();

    // The saved row (not the optimistic placeholder) is in Inbox after reload.
    await page.reload();
    const card = page.getByRole('article').filter({ hasText: note });
    await expect(card).toBeVisible();
    await expect(card.getByText('Substack', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Tìm kiếm' }).first().click();
    const box = page.getByRole('searchbox', { name: 'Tìm kiếm' });
    await box.fill(`định giá ${tag}`);
    await expect(page.getByRole('article').filter({ hasText: note })).toBeVisible();

    await box.fill(`dinh gia phan mem ${tag}`);
    await expect(page).toHaveURL(/q=dinh\+gia\+phan\+mem/);
    await expect(page.getByRole('article').filter({ hasText: note })).toBeVisible();

    await box.fill(`khong lien quan ${tag}xyz`);
    await expect(page.getByText('Không thấy gì cả')).toBeVisible();
  } finally {
    await admin(`/rest/v1/items?user_id=eq.${userId}&note=eq.${encodeURIComponent(note)}`, {
      method: 'DELETE',
    });
  }
});
