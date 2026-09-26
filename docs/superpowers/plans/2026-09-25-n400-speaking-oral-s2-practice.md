# N400 Speaking Oral Answers — Slice S2 (Practice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Learners can switch What-mean and Yes/No practice to **Tự nói** and answer by voice (or typing in in-app browsers). Answers are graded by the S1 grader and recorded with `answer_mode`, behind a new `voice_speaking` flag.

**Architecture:**
- **One client hook**, `useSpokenPractice`, holds the voice state for a practice session: the switch, the mic, grading through `gradeSpokenItem`, the near prompt, the Yes/No re-ask, and the iOS 🔊 rules.
  - Each item's answer is one object tagged with its item id, so a new item starts clean without any reset.
  - The rules are pure functions in `spoken-practice.ts`: the answer transitions, what to count and record, and how the answer is recorded (`answer_mode`). Node tests cover them.
- **Both quizzes use it:** `SectionYesNoQuiz` and `SectionMCQuiz` (practice variant only) render the Civics `AnswerModeToggle` + `MicAnswerPanel` in place of their answer buttons.
- **Sessions:** both practice pages key their quiz by the session seed, so Làm lại and Ôn câu sai start a fresh session in Trắc nghiệm. This also fixes a bug: they used to show the old summary again.
- **Data:** migration `n400_34` adds `answer_mode` to the Speaking tables and seeds the flag OFF. Choice answers insert exactly as before.

