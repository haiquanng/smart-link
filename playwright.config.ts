import { defineConfig } from '@playwright/test';

// iPhone-width e2e (testing rule: 390x844). The dev server gets dummy anon env
// so the app boots without real credentials; the smoke test only needs the
// unauthenticated sign-in screen to render.
// E2E_PORT lets e2e run beside a dev server already using 5173 with real env.
const PORT = Number(process.env.E2E_PORT ?? 5173);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY:
        process.env.VITE_SUPABASE_ANON_KEY ?? 'test-anon-key',
    },
  },
});
