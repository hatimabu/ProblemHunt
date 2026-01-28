import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, './dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index-react.html'),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'rename-index',
      generateBundle(options, bundle) {
        const htmlFile = Object.keys(bundle).find(name => name.endsWith('.html'));
        if (htmlFile && htmlFile !== 'index.html') {
          bundle['index.html'] = bundle[htmlFile];
          delete bundle[htmlFile];
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/app'),
    },
  },
});
