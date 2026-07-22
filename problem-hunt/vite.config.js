import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  loadEnv(mode, __dirname, '');

  return {
    root: __dirname,
    build: {
      outDir: path.resolve(__dirname, './dist'),
      emptyOutDir: true,
    },
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/app'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: true,
      middlewareMode: false,
      headers: {
        'Content-Security-Policy': `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://r2cdn.perplexity.ai data:; connect-src 'self' https://*.supabase.co https://*.ingest.us.sentry.io https://fonts.googleapis.com`
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: path.resolve(__dirname, './src/test/setup.ts'),
      globals: true,
      css: false,
    },
  };
});
