/**
 * Seeds a LOCAL Supabase for integration and live e2e tests: two confirmed
 * users and an ingest api token for the first. Prints `KEY=value` lines for
 * the test env (CI appends them to $GITHUB_ENV). Refuses non-local URLs so it
 * can never touch production.
 *   API_URL=http://127.0.0.1:54321 SERVICE_ROLE_KEY=... ANON_KEY=... npm run seed:local
 */
import { createHash, randomBytes } from 'node:crypto';

const API_URL = process.env.API_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY ?? '';
const ANON_KEY = process.env.ANON_KEY ?? '';
const PASSWORD = 'test-pass-123';

if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(API_URL)) {
  throw new Error(`seed-local only runs against a local stack, got "${API_URL}"`);
}
if (!SERVICE_ROLE_KEY || !ANON_KEY) throw new Error('SERVICE_ROLE_KEY and ANON_KEY are required');

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

async function ensureUser(email: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  if (res.ok) return ((await res.json()) as { id: string }).id;
  const list = await fetch(`${API_URL}/auth/v1/admin/users?per_page=1000`, { headers });
  const { users } = (await list.json()) as { users: { id: string; email: string }[] };
  const found = users.find((u) => u.email === email);
  if (!found) throw new Error(`could not create ${email}: ${res.status}`);
  return found.id;
}

const userA = await ensureUser('a@test.local');
const userB = await ensureUser('b@test.local');

const token = `itest-${randomBytes(24).toString('hex')}`;
const tokenRes = await fetch(`${API_URL}/rest/v1/api_tokens`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    user_id: userA,
    token_hash: createHash('sha256').update(token).digest('hex'),
    label: 'local tests',
  }),
});
if (!tokenRes.ok) throw new Error(`token insert failed: ${tokenRes.status}`);

const env: Record<string, string> = {
  SMART_LINK_URL: API_URL,
  SMART_LINK_ANON_KEY: ANON_KEY,
  SMART_LINK_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
  SMART_LINK_TEST_USER_ID: userA,
  SMART_LINK_OTHER_USER_ID: userB,
  SMART_LINK_USER_A: `a@test.local:${PASSWORD}`,
  SMART_LINK_USER_B: `b@test.local:${PASSWORD}`,
  SMART_LINK_INGEST_URL: `${API_URL}/functions/v1/ingest`,
  SMART_LINK_INGEST_TOKEN: token,
  VITE_SUPABASE_URL: API_URL.replace('127.0.0.1', 'localhost'),
  VITE_SUPABASE_ANON_KEY: ANON_KEY,
  E2E_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
  E2E_USER: `a@test.local:${PASSWORD}`,
};
for (const [k, v] of Object.entries(env)) console.log(`${k}=${v}`);
