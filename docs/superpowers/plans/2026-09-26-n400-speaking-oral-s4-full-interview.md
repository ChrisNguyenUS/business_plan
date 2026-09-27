# N400 Speaking Oral Answers — Slice S4 (Phỏng vấn đầy đủ) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Phỏng vấn đầy đủ, learners can pick "Cách trả lời: Toàn bộ bằng giọng" once and answer the Civics part and the Speaking part by voice (or by typing in in-app browsers). Writing is unchanged. Results are recorded with `answer_mode` and, for Civics, each spoken answer's words. The Privacy Policy §8 names interview questions.

**Architecture:**
- **One hook, `useSpokenExam`,** gives `SectionMCQuiz` (exam mode) the §5.1 mock item:
  - [Đúng vậy] locks and [Nói lại] is allowed once;
  - a Yes/No "unclear" is asked again;
  - there is no verdict before Next.
  It is built from the S3 pure rules (`spoken-mock.ts`, `voiceRunMicLost`).
- **The Full interview page:**
  - decides the run at Bắt đầu and passes it to both parts;
  - holds the mic-lost latch across parts;
  - records each part with its `answer_mode`;
  - shows "Bạn nói: …" rows on the review screen.

**Tech Stack:** Next.js 16 (client components only; no routing or server APIs change — `apps/website/AGENTS.md`), TypeScript, vitest in node (page and component wiring is pinned by source-reading tests, the repo convention), Supabase (no migration: `n400_quiz_attempts.answer_mode` and `n400_question_attempts.transcript` exist since `n400_32`/`n400_33`).

**Spec:** `docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md` (rev 1.1: §5.2, §8 `context: full`, §9 Privacy, §12 Gate S4; S3 built). Builds on `docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md` (rev 3.16).

**Dry run (2026-09-27):** Tasks 1–8 were applied from this plan's text in a scratch worktree.
- Results: the 53 task tests pass; full suite 1337 pass, the only failure being the pre-existing `mobile-layout.test.ts`; type-check 0 errors; eslint 0 errors.
- `npm run build` cannot run there, because Turbopack rejects a symlinked `node_modules`. Task 8's gate is the first build.

## Global Constraints

- **Scope:** `apps/website/` only. All commands run from `apps/website/`.
- **Intro:** "Cách trả lời: [Trắc nghiệm | Toàn bộ bằng giọng]", shown only when voice is available here (`voice_speaking` + a speech API, or an in-app browser, which types).
  - This one choice covers the Civics part and the Speaking part. The Writing part is unchanged.
  - The choice is remembered per surface (localStorage, try/catch; spec S8).
- **Voice run:**
  - both parts use `SectionMCQuiz` in exam mode with the §5.1 voice item behaviour;
  - items where `canSpeak` is false stay multiple choice;
  - no verdict mid-test; `near` counts as wrong (D8);
  - a Yes/No `unclear` or a mic error never consumes the retry.
- **Recording, Civics part:** `recordMockResult` gains `answerMode` and a per-question `transcript`, written to `n400_quiz_attempts.answer_mode` and `n400_question_attempts.transcript`.
- **Recording, Speaking part:** `recordSectionMockResult('speaking', …, 'voice' | 'typed')`.
- **Review screen:** a voice row shows "Bạn nói: …" instead of the picked option.
- **Unchanged:** interludes, the stepper, the pass rules (12/20, 8/10, 1/3), and every choice run.
- **Mic trouble:** if the mic is lost, the remaining voice items are typed. The run never falls back to multiple choice.
- **Analytics:** `n400_oral_answer` gets `context: 'full'` for the Full interview.
- **iOS 🔊 rules (Civics rev 3.12):** every 🔊 on these screens passes `onBeforePlay` and `preferWebAudio={mic.sessionRunning}`.
- **Speaking reuses the Civics UI exactly:** `MicAnswerPanel` variant `mock` and `AnswerModeToggle`. No new visual components.
- **No state updates during render, and no `setState` in an effect.** `react-hooks/set-state-in-effect` is an ESLint error; touched files run `npx eslint`.
- **No DB or flag writes.** `voice_speaking` is already ON 100%.
- **Gate commands, run separately:** `npm run type-check`, `npm run test` (the known pre-existing `mobile-layout.test.ts` failure excepted), `npm run build`.
- **Commits:** one logical change each, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings carried into this plan

1. **Exam voice items are graded silently at Next,** item by item, like the existing exam flow. The learner sees nothing until the part ends, so this equals the spec's "graded when it completes", with the same deterministic grader and the same result.
2. **The mic-lost latch lives in the page and spans both parts.** A mic lost in the Civics part leaves the Speaking part typed too (spec: "the remaining voice items are typed"). It resets at Bắt đầu.
3. **A part's `answer_mode` is `answerModeOf(inputs)`:** 'voice' if any answer came from the mic, 'typed' if any was typed, else 'choice' (a voice run whose items all stayed multiple choice).
4. **Civics words are inserted by the client.** The Full interview already records client-side.
   - Words are trimmed and capped at `MAX_TRANSCRIPT` (500), like the Civics voice mock's server finalize.
   - RLS verified on the shared DB (read-only, 2026-09-26):
     - `n400 attempts own insert` checks `auth.uid() = user_id`;
     - `n400 question attempts own` checks that the attempt is the user's;
     - neither restricts columns, and `authenticated` has INSERT on `answer_mode` and `transcript`.
5. **`voice_speaking` gates the whole Full interview voice run,** Civics part included. It is the kill switch for everything in the speaking spec (S6).
6. **Bắt đầu pressed before the flags load starts a choice run.** The picker appears only once voice is known to be available.
7. **The review screen's 🔊 follows the iOS rules. The Writing part's 🔊 (`DictationQuiz`) is unchanged.**
   - After the voice parts, a playback there can deafen an open iOS session for 20–33 s.
   - The next mic use is a new run, minutes later.
8. **New copy for the owner to review:**
   - "Toàn bộ bằng giọng" / "All by voice";
   - the note "Áp dụng cho phần Civics và Speaking. Phần Viết vẫn gõ như cũ." / "Applies to the Civics and Speaking parts. Writing stays typed.";
   - the review labels "Bạn nói" / "Bạn trả lời" ("You said" / "You answered").
9. **Privacy §8 uses the owner-approved wording.** "For Civics mock tests … stores the text of each answer" covers the Full interview's Civics part, whose words are now stored.
10. **`spokenAnswerEvent` is the single-item builder.** `speakingMockAnswerEvents` (S3) now maps over it, with no behaviour change.

## Review Focus

1. **Choice runs of the Full interview must be exactly as before:**
   - multiple-choice picks and grading as today;
   - records without `answer_mode` or transcripts;
   - no picker for learners without voice.
   Pinned in Task 2 (rows) and Task 6 (wiring).
2. **In a voice run, Civics items without an oral answer for the learner's address stay multiple choice** in the same part, and Next works for both kinds. Pinned in Task 3 (`canSpeak`) and Task 4 (Next).
3. **A mic lost in the Civics part leaves the Speaking part typed as well.**
   - In-app browsers type everywhere.
   - Voice items never fall back to multiple choice.
   Pinned in Task 3 and Task 6.
4. **Records:**
   - the Civics `answer_mode` and the words, trimmed and capped, written once;
   - the Speaking `answer_mode`;
   - review rows say "Bạn nói" / "Bạn trả lời";
   - analytics carry `context: 'full'`.
   Pinned in Tasks 1, 2, 5 and 6.
5. **iPhone audio:**
   - the exam 🔊 and the review 🔊 follow the iOS rules;
   - Thi lại after a voice run starts a new run with a fresh latch.
   Pinned in Tasks 5 and 6.

---

### Task 1: Analytics — `context: 'full'` and a single-item answer event (spec §8)

