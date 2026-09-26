# N400 Speaking Oral Answers — Slice S2 (Practice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Learners can switch What-mean and Yes/No practice to **Tự nói** and answer by voice (or typing in in-app browsers). Answers are graded by the S1 grader and recorded with `answer_mode`, behind a new `voice_speaking` flag.

**Architecture:**
- **One client hook**, `useSpokenPractice`, holds the voice state for a practice session: the switch, the mic, grading through `gradeSpokenItem`, the near prompt, the Yes/No re-ask, and the iOS 🔊 rules. Its decisions are pure (`spoken-practice.ts`).
- **Both quizzes use it:** `SectionYesNoQuiz` and `SectionMCQuiz` (practice variant only) render the Civics `AnswerModeToggle` + `MicAnswerPanel` in place of their answer buttons.
- **Data:** migration `n400_34` adds `answer_mode` to the Speaking tables and seeds the flag OFF. Choice answers insert exactly as before.

**Tech Stack:** Next.js 16 (client components only; no routing or server APIs change — `apps/website/AGENTS.md`), TypeScript, vitest (node, no DOM: page and component wiring is pinned by source-reading tests, the repo convention), Supabase (migration applied through the MCP after owner approval).

**Spec:** `docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md` (§4, §6, §7, §8; Gate S1 passed). Builds on `docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md` (rev 3.16).

## Global Constraints

- **Scope:** `apps/website/` only. All commands run from `apps/website/`.
- **Speaking must reuse the Civics UI exactly** (`AnswerModeToggle`, `MicAnswerPanel`, the "Bạn nói: …" line). No new visual components; the only panel change is one optional `prompt` prop.
- **Practice always opens in Trắc nghiệm;** Tự nói lasts for that session (spec S8).
- **D7:** a confirmed near ("Đúng vậy") is shown correct but never recorded.
- **D8:** a near-match only gives `near`.
- **Yes/No `unclear` is never graded or recorded;** the learner is asked again (spec S2).
- **The Full interview (`SectionMCQuiz` exam mode) must not change in S2.** Its voice is slice S4.
- **iOS 🔊 rules (Civics rev 3.12):**
  - every 🔊 on these screens passes `onBeforePlay` and `preferWebAudio={mic.sessionRunning}`;
  - `<audio>` playback deafens a persistent session for 20–33 s.
- **Hubs are untouched** (the no-scroll hub rule); only session screens change.
- **No DB or flag writes** except applying `n400_34` and enabling `voice_speaking` for the owner at Gate S2. Both need owner approval.
- **Gate commands, run separately:** `npm run type-check`, `npm run test` (the known pre-existing `mobile-layout.test.ts` failure excepted), `npm run build`.
- **Commits:** one logical change each, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings carried into this plan

1. **The flags table's text column is `note`**, not `description` (`n400_32` uses `note`). The spec §6 SQL is fixed in Task 8.
2. **`answer_mode` is sent only for voice/typed answers.** `'choice'` is the column default, so choice answers insert exactly as before `n400_34`. Code can ship before the migration is applied; the flag that turns voice on is created by the migration.
3. **🔊 while a capture window is open would be transcribed as the answer** (S1 final review, minor 2). The hook's `beforeAudio` drops an open window (`mic.state === 'listening'` → `reset()`) before noting the playback.
4. **Yes/No's slow 🔊 (rate 0.7) is hidden while an item is answered by voice.** `AudioButton` uses Web Audio only at rate 1, and `<audio>` would deafen the iOS session (rev 3.12). The normal 🔊 stays.
5. **`useSpokenPractice` lives in `components/n400/oral/`** next to `VoiceMicProvider`; its decisions live in `lib/n400/oral/spoken-practice.ts` so node tests cover them. Rule of three: the Civics practice page, `SectionYesNoQuiz` and `SectionMCQuiz` need the same state machine. The Civics page keeps its own copy (not refactored in S2).

## Review Focus

