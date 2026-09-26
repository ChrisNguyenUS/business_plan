# N400 Speaking Oral Answers — Slice S3 (Thi thử Speaking) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Thi thử Speaking, learners can pick "Cách trả lời: Trả lời bằng giọng" and answer all 10 items by voice (or by typing in in-app browsers). Items are graded at the finish by the S1 grader, and the result is recorded with `answer_mode`.

**Architecture:**
- **Pure mock rules** live in `lib/n400/oral/spoken-mock.ts`: confirm, retry once, the Yes/No re-ask, and grading at the finish. Node tests run them on the real grader.
- **The Speaking mock page** keeps its state, like the Civics voice mock page:
  - it waits for the flags;
  - with voice available here it shows a small intro with the Civics "Cách trả lời" picker;
  - without voice it starts directly in Trắc nghiệm, as today.
- **A voice run answers every item through `MicAnswerPanel` variant `mock`.**
- **Shared pieces get two small, optional additions:**
  - `MockResultScreen`: a per-row answer label ("Bạn nói:") and the iOS 🔊 props;
  - `recordSectionMockResult`: `answer_mode`;
  - `oral-events`: two builders for Speaking mock events.

**Tech Stack:** Next.js 16 (client components only; no routing or server APIs change — `apps/website/AGENTS.md`), TypeScript, vitest in node (page and component wiring is pinned by source-reading tests, the repo convention), Supabase (no migration: `n400_section_mock_results.answer_mode` exists since `n400_34`).

**Spec:** `docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md` (rev 1.1: §5.1, §8, §10, S8; S2 built). Builds on `docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md` (rev 3.16; the Civics voice mock is the reference implementation: `src/app/n400ready/(app)/mock-test/civics/page.tsx`).

**Dry run (2026-09-26):** Tasks 1–7 were applied from this plan's text in a scratch worktree.
- Results: the 34 task tests pass; full suite 1310 pass, the only failure being the pre-existing `mobile-layout.test.ts`; type-check 0 errors; eslint 0 errors.
- `npm run build` could not run there, because Turbopack rejects a symlinked `node_modules`. Task 7's gate is the first build.

## Global Constraints

- **Scope:** `apps/website/` only. All commands run from `apps/website/`.
- **Speaking reuses the Civics UI exactly:**
  - the mock panel is `MicAnswerPanel` variant `mock`: "App nghe được: …", [Đúng vậy] / [Xác nhận], [Nói lại];
  - the picker is `AnswerModeToggle` with the Civics mock labels.
- **No new visual components** except the intro card, which the spec calls for. It is built from `Card`, the Civics intro classes and existing strings.
- **The intro shows only when voice is available here:**
  - available = `voice_speaking` on + a speech API, or an in-app browser, which types;
  - otherwise the test starts directly in Trắc nghiệm, as today.
- **The choice is remembered per surface** (spec S8): localStorage with try/catch, a key separate from the Civics mock's.
- **Voice run, per item:**
  - [Đúng vậy] locks the answer;
  - [Nói lại] is allowed once;
  - no verdict mid-test.
- **A Yes/No `unclear` re-asks** "Bạn trả lời Yes hay No? Hãy nói lại.". Neither that nor a mic error consumes the retry (spec §5.1, §10).
- **Grading happens at the finish** with `gradeSpokenItem`; `near` counts as wrong (D8). Pass is ≥ 8/10, as before.
- **Mic trouble:** a lost mic types the remaining items, and in-app browsers type from the start. A voice run never falls back to multiple choice.
- **iOS 🔊 rules (Civics rev 3.12):**
  - every 🔊 passes `onBeforePlay` and `preferWebAudio={mic.sessionRunning}`;
  - the slow 🔊 (`<audio>`, rate 0.7) never plays in a voice run or over an open session.
- **The Full interview and every other mock must be unchanged.** Other callers of the shared pieces pass nothing new.
- **No state updates during render, and no `setState` in an effect.** `react-hooks/set-state-in-effect` is an ESLint error here; touched files run `npx eslint`.
- **No DB or flag writes.**
- **Gate commands, run separately:** `npm run type-check`, `npm run test` (the known pre-existing `mobile-layout.test.ts` failure excepted), `npm run build`.
- **Commits:** one logical change each, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings carried into this plan

1. **Every Speaking mock item can be spoken.**
   - All 62 What-mean terms have oral configs (S1), and every Yes/No item grades.
   - So a voice run is all voice. A pure test pins it: if data ever breaks that, the test fails before the mock does.
2. **The "unclear" check at confirm** reads only `gradeSpokenItem(...).verdict === 'unclear'`. No correctness is stored or shown before the result screen.
3. **A voice run's `answer_mode`** is `'voice'` when any confirmed answer came from the mic, else `'typed'`. This is the Civics voice mock rule (`grade-voice-mock.ts`). Choice runs send nothing (`'choice'` is the column default).
4. **Result rows of a voice run:**
   - they say "Bạn nói:" or "Bạn trả lời:" (typed) through a new optional per-row label;
   - wrong rows show the accepted answer, like every mock result row: the What-mean definition, or "No, officer" / "Yes, officer".
5. **Mock analytics (`n400_oral_answer`, context `mock`):**
   - one event per confirmed item at the finish, with its `section`. The verdict is `correct`/`wrong` (near counts as wrong), like the Civics voice mock;
   - an `unclear` event at each Yes/No re-ask, because spec §13 measures the unclear rate;
   - mic errors are sent with the item's section.
6. **The run mode:**
   - a direct start (no voice here) is *derived* once the flags load, so there is no `setState` in render or in an effect;
   - it is latched on the first pick, so a later flag reload can never flip a choice run into the intro;
   - Thi lại keeps the run's mode (Civics' Thi lại does the same).
7. **The mic-lost latch is derived in render** and latched in the handlers (confirm, retry, next), as in S2. It resets on Thi lại.
8. **The typed re-ask keeps the typed text,** the same as S2 practice (a deferred S2 minor). Both can change together later.
9. **`MockResultScreen`'s 🔊 follows the iOS rules** through optional props. After a voice run on iPhone, a 🔊 on the result screen followed by Thi lại would otherwise deafen the first item's mic.

## Review Focus

1. **A Yes/No "I don't know" in the mock:** it is asked again, nothing locks, and [Nói lại] is still offered. "No" can then be confirmed, and the item is graded only at the finish. Pinned in Task 2 (pure) and Task 6 (wiring).
2. **A mic error or a lost mic mid-test:**
   - a no-speech/network error keeps the retry;
   - a denied, unavailable or deaf mic types the remaining items;
   - in-app browsers type from the start;
   - never back to multiple choice.
   Pinned in Task 6.
3. **iPhone audio:**
   - the slow 🔊 is hidden in a voice run and over an open session;
   - every 🔊, including the result screen's, uses Web Audio while a session runs;
   - a 🔊 tapped while listening is never captured.
   Pinned in Tasks 4 and 6.
4. **No verdict mid-test:**
   - near counts as wrong at the finish;
   - score, pass (≥ 8/10) and `answer_mode` are recorded once;
   - one analytics event per item.
   Pinned in Tasks 1, 2, 3 and 6.
5. **The start flow:**
   - no flash of the quiz before the flags load;
   - without voice the test starts directly, as today;
   - the remembered choice;
   - a choice run never jumps to the intro;
   - Thi lại keeps the mode.
   Pinned in Task 6.

---

### Task 1: Record `answer_mode` for section mock results (spec §5.1, §6)

**Files:**
- Modify: `apps/website/src/lib/n400/attempt-row.ts`
- Test: `apps/website/src/lib/n400/attempt-row.test.ts` (append)
- Modify: `apps/website/src/lib/n400/user-state.tsx` (`recordSectionMockResult`)

**Interfaces:**
- Consumes: `AnswerMode` (existing, `attempt-row.ts`).
- Produces:
  - `sectionMockResultRow(userId, section: 'writing' | 'speaking', passed, score, total, answerMode: AnswerMode = 'choice'): SectionMockResultRow`
  - `recordSectionMockResult(section, passed, score, total, answerMode?: AnswerMode)`

- [ ] **Step 1: Write the failing test**

In `src/lib/n400/attempt-row.test.ts`, replace `import { practiceAttemptRow, sectionAttemptRow } from './attempt-row';` with `import { practiceAttemptRow, sectionAttemptRow, sectionMockResultRow } from './attempt-row';`, then append:

```ts
describe('sectionMockResultRow (speaking spec §5.1)', () => {
  it('a choice run inserts exactly as before (no answer_mode)', () => {
    expect(sectionMockResultRow('u1', 'speaking', true, 9, 10)).toEqual({
      user_id: 'u1',
      section: 'speaking',
      passed: true,
      score: 9,
      total: 10,
    });
    expect(sectionMockResultRow('u1', 'writing', false, 0, 3, 'choice')).not.toHaveProperty('answer_mode');
  });

  it('voice and typed runs carry answer_mode', () => {
    expect(sectionMockResultRow('u1', 'speaking', false, 7, 10, 'voice')).toMatchObject({ answer_mode: 'voice' });
    expect(sectionMockResultRow('u1', 'speaking', true, 8, 10, 'typed')).toMatchObject({ answer_mode: 'typed' });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/attempt-row.test.ts`
Expected: FAIL. The 2 new tests fail with `sectionMockResultRow is not a function`; the 4 existing tests pass.

- [ ] **Step 3: Implement**

Append to `src/lib/n400/attempt-row.ts`:

```ts
/** One n400_section_mock_results row (Speaking/Writing mock). Like the rows above,
 *  `choice` omits answer_mode: the column defaults to 'choice' (speaking spec §6). */
export interface SectionMockResultRow {
  user_id: string;
  section: 'writing' | 'speaking';
  passed: boolean;
  score: number;
  total: number;
  answer_mode?: AnswerMode;
}

export function sectionMockResultRow(
  userId: string,
  section: 'writing' | 'speaking',
  passed: boolean,
  score: number,
  total: number,
  answerMode: AnswerMode = 'choice',
): SectionMockResultRow {
  const row: SectionMockResultRow = { user_id: userId, section, passed, score, total };
  return answerMode === 'choice' ? row : { ...row, answer_mode: answerMode };
}
```

In `src/lib/n400/user-state.tsx`:

1. Replace `import { practiceAttemptRow, sectionAttemptRow, type AnswerMode } from './attempt-row';` with `import { practiceAttemptRow, sectionAttemptRow, sectionMockResultRow, type AnswerMode } from './attempt-row';`.
2. In `recordSectionMockResult`, replace

```ts
      section: 'writing' | 'speaking',
      passed: boolean,
      score: number,
      total: number,
    ): Promise<{ unlockedBadges: string[] }> => {
```

with

```ts
      section: 'writing' | 'speaking',
      passed: boolean,
      score: number,
      total: number,
      answerMode: AnswerMode = 'choice',
    ): Promise<{ unlockedBadges: string[] }> => {
```

3. Replace `        .insert({ user_id: user.id, section, passed, score, total })` with `        .insert(sectionMockResultRow(user.id, section, passed, score, total, answerMode))`.

- [ ] **Step 4: Run the tests and the type-check**

Run: `npx vitest run src/lib/n400/attempt-row.test.ts && npx tsc --noEmit`
Expected: PASS (6 tests); type-check 0 errors. The existing callers (Viết mock, Full interview, Speaking mock) pass 4 arguments and are unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/attempt-row.ts src/lib/n400/attempt-row.test.ts src/lib/n400/user-state.tsx
git commit -m "feat(n400app): record answer_mode for Speaking/Writing mock results

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Pure Speaking mock rules (spec §5.1, §10)

**Files:**
- Create: `apps/website/src/lib/n400/oral/spoken-mock.ts`
- Test: `apps/website/src/lib/n400/oral/spoken-mock.test.ts`

**Interfaces:**
- Consumes (S1): `gradeSpokenItem`, `canSpeak`, `SpokenGrade`, `SpokenItem` (`grade-spoken-item.ts`); `OralLocation` (`get-oral-config.ts`).
- Produces:
  - `interface SpokenMockAnswer { transcript: string; retried: boolean; input: 'mic' | 'typed'; confirmed: boolean; reask: boolean }`
  - `mockConfirm(prev: SpokenMockAnswer | null, text: string, input: 'mic' | 'typed', verdict: SpokenGrade['verdict']): SpokenMockAnswer`
  - `mockRetry(input: 'mic' | 'typed'): SpokenMockAnswer`
  - `gradeSpokenMock(items: readonly (SpokenItem | null)[], answers: readonly (SpokenMockAnswer | null)[], location: OralLocation): { ok: boolean[]; score: number; answerMode: 'voice' | 'typed' }`

- [ ] **Step 1: Write the failing test**

Create `spoken-mock.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';
import { canSpeak, gradeSpokenItem, type SpokenItem } from './grade-spoken-item';
import { gradeSpokenMock, mockConfirm, mockRetry, type SpokenMockAnswer } from './spoken-mock';

// Speaking spec §5.1, §10. Runs on the real S1 grader.
const LOC = { stateCode: 'TX' as const, districtNumber: null };
const YN: SpokenItem = { kind: 'yesno', id: 'yn-1' };
const WM: SpokenItem = { kind: 'whatmean', id: 'wm-47' };
const confirm = (prev: SpokenMockAnswer | null, item: SpokenItem, text: string, input: 'mic' | 'typed' = 'mic') =>
  mockConfirm(prev, text, input, gradeSpokenItem(item, text, LOC).verdict);

describe('mockConfirm / mockRetry (Review Focus 1)', () => {
  it('"I don\'t know" is asked again: nothing locks and the retry is kept', () => {
    const reasked = confirm(null, YN, "I don't know");
    expect(reasked).toEqual({ transcript: '', retried: false, input: 'mic', confirmed: false, reask: true });
    expect(confirm(reasked, YN, 'No, officer')).toEqual({
      transcript: 'No, officer',
      retried: false,
      input: 'mic',
      confirmed: true,
      reask: false,
    });
  });

  it('[Nói lại] is used once; a re-ask after it neither restores nor spends it', () => {
    const retried = mockRetry('mic');
    expect(retried).toEqual({ transcript: '', retried: true, input: 'mic', confirmed: false, reask: false });
    expect(confirm(retried, YN, 'Maybe')).toMatchObject({ retried: true, confirmed: false, reask: true });
    expect(confirm(retried, YN, 'No')).toMatchObject({ retried: true, confirmed: true, reask: false });
  });

  it('a confirmed answer never changes', () => {
    const locked = confirm(null, YN, 'No, officer');
    expect(confirm(locked, YN, 'Yes')).toBe(locked);
  });

  it('a What-mean answer is not graded before the finish: any words lock (Review Focus 4)', () => {
    expect(confirm(null, WM, 'The marriage was cancelled')).toMatchObject({
      transcript: 'The marriage was cancelled',
      confirmed: true,
      reask: false,
    });
  });
});

describe('gradeSpokenMock (Review Focus 4)', () => {
  it('grades at the finish; near counts as wrong (D8); an unanswered or unknown item is wrong', () => {
    const items: (SpokenItem | null)[] = [YN, WM, { kind: 'yesno', id: 'yn-2' }, null];
    const answers = [confirm(null, YN, 'No, officer'), confirm(null, WM, 'The marriage was cancelled'), null, null];
    expect(gradeSpokenMock(items, answers, LOC)).toEqual({ ok: [true, false, false, false], score: 1, answerMode: 'voice' });
  });

  it("the run is 'voice' when any answer came from the mic, else 'typed'", () => {
    const typed = [confirm(null, YN, 'No', 'typed'), confirm(null, YN, 'No', 'typed')];
    expect(gradeSpokenMock([YN, YN], typed, LOC).answerMode).toBe('typed');
    const mixed = [confirm(null, YN, 'No', 'typed'), confirm(null, YN, 'No', 'mic')];
    expect(gradeSpokenMock([YN, YN], mixed, LOC).answerMode).toBe('voice');
  });

  it('every Speaking mock item can be spoken, so a voice run never mixes in multiple choice', () => {
    for (const q of WHATMEAN_QUESTIONS) expect(canSpeak({ kind: 'whatmean', id: q.id }, LOC)).toBe(true);
    for (const q of YESNO_QUESTIONS) expect(canSpeak({ kind: 'yesno', id: q.id }, LOC)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/oral/spoken-mock.test.ts`
Expected: FAIL: cannot resolve `./spoken-mock`.

- [ ] **Step 3: Implement**

Create `spoken-mock.ts`:

```ts
// What Thi thử Speaking does with a spoken answer (speaking spec §5.1, §10). Pure:
// the mock page holds one SpokenMockAnswer per item and calls these.

import type { OralLocation } from './get-oral-config';
import { gradeSpokenItem, type SpokenGrade, type SpokenItem } from './grade-spoken-item';

/** One mock item's answer. Nothing is graded until the finish (no verdict mid-test). */
export interface SpokenMockAnswer {
  /** The confirmed words ("Bạn nói: …" on the result screen). */
  transcript: string;
  /** [Nói lại] was used: it is allowed once per item. */
  retried: boolean;
  input: 'mic' | 'typed';
  /** [Đúng vậy] / [Xác nhận] locked it: the learner can move on. */
  confirmed: boolean;
  /** Yes/No neither yes nor no: asked again; the item stays open and the retry is kept. */
  reask: boolean;
}

/** After [Đúng vậy] / [Xác nhận]. A Yes/No answer that is neither yes nor no is
 *  asked again instead: nothing locks and [Nói lại] stays as it was (spec §10).
 *  A confirmed answer never changes. */
export function mockConfirm(
  prev: SpokenMockAnswer | null,
  text: string,
  input: 'mic' | 'typed',
  verdict: SpokenGrade['verdict'],
): SpokenMockAnswer {
  if (prev?.confirmed) return prev;
  const retried = prev?.retried ?? false;
  if (verdict === 'unclear') return { transcript: '', retried, input, confirmed: false, reask: true };
  return { transcript: text, retried, input, confirmed: true, reask: false };
}

/** After [Nói lại]: the item's one retry. A mic error or a re-ask never uses it. */
export function mockRetry(input: 'mic' | 'typed'): SpokenMockAnswer {
  return { transcript: '', retried: true, input, confirmed: false, reask: false };
}

/** Grading at the finish: gradeSpokenItem per item, `near` counts as wrong (D8). The
 *  run is 'voice' when any answer came from the mic, else 'typed' (the Civics voice
 *  mock rule). */
export function gradeSpokenMock(
  items: readonly (SpokenItem | null)[],
  answers: readonly (SpokenMockAnswer | null)[],
  location: OralLocation,
): { ok: boolean[]; score: number; answerMode: 'voice' | 'typed' } {
  const ok = items.map((item, i) => {
    const a = answers[i];
    return item !== null && a?.confirmed === true && gradeSpokenItem(item, a.transcript, location).verdict === 'correct';
  });
  const anyMic = answers.some((a) => a?.confirmed === true && a.input === 'mic');
  return { ok, score: ok.filter(Boolean).length, answerMode: anyMic ? 'voice' : 'typed' };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/n400/oral/spoken-mock.test.ts && npx eslint src/lib/n400/oral/spoken-mock.ts src/lib/n400/oral/spoken-mock.test.ts`
Expected: PASS (7 tests); eslint no problems.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/spoken-mock.ts src/lib/n400/oral/spoken-mock.test.ts
git commit -m "feat(n400app): pure Speaking mock rules — confirm, retry once, Yes/No re-ask, grade at finish

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Speaking mock analytics events (spec §8, §13)

**Files:**
- Modify: `apps/website/src/lib/n400/oral/oral-events.ts`
- Test: `apps/website/src/lib/n400/oral/oral-events.test.ts` (append)

**Interfaces:**
- Consumes: `SpokenMockAnswer` (Task 2); `spokenQid`, `spokenSection` (S2, `spoken-practice.ts`); `SpokenItem` (S1).
- Produces:
  - `speakingMockAnswerEvents(items: readonly (SpokenItem | null)[], answers: readonly (SpokenMockAnswer | null)[], ok: readonly boolean[]): OralAnswerEvent[]`
  - `mockReaskEvent(item: SpokenItem, input: 'mic' | 'typed', retried: boolean, transcript: string): OralAnswerEvent`

- [ ] **Step 1: Write the failing test**

In `src/lib/n400/oral/oral-events.test.ts`, add `speakingMockAnswerEvents` and `mockReaskEvent` to the import from `'./oral-events'`, add `import type { SpokenMockAnswer } from './spoken-mock';` after it, then append:

```ts
describe('Speaking mock events (speaking spec §5.1, §8)', () => {
  const answered = (transcript: string, input: 'mic' | 'typed', retried = false): SpokenMockAnswer => ({
    transcript,
    retried,
    input,
    confirmed: true,
    reask: false,
  });

  it('one event per confirmed item at the finish, with its section; near counts as wrong', () => {
    const events = speakingMockAnswerEvents(
      [
        { kind: 'whatmean', id: 'wm-47' },
        { kind: 'yesno', id: 'yn-7' },
        { kind: 'yesno', id: 'yn-8' },
      ],
      [answered('The marriage was cancelled', 'mic', true), answered('No', 'typed'), null],
      [false, true, false],
    );
    expect(events).toEqual([
      { qid: 47, section: 'whatmean', context: 'mock', input: 'mic', verdict: 'wrong', retried: true, confirmedNear: null, error: 'none', transcriptLength: 26 },
      { qid: 7, section: 'yesno', context: 'mock', input: 'typed', verdict: 'correct', retried: false, confirmedNear: null, error: 'none', transcriptLength: 2 },
    ]);
  });

  it('a Yes/No re-ask is an unclear mock event', () => {
    expect(mockReaskEvent({ kind: 'yesno', id: 'yn-3' }, 'mic', false, "I don't know")).toEqual({
      qid: 3,
      section: 'yesno',
      context: 'mock',
      input: 'mic',
      verdict: 'unclear',
      retried: false,
      confirmedNear: null,
      error: 'none',
      transcriptLength: 12,
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/oral/oral-events.test.ts`
Expected: FAIL. The 2 new tests fail (`speakingMockAnswerEvents is not a function`); the 8 existing tests pass.

- [ ] **Step 3: Implement**

In `src/lib/n400/oral/oral-events.ts`:

1. After `import type { VoiceItem } from './mock-voice-items';`, add:

```ts
import type { SpokenItem } from './grade-spoken-item';
import type { SpokenMockAnswer } from './spoken-mock';
import { spokenQid, spokenSection } from './spoken-practice';
```

2. Append at the end of the file:

```ts
/** Thi thử Speaking (speaking spec §5.1, §8): one event per confirmed item at the
 *  finish, with its section. `near` counts as wrong (D8), so the verdict is correct
 *  or wrong, like the Civics voice mock. */
export function speakingMockAnswerEvents(
  items: readonly (SpokenItem | null)[],
  answers: readonly (SpokenMockAnswer | null)[],
  ok: readonly boolean[],
): OralAnswerEvent[] {
  const events: OralAnswerEvent[] = [];
  items.forEach((item, i) => {
    const a = answers[i];
    if (!item || !a?.confirmed) return;
    events.push({
      qid: spokenQid(item),
      section: spokenSection(item),
      context: 'mock',
      input: a.input,
      verdict: ok[i] ? 'correct' : 'wrong',
      retried: a.retried,
      confirmedNear: null,
      error: 'none',
      transcriptLength: a.transcript.length,
    });
  });
  return events;
}

/** A Yes/No mock answer that was neither yes nor no: asked again, retry kept (spec §10).
 *  Sent so the unclear rate can be measured (spec §13). */
export function mockReaskEvent(
  item: SpokenItem,
  input: 'mic' | 'typed',
  retried: boolean,
  transcript: string,
): OralAnswerEvent {
  return {
    qid: spokenQid(item),
    section: spokenSection(item),
    context: 'mock',
    input,
    verdict: 'unclear',
    retried,
    confirmedNear: null,
    error: 'none',
    transcriptLength: transcript.length,
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/n400/oral/oral-events.test.ts && npx tsc --noEmit && npx eslint src/lib/n400/oral/oral-events.ts`
Expected: PASS (10 tests); type-check 0 errors; eslint no problems.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/oral-events.ts src/lib/n400/oral/oral-events.test.ts
git commit -m "feat(n400app): n400_oral_answer builders for the Speaking mock (per item, Yes/No re-ask)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `MockResultScreen` — per-row answer label and iOS 🔊 props

**Files:**
- Modify: `apps/website/src/components/n400/MockResultScreen.tsx`
- Test: `apps/website/src/components/n400/speaking/speaking-mock-voice-wiring.test.ts` (create)

