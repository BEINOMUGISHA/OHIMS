import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (/[\\/]node_modules[\\/]three/.test(id)) return 'vendor-three';
            if (/[\\/]node_modules[\\/]@supabase/.test(id)) return 'vendor-supabase';
            if (/[\\/]node_modules[\\/]lucide-react/.test(id)) return 'vendor-lucide';
            if (/[\\/]node_modules[\\/](jspdf|html2canvas|dompurify)/.test(id)) return 'vendor-docs';
            if (/[\\/]node_modules[\\/]recharts/.test(id)) return 'vendor-charts';
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
