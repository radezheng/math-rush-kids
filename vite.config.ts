import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@game-core': resolve(__dirname, 'game-core/src'),
    },
  },
  server: {
    port: 4173,
  },
});
