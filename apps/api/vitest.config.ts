import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.mjs'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
