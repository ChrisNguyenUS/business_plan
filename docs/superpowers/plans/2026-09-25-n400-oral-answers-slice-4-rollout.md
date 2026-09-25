# N400 Oral Answers — Slice 4 (Rollout) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make voice answers ready for real learners. Fix the Gate 3 grading finding, add the `n400_oral_answer` analytics event, add the voice section to the Privacy Policy, and record the rollout.

**Architecture:**
- **Grading** stays pure in `grade-oral.ts`, with one new rule: the token `not` never near-matches.
- **Analytics** is one GA4-only helper, `trackOralAnswer`, in `lib/n400/analytics.ts`. Pure payload builders in `lib/n400/oral/oral-events.ts` feed it, and the pages only call the two.
  - Practice sends an event after grading, after the near prompt, and on each mic error.
  - The mock sends events after the server finalize returns its verdicts, and on each mic error.
- **Privacy** is one new section in the existing static Privacy Policy page.
- **Rollout:** both flags are already at 100% under the §7 small-traffic rule, so the last task only records the state in the spec and the roadmap.

**Tech Stack:** Next.js 16 (App Router), TypeScript, vitest (node, no DOM), GA4 via `window.gtag`.

**Spec:** `docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md` (rev 3.14; this plan makes it rev 3.15). Gate 3 record: `docs/superpowers/spikes/2026-09-24-n400-oral-mock-gate3.md`.

## Global Constraints

- **Scope:** `apps/website/` only (CLAUDE.md monorepo isolation). All commands run from `apps/website/`.
- **Gate (spec §11):** `npm run type-check && npm run test && npm run build`.
  - `src/components/n400/mobile-layout.test.ts > progress tabs avoid fixed desktop columns on mobile` already fails on `main`. It is not ours: report it, don't fix it.
- **`n400_oral_answer` goes to GA4 only.** It is never sent to the Meta Pixel, so never add it to `PIXEL_SAFE_EVENTS`. It never carries transcript text, only the text's length (spec §9).
- **Nothing is written to `n400_growth_events`** (spec §9).
- **The mock page never grades on the client** (`mock-voice-wiring.test.ts`). Mock verdicts come only from `finalizeVoiceMockAttempt(...).answers[].wasCorrect`.
- **D7 "thuộc = graded only":** analytics must not change what `recordAnswer` records.
- **D8:** a near-match only ever gives `near`.
- **D10:** grading rules are spec-governed. A grading change lands together with a §3.3 reference case.
- **No flag or DB writes in this plan.** Current state: `voice_practice` ON 100%, `voice_mock` ON 100% (since 2026-09-25), `voice_android` OFF (owner, Gate 0).
- **Privacy copy is exactly the text in Task 4.** The owner approves the wording at plan review.
- **Commits:** one logical change per commit. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **"I don't know" / "not sure" in practice must show a plain wrong answer**, never "Có phải bạn nói …?", on every question and not just Q69/Q70. Pinned by the Task 1 sweep test.
2. **A multiple-choice item inside a voice mock must send no `n400_oral_answer`.** Location-based questions without a config stay multiple choice. Pinned by the Task 2 `mockAnswerEvents` test.
3. **Typed answers must be distinguishable from spoken ones.** Otherwise the voice-vs-choice gap in §13 is polluted by keyboard answers. Pinned by the `input` field and the Task 2 test.
4. **A voice mock whose finalize fails must send no answer events**, because there are no verdicts yet. Pinned by the Task 3 wiring test (events only after `await finalizeVoiceMockAttempt(`).
5. **The Pixel must never receive `n400_oral_answer`, and the GA4 payload has exactly the listed keys** (no transcript). Pinned by the Task 2 analytics tests.

---

### Task 1: `not` never near-matches (Gate 3 finding)

**Why:** `isNearWord` allows one edit on short stems. The transcript token `not` (from "don't" or "not sure") is one edit from `vot`, the stem of "vote". So "I don't know" grades `near` on Q69/Q70, and practice then asks "Có phải bạn nói: Vote…?".

**Files:**
- Modify: `apps/website/src/lib/n400/oral/grade-oral.ts:15-21`
- Test: `apps/website/src/lib/n400/oral/grade-oral.test.ts` (append)
- Test: `apps/website/src/lib/n400/oral/grade-oral.corpus.test.ts` (append)
- Modify: `docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md`: header rev line and the §3.3 table

**Interfaces:**
- Consumes: `gradeOralAnswer(transcript, config)` and `getOralAnswerConfig(qid)` (unchanged).
- Produces: no API change.

