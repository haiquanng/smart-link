import { expect, test, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The backend is mocked at the network layer so this runs without a local
// Supabase stack. It covers the browser half: pick, downscale, upload, ingest,
// thumbnails, delete.
const API = 'http://localhost:54321';
const USER_ID = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';
const fixture = (name: string) =>
  fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
const PNG = readFileSync(fixture('shot-a.png'));

interface Row {
  id: string;
  image_path: string | null;
  note: string | null;
}

async function mockBackend(page: Page) {
  const rows: Row[] = [];
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': '*',
  };
  const ok = (route: Route, body: unknown, status = 200) =>
    route.fulfill({
      status,
      headers: { ...cors, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  await page.addInitScript(
    ([key, session]) => localStorage.setItem(key, session),
    [
      'sb-localhost-auth-token',
      JSON.stringify({
        access_token: 'test-jwt',
        refresh_token: 'test-refresh',
        token_type: 'bearer',
        expires_in: 36000,
        expires_at: Math.floor(Date.now() / 1000) + 36000,
        user: { id: USER_ID, aud: 'authenticated', email: 'a@b.co' },
      }),
    ],
  );

  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const { pathname } = new URL(req.url());
    if (req.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: cors });
    }
    if (pathname === '/rest/v1/items' && req.method() === 'GET') {
      return ok(
        route,
        rows.map((r) => ({
          ...r,
          url: null,
          url_normalized: null,
          source: 'screenshot',
          channel: 'upload',
          title: null,
          summary: null,
          content_text: null,
          preview_image_url: null,
          status: 'ready',
          seen_at: null,
          created_at: new Date().toISOString(),
        })),
      );
    }
    if (pathname === '/rest/v1/items' && req.method() === 'DELETE') {
      const id = new URL(req.url()).searchParams.get('id')?.replace('eq.', '');
      rows.splice(0, rows.length, ...rows.filter((r) => r.id !== id));
      return route.fulfill({ status: 204, headers: cors });
    }
    if (pathname.startsWith('/storage/v1/object/screenshots/')) {
      return ok(route, { Key: pathname });
    }
    if (pathname === '/storage/v1/object/sign/screenshots') {
      const { paths } = req.postDataJSON() as { paths: string[] };
      return ok(
        route,
        paths.map((path) => ({
          path,
          signedURL: `/object/sign/screenshots/${path}?token=t`,
        })),
      );
    }
    if (pathname.startsWith('/storage/v1/object/sign/screenshots/')) {
      return route.fulfill({
        status: 200,
        headers: { ...cors, 'content-type': 'image/png' },
        body: PNG,
      });
    }
    if (pathname === '/storage/v1/object/screenshots') {
      return ok(route, []);
    }
    if (pathname === '/functions/v1/ingest') {
      const body = req.postDataJSON() as { image_path: string; note?: string };
      rows.unshift({
        id: crypto.randomUUID(),
        image_path: body.image_path,
        note: body.note ?? null,
      });
      return ok(route, { status: 'pending', duplicate: false }, 201);
    }
    return ok(route, {}, 404);
  });
}

test('uploads two screenshots, shows thumbnails, deletes one', async ({ page }) => {
  await mockBackend(page);
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/');

  await page.getByPlaceholder('Ghi chú của bạn (tuỳ chọn)').fill('hai ảnh thử');
  await page
    .getByTestId('screenshot-input')
    .setInputFiles([fixture('shot-a.png'), fixture('shot-b.png')]);
  await expect(page.getByRole('button', { name: 'Bỏ ảnh' })).toHaveCount(2);

  const addButton = page.getByRole('button', { name: 'Thêm ảnh' });
  expect((await addButton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

  await page.getByRole('button', { name: 'Lưu', exact: true }).click();

  const cards = page.getByRole('article');
  await expect(cards).toHaveCount(2);
  await expect(cards.locator('img')).toHaveCount(2);
  await expect(cards.first().locator('img')).toHaveAttribute(
    'src',
    /object\/sign\/screenshots\//,
  );

  const del = cards.first().getByRole('button', { name: 'Xoá' });
  expect((await del.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  await del.click();
  await expect(cards).toHaveCount(1);
});