1. **iOS + Yes/No slow 🔊 in Tự nói** must not be offered: it would silence the mic for 20–33 s. Pinned in Task 6.
2. **🔊 tapped while the mic is listening** must not be graded as the answer. Several Yes/No questions contain "not", so the question audio would grade as a correct "No". Pinned in Task 5 (hook) and Tasks 6–7 (every 🔊 uses `beforeAudio`).
3. **A Yes/No "I don't know"** must leave the item unanswered: no count, no record, the prompt shown and the mic ready again. Pinned in Task 4 (pure) and Task 5 (hook).
4. **A What-mean near confirmed with "Đúng vậy"** is shown correct but not recorded (D7). Pinned in Task 4 and Task 7.
5. **The Full interview must be unchanged:** no switch and no mic in exam mode. Pinned in Task 7.

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
- Create: `apps/website/src/lib/n400/section-attempt-row.ts`
- Test: `apps/website/src/lib/n400/section-attempt-row.test.ts`
- Modify: `apps/website/src/lib/n400/user-state.tsx` (`recordSectionAnswer`)
- Modify: `apps/website/src/lib/n400/oral/use-voice-flags.ts`
- Test: `apps/website/src/lib/n400/oral/use-voice-flags.test.ts`

**Interfaces:**
- Produces:
  - `type AnswerMode = 'choice' | 'voice' | 'typed'`
  - `sectionAttemptRow(userId, section, itemId, wasCorrect, mode, answerMode = 'choice'): SectionAttemptRow`
  - `recordSectionAnswer(section, itemId, wasCorrect, mode, answerMode?: AnswerMode)`
  - `VoiceFlags.speakingOn: boolean`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/n400/section-attempt-row.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sectionAttemptRow } from './section-attempt-row';

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

Run: `npx vitest run src/lib/n400/section-attempt-row.test.ts src/lib/n400/oral/use-voice-flags.test.ts`
Expected: FAIL. `./section-attempt-row` cannot be resolved; the two flag tests fail on `toContain` / `toMatch`.

- [ ] **Step 3: Implement**

Create `src/lib/n400/section-attempt-row.ts`:

```ts
// The n400_section_attempts insert row (Speaking/Writing practice and flashcards).
// answer_mode is sent only for voice/typed answers: 'choice' is the column
// default, so choice answers insert exactly as before n400_34 (speaking spec §6).

export type AnswerMode = 'choice' | 'voice' | 'typed';

export interface SectionAttemptRow {
  user_id: string;
  section: string;
  item_id: string;
  mode: string;
  was_correct: boolean;
  answer_mode?: 'voice' | 'typed';
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
  if (answerMode !== 'choice') row.answer_mode = answerMode;
  return row;
}
```

In `src/lib/n400/user-state.tsx`, add the import next to the other `./` imports:

```ts
import { sectionAttemptRow, type AnswerMode } from './section-attempt-row';
```

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

Run: `npx vitest run src/lib/n400/section-attempt-row.test.ts src/lib/n400/oral/use-voice-flags.test.ts && npx tsc --noEmit`
Expected: PASS (2 + 2 tests); type-check 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/section-attempt-row.ts src/lib/n400/section-attempt-row.test.ts src/lib/n400/user-state.tsx src/lib/n400/oral/use-voice-flags.ts src/lib/n400/oral/use-voice-flags.test.ts
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

### Task 4: Pure practice rules (spec §4)

**Files:**
- Create: `apps/website/src/lib/n400/oral/spoken-practice.ts`
- Test: `apps/website/src/lib/n400/oral/spoken-practice.test.ts`

**Interfaces:**
- Consumes: `SpokenGrade`, `SpokenItem` (`grade-spoken-item.ts`, S1); `OralSection` (Task 3).
- Produces:
  - `interface SpokenStep { settle: boolean; shownCorrect: boolean; record: boolean | null; reask: boolean }`
  - `spokenPracticeStep(verdict: SpokenGrade['verdict'], nearAnswer: 'yes' | 'no' | null): SpokenStep`
  - `spokenQid(item: SpokenItem): number`
  - `spokenSection(item: SpokenItem): OralSection`

- [ ] **Step 1: Write the failing test**