**Files:**
- Modify: `apps/website/src/lib/n400/analytics.ts`
- Modify: `apps/website/src/lib/n400/oral/oral-events.ts`
- Test: `apps/website/src/lib/n400/oral/oral-events.test.ts` (append)

**Interfaces:**
- Produces:
  - `OralAnswerEvent.context: 'practice' | 'mock' | 'full'`
  - `micErrorEvent(qid, context: OralAnswerEvent['context'], error, section = 'civics')`
  - `spokenAnswerEvent(item: SpokenItem, answer: SpokenMockAnswer, ok: boolean, context: 'mock' | 'full' = 'mock'): OralAnswerEvent`
  - `mockReaskEvent(item, input, retried, transcript, context: 'mock' | 'full' = 'mock')`
  - `speakingMockAnswerEvents(items, answers, ok)`: unchanged API and output.

- [ ] **Step 1: Write the failing test**

In `src/lib/n400/oral/oral-events.test.ts`, replace `import { micErrorEvent, mockAnswerEvents, mockReaskEvent, practiceAnswerEvent, speakingMockAnswerEvents } from './oral-events';` with `import { micErrorEvent, mockAnswerEvents, mockReaskEvent, practiceAnswerEvent, speakingMockAnswerEvents, spokenAnswerEvent } from './oral-events';`, then append:

```ts
describe('Full interview events (speaking spec §8)', () => {
  const answered = (transcript: string, input: 'mic' | 'typed'): SpokenMockAnswer => ({
    transcript,
    retried: false,
    input,
    confirmed: true,
    reask: false,
  });

  it('a civics answer in the Full interview carries context full and section civics', () => {
    expect(spokenAnswerEvent({ kind: 'civics', qid: 12 }, answered('Freedom of speech', 'mic'), true, 'full')).toEqual({
      qid: 12,
      section: 'civics',
      context: 'full',
      input: 'mic',
      verdict: 'correct',
      retried: false,
      confirmedNear: null,
      error: 'none',
      transcriptLength: 17,
    });
  });

  it('re-asks and mic errors can come from the Full interview', () => {
    expect(mockReaskEvent({ kind: 'yesno', id: 'yn-2' }, 'typed', true, 'maybe', 'full')).toMatchObject({
      context: 'full',
      verdict: 'unclear',
      retried: true,
    });
    expect(micErrorEvent(5, 'full', 'no-speech', 'whatmean')).toMatchObject({ context: 'full', section: 'whatmean' });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/oral/oral-events.test.ts`
Expected: FAIL. The 2 new tests fail (`spokenAnswerEvent is not a function`); the 10 existing tests pass.

- [ ] **Step 3: Implement**

In `src/lib/n400/analytics.ts`, replace `  context: 'practice' | 'mock';` with:

```ts
  /** 'full' = the Full interview (speaking spec §8). */
  context: 'practice' | 'mock' | 'full';
```

In `src/lib/n400/oral/oral-events.ts`:

1. In `micErrorEvent`, replace `  context: 'practice' | 'mock',` with `  context: OralAnswerEvent['context'],`.
2. Replace everything from the line `/** Thi thử Speaking (speaking spec §5.1, §8): one event per confirmed item at the` to the end of the file with:

```ts
/** One confirmed spoken or typed mock answer (speaking spec §8). `near` counts as
 *  wrong (D8), so the verdict is correct or wrong, like the Civics voice mock. */
export function spokenAnswerEvent(
  item: SpokenItem,
  answer: SpokenMockAnswer,
  ok: boolean,
  context: 'mock' | 'full' = 'mock',
): OralAnswerEvent {
  return {
    qid: spokenQid(item),
    section: spokenSection(item),
    context,
    input: answer.input,
    verdict: ok ? 'correct' : 'wrong',
    retried: answer.retried,
    confirmedNear: null,
    error: 'none',
    transcriptLength: answer.transcript.length,
  };
}

/** Thi thử Speaking (speaking spec §5.1, §8): one event per confirmed item at the
 *  finish, with its section. */
export function speakingMockAnswerEvents(
  items: readonly (SpokenItem | null)[],
  answers: readonly (SpokenMockAnswer | null)[],
  ok: readonly boolean[],
): OralAnswerEvent[] {
  const events: OralAnswerEvent[] = [];
  items.forEach((item, i) => {
    const a = answers[i];
    if (item && a?.confirmed) events.push(spokenAnswerEvent(item, a, ok[i]));
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
  context: 'mock' | 'full' = 'mock',
): OralAnswerEvent {
  return {
    qid: spokenQid(item),
    section: spokenSection(item),
    context,
    input,
    verdict: 'unclear',
    retried,
    confirmedNear: null,
    error: 'none',
    transcriptLength: transcript.length,
  };
}
```

- [ ] **Step 4: Run the tests, type-check and lint**

Run: `npx vitest run src/lib/n400/oral/oral-events.test.ts src/lib/n400/analytics.test.ts && npx tsc --noEmit && npx eslint src/lib/n400/oral/oral-events.ts src/lib/n400/analytics.ts`
Expected: PASS (oral-events 12, analytics 8); type-check 0 errors; eslint no problems.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/analytics.ts src/lib/n400/oral/oral-events.ts src/lib/n400/oral/oral-events.test.ts
git commit -m "feat(n400app): n400_oral_answer context full; single-item spoken answer event

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Record `answer_mode` and the Civics words (spec §5.2)

**Files:**
- Modify: `apps/website/src/lib/n400/attempt-row.ts`
- Test: `apps/website/src/lib/n400/attempt-row.test.ts` (append)
- Modify: `apps/website/src/lib/n400/storage.ts` (`MockResult.questionResults[].transcript`)
- Modify: `apps/website/src/lib/n400/user-state.tsx` (`recordMockResult`)

**Interfaces:**
- Consumes: `AnswerMode` (existing); `MAX_TRANSCRIPT` (existing, `oral/grade-voice-mock.ts`).
- Produces:
  - `answerModeOf(inputs: readonly ('mic' | 'typed' | undefined)[]): AnswerMode`
  - `mockQuizAttemptRow(userId, r: { score; total; passed; startedAt; completedAt }, answerMode: AnswerMode = 'choice'): MockQuizAttemptRow`
  - `mockQuestionAttemptRows(attemptId: string, results: readonly { questionId: number; wasCorrect: boolean; transcript?: string }[]): MockQuestionAttemptRow[]`
  - `MockResult.questionResults: { questionId: number; wasCorrect: boolean; transcript?: string }[]`
  - `recordMockResult(result: MockResult, answerMode: AnswerMode = 'choice')`

- [ ] **Step 1: Write the failing test**

In `src/lib/n400/attempt-row.test.ts`, replace `import { practiceAttemptRow, sectionAttemptRow, sectionMockResultRow } from './attempt-row';` with:

```ts
import {
  answerModeOf,
  mockQuestionAttemptRows,
  mockQuizAttemptRow,
  practiceAttemptRow,
  sectionAttemptRow,
  sectionMockResultRow,
} from './attempt-row';
```

then append:

```ts
describe('answerModeOf (speaking spec §5.2)', () => {
  it("'voice' when any answer came from the mic, else 'typed' when any was typed, else 'choice'", () => {
    expect(answerModeOf(['typed', 'mic', undefined])).toBe('voice');
    expect(answerModeOf(['typed', undefined])).toBe('typed');
    expect(answerModeOf([undefined, undefined])).toBe('choice');
    expect(answerModeOf([])).toBe('choice');
  });
});

describe('Full interview Civics rows (speaking spec §5.2, Review Focus 1, 4)', () => {
  const r = { score: 13, total: 20, passed: true, startedAt: 'S', completedAt: 'C' };

  it('a choice run inserts exactly as before (no answer_mode)', () => {
    expect(mockQuizAttemptRow('u1', r)).toEqual({
      user_id: 'u1',
      mode: 'mock_test',
      score: 13,
      total_questions: 20,
      passed: true,
      started_at: 'S',
      completed_at: 'C',
    });
  });

  it('a voice run carries answer_mode', () => {
    expect(mockQuizAttemptRow('u1', r, 'voice')).toMatchObject({ answer_mode: 'voice' });
  });

  it('spoken answers keep their words, trimmed and capped at 500; picked answers have none', () => {
    const rows = mockQuestionAttemptRows('a1', [
      { questionId: 12, wasCorrect: true, transcript: '  freedom of speech ' },
      { questionId: 29, wasCorrect: false },
      { questionId: 3, wasCorrect: false, transcript: 'x'.repeat(600) },
    ]);
    expect(rows[0]).toEqual({ attempt_id: 'a1', question_id: 12, was_correct: true, transcript: 'freedom of speech' });
    expect(rows[1]).toEqual({ attempt_id: 'a1', question_id: 29, was_correct: false });
    expect(rows[2].transcript).toHaveLength(500);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/attempt-row.test.ts`
