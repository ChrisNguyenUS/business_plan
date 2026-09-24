# N400 Civics Oral Answers — Slice 2 (Practice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Learners can answer Civics practice questions by speaking (iPhone Safari, desktop Chrome, Android behind its own flag) or, in in-app browsers, by typing/keyboard dictation. Answers are graded by the Slice 1 engine and recorded with an `answer_mode`.

**Architecture:** All Web Speech logic lives in a framework-free `SpeechController` (node-testable with a fake recognizer and a manual clock). A thin React hook wraps it with `useSyncExternalStore`. Pure helpers decide where voice applies (`voice-support.ts`) and what a verdict does (`voice-outcome.ts`). The practice page gains a mode toggle and renders `MicAnswerPanel` in place of the option grid, and it reuses the existing feedback block. Two feature flags (`voice_practice`, `voice_android`) gate it. One additive migration adds `n400_quiz_attempts.answer_mode`.

**Tech Stack:** Next.js 16 / React 19 client components, TypeScript, vitest 2 (node environment, no DOM), Supabase JS, lucide-react, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md` (rev 3.3). Read D4–D14, §4, §5, §7, §8, §11, §12 before starting. Spike evidence: `docs/superpowers/spikes/2026-09-24-n400-voice-spike-results.md`.

## Global Constraints

- All app code lives in `apps/website/`; run every command from `apps/website/`.
- Test runner is vitest (`npx vitest run <file>`); it runs in **node**, with no jsdom and no testing-library. Full gate: `npm run type-check && npm run test && npm run build`. `src/components/n400/mobile-layout.test.ts` already fails on `main` (a known stale source-reading test). Treat that one failure as pre-existing; any other failure is yours.
- `lang = 'en-US'`, `continuous = false`, `interimResults = true`, hard stop **15 s** (spec §4.1).
- Stall detector **7 s** after `audiostart` with no `speechstart`/result; 2nd consecutive stall → `stalled` (spec §4.1 rev 3.3).
- Runtime-unavailable: `service-not-allowed` always; `not-allowed` < **500 ms** after `start()` with no `audiostart` (spec §4.1).
- `onend` never grades (D9). Near + "Đúng vậy" is shown correct but **not recorded** (D7).
- In-app browsers never get the mic; they get the typed variant, recorded as `answer_mode='typed'` (D12).
- `Permissions-Policy` becomes `microphone=(self)`; camera/geolocation stay `()`. **Owner confirms before the commit** (D13).
- Android mic additionally requires flag `voice_android` (D14). Flags seed `enabled = FALSE`.
- No autoplay of question audio in voice mode (spec §5).
- Storage access (`localStorage`/`sessionStorage`) is always wrapped in try/catch.
- Voice UI renders inside the existing Civics practice card; reuse its button/card styles (memory rule: Speaking/Writing/Civics screens reuse Civics UI).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Applying the migration to the shared Supabase project is an outward action: **ask the owner first**, then apply with MCP `apply_migration`.

## Review Focus

1. iOS mic goes silently dead after the learner returns from another app: `audiostart` fires, `speechstart` never does. The learner must get an error within ~7 s, and on the 2nd time a "reload" path, never a spinner that listens forever (Task 4 tests `a stall reports no-speech, then stalled on the second in a row`).
2. The recognizer never fires `onend` after `stop()`/`abort()` (in-app WebViews). The UI must still leave `listening`/`processing` (Task 4 tests `finishes even if onend never comes after the hard stop` and `abort finishes immediately and ignores late events`).
3. The learner taps the mic again while it is listening (seen repeatedly in the spike logs). This must never start a second recognition (Task 4 test `a second start while running is ignored`).
4. Voice mode on a question the engine cannot grade (location-based answer for DC/territories, where `getOralAnswerConfig` is null). That question must fall back to multiple choice instead of a dead panel (Task 5 test `falls back to choice when the question has no oral config`).
5. MC answers recorded before migration `n400_32` is applied. MC practice must keep working, so `choice` rows must not send `answer_mode` (Task 2 test `choice rows omit answer_mode`).

---

### Task 1: Allow the microphone for our own origin (D13)

**Files:**
- Modify: `apps/website/next.config.ts:24`
- Test: `apps/website/src/lib/n400/oral/permissions-policy.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the site sends `Permissions-Policy: camera=(), microphone=(self), geolocation=(), interest-cohort=()`.

- [ ] **Step 1: Write the failing test**

Create `apps/website/src/lib/n400/oral/permissions-policy.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Spec D13: `microphone=()` made every Chromium browser reject speech
// recognition instantly (Gate 0 spike). Same-origin only; camera stays off.
const config = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');

describe('Permissions-Policy header', () => {
  it('allows the microphone for our own origin only', () => {
    expect(config).toContain('microphone=(self)');
    expect(config).not.toContain('microphone=()');
  });

  it('keeps camera and geolocation blocked', () => {
    expect(config).toContain('camera=()');
    expect(config).toContain('geolocation=()');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/oral/permissions-policy.test.ts`
Expected: FAIL. `allows the microphone for our own origin only` fails with `expected … to contain 'microphone=(self)'`.

- [ ] **Step 3: Change the header**

In `apps/website/next.config.ts`, line 24 becomes:

```ts
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()" },
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/n400/oral/permissions-policy.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Ask the owner, then commit**

This loosens a security header (D13). Show the owner the one-line diff and get a yes before committing:

```bash
git add next.config.ts src/lib/n400/oral/permissions-policy.test.ts
git commit -m "$(cat <<'EOF'
feat(n400app): allow same-origin microphone for oral answers (spec D13)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Record `answer_mode` on practice attempts

**Files:**
- Create: `apps/website/src/lib/n400/attempt-row.ts`
- Test: `apps/website/src/lib/n400/attempt-row.test.ts`
- Modify: `apps/website/src/lib/n400/user-state.tsx:343-381` (`recordAnswer`)

**Interfaces:**
- Consumes: `QuizMode` from `./storage`.
- Produces:
  - `type AnswerMode = 'choice' | 'voice' | 'typed'`.
  - `practiceAttemptRow(userId: string, mode: QuizMode, wasCorrect: boolean, answerMode: AnswerMode, completedAt: string): PracticeAttemptRow`.
  - `recordAnswer(questionId, wasCorrect, mode, answerMode: AnswerMode = 'choice')` on the user-state context.

- [ ] **Step 1: Write the failing test**

Create `apps/website/src/lib/n400/attempt-row.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { practiceAttemptRow } from './attempt-row';

const AT = '2026-09-24T12:00:00.000Z';

describe('practiceAttemptRow', () => {
  it('choice rows omit answer_mode (MC keeps working before migration n400_32)', () => {
    expect(practiceAttemptRow('u1', 'practice', true, 'choice', AT)).toEqual({
      user_id: 'u1',
      mode: 'practice',
      score: 1,
      total_questions: 1,
      passed: null,
      completed_at: AT,
    });
  });

  it('voice and typed rows carry answer_mode', () => {
    expect(practiceAttemptRow('u1', 'practice', false, 'voice', AT)).toMatchObject({ score: 0, answer_mode: 'voice' });
    expect(practiceAttemptRow('u1', 'practice', true, 'typed', AT)).toMatchObject({ score: 1, answer_mode: 'typed' });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/attempt-row.test.ts`
Expected: FAIL: `Failed to load url ./attempt-row`.

- [ ] **Step 3: Implement the row builder**

Create `apps/website/src/lib/n400/attempt-row.ts`:

```ts
// One-row quiz-attempt envelope for practice/flashcard answers (see
// recordAnswer in user-state.tsx). Spec §5 / §7 (oral answers rev 3.3).

import type { QuizMode } from './storage';

export type AnswerMode = 'choice' | 'voice' | 'typed';

export interface PracticeAttemptRow {
  user_id: string;
  mode: QuizMode;
  score: number;
  total_questions: 1;
  passed: null;
  completed_at: string;
  answer_mode?: AnswerMode;
}

/** `choice` omits answer_mode: the column defaults to 'choice', and MC practice
 *  must keep working even if migration n400_32 is not applied yet. */
export function practiceAttemptRow(
  userId: string,
  mode: QuizMode,
  wasCorrect: boolean,
  answerMode: AnswerMode,
  completedAt: string,
): PracticeAttemptRow {
  const row: PracticeAttemptRow = {
    user_id: userId,
    mode,
    score: wasCorrect ? 1 : 0,
    total_questions: 1,
    passed: null,
    completed_at: completedAt,
  };
  return answerMode === 'choice' ? row : { ...row, answer_mode: answerMode };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/n400/attempt-row.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Use it in `recordAnswer`**

In `apps/website/src/lib/n400/user-state.tsx`, add the import next to the other `./` imports:

```ts
import { practiceAttemptRow, type AnswerMode } from './attempt-row';
```

Change the `recordAnswer` signature (currently `questionId, wasCorrect, mode`) to:

```ts
    async (
      questionId: number,
      wasCorrect: boolean,
      mode: QuizMode,
      answerMode: AnswerMode = 'choice',
    ): Promise<{ milestone: number | null; unlockedBadges: string[] }> => {
```

Replace the insert payload object:

```ts
        .insert({
          user_id: user.id,
          mode,
          score: wasCorrect ? 1 : 0,
          total_questions: 1,
          passed: null,
          completed_at: new Date().toISOString(),
        })
```

with:

```ts
        .insert(practiceAttemptRow(user.id, mode, wasCorrect, answerMode, new Date().toISOString()))
```

Existing callers (`recordAnswer(id, ok, 'practice')`, the flashcard wrapper) keep compiling through the default.

- [ ] **Step 6: Type-check and run the tests**

Run: `npm run type-check && npx vitest run src/lib/n400/attempt-row.test.ts`
Expected: type-check exits 0; 2 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/n400/attempt-row.ts src/lib/n400/attempt-row.test.ts src/lib/n400/user-state.tsx
git commit -m "$(cat <<'EOF'
feat(n400app): record answer_mode on practice attempts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Migration `n400_32_voice_answers.sql`

**Files:**
- Create: `apps/website/supabase/migrations/n400_32_voice_answers.sql`

**Interfaces:**
- Consumes: tables `n400_quiz_attempts`, `n400_feature_flags` (n400_01, n400_16).
- Produces: column `answer_mode`; flag rows `voice_practice`, `voice_android` (both `enabled = FALSE`).

- [ ] **Step 1: Write the migration**

Create `apps/website/supabase/migrations/n400_32_voice_answers.sql`:

```sql
-- N400 Civics oral answers — Slice 2 (practice).
-- Spec: docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md §7 (rev 3.3).
-- Slice 3 adds n400_question_attempts.transcript + the voice mock RPC in n400_33.

ALTER TABLE public.n400_quiz_attempts
  ADD COLUMN IF NOT EXISTS answer_mode TEXT NOT NULL DEFAULT 'choice';

DO $$
BEGIN
  ALTER TABLE public.n400_quiz_attempts
    ADD CONSTRAINT n400_quiz_attempts_answer_mode_check
    CHECK (answer_mode IN ('choice', 'voice', 'typed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.n400_feature_flags (flag_key, enabled, rollout_pct, note) VALUES
  ('voice_practice', FALSE, 100, 'Civics oral answers in practice (mic + in-app typed fallback). Kill switch.'),
  ('voice_android',  FALSE, 100, 'Mic on Android (not device-tested at Gate 0). Needs voice_practice too.')
ON CONFLICT (flag_key) DO NOTHING;
```

- [ ] **Step 2: Commit the file**

```bash
git add supabase/migrations/n400_32_voice_answers.sql
git commit -m "$(cat <<'EOF'
feat(n400app): migration n400_32 — answer_mode + voice flags

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Apply it — ask the owner first**

Ask the owner to confirm applying it to the shared Supabase project. Then apply with MCP `apply_migration` (name `n400_32_voice_answers`, the file body as `query`) and verify with MCP `execute_sql`:

```sql
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'n400_quiz_attempts' AND column_name = 'answer_mode';
SELECT flag_key, enabled, rollout_pct FROM public.n400_feature_flags
WHERE flag_key IN ('voice_practice', 'voice_android') ORDER BY flag_key;
```

Expected: one column row (`'choice'::text`, `NO`), and two flag rows, both `enabled = false`.

---

### Task 4: `SpeechController` — framework-free Web Speech logic

**Files:**
- Create: `apps/website/src/lib/n400/oral/speech-controller.ts`
- Test: `apps/website/src/lib/n400/oral/speech-controller.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type MicState = 'idle' | 'requesting_permission' | 'listening' | 'processing' | 'transcript' | 'error'`.
  - `type MicError = 'no-speech' | 'not-allowed' | 'network' | 'audio-capture' | 'unavailable' | 'stalled'`.
  - `interface MicSnapshot { supported: boolean; state: MicState; transcript: string; error: MicError | null; startedAt: number | null }`.
  - `interface RecognitionLike` (the subset of `SpeechRecognition` used).
  - `interface SpeechControllerDeps { create; now; setTimer; clearTimer; report?; markUnavailable?; unavailable? }`.
  - `class SpeechController { getSnapshot(): MicSnapshot; subscribe(fn): () => void; start(): void; stop(): void; abort(): void; reset(): void }`.
  - Constants `HARD_STOP_MS = 15_000`, `STALL_MS = 7_000`, `INSTANT_DENY_MS = 500`, `END_GRACE_MS = 2_000`.

- [ ] **Step 1: Write the failing tests**

Create `apps/website/src/lib/n400/oral/speech-controller.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  END_GRACE_MS,
  HARD_STOP_MS,
  STALL_MS,
  SpeechController,
  type RecognitionLike,
  type SpeechControllerDeps,
} from './speech-controller';

class FakeRec implements RecognitionLike {
  lang = '';
  continuous = true;
  interimResults = false;
  maxAlternatives = 0;
  onstart: RecognitionLike['onstart'] = null;
  onaudiostart: RecognitionLike['onaudiostart'] = null;
  onspeechstart: RecognitionLike['onspeechstart'] = null;
  onspeechend: RecognitionLike['onspeechend'] = null;
  onresult: RecognitionLike['onresult'] = null;
  onerror: RecognitionLike['onerror'] = null;
  onend: RecognitionLike['onend'] = null;
  started = 0;
  stopped = 0;
  aborted = 0;
  throwOnStart = false;
  start() {
    if (this.throwOnStart) throw new Error('InvalidStateError');
    this.started++;
  }
  stop() {
    this.stopped++;
  }
  abort() {
    this.aborted++;
  }
  result(...segments: string[]) {
    this.onresult?.({ results: segments.map((t) => [{ transcript: t }]) });
  }
  error(code: string) {
    this.onerror?.({ error: code });
  }
}

function harness(extra: Partial<SpeechControllerDeps> = {}, rec?: () => FakeRec) {
  let t = 1_000;
  let seq = 0;
  let timers: { id: number; at: number; fn: () => void }[] = [];
  const recs: FakeRec[] = [];
  const reports: string[] = [];
  let marked = 0;
  const c = new SpeechController({
    create: () => {
      const r = rec ? rec() : new FakeRec();
      recs.push(r);
      return r;
    },
    now: () => t,
    setTimer: (fn, ms) => {
      const id = ++seq;
      timers.push({ id, at: t + ms, fn });
      return id;
    },
    clearTimer: (id) => {
      timers = timers.filter((x) => x.id !== id);
    },
    report: (code) => {
      reports.push(code);
    },
    markUnavailable: () => {
      marked++;
    },
    ...extra,
  });
  const advance = (ms: number) => {
    const until = t + ms;
    for (;;) {
      const due = timers.filter((x) => x.at <= until).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      timers = timers.filter((x) => x !== due);
      t = due.at;
      due.fn();
    }
    t = until;
  };
  return { c, recs, rec: () => recs[recs.length - 1], advance, reports, marked: () => marked, s: () => c.getSnapshot() };
}

/** start → onstart → audiostart → speechstart: a normal, live session. */
function live(h: ReturnType<typeof harness>) {
  h.c.start();
  h.rec().onstart?.();
  h.rec().onaudiostart?.();
  h.rec().onspeechstart?.();
}

describe('SpeechController — support', () => {
  it('is unsupported without the API and start() does nothing', () => {
    const h = harness({ create: null });
    expect(h.s().supported).toBe(false);
    h.c.start();
    expect(h.s().state).toBe('idle');
  });

  it('is unsupported when marked unavailable earlier this session', () => {
    expect(harness({ unavailable: true }).s().supported).toBe(false);
  });
});

describe('SpeechController — happy path', () => {
  it('configures the recognizer per spec §4.1', () => {
    const h = harness();
    h.c.start();
    expect(h.rec()).toMatchObject({ lang: 'en-US', continuous: false, interimResults: true, maxAlternatives: 1, started: 1 });
    expect(h.s()).toMatchObject({ state: 'requesting_permission', startedAt: 1_000 });
  });

  it('listening → interim transcript → processing → transcript on end', () => {
    const h = harness();
    live(h);
    expect(h.s().state).toBe('listening');
    h.rec().result('The con');
    expect(h.s()).toMatchObject({ state: 'listening', transcript: 'The con' });
    h.rec().result('The constitution');
    h.rec().onspeechend?.();
    expect(h.s().state).toBe('processing');
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: 'The constitution', error: null, startedAt: null });
  });

  it('joins Chrome-style segments, including a final that arrives after speechend', () => {
    const h = harness();
    live(h);
    h.rec().onspeechend?.();
    h.rec().result('Congress president', ' and the courts');
    h.rec().onend?.();
    expect(h.s().transcript).toBe('Congress president and the courts');
  });

  it('onend without text is no-speech, never a grade (D9)', () => {
    const h = harness();
    live(h);
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ state: 'error', error: 'no-speech', transcript: '' });
  });

  it('a second start while running is ignored', () => {
    const h = harness();
    live(h);
    h.c.start();
    expect(h.recs).toHaveLength(1);
  });

  it('stop() asks the recognizer to stop', () => {
    const h = harness();
    live(h);
    h.c.stop();
    expect(h.rec().stopped).toBe(1);
  });

  it('reset() returns to idle and clears the transcript', () => {
    const h = harness();
    live(h);
    h.rec().result('27');
    h.rec().onend?.();
    h.c.reset();
    expect(h.s()).toMatchObject({ state: 'idle', transcript: '', error: null });
  });
});

describe('SpeechController — errors', () => {
  it.each([
    ['network', 'network'],
    ['audio-capture', 'audio-capture'],
    ['language-not-supported', 'unavailable'],
  ])('%s → %s, reported, still supported', (code, expected) => {
    const h = harness();
    live(h);
    h.rec().error(code);
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ state: 'error', error: expected, supported: true });
    expect(h.reports).toContain(code);
  });

  it('recognizer no-speech is not reported to Sentry', () => {
    const h = harness();
    live(h);
    h.rec().error('no-speech');
    h.rec().onend?.();
    expect(h.s().error).toBe('no-speech');
    expect(h.reports).toEqual([]);
  });

  it('instant not-allowed with no audio means unavailable for the session', () => {
    const h = harness();
    h.c.start();
    h.advance(20);
    h.rec().error('not-allowed');
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ state: 'error', error: 'unavailable', supported: false });
    expect(h.marked()).toBe(1);
    h.c.start();
    expect(h.recs).toHaveLength(1);
  });

  it('service-not-allowed is unavailable whenever it comes', () => {
    const h = harness();
    live(h);
    h.advance(3_000);
    h.rec().error('service-not-allowed');
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ error: 'unavailable', supported: false });
  });

  it('not-allowed after a real prompt stays not-allowed', () => {
    const h = harness();
    h.c.start();
    h.advance(3_000);
    h.rec().error('not-allowed');
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ error: 'not-allowed', supported: true });
    expect(h.marked()).toBe(0);
  });

  it('start() throwing becomes unavailable without disabling voice', () => {
    const h = harness({}, () => Object.assign(new FakeRec(), { throwOnStart: true }));
    h.c.start();
    expect(h.s()).toMatchObject({ state: 'error', error: 'unavailable', supported: true });
    expect(h.reports).toContain('start-threw');
  });
});

describe('SpeechController — stall detector (Gate 0: iOS mic-dead)', () => {
  it('a stall reports no-speech, then stalled on the second in a row', () => {
    const h = harness();
    h.c.start();
    h.rec().onstart?.();
    h.rec().onaudiostart?.();
    h.advance(STALL_MS);
    expect(h.s()).toMatchObject({ state: 'error', error: 'no-speech' });
    expect(h.recs[0].aborted).toBe(1);

    h.c.start();
    h.rec().onstart?.();
    h.rec().onaudiostart?.();
    h.advance(STALL_MS);
    expect(h.s()).toMatchObject({ state: 'error', error: 'stalled' });
  });

  it('hearing speech resets the stall count', () => {
    const h = harness();
    h.c.start();
    h.rec().onaudiostart?.();
    h.advance(STALL_MS);
    live(h);
    h.rec().result('27');
    h.rec().onend?.();
    h.c.start();
    h.rec().onaudiostart?.();
    h.advance(STALL_MS);
    expect(h.s().error).toBe('no-speech');
  });

  it('does not fire once speech has started', () => {
    const h = harness();
    live(h);
    h.advance(STALL_MS + 1_000);
    expect(h.s().state).toBe('listening');
  });
});

describe('SpeechController — hard stop and abort', () => {
  it('stops at 15 s and keeps what was heard', () => {
    const h = harness();
    live(h);
    h.rec().result('checks and balances');
    h.advance(HARD_STOP_MS);
    expect(h.rec().stopped).toBe(1);
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: 'checks and balances' });
  });

  it('finishes even if onend never comes after the hard stop', () => {
    const h = harness();
    live(h);
    h.rec().result('the constitution');
    h.advance(HARD_STOP_MS + END_GRACE_MS);
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: 'the constitution' });
  });

  it('abort finishes immediately and ignores late events', () => {
    const h = harness();
    live(h);
    h.rec().result('27');
    const r = h.rec();
    h.c.abort();
    expect(h.s()).toMatchObject({ state: 'idle', transcript: '' });
    expect(r.aborted).toBe(1);
    expect(r.onend).toBeNull();
    expect(r.onresult).toBeNull();
  });

  it('notifies subscribers on every change', () => {
    const h = harness();
    let calls = 0;
    const off = h.c.subscribe(() => {
      calls++;
    });
    h.c.start();
    h.rec().onstart?.();
    off();
    h.rec().onaudiostart?.();
    h.rec().onspeechend?.();
    expect(calls).toBe(2);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/n400/oral/speech-controller.test.ts`
Expected: FAIL: `Failed to load url ./speech-controller`.

- [ ] **Step 3: Implement the controller**

Create `apps/website/src/lib/n400/oral/speech-controller.ts`:

```ts
// Framework-free Web Speech controller. The React hook (use-speech-recognition.ts)
// is a thin wrapper, so this logic is testable in node. Spec §4.1 (rev 3.3).

export type MicState = 'idle' | 'requesting_permission' | 'listening' | 'processing' | 'transcript' | 'error';
export type MicError = 'no-speech' | 'not-allowed' | 'network' | 'audio-capture' | 'unavailable' | 'stalled';

export interface MicSnapshot {
  supported: boolean;
  state: MicState;
  transcript: string;
  error: MicError | null;
  /** Timestamp of the current start(); drives the 15 s ring. */
  startedAt: number | null;
}

/** The subset of SpeechRecognition this app uses. */
export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface SpeechControllerDeps {
  /** null when the browser has no SpeechRecognition API. */
  create: (() => RecognitionLike) | null;
  now: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (id: unknown) => void;
  /** Technical details for Sentry; never shown to the learner. */
  report?: (code: string, message?: string) => void;
  /** Persists "unavailable for this session" (sessionStorage in the hook). */
  markUnavailable?: () => void;
  /** Already marked unavailable earlier this session. */
  unavailable?: boolean;
}

export const HARD_STOP_MS = 15_000;
export const STALL_MS = 7_000;
export const INSTANT_DENY_MS = 500;
export const END_GRACE_MS = 2_000;

const ERROR_MAP: Readonly<Record<string, MicError>> = {
  'no-speech': 'no-speech',
  network: 'network',
  'audio-capture': 'audio-capture',
};

function joinResults(results: ArrayLike<ArrayLike<{ transcript: string }>>): string {
  let out = '';
  for (let i = 0; i < results.length; i++) out += results[i]?.[0]?.transcript ?? '';
  return out.replace(/\s+/g, ' ').trim();
}

export class SpeechController {
  private snap: MicSnapshot;
  private readonly listeners = new Set<() => void>();
  private rec: RecognitionLike | null = null;
  private startedAt = 0;
  private heardAudio = false;
  private heardSpeech = false;
  private text = '';
  private pendingError: MicError | null = null;
  private disabled = false;
  private stalledInRow = 0;
  private timers: unknown[] = [];
  private stallTimer: unknown = null;

  constructor(private readonly deps: SpeechControllerDeps) {
    this.disabled = !!deps.unavailable;
    this.snap = {
      supported: deps.create !== null && !this.disabled,
      state: 'idle',
      transcript: '',
      error: null,
      startedAt: null,
    };
  }

  getSnapshot = (): MicSnapshot => this.snap;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  start(): void {
    const create = this.deps.create;
    if (!create || !this.snap.supported || this.rec) return;
    let rec: RecognitionLike;
    try {
      rec = create();
    } catch (e) {
      this.deps.report?.('create-threw', String(e));
      this.finish('error', 'unavailable');
      return;
    }
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    this.rec = rec;
    this.startedAt = this.deps.now();
    this.heardAudio = false;
    this.heardSpeech = false;
    this.text = '';
    this.pendingError = null;

    rec.onstart = () => this.set({ state: 'listening' });
    rec.onaudiostart = () => {
      this.heardAudio = true;
      if (!this.heardSpeech) this.stallTimer = this.timer(() => this.onStall(), STALL_MS);
    };
    rec.onspeechstart = () => this.heard();
    rec.onspeechend = () => this.set({ state: 'processing' });
    rec.onresult = (e) => {
      this.heard();
      this.text = joinResults(e.results);
      this.set({ transcript: this.text });
    };
    rec.onerror = (e) => this.onError(e.error, e.message);
    rec.onend = () => this.end();

    this.timer(() => this.stop(), HARD_STOP_MS);
    this.set({ state: 'requesting_permission', transcript: '', error: null, startedAt: this.startedAt });
    try {
      rec.start();
    } catch (e) {
      this.deps.report?.('start-threw', String(e));
      this.teardown();
      this.finish('error', 'unavailable');
    }
  }

  /** Learner pressed Stop, or the 15 s hard stop. Waits briefly for onend. */
  stop(): void {
    const rec = this.rec;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      // Already stopping — the grace timer below still finishes the session.
    }
    this.timer(() => this.end(), END_GRACE_MS);
  }

  /** Tab hidden / unmount: drop everything, stay on the item (spec §8). */
  abort(): void {
    if (!this.rec) return;
    this.abortRec();
    this.finish('idle', null);
  }

  reset(): void {
    if (this.rec) this.abortRec();
    this.finish('idle', null);
  }

  private heard(): void {
    this.heardSpeech = true;
    this.stalledInRow = 0;
    if (this.stallTimer !== null) {
      this.deps.clearTimer(this.stallTimer);
      this.stallTimer = null;
    }
  }

  private onStall(): void {
    this.stallTimer = null;
    if (!this.rec || this.heardSpeech || this.text) return;
    this.stalledInRow += 1;
    this.deps.report?.('stall', `in_row=${this.stalledInRow}`);
    this.abortRec();
    this.finish('error', this.stalledInRow >= 2 ? 'stalled' : 'no-speech');
  }

  private onError(code: string, message?: string): void {
    if (code === 'aborted') return; // our own abort()
    let err: MicError;
    const instantDeny =
      code === 'not-allowed' && !this.heardAudio && this.deps.now() - this.startedAt < INSTANT_DENY_MS;
    if (code === 'service-not-allowed' || instantDeny) {
      err = 'unavailable';
      this.disabled = true;
      this.deps.markUnavailable?.();
    } else if (code === 'not-allowed') {
      err = 'not-allowed';
    } else {
      err = ERROR_MAP[code] ?? 'unavailable';
    }
    if (err !== 'no-speech') this.deps.report?.(code, message);
    if (this.pendingError === null) this.pendingError = err;
  }

  private end(): void {
    if (!this.rec) return;
    const err = this.pendingError;
    const text = this.text.trim();
    this.teardown();
    if (err) this.finish('error', err);
    else if (text) this.finish('transcript', null, text);
    else this.finish('error', 'no-speech');
  }

  private timer(fn: () => void, ms: number): unknown {
    const id = this.deps.setTimer(fn, ms);
    this.timers.push(id);
    return id;
  }

  /** Detach handlers and timers first so a late event can never re-enter. */
  private teardown(): void {
    for (const id of this.timers) this.deps.clearTimer(id);
    this.timers = [];
    this.stallTimer = null;
    const rec = this.rec;
    if (rec) {
      rec.onstart = rec.onaudiostart = rec.onspeechstart = rec.onspeechend = rec.onend = null;
      rec.onresult = null;
      rec.onerror = null;
    }
    this.rec = null;
  }

  private abortRec(): void {
    const rec = this.rec;
    this.teardown();
    try {
      rec?.abort();
    } catch {
      // Nothing to abort.
    }
  }

  private finish(state: MicState, error: MicError | null, transcript = ''): void {
    this.set({ state, error, transcript, startedAt: null, supported: this.snap.supported && !this.disabled });
  }

  private set(patch: Partial<MicSnapshot>): void {
    this.snap = { ...this.snap, ...patch };
    for (const fn of this.listeners) fn();
  }
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/lib/n400/oral/speech-controller.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/speech-controller.ts src/lib/n400/oral/speech-controller.test.ts
git commit -m "$(cat <<'EOF'
feat(n400app): framework-free Web Speech controller with stall detector

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Where voice applies — `voice-support.ts`

**Files:**
- Create: `apps/website/src/lib/n400/oral/voice-support.ts`
- Test: `apps/website/src/lib/n400/oral/voice-support.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type VoiceInput = 'mic' | 'typed' | 'none'`.
  - `isInAppBrowser(ua: string): boolean`, `isAndroid(ua: string): boolean`.
  - `voiceInputFor(o: { ua: string; apiPresent: boolean; practiceOn: boolean; androidOn: boolean }): VoiceInput`.
  - `effectiveAnswerMode(chosen: 'choice' | 'voice', input: VoiceInput, hasConfig: boolean): 'choice' | 'voice'`.

- [ ] **Step 1: Write the failing tests**

Create `apps/website/src/lib/n400/oral/voice-support.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { effectiveAnswerMode, isInAppBrowser, voiceInputFor } from './voice-support';

// Real user agents from the Gate 0 spike, plus common in-app browsers.
const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
  fbIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/24A437 [FBAN/FBIOS;FBAV/579.0.0.23.106;FBBV/1068430635;FBDV/iPhone18,2;FBMD/iPhone;FBSN/iOS;FBSV/27.0;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/80]',
  fbAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918U Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/153.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
  zalo:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo iOS/1.0',
  instagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36',
};

const on = { apiPresent: true, practiceOn: true, androidOn: false };

describe('isInAppBrowser', () => {
  it.each([UA.fbIos, UA.fbAndroid, UA.zalo, UA.instagram])('in-app: %s', (ua) => {
    expect(isInAppBrowser(ua)).toBe(true);
  });

  it.each([UA.iphoneSafari, UA.macChrome, UA.androidChrome])('browser: %s', (ua) => {
    expect(isInAppBrowser(ua)).toBe(false);
  });
});

describe('voiceInputFor', () => {
  it('mic on iPhone Safari and desktop Chrome', () => {
    expect(voiceInputFor({ ua: UA.iphoneSafari, ...on })).toBe('mic');
    expect(voiceInputFor({ ua: UA.macChrome, ...on })).toBe('mic');
  });

  it('in-app browsers get the typed fallback, even without the API (D12)', () => {
    expect(voiceInputFor({ ua: UA.fbIos, ...on })).toBe('typed');
    expect(voiceInputFor({ ua: UA.fbAndroid, ...on, apiPresent: false })).toBe('typed');
  });

  it('Android needs voice_android (D14)', () => {
    expect(voiceInputFor({ ua: UA.androidChrome, ...on })).toBe('none');
    expect(voiceInputFor({ ua: UA.androidChrome, ...on, androidOn: true })).toBe('mic');
  });

  it('nothing without the practice flag or, outside in-app, without the API', () => {
    expect(voiceInputFor({ ua: UA.fbIos, ...on, practiceOn: false })).toBe('none');
    expect(voiceInputFor({ ua: UA.macChrome, ...on, apiPresent: false })).toBe('none');
  });
});

describe('effectiveAnswerMode', () => {
  it('voice only when chosen, available and gradable', () => {
    expect(effectiveAnswerMode('voice', 'mic', true)).toBe('voice');
    expect(effectiveAnswerMode('voice', 'typed', true)).toBe('voice');
    expect(effectiveAnswerMode('choice', 'mic', true)).toBe('choice');
    expect(effectiveAnswerMode('voice', 'none', true)).toBe('choice');
  });

  it('falls back to choice when the question has no oral config', () => {
    expect(effectiveAnswerMode('voice', 'mic', false)).toBe('choice');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/n400/oral/voice-support.test.ts`
Expected: FAIL: `Failed to load url ./voice-support`.

- [ ] **Step 3: Implement**

Create `apps/website/src/lib/n400/oral/voice-support.ts`:

```ts
// Decides how a learner can answer by voice on this device. Spec D6, D12, D14 (rev 3.3).

export type VoiceInput = 'mic' | 'typed' | 'none';

// In-app WebViews: the FB iOS WebView allows only the first recognition per
// session (Gate 0), and other in-app browsers are untested, so all of them
// get the typed fallback.
const IN_APP_RE = /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Zalo|Line\/|MicroMessenger|TikTok|musical_ly|BytedanceWebview/i;

export function isInAppBrowser(ua: string): boolean {
  return IN_APP_RE.test(ua);
}

export function isAndroid(ua: string): boolean {
  return /Android/i.test(ua);
}

export function voiceInputFor(o: {
  ua: string;
  apiPresent: boolean;
  practiceOn: boolean;
  androidOn: boolean;
}): VoiceInput {
  if (!o.practiceOn) return 'none';
  if (isInAppBrowser(o.ua)) return 'typed';
  if (!o.apiPresent) return 'none';
  if (isAndroid(o.ua) && !o.androidOn) return 'none';
  return 'mic';
}

/** Per question: voice only when chosen, available here, and gradable (a
 *  location-based question without a resolvable answer stays multiple choice). */
export function effectiveAnswerMode(
  chosen: 'choice' | 'voice',
  input: VoiceInput,
  hasConfig: boolean,
): 'choice' | 'voice' {
  return chosen === 'voice' && input !== 'none' && hasConfig ? 'voice' : 'choice';
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/lib/n400/oral/voice-support.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/voice-support.ts src/lib/n400/oral/voice-support.test.ts
git commit -m "$(cat <<'EOF'
feat(n400app): voice availability rules — in-app typed fallback, Android flag

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: What a verdict does — `voice-outcome.ts`

**Files:**
- Create: `apps/website/src/lib/n400/oral/voice-outcome.ts`
- Test: `apps/website/src/lib/n400/oral/voice-outcome.test.ts`

**Interfaces:**
- Consumes: `OralVerdict` from `./types`.
- Produces: `interface VoiceOutcome { shownCorrect: boolean; record: boolean | null }` and `voiceOutcome(verdict: OralVerdict, nearAnswer: 'yes' | 'no' | null): VoiceOutcome | null`.

- [ ] **Step 1: Write the failing test**

Create `apps/website/src/lib/n400/oral/voice-outcome.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { voiceOutcome } from './voice-outcome';

describe('voiceOutcome (spec §5, D7)', () => {
  it('correct and wrong are recorded as graded', () => {
    expect(voiceOutcome('correct', null)).toEqual({ shownCorrect: true, record: true });
    expect(voiceOutcome('wrong', null)).toEqual({ shownCorrect: false, record: false });
  });

  it('near waits for the learner', () => {
    expect(voiceOutcome('near', null)).toBeNull();
  });

  it('near + "Đúng vậy" is shown correct but never recorded', () => {
    expect(voiceOutcome('near', 'yes')).toEqual({ shownCorrect: true, record: null });
  });

  it('near + "Không" is recorded wrong', () => {
    expect(voiceOutcome('near', 'no')).toEqual({ shownCorrect: false, record: false });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/oral/voice-outcome.test.ts`
Expected: FAIL: `Failed to load url ./voice-outcome`.

- [ ] **Step 3: Implement**

Create `apps/website/src/lib/n400/oral/voice-outcome.ts`:

```ts
// Maps an oral verdict (+ the learner's answer to "Có phải bạn nói …?") to what
// practice shows and records. Spec §5; D7 keeps "thuộc = graded only".

import type { OralVerdict } from './types';

export interface VoiceOutcome {
  shownCorrect: boolean;
  /** Value for recordAnswer's wasCorrect; null = do not record. */
  record: boolean | null;
}

export function voiceOutcome(verdict: OralVerdict, nearAnswer: 'yes' | 'no' | null): VoiceOutcome | null {
  if (verdict === 'correct') return { shownCorrect: true, record: true };
  if (verdict === 'wrong') return { shownCorrect: false, record: false };
  if (nearAnswer === 'yes') return { shownCorrect: true, record: null };
  if (nearAnswer === 'no') return { shownCorrect: false, record: false };
  return null;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/n400/oral/voice-outcome.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/voice-outcome.ts src/lib/n400/oral/voice-outcome.test.ts
git commit -m "$(cat <<'EOF'
feat(n400app): practice outcome for oral verdicts (near-confirm not recorded)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: React hooks — `useSpeechRecognition` + `useVoiceFlags`

**Files:**
- Create: `apps/website/src/lib/n400/oral/use-speech-recognition.ts`
- Create: `apps/website/src/lib/n400/oral/use-voice-flags.ts`

**Interfaces:**
- Consumes: `SpeechController`, `MicSnapshot`, `RecognitionLike` (Task 4); `loadFeatureFlags`, `isFeatureOn` from `@/lib/n400/growth/flags`; `supabase` from `@/lib/supabase`; `useAuth` from `@/components/providers/AuthProvider`.
- Produces:
  - `interface SpeechApi extends MicSnapshot { start(): void; stop(): void; reset(): void }`. `start`/`stop`/`reset` keep a stable identity across renders.
  - `useSpeechRecognition(): SpeechApi`.
  - `interface VoiceFlags { practiceOn: boolean; androidOn: boolean }` and `useVoiceFlags(): VoiceFlags`.

These are thin wrappers over tested logic. The repo's vitest has no DOM, so their gate is type-check here plus the manual device pass in Task 11.

- [ ] **Step 1: Write the speech hook**

Create `apps/website/src/lib/n400/oral/use-speech-recognition.ts`:

```ts
'use client';

// Thin React wrapper over SpeechController (the only file that touches the
// browser's Web Speech API). Spec §4.1.

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { SpeechController, type MicSnapshot, type RecognitionLike } from './speech-controller';

const UNAVAILABLE_KEY = 'n400.oral.unavailable';

const SERVER_SNAPSHOT: MicSnapshot = { supported: false, state: 'idle', transcript: '', error: null, startedAt: null };
const noopSubscribe = () => () => {};

export interface SpeechApi extends MicSnapshot {
  start(): void;
  stop(): void;
  reset(): void;
}

function readUnavailable(): boolean {
  try {
    return window.sessionStorage.getItem(UNAVAILABLE_KEY) === '1';
  } catch {
    return false;
  }
}

function recognitionCtor(): (new () => RecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

async function reportToSentry(code: string, message?: string): Promise<void> {
  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureMessage(`n400 oral: ${code}`, {
      level: 'warning',
      tags: { feature: 'n400-oral', code },
      extra: { message },
    });
  } catch {
    // Sentry unavailable — nothing else to do.
  }
}

function createController(): SpeechController {
  const Ctor = recognitionCtor();
  return new SpeechController({
    create: Ctor ? () => new Ctor() : null,
    now: () => Date.now(),
    setTimer: (fn, ms) => window.setTimeout(fn, ms),
    clearTimer: (id) => window.clearTimeout(id as number),
    report: (code, message) => void reportToSentry(code, message),
    markUnavailable: () => {
      try {
        window.sessionStorage.setItem(UNAVAILABLE_KEY, '1');
      } catch {
        // Private mode — the in-memory flag still disables voice for this page.
      }
    },
    unavailable: readUnavailable(),
  });
}

export function useSpeechRecognition(): SpeechApi {
  // No window during SSR; hydration uses the server snapshot, then the real one.
  const [controller] = useState<SpeechController | null>(() =>
    typeof window === 'undefined' ? null : createController(),
  );

  const snap = useSyncExternalStore(
    controller ? controller.subscribe : noopSubscribe,
    () => (controller ? controller.getSnapshot() : SERVER_SNAPSHOT),
    () => SERVER_SNAPSHOT,
  );

  useEffect(() => {
    if (!controller) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') controller.abort();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      controller.abort();
    };
  }, [controller]);

  const start = useCallback(() => controller?.start(), [controller]);
  const stop = useCallback(() => controller?.stop(), [controller]);
  const reset = useCallback(() => controller?.reset(), [controller]);

  return useMemo(() => ({ ...snap, start, stop, reset }), [snap, start, stop, reset]);
}
```

- [ ] **Step 2: Write the flags hook**

Create `apps/website/src/lib/n400/oral/use-voice-flags.ts`:

```ts
'use client';

// voice_practice (kill switch) + voice_android (D14). Both default OFF until loaded.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { isFeatureOn, loadFeatureFlags } from '@/lib/n400/growth/flags';

export interface VoiceFlags {
  practiceOn: boolean;
  androidOn: boolean;
}

const OFF: VoiceFlags = { practiceOn: false, androidOn: false };

export function useVoiceFlags(): VoiceFlags {
  const { user } = useAuth();
  const [flags, setFlags] = useState<VoiceFlags>(OFF);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void loadFeatureFlags(supabase, ['voice_practice', 'voice_android']).then((byKey) => {
      if (cancelled) return;
      setFlags({
        practiceOn: isFeatureOn(byKey.get('voice_practice'), user.id),
        androidOn: isFeatureOn(byKey.get('voice_android'), user.id),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return user ? flags : OFF;
}
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/n400/oral/use-speech-recognition.ts src/lib/n400/oral/use-voice-flags.ts
git commit -m "$(cat <<'EOF'
feat(n400app): speech recognition and voice-flag React hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Copy — `oral` dictionary namespace

**Files:**
- Modify: `apps/website/src/lib/n400/i18n/vi.ts` (add `oral` as the last property of the `vi` object, right after `quiz: {…},`)
- Modify: `apps/website/src/lib/n400/i18n/en.ts` (same place in `en`)
- Test: existing `apps/website/src/lib/n400/i18n/i18n.test.ts` (key parity, no empty values)

**Interfaces:**
- Consumes: nothing.
- Produces: `dict.oral.*` keys used by Tasks 9–10: `modeChoice, modeVoice, hint, hintDismiss, tapToSpeak, listening, processing, stop, grade, retry, didYouMean, yes, no, youSaid, youTyped, errNoSpeech, errNotAllowed, errGeneric, errStalled, reload, inAppNotice, typedPlaceholder`.

- [ ] **Step 1: Add the Vietnamese keys (the shape's source of truth)**

In `vi.ts`, after the `quiz: { … },` block and before the closing `};` of `vi`:

```ts
  oral: {
    modeChoice: 'Trắc nghiệm',
    modeVoice: 'Tự nói',
    hint: 'Nói đáp án bạn đã học. Không cần nói thành câu đầy đủ, chỉ cần có các từ chính.',
    hintDismiss: 'Đã hiểu',
    tapToSpeak: 'Bấm để nói',
    listening: 'Đang nghe… bấm để dừng',
    processing: 'Đang xử lý…',
    stop: 'Dừng',
    grade: 'Chấm',
    retry: 'Nói lại',
    didYouMean: 'Có phải bạn nói "{answer}"?',
    yes: 'Đúng vậy',
    no: 'Không',
    youSaid: 'Bạn nói:',
    youTyped: 'Bạn trả lời:',
    errNoSpeech: 'Mình chưa nghe thấy bạn nói. Hãy thử lại.',
    errNotAllowed:
      'Bạn chưa cho phép dùng micro. Hãy bật quyền micro cho trang này trong cài đặt trình duyệt, hoặc chọn Trắc nghiệm.',
    errGeneric: 'Không thể nhận diện giọng nói lúc này. Hãy thử lại.',
    errStalled: 'Micro đang không phản hồi. Tải lại trang để dùng tiếp.',
    reload: 'Tải lại trang',
    inAppNotice: 'Mở bằng Safari hoặc Chrome để dùng micro. Ở đây bạn có thể gõ, hoặc bấm 🎤 trên bàn phím để đọc.',
    typedPlaceholder: 'Nhập câu trả lời',
  },
```

- [ ] **Step 2: Run the parity test to verify it fails**

Run: `npx vitest run src/lib/n400/i18n/i18n.test.ts`
Expected: FAIL: `en có đúng tập key của vi` (en is missing `oral.*`). `npm run type-check` would also fail on `en`.

- [ ] **Step 3: Add the English keys**

In `en.ts`, the same place:

```ts
  oral: {
    modeChoice: 'Multiple choice',
    modeVoice: 'Speak',
    hint: 'Say the answer you learned. You don’t need a full sentence, just the key words.',
    hintDismiss: 'Got it',
    tapToSpeak: 'Tap to speak',
    listening: 'Listening… tap to stop',
    processing: 'Processing…',
    stop: 'Stop',
    grade: 'Check',
    retry: 'Say it again',
    didYouMean: 'Did you mean "{answer}"?',
    yes: 'Yes',
    no: 'No',
    youSaid: 'You said:',
    youTyped: 'You answered:',
    errNoSpeech: 'We didn’t hear you. Please try again.',
    errNotAllowed:
      'Microphone access is off. Allow the microphone for this site in your browser settings, or choose Multiple choice.',
    errGeneric: 'Speech recognition isn’t available right now. Please try again.',
    errStalled: 'The microphone stopped responding. Reload the page to continue.',
    reload: 'Reload page',
    inAppNotice: 'Open in Safari or Chrome to use the microphone. Here you can type, or tap 🎤 on your keyboard to dictate.',
    typedPlaceholder: 'Type your answer',
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/n400/i18n/i18n.test.ts && npm run type-check`
Expected: PASS; type-check exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/i18n/vi.ts src/lib/n400/i18n/en.ts
git commit -m "$(cat <<'EOF'
feat(n400app): copy for Civics oral answers (vi/en)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: UI — `AnswerModeToggle` + `MicAnswerPanel`

**Files:**
- Create: `apps/website/src/components/n400/oral/AnswerModeToggle.tsx`
- Create: `apps/website/src/components/n400/oral/MicAnswerPanel.tsx`

**Interfaces:**
- Consumes: `SpeechApi` (Task 7); `HARD_STOP_MS` (Task 4); `dict.oral` (Task 8); `useN400Lang` from `@/lib/n400/i18n/provider`; `tFormat` from `@/lib/n400/i18n/format`.
- Produces:
  - `type PracticeAnswerMode = 'choice' | 'voice'`; `AnswerModeToggle({ mode, onChange, labels, disabled })`.
  - `MicAnswerPanel({ input: 'mic' | 'typed', mic: SpeechApi, locked: boolean, nearAnswer: string | null, onSubmit(text: string): void, onNearAnswer(yes: boolean): void })`.

Presentational only: every decision they show was tested in Tasks 4–6. Gate: type-check plus the visual/device pass in Task 11.

- [ ] **Step 1: Write the toggle**

Create `apps/website/src/components/n400/oral/AnswerModeToggle.tsx`:

```tsx
'use client';

import { ListChecks, Mic } from 'lucide-react';

export type PracticeAnswerMode = 'choice' | 'voice';

export function AnswerModeToggle({
  mode,
  onChange,
  labels,
  disabled = false,
}: {
  mode: PracticeAnswerMode;
  onChange: (mode: PracticeAnswerMode) => void;
  labels: Record<PracticeAnswerMode, string>;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" className="inline-flex rounded-full bg-gray-100 p-1">
      {(['choice', 'voice'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          disabled={disabled}
          onClick={() => onChange(m)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
            mode === m ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {m === 'voice' ? <Mic size={14} /> : <ListChecks size={14} />}
          {labels[m]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write the panel**

Create `apps/website/src/components/n400/oral/MicAnswerPanel.tsx`:

```tsx
'use client';

// Mic (or in-app typed) answer surface for Civics practice. Spec §4.2–4.3, D12.
// Renders inside the existing practice card in place of the option grid.

import { useState } from 'react';
import { Loader2, Mic, RotateCcw, Square } from 'lucide-react';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';
import { HARD_STOP_MS } from '@/lib/n400/oral/speech-controller';
import type { SpeechApi } from '@/lib/n400/oral/use-speech-recognition';

const HINT_KEY = 'n400.oral.hintSeen';

function hintSeen(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return true;
  }
}

function ProgressRing() {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <svg className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="4" strokeDasharray={c}>
        <animate attributeName="stroke-dashoffset" from="0" to={String(c)} dur={`${HARD_STOP_MS / 1000}s`} fill="freeze" />
      </circle>
    </svg>
  );
}

const secondaryBtn =
  'flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50';
const primaryBtn =
  'flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 font-semibold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700 disabled:opacity-40';

export interface MicAnswerPanelProps {
  input: 'mic' | 'typed';
  mic: SpeechApi;
  /** True once the answer is graded: no more speaking or typing (spec §4.2). */
  locked: boolean;
  /** The taught answer to offer when the grade is `near`; null otherwise. */
  nearAnswer: string | null;
  onSubmit: (text: string) => void;
  onNearAnswer: (yes: boolean) => void;
}

export function MicAnswerPanel({ input, mic, locked, nearAnswer, onSubmit, onNearAnswer }: MicAnswerPanelProps) {
  const { dict } = useN400Lang();
  const t = dict.oral;
  const [showHint, setShowHint] = useState(() => !hintSeen());
  const [typed, setTyped] = useState('');

  const dismissHint = () => {
    setShowHint(false);
    try {
      window.localStorage.setItem(HINT_KEY, '1');
    } catch {
      // Private mode — the hint just shows again next time.
    }
  };

  const hint = showHint ? (
    <div
      className="flex w-full items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-3 text-gray-700"
      style={{ fontSize: 'clamp(0.8125rem, 1.4vw, 0.9375rem)' }}
    >
      <span className="flex-1">{t.hint}</span>
      <button type="button" onClick={dismissHint} className="shrink-0 font-semibold text-teal-700">
        {t.hintDismiss}
      </button>
    </div>
  ) : null;

  const nearRow =
    nearAnswer !== null ? (
      <div className="w-full rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
        <p className="mb-2 font-semibold text-gray-800">{tFormat(t.didYouMean, { answer: nearAnswer })}</p>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onNearAnswer(false)} className={secondaryBtn}>
            {t.no}
          </button>
          <button type="button" onClick={() => onNearAnswer(true)} className={primaryBtn}>
            {t.yes}
          </button>
        </div>
      </div>
    ) : null;

  if (input === 'typed') {
    const value = typed.trim();
    return (
      <div className="flex flex-col gap-3">
        {hint}
        <p className="text-gray-600" style={{ fontSize: 'clamp(0.8125rem, 1.4vw, 0.9375rem)' }}>
          {t.inAppNotice}
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (value && !locked) onSubmit(value);
          }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={locked}
            placeholder={t.typedPlaceholder}
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="done"
            className="min-w-0 flex-1 rounded-xl border-2 border-gray-200 px-3 py-3 text-gray-800 outline-none focus:border-teal-400 disabled:bg-gray-50"
            style={{ fontSize: '16px' }}
          />
          {!locked ? (
            <button type="submit" disabled={!value} className={`${primaryBtn} px-5`}>
              {t.grade}
            </button>
          ) : null}
        </form>
        {nearRow}
      </div>
    );
  }

  const busy = mic.state === 'requesting_permission' || mic.state === 'listening' || mic.state === 'processing';
  const errorText =
    mic.error === null
      ? null
      : mic.error === 'no-speech'
        ? t.errNoSpeech
        : mic.error === 'not-allowed'
          ? t.errNotAllowed
          : mic.error === 'stalled'
            ? t.errStalled
            : t.errGeneric;
  const canSpeak = !locked && mic.state !== 'transcript';

  return (
    <div className="flex flex-col items-center gap-3">
      {hint}
      {canSpeak ? (
        <>
          <button
            type="button"
            onClick={busy ? mic.stop : mic.start}
            aria-label={busy ? t.stop : t.tapToSpeak}
            className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-md transition-colors ${
              busy ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {busy && mic.startedAt !== null ? <ProgressRing key={mic.startedAt} /> : null}
            {mic.state === 'processing' ? (
              <Loader2 className="animate-spin" size={28} />
            ) : busy ? (
              <Square size={24} fill="currentColor" />
            ) : (
              <Mic size={30} />
            )}
          </button>
          <p className="text-sm text-gray-500">
            {mic.state === 'processing' ? t.processing : busy ? t.listening : t.tapToSpeak}
          </p>
        </>
      ) : null}

      {mic.transcript ? (
        <div
          className="w-full rounded-2xl border-2 border-gray-200 bg-white p-3 font-medium text-gray-800"
          aria-live="polite"
        >
          {mic.transcript}
        </div>
      ) : null}

      {errorText ? (
        <div className="w-full rounded-2xl border-l-4 border-orange-500 bg-orange-50 p-3 text-sm text-gray-700" role="status">
          {errorText}
          {mic.error === 'stalled' ? (
            <button type="button" onClick={() => window.location.reload()} className="mt-2 block font-semibold text-teal-700">
              {t.reload}
            </button>
          ) : null}
        </div>
      ) : null}

      {!locked && mic.state === 'transcript' ? (
        <div className="grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              mic.reset();
              mic.start();
            }}
            className={secondaryBtn}
          >
            <RotateCcw size={16} />
            {t.retry}
          </button>
          <button type="button" onClick={() => onSubmit(mic.transcript)} className={primaryBtn}>
            {t.grade}
          </button>
        </div>
      ) : null}

      {nearRow}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/n400/oral/AnswerModeToggle.tsx src/components/n400/oral/MicAnswerPanel.tsx
git commit -m "$(cat <<'EOF'
feat(n400app): MicAnswerPanel (mic + in-app typed) and answer-mode toggle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Practice page integration

**Files:**
- Modify: `apps/website/src/app/n400ready/(app)/practice/page.tsx`

**Interfaces:**
- Consumes: everything above; `getOralAnswerConfig` from `@/lib/n400/oral/get-oral-config`; `gradeOralAnswer` from `@/lib/n400/oral/grade-oral`; `OralVerdict` from `@/lib/n400/oral/types`; `recordAnswer(qid, ok, 'practice', 'voice' | 'typed')` (Task 2).
- Produces: the shipped practice behavior of spec §5 (rev 3.3).

- [ ] **Step 1: Imports and storage helper**

Add to the imports:

```ts
import { AnswerModeToggle, type PracticeAnswerMode } from '@/components/n400/oral/AnswerModeToggle';
import { MicAnswerPanel } from '@/components/n400/oral/MicAnswerPanel';
import { getOralAnswerConfig } from '@/lib/n400/oral/get-oral-config';
import { gradeOralAnswer } from '@/lib/n400/oral/grade-oral';
import type { OralVerdict } from '@/lib/n400/oral/types';
import { useSpeechRecognition } from '@/lib/n400/oral/use-speech-recognition';
import { useVoiceFlags } from '@/lib/n400/oral/use-voice-flags';
import { effectiveAnswerMode, voiceInputFor } from '@/lib/n400/oral/voice-support';
import { voiceOutcome } from '@/lib/n400/oral/voice-outcome';
```

After `const CATEGORY_STORAGE_KEY = …;` add:

```ts
const ANSWER_MODE_KEY = 'n400.practice.answerMode';
```

After `readStoredCategory()` add:

```ts
function readStoredAnswerMode(): PracticeAnswerMode {
  if (typeof window === 'undefined') return 'choice';
  try {
    return window.localStorage.getItem(ANSWER_MODE_KEY) === 'voice' ? 'voice' : 'choice';
  } catch {
    return 'choice';
  }
}
```

- [ ] **Step 2: State**

After `const [showAllAnswers, setShowAllAnswers] = useState(false);` add:

```ts
  const [answerMode, setAnswerMode] = useState<PracticeAnswerMode>(() => readStoredAnswerMode());
  const [voiceText, setVoiceText] = useState('');
  const [voiceVerdict, setVoiceVerdict] = useState<OralVerdict | null>(null);
  const [nearAnswer, setNearAnswer] = useState<'yes' | 'no' | null>(null);
  const mic = useSpeechRecognition();
  const voiceFlags = useVoiceFlags();
  const { reset: resetMic } = mic;
```

In the render-phase index-change block (`if (index !== prevIndex) { … }`), add before its closing brace:

```ts
    setVoiceText('');
    setVoiceVerdict(null);
    setNearAnswer(null);
```

Right after that block add:

```ts
  // A new question never inherits the previous one's mic session.
  useEffect(() => {
    resetMic();
  }, [index, resetMic]);
```

In `resetQuestionUI`, add the same three setters (`setVoiceText('')`, `setVoiceVerdict(null)`, `setNearAnswer(null)`).

- [ ] **Step 3: Derived values**

After `const pickedOption = …;` add:

```ts
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const voiceInput = voiceInputFor({
    ua,
    apiPresent: mic.supported,
    practiceOn: voiceFlags.practiceOn,
    androidOn: voiceFlags.androidOn,
  });
  const oralConfig = useMemo(
    () => getOralAnswerConfig(question.id, { stateCode, districtNumber }),
    [question.id, stateCode, districtNumber]
  );
  const voiceHere = effectiveAnswerMode(answerMode, voiceInput, oralConfig !== null) === 'voice';
  const outcome = voiceVerdict === null ? null : voiceOutcome(voiceVerdict, nearAnswer);
  const revealedCorrect: boolean | null = voiceHere
    ? (outcome?.shownCorrect ?? null)
    : pickedOption
      ? pickedOption.isCorrect
      : null;
```

`useMemo` must stay above the page's early `return`s. The block above sits before them, next to the existing `options` memo.

- [ ] **Step 4: Handlers**

Replace the body of `onPick`'s `recordAnswer(...).then((result) => { … })` with a shared helper. Add above `onPick`:

```ts
  const afterRecord = (result: { milestone: number | null; unlockedBadges: string[] }) => {
    if (result.milestone) {
      setMilestone(result.milestone);
      trackStreakMilestone(result.milestone);
    }
    if (result.unlockedBadges.length > 0) setUnlockedBadges(result.unlockedBadges);
  };
```

and change the last statement of `onPick` to:

```ts
    void recordAnswer(question.id, wasCorrect, 'practice').then(afterRecord);
```

After `onPick` add:

```ts
  const settleVoice = (shownCorrect: boolean, record: boolean | null) => {
    setPhase('revealed');
    if (shownCorrect) setCorrectCount((c) => c + 1);
    else markWrong(question.id);
    // D7: a confirmed near is shown correct but never recorded.
    if (record !== null) {
      void recordAnswer(question.id, record, 'practice', voiceInput === 'typed' ? 'typed' : 'voice').then(afterRecord);
    }
  };

  const onVoiceSubmit = (text: string) => {
    if (!oralConfig || voiceVerdict !== null) return;
    const { verdict } = gradeOralAnswer(text, oralConfig);
    setVoiceText(text);
    setVoiceVerdict(verdict);
    const o = voiceOutcome(verdict, null);
    if (o) settleVoice(o.shownCorrect, o.record);
  };

  const onNearAnswer = (yes: boolean) => {
    if (voiceVerdict !== 'near' || nearAnswer !== null) return;
    const answer = yes ? 'yes' : 'no';
    setNearAnswer(answer);
    const o = voiceOutcome('near', answer);
    if (o) settleVoice(o.shownCorrect, o.record);
  };

  const onAnswerModeChange = (m: PracticeAnswerMode) => {
    if (phase === 'revealed' || voiceVerdict !== null) return;
    setAnswerMode(m);
    try {
      window.localStorage.setItem(ANSWER_MODE_KEY, m);
    } catch {
      // Private mode — the choice lasts for this page only.
    }
    resetMic();
  };
```

- [ ] **Step 5: Render — toggle**

Inside the study body, directly before `{/* Question header — compact on mobile */}`:

```tsx
            {voiceInput !== 'none' ? (
              <div className="mb-2 flex justify-end">
                <AnswerModeToggle
                  mode={answerMode}
                  onChange={onAnswerModeChange}
                  labels={{ choice: dict.oral.modeChoice, voice: dict.oral.modeVoice }}
                  disabled={phase === 'revealed'}
                />
              </div>
            ) : null}
```

- [ ] **Step 6: Render — panel instead of options**

Wrap the existing options grid (`<div className="grid grid-cols-1 gap-[clamp(0.5rem,1.2vh,0.75rem)]"> … </div>`) so it renders only in choice mode:

```tsx
            {voiceHere ? (
              <MicAnswerPanel
                input={voiceInput === 'typed' ? 'typed' : 'mic'}
                mic={mic}
                locked={voiceVerdict !== null}
                nearAnswer={voiceVerdict === 'near' && nearAnswer === null ? allAnswers[0].en : null}
                onSubmit={onVoiceSubmit}
                onNearAnswer={onNearAnswer}
              />
            ) : (
              <div className="grid grid-cols-1 gap-[clamp(0.5rem,1.2vh,0.75rem)]">
                {/* …existing options.map(...) unchanged… */}
              </div>
            )}
```

- [ ] **Step 7: Render — feedback reads the shared verdict**

In the feedback block:
- change the condition `{phase === 'revealed' && pickedOption && (` to `{phase === 'revealed' && revealedCorrect !== null && (`;
- change both `pickedOption.isCorrect` references inside it to `revealedCorrect`;
- after the header row (`</div>` closing the `flex items-center gap-2 mb-2` row), add:

```tsx
                {voiceHere && voiceText ? (
                  <div className="text-gray-700 mb-1" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    <span className="font-semibold">{voiceInput === 'typed' ? dict.oral.youTyped : dict.oral.youSaid}</span>{' '}
                    {voiceText}
                  </div>
                ) : null}
```

- [ ] **Step 8: Gate**

Run: `npm run type-check && npx vitest run src/lib/n400 && npm run build`
Expected: type-check 0; all `src/lib/n400` tests pass; build succeeds.

- [ ] **Step 9: Commit**

```bash
git add "src/app/n400ready/(app)/practice/page.tsx"
git commit -m "$(cat <<'EOF'
feat(n400app): Civics practice answers by voice (spec §5, rev 3.3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Gate 2 — full gate, visual check, device pass

**Files:**
- Create: `docs/superpowers/spikes/2026-09-24-n400-oral-practice-gate2.md`

**Interfaces:**
- Consumes: the whole slice.
- Produces: the owner's Gate 2 sign-off, which unlocks the Slice 3 (mock) plan.

- [ ] **Step 1: Full gate**

Run: `npm run type-check && npm run test && npm run build`
Expected: type-check 0; tests pass except the pre-existing `mobile-layout.test.ts` failure; build 0.

- [ ] **Step 2: Visual check (desktop)**

Follow the memory recipe `n400-visual-verification-recipe` (auth never hydrates offline; the scroll container is `<main>`). With `voice_practice` forced on locally (temporarily return `{ practiceOn: true, androidOn: false }` from `useVoiceFlags`, and **do not commit that**), confirm on `/n400ready/practice`: the toggle shows; "Tự nói" swaps the option grid for the mic; the hint shows once; 🔊 still works; after grading, the feedback block shows "Bạn nói: …" and the accepted answers.

- [ ] **Step 3: Write the Gate 2 checklist**

Create `docs/superpowers/spikes/2026-09-24-n400-oral-practice-gate2.md`:

```markdown
# N400 Oral Practice — Gate 2 device pass

**Spec:** docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md §12 (Slice 2)
**Prereqs:** migration n400_32 applied; `voice_practice` enabled for the tester (rollout 100 or tester in bucket); Permissions-Policy deployed.

| # | Environment | Check | Result |
|---|---|---|---|
| 1 | iPhone Safari | First use: permission prompt, hint shows once, 5 answers in a row graded | |
| 2 | iPhone Safari | Switch app mid-answer, come back: item kept, Nói lại works | |
| 3 | iPhone Safari | If the mic dies: error within ~7 s; 2nd time shows "Tải lại trang", and reload restores the mic | |
| 4 | iPhone Safari | Permission denied: friendly copy; Trắc nghiệm still works | |
| 5 | Desktop Chrome | Fresh profile / Incognito: prompt, 5 answers graded | |
| 6 | Desktop Chrome | Near miss ("the institution" for Q2): "Có phải bạn nói…?" Đúng vậy shows correct; the attempt is **not** in n400_question_attempts | |
| 7 | Facebook in-app iOS | No mic; notice + text box; typed/dictated answer graded; row has answer_mode='typed' | |
| 8 | Any | Location question (senator) graded against the learner's state | |
| 9 | Any | Records: voice rows have answer_mode='voice'; MC rows unchanged ('choice') | |

Android: not tested (owner accepted risk, D14); `voice_android` stays OFF.

## Decision (owner)

- Gate 2 pass? <yes/no>
```

- [ ] **Step 4: Commit and hand off**

```bash
git add docs/superpowers/spikes/2026-09-24-n400-oral-practice-gate2.md
git commit -m "$(cat <<'EOF'
docs(n400app): oral practice Gate 2 device checklist

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

**GATE 2 — stop.** Deploying (push to main → Vercel production) and enabling `voice_practice` are owner decisions. The owner runs the checklist on a preview or production with the flag scoped to themselves. Slice 3 (mock) does not start until the owner writes "Gate 2 pass: yes".