Create `spoken-practice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { spokenPracticeStep, spokenQid, spokenSection } from './spoken-practice';

describe('spokenPracticeStep (speaking spec §4)', () => {
  it.each([
    ['correct', null, { settle: true, shownCorrect: true, record: true, reask: false }],
    ['wrong', null, { settle: true, shownCorrect: false, record: false, reask: false }],
    // Near waits for "Có phải bạn nói …?".
    ['near', null, { settle: false, shownCorrect: false, record: null, reask: false }],
    // D7: a confirmed near is shown correct but never recorded (Review Focus 4).
    ['near', 'yes', { settle: true, shownCorrect: true, record: null, reask: false }],
    ['near', 'no', { settle: true, shownCorrect: false, record: false, reask: false }],
    // Yes/No unclear: re-ask, nothing counted or recorded (Review Focus 3).
    ['unclear', null, { settle: false, shownCorrect: false, record: null, reask: true }],
  ] as const)('%s + %s', (verdict, nearAnswer, step) => {
    expect(spokenPracticeStep(verdict, nearAnswer)).toEqual(step);
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
// What Speaking practice does with a spoken grade (speaking spec §4). Pure: the
// hook use-spoken-practice.ts holds the state and calls these.

import type { OralSection } from '@/lib/n400/analytics';
import type { SpokenGrade, SpokenItem } from './grade-spoken-item';

export interface SpokenStep {
  /** The item is answered: reveal feedback and count it. */
  settle: boolean;
  shownCorrect: boolean;
  /** The value to record; null = record nothing (a confirmed near, D7, or not settled). */
  record: boolean | null;
  /** Yes/No unclear: ask again; nothing counted or recorded; the mic is ready. */
  reask: boolean;
}

export function spokenPracticeStep(verdict: SpokenGrade['verdict'], nearAnswer: 'yes' | 'no' | null): SpokenStep {
  if (verdict === 'correct') return { settle: true, shownCorrect: true, record: true, reask: false };
  if (verdict === 'wrong') return { settle: true, shownCorrect: false, record: false, reask: false };
  if (verdict === 'unclear') return { settle: false, shownCorrect: false, record: null, reask: true };
  if (nearAnswer === 'yes') return { settle: true, shownCorrect: true, record: null, reask: false };
  if (nearAnswer === 'no') return { settle: true, shownCorrect: false, record: false, reask: false };
  return { settle: false, shownCorrect: false, record: null, reask: false };
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
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/spoken-practice.ts src/lib/n400/oral/spoken-practice.test.ts
git commit -m "feat(n400app): pure Speaking practice rules (near D7, Yes/No re-ask)

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
  - Task 4: `spokenPracticeStep`, `spokenQid`, `spokenSection`.
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

  it('grades through the shared S1 grader', () => {
    expect(hook).toContain('gradeSpokenItem(item, text, location)');
    expect(hook).toContain('spokenPracticeStep(grade.verdict, null)');
  });

  it('unclear re-asks: resets the mic and never settles (Review Focus 3)', () => {
    const body = hook.slice(hook.indexOf('const onSubmit'), hook.indexOf('const onNearAnswer'));
    expect(body).toMatch(/if \(step\.reask\) \{\s*resetMic\(\);\s*return;\s*\}/);
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
// Shared by SectionYesNoQuiz and SectionMCQuiz. The decisions are pure
// (spoken-practice.ts); this hook only holds state.

import { useEffect, useState } from 'react';
import type { PracticeAnswerMode } from '@/components/n400/oral/AnswerModeToggle';
import { trackOralAnswer } from '@/lib/n400/analytics';
import { canSpeak, gradeSpokenItem, spokenItemFromId, type SpokenGrade } from '@/lib/n400/oral/grade-spoken-item';
import { offersTypedFallback } from '@/lib/n400/oral/mock-voice-items';
import { micErrorEvent, practiceAnswerEvent } from '@/lib/n400/oral/oral-events';
import { spokenPracticeStep, spokenQid, spokenSection } from '@/lib/n400/oral/spoken-practice';
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

  // Every visit starts in Trắc nghiệm; the switch lasts for this session (S8).
  const [answerMode, setAnswerMode] = useState<PracticeAnswerMode>('choice');
  const [voiceText, setVoiceText] = useState('');
  const [verdict, setVerdict] = useState<SpokenGrade['verdict'] | null>(null);
  const [nearPrompt, setNearPrompt] = useState<string | null>(null);
  const [nearAnswer, setNearAnswer] = useState<'yes' | 'no' | null>(null);
  const [micLost, setMicLost] = useState(false);

  // A new item starts clean (React-recommended reset during render)…
  const [prevItemId, setPrevItemId] = useState(opts.itemId);
  if (opts.itemId !== prevItemId) {
    setPrevItemId(opts.itemId);
    setVoiceText('');
    setVerdict(null);
    setNearPrompt(null);
    setNearAnswer(null);
  }
  // …and never inherits the previous item's capture window.
  const { reset: resetMic } = mic;
  useEffect(() => {
    resetMic();
  }, [opts.itemId, resetMic]);

  const locked = verdict !== null && verdict !== 'unclear';
  const voiceHere =
    locked || (voiceInput !== 'none' && answerMode === 'voice' && item !== null && canSpeak(item, location));

  // A stalled mic (deaf iOS session) → typed box for the rest of the session (Civics rev 3.11).
  if (!micLost && voiceHere && voiceInput === 'mic' && mic.error === 'stalled') setMicLost(true);
  const panelInput: 'mic' | 'typed' = voiceInput === 'typed' || micLost ? 'typed' : 'mic';
  const via: 'voice' | 'typed' = panelInput === 'typed' ? 'typed' : 'voice';

  // n400_oral_answer for mic errors (Civics spec §9), with this item's section.
  const micError = mic.error;
  useEffect(() => {
    if (micError && answerMode === 'voice' && item) {
      trackOralAnswer(micErrorEvent(spokenQid(item), 'practice', micError, spokenSection(item)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micError]);

  const onSubmit = (text: string) => {
    if (!item || locked) return;
    const grade = gradeSpokenItem(item, text, location);
    setVoiceText(text);
    // A near is sent once the learner answers "Có phải bạn nói …?" (onNearAnswer).
    if (grade.verdict !== 'near') {
      trackOralAnswer(practiceAnswerEvent(spokenQid(item), panelInput, grade.verdict, null, text, spokenSection(item)));
    }
    const step = spokenPracticeStep(grade.verdict, null);
    setVerdict(grade.verdict);
    setNearPrompt(grade.nearAnswer);
    // Yes/No unclear: nothing recorded; the mic is ready for another try.
    if (step.reask) {
      resetMic();
      return;
    }
    if (step.settle) opts.onSettle({ shownCorrect: step.shownCorrect, record: step.record, via });
  };

  const onNearAnswer = (yes: boolean) => {
    if (!item || verdict !== 'near' || nearAnswer !== null) return;
    setNearAnswer(yes ? 'yes' : 'no');
    trackOralAnswer(practiceAnswerEvent(spokenQid(item), panelInput, 'near', yes, voiceText, spokenSection(item)));
    const step = spokenPracticeStep('near', yes ? 'yes' : 'no');
    opts.onSettle({ shownCorrect: step.shownCorrect, record: step.record, via });
  };

  const changeMode = (m: PracticeAnswerMode) => {
    if (locked) return;
    setAnswerMode(m);
    setVoiceText('');
    setVerdict(null);
    setNearPrompt(null);
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
    typedFallback: panelInput === 'mic' && offersTypedFallback(mic.error) ? () => setMicLost(true) : undefined,
    voiceText,
    locked,
    shownCorrect: verdict !== null ? spokenPracticeStep(verdict, nearAnswer).shownCorrect : false,
    nearPrompt: verdict === 'near' && nearAnswer === null ? nearPrompt : null,
    reask: verdict === 'unclear',
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/n400/oral && npx tsc --noEmit`
Expected:
- PASS: 6 new tests, plus the existing oral component tests;
- type-check 0 errors (the hook compiles against the Task 2–4 interfaces).

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/oral/use-spoken-practice.ts src/components/n400/oral/MicAnswerPanel.tsx src/components/n400/oral/spoken-practice-wiring.test.ts src/lib/n400/i18n/vi.ts src/lib/n400/i18n/en.ts
git commit -m "feat(n400app): useSpokenPractice hook + MicAnswerPanel prompt for Speaking practice

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Yes/No practice — Tự nói (spec §4)

