import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 800 },
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/core/**'],
      reporter: ['text', 'html'],
    },
  },
});
