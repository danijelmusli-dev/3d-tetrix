import { defineConfig } from 'vitest/config';

/** Locks the built page to its own files. Build only: the dev server needs inline scripts and a websocket. */
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'";

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'content-security-policy',
      apply: 'build',
      transformIndexHtml: () => [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend',
        },
      ],
    },
  ],
  build: { chunkSizeWarningLimit: 800 },
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/core/**'],
      reporter: ['text', 'html'],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