**Files:**
- Modify: `apps/website/src/components/n400/speaking/SectionYesNoQuiz.tsx`
- Modify: `apps/website/src/app/n400ready/(app)/speaking/yes-no/page.tsx`
- Test: `apps/website/src/components/n400/oral/spoken-practice-wiring.test.ts` (append)

**Interfaces:**
- Consumes: `useSpokenPractice` (Task 5); `AnswerMode` (Task 2); `recordSectionAnswer(..., answerMode)` (Task 2).
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
import type { AnswerMode } from '@/lib/n400/section-attempt-row';
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/n400 && npx tsc --noEmit`
Expected: PASS, the only failure being the pre-existing `mobile-layout.test.ts`; type-check 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/speaking/SectionYesNoQuiz.tsx "src/app/n400ready/(app)/speaking/yes-no/page.tsx" src/components/n400/oral/spoken-practice-wiring.test.ts
git commit -m "feat(n400app): Yes/No practice — Tự nói with re-ask on unclear

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: What-mean practice — Tự nói in `SectionMCQuiz` (spec §4)

**Files:**
- Modify: `apps/website/src/components/n400/speaking/SectionMCQuiz.tsx`
- Modify: `apps/website/src/app/n400ready/(app)/speaking/what-mean/page.tsx`
- Test: `apps/website/src/components/n400/oral/spoken-practice-wiring.test.ts` (append)

**Interfaces:**
- Consumes: `useSpokenPractice` (Task 5); `AnswerMode`; `recordSectionAnswer(..., answerMode)`.
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

  it('a confirmed near is not recorded (D7, Review Focus 4)', () => {
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
import type { AnswerMode } from '@/lib/n400/section-attempt-row';
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/n400 && npx tsc --noEmit`
Expected: PASS, the only failure being the pre-existing `mobile-layout.test.ts`. This includes `navigation-ia.test.ts` ("SectionMCQuiz supports orchestrated (summary-less) runs"). Type-check 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/speaking/SectionMCQuiz.tsx "src/app/n400ready/(app)/speaking/what-mean/page.tsx" src/components/n400/oral/spoken-practice-wiring.test.ts
git commit -m "feat(n400app): What-mean practice — Tự nói with near prompt (practice only)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Gate S2 checklist, spec updates, full gate

