import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

export default defineConfig({
  root: here,
  resolve: {
    alias: {
      '@game-core': resolve(root, 'game-core/src'),
    },
  },
  build: {
    outDir: resolve(root, 'dist-wechat'),
    emptyOutDir: true,
    target: 'es2020',
    minify: false,
    lib: {
      entry: resolve(here, 'src/index.ts'),
      name: 'MathRushKidsWechat',
      formats: ['iife'],
      fileName: () => 'game.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
