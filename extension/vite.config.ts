import { defineConfig, loadEnv, type Plugin } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Builds the Chrome extension into extension/dist (load it unpacked).
// The ingest URL comes from VITE_SUPABASE_URL and is also the only host the
// extension may call (minimal permissions).
const root = fileURLToPath(new URL('.', import.meta.url));

function manifest(supabaseUrl: string): Plugin {
  return {
    name: 'smart-link-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(
          {
            manifest_version: 3,
            name: 'Smart Link',
            version: '0.1.0',
            description: 'Lưu link vào Smart Link kèm ghi chú.',
            action: { default_popup: 'popup.html', default_icon: { 192: 'icon-192.png' } },
            icons: { 192: 'icon-192.png' },
            background: { service_worker: 'background.js', type: 'module' },
            permissions: ['activeTab', 'storage', 'contextMenus'],
            host_permissions: [`${new URL(supabaseUrl).origin}/*`],
          },
          null,
          2,
        ),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), 'VITE_');
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL is required to build the extension');
  return {
    root,
    publicDir: false,
    define: { __INGEST_URL__: JSON.stringify(`${new URL(supabaseUrl).origin}/functions/v1/ingest`) },
    plugins: [manifest(supabaseUrl)],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: { popup: `${root}popup.html`, background: `${root}src/background.ts` },
        output: { entryFileNames: '[name].js', chunkFileNames: '[name].js', assetFileNames: '[name][extname]' },
      },
    },
  };
});