Expected: FAIL. The 4 new tests fail (`answerModeOf is not a function`, …); the 6 existing tests pass.

- [ ] **Step 3: Implement**

In `src/lib/n400/attempt-row.ts`, after `import type { QuizMode } from './storage';`, add `import { MAX_TRANSCRIPT } from './oral/grade-voice-mock';`, then append:

```ts
/** How a run or part was answered (speaking spec §5.2): 'voice' when any answer came
 *  from the mic, else 'typed' when any was typed, else 'choice' (the Civics voice
 *  mock rule, plus 'choice' when nothing was spoken). */
export function answerModeOf(inputs: readonly ('mic' | 'typed' | undefined)[]): AnswerMode {
  if (inputs.includes('mic')) return 'voice';
  return inputs.includes('typed') ? 'typed' : 'choice';
}

/** The n400_quiz_attempts row of a client-recorded Civics mock (the Full interview's
 *  Civics part). `choice` omits answer_mode: the column defaults to 'choice'. */
export interface MockQuizAttemptRow {
  user_id: string;
  mode: 'mock_test';
  score: number;
  total_questions: number;
  passed: boolean;
  started_at: string;
  completed_at: string;
  answer_mode?: AnswerMode;
}

export function mockQuizAttemptRow(
  userId: string,
  r: { score: number; total: number; passed: boolean; startedAt: string; completedAt: string },
  answerMode: AnswerMode = 'choice',
): MockQuizAttemptRow {
  const row: MockQuizAttemptRow = {
    user_id: userId,
    mode: 'mock_test',
    score: r.score,
    total_questions: r.total,
    passed: r.passed,
    started_at: r.startedAt,
    completed_at: r.completedAt,
  };
  return answerMode === 'choice' ? row : { ...row, answer_mode: answerMode };
}

/** Its n400_question_attempts rows. A spoken answer keeps its words, trimmed and at
 *  most MAX_TRANSCRIPT characters (like the Civics voice mock); a picked answer has none. */
export interface MockQuestionAttemptRow {
  attempt_id: string;
  question_id: number;
  was_correct: boolean;
  transcript?: string;
}

export function mockQuestionAttemptRows(
  attemptId: string,
  results: readonly { questionId: number; wasCorrect: boolean; transcript?: string }[],
): MockQuestionAttemptRow[] {
  return results.map((r) => {
    const row: MockQuestionAttemptRow = { attempt_id: attemptId, question_id: r.questionId, was_correct: r.wasCorrect };
    return r.transcript === undefined ? row : { ...row, transcript: r.transcript.trim().slice(0, MAX_TRANSCRIPT) };
  });
}
```

In `src/lib/n400/storage.ts`, in `export interface MockResult`, replace `  questionResults: { questionId: number; wasCorrect: boolean }[];` with:

```ts
  /** `transcript`: a spoken or typed answer's words (Full interview voice run, speaking spec §5.2). */
  questionResults: { questionId: number; wasCorrect: boolean; transcript?: string }[];
```

In `src/lib/n400/user-state.tsx`:

1. Replace `import { practiceAttemptRow, sectionAttemptRow, sectionMockResultRow, type AnswerMode } from './attempt-row';` with `import { mockQuestionAttemptRows, mockQuizAttemptRow, practiceAttemptRow, sectionAttemptRow, sectionMockResultRow, type AnswerMode } from './attempt-row';`.
2. Replace `    async (result: MockResult) => {` with `    async (result: MockResult, answerMode: AnswerMode = 'choice') => {`.
3. Replace

```ts
        .from('n400_quiz_attempts')
        .insert({
          user_id: user.id,
          mode: 'mock_test',
          score: result.score,
          total_questions: result.total,
          passed: result.passed,
          started_at: result.startedAt,
          completed_at: result.completedAt,
        })
```

with

```ts
        .from('n400_quiz_attempts')
        .insert(mockQuizAttemptRow(user.id, result, answerMode))
```

4. Replace

```ts
        const rows = result.questionResults.map((r) => ({
          attempt_id: quiz.id,
          question_id: r.questionId,
          was_correct: r.wasCorrect,
        }));
```

with

```ts
        const rows = mockQuestionAttemptRows(quiz.id, result.questionResults);
```

- [ ] **Step 4: Run the tests, type-check and lint**

Run: `npx vitest run src/lib/n400/attempt-row.test.ts && npx tsc --noEmit && npx eslint src/lib/n400/attempt-row.ts src/lib/n400/storage.ts`
Expected: PASS (10 tests); type-check 0 errors; eslint no problems. `user-state.tsx` keeps only its pre-existing `applyStreak` warning.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/attempt-row.ts src/lib/n400/attempt-row.test.ts src/lib/n400/storage.ts src/lib/n400/user-state.tsx
git commit -m "feat(n400app): recordMockResult records answer_mode and the Civics words

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `useSpokenExam` — the §5.1 mock item inside an exam run

**Files:**
- Create: `apps/website/src/components/n400/oral/use-spoken-exam.ts`
- Test: `apps/website/src/components/n400/oral/spoken-exam-wiring.test.ts` (create)

**Interfaces:**
- Consumes:
  - S3: `mockConfirm`, `mockRetry`, `SpokenMockAnswer`, `voiceRunMicLost`, `mockItemInput`, `offersTypedFallback`.
  - Task 1: `spokenAnswerEvent`, `mockReaskEvent(…, context)`, `micErrorEvent(qid, context, error, section)`.
  - S1/S2: `canSpeak`, `gradeSpokenItem`, `spokenItemFromId`, `spokenQid`, `spokenSection`, `useSpeechRecognition`, `useN400UserState`, `VoiceInput`.
- Produces:
  - `interface ExamVoice { input: VoiceInput; micLost: boolean; onMicLost: () => void; context: 'mock' | 'full' }`
  - `useSpokenExam(opts: { itemId: string | null; voice: ExamVoice | undefined }): SpokenExam`, with fields:
    - `voiceHere`, `itemInput`, `micLost`, `current`;
    - `onConfirm`, `onRetry`, `typedFallback`;
    - `settle(): { wasCorrect: boolean; answer: SpokenMockAnswer } | null`.

- [ ] **Step 1: Write the failing test**

