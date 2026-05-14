# N400 App — Phase 9: Pre-Launch Verification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run data verification scripts, smoke test all user flows end-to-end, verify analytics fire correctly, and confirm the app is ready to ship.

**Architecture:** Verification scripts in `scripts/n400/`. Playwright E2E tests against Vercel preview URL. Manual smoke test checklist.

**Tech Stack:** `tsx` scripts, Playwright, Supabase.

**Prerequisite:** All phases 1-8 complete. Deployed to Vercel preview URL.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `scripts/n400/verify-seed.ts` | Already exists (Phase 1) | Re-run to confirm DB integrity |
| `scripts/n400/verify-audio.ts` | Create | Verify all audio URLs return 200 |
| `e2e/n400/smoke.spec.ts` | Create | Playwright E2E smoke tests |

---

## Task 1: Verify audio URLs are accessible

**Files:**
- Create: `apps/website/scripts/n400/verify-audio.ts`

- [ ] **Step 1: Create audio verification script**

Create `apps/website/scripts/n400/verify-audio.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

async function main() {
  let errors = 0

  // Check question audio
  const { data: questions } = await supabase
    .from('n400_questions')
    .select('id, question_audio_url')
    .order('id')

  console.log('Checking question audio...')
  for (const q of questions ?? []) {
    if (!q.question_audio_url) {
      console.error(`❌ Q${q.id}: missing question_audio_url`)
      errors++
      continue
    }
    const ok = await checkUrl(q.question_audio_url)
    if (!ok) { console.error(`❌ Q${q.id}: audio URL returns non-200`); errors++ }
    else process.stdout.write(`\rQ${q.id}/128 ✓`)
  }

  // Check correct answer audio
  const { data: answers } = await supabase
    .from('n400_answers')
    .select('id, question_id, answer_audio_url')
    .eq('is_correct', true)

  console.log('\nChecking answer audio...')
  let checked = 0
  for (const a of answers ?? []) {
    if (!a.answer_audio_url) {
      console.error(`❌ Answer ${a.id} (Q${a.question_id}): missing answer_audio_url`)
      errors++
      continue
    }
    const ok = await checkUrl(a.answer_audio_url)
    if (!ok) { console.error(`❌ Answer ${a.id}: audio URL returns non-200`); errors++ }
    checked++
    process.stdout.write(`\r${checked}/${answers?.length} ✓`)
  }

  console.log(`\n\n${errors === 0 ? '✅ All audio URLs accessible' : `❌ ${errors} audio errors found`}`)
  if (errors > 0) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Run verification**

```bash
cd apps/website
NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
  npx tsx scripts/n400/verify-audio.ts
```

Expected: `✅ All audio URLs accessible`

- [ ] **Step 3: Re-run seed verification**

```bash
NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
  npx tsx scripts/n400/verify-seed.ts
```

Expected: `✅ All checks passed. Phase 1 complete.`

- [ ] **Step 4: Commit**

```bash
git add apps/website/scripts/n400/verify-audio.ts
git commit -m "feat(n400): add audio URL verification script"
```

---

## Task 2: Playwright E2E smoke tests

**Files:**
- Create: `apps/website/e2e/n400/smoke.spec.ts`

- [ ] **Step 1: Install Playwright if not present**

```bash
cd apps/website && npm install --save-dev @playwright/test@1.49.1
npx playwright install chromium
```

Add to `package.json` scripts:
```json
"e2e": "playwright test"
```

- [ ] **Step 2: Create smoke test**

Create `apps/website/e2e/n400/smoke.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'test@example.com'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'testpassword123'