- [ ] **Step 1: Write the failing tests**

Append to `grade-oral.test.ts`:

```ts
describe('gradeOralAnswer — "not" never near-matches (rev 3.15)', () => {
  it('"I don\'t know" is not a near "vote" (Gate 3: not ≈ vot)', () => {
    const participation: OralAnswerConfig = { type: 'enumeration', alternatives: [['vote', 'write newspaper']] };
    expect(gradeOralAnswer("I don't know", participation).verdict).toBe('wrong');
    expect(gradeOralAnswer('not sure', participation).verdict).toBe('wrong');
  });

  it('a real one-edit word still counts as near', () => {
    const participation: OralAnswerConfig = { type: 'enumeration', alternatives: [['vote', 'write newspaper']] };
    expect(gradeOralAnswer('vat', participation).verdict).toBe('near');
  });
});
```

Append to `grade-oral.corpus.test.ts` (it already defines `graded` and `verdict`):

```ts
// Gate 3 (2026-09-25): "not" sat one edit from the stem "vot", so "I don't know"
// graded near on Q69/Q70 and practice asked "Có phải bạn nói: Vote…?".
describe('not-knowing replies never grade better than wrong (spec §3.3, rev 3.15)', () => {
  it.each(["I don't know", 'I do not know', "I don't remember", 'not sure', 'I am not sure'])('%s', (said) => {
    const better = graded.filter((q) => verdict(q.id, said) !== 'wrong').map((q) => q.id);
    expect(better).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/n400/oral/grade-oral.test.ts src/lib/n400/oral/grade-oral.corpus.test.ts`
Expected: FAIL.
- In `grade-oral.test.ts`: the first new test fails with `expected 'near' to be 'wrong'`. The "real near word" test PASSES.
- In the corpus sweep: 5 failures, each `expected [ 69, 70 ] to deeply equal []`.

- [ ] **Step 3: Write the minimal implementation**

In `grade-oral.ts`, replace:

```ts
// A near-match only ever contributes to `near` (D8): recognizers output real
// words, so "institution" for "constitution" is a different word, not a typo.
function isNearWord(token: string, keywordStem: string): boolean {
  if (/^\d+$/.test(token) || /^\d+$/.test(keywordStem)) return false;
```

with:

```ts
// "not" is a negation, never an answer word (Q60 needs it exactly), yet it is one
// edit from the stem "vot": "I don't know" graded near on Q69/Q70 (Gate 3, rev 3.15).
const NEVER_NEAR: ReadonlySet<string> = new Set(['not']);

// A near-match only ever contributes to `near` (D8): recognizers output real
// words, so "institution" for "constitution" is a different word, not a typo.
function isNearWord(token: string, keywordStem: string): boolean {
  if (NEVER_NEAR.has(token)) return false;
  if (/^\d+$/.test(token) || /^\d+$/.test(keywordStem)) return false;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/n400/oral`
Expected: PASS, with every oral test green. The cross-question allowlist only covers `correct`, so it is unaffected.

- [ ] **Step 5: Spec — §3.3 row + rev header**

In the spec header, change `**Date:** 2026-09-25 (rev 3.14 — ` to `**Date:** 2026-09-25 (rev 3.15 — Slice 4: \`not\` never near-matches, \`n400_oral_answer\`, Privacy Policy voice section; rev 3.14 — `.

In §3.3, after the row `| 48 | Secretary of Education and Secretary of Energy | secretary | wrong (rev 3.2: no item fully named) |`, add:

```markdown
| 69 | Vote and write to a newspaper | I don't know | wrong (rev 3.15: `not` never near-matches; Gate 3 found `not` ≈ `vote`) |
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/n400/oral/grade-oral.ts src/lib/n400/oral/grade-oral.test.ts src/lib/n400/oral/grade-oral.corpus.test.ts ../../docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md
git commit -m "fix(n400app): 'not' never near-matches — 'I don't know' is wrong, not near 'vote'

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `trackOralAnswer` + event builders

**Files:**
- Modify: `apps/website/src/lib/n400/analytics.ts`
- Create: `apps/website/src/lib/n400/analytics.test.ts`
- Create: `apps/website/src/lib/n400/oral/oral-events.ts`
- Create: `apps/website/src/lib/n400/oral/oral-events.test.ts`
- Modify: spec §9

**Interfaces:**
- Consumes:
  - `trackGa(eventName, params)`, `generateEventId()` and `trackBadgeUnlocked` from `@/lib/analytics/events`.
  - `MicError` from `./speech-controller`, `OralVerdict` from `./types`, `VoiceItem` from `./mock-voice-items`.
- Produces:
  - `interface OralAnswerEvent { qid: number; context: 'practice' | 'mock'; input: 'mic' | 'typed'; verdict: OralVerdict | 'none'; retried: boolean | null; confirmedNear: boolean | null; error: MicError | 'none'; transcriptLength: number }`.
  - `trackOralAnswer(e: OralAnswerEvent): void`.
  - `trackMockTestStart(answerMode: 'choice' | 'voice' = 'choice'): void`.
  - `practiceAnswerEvent(qid: number, input: 'mic' | 'typed', verdict: OralVerdict, confirmedNear: boolean | null, transcript: string): OralAnswerEvent`.
  - `micErrorEvent(qid: number, context: 'practice' | 'mock', input: 'mic' | 'typed', error: MicError): OralAnswerEvent`.
  - `mockAnswerEvents(qids: readonly number[], items: readonly (VoiceItem | null)[], answers: readonly { qid: number; wasCorrect: boolean }[]): OralAnswerEvent[]`.

**Rulings carried from the spec (§9 lists the fields):**
- `input` is added so typed answers don't pollute the voice metrics (Review Focus 3).
- `retried` is `null` ("n/a") in practice: practice has no retry limit, so there is nothing to count.
- A mic error is its own event with `verdict: 'none'`. That is how the no-speech and error rates come "from this one event".

- [ ] **Step 1: Write the failing tests**

Create `apps/website/src/lib/n400/analytics.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { ga } = vi.hoisted(() => ({ ga: vi.fn() }));
vi.mock('@/lib/analytics/events', () => ({
  trackGa: ga,
  generateEventId: () => 'evt-1',
  trackBadgeUnlocked: () => {},
}));

import { trackMockTestStart, trackOralAnswer, type OralAnswerEvent } from './analytics';

const fbq = vi.fn();

