import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      reportCompressedSize: false,
      sourcemap: !isProduction,
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ['recharts', 'd3'],
            motion: ['motion'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/ai': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
  };
});
