import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const apiBaseUrl =
    env.VITE_API_BASE_URL ||
    env.VITE_API_BASE ||
    'https://problemhunt-api.azurewebsites.net';

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
      middlewareMode: false,
      headers: {
        'Content-Security-Policy': `default-src 'self' ${env.VITE_SUPABASE_URL || 'https://*.supabase.co'}; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' https://r2cdn.perplexity.ai; connect-src 'self' ${env.VITE_SUPABASE_URL || 'https://*.supabase.co'} https://*.supabase.co https://*.ingest.us.sentry.io http://localhost:7072 http://localhost:7071`
      },
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization);
              }
            });
          },
        },
      },
    },
  };
});