Create `src/components/n400/oral/spoken-exam-wiring.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin the Full interview voice wiring by source (speaking spec §5.2).
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('useSpokenExam', () => {
  const hook = read('src/components/n400/oral/use-spoken-exam.ts');

  it('voice only in a voice run and for items that can be spoken; the rest stay multiple choice (Review Focus 2)', () => {
    expect(hook).toContain('const voiceHere = voice !== undefined && item !== null && canSpeak(item, location);');
  });

  it('confirm follows the mock rules: re-ask on unclear, retry once', () => {
    expect(hook).toContain('mockConfirm(current, text, itemInput, gradeSpokenItem(item, text, location).verdict)');
    expect(hook).toContain('mockRetry(itemInput)');
  });

  it('grades only at Next, with no verdict before (§5.1)', () => {
    const body = hook.slice(hook.indexOf('const settle'), hook.indexOf('return { wasCorrect, answer: current };'));
    expect(body).toContain("gradeSpokenItem(item, current.transcript, location).verdict === 'correct'");
    expect(body).toContain('trackOralAnswer(spokenAnswerEvent(item, current, wasCorrect, voice.context));');
  });

  it('a lost mic is latched by the page, so every remaining voice item types (Review Focus 3)', () => {
    expect(hook).toContain('voiceRunMicLost(voice.input, mic.error, mic.supported)');
    expect(hook).toContain('const micLost = (voice?.micLost ?? false) || lostNow;');
    expect(hook.match(/latchMicLost\(\);/g)).toHaveLength(3);
  });

  it('mic errors and re-asks carry the run context', () => {
    expect(hook).toContain('micErrorEvent(spokenQid(item), voice.context, micError, spokenSection(item))');
    expect(hook).toContain('mockReaskEvent(item, itemInput, next.retried, text, voice.context)');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/n400/oral/spoken-exam-wiring.test.ts`
Expected: FAIL: `ENOENT … use-spoken-exam.ts`.

- [ ] **Step 3: Implement**

Create `src/components/n400/oral/use-spoken-exam.ts`:

```ts
'use client';

// Spoken answers inside an exam run (speaking spec §5.2). The Full interview's Civics
// and Speaking parts answer through the §5.1 mock item: [Đúng vậy] locks, [Nói lại]
// once, a Yes/No "unclear" is asked again, and nothing is graded before Next (no
// verdict mid-test). The rules are pure (spoken-mock.ts, mock-voice-items.ts); this
// hook holds one item's answer and sends the events. It never sets state during
// render or in an effect.

import { useEffect, useState } from 'react';
import { trackOralAnswer } from '@/lib/n400/analytics';
import { canSpeak, gradeSpokenItem, spokenItemFromId } from '@/lib/n400/oral/grade-spoken-item';
import { mockItemInput, offersTypedFallback, voiceRunMicLost } from '@/lib/n400/oral/mock-voice-items';
import { micErrorEvent, mockReaskEvent, spokenAnswerEvent } from '@/lib/n400/oral/oral-events';
import { mockConfirm, mockRetry, type SpokenMockAnswer } from '@/lib/n400/oral/spoken-mock';
import { spokenQid, spokenSection } from '@/lib/n400/oral/spoken-practice';
import { useSpeechRecognition } from '@/lib/n400/oral/use-speech-recognition';
import type { VoiceInput } from '@/lib/n400/oral/voice-support';
import { useN400UserState } from '@/lib/n400/user-state';

/** A voice run, decided by the page at start (speaking spec §5.2). */
export interface ExamVoice {
  /** How this browser answers: 'mic', or 'typed' in in-app browsers (voiceInputFor with the flags). */
  input: VoiceInput;
  /** Latched by the page across parts: the run's mic is lost, so every remaining voice item types. */
  micLost: boolean;
  onMicLost: () => void;
  /** n400_oral_answer context. */
  context: 'mock' | 'full';
}

export interface SpokenExam {
  /** This item is answered by voice or typing: a voice run and an item that can be spoken. */
  voiceHere: boolean;
  itemInput: 'mic' | 'typed';
  micLost: boolean;
  /** This item's answer so far; null before the first confirm or retry. */
  current: SpokenMockAnswer | null;
  onConfirm: (text: string) => void;
  onRetry: () => void;
  /** Offered after a network / audio-capture error: type the rest of the run. */
  typedFallback: (() => void) | undefined;
  /** At Next: grade the confirmed answer and send its event; null until it is confirmed. */
  settle: () => { wasCorrect: boolean; answer: SpokenMockAnswer } | null;
}

export function useSpokenExam(opts: { itemId: string | null; voice: ExamVoice | undefined }): SpokenExam {
  const { itemId, voice } = opts;
  const mic = useSpeechRecognition();
  const { state } = useN400UserState();
  const location = { stateCode: state.settings.stateCode, districtNumber: state.address.districtNumber };
  const item = voice && itemId ? spokenItemFromId(itemId) : null;
  const voiceHere = voice !== undefined && item !== null && canSpeak(item, location);

  // One answer, tagged with its item: the next item starts clean by itself.
  const [stored, setStored] = useState<{ itemId: string; answer: SpokenMockAnswer } | null>(null);
  const current = stored !== null && stored.itemId === itemId ? stored.answer : null;

  // A lost mic types the rest of the run. Derived here; the page latches it (it spans
  // both parts) from the handlers, because the next item's mic reset clears the error.
  const lostNow = voiceHere && voice !== undefined && voiceRunMicLost(voice.input, mic.error, mic.supported);
  const micLost = (voice?.micLost ?? false) || lostNow;
  const latchMicLost = () => {
    if (lostNow) voice?.onMicLost();
  };
  const itemInput = mockItemInput(voice?.input ?? 'none', micLost);
  const { reset: resetMic } = mic;

  // n400_oral_answer for mic errors during a voice run (speaking spec §8).
  const micError = mic.error;
  useEffect(() => {
    if (!micError || !voiceHere || !item || !voice) return;
    trackOralAnswer(micErrorEvent(spokenQid(item), voice.context, micError, spokenSection(item)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micError]);

  const onConfirm = (text: string) => {
    latchMicLost();
    if (!item || !itemId || !voice) return;
    const next = mockConfirm(current, text, itemInput, gradeSpokenItem(item, text, location).verdict);
    setStored({ itemId, answer: next });
    // Yes/No neither yes nor no: asked again, the retry kept (speaking spec §5.1, §10).
    if (next.reask) {
      trackOralAnswer(mockReaskEvent(item, itemInput, next.retried, text, voice.context));
      resetMic();
    }
  };

  const onRetry = () => {
    latchMicLost();
    if (!itemId) return;
    setStored({ itemId, answer: mockRetry(itemInput) });
  };

  const settle = () => {
    if (!item || !voice || current === null || !current.confirmed) return null;
    latchMicLost();
    const wasCorrect = gradeSpokenItem(item, current.transcript, location).verdict === 'correct';
    trackOralAnswer(spokenAnswerEvent(item, current, wasCorrect, voice.context));
    return { wasCorrect, answer: current };
  };

  return {
    voiceHere,
    itemInput,
    micLost,
    current,
    onConfirm,
    onRetry,
    typedFallback: voiceHere && !micLost && offersTypedFallback(mic.error) ? voice?.onMicLost : undefined,
    settle,
  };
}
```

- [ ] **Step 4: Run the tests, type-check and lint**

Run, separately:
- `npx vitest run src/components/n400/oral/spoken-exam-wiring.test.ts`
- `npx tsc --noEmit`
- `npx eslint src/components/n400/oral/use-spoken-exam.ts`

Expected: PASS (5 tests); type-check 0 errors; eslint no problems.

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/oral/use-spoken-exam.ts src/components/n400/oral/spoken-exam-wiring.test.ts
git commit -m "feat(n400app): useSpokenExam — the mock voice item inside an exam run

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `SectionMCQuiz` — exam voice run

**Files:**
- Modify: `apps/website/src/components/n400/speaking/SectionMCQuiz.tsx`
- Test: `apps/website/src/components/n400/oral/spoken-exam-wiring.test.ts` (append)

**Interfaces:**
- Consumes: `useSpokenExam`, `ExamVoice` (Task 3); `SpokenMockAnswer` (S3).
- Produces:
  - `SectionMCQuiz` prop `examVoice?: ExamVoice`;
  - `onAnswer(itemId, wasCorrect, selected?, via?, spoken?: SpokenMockAnswer)`. Existing callers pass up to 4 arguments and stay valid.

- [ ] **Step 1: Write the failing test**

Append to `spoken-exam-wiring.test.ts`:

```ts
describe('SectionMCQuiz — exam voice run', () => {
  const quiz = read('src/components/n400/speaking/SectionMCQuiz.tsx');

  it('uses the exam hook only in exam mode', () => {
    expect(quiz).toContain('useSpokenExam({ itemId: examMode && q ? q.itemId : null, voice: examMode ? examVoice : undefined })');
  });

  it('answers through the Civics mock panel: Đúng vậy locks, Nói lại once, re-ask prompt', () => {
    expect(quiz).toMatch(/exam\.voiceHere \? \(\s*<MicAnswerPanel\s+key=\{q\.itemId\}\s+variant="mock"/);
    expect(quiz).toContain('canRetry={!exam.current?.retried}');
    expect(quiz).toContain('prompt={exam.current?.reask ? dict.oral.yesNoReask : undefined}');
  });

  it('grades at Next and hands the words to the page (Review Focus 4)', () => {
    expect(quiz).toContain('const settled = exam.settle();');
    expect(quiz).toContain(
      "onAnswer(q.itemId, settled.wasCorrect, undefined, settled.answer.input === 'typed' ? 'typed' : 'voice', settled.answer);",
    );
  });

  it('Next waits for Đúng vậy on a voice item and for a pick otherwise (Review Focus 2)', () => {
    expect(quiz).toContain('const examNextBlocked = examMode && (exam.voiceHere ? exam.current?.confirmed !== true : !selected);');
    expect(quiz).toContain('disabled={examNextBlocked}');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/n400/oral/spoken-exam-wiring.test.ts`
Expected: FAIL (4 new failures).

- [ ] **Step 3: Implement**

In `src/components/n400/speaking/SectionMCQuiz.tsx`:

1. After `import { useSpokenPractice } from '@/components/n400/oral/use-spoken-practice';`, add `import { useSpokenExam, type ExamVoice } from '@/components/n400/oral/use-spoken-exam';`.
2. After `import type { AnswerMode } from '@/lib/n400/attempt-row';`, add `import type { SpokenMockAnswer } from '@/lib/n400/oral/spoken-mock';`.
3. In the destructured props, replace `  estimatedMinutes,\n}: {` with `  estimatedMinutes,\n  examVoice,\n}: {`.
4. Replace `  onAnswer: (itemId: string, wasCorrect: boolean, selected?: MCOption, via?: AnswerMode) => void;` with:

```ts
  /** `spoken` = the confirmed voice/typed answer in an exam voice run (its words feed the review). */
  onAnswer: (itemId: string, wasCorrect: boolean, selected?: MCOption, via?: AnswerMode, spoken?: SpokenMockAnswer) => void;
```

5. Replace `  estimatedMinutes?: number | null;\n}) {` with:

```ts
  estimatedMinutes?: number | null;
  /** A voice run in exam mode (speaking spec §5.2): items answer by voice or typing. */
  examVoice?: ExamVoice;
}) {
```

6. Directly after the `useSpokenPractice({ … });` block (before `  useEffect(() => {`), add:

```ts
  // A voice run in exam mode: the §5.1 mock item (speaking spec §5.2).
  const exam = useSpokenExam({ itemId: examMode && q ? q.itemId : null, voice: examMode ? examVoice : undefined });
```

7. In `onNext`, replace

```ts
    if (examMode) {
      if (!selected) return;
```

with

```ts
    if (examMode && exam.voiceHere) {
      // Voice run: grade the confirmed answer silently (no verdict mid-test).
      const settled = exam.settle();
      if (!settled) return;
      if (settled.wasCorrect) setCorrectCount((c) => c + 1);
      else setWrongCount((c) => c + 1);
      onAnswer(q.itemId, settled.wasCorrect, undefined, settled.answer.input === 'typed' ? 'typed' : 'voice', settled.answer);
    } else if (examMode) {
      if (!selected) return;
```

   The rest of that exam branch (`// Grade silently …` through `onAnswer(q.itemId, wasCorrect, opt);` and its closing `}`) does not change.
8. Replace `  const revealedCorrect = spoken.voiceHere ? spoken.shownCorrect : !!pickedOption?.isCorrect;` with:

```ts
  const revealedCorrect = spoken.voiceHere ? spoken.shownCorrect : !!pickedOption?.isCorrect;
  const examNextBlocked = examMode && (exam.voiceHere ? exam.current?.confirmed !== true : !selected);
```

9. Replace

```tsx
            ) : (
            <div className="grid grid-cols-1 gap-[clamp(0.5rem,1.2vh,0.75rem)]">
```

with

```tsx
            ) : exam.voiceHere ? (
              <MicAnswerPanel
                key={q.itemId}
                variant="mock"
                input={exam.itemInput}
                mic={spoken.mic}
                locked={exam.current?.confirmed === true}
                nearAnswer={null}
                canRetry={!exam.current?.retried}
                onRetry={exam.onRetry}
                onSubmit={exam.onConfirm}
                onNearAnswer={() => {}}
                prompt={exam.current?.reask ? dict.oral.yesNoReask : undefined}
                notice={exam.micLost ? dict.oral.micLostTyped : undefined}
                onUseTyped={exam.typedFallback}
              />
            ) : (
            <div className="grid grid-cols-1 gap-[clamp(0.5rem,1.2vh,0.75rem)]">
```

10. Replace `                disabled={examMode && !selected}` with `                disabled={examNextBlocked}`, and in the button's class ternary, `                  examMode && !selected\n` with `                  examNextBlocked\n`.

- [ ] **Step 4: Run the tests, type-check and lint**

Run, separately (vitest exits non-zero on the known failure, so `&&` would skip the type-check):
- `npx vitest run src/components/n400`
- `npx tsc --noEmit`
- `npx eslint src/components/n400/speaking/SectionMCQuiz.tsx`

Expected:
- vitest: the only failure is the pre-existing `mobile-layout.test.ts`; `spoken-exam-wiring.test.ts` passes 9 tests; `navigation-ia.test.ts` passes;
- type-check 0 errors;
- eslint: no problems.

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/speaking/SectionMCQuiz.tsx src/components/n400/oral/spoken-exam-wiring.test.ts
git commit -m "feat(n400app): SectionMCQuiz exam voice run — mock item, graded at Next

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Review screen — "Bạn nói" rows and iOS 🔊 (spec §5.2)

**Files:**
- Modify: `apps/website/src/app/n400ready/(app)/mock-test/full/ReviewAnswers.tsx`
- Modify: `apps/website/src/lib/n400/i18n/vi.ts`, `apps/website/src/lib/n400/i18n/en.ts` (`mockTest.review.youSaid`, `youTyped`)
- Test: `apps/website/src/components/n400/oral/spoken-exam-wiring.test.ts` (append)

**Interfaces:**
- Produces:
  - `CivicsAnswer` / `SpeakingAnswer` gain `transcript?: string` and `input?: 'mic' | 'typed'`;
  - `ReviewAnswers` props `onBeforePlay?: () => void`, `preferWebAudio?: () => boolean`;
  - `dict.mockTest.review.youSaid`, `dict.mockTest.review.youTyped`.

- [ ] **Step 1: Write the failing test**

Append to `spoken-exam-wiring.test.ts`:

```ts
describe('Full interview review — voice rows', () => {
  const review = read('src/app/n400ready/(app)/mock-test/full/ReviewAnswers.tsx');
  const vi = read('src/lib/n400/i18n/vi.ts');
  const en = read('src/lib/n400/i18n/en.ts');

  it('a voice row shows the words under "Bạn nói" / "Bạn trả lời" (Review Focus 4)', () => {
    expect(review.match(/userAnswer: a\.transcript \?\? a\.selectedEn \?\? null,/g)).toHaveLength(2);
    expect(review).toContain("a.transcript === undefined ? undefined : a.input === 'typed' ? rt.youTyped : rt.youSaid");
    expect(review).toContain("{item.answerLabel ?? (item.section === 'writing' ? rt.yourAnswer : rt.yourSelection)}");
    expect(vi).toContain("youSaid: 'Bạn nói',");
    expect(en).toContain("youSaid: 'You said',");
  });

  it('the review 🔊 can follow the iOS rules (Review Focus 5)', () => {
    expect(review).toMatch(/onBeforePlay=\{onBeforePlay\}\s+preferWebAudio=\{preferWebAudio\}/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/n400/oral/spoken-exam-wiring.test.ts`