**Tech Stack:** Next.js 16 (client components only; no routing or server APIs change — `apps/website/AGENTS.md`), TypeScript, vitest in node (page and component wiring is pinned by source-reading tests, the repo convention; `jsdom` and `@testing-library/react` are not `apps/website` dependencies, and the one jsdom test reaches them only through the monorepo's hoisted `node_modules`), Supabase (migration applied through the MCP after owner approval).

**Spec:** `docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md` (rev 1.1: §4, §6, §7, §8; Gate S1 passed). Builds on `docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md` (rev 3.16).

## Global Constraints

- **Scope:** `apps/website/` only. All commands run from `apps/website/`.
- **Speaking must reuse the Civics UI exactly** (`AnswerModeToggle`, `MicAnswerPanel`, the "Bạn nói: …" line). No new visual components; the only panel change is one optional `prompt` prop.
- **Every practice session opens in Trắc nghiệm** (spec S8, rev 1.1): a new start, Làm lại and Ôn câu sai each open a fresh session. Within a session, Tự nói stays on from item to item.
- **D7:** a confirmed near ("Đúng vậy") is shown correct but not recorded: no `n400_section_attempts` row, so it never counts for "thuộc", review debt or streak. Its `n400_oral_answer` event is still sent with `confirmedNear: true` (Civics spec §9).
- **D8:** a near-match only gives `near`.
- **Yes/No `unclear` is not a verdict:** the answer keeps `verdict: null` with `reask: true`. Nothing is counted or recorded, the item stays open, and the learner is asked again. Its analytics event has `verdict: 'unclear'`.
- **The Full interview (`SectionMCQuiz` exam mode) must not change in S2.** Its voice is slice S4.
- **iOS 🔊 rules (Civics rev 3.12):**
  - every 🔊 on these screens passes `onBeforePlay` and `preferWebAudio={mic.sessionRunning}`;
  - `<audio>` playback deafens a persistent session for 20–33 s.
- **The new hook never sets state during render or in an effect.** `react-hooks/set-state-in-effect` is an ESLint **error** in this repo. Tasks that touch components run `npx eslint` on their files and expect no problems. The one known warning is the pre-existing `applyStreak` in `user-state.tsx`.
- **Hubs are untouched** (the no-scroll hub rule); only session screens change.
- **No DB or flag writes** except applying `n400_34` and enabling `voice_speaking` for the owner at Gate S2. Both need owner approval.
- **Gate commands, run separately:** `npm run type-check`, `npm run test` (the known pre-existing `mobile-layout.test.ts` failure excepted), `npm run build`.
- **Commits:** one logical change each, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings carried into this plan

1. **The flags table's text column is `note`**, not `description` (`n400_32` uses `note`). The spec §6 SQL was fixed in spec rev 1.1.
2. **`answer_mode` is sent only for voice/typed answers,** the rule `practiceAttemptRow` already follows. `sectionAttemptRow` sits next to it in `attempt-row.ts` and reuses its `AnswerMode`: a second `AnswerMode` does not compile in `user-state.tsx` (found by a dry run of this plan). `'choice'` is the column default, so choice answers insert exactly as before `n400_34`. Code can ship before the migration is applied; the flag that turns voice on is created by the migration.
3. **🔊 while a capture window is open would be transcribed as the answer** (S1 final review, minor 2). The hook's `beforeAudio` drops an open window (`mic.state === 'listening'` → `reset()`) before noting the playback.
4. **Yes/No's slow 🔊 (rate 0.7) is hidden while an item is answered by voice.** `AudioButton` uses Web Audio only at rate 1, and `<audio>` would deafen the iOS session (rev 3.12). The normal 🔊 stays.
5. **`useSpokenPractice` lives in `components/n400/oral/`** next to `VoiceMicProvider`; its decisions live in `lib/n400/oral/spoken-practice.ts` so node tests cover them. Rule of three: the Civics practice page, `SectionYesNoQuiz` and `SectionMCQuiz` need the same state machine. The Civics page keeps its own copy (not refactored in S2).

From the plan review (2026-09-25), settled with the owner:

6. **Per-item state is one answer object tagged with its item id** (P0-1). `answerFor(stored, itemId)` returns a fresh answer when the stored one belongs to another item, so moving on needs no reset.
   - There is no reset during render and no `useEffect` reset. An effect reset would show the previous item's answer for one frame, and `setState` in an effect fails lint here.
   - The mic reset stays an effect: the mic is an external system, and resetting it sets no React state.
7. **The mic-lost latch is derived in render and latched in handlers.** `micLost = micLatched || stalled` shows the typed box at once. `onSubmit` and `changeMode` latch it, because the next item's mic reset clears the error. It resets with the session when the quiz remounts: a new session tries the mic again, and a still-deaf session is caught again after 4 silent tries.
8. **D7 and analytics do not conflict** (P0-2). "Not recorded" means no attempt row. The `n400_oral_answer` event with `confirmedNear` is sent, because the Civics spec §9 derives the confirmation rate from it.
9. **`unclear` is not a verdict** (P1-3): the answer has `verdict: null` and `reask: true`. Sequence tests run on the real grader.
10. **`spokenInput(voiceInput, micLost)` is pure** (P1-4). The chain Facebook iOS UA → typed box → `answer_mode = 'typed'` is tested end to end in node.
11. **Practice quizzes are keyed by the session seed** (session persistence).
    - `SectionMCQuiz` and `SectionYesNoQuiz` never reset `index` or the counts, and `done = index >= questions.length`. So Làm lại and Ôn câu sai re-rendered the old summary.
    - The key fixes that and resets Tự nói per session (owner's choice, spec rev 1.1).
    - What-mean already has `mode.seed`; Yes/No gets one.

## Review Focus

1. **iOS + Yes/No slow 🔊 in Tự nói** must not be offered: it would silence the mic for 20–33 s. Pinned in Task 7.
2. **🔊 tapped while the mic is listening** must not be graded as the answer. Several Yes/No questions contain "not", so the question audio would grade as a correct "No". Pinned in Task 5 (hook) and Tasks 7–8 (every 🔊 uses `beforeAudio`).
3. **A Yes/No "I don't know", then a real answer.** The re-ask leaves the item open: no count, no record, the mic ready. Then "No, officer" grades correct and is recorded, and "Yes" grades wrong. Pinned in Task 4 (sequences on the real grader) and Task 5 (hook).
4. **Làm lại / Ôn câu sai must start a real new session:** question 1, counts at 0, Trắc nghiệm. Inside a session, Tự nói must stay on for the next item. Pinned in Task 6 (key), Task 5 (only the switch sets the mode) and Task 4 (an answer holds no mode).
5. **The Full interview must be unchanged:** no switch and no mic in exam mode. Pinned in Task 8.

---

### Task 1: Migration `n400_34_speaking_voice.sql` (spec §6)

**Files:**
- Create: `apps/website/supabase/migrations/n400_34_speaking_voice.sql`
- Test: `apps/website/src/lib/n400/oral/speaking-migration.test.ts`

**Interfaces:**
- Produces:
  - `n400_section_attempts.answer_mode`, `n400_section_mock_results.answer_mode` (`TEXT NOT NULL DEFAULT 'choice'`, CHECK in choice/voice/typed);
  - flag row `voice_speaking` (enabled FALSE, rollout 100).

- [ ] **Step 1: Write the failing test**

Create `speaking-migration.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Speaking spec §6. The migration runs on the shared Supabase project after owner
// approval; this pins what it does.
const sql = readFileSync(join(process.cwd(), 'supabase/migrations/n400_34_speaking_voice.sql'), 'utf8');

describe('n400_34_speaking_voice', () => {
  it('adds answer_mode to both Speaking tables, defaulting to choice', () => {
    for (const table of ['n400_section_attempts', 'n400_section_mock_results']) {
      expect(sql).toContain(`ALTER TABLE public.${table}\n  ADD COLUMN IF NOT EXISTS answer_mode TEXT NOT NULL DEFAULT 'choice';`);
      expect(sql).toContain(`ADD CONSTRAINT ${table}_answer_mode_check`);
    }
    expect(sql.match(/CHECK \(answer_mode IN \('choice', 'voice', 'typed'\)\)/g)).toHaveLength(2);
  });

  it('seeds voice_speaking OFF, using the flags table note column', () => {
    expect(sql).toContain("('voice_speaking', FALSE, 100,");
    expect(sql).toContain('(flag_key, enabled, rollout_pct, note)');
    expect(sql).toContain('ON CONFLICT (flag_key) DO NOTHING');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/oral/speaking-migration.test.ts`
Expected: FAIL: `ENOENT … n400_34_speaking_voice.sql`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/n400_34_speaking_voice.sql`:

```sql
-- N400 Speaking oral answers — Slice S2 (practice).
-- Spec: docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md §6.
-- Adds answer_mode to the Speaking tables (practice attempts + mock results) and
-- seeds the voice_speaking kill switch OFF. Backward compatible: both columns
-- default to 'choice', so existing inserts do not change.

ALTER TABLE public.n400_section_attempts
  ADD COLUMN IF NOT EXISTS answer_mode TEXT NOT NULL DEFAULT 'choice';

ALTER TABLE public.n400_section_mock_results
  ADD COLUMN IF NOT EXISTS answer_mode TEXT NOT NULL DEFAULT 'choice';

DO $$
BEGIN
  ALTER TABLE public.n400_section_attempts
    ADD CONSTRAINT n400_section_attempts_answer_mode_check
    CHECK (answer_mode IN ('choice', 'voice', 'typed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.n400_section_mock_results
    ADD CONSTRAINT n400_section_mock_results_answer_mode_check
    CHECK (answer_mode IN ('choice', 'voice', 'typed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.n400_feature_flags (flag_key, enabled, rollout_pct, note) VALUES
  ('voice_speaking', FALSE, 100, 'Speaking (What-mean, Yes/No) + Full interview voice answers. Kill switch; Android also needs voice_android.')
ON CONFLICT (flag_key) DO NOTHING;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/n400/oral/speaking-migration.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/n400_34_speaking_voice.sql src/lib/n400/oral/speaking-migration.test.ts
git commit -m "feat(n400app): migration n400_34 — answer_mode on Speaking tables, voice_speaking flag

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: STOP — owner approval, then apply**

Ask the owner to approve applying `n400_34` to the shared Supabase project. After a yes:
- apply it with the MCP `apply_migration` (name `n400_34_speaking_voice`, the file's SQL);
- verify with `execute_sql`:

```sql
SELECT table_name, column_default FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'answer_mode'
  AND table_name IN ('n400_section_attempts', 'n400_section_mock_results') ORDER BY table_name;
SELECT conname FROM pg_constraint
WHERE conname IN ('n400_section_attempts_answer_mode_check', 'n400_section_mock_results_answer_mode_check') ORDER BY conname;
SELECT flag_key, enabled, rollout_pct FROM public.n400_feature_flags WHERE flag_key = 'voice_speaking';
```

Expected:
- 2 rows with `'choice'::text`;
- 2 constraint names;
- `voice_speaking | false | 100`.

Code in later tasks does not depend on the migration having run (ruling 2). Only enabling the flag at Gate S2 does.

---

### Task 2: Recording `answer_mode` + the `speakingOn` flag (spec §6, §7)

**Files:**
- Modify: `apps/website/src/lib/n400/attempt-row.ts` (add `sectionAttemptRow` next to `practiceAttemptRow`; `AnswerMode` already lives here)
- Test: `apps/website/src/lib/n400/attempt-row.test.ts` (append)
- Modify: `apps/website/src/lib/n400/user-state.tsx` (`recordSectionAnswer`)
- Modify: `apps/website/src/lib/n400/oral/use-voice-flags.ts`
- Test: `apps/website/src/lib/n400/oral/use-voice-flags.test.ts`

**Interfaces:**
- Consumes: `AnswerMode = 'choice' | 'voice' | 'typed'` (existing, `attempt-row.ts`, from the Civics work).
- Produces:
  - `sectionAttemptRow(userId, section, itemId, wasCorrect, mode, answerMode = 'choice'): SectionAttemptRow` (`attempt-row.ts`)
  - `recordSectionAnswer(section, itemId, wasCorrect, mode, answerMode?: AnswerMode)`
  - `VoiceFlags.speakingOn: boolean`

- [ ] **Step 1: Write the failing tests**

In `src/lib/n400/attempt-row.test.ts`, replace `import { practiceAttemptRow } from './attempt-row';` with `import { practiceAttemptRow, sectionAttemptRow } from './attempt-row';`, then append:

```ts
describe('sectionAttemptRow (speaking spec §6)', () => {
  it('a choice answer inserts exactly as before n400_34 (no answer_mode)', () => {
    expect(sectionAttemptRow('u1', 'yesno', 'yn-1', true, 'practice')).toEqual({
      user_id: 'u1',
      section: 'yesno',
      item_id: 'yn-1',
      mode: 'practice',
      was_correct: true,
    });
    expect(sectionAttemptRow('u1', 'yesno', 'yn-1', true, 'practice', 'choice')).not.toHaveProperty('answer_mode');
  });

  it('voice and typed answers carry answer_mode', () => {
    expect(sectionAttemptRow('u1', 'whatmean', 'wm-7', false, 'practice', 'voice')).toMatchObject({ answer_mode: 'voice' });
    expect(sectionAttemptRow('u1', 'whatmean', 'wm-7', true, 'practice', 'typed')).toMatchObject({ answer_mode: 'typed' });
  });
});
```

Create `src/lib/n400/oral/use-voice-flags.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin the hook's flag wiring by source (speaking spec §7).
const src = readFileSync(join(process.cwd(), 'src/lib/n400/oral/use-voice-flags.ts'), 'utf8');

describe('useVoiceFlags — voice_speaking', () => {
  it('loads voice_speaking with the other voice flags', () => {
    expect(src).toContain("['voice_practice', 'voice_android', 'voice_mock', 'voice_speaking']");
  });

  it('exposes speakingOn, OFF until loaded', () => {
    expect(src).toContain("speakingOn: isFeatureOn(byKey.get('voice_speaking'), user.id)");
    expect(src).toMatch(/const OFF: VoiceFlags = \{[^}]*speakingOn: false/);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/n400/attempt-row.test.ts src/lib/n400/oral/use-voice-flags.test.ts`
Expected: FAIL. The two new row tests fail with `sectionAttemptRow is not a function`; the two flag tests fail on `toContain` / `toMatch`. The existing `practiceAttemptRow` tests pass.

- [ ] **Step 3: Implement**

`AnswerMode` and the "choice omits answer_mode" rule already live in `src/lib/n400/attempt-row.ts` (`practiceAttemptRow`, Civics). The section row goes next to it. A second `AnswerMode` would clash in `user-state.tsx`, which already imports this one.

In `src/lib/n400/attempt-row.ts`, replace the header comment

```ts
// One-row quiz-attempt envelope for practice/flashcard answers (see
// recordAnswer in user-state.tsx). Spec §5 / §7 (oral answers rev 3.3).
```

with

```ts
// One-row attempt envelopes for practice/flashcard answers (see recordAnswer and
// recordSectionAnswer in user-state.tsx). Civics oral spec §5 / §7 (rev 3.3);
// speaking spec §6.
```

and append:

```ts
/** One n400_section_attempts row (Speaking/Writing practice and flashcards). Like
 *  practiceAttemptRow, `choice` omits answer_mode: the column defaults to 'choice',
 *  so choice answers insert exactly as before n400_34 (speaking spec §6). */
export interface SectionAttemptRow {
  user_id: string;
  section: string;
  item_id: string;
  mode: string;
  was_correct: boolean;
  answer_mode?: AnswerMode;
}

export function sectionAttemptRow(
  userId: string,
  section: string,
  itemId: string,
  wasCorrect: boolean,
  mode: string,
  answerMode: AnswerMode = 'choice',
): SectionAttemptRow {
  const row: SectionAttemptRow = { user_id: userId, section, item_id: itemId, mode, was_correct: wasCorrect };
  return answerMode === 'choice' ? row : { ...row, answer_mode: answerMode };
}
```

In `src/lib/n400/user-state.tsx`, replace `import { practiceAttemptRow, type AnswerMode } from './attempt-row';` with `import { practiceAttemptRow, sectionAttemptRow, type AnswerMode } from './attempt-row';`.

Replace the `recordSectionAnswer` parameter list

```ts
      section: SectionKey,
      itemId: string,
      wasCorrect: boolean,
      mode: QuizMode,
    ): Promise<{ milestone: number | null; unlockedBadges: string[] }> => {
```

with

```ts
      section: SectionKey,
      itemId: string,
      wasCorrect: boolean,
      mode: QuizMode,
      answerMode: AnswerMode = 'choice',
    ): Promise<{ milestone: number | null; unlockedBadges: string[] }> => {
```

and its insert

```ts
        .from('n400_section_attempts')
        .insert({
          user_id: user.id,
          section,
          item_id: itemId,
          mode,
          was_correct: wasCorrect,
        })
```

with

```ts
        .from('n400_section_attempts')
        .insert(sectionAttemptRow(user.id, section, itemId, wasCorrect, mode, answerMode))
```

In `src/lib/n400/oral/use-voice-flags.ts`:

1. Replace the comment line `// voice_practice, voice_mock (kill switches) + voice_android (D14). All OFF` with `// voice_practice, voice_mock, voice_speaking (kill switches) + voice_android (D14). All OFF`.
2. In `interface VoiceFlags`, after `mockOn: boolean;`, add `speakingOn: boolean;`.
3. Replace `const OFF: VoiceFlags = { practiceOn: false, androidOn: false, mockOn: false, loaded: false };` with `const OFF: VoiceFlags = { practiceOn: false, androidOn: false, mockOn: false, speakingOn: false, loaded: false };`.
4. Replace `['voice_practice', 'voice_android', 'voice_mock']` with `['voice_practice', 'voice_android', 'voice_mock', 'voice_speaking']`.
5. After `mockOn: isFeatureOn(byKey.get('voice_mock'), user.id),`, add `speakingOn: isFeatureOn(byKey.get('voice_speaking'), user.id),`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/n400/attempt-row.test.ts src/lib/n400/oral/use-voice-flags.test.ts && npx tsc --noEmit`
Expected: PASS (row 2 existing + 2 new, flags 2); type-check 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/attempt-row.ts src/lib/n400/attempt-row.test.ts src/lib/n400/user-state.tsx src/lib/n400/oral/use-voice-flags.ts src/lib/n400/oral/use-voice-flags.test.ts
git commit -m "feat(n400app): record answer_mode for Speaking answers; voice_speaking flag in useVoiceFlags

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Analytics — `section` and `unclear` (spec §8)

**Files:**
- Modify: `apps/website/src/lib/n400/analytics.ts`
- Modify: `apps/website/src/lib/n400/oral/oral-events.ts`
- Test: `apps/website/src/lib/n400/analytics.test.ts`, `apps/website/src/lib/n400/oral/oral-events.test.ts` (update and append)

**Interfaces:**
- Produces:
  - `type OralSection = 'civics' | 'whatmean' | 'yesno'`
  - `OralAnswerEvent.section: OralSection`
  - `OralAnswerEvent.verdict: OralVerdict | 'unclear' | 'none'`
  - `practiceAnswerEvent(qid, input, verdict: OralVerdict | 'unclear', confirmedNear, transcript, section: OralSection = 'civics')`
  - `micErrorEvent(qid, context, error, section: OralSection = 'civics')`
  - `mockAnswerEvents(...)`: every event has `section: 'civics'`.
- Existing Civics call sites need no change (the defaults cover them).

- [ ] **Step 1: Update and write the failing tests**

In `src/lib/n400/analytics.test.ts`:
- in `const base: OralAnswerEvent = {`, after `qid: 69,` add `section: 'civics',`;
- in the first test's expected GA payload, after `qid: 69,` add `section: 'civics',`;
- then append:

```ts
describe('trackOralAnswer — Speaking (speaking spec §8)', () => {
  it('sends the section and a Yes/No unclear verdict', () => {
    trackOralAnswer({ ...base, qid: 7, section: 'yesno', verdict: 'unclear' });
    expect(ga.mock.calls[0][1]).toMatchObject({ qid: 7, section: 'yesno', verdict: 'unclear' });
  });
});
```

In `src/lib/n400/oral/oral-events.test.ts`:
- in the `practiceAnswerEvent` expected object, after `qid: 69,` add `section: 'civics',`;
- in the `micErrorEvent` expected object, after `qid: 12,` add `section: 'civics',`;
- then append:

```ts
describe('Speaking sections (speaking spec §8)', () => {
  it('practice events carry the item section and allow unclear', () => {
    expect(practiceAnswerEvent(3, 'mic', 'unclear', null, "I don't know", 'yesno')).toMatchObject({
      qid: 3,
      section: 'yesno',
      verdict: 'unclear',
    });
  });

  it('mic errors and mock answers default to civics', () => {
    expect(micErrorEvent(12, 'practice', 'no-speech', 'whatmean').section).toBe('whatmean');
    expect(mockAnswerEvents([21], [said('100')], [{ qid: 21, wasCorrect: true }])[0].section).toBe('civics');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/n400/analytics.test.ts src/lib/n400/oral/oral-events.test.ts`
Expected: FAIL: the payload lacks `section`; `section` is `undefined`.

- [ ] **Step 3: Implement**

In `src/lib/n400/analytics.ts`, replace

```ts
/** One voice/typed answer outcome, or one mic error (spec §9). */
export interface OralAnswerEvent {
  qid: number;
  context: 'practice' | 'mock';
  input: 'mic' | 'typed';
  /** 'none' for a mic error event. */
  verdict: OralVerdict | 'none';
```

with

```ts
/** Which interview part a spoken answer belongs to (speaking spec §8). */
export type OralSection = 'civics' | 'whatmean' | 'yesno';

/** One voice/typed answer outcome, or one mic error (spec §9). */
export interface OralAnswerEvent {
  qid: number;
  section: OralSection;
  context: 'practice' | 'mock';
  input: 'mic' | 'typed';
  /** 'none' for a mic error event; 'unclear' for a Yes/No answer that was re-asked. */
  verdict: OralVerdict | 'unclear' | 'none';
```

and in `trackOralAnswer`, after `qid: e.qid,` add `section: e.section,`.

In `src/lib/n400/oral/oral-events.ts`:

1. Replace `import type { OralAnswerEvent } from '@/lib/n400/analytics';` with `import type { OralAnswerEvent, OralSection } from '@/lib/n400/analytics';`.
2. Replace the `practiceAnswerEvent` function with:

```ts
/** Practice: a graded answer, a near answer the learner confirmed or denied, or a
 *  Yes/No answer that was neither (unclear → re-asked). */
export function practiceAnswerEvent(
  qid: number,
  input: 'mic' | 'typed',
  verdict: OralVerdict | 'unclear',
  confirmedNear: boolean | null,
  transcript: string,
  section: OralSection = 'civics',
): OralAnswerEvent {
  return {
    qid,
    section,
    context: 'practice',
    input,
    verdict,
    retried: null,
    confirmedNear,
    error: 'none',
    transcriptLength: transcript.length,
  };
}
```

3. Replace the `micErrorEvent` function with:

```ts
/** A mic error while answering: no verdict, no transcript. Always `input: 'mic'`,
 *  since only the mic errors; the page's input has already flipped to 'typed'
 *  for the errors that kill the mic (micLost latch re-renders first). */
export function micErrorEvent(
  qid: number,
  context: 'practice' | 'mock',
  error: MicError,
  section: OralSection = 'civics',
): OralAnswerEvent {
  return { qid, section, context, input: 'mic', verdict: 'none', retried: null, confirmedNear: null, error, transcriptLength: 0 };
}
```

4. In `mockAnswerEvents`, in the pushed object, after `qid,` add `section: 'civics',`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/n400/analytics.test.ts src/lib/n400/oral/oral-events.test.ts src/components/n400/oral && npx tsc --noEmit`
Expected: PASS (analytics 8, oral-events 8, the oral component wiring tests unchanged); type-check 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/analytics.ts src/lib/n400/analytics.test.ts src/lib/n400/oral/oral-events.ts src/lib/n400/oral/oral-events.test.ts
git commit -m "feat(n400app): n400_oral_answer carries section; Yes/No unclear verdict

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Pure practice rules (spec §4, rev 1.1)

**Files:**
- Create: `apps/website/src/lib/n400/oral/spoken-practice.ts`
- Test: `apps/website/src/lib/n400/oral/spoken-practice.test.ts`

**Interfaces:**
- Consumes:
  - S1: `SpokenGrade`, `SpokenItem`, `gradeSpokenItem` (`grade-spoken-item.ts`); `OralVerdict` (`types.ts`).
  - Existing: `VoiceInput`, `voiceInputFor` (`voice-support.ts`).
  - Task 3: `OralSection`. Task 2: `sectionAttemptRow` (test only).
- Produces:
  - `interface SpokenAnswer { itemId: string | null; text: string; verdict: OralVerdict | null; nearPrompt: string | null; nearAnswer: 'yes' | 'no' | null; reask: boolean }`
  - `freshAnswer(itemId: string | null): SpokenAnswer`
  - `answerFor(stored: SpokenAnswer, itemId: string | null): SpokenAnswer`
  - `isLocked(answer: SpokenAnswer): boolean`
  - `afterAttempt(answer: SpokenAnswer, text: string, grade: SpokenGrade): SpokenAnswer`
  - `afterNearAnswer(answer: SpokenAnswer, yes: boolean): SpokenAnswer`
  - `interface SpokenStep { settle: boolean; shownCorrect: boolean; record: boolean | null }`
  - `spokenPracticeStep(answer: SpokenAnswer): SpokenStep`
  - `spokenInput(voiceInput: VoiceInput, micLost: boolean): { panelInput: 'mic' | 'typed'; via: 'voice' | 'typed' }`
  - `spokenQid(item: SpokenItem): number`
  - `spokenSection(item: SpokenItem): OralSection`

- [ ] **Step 1: Write the failing test**

Create `spoken-practice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sectionAttemptRow } from '@/lib/n400/attempt-row';
import { WHATMEAN_QUESTIONS_BY_ID } from '@/lib/n400/whatmean-data';
import { gradeSpokenItem, type SpokenItem } from './grade-spoken-item';
import {
  afterAttempt,
  afterNearAnswer,
  answerFor,
  freshAnswer,
  isLocked,
  spokenInput,
  spokenPracticeStep,
  spokenQid,
  spokenSection,
  type SpokenAnswer,
} from './spoken-practice';
import { voiceInputFor } from './voice-support';

// Speaking spec §4 (rev 1.1). The sequences run on the real S1 grader.
const LOC = { stateCode: 'TX' as const, districtNumber: null };
const YN: SpokenItem = { kind: 'yesno', id: 'yn-1' };
const WM: SpokenItem = { kind: 'whatmean', id: 'wm-47' };
const attempt = (a: SpokenAnswer, item: SpokenItem, text: string) =>
  afterAttempt(a, text, gradeSpokenItem(item, text, LOC));

describe('Yes/No answer sequences (Review Focus 3)', () => {
  it('"I don\'t know" re-asks and leaves the item open; then "No, officer" is correct and recorded', () => {
    const reasked = attempt(freshAnswer('yn-1'), YN, "I don't know");
    expect(reasked).toMatchObject({ verdict: null, reask: true, text: "I don't know" });
    expect(isLocked(reasked)).toBe(false);
    expect(spokenPracticeStep(reasked)).toEqual({ settle: false, shownCorrect: false, record: null });

    const answered = attempt(reasked, YN, 'No, officer');
    expect(answered).toMatchObject({ verdict: 'correct', reask: false });
    expect(spokenPracticeStep(answered)).toEqual({ settle: true, shownCorrect: true, record: true });
  });

  it('"I don\'t know" then "Yes" is wrong and recorded (every Yes/No standard answer is No)', () => {
    const answered = attempt(attempt(freshAnswer('yn-1'), YN, "I don't know"), YN, 'Yes');
    expect(answered).toMatchObject({ verdict: 'wrong', reask: false });
    expect(spokenPracticeStep(answered)).toEqual({ settle: true, shownCorrect: false, record: false });
  });

  it('a graded item is never graded again', () => {
    const graded = attempt(freshAnswer('yn-1'), YN, 'No, officer');
    expect(attempt(graded, YN, 'Yes')).toBe(graded);
  });
});

describe('What-mean near (D7)', () => {
  // Gate S1: "cancelled" without "never happened" stays near for wm-47.
  const near = attempt(freshAnswer('wm-47'), WM, 'The marriage was cancelled');

  it('waits for "Có phải bạn nói …?" with the taught definition; nothing settles yet', () => {
    expect(near).toMatchObject({ verdict: 'near', nearPrompt: WHATMEAN_QUESTIONS_BY_ID['wm-47'].definitionEn });
    expect(isLocked(near)).toBe(true);
    expect(spokenPracticeStep(near)).toEqual({ settle: false, shownCorrect: false, record: null });
  });

  it('"Đúng vậy" shows correct and records nothing; a second answer is ignored', () => {
    const confirmed = afterNearAnswer(near, true);
    expect(spokenPracticeStep(confirmed)).toEqual({ settle: true, shownCorrect: true, record: null });
    expect(afterNearAnswer(confirmed, false)).toBe(confirmed);
  });

  it('"Không" is wrong and recorded', () => {
    expect(spokenPracticeStep(afterNearAnswer(near, false))).toEqual({ settle: true, shownCorrect: false, record: false });
  });

  it('only a near waits for "Có phải bạn nói …?"', () => {
    const graded = attempt(freshAnswer('yn-1'), YN, 'No, officer');
    expect(afterNearAnswer(graded, true)).toBe(graded);
  });
});

describe('items (plan review P0-1)', () => {
  it('a new item starts clean; the same item keeps its answer', () => {
    const graded = attempt(freshAnswer('yn-1'), YN, 'No, officer');
    expect(answerFor(graded, 'yn-2')).toEqual(freshAnswer('yn-2'));
    expect(answerFor(graded, 'yn-1')).toBe(graded);
  });

  it('an answer holds no answer mode, so Tự nói carries across items (Review Focus 4)', () => {
    expect(Object.keys(freshAnswer('yn-1'))).not.toContain('answerMode');
  });
});

describe('spokenInput: how an answer is taken and recorded (plan review P1-4)', () => {
  // The Facebook iOS in-app UA from voice-support.test.ts.
  const FB_IOS =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/24A437 [FBAN/FBIOS;FBAV/579.0.0.23.106;FBBV/1068430635;FBDV/iPhone18,2;FBMD/iPhone;FBSN/iOS;FBSV/27.0;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/80]';

  it('Facebook in-app iOS: the typed box, recorded as answer_mode typed', () => {
    const voiceInput = voiceInputFor({ ua: FB_IOS, apiPresent: true, enabled: true, androidOn: false });
    const { panelInput, via } = spokenInput(voiceInput, false);
    expect([voiceInput, panelInput, via]).toEqual(['typed', 'typed', 'typed']);
    expect(sectionAttemptRow('u1', 'yesno', 'yn-1', true, 'practice', via)).toMatchObject({ answer_mode: 'typed' });
  });

  it('the mic records voice; a lost mic types for the rest of the session', () => {
    expect(spokenInput('mic', false)).toEqual({ panelInput: 'mic', via: 'voice' });
    expect(spokenInput('mic', true)).toEqual({ panelInput: 'typed', via: 'typed' });
  });
});

describe('analytics ids', () => {
  it('spokenQid is the civics qid or the n of wm-n / yn-n', () => {
    expect(spokenQid({ kind: 'civics', qid: 12 })).toBe(12);
    expect(spokenQid({ kind: 'whatmean', id: 'wm-52' })).toBe(52);
    expect(spokenQid({ kind: 'yesno', id: 'yn-7' })).toBe(7);
  });

  it('spokenSection is the item kind', () => {
    expect(spokenSection({ kind: 'civics', qid: 1 })).toBe('civics');
    expect(spokenSection({ kind: 'whatmean', id: 'wm-1' })).toBe('whatmean');
    expect(spokenSection({ kind: 'yesno', id: 'yn-1' })).toBe('yesno');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/oral/spoken-practice.test.ts`
Expected: FAIL: cannot resolve `./spoken-practice`.

- [ ] **Step 3: Implement**

Create `spoken-practice.ts`:

```ts
// What Speaking practice does with a spoken answer (speaking spec §4, rev 1.1).
// Pure: the hook use-spoken-practice.ts holds one SpokenAnswer and calls these.

import type { OralSection } from '@/lib/n400/analytics';
import type { SpokenGrade, SpokenItem } from './grade-spoken-item';
import type { OralVerdict } from './types';
import type { VoiceInput } from './voice-support';

/** One item's spoken answer, tagged with its item: a new item starts clean by
 *  itself (answerFor), so nothing is reset when the learner moves on. */
export interface SpokenAnswer {
  itemId: string | null;
  /** What the learner said or typed last ("Bạn nói: …"). */
  text: string;
  /** null until graded. A Yes/No `unclear` is never a verdict: see `reask`. */
  verdict: OralVerdict | null;
  /** The taught answer offered in "Có phải bạn nói …?" (near only). */
  nearPrompt: string | null;
  nearAnswer: 'yes' | 'no' | null;
  /** Yes/No unclear: asked again; the item stays open. */
  reask: boolean;
}

export function freshAnswer(itemId: string | null): SpokenAnswer {
  return { itemId, text: '', verdict: null, nearPrompt: null, nearAnswer: null, reask: false };
}

/** The stored answer when it is this item's; otherwise a fresh one. */
export function answerFor(stored: SpokenAnswer, itemId: string | null): SpokenAnswer {
  return stored.itemId === itemId ? stored : freshAnswer(itemId);
}

/** Graded, or a near waiting for its answer: no more speaking or typing. */
export function isLocked(answer: SpokenAnswer): boolean {
  return answer.verdict !== null;
}

/** After the learner speaks or types. A graded item never changes. */
export function afterAttempt(answer: SpokenAnswer, text: string, grade: SpokenGrade): SpokenAnswer {
  if (isLocked(answer)) return answer;
  if (grade.verdict === 'unclear') return { ...answer, text, reask: true };
  return { ...answer, text, verdict: grade.verdict, nearPrompt: grade.nearAnswer, reask: false };
}

/** After [Đúng vậy] / [Không]. Only a near that is still waiting changes. */
export function afterNearAnswer(answer: SpokenAnswer, yes: boolean): SpokenAnswer {
  if (answer.verdict !== 'near' || answer.nearAnswer !== null) return answer;
  return { ...answer, nearAnswer: yes ? 'yes' : 'no' };
}

export interface SpokenStep {
  /** The item is answered: reveal the feedback and count it. */
  settle: boolean;
  shownCorrect: boolean;
  /** What to record; null = nothing (a confirmed near, D7, or not settled). */
  record: boolean | null;
}

export function spokenPracticeStep(answer: SpokenAnswer): SpokenStep {
  const { verdict, nearAnswer } = answer;
  if (verdict === 'correct') return { settle: true, shownCorrect: true, record: true };
  if (verdict === 'wrong') return { settle: true, shownCorrect: false, record: false };
  // D7: shown correct, no attempt row. The hook still sends its analytics event.
  if (verdict === 'near' && nearAnswer === 'yes') return { settle: true, shownCorrect: true, record: null };
  if (verdict === 'near' && nearAnswer === 'no') return { settle: true, shownCorrect: false, record: false };
  // Not graded yet, re-asked, or a near waiting for its answer.
  return { settle: false, shownCorrect: false, record: null };
}

/** How the panel takes the answer, and how it is recorded (answer_mode). In-app
 *  browsers type (D12); a lost mic types for the rest of the session. */
export function spokenInput(
  voiceInput: VoiceInput,
  micLost: boolean,
): { panelInput: 'mic' | 'typed'; via: 'voice' | 'typed' } {
  return voiceInput === 'typed' || micLost ? { panelInput: 'typed', via: 'typed' } : { panelInput: 'mic', via: 'voice' };
}

/** Numeric id for analytics: the civics qid, or the n of "wm-n" / "yn-n". */
export function spokenQid(item: SpokenItem): number {
  if (item.kind === 'civics') return item.qid;
  return Number(item.id.slice(item.id.indexOf('-') + 1));
}

export function spokenSection(item: SpokenItem): OralSection {
  return item.kind;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/n400/oral/spoken-practice.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/spoken-practice.ts src/lib/n400/oral/spoken-practice.test.ts
git commit -m "feat(n400app): pure Speaking practice rules — per-item answer, near D7, Yes/No re-ask

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `useSpokenPractice` hook + `MicAnswerPanel` prompt + re-ask string

**Files:**
- Create: `apps/website/src/components/n400/oral/use-spoken-practice.ts`
- Modify: `apps/website/src/components/n400/oral/MicAnswerPanel.tsx` (the `prompt` prop)
- Modify: `apps/website/src/lib/n400/i18n/vi.ts`, `apps/website/src/lib/n400/i18n/en.ts` (`oral.yesNoReask`)
- Test: `apps/website/src/components/n400/oral/spoken-practice-wiring.test.ts`

**Interfaces:**
- Consumes:
  - Task 4: `freshAnswer`, `answerFor`, `isLocked`, `afterAttempt`, `afterNearAnswer`, `spokenPracticeStep`, `spokenInput`, `spokenQid`, `spokenSection`.
  - Task 3: `practiceAnswerEvent`, `micErrorEvent` (with `section`), `trackOralAnswer`.
  - Task 2: `useVoiceFlags().speakingOn`.
  - S1: `canSpeak`, `gradeSpokenItem`, `spokenItemFromId`.
  - Existing: `useSpeechRecognition`, `voiceInputFor`, `offersTypedFallback`, `useN400UserState`.
- Produces:
  - `useSpokenPractice(opts: { itemId: string | null; enabled: boolean; onSettle: (s: SpokenSettle) => void }): SpokenPractice`
  - `SpokenSettle = { shownCorrect: boolean; record: boolean | null; via: 'voice' | 'typed' }`
  - `SpokenPractice` has these fields:
    - `mic`, `showToggle`, `answerMode`, `changeMode`
    - `voiceHere`, `panelInput`, `micLost`, `typedFallback`
    - `voiceText`, `locked`, `shownCorrect`, `nearPrompt`, `reask`
    - `onSubmit`, `onNearAnswer`, `beforeAudio`
  - `MicAnswerPanelProps.prompt?: string`
  - `dict.oral.yesNoReask`

- [ ] **Step 1: Write the failing test**

Create `spoken-practice-wiring.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin the Speaking practice voice wiring by source (speaking spec §4).
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const hook = read('src/components/n400/oral/use-spoken-practice.ts');
const panel = read('src/components/n400/oral/MicAnswerPanel.tsx');

describe('useSpokenPractice', () => {
  it('is gated by voice_speaking and starts in Trắc nghiệm (S8)', () => {
    expect(hook).toContain('enabled: opts.enabled && flags.speakingOn');
    expect(hook).toContain("useState<PracticeAnswerMode>('choice')");
  });

  it('only the switch sets the mode, so Tự nói stays on from item to item (Review Focus 4)', () => {
    expect(hook.match(/setAnswerMode\(/g)).toHaveLength(1);
  });

  it('grades through the shared S1 grader', () => {
    expect(hook).toContain('gradeSpokenItem(item, text, location)');
  });

  it('keeps one answer tagged with its item: nothing is reset during render (plan review P0-1)', () => {
    expect(hook).toContain('const answer = answerFor(stored, opts.itemId);');
    expect(hook).not.toContain('prevItemId');
  });

  it('unclear re-asks: resets the mic and never settles (Review Focus 3)', () => {
    const body = hook.slice(hook.indexOf('const onSubmit'), hook.indexOf('const onNearAnswer'));
    expect(body).toMatch(/if \(next\.reask\) \{\s*resetMic\(\);\s*return;\s*\}/);
  });

  it('a near answered with Đúng vậy / Không still sends its analytics event (D7, plan review P0-2)', () => {
    const body = hook.slice(hook.indexOf('const onNearAnswer'), hook.indexOf('const changeMode'));
    expect(body).toContain("practiceAnswerEvent(spokenQid(item), panelInput, 'near', yes, answer.text, spokenSection(item))");
  });

  it('a stalled mic shows the typed box at once and is latched in handlers, never in an effect', () => {
    expect(hook).toContain('const micLost = micLatched || stalled;');
    expect(hook.match(/latchMicLost\(\);/g)).toHaveLength(2);
  });

  it('🔊 drops an open capture window before playing (Review Focus 2)', () => {
    const body = hook.slice(hook.indexOf('const beforeAudio'), hook.indexOf('return {'));
    expect(body).toContain("if (mic.state === 'listening') resetMic();");
    expect(body).toContain('mic.noteAudioPlayed();');
  });

  it('a new item never inherits the previous capture window', () => {
    expect(hook).toMatch(/useEffect\(\(\) => \{\s*resetMic\(\);\s*\}, \[opts\.itemId, resetMic\]\);/);
  });
});

describe('MicAnswerPanel prompt', () => {
  it('renders the prompt in the mic and the typed box', () => {
    expect(panel).toContain('prompt?: string;');
    expect(panel.match(/\{promptRow\}/g)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/n400/oral/spoken-practice-wiring.test.ts`
Expected: FAIL: `ENOENT … use-spoken-practice.ts`.

- [ ] **Step 3: Implement**

Create `src/components/n400/oral/use-spoken-practice.ts`:

```ts
'use client';

// Spoken answers in Speaking practice (speaking spec §4). It covers:
// - the [Trắc nghiệm | Tự nói] switch and the shared mic session;
// - grading through gradeSpokenItem;
// - the practice rules: near → "Có phải bạn nói …?" (never recorded when
//   confirmed, D7); Yes/No unclear → re-ask;
// - the iOS 🔊 rules.
// Shared by SectionYesNoQuiz and SectionMCQuiz. The rules are pure
// (spoken-practice.ts). This hook holds the state and sends the events; it never
// sets state during render or in an effect.

import { useEffect, useState } from 'react';
import type { PracticeAnswerMode } from '@/components/n400/oral/AnswerModeToggle';
import { trackOralAnswer } from '@/lib/n400/analytics';
import { canSpeak, gradeSpokenItem, spokenItemFromId } from '@/lib/n400/oral/grade-spoken-item';
import { offersTypedFallback } from '@/lib/n400/oral/mock-voice-items';
import { micErrorEvent, practiceAnswerEvent } from '@/lib/n400/oral/oral-events';
import {
  afterAttempt,
  afterNearAnswer,
  answerFor,
  freshAnswer,
  isLocked,
  spokenInput,
  spokenPracticeStep,
  spokenQid,
  spokenSection,
} from '@/lib/n400/oral/spoken-practice';
import { useSpeechRecognition, type SpeechApi } from '@/lib/n400/oral/use-speech-recognition';
import { useVoiceFlags } from '@/lib/n400/oral/use-voice-flags';
import { voiceInputFor } from '@/lib/n400/oral/voice-support';
import { useN400UserState } from '@/lib/n400/user-state';

export interface SpokenSettle {
  shownCorrect: boolean;
  /** null = record nothing (a confirmed near, D7). */
  record: boolean | null;
  via: 'voice' | 'typed';
}

export interface SpokenPractice {
  mic: SpeechApi;
  /** Show [Trắc nghiệm | Tự nói]: the flag is on and this browser can answer by voice or typing. */
  showToggle: boolean;
  answerMode: PracticeAnswerMode;
  changeMode: (m: PracticeAnswerMode) => void;
  /** This item is answered by voice/typing (chosen, available, gradable, or already graded). */
  voiceHere: boolean;
  panelInput: 'mic' | 'typed';
  micLost: boolean;
  /** Offered after a network / audio-capture error: switch to typing. */
  typedFallback: (() => void) | undefined;
  voiceText: string;
  /** Graded (or waiting for the near answer): no more speaking or typing. */
  locked: boolean;
  shownCorrect: boolean;
  /** The taught answer to offer in "Có phải bạn nói …?"; null otherwise. */
  nearPrompt: string | null;
  /** Yes/No unclear: show the re-ask prompt. */
  reask: boolean;
  onSubmit: (text: string) => void;
  onNearAnswer: (yes: boolean) => void;
  /** Pass to every 🔊 as onBeforePlay. */
  beforeAudio: () => void;
}

export function useSpokenPractice(opts: {
  itemId: string | null;
  /** False in exam mode: the Full interview decides voice itself (slice S4). */
  enabled: boolean;
  onSettle: (s: SpokenSettle) => void;
}): SpokenPractice {
  const mic = useSpeechRecognition();
  const flags = useVoiceFlags();
  const { state } = useN400UserState();
  const location = { stateCode: state.settings.stateCode, districtNumber: state.address.districtNumber };
  const item = opts.itemId ? spokenItemFromId(opts.itemId) : null;

  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const voiceInput = voiceInputFor({
    ua,
    apiPresent: mic.supported,
    enabled: opts.enabled && flags.speakingOn,
    androidOn: flags.androidOn,
  });

  // Every practice session starts in Trắc nghiệm: the page remounts the quiz per
  // session. Within one, Tự nói stays on from item to item (spec S8, rev 1.1).
  const [answerMode, setAnswerMode] = useState<PracticeAnswerMode>('choice');
  // One answer, tagged with its item: a new item starts clean by itself.
  const [stored, setStored] = useState(() => freshAnswer(opts.itemId));
  const answer = answerFor(stored, opts.itemId);
  const [micLatched, setMicLatched] = useState(false);

  // A new item never inherits the previous item's capture window. The mic is an
  // external system: this effect resets it and sets no React state.
  const { reset: resetMic } = mic;
  useEffect(() => {
    resetMic();
  }, [opts.itemId, resetMic]);

  const locked = isLocked(answer);
  const voiceHere =
    locked || (voiceInput !== 'none' && answerMode === 'voice' && item !== null && canSpeak(item, location));

  // A stalled mic (deaf iOS session) → the typed box for the rest of the session
  // (Civics rev 3.11). Derived, so the typed box shows at once; latched in the
  // handlers, because the next item's mic reset clears the error.
  const stalled = voiceHere && voiceInput === 'mic' && mic.error === 'stalled';
  const micLost = micLatched || stalled;
  const latchMicLost = () => {
    if (stalled) setMicLatched(true);
  };
  const { panelInput, via } = spokenInput(voiceInput, micLost);

  // n400_oral_answer for mic errors (Civics spec §9), with this item's section.
  const micError = mic.error;
  useEffect(() => {
    if (micError && answerMode === 'voice' && item) {
      trackOralAnswer(micErrorEvent(spokenQid(item), 'practice', micError, spokenSection(item)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micError]);

  const onSubmit = (text: string) => {
    latchMicLost();
    if (!item) return;
    const grade = gradeSpokenItem(item, text, location);
    const next = afterAttempt(answer, text, grade);
    if (next === answer) return; // already graded
    setStored(next);
    // A near is sent once the learner answers "Có phải bạn nói …?" (onNearAnswer).
    if (grade.verdict !== 'near') {
      trackOralAnswer(practiceAnswerEvent(spokenQid(item), panelInput, grade.verdict, null, text, spokenSection(item)));
    }
    // Yes/No unclear: nothing counted or recorded; the mic is ready for another try.
    if (next.reask) {
      resetMic();
      return;
    }
    const step = spokenPracticeStep(next);
    if (step.settle) opts.onSettle({ shownCorrect: step.shownCorrect, record: step.record, via });
  };

  const onNearAnswer = (yes: boolean) => {
    if (!item) return;
    const next = afterNearAnswer(answer, yes);
    if (next === answer) return;
    setStored(next);
    // D7: no attempt row, but the event is sent (confirmedNear, Civics spec §9).
    trackOralAnswer(practiceAnswerEvent(spokenQid(item), panelInput, 'near', yes, answer.text, spokenSection(item)));
    const step = spokenPracticeStep(next);
    opts.onSettle({ shownCorrect: step.shownCorrect, record: step.record, via });
  };

  const changeMode = (m: PracticeAnswerMode) => {
    if (locked) return;
    latchMicLost();
    setAnswerMode(m);
    setStored(freshAnswer(opts.itemId));
    resetMic();
  };

  // 🔊 while a capture window is open would be graded as the answer (S1 final
  // review): drop the window first, then let the controller note the playback.
  const beforeAudio = () => {
    if (mic.state === 'listening') resetMic();
    mic.noteAudioPlayed();
  };

  return {
    mic,
    showToggle: voiceInput !== 'none',
    answerMode,
    changeMode,
    voiceHere,
    panelInput,
    micLost,
    typedFallback: panelInput === 'mic' && offersTypedFallback(mic.error) ? () => setMicLatched(true) : undefined,
    voiceText: answer.text,
    locked,
    shownCorrect: spokenPracticeStep(answer).shownCorrect,
    nearPrompt: answer.verdict === 'near' && answer.nearAnswer === null ? answer.nearPrompt : null,
    reask: answer.reask,
    onSubmit,
    onNearAnswer,
    beforeAudio,
  };
}
```

In `src/components/n400/oral/MicAnswerPanel.tsx`:

1. In `MicAnswerPanelProps`, after `onUseTyped?: () => void;`, add:

```ts
  /** A status line under the answer, e.g. the Yes/No re-ask (speaking spec §4). */
  prompt?: string;
```

2. In the destructured props, replace `  onUseTyped,\n}: MicAnswerPanelProps) {` with `  onUseTyped,\n  prompt,\n}: MicAnswerPanelProps) {`.
3. Directly after the `nearRow` constant (ending `) : null;` before `if (input === 'typed') {`), add:

```tsx
  const promptRow = prompt ? (
    <div className="w-full rounded-2xl border-l-4 border-amber-400 bg-amber-50 p-3 text-sm text-gray-700" role="status">
      {prompt}
    </div>
  ) : null;
```

4. In the typed branch, replace `        </form>\n        {nearRow}` with `        </form>\n        {promptRow}\n        {nearRow}`.
5. In the mic branch, replace `      {errorText ? (` (its first occurrence, after the transcript block) with `      {promptRow}\n\n      {errorText ? (`.

In `src/lib/n400/i18n/vi.ts`, after `    didYouMean: 'Có phải bạn nói "{answer}"?',`, add `    yesNoReask: 'Bạn trả lời Yes hay No? Hãy nói lại.',`.
In `src/lib/n400/i18n/en.ts`, after `    didYouMean: 'Did you mean "{answer}"?',`, add `    yesNoReask: 'Please answer Yes or No. Try again.',`.

- [ ] **Step 4: Run the tests, type-check and lint**

Run, separately:
- `npx vitest run src/components/n400/oral`
- `npx tsc --noEmit`
- `npx eslint src/components/n400/oral src/lib/n400/oral src/lib/n400/i18n/vi.ts src/lib/n400/i18n/en.ts`

Expected:
- PASS: 10 new tests, plus the existing oral component tests;
- type-check 0 errors (the hook compiles against the Task 2–4 interfaces);
- eslint: no problems. `react-hooks/set-state-in-effect` is an error in this repo, so this run proves the hook sets no state in an effect.

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/oral/use-spoken-practice.ts src/components/n400/oral/MicAnswerPanel.tsx src/components/n400/oral/spoken-practice-wiring.test.ts src/lib/n400/i18n/vi.ts src/lib/n400/i18n/en.ts
git commit -m "feat(n400app): useSpokenPractice hook + MicAnswerPanel prompt for Speaking practice

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Each practice session starts fresh (spec S8, rev 1.1)

A bug fix, in its own commit, that the per-session Tự nói rule builds on:
- `SectionMCQuiz` and `SectionYesNoQuiz` keep `index` and the counts in state, and derive `done = index >= questions.length`.
- Làm lại and Ôn câu sai only pass new `questions`. The quiz stays "done" and shows the old summary again.
- Keying the quiz by the session seed remounts it: question 1, counts at 0, and, from Task 7 on, Trắc nghiệm. The Full interview already does this (``key={`civ-${seed}`}``).

**Files:**
- Modify: `apps/website/src/app/n400ready/(app)/speaking/what-mean/page.tsx`
- Modify: `apps/website/src/app/n400ready/(app)/speaking/yes-no/page.tsx`
- Test: `apps/website/src/components/n400/speaking/practice-session-key.test.ts`

**Interfaces:**
- Produces:
  - Yes/No page `Mode`: `{ kind: 'quiz'; ids: string[]; seed: string; minutes?: number | null }`;
  - both practice quizzes are keyed by `mode.seed`. Tasks 7–8 rely on the remount to start each session in Trắc nghiệm.

- [ ] **Step 1: Write the failing test**

Create `src/components/n400/speaking/practice-session-key.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin by source that every practice session remounts its quiz
// (speaking spec S8, rev 1.1). Without the key, Làm lại / Ôn câu sai kept the old
// index, so the old summary showed again.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const whatMean = read('src/app/n400ready/(app)/speaking/what-mean/page.tsx');
const yesNo = read('src/app/n400ready/(app)/speaking/yes-no/page.tsx');

describe('Speaking practice: one quiz instance per session (Review Focus 4)', () => {
  it('What-mean keys its quiz by the session seed', () => {
    expect(whatMean).toMatch(/<SectionMCQuiz\s+key=\{mode\.seed\}/);
  });

  it('Yes/No quiz sessions carry a seed and key the quiz by it', () => {
    expect(yesNo).toContain("| { kind: 'quiz'; ids: string[]; seed: string; minutes?: number | null };");
    expect(yesNo).toMatch(/<SectionYesNoQuiz\s+key=\{mode\.seed\}/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/n400/speaking/practice-session-key.test.ts`
Expected: FAIL (2 tests): no `key={mode.seed}`, and the Yes/No mode has no seed.

- [ ] **Step 3: Implement**

In `src/app/n400ready/(app)/speaking/what-mean/page.tsx`, replace

```tsx
  if (mode.kind === 'practice') {
    return (
      <SectionMCQuiz
        questions={mode.ids.map((id, i) => toQuestion(id, mode.seed, i, dict))}
```

with

```tsx
  if (mode.kind === 'practice') {
    // One quiz instance per session (key = seed): Làm lại / Ôn câu sai start at
    // question 1, in Trắc nghiệm (speaking spec S8).
    return (
      <SectionMCQuiz
        key={mode.seed}
        questions={mode.ids.map((id, i) => toQuestion(id, mode.seed, i, dict))}
```

In `src/app/n400ready/(app)/speaking/yes-no/page.tsx`:

1. Replace `  | { kind: 'quiz'; ids: string[]; minutes?: number | null };` with `  | { kind: 'quiz'; ids: string[]; seed: string; minutes?: number | null };`.
2. In `startWrongsReview`, replace `      setMode({ kind: 'quiz', ids });` with ``      setMode({ kind: 'quiz', ids, seed: `${Date.now()}` });``.
3. Replace

```tsx
  function startQuizWith(count: number, minutes?: number | null) {
    const ids = shuffle([...ALL_IDS], `yn-quiz-${Date.now()}`).slice(0, count);
    setMode({ kind: 'quiz', ids, minutes });
```

with

```tsx
  function startQuizWith(count: number, minutes?: number | null) {
    const seed = `${Date.now()}`;
    const ids = shuffle([...ALL_IDS], `yn-quiz-${seed}`).slice(0, count);
    setMode({ kind: 'quiz', ids, seed, minutes });
```

4. Replace

```tsx
  if (mode.kind === 'quiz') {
    return (
      <SectionYesNoQuiz
```

with

```tsx
  if (mode.kind === 'quiz') {
    // One quiz instance per session (key = seed): Làm lại / Ôn câu sai start at
    // question 1, in Trắc nghiệm (speaking spec S8).
    return (
      <SectionYesNoQuiz
        key={mode.seed}
```

- [ ] **Step 4: Run the test, type-check and lint**

Run, separately:
- `npx vitest run src/components/n400/speaking/practice-session-key.test.ts`
- `npx tsc --noEmit`
- `npx eslint "src/app/n400ready/(app)/speaking/what-mean/page.tsx" "src/app/n400ready/(app)/speaking/yes-no/page.tsx"`

Expected:
- PASS (2 tests);
- type-check 0 errors: the required `seed` makes TypeScript check both Yes/No `setMode({ kind: 'quiz', … })` calls;
- eslint: no problems.

- [ ] **Step 5: Commit**

```bash
git add "src/app/n400ready/(app)/speaking/what-mean/page.tsx" "src/app/n400ready/(app)/speaking/yes-no/page.tsx" src/components/n400/speaking/practice-session-key.test.ts
git commit -m "fix(n400app): Speaking practice — Làm lại / Ôn câu sai start a fresh session

The quizzes keep index and counts in state (done = index >= length), so a
restart that only passed new questions re-rendered the old summary. Key
each quiz by its session seed, like the Full interview.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Yes/No practice — Tự nói (spec §4)

**Files:**
- Modify: `apps/website/src/components/n400/speaking/SectionYesNoQuiz.tsx`
- Modify: `apps/website/src/app/n400ready/(app)/speaking/yes-no/page.tsx`
- Test: `apps/website/src/components/n400/oral/spoken-practice-wiring.test.ts` (append)

**Interfaces:**
- Consumes: `useSpokenPractice` (Task 5); `AnswerMode` (`attempt-row.ts`); `recordSectionAnswer(..., answerMode)` (Task 2); Task 6: each session remounts the quiz, so it opens in Trắc nghiệm.
- Produces: `SectionYesNoQuiz` prop `onAnswer: (itemId: string, wasCorrect: boolean, via?: AnswerMode) => void`.

- [ ] **Step 1: Write the failing test**

Append to `spoken-practice-wiring.test.ts`:

```ts
describe('SectionYesNoQuiz — Tự nói', () => {
  const quiz = read('src/components/n400/speaking/SectionYesNoQuiz.tsx');
  const page = read('src/app/n400ready/(app)/speaking/yes-no/page.tsx');

  it('uses the hook and the Civics switch + panel', () => {
    expect(quiz).toContain('useSpokenPractice({');
    expect(quiz).toContain('<AnswerModeToggle');
    expect(quiz).toMatch(/<MicAnswerPanel\s+key=\{q\.id\}/);
  });

  it('shows the re-ask prompt for unclear', () => {
    expect(quiz).toContain('prompt={spoken.reask ? dict.oral.yesNoReask : undefined}');
  });

  it('records only settled answers, with how they were given', () => {
    expect(quiz).toContain('if (record !== null && q) onAnswer(q.id, record, via);');
    expect(quiz).toContain("onAnswer(q.id, ok, 'choice');");
  });

  it('every 🔊 uses the iOS rules; the slow 🔊 is hidden in Tự nói (Review Focus 1, 2)', () => {
    expect(quiz.match(/onBeforePlay=\{spoken\.beforeAudio\}/g)).toHaveLength(2);
    expect(quiz.match(/preferWebAudio=\{spoken\.mic\.sessionRunning\}/g)).toHaveLength(2);
    expect(quiz).toMatch(/\{!spoken\.voiceHere \? \(\s*<AudioButton src=\{audioSrc\} label=\{dict\.speaking\.yesno\.slowLabel\}/);
  });

  it('the page records answer_mode', () => {
    expect(page).toContain("onAnswer={(id, ok, via) => void recordSectionAnswer('yesno', id, ok, 'practice', via)}");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/n400/oral/spoken-practice-wiring.test.ts`
Expected: FAIL (5 new failures).

- [ ] **Step 3: Implement**

In `SectionYesNoQuiz.tsx`:

1. After `import { tFormat } from '@/lib/n400/i18n/format';`, add:

```ts
import { AnswerModeToggle } from '@/components/n400/oral/AnswerModeToggle';
import { MicAnswerPanel } from '@/components/n400/oral/MicAnswerPanel';
import { useSpokenPractice } from '@/components/n400/oral/use-spoken-practice';
import type { AnswerMode } from '@/lib/n400/attempt-row';
```

2. Replace `  onAnswer: (itemId: string, wasCorrect: boolean) => void;` with `  onAnswer: (itemId: string, wasCorrect: boolean, via?: AnswerMode) => void;`.
3. Directly after the `wasCorrect` `useMemo(…);` block (before `  if (done || !q) {`), add:

```ts
  // Tự nói (speaking spec §4): voice answers settle through the hook.
  const spoken = useSpokenPractice({
    itemId: q ? q.id : null,
    enabled: true,
    onSettle: ({ shownCorrect, record, via }) => {
      setPhase('revealed');
      if (shownCorrect) setCorrectCount((c) => c + 1);
      else setWrongCount((c) => c + 1);
      if (record !== null && q) onAnswer(q.id, record, via);
    },
  });
```

4. Replace `  const audioSrc = yesNoAudioUrl(q.num);` with:

```ts
  const audioSrc = yesNoAudioUrl(q.num);
  const correctShown = spoken.voiceHere ? spoken.shownCorrect : wasCorrect;
```

5. In `onPick`, replace `    onAnswer(q.id, ok);` with `    onAnswer(q.id, ok, 'choice');`.
6. Replace `            {/* Header — question is the hero */}` with:

```tsx
            {spoken.showToggle ? (
              <div className="mb-2 flex justify-end">
                <AnswerModeToggle
                  mode={spoken.answerMode}
                  onChange={spoken.changeMode}
                  labels={{ choice: dict.oral.modeChoice, voice: dict.oral.modeVoice }}
                  disabled={phase === 'revealed'}
                />
              </div>
            ) : null}

            {/* Header — question is the hero */}
```

7. Replace the two header audio buttons

```tsx
                  <AudioButton src={audioSrc} label={dict.flashcards.listenQuestion} size="sm" />
                  <AudioButton src={audioSrc} label={dict.speaking.yesno.slowLabel} size="sm" rate={0.7} variant="slow" />
```

with

```tsx
                  <AudioButton
                    src={audioSrc}
                    label={dict.flashcards.listenQuestion}
                    size="sm"
                    onBeforePlay={spoken.beforeAudio}
                    preferWebAudio={spoken.mic.sessionRunning}
                  />
                  {/* Slow 🔊 plays through <audio> (rate ≠ 1), which deafens the iOS mic
                      session for 20–33 s (Civics rev 3.12): hidden in Tự nói. */}
                  {!spoken.voiceHere ? (
                    <AudioButton src={audioSrc} label={dict.speaking.yesno.slowLabel} size="sm" rate={0.7} variant="slow" />
                  ) : null}
```

8. Wrap the Yes/No buttons. Replace the two opening lines

```tsx
            {/* Answer buttons — Yes / No */}
            <div className="grid grid-cols-2 gap-[clamp(0.5rem,1.2vh,0.75rem)]">
```

with

```tsx
            {/* Answer — Tự nói (mic or typed) or the Yes / No buttons */}
            {spoken.voiceHere ? (
              <MicAnswerPanel
                key={q.id}
                input={spoken.panelInput}
                mic={spoken.mic}
                locked={spoken.locked}
                nearAnswer={null}
                onSubmit={spoken.onSubmit}
                onNearAnswer={spoken.onNearAnswer}
                prompt={spoken.reask ? dict.oral.yesNoReask : undefined}
                notice={spoken.micLost ? dict.oral.micLostTyped : undefined}
                onUseTyped={spoken.typedFallback}
              />
            ) : (
            <div className="grid grid-cols-2 gap-[clamp(0.5rem,1.2vh,0.75rem)]">
```

   Then replace the grid's closing lines

```tsx
              })}
            </div>

            {/* Learning Tip — mobile only, before answering */}
```

with

```tsx
              })}
            </div>
            )}

            {/* Learning Tip — mobile only, before answering */}
```

   The `{choices.map((choice) => { … })}` body between them does not change.

9. In the feedback block, replace `wasCorrect ? 'bg-teal-50 border-teal-500' : 'bg-orange-50 border-orange-500'` with `correctShown ? 'bg-teal-50 border-teal-500' : 'bg-orange-50 border-orange-500'`, and `{wasCorrect ? dict.practice.correctFeedback : dict.practice.incorrectFeedback}` with `{correctShown ? dict.practice.correctFeedback : dict.practice.incorrectFeedback}`.
10. Replace the feedback audio button `<AudioButton src={audioSrc} label={dict.flashcards.listenAnswer} size="sm" className="ml-auto" />` with:

```tsx
<AudioButton
  src={audioSrc}
  label={dict.flashcards.listenAnswer}
  size="sm"
  className="ml-auto"
  onBeforePlay={spoken.beforeAudio}
  preferWebAudio={spoken.mic.sessionRunning}
/>
```

11. Directly after that feedback header `</div>` (before `<ul className="text-gray-700 space-y-0.5 list-disc pl-5"`), add:

```tsx
                {spoken.voiceHere && spoken.voiceText ? (
                  <div className="text-gray-700 mb-1" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    <span className="font-semibold">{spoken.panelInput === 'typed' ? dict.oral.youTyped : dict.oral.youSaid}</span>{' '}
                    {spoken.voiceText}
                  </div>
                ) : null}
```

In `src/app/n400ready/(app)/speaking/yes-no/page.tsx`, replace `onAnswer={(id, ok) => void recordSectionAnswer('yesno', id, ok, 'practice')}` with `onAnswer={(id, ok, via) => void recordSectionAnswer('yesno', id, ok, 'practice', via)}`.

- [ ] **Step 4: Run the tests, type-check and lint**

Run, separately (vitest exits non-zero on the known failure, so `&&` would skip the type-check):
- `npx vitest run src/components/n400`
- `npx tsc --noEmit`
- `npx eslint src/components/n400/speaking/SectionYesNoQuiz.tsx "src/app/n400ready/(app)/speaking/yes-no/page.tsx"`

Expected:
- vitest: the only failure is the pre-existing `mobile-layout.test.ts`;
- type-check 0 errors;
- eslint: no problems.

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/speaking/SectionYesNoQuiz.tsx "src/app/n400ready/(app)/speaking/yes-no/page.tsx" src/components/n400/oral/spoken-practice-wiring.test.ts
git commit -m "feat(n400app): Yes/No practice — Tự nói with re-ask on unclear

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: What-mean practice — Tự nói in `SectionMCQuiz` (spec §4)

**Files:**
- Modify: `apps/website/src/components/n400/speaking/SectionMCQuiz.tsx`
- Modify: `apps/website/src/app/n400ready/(app)/speaking/what-mean/page.tsx`
- Test: `apps/website/src/components/n400/oral/spoken-practice-wiring.test.ts` (append)

**Interfaces:**
- Consumes: `useSpokenPractice` (Task 5); `AnswerMode` (`attempt-row.ts`); `recordSectionAnswer(..., answerMode)` (Task 2); Task 6: each session remounts the quiz, so it opens in Trắc nghiệm.
- Produces: `SectionMCQuiz` prop `onAnswer: (itemId: string, wasCorrect: boolean, selected?: MCOption, via?: AnswerMode) => void`. Existing callers passing three arguments stay valid.

- [ ] **Step 1: Write the failing test**

Append to `spoken-practice-wiring.test.ts`:

```ts
describe('SectionMCQuiz — Tự nói (practice only)', () => {
  const quiz = read('src/components/n400/speaking/SectionMCQuiz.tsx');
  const page = read('src/app/n400ready/(app)/speaking/what-mean/page.tsx');

  it('voice is never on in exam mode — the Full interview is unchanged (Review Focus 5)', () => {
    expect(quiz).toContain('enabled: !examMode,');
  });

  it('uses the Civics switch + panel with the near prompt', () => {
    expect(quiz).toContain('<AnswerModeToggle');
    expect(quiz).toMatch(/<MicAnswerPanel\s+key=\{q\.itemId\}/);
    expect(quiz).toContain('nearAnswer={spoken.nearPrompt}');
  });

  it('a confirmed near is not recorded (D7)', () => {
    expect(quiz).toContain('if (record !== null && q) onAnswer(q.itemId, record, undefined, via);');
  });

  it('every 🔊 uses the iOS rules (Review Focus 2)', () => {
    expect(quiz.match(/onBeforePlay=\{spoken\.beforeAudio\}/g)).toHaveLength(2);
    expect(quiz.match(/preferWebAudio=\{spoken\.mic\.sessionRunning\}/g)).toHaveLength(2);
  });

  it('the page records answer_mode', () => {
    expect(page).toContain("onAnswer={(id, ok, _selected, via) => void recordSectionAnswer('whatmean', id, ok, 'practice', via)}");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/n400/oral/spoken-practice-wiring.test.ts`
Expected: FAIL (5 new failures).

- [ ] **Step 3: Implement**

In `SectionMCQuiz.tsx`:

1. After `import { useN400Lang } from '@/lib/n400/i18n/provider';`, add:

```ts
import { AnswerModeToggle } from '@/components/n400/oral/AnswerModeToggle';
import { MicAnswerPanel } from '@/components/n400/oral/MicAnswerPanel';
import { useSpokenPractice } from '@/components/n400/oral/use-spoken-practice';
import type { AnswerMode } from '@/lib/n400/attempt-row';
```

2. Replace `  onAnswer: (itemId: string, wasCorrect: boolean, selected?: MCOption) => void;` with:

```ts
  /** `via` = how a practice answer was given (voice/typed from Tự nói). */
  onAnswer: (itemId: string, wasCorrect: boolean, selected?: MCOption, via?: AnswerMode) => void;
```

3. Directly after the `pickedOption` `useMemo(…);` block, add:

```ts
  // Tự nói in practice (speaking spec §4). Exam mode keeps its own flow; the
  // Full interview's voice comes in slice S4.
  const spoken = useSpokenPractice({
    itemId: q ? q.itemId : null,
    enabled: !examMode,
    onSettle: ({ shownCorrect, record, via }) => {
      setPhase('revealed');
      if (shownCorrect) setCorrectCount((c) => c + 1);
      else setWrongCount((c) => c + 1);
      if (record !== null && q) onAnswer(q.itemId, record, undefined, via);
    },
  });
```

4. In `onPick` (the practice path), replace

```ts
    if (wasCorrect) setCorrectCount((c) => c + 1);
    else setWrongCount((c) => c + 1);
    onAnswer(q.itemId, wasCorrect, opt);
  };

  const onNext = () => {
```

with

```ts
    if (wasCorrect) setCorrectCount((c) => c + 1);
    else setWrongCount((c) => c + 1);
    onAnswer(q.itemId, wasCorrect, opt, 'choice');
  };

  const onNext = () => {
```

5. Replace `  const isLast = index === questions.length - 1;` with:

```ts
  const isLast = index === questions.length - 1;
  const revealedCorrect = spoken.voiceHere ? spoken.shownCorrect : !!pickedOption?.isCorrect;
```

6. Replace `            {/* Header — question is the hero */}` with:

```tsx
            {spoken.showToggle ? (
              <div className="mb-2 flex justify-end">
                <AnswerModeToggle
                  mode={spoken.answerMode}
                  onChange={spoken.changeMode}
                  labels={{ choice: dict.oral.modeChoice, voice: dict.oral.modeVoice }}
                  disabled={phase === 'revealed'}
                />
              </div>
            ) : null}

            {/* Header — question is the hero */}
```

7. Replace `                  <AudioButton src={q.questionAudioSrc} label={dict.flashcards.listenQuestion} size="sm" />` with:

```tsx
                  <AudioButton
                    src={q.questionAudioSrc}
                    label={dict.flashcards.listenQuestion}
                    size="sm"
                    onBeforePlay={spoken.beforeAudio}
                    preferWebAudio={spoken.mic.sessionRunning}
                  />
```

8. Wrap the options block. Replace `            {/* Options — stacked before answering, 2-up after (or in exam mode) */}\n            <div className="grid grid-cols-1 gap-[clamp(0.5rem,1.2vh,0.75rem)]">` with:

```tsx
            {/* Answer — Tự nói (mic or typed) or the options, stacked before answering */}
            {spoken.voiceHere ? (
              <MicAnswerPanel
                key={q.itemId}
                input={spoken.panelInput}
                mic={spoken.mic}
                locked={spoken.locked}
                nearAnswer={spoken.nearPrompt}
                onSubmit={spoken.onSubmit}
                onNearAnswer={spoken.onNearAnswer}
                prompt={spoken.reask ? dict.oral.yesNoReask : undefined}
                notice={spoken.micLost ? dict.oral.micLostTyped : undefined}
                onUseTyped={spoken.typedFallback}
              />
            ) : (
            <div className="grid grid-cols-1 gap-[clamp(0.5rem,1.2vh,0.75rem)]">
```

   Then replace the options grid's closing lines

```tsx
              })}
            </div>

            {/* Mobile support — exam shows the Exam Rules card; practice shows a
```

with

```tsx
              })}
            </div>
            )}

            {/* Mobile support — exam shows the Exam Rules card; practice shows a
```

9. In the feedback block, replace both `pickedOption?.isCorrect ?` with `revealedCorrect ?`. They are the `className` ternary and the label ternary.
10. Replace the feedback answer audio

```tsx
                    <AudioButton src={q.answerAudioSrc} label={dict.flashcards.listenAnswer} size="sm" className="ml-auto" />
```

with

```tsx
                    <AudioButton
                      src={q.answerAudioSrc}
                      label={dict.flashcards.listenAnswer}
                      size="sm"
                      className="ml-auto"
                      onBeforePlay={spoken.beforeAudio}
                      preferWebAudio={spoken.mic.sessionRunning}
                    />
```

11. Directly before the feedback's `<ul className="text-gray-700 space-y-0.5 list-disc pl-5"`, add:

```tsx
                {spoken.voiceHere && spoken.voiceText ? (
                  <div className="text-gray-700 mb-1" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    <span className="font-semibold">{spoken.panelInput === 'typed' ? dict.oral.youTyped : dict.oral.youSaid}</span>{' '}
                    {spoken.voiceText}
                  </div>
                ) : null}
```

In `src/app/n400ready/(app)/speaking/what-mean/page.tsx`, replace `onAnswer={(id, ok) => void recordSectionAnswer('whatmean', id, ok, 'practice')}` with `onAnswer={(id, ok, _selected, via) => void recordSectionAnswer('whatmean', id, ok, 'practice', via)}`.

- [ ] **Step 4: Run the tests, type-check and lint**

Run, separately (vitest exits non-zero on the known failure, so `&&` would skip the type-check):
- `npx vitest run src/components/n400`
- `npx tsc --noEmit`
- `npx eslint src/components/n400/speaking/SectionMCQuiz.tsx "src/app/n400ready/(app)/speaking/what-mean/page.tsx"`

Expected:
- vitest: the only failure is the pre-existing `mobile-layout.test.ts`. The run includes `navigation-ia.test.ts` ("SectionMCQuiz supports orchestrated (summary-less) runs");
- type-check 0 errors;
- eslint: no problems.

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/speaking/SectionMCQuiz.tsx "src/app/n400ready/(app)/speaking/what-mean/page.tsx" src/components/n400/oral/spoken-practice-wiring.test.ts
git commit -m "feat(n400app): What-mean practice — Tự nói with near prompt (practice only)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Gate S2 checklist, spec updates, full gate

**Files:**
- Create: `docs/superpowers/spikes/2026-09-25-n400-speaking-practice-gate2.md`
- Modify: `docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md` (§4 rulings, §12 status)

**Interfaces:** none.

- [ ] **Step 1: Write the Gate S2 checklist**

Create `docs/superpowers/spikes/2026-09-25-n400-speaking-practice-gate2.md`:

```markdown
# N400 Speaking Oral Answers — Gate S2 (practice device pass)

**Spec:** docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md §4 · **Plan:** docs/superpowers/plans/2026-09-25-n400-speaking-oral-s2-practice.md
**Prereqs:** migration n400_34 applied; S2 deployed; `voice_speaking` enabled for the tester (owner approval).

| # | Environment | Check | Result |
|---|---|---|---|
| 1 | iPhone Safari | Học tập → What-mean → Luyện tập opens in **Trắc nghiệm**; switch to **Tự nói**; answer 5 terms by voice. A correct answer shows correct + "Bạn nói: …"; a partial answer shows "Có phải bạn nói …?"; a wrong one shows the taught definition | |
| 2 | iPhone Safari | Tự nói stays on for the next terms. After the summary, **Làm lại** and **Ôn câu sai** start at question 1 in **Trắc nghiệm** | |
| 3 | iPhone Safari | 🔊 with Tự nói on: the question plays and the next mic tap still hears you. App switch and back: you can still speak | |
| 4 | iPhone Safari | Yes/No → Tự nói: "No, officer" is correct. "I don't know" shows "Bạn trả lời Yes hay No? Hãy nói lại." and the item stays open; then "No" grades it. The slow 🔊 is hidden in Tự nói | |
| 5 | Mac Chrome (Incognito) | Items 1, 2 and 4 | |
| 6 | Facebook in-app iOS | Tự nói shows the typed box; typed answers are graded | |
| 7 | Any | DB: new `n400_section_attempts` rows have `answer_mode` = voice (typed in in-app); choice answers have choice; a near confirmed with Đúng vậy adds no row | |
| 8 | Any | With `voice_speaking` off: no switch appears, and Làm lại starts a new session at question 1 (not the old summary) | |

## Decision (owner)

- Gate S2 pass? <yes/no>
```

- [ ] **Step 2: Spec updates**

In the speaking spec (§6's `note` column and the §4 wording were fixed in rev 1.1):

1. At the end of §4 (after the **iOS** bullet), add:

```markdown
- **S2 rulings:**
  - a 🔊 tapped while the mic is listening first drops the open capture window, so the question audio is never graded as the answer;
  - Yes/No's slow 🔊 (rate 0.7, `<audio>`) is hidden in Tự nói;
  - `answer_mode` is sent only for voice/typed answers (`'choice'` is the default);
  - the voice state machine is `useSpokenPractice` (`components/n400/oral/use-spoken-practice.ts`). Each item's answer is one object tagged with its item id; the pure rules live in `lib/n400/oral/spoken-practice.ts`;
  - both practice pages key their quiz by the session seed, so Làm lại and Ôn câu sai start a fresh session. This also fixed the old summary showing again.
```

2. In §12, replace `- **S2, Practice:** §4, migration` with `- **S2, Practice (built, plan docs/superpowers/plans/2026-09-25-n400-speaking-oral-s2-practice.md):** §4, migration`.

- [ ] **Step 3: Full gate**

Run `npm run type-check`, `npm run test` and `npm run build`, separately.
Expected:
- type-check 0 errors;
- test: the only failure is the pre-existing `mobile-layout.test.ts`;
- build succeeds.

- [ ] **Step 4: Commit**

```bash
git add ../../docs/superpowers/spikes/2026-09-25-n400-speaking-practice-gate2.md ../../docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md
git commit -m "docs(n400app): Gate S2 checklist; speaking spec §4/§12 for S2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**GATE S2 — stop.** The owner decides:
- merge and push;
- applying `n400_34` (if not done in Task 1);
- enabling `voice_speaking` for their accounts.

Then the owner runs the device checklist. Slice S3 waits for "Gate S2 pass: yes".
