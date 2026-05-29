import { defineConfig } from 'vitest/config';

// Vitest is for the unit + integration tests under src/. Playwright owns
// anything under e2e/ (different runner, different test API). Without
// this exclude, vitest greedily collects e2e/n400/smoke.spec.ts and
// fails on the Playwright `test.describe` call.
export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e/**', 'dist'],
  },
});