Expected: FAIL (2 new failures).

- [ ] **Step 3: Implement**

In `src/app/n400ready/(app)/mock-test/full/ReviewAnswers.tsx`:

1. Replace

```ts
  /** English text of the option the learner picked. */
  selectedEn?: string;
}
```

with

```ts
  /** English text of the option the learner picked. */
  selectedEn?: string;
  /** A voice run's spoken or typed words (speaking spec §5.2). */
  transcript?: string;
  input?: 'mic' | 'typed';
}
```

2. Replace

```ts
export interface SpeakingAnswer {
  itemId: string;
  wasCorrect: boolean;
  selectedEn?: string;
}
```

with

```ts
export interface SpeakingAnswer {
  itemId: string;
  wasCorrect: boolean;
  selectedEn?: string;
  transcript?: string;
  input?: 'mic' | 'typed';
}
```

3. In `interface ReviewAnswersProps`, replace `  onRetake: () => void;\n}` with:

```ts
  onRetake: () => void;
  /** iOS 🔊 rules for the rows' 🔊 while a mic session may be open (Civics rev 3.12). */
  onBeforePlay?: () => void;
  preferWebAudio?: () => boolean;
}
```

4. In `interface ReviewItem`, after `  userAnswer: string | null;`, add `  /** "Bạn nói" / "Bạn trả lời" for a voice row; the section default otherwise. */\n  answerLabel?: string;`.
5. In the component's destructured props, replace `  onRetake,\n}: ReviewAnswersProps) {` with `  onRetake,\n  onBeforePlay,\n  preferWebAudio,\n}: ReviewAnswersProps) {`.
6. Replace `  const items = useMemo<ReviewItem[]>(() => {` with the following. The helper lives inside the memo, whose deps already list `rt`, so exhaustive-deps stays quiet.

```ts
  const items = useMemo<ReviewItem[]>(() => {
    // A voice row names how it was answered (speaking spec §5.2).
    const spokenLabel = (a: { transcript?: string; input?: 'mic' | 'typed' }) =>
      a.transcript === undefined ? undefined : a.input === 'typed' ? rt.youTyped : rt.youSaid;
```

7. Replace both occurrences of `          userAnswer: a.selectedEn ?? null,` (civics and speaking items) with:

```ts
          userAnswer: a.transcript ?? a.selectedEn ?? null,
          answerLabel: spokenLabel(a),
```

8. Replace `                    {item.section === 'writing' ? rt.yourAnswer : rt.yourSelection}` with `                    {item.answerLabel ?? (item.section === 'writing' ? rt.yourAnswer : rt.yourSelection)}`.
9. Replace `                  <AudioButton src={item.audioSrc} size="sm" label={dict.flashcards.listenQuestion} />` with:

```tsx
                  <AudioButton
                    src={item.audioSrc}
                    size="sm"
                    label={dict.flashcards.listenQuestion}
                    onBeforePlay={onBeforePlay}
                    preferWebAudio={preferWebAudio}
                  />
```

In `src/lib/n400/i18n/vi.ts`, after `      yourSelection: 'Câu trả lời của bạn',`, add `      youSaid: 'Bạn nói',` and `      youTyped: 'Bạn trả lời',`.
In `src/lib/n400/i18n/en.ts`, after `      yourSelection: 'Your answer',`, add `      youSaid: 'You said',` and `      youTyped: 'You answered',`.

- [ ] **Step 4: Run the tests, type-check and lint**

Run, separately:
- `npx vitest run src/components/n400/oral/spoken-exam-wiring.test.ts`
- `npx tsc --noEmit`
- `npx eslint "src/app/n400ready/(app)/mock-test/full/ReviewAnswers.tsx" src/lib/n400/i18n/vi.ts src/lib/n400/i18n/en.ts`

Expected: PASS (11 tests); type-check 0 errors; eslint no problems.

- [ ] **Step 5: Commit**

