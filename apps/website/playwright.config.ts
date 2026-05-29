import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Smoke spec is intentionally lightweight — single browser, no retries.
  // E2E_BASE_URL points at the Vercel preview URL or the local dev server;
  // tests assume the target is already running.
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
