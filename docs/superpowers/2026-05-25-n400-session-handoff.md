# N400 App — Session Handoff (2026-05-25)

> **Purpose:** read this first when resuming the n400app build. Tells you exactly where things stand, what's safe to ship, and what to do next.

---

## TL;DR

**Phase 1 (DB + seed) and v1-cleanup are done.** The /n400app route surface (9 pages) now reads/writes user state through Supabase instead of localStorage. **Phase 2 (audio pipeline) has NOT run yet — do not deploy to prod until it does.**

Last commit on `main`: `d7b001d refactor(n400): strip localStorage hook from storage.ts` (already on `origin/main`).

---

## What's done

### Phase 1 — DB schema + seed (complete, verified)
- 8 tables in `apps/website/supabase/migrations/n400_01_tables.sql` with full RLS
- 128 questions seeded (EN+VI) — `n400_02_state_data.sql` covers 56 jurisdictions
- 640 manually-authored distractors — `n400_03_distractors.sql` (Q1–Q128, 5 each; Q29 is 5 fictional rep placeholders since the correct rep injects from `n400_representatives` at runtime)
- 441 representatives derived from `apps/website/N400_voice/State/*/House of rep/<district>/<First_Last>.mp3`
- `n400_bookmarks` table added post-spec — `n400_04_bookmarks.sql`
- `apps/website/scripts/n400/verify-seed.ts` passes 8 integrity checks. Run with:
  ```
  cd apps/website
  export NEXT_PUBLIC_SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)
  export SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2-)
  npx tsx scripts/n400/verify-seed.ts
  ```

### v1 cleanup — data layer swap (complete)
- `/n400app` and all subroutes are auth-gated in `src/middleware.ts` (signed-in `client` or `admin` only)
- `src/lib/n400/user-state.ts` exports `useN400UserState` — Supabase-backed replacement for the old localStorage hook. Same return shape, so each page was a one-line import swap.
- All 9 v1 pages migrated: `n400app/{page,practice,mock-test,flashcards,bookmark,profile,statistic,categories}` plus the shared `components/n400/Header.tsx`
- `src/lib/n400/storage.ts` stripped of localStorage logic — kept only types (`MockResult`, `QuizMode`, etc.) and the pure `nextStreak` helper
- **UI is unchanged.** Visual layouts, copy, components are exactly v1.

### Spec + plan alignment (complete)
- `docs/superpowers/specs/2026-05-13-n400app-design.md` route list expanded from 6 → 10. Now includes `/bookmark`, `/profile`, `/statistic`, `/categories` (kept from v1). `n400_bookmarks` added to data model. Whole `/n400app` surface auth-gated; spec previously said "except landing".
- Master plan + Phase 3/4/5/6 plans each got a "UI source of truth = v1 components" note so future executors know to swap data, not redesign.

---

## What is NOT done (and why it matters)

### Phase 2 — Audio pipeline ⚠️ blocks production deploy
- ~854 MP3 files under `apps/website/N400_voice/` need to be uploaded to Supabase Storage bucket `n400-audio`
- DB columns `n400_questions.question_audio_url`, `n400_answers.answer_audio_url`, `n400_representatives.rep_audio_url` need to point at Storage URLs (currently most are NULL or static `/n400-audio/...` paths)
- The `/public/n400-audio` symlink (commit `2fca6ab`) is **dev-only** — Vercel does NOT include symlink targets in production builds, so audio 404s in prod
- `src/lib/n400/quiz-engine.ts` has 5 URL builder functions (`questionAudioUrl`, `answerAudioUrl`, `senatorAudioUrl`, `governorAudioUrl`, `capitalAudioUrl`) that all assume the static `/n400-audio/...` path — these need to read from DB columns instead
- Plan: `docs/superpowers/plans/2026-05-13-n400app-phase-2-audio-pipeline.md`

### Phase 3 — Auth + Setup form (pending)
- Google + Facebook OAuth providers in Supabase Auth
- `/n400app/setup` form (state + zipcode → Geocodio → district → save to `n400_user_profile`)
- Upstash Redis rate limiting for Geocodio
- Plan: `docs/superpowers/plans/2026-05-13-n400app-phase-3-auth-setup.md`

### Phases 4–9 — quiz engine, modes, streak, gamification, admin, analytics, launch
- All plans exist under `docs/superpowers/plans/2026-05-13-n400app-phase-{4..9}.md` plus `2026-05-24-n400app-phase-6b-gamification.md`

### Loose ends inside what's "done"
- `/n400app/all-questions` — spec route, not yet built. Belongs to Phase 5.
- `recordMockResult` in `useN400UserState` writes a single `n400_quiz_attempts` envelope client-side. Spec §4 says mock pass/fail MUST be computed server-side via a server action that reads `n400_question_attempts` and writes `passed` itself. Phase 4 replaces this.
- `recordAnswer` for practice/flashcard creates a one-row quiz envelope per answer. That's fine for v1 but Phase 5 will batch them into one envelope per session.
- Header avatar still hard-codes "Liberty Learner!" + dicebear seed=Felix (cosmetic, replace in Phase 3 when real OAuth lands).

---

## Important architectural notes for future-you

- **MockResult pass/fail is currently client-trusted.** Phase 4 changes that. Don't ship to real users without server-side scoring.
- **`n400_user_profile` row is created lazily** via upsert on first `recordAnswer`/`updateSettings` call. There is no INSERT trigger. `/setup` (Phase 3) will be the first place a fresh user lands.
- **Q29 (your representative) has zero `is_correct=true` rows in `n400_answers`.** That's intentional — at quiz time the engine reads the user's `district_number` from `n400_user_profile` and joins `n400_representatives` to inject the correct answer. Don't "fix" this by inserting a correct row.
- **Q23/Q61/Q62 location answers live in `n400_location_answers`,** not in `n400_answers`. The runtime query needs to UNION those in for location-based questions.
- **Distractors use `display_order >= 100`** so re-running `seed-questions.ts` (which clears + re-inserts correct rows with display_order 0..N) does not wipe them.
- **State data senators are current as of 2025-Q4.** Recheck `n400_02_state_data.sql` before any 2026 election cycle launch.

---

## Files I'd open first next session

| File | What it tells you |
|---|---|
| `docs/superpowers/plans/2026-05-13-n400app-master.md` | Phase index + UI-source-of-truth note added 2026-05-25 |
| `docs/superpowers/plans/2026-05-13-n400app-phase-2-audio-pipeline.md` | The next phase's task list |
| `apps/website/src/lib/n400/user-state.ts` | The new hook every page calls |
| `apps/website/src/lib/n400/quiz-engine.ts` | URL helpers that need updating in Phase 2 |
| `apps/website/scripts/n400/verify-seed.ts` | Re-run anytime DB content changes |

---

## Suggested first move next session

> "Read `docs/superpowers/2026-05-25-n400-session-handoff.md` and `docs/superpowers/plans/2026-05-13-n400app-phase-2-audio-pipeline.md`. Then start Phase 2."