**Files:**
- Create: `docs/superpowers/spikes/2026-09-25-n400-speaking-practice-gate2.md`
- Modify: `docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md` (§6 `note`, §4 rulings, §12 status)

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
| 2 | iPhone Safari | 🔊 with Tự nói on: the question plays and the next mic tap still hears you. App switch and back: you can still speak | |
| 3 | iPhone Safari | Yes/No → Tự nói: "No, officer" is correct; "I don't know" shows "Bạn trả lời Yes hay No? Hãy nói lại." and the item stays open; the slow 🔊 is hidden in Tự nói | |
| 4 | Mac Chrome (Incognito) | Items 1 and 3 | |
| 5 | Facebook in-app iOS | Tự nói shows the typed box; typed answers are graded | |
| 6 | Any | DB: new `n400_section_attempts` rows have `answer_mode` = voice (typed in in-app); choice answers have choice | |
| 7 | Any | With `voice_speaking` off, no switch appears | |

## Decision (owner)

- Gate S2 pass? <yes/no>
```

- [ ] **Step 2: Spec updates**

In the speaking spec:

1. In §6's SQL block, replace `INSERT INTO public.n400_feature_flags (flag_key, enabled, rollout_pct, description)` with `INSERT INTO public.n400_feature_flags (flag_key, enabled, rollout_pct, note)` (the table's column is `note`, as in `n400_32`).
2. At the end of §4 (after the **iOS** bullet), add:

```markdown
- **S2 rulings:**
  - a 🔊 tapped while the mic is listening first drops the open capture window, so the question audio is never graded as the answer;
  - Yes/No's slow 🔊 (rate 0.7, `<audio>`) is hidden in Tự nói;
  - `answer_mode` is sent only for voice/typed answers (`'choice'` is the default);
  - the voice state machine is `useSpokenPractice` (`components/n400/oral/use-spoken-practice.ts`), with pure rules in `lib/n400/oral/spoken-practice.ts`.
```

3. In §12, replace `- **S2, Practice:** §4, migration` with `- **S2, Practice (built, plan docs/superpowers/plans/2026-09-25-n400-speaking-oral-s2-practice.md):** §4, migration`.

- [ ] **Step 3: Full gate**

Run `npm run type-check`, `npm run test` and `npm run build`, separately.
Expected:
- type-check 0 errors;
- test: the only failure is the pre-existing `mobile-layout.test.ts`;
- build succeeds.

- [ ] **Step 4: Commit**

```bash
git add ../../docs/superpowers/spikes/2026-09-25-n400-speaking-practice-gate2.md ../../docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md
git commit -m "docs(n400app): Gate S2 checklist; speaking spec §4/§6/§12 for S2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**GATE S2 — stop.** The owner decides:
- merge and push;
- applying `n400_34` (if not done in Task 1);
- enabling `voice_speaking` for their accounts.

Then the owner runs the device checklist. Slice S3 waits for "Gate S2 pass: yes".
