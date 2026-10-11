import { defineConfig } from '@playwright/test';

// iPhone-width e2e (testing rule: 390x844). The dev server gets dummy anon env
// so the app boots without real credentials; the smoke test only needs the
// unauthenticated sign-in screen to render.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: 'npm run dev -- --port 5173',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY:
        process.env.VITE_SUPABASE_ANON_KEY ?? 'test-anon-key',
    },
  },
});