**Interfaces:**
- Produces:
  - `MockResultRow.userAnswerLabel?: string` (per-row, wins over the screen's `userAnswerLabel`)
  - `MockResultScreen` props `onBeforePlay?: () => void`, `preferWebAudio?: () => boolean` (for every row 🔊)
- Existing callers pass neither and render exactly as before.

- [ ] **Step 1: Write the failing test**

Create `src/components/n400/speaking/speaking-mock-voice-wiring.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin the Thi thử Speaking voice wiring by source (speaking spec §5.1).
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('MockResultScreen — voice rows', () => {
  const screen = read('src/components/n400/MockResultScreen.tsx');

  it('a row can say "Bạn nói:" instead of the screen-wide label', () => {
    expect(screen).toMatch(/export interface MockResultRow \{[^}]*userAnswerLabel\?: string;/);
    expect(screen).toContain('{row.userAnswerLabel ?? effectiveUserAnswerLabel} ');
  });

  it("the rows' 🔊 can follow the iOS rules (Review Focus 3)", () => {
    expect(screen).toContain('onBeforePlay={onBeforePlay}');
    expect(screen).toContain('preferWebAudio={preferWebAudio}');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/n400/speaking/speaking-mock-voice-wiring.test.ts`
Expected: FAIL (2 tests).

- [ ] **Step 3: Implement**

In `src/components/n400/MockResultScreen.tsx`:

1. In `export interface MockResultRow`, after `  userAnswer: string | null;`, add:

```ts
  /** Overrides the screen's label for this row, e.g. "Bạn nói:" for a voice answer. */
  userAnswerLabel?: string;
```

2. In the `MockResultScreen` destructured props, replace `  hubHref,\n}: {` with `  hubHref,\n  onBeforePlay,\n  preferWebAudio,\n}: {`.
3. In its props type, replace

```ts
  /** "Về trang Thi thử" target on the pass footer. */
  hubHref: string;
}) {
```

with

```ts
  /** "Về trang Thi thử" target on the pass footer. */
  hubHref: string;
  /** iOS 🔊 rules for the rows' 🔊 while a mic session may be open (Civics rev 3.12). */
  onBeforePlay?: () => void;
  preferWebAudio?: () => boolean;
}) {
```

4. Replace `                    <span className="text-gray-500">{effectiveUserAnswerLabel} </span>` with `                    <span className="text-gray-500">{row.userAnswerLabel ?? effectiveUserAnswerLabel} </span>`.
5. Replace `                      <AudioButton src={row.audioSrc} size="sm" label={dict.flashcards.listenQuestion} />` with:

```tsx
                      <AudioButton
                        src={row.audioSrc}
                        size="sm"
                        label={dict.flashcards.listenQuestion}
                        onBeforePlay={onBeforePlay}
                        preferWebAudio={preferWebAudio}
                      />
```

- [ ] **Step 4: Run the tests, type-check and lint**

Run, separately:
- `npx vitest run src/components/n400/speaking/speaking-mock-voice-wiring.test.ts`
- `npx tsc --noEmit`
- `npx eslint src/components/n400/MockResultScreen.tsx`

Expected: PASS (2 tests); type-check 0 errors; eslint no problems.

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/MockResultScreen.tsx src/components/n400/speaking/speaking-mock-voice-wiring.test.ts
git commit -m "feat(n400app): MockResultScreen — per-row answer label and iOS 🔊 props

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `SpeakingMockIntro` — "Cách trả lời" before the test (spec §5.1)

**Files:**
- Create: `apps/website/src/components/n400/speaking/SpeakingMockIntro.tsx`
- Test: `apps/website/src/components/n400/speaking/speaking-mock-voice-wiring.test.ts` (append)

**Interfaces:**
- Consumes: `AnswerModeToggle`, `PracticeAnswerMode` (existing); `Card` (existing, `@/components/n400/ui`); strings `dict.mockTest.tests.speaking.{title,desc,questions,duration,passRule}`, `dict.oral.{mockModeLabel,modeChoice,mockModeVoice}`, `dict.mockTest.intro.startButtonFirst` (all existing, vi + en).
- Produces: `SpeakingMockIntro({ mode, onModeChange, onStart }: { mode: PracticeAnswerMode; onModeChange: (m: PracticeAnswerMode) => void; onStart: () => void })`

- [ ] **Step 1: Write the failing test**

Append to `speaking-mock-voice-wiring.test.ts`:

```ts
describe('SpeakingMockIntro', () => {
  const intro = read('src/components/n400/speaking/SpeakingMockIntro.tsx');

  it('uses the Civics mock "Cách trả lời" picker', () => {
    expect(intro).toContain('{dict.oral.mockModeLabel}');
    expect(intro).toContain('labels={{ choice: dict.oral.modeChoice, voice: dict.oral.mockModeVoice }}');
  });

  it('describes this test with the existing strings and starts it', () => {
    expect(intro).toContain('const test = dict.mockTest.tests.speaking;');
    expect(intro).toContain('{dict.mockTest.intro.startButtonFirst}');
    expect(intro).toContain('onClick={onStart}');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/n400/speaking/speaking-mock-voice-wiring.test.ts`
Expected: FAIL: `ENOENT … SpeakingMockIntro.tsx`.

- [ ] **Step 3: Implement**

Create `src/components/n400/speaking/SpeakingMockIntro.tsx`:

```tsx
'use client';

// Thi thử Speaking intro (speaking spec §5.1). The page shows it only when voice
// is available here, so the learner can pick "Cách trả lời" before starting. The
// card follows the Civics mock intro hero; the picker is the Civics mock's (same
// label, toggle and labels).

import { ArrowRight, ClipboardCheck, Play } from 'lucide-react';
import { Card } from '@/components/n400/ui';
import { AnswerModeToggle, type PracticeAnswerMode } from '@/components/n400/oral/AnswerModeToggle';
import { useN400Lang } from '@/lib/n400/i18n/provider';

export function SpeakingMockIntro({
  mode,
  onModeChange,
  onStart,
}: {
  mode: PracticeAnswerMode;
  onModeChange: (m: PracticeAnswerMode) => void;
  onStart: () => void;
}) {
  const { dict } = useN400Lang();
  const test = dict.mockTest.tests.speaking;
  return (
    <div className="mx-auto w-full max-w-2xl animate-in fade-in duration-300">
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-50/80 via-white to-white"
        />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-600/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-teal-700">
            <ClipboardCheck size={13} />
            Mock Exam
          </div>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight text-gray-800 sm:text-4xl">{test.title}</h2>
          <p className="mt-2.5 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">{test.desc}</p>
          <p className="mt-2 text-sm font-medium text-gray-600">
            {test.questions} · {test.duration} · {test.passRule}
          </p>

          <div className="mt-7">
            <p className="mb-2 text-sm font-semibold text-gray-700">{dict.oral.mockModeLabel}</p>
            <AnswerModeToggle
              mode={mode}
              onChange={onModeChange}
              labels={{ choice: dict.oral.modeChoice, voice: dict.oral.mockModeVoice }}
            />
          </div>

          <button
            type="button"
            onClick={onStart}
            className="group mt-7 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-teal-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-teal-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-600/30 active:translate-y-0 active:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:py-5 sm:text-lg"
          >
            <Play size={18} className="shrink-0 fill-current" />
            {dict.mockTest.intro.startButtonFirst}
            <ArrowRight
              size={18}
              className="shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </button>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests, type-check and lint**

Run, separately:
- `npx vitest run src/components/n400/speaking/speaking-mock-voice-wiring.test.ts`
- `npx tsc --noEmit`
- `npx eslint src/components/n400/speaking/SpeakingMockIntro.tsx`

Expected: PASS (4 tests); type-check 0 errors; eslint no problems.

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/speaking/SpeakingMockIntro.tsx src/components/n400/speaking/speaking-mock-voice-wiring.test.ts
git commit -m "feat(n400app): SpeakingMockIntro — Cách trả lời before Thi thử Speaking

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Thi thử Speaking — voice run (spec §5.1)

**Files:**
- Modify (replace the whole file): `apps/website/src/app/n400ready/(app)/mock-test/speaking/page.tsx`
- Test: `apps/website/src/components/n400/speaking/speaking-mock-voice-wiring.test.ts` (append)

**Interfaces:**
- Consumes:
  - Task 1: `recordSectionMockResult(..., answerMode)`.
  - Task 2: `SpokenMockAnswer`, `mockConfirm`, `mockRetry`, `gradeSpokenMock`.
  - Task 3: `speakingMockAnswerEvents`, `mockReaskEvent`.
  - Task 4: `MockResultRow.userAnswerLabel`, `MockResultScreen` `onBeforePlay` / `preferWebAudio`.
  - Task 5: `SpeakingMockIntro`.
  - S1/S2: `gradeSpokenItem`, `spokenItemFromId`, `spokenQid`, `spokenSection`, `micErrorEvent(qid, context, error, section)`, `useVoiceFlags().speakingOn`.
  - Existing: `useSpeechRecognition`, `voiceInputFor`, `micLostFrom`, `mockItemInput`, `offersTypedFallback`, `MicAnswerPanel` (`variant="mock"`, `prompt`), `trackOralAnswer`.
- Produces: the page. Nothing else consumes it.

- [ ] **Step 1: Write the failing test**

Append to `speaking-mock-voice-wiring.test.ts`:

```ts
describe('Thi thử Speaking — voice run', () => {
  const page = read('src/app/n400ready/(app)/mock-test/speaking/page.tsx');

  it('offers voice with voice_speaking + support; without it the test starts directly (Review Focus 5)', () => {
    expect(page).toContain('enabled: voiceFlags.speakingOn,');
    expect(page).toContain("startedMode ?? (voiceFlags.loaded && !voiceAvailable ? 'choice' : null)");
    expect(page).toContain('<SpeakingMockIntro');
    expect(page).toContain('if (!voiceFlags.loaded) {');
  });

  it('remembers the choice for this test, and latches a direct start on the first pick (S8)', () => {
    expect(page).toContain("const SPEAKING_MOCK_MODE_KEY = 'n400.mock.speaking.answerMode';");
    expect(page).toContain('window.localStorage.setItem(SPEAKING_MOCK_MODE_KEY, m);');
    expect(page.match(/if \(startedMode === null\) setStartedMode\('choice'\);/g)).toHaveLength(2);
  });

  it('answers through the Civics mock panel; a re-ask or a mic error keeps the retry (Review Focus 1, 2)', () => {
    expect(page).toMatch(/<MicAnswerPanel\s+key=\{item\.id\}\s+variant="mock"/);
    expect(page).toContain('canRetry={!current?.retried}');
    expect(page).toContain('prompt={current?.reask ? dict.oral.yesNoReask : undefined}');
    expect(page).toContain('mockConfirm(current, text, itemInput, gradeSpokenItem(spoken, text, location).verdict)');
  });

  it('a lost mic types the rest of the test; in-app browsers type from the start (Review Focus 2)', () => {
    expect(page).toContain('const micLost = micLatched || lostNow;');
    expect(page).toContain('const itemInput = mockItemInput(voiceInput, micLost);');
    expect(page.match(/latchMicLost\(\);/g)).toHaveLength(3);
  });

  it('grades at the finish and records the run once, with how it was answered (Review Focus 4)', () => {
    expect(page).toContain('const graded = gradeSpokenMock(spokenItems, voiceAnswers, location);');
    expect(page).toContain(
      "void recordSectionMockResult('speaking', graded.score >= PASS_THRESHOLD, graded.score, TOTAL, graded.answerMode);",
    );
    expect(page).toContain('for (const e of speakingMockAnswerEvents(spokenItems, voiceAnswers, graded.ok)) trackOralAnswer(e);');
    expect(page).toContain("trackOralAnswer(micErrorEvent(spokenQid(spoken), 'mock', micError, spokenSection(spoken)));");
  });

  it('every 🔊 uses the iOS rules; the slow 🔊 never plays in a voice run or over an open session (Review Focus 3)', () => {
    expect(page.match(/onBeforePlay=\{audio\.onBeforePlay\}/g)).toHaveLength(2);
    expect(page.match(/preferWebAudio=\{audio\.preferWebAudio\}/g)).toHaveLength(2);
    expect(page.match(/\{audio\.showSlow \? \(/g)).toHaveLength(2);
    expect(page).toContain("showSlow: runMode !== 'voice' && !mic.sessionRunning(),");
    expect(page).toContain("if (mic.state === 'listening') resetMic();");
    expect(page).toMatch(/onBeforePlay=\{beforeAudio\}\s+preferWebAudio=\{mic\.sessionRunning\}/);
  });

  it('result rows say "Bạn nói:" / "Bạn trả lời:"', () => {
    expect(page).toContain("userAnswerLabel: answer?.input === 'typed' ? dict.oral.youTyped : dict.oral.youSaid,");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/n400/speaking/speaking-mock-voice-wiring.test.ts`
Expected: FAIL (7 new failures).

- [ ] **Step 3: Implement**

Replace the whole of `src/app/n400ready/(app)/mock-test/speaking/page.tsx` with:

```tsx
'use client';

// Thi thử Speaking — hybrid speaking mock test. Combines 5 What Mean
// multiple-choice items with 5 Yes/No items into a single shuffled 10-question
// session. Chrome reuses the exact Speaking-section quiz layout (progress strip,
// question card, pinned Next, decorative sidebar); the two card bodies (A/B/C/D
// grid vs Yes/No buttons) are branched per item. Pass rule: answer ≥ 8 / 10.
//
// Exam semantics: picking only selects (re-pickable); grading happens silently
// on Tiếp theo and the answer is never revealed mid-run — the score surfaces
// on the result screen only, like the real interview.
//
// Voice run (speaking spec §5.1): when voice is available here, an intro offers
// "Cách trả lời". A voice run answers every item through the Civics mock panel
// ([Đúng vậy] locks, [Nói lại] once) and is graded at the finish; a Yes/No
// answer that is neither yes nor no is asked again. Without voice the test
// starts directly in Trắc nghiệm, as before.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { AudioButton } from '@/components/n400/AudioButton';
import { MockResultScreen, type MockResultRow } from '@/components/n400/MockResultScreen';
import { MockExamProgress, MockExamPanel, MockExamRulesCard } from '@/components/n400/mock-test-chrome';
import type { PracticeAnswerMode } from '@/components/n400/oral/AnswerModeToggle';
import { MicAnswerPanel } from '@/components/n400/oral/MicAnswerPanel';
import { SpeakingMockIntro } from '@/components/n400/speaking/SpeakingMockIntro';
import { trackOralAnswer } from '@/lib/n400/analytics';
import { useN400UserState } from '@/lib/n400/user-state';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';
import { buildWhatMeanOptions } from '@/lib/n400/whatmean-options';
import {
  shuffle,
  whatMeanQuestionAudioUrl,
  whatMeanAnswerAudioUrl,
  yesNoAudioUrl,
} from '@/lib/n400/quiz-engine';
import { gradeSpokenItem, spokenItemFromId } from '@/lib/n400/oral/grade-spoken-item';
import { micLostFrom, mockItemInput, offersTypedFallback } from '@/lib/n400/oral/mock-voice-items';
import { micErrorEvent, mockReaskEvent, speakingMockAnswerEvents } from '@/lib/n400/oral/oral-events';
import { gradeSpokenMock, mockConfirm, mockRetry, type SpokenMockAnswer } from '@/lib/n400/oral/spoken-mock';
import { spokenQid, spokenSection } from '@/lib/n400/oral/spoken-practice';
import { useSpeechRecognition } from '@/lib/n400/oral/use-speech-recognition';
import { useVoiceFlags } from '@/lib/n400/oral/use-voice-flags';
import { voiceInputFor } from '@/lib/n400/oral/voice-support';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';
import type { N400Dict } from '@/lib/n400/i18n/vi';

const MC_COUNT = 5;
const YESNO_COUNT = 5;
const TOTAL = MC_COUNT + YESNO_COUNT;
const PASS_THRESHOLD = 8; // đúng ≥ 8/10 là đạt
// The learner's "Cách trả lời" for this test, remembered apart from the Civics
// mock's (speaking spec S8).
const SPEAKING_MOCK_MODE_KEY = 'n400.mock.speaking.answerMode';

type Choice = 'yes' | 'no';

interface McItem {
  kind: 'mc';
  id: string;
  badge: string;
  headerEn: string;
  headerVi: string;
  questionAudioSrc: string | null;
  answerAudioSrc: string | null;
  options: { id: 'A' | 'B' | 'C' | 'D'; en: string; isCorrect: boolean }[];
  accepted: { en: string; vi: string };
}

interface YesNoItem {
  kind: 'yesno';
  id: string;
  num: number;
  questionEn: string;
  questionVi: string;
  answer: Choice;
  audioSrc: string | null;
}

type MockItem = McItem | YesNoItem;

/** iOS 🔊 rules (Civics rev 3.12) for the question 🔊 on this screen. */
interface AudioRules {
  onBeforePlay: () => void;
  preferWebAudio: () => boolean;
  /** The slow 🔊 plays through <audio>, which deafens an open iOS mic session. */
  showSlow: boolean;
}

function readStoredMode(): PracticeAnswerMode {
  try {
    return window.localStorage.getItem(SPEAKING_MOCK_MODE_KEY) === 'voice' ? 'voice' : 'choice';
  } catch {
    return 'choice';
  }
}

function buildItems(seed: number, dict: N400Dict): MockItem[] {
  const mc: McItem[] = shuffle([...WHATMEAN_QUESTIONS], `mock-spk-wm-${seed}`)
    .slice(0, MC_COUNT)
    .map((q) => ({
      kind: 'mc',
      id: q.id,
      badge: tFormat(dict.speaking.whatmean.badge, { num: q.num }),
      headerEn: q.termEn,
      headerVi: q.questionVi,
      questionAudioSrc: whatMeanQuestionAudioUrl(q.num),
      answerAudioSrc: whatMeanAnswerAudioUrl(q.num),
      options: buildWhatMeanOptions(q, `${seed}-${q.id}`).map((o) => ({
        id: o.id,
        en: o.text,
        isCorrect: o.isCorrect,
      })),
      accepted: { en: q.definitionEn, vi: q.definitionVi },
    }));

  const yesno: YesNoItem[] = shuffle([...YESNO_QUESTIONS], `mock-spk-yn-${seed}`)
    .slice(0, YESNO_COUNT)
    .map((q) => ({
      kind: 'yesno',
      id: q.id,
      num: q.num,
      questionEn: q.questionEn,
      questionVi: q.questionVi,
      answer: q.answer,
      audioSrc: yesNoAudioUrl(q.num),
    }));

  return shuffle([...mc, ...yesno], `mock-spk-mix-${seed}`);
}

/** A voice-run result row: what the learner said or typed, and the accepted answer. */
function voiceRow(item: MockItem, i: number, answer: SpokenMockAnswer | null, ok: boolean, dict: N400Dict): MockResultRow {
  const said = {
    userAnswer: answer?.confirmed ? answer.transcript : null,
    userAnswerLabel: answer?.input === 'typed' ? dict.oral.youTyped : dict.oral.youSaid,
    ok,
  };
  if (item.kind === 'mc') {
    return {
      key: `${i}-${item.id}`,
      badge: tFormat(dict.mockTest.speakingMock.mcBadge, { index: i + 1, badge: item.badge }),
      prompt: item.headerEn,
      promptVi: item.headerVi,
      correctAnswer: item.accepted.en,
      correctAnswerVi: item.accepted.vi,
      audioSrc: item.questionAudioSrc,
      ...said,
    };
  }
  return {
    key: `${i}-${item.id}`,
    badge: tFormat(dict.mockTest.speakingMock.ynBadge, { index: i + 1, num: item.num }),
    prompt: item.questionEn,
    promptVi: item.questionVi,
    correctAnswer: item.answer === 'yes' ? 'Yes, officer' : 'No, officer',
    audioSrc: item.audioSrc,
    ...said,
  };
}

export default function ThiThuSpeakingPage() {
  const { dict } = useN400Lang();
  const { state, recordSectionMockResult } = useN400UserState();
  const location = { stateCode: state.settings.stateCode, districtNumber: state.address.districtNumber };

  const [seed, setSeed] = useState(0);
  const items = useMemo(() => buildItems(seed, dict), [seed, dict]);

  const [index, setIndex] = useState(0);
  const [pickedMc, setPickedMc] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [pickedYn, setPickedYn] = useState<Choice | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  // Per-question verdicts collected as each answer is graded — feeds the
  // result screen's answer sheet (the learner never sees them mid-run).
  const [answers, setAnswers] = useState<MockResultRow[]>([]);
  const [finished, setFinished] = useState(false);

  // Voice (speaking spec §5.1): voice_speaking + this browser decide whether the
  // intro offers "Cách trả lời".
  const mic = useSpeechRecognition();
  const voiceFlags = useVoiceFlags();
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const voiceInput = voiceInputFor({
    ua,
    apiPresent: mic.supported,
    enabled: voiceFlags.speakingOn,
    androidOn: voiceFlags.androidOn,
  });
  const voiceAvailable = voiceInput !== 'none';
  const [answerMode, setAnswerMode] = useState<PracticeAnswerMode>(() => readStoredMode());
  // The run's mode, latched at start. Without voice here the test starts directly
  // in Trắc nghiệm once the flags are known (derived, latched on the first pick).
  const [startedMode, setStartedMode] = useState<PracticeAnswerMode | null>(null);
  const runMode: PracticeAnswerMode | null =
    startedMode ?? (voiceFlags.loaded && !voiceAvailable ? 'choice' : null);
  const [voiceAnswers, setVoiceAnswers] = useState<(SpokenMockAnswer | null)[]>([]);
  // A lost mic (denied, unavailable, deaf) types the rest of the test. Derived, so
  // the typed box shows at once; latched in the handlers, because the next item's
  // mic reset clears the error.
  const [micLatched, setMicLatched] = useState(false);
  const lostNow = runMode === 'voice' && voiceInput === 'mic' && micLostFrom(mic.error, mic.supported);
  const micLost = micLatched || lostNow;
  const latchMicLost = () => {
    if (lostNow) setMicLatched(true);
  };
  const itemInput = mockItemInput(voiceInput, micLost);

  const item = items[index];
  const spoken = item ? spokenItemFromId(item.id) : null;
  const voiceHere = runMode === 'voice' && spoken !== null;
  const current = voiceAnswers[index] ?? null;

  // A new item never inherits the previous item's capture window.
  const { reset: resetMic } = mic;
  useEffect(() => {
    resetMic();
  }, [index, resetMic]);

  // n400_oral_answer for mic errors during a voice run (spec §8).
  const micError = mic.error;
  useEffect(() => {
    if (!micError || !voiceHere || finished || !spoken) return;
    trackOralAnswer(micErrorEvent(spokenQid(spoken), 'mock', micError, spokenSection(spoken)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micError]);

  // 🔊 while a capture window is open would be heard as the answer (speaking S2):
  // drop the window, then let the controller note the playback.
  const beforeAudio = () => {
    if (mic.state === 'listening') resetMic();
    mic.noteAudioPlayed();
  };
  const audio: AudioRules = {
    onBeforePlay: beforeAudio,
    preferWebAudio: mic.sessionRunning,
    showSlow: runMode !== 'voice' && !mic.sessionRunning(),
  };

  const retake = () => {
    setSeed((s) => s + 1);
    setIndex(0);
    setPickedMc(null);
    setPickedYn(null);
    setCorrectCount(0);
    setAnswers([]);
    setFinished(false);
    setVoiceAnswers([]);
    setMicLatched(false);
  };

  const onModeChange = (m: PracticeAnswerMode) => {
    setAnswerMode(m);
    try {
      window.localStorage.setItem(SPEAKING_MOCK_MODE_KEY, m);
    } catch {
      // Private mode — the choice lasts for this page only.
    }
  };

  if (finished) {
    return (
      <MockResultScreen
        passed={correctCount >= PASS_THRESHOLD}
        score={correctCount}
        total={TOTAL}
        requirement={tFormat(dict.mockTest.speakingMock.requirement, { need: PASS_THRESHOLD, total: TOTAL })}
        passSubtitle={dict.mockTest.speakingMock.passSubtitle}
        onRetake={retake}
        rows={answers}
        reviewHref={`/n400ready/study`}
        reviewLabel={dict.mockTest.speakingMock.reviewLabel}
        reviewTip={dict.mockTest.speakingMock.reviewTip}
        hubHref={`/n400ready/mock-test`}
        onBeforePlay={beforeAudio}
        preferWebAudio={mic.sessionRunning}
      />
    );
  }

  if (runMode === null) {
    // The flags decide whether there is an intro: wait for them (Civics rev 3.14).
    if (!voiceFlags.loaded) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 animate-in fade-in duration-300">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
          <p className="text-sm font-medium text-gray-600">{dict.mockTest.intro.preparingQuestions}</p>
        </div>
      );
    }
    return (
      <SpeakingMockIntro
        mode={answerMode}
        onModeChange={onModeChange}
        onStart={() => setStartedMode(answerMode === 'voice' ? 'voice' : 'choice')}
      />
    );
  }

  if (!item) return null;

  const isLast = index === items.length - 1;
  const hasPick = item.kind === 'mc' ? pickedMc !== null : pickedYn !== null;
  const ready = voiceHere ? current?.confirmed === true : hasPick;

  // Picking only selects — re-pickable until Tiếp theo, no grading yet.
  const onPickMc = (id: 'A' | 'B' | 'C' | 'D') => {
    if (item.kind !== 'mc') return;
    if (startedMode === null) setStartedMode('choice');
    setPickedMc(id);
  };

  const onPickYn = (choice: Choice) => {
    if (item.kind !== 'yesno') return;
    if (startedMode === null) setStartedMode('choice');
    setPickedYn(choice);
  };

  const onVoiceConfirm = (text: string) => {
    latchMicLost();
    if (!spoken) return;
    const next = mockConfirm(current, text, itemInput, gradeSpokenItem(spoken, text, location).verdict);
    setVoiceAnswers((prev) => {
      const out = [...prev];
      out[index] = next;
      return out;
    });
    // Yes/No neither yes nor no: asked again, the retry kept (spec §5.1, §10).
    if (next.reask) {
      trackOralAnswer(mockReaskEvent(spoken, itemInput, next.retried, text));
      resetMic();
    }
  };

  const onVoiceRetry = () => {
    latchMicLost();
    setVoiceAnswers((prev) => {
      const out = [...prev];
      out[index] = mockRetry(itemInput);
      return out;
    });
  };

  // Voice run: graded at the finish, near counts as wrong (spec §5.1, D8).
  const finishVoice = () => {
    const spokenItems = items.map((it) => spokenItemFromId(it.id));
    const graded = gradeSpokenMock(spokenItems, voiceAnswers, location);
    setAnswers(items.map((it, i) => voiceRow(it, i, voiceAnswers[i] ?? null, graded.ok[i], dict)));
    setCorrectCount(graded.score);
    setFinished(true);
    resetMic();
    for (const e of speakingMockAnswerEvents(spokenItems, voiceAnswers, graded.ok)) trackOralAnswer(e);
    void recordSectionMockResult('speaking', graded.score >= PASS_THRESHOLD, graded.score, TOTAL, graded.answerMode);
  };

  const onNext = () => {
    if (voiceHere) {
      if (!ready) return;
      latchMicLost();
      if (isLast) {
        finishVoice();
        return;
      }
      setIndex((i) => i + 1);
      return;
    }
    if (!hasPick) return;
    // Grade silently on advance; the learner never sees per-question results.
    const wasCorrect =
      item.kind === 'mc'
        ? !!item.options.find((o) => o.id === pickedMc)?.isCorrect
        : pickedYn === item.answer;
    const row: MockResultRow =
      item.kind === 'mc'
        ? {
            key: `${index}-${item.id}`,
            badge: tFormat(dict.mockTest.speakingMock.mcBadge, { index: index + 1, badge: item.badge }),
            prompt: item.headerEn,
            promptVi: item.headerVi,
            userAnswer: item.options.find((o) => o.id === pickedMc)?.en ?? null,
            correctAnswer: item.options.find((o) => o.isCorrect)?.en ?? item.accepted.en,
            correctAnswerVi: item.accepted.vi,
            ok: wasCorrect,
            audioSrc: item.questionAudioSrc,
          }
        : {
            key: `${index}-${item.id}`,
            badge: tFormat(dict.mockTest.speakingMock.ynBadge, { index: index + 1, num: item.num }),
            prompt: item.questionEn,
            promptVi: item.questionVi,
            userAnswer: pickedYn === 'yes' ? 'Yes, officer' : 'No, officer',
            correctAnswer: item.answer === 'yes' ? 'Yes, officer' : 'No, officer',
            ok: wasCorrect,
            audioSrc: item.audioSrc,
          };
    setAnswers((prev) => [...prev, row]);
    const newCount = correctCount + (wasCorrect ? 1 : 0);
    setCorrectCount(newCount);
    if (isLast) {
      setFinished(true);
      void recordSectionMockResult('speaking', newCount >= PASS_THRESHOLD, newCount, TOTAL);
      return;
    }
    setIndex((i) => i + 1);
    setPickedMc(null);
    setPickedYn(null);
  };

  // A voice item is answered through the Civics mock panel: [Đúng vậy] locks,
  // [Nói lại] once; a re-ask or a mic error keeps the retry (spec §5.1).
  const voicePanel: ReactNode = voiceHere ? (
    <MicAnswerPanel
      key={item.id}
      variant="mock"
      input={itemInput}
      mic={mic}
      locked={current?.confirmed === true}
      nearAnswer={null}
      canRetry={!current?.retried}
      onRetry={onVoiceRetry}
      onSubmit={onVoiceConfirm}
      onNearAnswer={() => {}}
      prompt={current?.reask ? dict.oral.yesNoReask : undefined}
      notice={micLost ? dict.oral.micLostTyped : undefined}
      onUseTyped={offersTypedFallback(mic.error) && !micLost ? () => setMicLatched(true) : undefined}
    />
  ) : null;

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-[clamp(0.25rem,1vw,1rem)] max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {/* Progress — calm exam card: counter · bar · questions remaining */}
      <MockExamProgress index={index} total={TOTAL} />

      {/* Main area */}
      <div className="flex-1 min-h-0 flex gap-[clamp(0.5rem,1vw,1.5rem)]">
        {/* Question card */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div
            className="flex-1 min-h-0 overflow-y-auto p-[clamp(0.75rem,2vh,1.5rem)]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {item.kind === 'mc' ? (
              <McBody item={item} picked={pickedMc} onPick={onPickMc} audio={audio} answer={voicePanel} />
            ) : (
              <YesNoBody item={item} picked={pickedYn} onPick={onPickYn} audio={audio} answer={voicePanel} />
            )}

            {/* Mobile Exam Rules (desktop shows it in the right rail) */}
            <div className="mt-[clamp(0.75rem,2vh,1.25rem)] lg:hidden">
              <MockExamRulesCard />
            </div>
          </div>

          {/* Pinned actions — no Xem đáp án in a mock test */}
          <div
            className="mt-auto shrink-0 border-t border-gray-100 px-[clamp(0.75rem,2vh,1.5rem)] pt-2.5"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
          >
            <NextButton disabled={!ready} onClick={onNext} isLast={isLast} />
          </div>
        </div>

        {/* Right rail — exam illustration + Exam Rules */}
        <MockExamPanel mode="speaking" />
      </div>
    </div>
  );
}

function NextButton({
  disabled,
  onClick,
  isLast,
}: {
  disabled: boolean;
  onClick: () => void;
  isLast: boolean;
}) {
  const { dict } = useN400Lang();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold shadow-md transition-all ${
        disabled
          ? 'cursor-not-allowed bg-teal-600/20 text-teal-700/50 shadow-none'
          : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20'
      }`}
      style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
    >
      <span>{isLast ? dict.mockTest.submitButton : 'Next'}</span>
      <ArrowRight size={16} />
    </button>
  );
}

function McBody({
  item,
  picked,
  onPick,
  audio,
  answer,
}: {
  item: McItem;
  picked: 'A' | 'B' | 'C' | 'D' | null;
  onPick: (id: 'A' | 'B' | 'C' | 'D') => void;
  audio: AudioRules;
  /** The voice panel in a voice run; the options otherwise. */
  answer: ReactNode;
}) {
  const { dict } = useN400Lang();
  return (
    <>
      {/* Header */}
      <div className="mb-[clamp(0.5rem,1vw,1rem)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Question position intentionally omitted — the progress row above
                already tracks it. */}
            <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
              {item.headerEn}
            </div>
            {/* English only while taking — Vietnamese gloss appears in the result. */}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <AudioButton
              src={item.questionAudioSrc}
              label={dict.flashcards.listenQuestion}
              size="sm"
              onBeforePlay={audio.onBeforePlay}
              preferWebAudio={audio.preferWebAudio}
            />
            {audio.showSlow ? (
              <AudioButton src={item.questionAudioSrc} label={dict.mockTest.slowSpeakLabel} size="sm" rate={0.7} variant="slow" />
            ) : null}
          </div>
        </div>
      </div>

      {/* Answer — the voice panel in a voice run; otherwise the options, a calm
          stacked column with the chip + radio on the right */}
      {answer ?? (
        <div className="grid grid-cols-1 gap-[clamp(0.5rem,1.2vh,0.75rem)]">
          {item.options.map((opt) => {
            const isPicked = picked === opt.id;
            // Selected-but-ungraded: teal highlight with a filled radio — no ✓/✗
            // so nothing hints at correctness before the test is over.
            const style = isPicked
              ? 'border-teal-600 bg-teal-50'
              : 'border-gray-200 hover:border-teal-300 bg-white';
            const mark = isPicked ? (
              <span className="w-6 h-6 rounded-full border-[7px] border-teal-600 bg-white shrink-0" />
            ) : (
              <span className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />
            );

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPick(opt.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 text-left transition-all duration-200 motion-reduce:duration-0 min-h-[clamp(56px,7vh,72px)] p-[clamp(0.5rem,1.2vh,0.875rem)] ${style}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 font-bold text-gray-700" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                  {opt.id}
                </div>
                <div className="flex-1 text-gray-800 font-medium" style={{ fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)' }}>
                  {opt.en}
                </div>
                {mark}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function YesNoBody({
  item,
  picked,
  onPick,
  audio,
  answer,
}: {
  item: YesNoItem;
  picked: Choice | null;
  onPick: (choice: Choice) => void;
  audio: AudioRules;
  /** The voice panel in a voice run; the Yes/No buttons otherwise. */
  answer: ReactNode;
}) {
  const { dict } = useN400Lang();
  const choices: { id: Choice; label: string }[] = [
    { id: 'yes', label: 'Yes, officer' },
    { id: 'no', label: 'No, officer' },
  ];
  return (
    <>
      {/* Header */}
      <div className="mb-[clamp(0.5rem,1vw,1rem)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Question position intentionally omitted — the progress row above
                already tracks it. */}
            <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
              {item.questionEn}
            </div>
            {/* English only while taking — Vietnamese gloss appears in the result. */}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <AudioButton
              src={item.audioSrc}
              label={dict.flashcards.listenQuestion}
              size="sm"
              onBeforePlay={audio.onBeforePlay}
              preferWebAudio={audio.preferWebAudio}
            />
            {audio.showSlow ? (
              <AudioButton src={item.audioSrc} label={dict.mockTest.slowSpeakLabel} size="sm" rate={0.7} variant="slow" />
            ) : null}
          </div>
        </div>
      </div>

      {/* Answer — the voice panel in a voice run; otherwise Yes / No */}
      {answer ?? (
        <div className="grid grid-cols-2 gap-[clamp(0.375rem,1vh,0.625rem)]">
          {choices.map((choice) => {
            const isPicked = picked === choice.id;
            // Selected-but-ungraded: teal highlight, no ✓/✗ before the test ends.
            const style = isPicked
              ? 'border-teal-600 bg-teal-50'
              : 'border-gray-200 hover:border-teal-300 bg-white';
            const mark = isPicked ? (
              <span className="w-6 h-6 rounded-full border-[7px] border-teal-600 bg-white shrink-0" />
            ) : (
              <span className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />
            );

            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => onPick(choice.id)}
                className={`flex w-full items-center justify-center gap-3 rounded-2xl border-2 text-center transition-all duration-200 motion-reduce:duration-0 min-h-[clamp(52px,7vh,68px)] p-[clamp(0.5rem,1.2vh,0.875rem)] ${style}`}
              >
                <span className="font-bold text-gray-800" style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
                  {choice.label}
                </span>
                {mark}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Run the tests, type-check and lint**

Run, separately (vitest exits non-zero on the known failure, so `&&` would skip the type-check):
- `npx vitest run src/components/n400`
- `npx tsc --noEmit`
- `npx eslint "src/app/n400ready/(app)/mock-test/speaking/page.tsx"`

Expected:
- vitest: the only failure is the pre-existing `mobile-layout.test.ts`; `speaking-mock-voice-wiring.test.ts` passes 11 tests;
- type-check 0 errors;
- eslint: no problems.

- [ ] **Step 5: Commit**

```bash
git add "src/app/n400ready/(app)/mock-test/speaking/page.tsx" src/components/n400/speaking/speaking-mock-voice-wiring.test.ts
git commit -m "feat(n400app): Thi thử Speaking — voice run with Cách trả lời intro

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Gate S3 checklist, spec updates, full gate

**Files:**
- Create: `docs/superpowers/spikes/2026-09-26-n400-speaking-mock-gate3.md`
- Modify: `docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md` (§5.1 rulings, §12 status)

**Interfaces:** none.

- [ ] **Step 1: Write the Gate S3 checklist**

Create `docs/superpowers/spikes/2026-09-26-n400-speaking-mock-gate3.md`:

```markdown
# N400 Speaking Oral Answers — Gate S3 (Thi thử Speaking device pass)

**Spec:** docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md §5.1 · **Plan:** docs/superpowers/plans/2026-09-26-n400-speaking-oral-s3-mock.md
**Prereqs:** S3 deployed; `voice_speaking` ON (it is, since Gate S2).

| # | Environment | Check | Result |
|---|---|---|---|
| 1 | iPhone Safari | Thi thử → Speaking shows the intro with **Cách trả lời**; pick **Trả lời bằng giọng** → Bắt đầu. Each item: 🔊 plays, you speak, "App nghe được: …", **Đúng vậy** locks, **Nói lại** works once. Nothing shows right/wrong before the end | |
| 2 | iPhone Safari | A Yes/No item: say "I don't know" → "Bạn trả lời Yes hay No? Hãy nói lại." and **Nói lại** is still offered; then say "No" and confirm | |
| 3 | iPhone Safari | Result: each row says "Bạn nói: …"; wrong rows show the accepted answer; a partial What-mean answer counts as wrong. Tap 🔊 on a row, then **Thi lại**: the first item's mic still hears you | |
| 4 | iPhone Safari | During a voice run the slow 🔊 is hidden | |
| 5 | Any | **Trắc nghiệm** run works as before; the choice (Trắc nghiệm / giọng) is remembered on the next visit | |
| 6 | Mac Chrome (Incognito) | Items 1–3 | |
| 7 | Facebook in-app iOS | The intro offers voice; the run uses the typed box ("Bạn trả lời: …" on the result) | |
| 8 | Any | DB: the new `n400_section_mock_results` row has `answer_mode` = voice (typed in-app; choice runs keep choice) | |
| 9 | Firefox (no speech API) | No intro: the test starts directly in multiple choice, as before | |

## Decision (owner)

- Gate S3 pass? <yes/no>
```

- [ ] **Step 2: Spec updates**

In the speaking spec:

1. At the end of §5.1 (after the **Mic trouble** bullet), add:

```markdown
- **S3 rulings:**
  - every Speaking item can be spoken (all 62 What-mean terms have configs; a test pins it), so a voice run is all voice;
  - the pure rules are `lib/n400/oral/spoken-mock.ts` (confirm, retry once, re-ask, grade at finish);
  - the choice is remembered under its own key, `n400.mock.speaking.answerMode`;
  - a voice run records `answer_mode` 'voice' when any answer came from the mic, else 'typed' (the Civics voice mock rule);
  - result rows say "Bạn nói:" / "Bạn trả lời:" per row, and the result screen's 🔊 follows the iOS rules;
  - analytics: one `n400_oral_answer` per item at the finish (correct/wrong), an `unclear` event per Yes/No re-ask, and mic errors with the item's section.
```

2. In §12, replace `- **S3, Thi thử Speaking:** §5.1.` with `- **S3, Thi thử Speaking (built, plan docs/superpowers/plans/2026-09-26-n400-speaking-oral-s3-mock.md):** §5.1.`.

- [ ] **Step 3: Full gate**

Run `npm run type-check`, `npm run test` and `npm run build`, separately.
Expected:
- type-check 0 errors;
- test: the only failure is the pre-existing `mobile-layout.test.ts`;
- build succeeds.

- [ ] **Step 4: Commit**

```bash
git add ../../docs/superpowers/spikes/2026-09-26-n400-speaking-mock-gate3.md ../../docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md
git commit -m "docs(n400app): Gate S3 checklist; speaking spec §5.1/§12 for S3

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**GATE S3 — stop.** The owner decides on merge and push, then runs the device checklist. Slice S4 (Full interview) waits for "Gate S3 pass: yes". The pending Gate S2 rows stay open until the owner finishes them.
