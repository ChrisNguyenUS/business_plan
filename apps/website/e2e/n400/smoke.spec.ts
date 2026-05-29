import { test, expect } from '@playwright/test';

// Phase 9 Task 2 — N400 smoke spec.
//
// Auth-free by design: every test exercises a public surface or a
// middleware-protected route's redirect behavior. Authenticated flows
// (mock-test, practice, profile) need a throwaway Supabase user created
// via service role + cleaned up after — too brittle for a v1 smoke
// spec, especially when CI doesn't always have network reach to the
// admin API. Promote to authenticated tests once we have a stable
// staging seed user.
//
// Run:
//   E2E_BASE_URL=https://<preview>.vercel.app npx playwright test e2e/n400/smoke.spec.ts

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

test.describe('N400 smoke (unauthenticated)', () => {
  test('dashboard redirects to login when not signed in', async ({ page }) => {
    await page.goto(`${BASE}/vi/n400app`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('setup redirects to login when not signed in', async ({ page }) => {
    await page.goto(`${BASE}/vi/n400app/setup`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('practice redirects to login when not signed in', async ({ page }) => {
    await page.goto(`${BASE}/vi/n400app/practice`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('mock-test redirects to login when not signed in', async ({ page }) => {
    await page.goto(`${BASE}/vi/n400app/mock-test`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders with email + password fields', async ({ page }) => {
    await page.goto(`${BASE}/vi/login`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