```bash
git add "src/app/n400ready/(app)/mock-test/full/ReviewAnswers.tsx" src/lib/n400/i18n/vi.ts src/lib/n400/i18n/en.ts src/components/n400/oral/spoken-exam-wiring.test.ts
git commit -m "feat(n400app): Full interview review — Bạn nói rows and iOS 🔊

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Phỏng vấn đầy đủ — "Toàn bộ bằng giọng" (spec §5.2)

**Files:**
- Modify: `apps/website/src/app/n400ready/(app)/mock-test/full/page.tsx`
- Modify: `apps/website/src/lib/n400/i18n/vi.ts`, `apps/website/src/lib/n400/i18n/en.ts` (`oral.fullModeVoice`, `oral.fullModeNote`)
- Test: `apps/website/src/components/n400/oral/spoken-exam-wiring.test.ts` (append)

**Interfaces:**
- Consumes:
  - Task 2: `answerModeOf`, `recordMockResult(result, answerMode)`;
  - Task 3: `ExamVoice`;
  - Task 4: `SectionMCQuiz` `examVoice`, `onAnswer` 5th argument;
  - Task 5: `CivicsAnswer`/`SpeakingAnswer` `transcript`/`input`, `ReviewAnswers` `onBeforePlay`/`preferWebAudio`;
  - existing: `AnswerModeToggle`, `useSpeechRecognition`, `useVoiceFlags().speakingOn`, `voiceInputFor`.
- Produces: the page. Nothing else consumes it.

- [ ] **Step 1: Write the failing test**

Append to `spoken-exam-wiring.test.ts`:

```ts
describe('Phỏng vấn đầy đủ — voice run', () => {
  const page = read('src/app/n400ready/(app)/mock-test/full/page.tsx');

  it('offers "Toàn bộ bằng giọng" only when voice is available here, remembered for this test (Review Focus 1)', () => {
    expect(page).toContain('enabled: voiceFlags.speakingOn,');
    expect(page).toContain('{voiceAvailable ? (');
    expect(page).toContain('labels={{ choice: dict.oral.modeChoice, voice: dict.oral.fullModeVoice }}');
    expect(page).toContain("const FULL_MODE_KEY = 'n400.mock.full.answerMode';");
  });

  it('one choice at Bắt đầu covers the Civics and Speaking parts', () => {
    expect(page).toContain("setRunMode(answerMode === 'voice' && voiceAvailable ? 'voice' : 'choice');");
    expect(page.match(/examVoice=\{examVoice\}/g)).toHaveLength(2);
  });

  it('the mic-lost latch spans both parts and resets at Bắt đầu (Review Focus 3)', () => {
    expect(page).toContain('onMicLost: () => setMicLatched(true)');
    expect(page).toContain('setMicLatched(false);');
  });

  it('records how each part was answered, and the Civics words (Review Focus 4)', () => {
    expect(page).toContain('answerModeOf(civicsAnswers.current.map((a) => a.input))');
    expect(page).toContain(
      "recordSectionMockResult('speaking', passed, correct, FULL_SPEAKING_COUNT, answerModeOf(speakingAnswers.current.map((a) => a.input)))",
    );
    expect(page).toContain('...(transcript !== undefined ? { transcript } : {})');
  });

  it('the review 🔊 follows the iOS rules (Review Focus 5)', () => {
    expect(page).toMatch(/onBeforePlay=\{beforeAudio\}\s+preferWebAudio=\{mic\.sessionRunning\}/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/n400/oral/spoken-exam-wiring.test.ts`
Expected: FAIL (5 new failures).

- [ ] **Step 3: Implement**

In `src/app/n400ready/(app)/mock-test/full/page.tsx`:

1. After `import { InterludeScreen } from './interview-chrome';`, add:

```ts
import { AnswerModeToggle, type PracticeAnswerMode } from '@/components/n400/oral/AnswerModeToggle';
import type { ExamVoice } from '@/components/n400/oral/use-spoken-exam';
import { answerModeOf } from '@/lib/n400/attempt-row';
import { useSpeechRecognition } from '@/lib/n400/oral/use-speech-recognition';
import { useVoiceFlags } from '@/lib/n400/oral/use-voice-flags';
import { voiceInputFor } from '@/lib/n400/oral/voice-support';
```

2. Replace `const FULL_TOTAL_COUNT = FULL_CIVICS_COUNT + FULL_SPEAKING_COUNT + FULL_WRITING_COUNT;` with:

```ts
const FULL_TOTAL_COUNT = FULL_CIVICS_COUNT + FULL_SPEAKING_COUNT + FULL_WRITING_COUNT;

// The learner's "Cách trả lời" for the Full interview, remembered for this test
// (speaking spec S8).
const FULL_MODE_KEY = 'n400.mock.full.answerMode';

function readStoredFullMode(): PracticeAnswerMode {
  try {
    return window.localStorage.getItem(FULL_MODE_KEY) === 'voice' ? 'voice' : 'choice';
  } catch {
    return 'choice';
  }
}
```

3. Replace `  const startedAt = useRef<string>('');` with:

```ts
  const startedAt = useRef<string>('');

  // Voice (speaking spec §5.2): one choice at the start covers the Civics and
  // Speaking parts; Writing stays typed.
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
  const [answerMode, setAnswerMode] = useState<PracticeAnswerMode>(() => readStoredFullMode());
  // The run's mode, latched at Bắt đầu; the mic-lost latch spans both parts.
  const [runMode, setRunMode] = useState<PracticeAnswerMode>('choice');
  const [micLatched, setMicLatched] = useState(false);
```

4. In `begin`, replace `    startedAt.current = new Date().toISOString();` with:

```ts
    startedAt.current = new Date().toISOString();
    setRunMode(answerMode === 'voice' && voiceAvailable ? 'voice' : 'choice');
    setMicLatched(false);
```

5. Replace

```ts
  // begin() already reshuffles via its seed bump — no double bump here.
  const retake = () => {
    setPhase({ kind: 'intro' });
  };
```

with

```ts
  // begin() already reshuffles via its seed bump — no double bump here.
  const retake = () => {
    setPhase({ kind: 'intro' });
  };

  const examVoice: ExamVoice | undefined =
    runMode === 'voice'
      ? { input: voiceInput, micLost: micLatched, onMicLost: () => setMicLatched(true), context: 'full' }
      : undefined;

  const onModeChange = (m: PracticeAnswerMode) => {
    setAnswerMode(m);
    try {
      window.localStorage.setItem(FULL_MODE_KEY, m);
    } catch {
      // Private mode — the choice lasts for this page only.
    }
  };

  // 🔊 on the review screen while an iOS session may still be open (Civics rev 3.12).
  const beforeAudio = () => {
    if (mic.state === 'listening') mic.reset();
    mic.noteAudioPlayed();
  };
```

6. In the Civics `SectionMCQuiz`, replace

```tsx
        examSection={{ current: 1, total: 3, ...dict.mockTest.full.civicsSection }}
        onAnswer={(itemId, ok, selected) =>
          civicsAnswers.current.push({
            questionId: Number(itemId.slice(4)),
            wasCorrect: ok,
            selectedEn: selected?.en,
          })
        }
```

with

```tsx
        examSection={{ current: 1, total: 3, ...dict.mockTest.full.civicsSection }}
        examVoice={examVoice}
        onAnswer={(itemId, ok, selected, _via, spoken) =>
          civicsAnswers.current.push({
            questionId: Number(itemId.slice(4)),
            wasCorrect: ok,
            selectedEn: selected?.en,
            ...(spoken ? { transcript: spoken.transcript, input: spoken.input } : {}),
          })
        }
```

7. Replace

```tsx
          void recordMockResult({
            id: generateAttemptId(),
            startedAt: startedAt.current,
            completedAt: new Date().toISOString(),
            score: correct,
            total: FULL_CIVICS_COUNT,
            passed,
            // Persisted attempts keep the lean shape — selectedEn only feeds
            // this session's review screen.
            questionResults: civicsAnswers.current.map(({ questionId, wasCorrect }) => ({
              questionId,
              wasCorrect,
            })),
          });
```

with

```tsx
          void recordMockResult(
            {
              id: generateAttemptId(),
              startedAt: startedAt.current,
              completedAt: new Date().toISOString(),
              score: correct,
              total: FULL_CIVICS_COUNT,
              passed,
              // Persisted attempts keep the lean shape plus a voice answer's words
              // (speaking spec §5.2) — selectedEn only feeds this session's review.
              questionResults: civicsAnswers.current.map(({ questionId, wasCorrect, transcript }) => ({
                questionId,
                wasCorrect,
                ...(transcript !== undefined ? { transcript } : {}),
              })),
            },
            answerModeOf(civicsAnswers.current.map((a) => a.input)),
          );
```

8. In the Speaking `SectionMCQuiz`, replace

```tsx
        examSection={{ current: 2, total: 3, ...dict.mockTest.full.speakingSection }}
        onAnswer={(itemId, ok, selected) =>
          speakingAnswers.current.push({ itemId, wasCorrect: ok, selectedEn: selected?.en })
        }
```

with

```tsx
        examSection={{ current: 2, total: 3, ...dict.mockTest.full.speakingSection }}
        examVoice={examVoice}
        onAnswer={(itemId, ok, selected, _via, spoken) =>
          speakingAnswers.current.push({
            itemId,
            wasCorrect: ok,
            selectedEn: selected?.en,
            ...(spoken ? { transcript: spoken.transcript, input: spoken.input } : {}),
          })
        }
```

9. Replace `          void recordSectionMockResult('speaking', passed, correct, FULL_SPEAKING_COUNT);` with `          void recordSectionMockResult('speaking', passed, correct, FULL_SPEAKING_COUNT, answerModeOf(speakingAnswers.current.map((a) => a.input)));`.
10. In the `ReviewAnswers` element, replace `        onRetake={retake}\n      />` (the review branch; the summary's `MockTestResult` also has `onRetake={retake}` followed by `onReviewAnswers`, so match the one followed by `/>`) with:

```tsx
        onRetake={retake}
        onBeforePlay={beforeAudio}
        preferWebAudio={mic.sessionRunning}
      />
```

11. Replace `      {/* CTA */}` with:

```tsx
      {/* Cách trả lời (speaking spec §5.2): only when voice is available here */}
      {voiceAvailable ? (
        <div className="mt-5 rounded-2xl border border-slate-100 p-4 text-left sm:p-5">
          <p className="mb-2 text-sm font-semibold text-gray-700">{dict.oral.mockModeLabel}</p>
          <AnswerModeToggle
            mode={answerMode}
            onChange={onModeChange}
            labels={{ choice: dict.oral.modeChoice, voice: dict.oral.fullModeVoice }}
          />
          <p className="mt-2 text-xs text-gray-500">{dict.oral.fullModeNote}</p>
        </div>
      ) : null}

      {/* CTA */}
```

In `src/lib/n400/i18n/vi.ts`, after `    mockModeVoice: 'Trả lời bằng giọng',`, add `    fullModeVoice: 'Toàn bộ bằng giọng',` and `    fullModeNote: 'Áp dụng cho phần Civics và Speaking. Phần Viết vẫn gõ như cũ.',`.
In `src/lib/n400/i18n/en.ts`, after `    mockModeVoice: 'Answer by voice',`, add `    fullModeVoice: 'All by voice',` and `    fullModeNote: 'Applies to the Civics and Speaking parts. Writing stays typed.',`.

- [ ] **Step 4: Run the tests, type-check and lint**

Run, separately:
- `npx vitest run src/components/n400`
- `npx tsc --noEmit`
- `npx eslint "src/app/n400ready/(app)/mock-test/full/page.tsx" src/lib/n400/i18n/vi.ts src/lib/n400/i18n/en.ts`

Expected:
- vitest: the only failure is the pre-existing `mobile-layout.test.ts`. `spoken-exam-wiring.test.ts` passes 16 tests. `navigation-ia.test.ts` still passes: the page keeps `recordMockResult` and `recordSectionMockResult('speaking'`;
- type-check 0 errors;
- eslint: no problems.

- [ ] **Step 5: Commit**

```bash
git add "src/app/n400ready/(app)/mock-test/full/page.tsx" src/lib/n400/i18n/vi.ts src/lib/n400/i18n/en.ts src/components/n400/oral/spoken-exam-wiring.test.ts
git commit -m "feat(n400app): Phỏng vấn đầy đủ — Toàn bộ bằng giọng for Civics and Speaking

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Privacy Policy §8 — interview questions, Civics answer text (spec §9)

**Files:**
- Modify: `apps/website/src/app/[locale]/privacy-policy/page.tsx`
- Test: `apps/website/src/app/[locale]/privacy-policy/privacy-voice.test.ts` (append)

**Interfaces:** none.

- [ ] **Step 1: Write the failing test**

Append to `privacy-voice.test.ts`:

```ts
describe('privacy policy — interview questions by voice (speaking spec §9)', () => {
  it('names civics and interview questions (EN + VI)', () => {
    expect(page).toContain('N400Ready lets you answer civics and interview questions by voice.');
    expect(page).toContain('N400Ready cho phép bạn trả lời câu hỏi công dân và câu hỏi phỏng vấn bằng giọng nói.');
  });

  it('stores answer text for Civics mock tests (EN + VI)', () => {
    expect(page).toContain('For Civics mock tests, N400Ready stores the text of each answer');
    expect(page).toContain('Với bài thi thử Civics, N400Ready lưu phần văn bản của từng câu trả lời');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run "src/app/[locale]/privacy-policy/privacy-voice.test.ts"`
Expected: FAIL (2 new failures).

- [ ] **Step 3: Implement**

In `src/app/[locale]/privacy-policy/page.tsx`:

1. Replace `N400Ready lets you answer civics questions by voice.` with `N400Ready lets you answer civics and interview questions by voice.`.
2. Replace `<p>For mock tests, N400Ready stores the text of each answer` with `<p>For Civics mock tests, N400Ready stores the text of each answer`.
3. Replace `N400Ready cho phép bạn trả lời câu hỏi công dân bằng giọng nói.` with `N400Ready cho phép bạn trả lời câu hỏi công dân và câu hỏi phỏng vấn bằng giọng nói.`.
4. Replace `Với bài thi thử, N400Ready lưu phần văn bản` with `Với bài thi thử Civics, N400Ready lưu phần văn bản`.

- [ ] **Step 4: Run the tests and lint**

Run: `npx vitest run "src/app/[locale]/privacy-policy/privacy-voice.test.ts" && npx eslint "src/app/[locale]/privacy-policy/page.tsx"`
Expected: PASS (7 tests); eslint no problems.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/privacy-policy/page.tsx" "src/app/[locale]/privacy-policy/privacy-voice.test.ts"
git commit -m "feat(website): Privacy Policy §8 — interview questions by voice; Civics mock answer text

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Gate S4 checklist, spec updates, full gate

**Files:**
- Create: `docs/superpowers/spikes/2026-09-26-n400-full-interview-voice-gate4.md`
- Modify: `docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md` (§5.2 rulings, §12 status)

**Interfaces:** none.

- [ ] **Step 1: Write the Gate S4 checklist**

Create `docs/superpowers/spikes/2026-09-26-n400-full-interview-voice-gate4.md`:

```markdown
# N400 Speaking Oral Answers — Gate S4 (Phỏng vấn đầy đủ device pass)

**Spec:** docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md §5.2, §9 · **Plan:** docs/superpowers/plans/2026-09-26-n400-speaking-oral-s4-full-interview.md
**Prereqs:** S4 deployed; `voice_speaking` ON (it is).

| # | Environment | Check | Result |
|---|---|---|---|
| 1 | iPhone Safari | Phỏng vấn đầy đủ: the intro shows **Cách trả lời: [Trắc nghiệm, Toàn bộ bằng giọng]** with the note; pick **Toàn bộ bằng giọng** → Bắt đầu | |
| 2 | iPhone Safari | Civics part by voice: "App nghe được: …", **Đúng vậy** locks, **Nói lại** once; nothing shows right/wrong mid-test. A question with no answer for your address stays multiple choice | |
| 3 | iPhone Safari | Speaking part by voice; a Yes/No "I don't know" is asked again and **Nói lại** is still offered | |
| 4 | iPhone Safari | Writing part unchanged (typed dictation); interludes and the stepper as before | |
| 5 | iPhone Safari | Result → **Xem lại đáp án**: voice rows say "Bạn nói: …". Tap 🔊 in the review, then Thi lại by voice: the first Civics item's mic still hears you | |
| 6 | iPhone Safari | Turn off Siri & Dictation (or deny the mic) mid-run: the remaining voice items are typed, in both parts, never multiple choice | |
| 7 | Any | **Trắc nghiệm** run works exactly as before; the choice is remembered on the next visit | |
| 8 | Mac Chrome (Incognito) | Items 1–3 and 5 | |
| 9 | Facebook in-app iOS | The intro offers voice; both parts use the typed box | |
| 10 | Any | DB: the Civics part's `n400_quiz_attempts.answer_mode` = voice and its `n400_question_attempts` rows have the words; the Speaking part's `n400_section_mock_results.answer_mode` = voice; a choice run writes neither | |
| 11 | Any | Privacy Policy §8 (EN + VI): "civics and interview questions", "For Civics mock tests" | |

## Decision (owner)

- Gate S4 pass? <yes/no>
- On yes: add the ROADMAP entry for Speaking + Full-interview voice answers (`voice_speaking` is already ON 100%).
```

- [ ] **Step 2: Spec updates**

In the speaking spec:

1. At the end of §5.2 (after the **Mic trouble** bullet), add:

```markdown
- **S4 rulings:**
  - exam voice items are graded silently at Next (same result as grading when the part completes; no verdict mid-test), in `useSpokenExam` (`components/n400/oral/use-spoken-exam.ts`) on the S3 pure rules;
  - the mic-lost latch lives in the page and spans both parts;
  - each part records `answerModeOf(inputs)`: voice if any mic answer, typed if any typed, else choice;
  - the Civics words are inserted by the client, trimmed and capped at 500 characters; RLS allows `answer_mode` and `transcript` (verified 2026-09-26);
  - `voice_speaking` gates the whole voice run, Civics part included;
  - the review 🔊 follows the iOS rules; the Writing part's 🔊 is unchanged.
```

2. In §12, replace `- **S4, Full interview:** §5.2 and the Privacy §8 edits.` with `- **S4, Full interview (built, plan docs/superpowers/plans/2026-09-26-n400-speaking-oral-s4-full-interview.md):** §5.2 and the Privacy §8 edits.`.

- [ ] **Step 3: Full gate**

Run `npm run type-check`, `npm run test` and `npm run build`, separately.
Expected:
- type-check 0 errors;
- test: the only failure is the pre-existing `mobile-layout.test.ts`;
- build succeeds.

- [ ] **Step 4: Commit**

```bash
git add ../../docs/superpowers/spikes/2026-09-26-n400-full-interview-voice-gate4.md ../../docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md
git commit -m "docs(n400app): Gate S4 checklist; speaking spec §5.2/§12 for S4

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**GATE S4 — stop.** The owner decides on merge and push, then runs the device checklist. On "Gate S4 pass: yes", add the ROADMAP entry. The pending Gate S2 and S3 rows stay open until the owner finishes them.
