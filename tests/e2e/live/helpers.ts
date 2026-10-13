import { expect, type Page } from '@playwright/test';

// Live specs run against a real (local) Supabase, without network mocks.
// They need the dev server built with that project's URL and anon key, e.g.
//   VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=<local anon> \
//   E2E_SERVICE_ROLE_KEY=<local service role> E2E_USER=<email:password> npm run test:e2e
// Plain fetch on purpose: Playwright's loader cannot import supabase-js.
const URL = process.env.VITE_SUPABASE_URL ?? '';
const KEY = process.env.E2E_SERVICE_ROLE_KEY ?? '';
const [EMAIL = '', PASSWORD = ''] = (process.env.E2E_USER ?? '').split(':');

export const liveConfigured = !!URL && !!KEY && !!EMAIL && !!PASSWORD;

const headers = () => ({
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
});

/** Service-role REST call; throws on a non-2xx answer. */
export async function admin(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${URL}${path}`, {
    ...init,
    headers: { ...headers(), Prefer: 'return=representation', ...init.headers },
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function liveUserId(): Promise<string> {
  const data = (await admin('/auth/v1/admin/users?per_page=1000')) as {
    users: { id: string; email: string }[];
  };
  const user = data.users.find((u) => u.email === EMAIL);
  if (!user) throw new Error(`no user ${EMAIL}`);
  return user.id;
}

/** Inserts an item for the live user and returns its id. */
export async function insertItem(userId: string, row: Record<string, unknown>): Promise<string> {
  const rows = (await admin('/rest/v1/items', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, source: 'other', channel: 'manual', ...row }),
  })) as { id: string }[];
  return rows[0].id;
}

/** Unique per call, so parallel specs never match each other's rows. */
export function marker(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function signIn(page: Page): Promise<void> {
  await page.goto('/inbox');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hộp lưu' })).toBeVisible();
}