beforeEach(() => {
  ga.mockReset();
  fbq.mockReset();
  vi.stubGlobal('window', { fbq });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const base: OralAnswerEvent = {
  qid: 69,
  context: 'practice',
  input: 'mic',
  verdict: 'wrong',
  retried: null,
  confirmedNear: null,
  error: 'none',
  transcriptLength: 12,
};

describe('trackOralAnswer (spec §9)', () => {
  it('sends n400_oral_answer to GA4 with exactly these params (no transcript)', () => {
    trackOralAnswer(base);
    expect(ga).toHaveBeenCalledWith('n400_oral_answer', {
      qid: 69,
      context: 'practice',
      input: 'mic',
      verdict: 'wrong',
      retried: 'n/a',
      confirmed_near: 'n/a',
      error: 'none',
      transcript_length: 12,
    });
  });

  it('never reaches the Meta Pixel', () => {
    trackOralAnswer(base);
    expect(fbq).not.toHaveBeenCalled();
  });

  it('maps yes/no/n-a', () => {
    trackOralAnswer({ ...base, context: 'mock', retried: true, confirmedNear: false });
    expect(ga.mock.calls[0][1]).toMatchObject({ retried: 'yes', confirmed_near: 'no' });
  });
});

describe('trackMockTestStart', () => {
  it('carries the answer mode to GA4 and the Pixel', () => {
    trackMockTestStart('voice');
    expect(ga).toHaveBeenCalledWith('n400_mock_test_start', { answer_mode: 'voice' });
    expect(fbq).toHaveBeenCalledWith('trackCustom', 'n400_mock_test_start', { answer_mode: 'voice' }, { eventID: 'evt-1' });
  });

  it('defaults to choice', () => {
    trackMockTestStart();
    expect(ga).toHaveBeenCalledWith('n400_mock_test_start', { answer_mode: 'choice' });
  });
});
```

Create `apps/website/src/lib/n400/oral/oral-events.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { VoiceItem } from './mock-voice-items';
import { micErrorEvent, mockAnswerEvents, practiceAnswerEvent } from './oral-events';

const said = (transcript: string, retried = false, input: 'mic' | 'typed' = 'mic'): VoiceItem => ({
  transcript,
  retried,
  input,
  confirmed: true,
});

describe('practiceAnswerEvent', () => {
  it('carries the verdict, the near answer and only the transcript length', () => {
    expect(practiceAnswerEvent(69, 'mic', 'near', true, 'vote and write')).toEqual({
      qid: 69,
      context: 'practice',
      input: 'mic',
      verdict: 'near',
      retried: null,
      confirmedNear: true,
      error: 'none',
      transcriptLength: 14,
    });
  });
});

describe('micErrorEvent', () => {
  it('has no verdict and no transcript', () => {
    expect(micErrorEvent(12, 'mock', 'mic', 'no-speech')).toEqual({
      qid: 12,
      context: 'mock',
      input: 'mic',
      verdict: 'none',
      retried: null,
      confirmedNear: null,
      error: 'no-speech',
      transcriptLength: 0,
    });
  });
});

describe('mockAnswerEvents', () => {
  it('one event per spoken item, verdict from the server', () => {
    const events = mockAnswerEvents([21, 22], [said('100'), said('six years', true)], [
      { qid: 21, wasCorrect: true },
      { qid: 22, wasCorrect: false },
    ]);
    expect(events.map((e) => [e.qid, e.context, e.verdict, e.retried, e.transcriptLength])).toEqual([
      [21, 'mock', 'correct', false, 3],
      [22, 'mock', 'wrong', true, 9],
    ]);
  });

  it('multiple-choice items inside a voice mock send nothing (Review Focus 2)', () => {
    const events = mockAnswerEvents([23, 21], [null, said('100')], [
      { qid: 23, wasCorrect: true },
      { qid: 21, wasCorrect: true },
    ]);
    expect(events.map((e) => e.qid)).toEqual([21]);
  });

  it('typed items are marked typed (Review Focus 3)', () => {
    const [e] = mockAnswerEvents([21], [said('100', false, 'typed')], [{ qid: 21, wasCorrect: true }]);
    expect(e.input).toBe('typed');
  });

  it('an item the server did not return sends nothing', () => {
    expect(mockAnswerEvents([21], [said('100')], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/n400/analytics.test.ts src/lib/n400/oral/oral-events.test.ts`
Expected: FAIL.
- `analytics.test.ts`: `trackOralAnswer is not a function`, and `trackMockTestStart` is called with `{ answer_mode }` expected but got no params.
- `oral-events.test.ts`: fails to resolve `./oral-events`.

- [ ] **Step 3: Write the minimal implementation**

In `analytics.ts`, add the type imports under the existing import:

```ts
import type { MicError } from '@/lib/n400/oral/speech-controller';
import type { OralVerdict } from '@/lib/n400/oral/types';
```

Replace:

```ts
export function trackMockTestStart(): void {
  trackN400Event('n400_mock_test_start');
}
```

with:

```ts
export function trackMockTestStart(answerMode: 'choice' | 'voice' = 'choice'): void {
  trackN400Event('n400_mock_test_start', { answer_mode: answerMode });
}

/** One voice/typed answer outcome, or one mic error (spec §9). */
export interface OralAnswerEvent {
  qid: number;
  context: 'practice' | 'mock';
  input: 'mic' | 'typed';
  /** 'none' for a mic error event. */
  verdict: OralVerdict | 'none';
  /** Mock only (one Nói lại per item); null in practice. */
  retried: boolean | null;
  /** Practice near prompt: true = "Đúng vậy", false = "Không", null = no prompt. */
  confirmedNear: boolean | null;
  error: MicError | 'none';
  transcriptLength: number;
}

const yesNo = (v: boolean | null): 'yes' | 'no' | 'n/a' => (v === null ? 'n/a' : v ? 'yes' : 'no');

// GA4 only: not in PIXEL_SAFE_EVENTS, and never the transcript text (spec §9).
export function trackOralAnswer(e: OralAnswerEvent): void {
  trackGa('n400_oral_answer', {
    qid: e.qid,
    context: e.context,
    input: e.input,
    verdict: e.verdict,
    retried: yesNo(e.retried),
    confirmed_near: yesNo(e.confirmedNear),
    error: e.error,
    transcript_length: e.transcriptLength,
  });
}
```

Create `apps/website/src/lib/n400/oral/oral-events.ts`:

```ts
// n400_oral_answer payloads (spec §9). Pure, so the pages only hand these to
// trackOralAnswer; mock verdicts come from the server finalize, never the client.

import type { OralAnswerEvent } from '@/lib/n400/analytics';
import type { VoiceItem } from './mock-voice-items';
import type { MicError } from './speech-controller';
import type { OralVerdict } from './types';

/** Practice: a graded answer, or a near answer the learner confirmed or denied. */
export function practiceAnswerEvent(
  qid: number,
  input: 'mic' | 'typed',
  verdict: OralVerdict,
  confirmedNear: boolean | null,
  transcript: string,
): OralAnswerEvent {
  return {
    qid,
    context: 'practice',
    input,
    verdict,
    retried: null,
    confirmedNear,
    error: 'none',
    transcriptLength: transcript.length,
  };
}

/** A mic error while answering: no verdict, no transcript. */
export function micErrorEvent(
  qid: number,
  context: 'practice' | 'mock',
  input: 'mic' | 'typed',
  error: MicError,
): OralAnswerEvent {
  return { qid, context, input, verdict: 'none', retried: null, confirmedNear: null, error, transcriptLength: 0 };
}

/** Mock: one event per spoken or typed item, verdicts from the server finalize.
 *  Multiple-choice items inside a voice mock (null items) send nothing. */
export function mockAnswerEvents(
  qids: readonly number[],
  items: readonly (VoiceItem | null)[],
  answers: readonly { qid: number; wasCorrect: boolean }[],
): OralAnswerEvent[] {
  const byQid = new Map(answers.map((a) => [a.qid, a.wasCorrect]));
  const events: OralAnswerEvent[] = [];
  qids.forEach((qid, i) => {
    const item = items[i];
    const wasCorrect = byQid.get(qid);
    if (!item || wasCorrect === undefined) return;
    events.push({
      qid,
      context: 'mock',
      input: item.input,
      verdict: wasCorrect ? 'correct' : 'wrong',
      retried: item.retried,
      confirmedNear: null,
      error: 'none',
      transcriptLength: item.transcript.length,
    });
  });
  return events;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/n400/analytics.test.ts src/lib/n400/oral/oral-events.test.ts`
Expected: PASS (5 + 6 tests).

- [ ] **Step 5: Spec §9**

Replace the first §9 bullet:

```markdown
- One GA4 event via `lib/n400/analytics.ts`: **`n400_oral_answer`** `{ qid, context: 'practice'|'mock', verdict, retried, confirmed_near, error, transcript_length }`. Not sent to the Meta Pixel. No transcript text in analytics.
```

with:

```markdown
- One GA4 event via `lib/n400/analytics.ts`: **`n400_oral_answer`** `{ qid, context: 'practice'|'mock', input: 'mic'|'typed', verdict: 'correct'|'near'|'wrong'|'none', retried: 'yes'|'no'|'n/a', confirmed_near: 'yes'|'no'|'n/a', error, transcript_length }`. Not sent to the Meta Pixel. No transcript text in analytics. (Rev 3.15: `input` keeps typed answers out of the voice numbers; `retried` is `n/a` in practice, which has no retry limit; each mic error is its own event with `verdict: 'none'`; mock verdicts are the server's, sent after finalize. Payloads are built in `lib/n400/oral/oral-events.ts`.)
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/n400/analytics.ts src/lib/n400/analytics.test.ts src/lib/n400/oral/oral-events.ts src/lib/n400/oral/oral-events.test.ts ../../docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md
git commit -m "feat(n400app): n400_oral_answer GA4 event + mock start answer_mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Send the events from practice and the mock

**Files:**
- Modify: `apps/website/src/app/n400ready/(app)/practice/page.tsx`: analytics import (line 22), `onVoiceSubmit`, `onNearAnswer`, and a mic-error effect after `const panelInput`
- Modify: `apps/website/src/app/n400ready/(app)/mock-test/civics/page.tsx`: analytics import (line 46), a mic-error effect after the `micLost` latch, `startNew` (lines 221 and 249), and `finish`
- Create: `apps/website/src/components/n400/oral/voice-analytics-wiring.test.ts`

**Interfaces:**
- Consumes (from Task 2): `trackOralAnswer`, `trackMockTestStart(answerMode)`, `practiceAnswerEvent`, `micErrorEvent`, `mockAnswerEvents`, with the exact signatures in Task 2's Produces block.
- Produces: nothing new.

- [ ] **Step 1: Write the failing wiring test**

Create `apps/website/src/components/n400/oral/voice-analytics-wiring.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin where n400_oral_answer fires (spec §9) by source.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const practice = read('src/app/n400ready/(app)/practice/page.tsx');
const mock = read('src/app/n400ready/(app)/mock-test/civics/page.tsx');

describe('practice sends n400_oral_answer', () => {
  it('after grading, except a near, which waits for the learner', () => {
    expect(practice).toContain(
      "if (verdict !== 'near') trackOralAnswer(practiceAnswerEvent(question.id, panelInput, verdict, null, text));",
    );
  });

  it('after the learner answers the near prompt', () => {
    expect(practice).toContain("trackOralAnswer(practiceAnswerEvent(question.id, panelInput, 'near', yes, voiceText));");
  });

  it('once per mic error', () => {
    expect(practice).toMatch(
      /micErrorEvent\(question\.id, 'practice', panelInput, micError\)\);[\s\S]{0,120}\}, \[micError\]\);/,
    );
  });
});

describe('mock sends n400_oral_answer', () => {
  it('only from the server verdicts, after finalize resolves (Review Focus 4)', () => {
    const finalizeAt = mock.indexOf('await finalizeVoiceMockAttempt(');
    const eventsAt = mock.indexOf('mockAnswerEvents(slides.map((s) => s.questionId), finalItems, v.answers)');
    expect(finalizeAt).toBeGreaterThan(-1);
    expect(eventsAt).toBeGreaterThan(finalizeAt);
  });

  it('once per mic error during a voice run', () => {
    expect(mock).toMatch(
      /micErrorEvent\(qid, 'mock', mockItemInput\(voiceInput, micLost\), micError\)\);[\s\S]{0,120}\}, \[micError\]\);/,
    );
  });

  it('the mock start carries the answer mode it latches', () => {
    expect(mock).toContain('trackMockTestStart(run);');
    expect(mock).toContain('setRunMode(run);');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/n400/oral/voice-analytics-wiring.test.ts`
Expected: FAIL, 6 failures (the strings are not in the pages yet).

- [ ] **Step 3: Wire practice**

In `practice/page.tsx`:

1. Replace `import { trackStreakMilestone, trackPracticeComplete } from '@/lib/n400/analytics';` with:

```ts
import { trackOralAnswer, trackStreakMilestone, trackPracticeComplete } from '@/lib/n400/analytics';
import { micErrorEvent, practiceAnswerEvent } from '@/lib/n400/oral/oral-events';
```

2. Directly after the line `const panelInput: 'mic' | 'typed' = voiceInput === 'typed' || micLost ? 'typed' : 'mic';` add:

```ts

  // n400_oral_answer for mic errors (spec §9): one event each time an error appears.
  const micError = mic.error;
  useEffect(() => {
    if (micError && voiceHere) trackOralAnswer(micErrorEvent(question.id, 'practice', panelInput, micError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micError]);
```

3. In `onVoiceSubmit`, replace:

```ts
    setVoiceVerdict(verdict);
    const o = voiceOutcome(verdict, null);
```

with:

```ts
    setVoiceVerdict(verdict);
    // A near is sent once the learner answers "Có phải bạn nói …?" (onNearAnswer).
    if (verdict !== 'near') trackOralAnswer(practiceAnswerEvent(question.id, panelInput, verdict, null, text));
    const o = voiceOutcome(verdict, null);
```

4. In `onNearAnswer`, replace:

```ts
    setNearAnswer(answer);
    const o = voiceOutcome('near', answer);
```

with:

```ts
    setNearAnswer(answer);
    trackOralAnswer(practiceAnswerEvent(question.id, panelInput, 'near', yes, voiceText));
    const o = voiceOutcome('near', answer);
```

- [ ] **Step 4: Wire the mock**

In `mock-test/civics/page.tsx`:

1. Replace `import { trackMockTestStart, trackStreakMilestone } from '@/lib/n400/analytics';` with:

```ts
import { trackMockTestStart, trackOralAnswer, trackStreakMilestone } from '@/lib/n400/analytics';
import { micErrorEvent, mockAnswerEvents } from '@/lib/n400/oral/oral-events';
```

2. Directly after the `micLost` latch block (the `if (stage === 'taking' && runMode === 'voice' && !micLost && micLostFrom(...` block and its closing `}`), add:

```ts

  // n400_oral_answer for mic errors during a voice run (spec §9).
  const micError = mic.error;
  useEffect(() => {
    const qid = slides[index]?.questionId;
    if (!micError || stage !== 'taking' || runMode !== 'voice' || qid === undefined) return;
    trackOralAnswer(micErrorEvent(qid, 'mock', mockItemInput(voiceInput, micLost), micError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micError]);
```

3. In `startNew`, replace `trackMockTestStart();` with:

```ts
    const run: PracticeAnswerMode = answerMode === 'voice' && voiceState === 'available' ? 'voice' : 'choice';
    trackMockTestStart(run);
```

and replace `setRunMode(answerMode === 'voice' && voiceState === 'available' ? 'voice' : 'choice');` with `setRunMode(run);`.

4. In `finish`, replace:

```ts
        setVoiceAnswers(v.answers);
        r = v;
```

with:

```ts
        setVoiceAnswers(v.answers);
        for (const e of mockAnswerEvents(slides.map((s) => s.questionId), finalItems, v.answers)) trackOralAnswer(e);
        r = v;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/components/n400/oral`
Expected: PASS, including the unchanged `mock-voice-wiring.test.ts`. The page still contains no `gradeOralAnswer`, `was_correct` or `wasCorrect:`.

- [ ] **Step 6: Gate**

Run: `npm run type-check && npm run test && npm run build`
Expected: type-check 0 errors. The only test failure is the pre-existing `mobile-layout.test.ts`. The build succeeds.

- [ ] **Step 7: Commit**

```bash
git add "src/app/n400ready/(app)/practice/page.tsx" "src/app/n400ready/(app)/mock-test/civics/page.tsx" src/components/n400/oral/voice-analytics-wiring.test.ts
git commit -m "feat(n400app): send n400_oral_answer from practice and the voice mock

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Privacy Policy — voice answers section (spec §10)

**Files:**
- Modify: `apps/website/src/app/[locale]/privacy-policy/page.tsx`
- Create: `apps/website/src/app/[locale]/privacy-policy/privacy-voice.test.ts`
- Modify: spec §10

**Interfaces:** none.

- [ ] **Step 1: Write the failing test**

Create `apps/website/src/app/[locale]/privacy-policy/privacy-voice.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Spec §10: the Privacy Policy (EN/VI) covers voice answers, incl. the always-on iPhone mic (D15).
const page = readFileSync(join(process.cwd(), 'src/app/[locale]/privacy-policy/page.tsx'), 'utf8');

describe('privacy policy — voice answers (spec §10)', () => {
  it('has a linkable voice section', () => {
    expect(page).toContain('<section id="voice-answers">');
  });

  it('says audio is never stored (EN + VI)', () => {
    expect(page).toContain('N400Ready never records or stores audio.');
    expect(page).toContain('N400Ready không bao giờ ghi âm hay lưu âm thanh.');
  });

  it('discloses the always-on iPhone microphone (D15, EN + VI)', () => {
    expect(page).toContain('On iPhone, while you use voice answers, the microphone stays on between questions');
    expect(page).toContain('Trên iPhone, khi bạn trả lời bằng giọng, micro bật suốt giữa các câu hỏi');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/[locale]/privacy-policy/privacy-voice.test.ts"`
Expected: FAIL, 3 failures.

- [ ] **Step 3: Add the section**

In `page.tsx`:
- Change `Last updated: April 2026` to `Last updated: September 2026`.
- Change `<h2 className="text-xl font-bold text-charcoal mb-3">8. Contact</h2>` to `9. Contact`.
- Insert this section before the Contact `<section>`:

```tsx
          <section id="voice-answers">
            <h2 className="text-xl font-bold text-charcoal mb-3">8. Voice Answers in N400Ready</h2>
            <p>N400Ready lets you answer civics questions by voice. Your speech is turned into text by your browser&apos;s built-in speech service (for example, Apple in Safari or Google in Chrome), which may process the audio on its own servers under its own privacy policy. N400Ready never records or stores audio. For mock tests we store the text of each answer so we can grade the test and show you your results; for practice we store only whether your answer was correct.</p>
            <p>On iPhone, while you use voice answers, the microphone stays on between questions, so Apple&apos;s speech service keeps processing audio during that time. The app uses only what you say after you tap the microphone and discards everything else without saving it. The microphone turns off after 5 minutes without a voice answer, or when you leave N400Ready. You can always answer by multiple choice instead.</p>
            <p lang="vi">N400Ready cho phép bạn trả lời câu hỏi công dân bằng giọng nói. Giọng nói được chuyển thành chữ bởi dịch vụ nhận dạng giọng nói có sẵn trong trình duyệt (ví dụ Apple trên Safari hoặc Google trên Chrome); dịch vụ này có thể xử lý âm thanh trên máy chủ của họ theo chính sách quyền riêng tư của họ. N400Ready không bao giờ ghi âm hay lưu âm thanh. Với bài thi thử, chúng tôi lưu phần chữ của từng câu trả lời để chấm bài và cho bạn xem kết quả; với phần luyện tập, chúng tôi chỉ lưu câu trả lời đúng hay sai.</p>
            <p lang="vi">Trên iPhone, khi bạn trả lời bằng giọng, micro bật suốt giữa các câu hỏi, nên dịch vụ nhận dạng của Apple vẫn xử lý âm thanh trong thời gian đó. App chỉ lấy những gì bạn nói sau khi bấm nút micro và bỏ đi mọi phần khác, không lưu lại. Micro tự tắt sau 5 phút không trả lời bằng giọng, hoặc khi bạn rời N400Ready. Bạn luôn có thể chọn trả lời trắc nghiệm.</p>
          </section>
```

(Facts behind the copy:
- Practice rows store no transcript; only mock rows do (`n400_question_attempts.transcript`, Gate 3 DB check).
- `IDLE_SHUTDOWN_MS = 5 * 60_000` is armed after each answer window closes.
- `VoiceMicProvider` calls `shutdown()` when the `(app)` layout unmounts.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "src/app/[locale]/privacy-policy/privacy-voice.test.ts"`
Expected: PASS (3 tests).

- [ ] **Step 5: Spec §10**

Append to §10:

```markdown
- **Rev 3.15:** shipped as section 8, "Voice Answers in N400Ready", on `/[locale]/privacy-policy#voice-answers`, with EN and VI text on both locales (the rest of the page is English-only).
```

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/privacy-policy/page.tsx" "src/app/[locale]/privacy-policy/privacy-voice.test.ts" ../../docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md
git commit -m "docs(website): Privacy Policy voice answers section (N400Ready, EN+VI)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Record the rollout (spec §12/§13, ROADMAP)

**Files:**
- Modify: spec §12 (Slice 4 line) and §13
- Modify: `docs/ROADMAP.md`

**Interfaces:** none.

- [ ] **Step 1: Confirm the flags (read-only)**

Run through the Supabase MCP `execute_sql`:

```sql
SELECT flag_key, enabled, rollout_pct FROM public.n400_feature_flags WHERE flag_key LIKE 'voice_%' ORDER BY flag_key;
```

Expected: `voice_android` false/100, `voice_mock` true/100, `voice_practice` true/100. If anything else shows up, stop and ask the owner. Do not write.

- [ ] **Step 2: Spec §12 and §13**

Replace `**Slice 4 — Rollout:** analytics event, Privacy Policy, flag rollout per §7.` with:

```markdown
**Slice 4 — Rollout:** analytics event, Privacy Policy, flag rollout per §7. **Done (rev 3.15):**
- Gate 3 passed 2026-09-25 (docs/superpowers/spikes/2026-09-24-n400-oral-mock-gate3.md).
- `not` never near-matches.
- `n400_oral_answer` + `answer_mode` on `n400_mock_test_start`.
- Privacy Policy section 8.
- Flags: `voice_practice` and `voice_mock` ON 100%. This is §7's small-traffic rule: weekly voice-eligible users are few, so 100% with the kill switch. `voice_android` stays OFF until an Android device pass.
```

Append to §13:

````markdown
Weekly hand-label sample (§9), run through the Supabase SQL editor:

```sql
SELECT q.question_id, q.was_correct, q.transcript
FROM public.n400_question_attempts q
JOIN public.n400_quiz_attempts a ON a.id = q.attempt_id
WHERE a.mode = 'mock_test' AND a.answer_mode = 'voice' AND a.completed_at > now() - interval '7 days'
ORDER BY random()
LIMIT 20;
```
````

- [ ] **Step 3: ROADMAP**

In `docs/ROADMAP.md`, set `- **Last updated:**` to the day of the commit (e.g. `2026-09-25`). Directly after the line starting `- [x] N400 Tiến độ redesign`, add:

```markdown
- [x] N400 Civics oral answers — answer civics questions by voice (Web Speech API, keyword grading against the taught answer). Practice [Trắc nghiệm | Tự nói] plus a voice mock that counts; iPhone uses one persistent session with 🔊 through Web Audio; typed fallback for in-app browsers; `n400_oral_answer` GA4 event; Privacy Policy voice section. Flags `voice_practice` + `voice_mock` ON 100%, `voice_android` OFF (specs/2026-09-24-n400-civics-oral-answers-design.md, rev 3.15)
```

- [ ] **Step 4: Commit**

```bash
git add ../../docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md ../../docs/ROADMAP.md
git commit -m "docs(n400app): Slice 4 rollout recorded — spec rev 3.15 + roadmap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
