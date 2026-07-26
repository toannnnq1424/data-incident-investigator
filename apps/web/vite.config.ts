import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { createViteBundleAttributionPlugin } from '../../scripts/bundle-attribution.mjs';

export default defineConfig({
  plugins: [react(), createViteBundleAttributionPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
