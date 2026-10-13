import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        importScripts: ['share-target-sw.js', 'push-sw.js'],
        // The POST is answered by the imported handler, never by the shell.
        navigateFallbackDenylist: [/^\/share-target/],
      },
      manifest: {
        name: 'Smart Link',
        short_name: 'Smart Link',
        description: 'Personal link vault',
        theme_color: '#fafaf9',
        background_color: '#fafaf9',
        display: 'standalone',
        start_url: '/',
        // Android only; iOS PWAs cannot be share targets (iOS uses the Shortcut).
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [{ name: 'images', accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/*'] }],
          },
        },
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'extension/src/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