test.describe('N400 App Smoke Tests', () => {
  test('landing page loads and shows CTA', async ({ page }) => {
    await page.goto(`${BASE_URL}/vi/n400app`)
    await expect(page.getByText('Luyện Thi Quốc Tịch Mỹ')).toBeVisible()
    await expect(page.getByText('Bắt đầu học')).toBeVisible()
  })

  test('unauthenticated user redirected to login from /practice', async ({ page }) => {
    await page.goto(`${BASE_URL}/vi/n400app/practice`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('login flow works', async ({ page }) => {
    await page.goto(`${BASE_URL}/vi/login`)
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    // Should redirect to n400app or setup
    await expect(page).toHaveURL(/\/n400app/)
  })

  test('setup form shows bilingual helper text', async ({ page }) => {
    // Assumes test user has no profile yet, or navigate directly
    await page.goto(`${BASE_URL}/vi/n400app/setup`)
    await expect(page.getByText('Cho biết bạn đang ở đâu')).toBeVisible()
    await expect(page.getByText('Where do you live?')).toBeVisible()
    await expect(page.getByText('Hạ nghị sĩ')).toBeVisible()
  })

  test('dashboard shows 4 mode cards', async ({ page }) => {
    // Assumes test user is logged in and has profile
    await page.goto(`${BASE_URL}/vi/n400app`)
    await expect(page.getByText('Luyện Tập')).toBeVisible()
    await expect(page.getByText('Thi Thử')).toBeVisible()
    await expect(page.getByText('Thẻ Ghi Nhớ')).toBeVisible()
    await expect(page.getByText('Xem Tất Cả')).toBeVisible()
  })

  test('mock test start page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/vi/n400app/mock-test`)
    await expect(page.getByText('Thi Thử Quốc Tịch')).toBeVisible()
    await expect(page.getByText('20 câu hỏi')).toBeVisible()
    await expect(page.getByText('12 câu')).toBeVisible()
  })

  test('all questions page loads 128 questions', async ({ page }) => {
    await page.goto(`${BASE_URL}/vi/n400app/all-questions`)
    await expect(page.getByText('128 Câu Hỏi Thi Quốc Tịch')).toBeVisible()
    // Check first question is visible
    await expect(page.getByText('#1')).toBeVisible()
  })

  test('disclaimer footer visible on all n400 pages', async ({ page }) => {
    for (const path of ['/n400app', '/n400app/mock-test', '/n400app/all-questions']) {
      await page.goto(`${BASE_URL}/vi${path}`)
      await expect(page.getByText('Không phải tư vấn pháp lý')).toBeVisible()
    }
  })
})
```

- [ ] **Step 3: Create playwright.config.ts if not present**

Create `apps/website/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
```

- [ ] **Step 4: Run smoke tests against preview URL**

```bash
cd apps/website
E2E_BASE_URL=https://<your-preview>.vercel.app \
E2E_TEST_EMAIL=<test-email> \
E2E_TEST_PASSWORD=<test-password> \
  npx playwright test e2e/n400/smoke.spec.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/website/e2e/n400/smoke.spec.ts apps/website/playwright.config.ts \
        apps/website/package.json apps/website/package-lock.json
git commit -m "test(n400): add Playwright E2E smoke tests"
```

---

## Task 3: Manual smoke test checklist

Run through this checklist manually on the Vercel preview URL before going live.

- [ ] **Auth flows**
  - [ ] Sign up with email → verify email → login → redirected to setup
  - [ ] Sign up with Google OAuth → redirected to setup
  - [ ] Sign up with Facebook OAuth → redirected to setup
  - [ ] Login with existing account → redirected to dashboard (not setup)

- [ ] **Setup flow**
  - [ ] Fill in Houston address (e.g. 9800 Bellaire Blvd, Houston, TX 77036) → submit → district resolved → dashboard
  - [ ] Verify Q29 answer shows correct Houston-area rep in mock test
  - [ ] Verify Q23 shows John Cornyn and Ted Cruz
  - [ ] Verify Q61 shows Greg Abbott
  - [ ] Verify Q62 shows Austin

- [ ] **Mock Test**
  - [ ] Start mock test → 20 questions load → audio plays on first question
  - [ ] Answer 12 correct → test stops early → pass screen shows
  - [ ] Start new test → answer 9 wrong → test stops early → fail screen with breakdown
  - [ ] Refresh mid-test → resume prompt appears → can continue
  - [ ] Disclaimer footer visible

- [ ] **Daily Practice**
  - [ ] Set slider to 5 → start → 5 questions → result screen
  - [ ] Set slider to 20 → start → 20 questions → result screen

- [ ] **Flashcards**
  - [ ] Cards load → flip works → audio plays on front and back
  - [ ] Mark all → done screen shows count

- [ ] **View All 128**
  - [ ] All 128 questions visible in accordion
  - [ ] Expand Q1 → correct answers visible

- [ ] **Streak**
  - [ ] Complete a practice session → streak badge appears in header
  - [ ] Complete another session same day → streak stays same (no double count)

- [ ] **Audio**
  - [ ] Question audio auto-plays on load
  - [ ] Repeat button replays audio
  - [ ] Correct answer audio plays after answering

- [ ] **Admin**
  - [ ] Login as admin → `/admin/n400` shows 128 questions
  - [ ] Edit Q1 text → save → public page reflects change
  - [ ] State data page shows 50 states
  - [ ] Representatives page shows 435 reps

- [ ] **Analytics (check in Meta Events Manager + GA4 DebugView)**
  - [ ] `n400_mock_test_start` fires on test start
  - [ ] `n400_mock_test_pass` fires via CAPI when passing
  - [ ] `n400_setup_complete` fires via CAPI after setup

- [ ] **Performance**
  - [ ] Lighthouse mobile score ≥ 80 on `/n400app`
  - [ ] First load < 3s on 4G throttle

---

## Task 4: Update ROADMAP.md

- [ ] **Step 1: Mark N400 app as shipped in ROADMAP**

In `docs/ROADMAP.md`, add under Track 2:

```markdown
- [x] **Website Phase 3B — N400 Civics Test App** — Bilingual practice app at mannaos.com/n400app. Mock test (12/20 pass), Daily Practice, Flashcards, View All 128. Google OAuth + Facebook OAuth. Geocodio district lookup. Google Cloud TTS audio. Streak system. Server-side Meta CAPI for conversions.
```

- [ ] **Step 2: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: mark N400 civics test app as shipped in roadmap"
```

---

## Phase 9 Complete ✅ — App is live

All verification scripts pass. E2E smoke tests pass. Manual checklist complete. Analytics firing correctly. N400 app is live at `mannaos.com/n400app`.
