# N400 Civics — Oral Answers (speech-to-text) Design

**Date:** 2026-09-24 (rev 2 — after PO review)
**App:** `apps/website/` (N400Ready, `/n400ready`)
**Status:** Approved in brainstorming; rev 2 awaiting written-spec review

## 1. Goal

Let learners answer Civics questions **by speaking**, the way the real USCIS interview works, in both Civics practice and the Civics mock test. Today every Civics answer is a multiple-choice tap.

**Success criteria**
- A learner on iPhone Safari / Android Chrome / desktop Chrome can practice and take the Civics mock test by voice.
- Grading follows the taught answer's keywords, not exact wording — "the constitution" passes for "The U.S. Constitution" — and never passes a different real word ("institution").
- Voice mock results count toward readiness, badges, streak, lead scoring and the `n400_mock_test_pass` CAPI event from day one; each voice surface has its own kill switch.
- Browsers without speech support never show a broken mic.

**Out of scope (v1):** voice in Phỏng vấn đầy đủ, Speaking (What Mean / Yes-No) by voice, a Reading test, storing audio, LLM grading, extending answer data to the full USCIS alternative-answer list.

## 2. Decisions

| # | Decision |
|---|---|
| D1 | Feature: Civics oral answers (not Reading, not Speaking mock). |
| D2 | Grade against the **answer the app teaches** (`answersEn`; 127/128 questions have exactly one) via a reviewed per-question `OralAnswerConfig` + a small alias list. Deterministic, no LLM. |
| D3 | Both practice and mock. Practice has a **[Trắc nghiệm \| 🎤 Tự nói]** toggle. |
| D4 | Mishearing: practice asks *"Có phải bạn nói <đáp án>?"* on a near miss; mock echoes *"App nghe được: <transcript>"* on **every** item with one retry — never reveals the answer mid-test. |
| D5 | Voice mock counts immediately. Two kill switches: `voice_practice`, `voice_mock`. |
| D6 | Engine: browser **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`), `lang='en-US'`. Unsupported browsers fall back to multiple choice. |
| D7 | Practice near-miss confirmed with "Đúng vậy" shows as correct in-session but is **not recorded** (preserves the "thuộc = graded only" invariant). |
| D8 | Speech output is always real words, so **edit-distance tolerance never produces `correct`** — only `near`. (Rev 2: `institution`↔`constitution` and `republican`↔`republic` are distance 2, which the writing grader's threshold would accept.) |
| D9 | The recognizer ending (`onend`) **never auto-grades**; the learner always sees the transcript first. A confirmed transcript is locked. |

## 3. Grading

### 3.1 Answer config — `lib/n400/oral/oral-answer-config.ts`

```ts
type OralAnswerType = 'single' | 'phrase' | 'enumeration';

interface OralAnswerConfig {
  type: OralAnswerType;
  alternatives: string[][];   // any-of; each inner array = parts, ALL required
  minKeywords?: number;       // phrase only: keywords required per part (explicit)
}

// Q2:  { type: 'single',      alternatives: [['constitution']] }
// Q16: { type: 'enumeration', alternatives: [['congress', 'president', 'courts']] }
// Q37: { type: 'phrase',      alternatives: [['keep powerful']], minKeywords: 2 }   // "president" is in the question → dropped
// Q4:  { type: 'phrase',      alternatives: [['self government'], ['govern themselves']], minKeywords: 2 } // "people" is in the question → dropped
```

- **Generated, then reviewed.** A script (`scripts/n400-build-oral-config.mjs`) derives a draft for all 128 questions from `answersEn` + question text; the output is committed as `oral-answer-config.ts` and reviewed as one diff. Hand edits after review are allowed and are what the tests pin.
- Keywords are content words only: articles, auxiliaries, fillers and optional qualifiers (`u s, united states, america, american, your`) are dropped at generation time.
- **Question-echo rule:** a keyword that appears in the question text is dropped from the answer's keywords, unless that would leave the part empty. (Rev 2: 14 answers overlap their question; Q76 "War for American Independence" would pass by repeating the question.)
- Aliases (equivalent phrasings, ~20–30 questions) are extra `alternatives` entries in the same file, each with a test. Aliases stay narrow: the taught answer's wording, not free paraphrase.
- Location-based questions (Q23/29/61/62) build their config at runtime from the learner's answers via `correctAnswersFor()` in `quiz-engine.ts`, as `single` (person names → surname keyword; capitals → city name).

### 3.2 Engine — `lib/n400/oral/grade-oral.ts`

```ts
type OralVerdict = 'correct' | 'near' | 'wrong';
interface OralGrade { verdict: OralVerdict; matched: string[]; missing: string[] }
function gradeOralAnswer(transcript: string, config: OralAnswerConfig): OralGrade
```

Pure, deterministic, runs identically on client (practice) and server (mock).

1. **Normalize transcript:** lowercase, strip punctuation, hyphens → spaces, number words ↔ digits (`twenty seven` ≡ `27`), drop fillers/qualifiers with the same list the generator uses.
2. **Word match = exact after stemming** (`courts ≡ court`, `writes ≡ write`, `laws ≡ law`). Nothing else counts as a match for `correct`.
3. **Near-match** = edit distance within the writing grader's thresholds. A near-match word counts **only toward `near`**, never toward `correct`.
4. **One-to-one:** each transcript word can satisfy at most one keyword (`congress congress congress` matches one part only).
5. Extra words and word order in the transcript are ignored.
6. **Per part:** `single` → its keyword(s) all matched; `phrase` → ≥ `minKeywords` matched; `enumeration` → every part matched.
7. **Verdict** (best across alternatives): `correct` if every part is satisfied with exact matches; `near` if ≥ half of the keywords are matched counting near-matches, or all parts are satisfied only thanks to near-matches; else `wrong`.

`near` means "maybe misheard or incomplete", not "almost knows it". It is conservative on purpose.

### 3.3 Reference cases (must hold in tests)

| Q | Taught answer | Said | Verdict |
|---|---|---|---|
| 2 | The U.S. Constitution | the constitution | correct |
| 2 | The U.S. Constitution | constitution constitution constitution | correct |
| 2 | The U.S. Constitution | the institution | **near** |
| 7 | Twenty-seven (27) | 27 amendments | correct |
| 20 | Writes laws | I think the president writes laws | correct |
| 37 | To keep the president from becoming too powerful | to keep him from being too powerful | correct |
| 37 | To keep the president from becoming too powerful | so the president is not too powerful | near (only `powerful`; `president` is in the question) |
| 38 | Donald Trump | trump | correct |
| 16 | Congress, president, and the courts | congress and the president | near |
| 16 | Congress, president, and the courts | congress congress congress | wrong |
| 4 | Self-government | people govern themselves (alias) | correct |
| 4 | Self-government | people rule themselves | near (only `themselves`) |
| 4 | Self-government | freedom | wrong |
| 76 | War for American Independence | (reads the question aloud) | wrong |

## 4. Speech capture

### 4.1 Hook — `lib/n400/oral/use-speech-recognition.ts`

The only file that touches Web Speech. `continuous=false`, `interimResults=true`, hard stop at 15 s.

```ts
type MicState =
  | 'idle' | 'requesting_permission' | 'listening' | 'processing'
  | 'transcript'   // result ready, waiting for learner action
  | 'error';

type MicError = 'no-speech' | 'not-allowed' | 'network' | 'audio-capture' | 'unavailable';

function useSpeechRecognition(): {
  supported: boolean;             // feature detection at mount; false on server
  state: MicState;
  transcript: string;             // interim while listening, final after
  error: MicError | null;
  elapsedMs: number;              // drives the subtle 15 s ring
  start(): void;                  // only from a user gesture
  stop(): void;
  reset(): void;
}
```

**Rules**
- `start()` only from a click/tap handler; one recognition instance at a time; `abort()` on unmount and on `visibilitychange` → hidden.
- `onend` **never grades.** With text → `transcript`. Without text → `error: 'no-speech'`. This is the same path whether the learner paused or iOS cut the session short — the app cannot tell those apart, so the learner decides from the visible transcript.
- `processing` covers the gap between the learner going quiet and the final result, so the button never says "Listening…" while nothing is being heard.
- Technical error details go to Sentry; the UI only shows friendly copy (§8).

### 4.2 Panel — `components/n400/oral/MicAnswerPanel.tsx`

Mic button (with a subtle progress ring, no numeric countdown), live transcript, and the action row. Props select the variant:
- `practice`: `transcript` → [Chấm] [Nói lại]; after grading `near` → *"Có phải bạn nói X?"* [Đúng vậy] [Không].
- `mock`: `transcript` → *"App nghe được: …"* [Đúng vậy] [Nói lại]; retry count owned by the caller.

After "Đúng vậy" the transcript is **locked** — no editing, no re-speaking — and the only action is Next.

Renders inside the existing Civics card chrome (memory rule: Speaking/Writing/Civics screens reuse Civics UI).

### 4.3 First-use hint

Shown once (localStorage, try/catch), the first time the learner enters voice mode: ***"Nói đáp án bạn đã học. Không cần nói thành câu đầy đủ, chỉ cần có các từ chính."*** It must not suggest free paraphrase is accepted, because it isn't (D2).

## 5. Practice flow — `app/n400ready/(app)/practice/page.tsx`

- Toggle **[Trắc nghiệm | 🎤 Tự nói]** in the session header; choice persisted in `localStorage` (try/catch). Hidden when `!supported` or flag `voice_practice` is off.
- Voice body: question audio plays (existing audio), no options, `MicAnswerPanel variant="practice"`. Unlimited Nói lại before grading.
- Recording (`recordAnswer` in `user-state.tsx` gains an optional 4th param `answerMode: 'choice' | 'voice' = 'choice'`, written to `n400_quiz_attempts.answer_mode`):
  - `correct` / `wrong` → `recordAnswer(qid, wasCorrect, 'practice', 'voice')`.
  - `near` + "Đúng vậy" → shown correct, **no** `recordAnswer`.
  - `near` + "Không" → `recordAnswer(qid, false, 'practice', 'voice')`.
- Feedback after grading reuses the MC feedback (correct answer + 🔊).

## 6. Mock flow — `app/n400ready/(app)/mock-test/civics/`

- Intro gains a mode choice **Trắc nghiệm / 🎤 Trả lời bằng giọng**. Voice shown only when `supported` and flag `voice_mock` is on for the user; when unsupported: disabled with *"Mở bằng Safari hoặc Chrome để thi bằng giọng"* + copy-link.
- `startMockAttempt` unchanged (same seed, same 20 questions).
- Per item: question audio → speak → *"App nghe được: …"* → [Đúng vậy] (locks) or [Nói lại] (max 1). `no-speech` / `network` / `unavailable` errors don't consume the retry. No verdict shown mid-test.
- On finish, new server action **`finalizeVoiceMockAttempt(attemptId, answers: VoiceMockAnswer[])`**:
  ```ts
  interface VoiceMockAnswer { qid: number; transcript: string; retried: boolean } // no was_correct — by design
  ```
  1. Verify the attempt belongs to the caller and is unfinished.
  2. Load `state_code` / `district_number` from `n400_user_profile`; resolve each question's `OralAnswerConfig`.
  3. Grade server-side: `was_correct = gradeOralAnswer(transcript, config).verdict === 'correct'` (`near` is wrong in mock).
  4. Call RPC `finalize_mock_attempt_voice_batch` with the **service-role** client (`createServerSupabaseClient()` in `lib/supabase.ts`).
  5. Badges + CAPI via the existing `evaluateMockUnlocks` path.
- Result screen: each row shows the transcript next to the correct answer.

**Invariant:** the client never sends a verdict. `was_correct` is computed only inside `finalizeVoiceMockAttempt`. Enforced by the `VoiceMockAnswer` type and a test; any future refactor that moves grading to the client violates this spec.

**Integrity note:** the transcript is produced client-side, so the server cannot prove it was spoken. Forging a passing transcript requires knowing the answers — the same bar as the MC mock, whose answer data also ships in the client bundle.

## 7. Data — migration `supabase/migrations/n400_32_voice_answers.sql`

- `n400_quiz_attempts.answer_mode TEXT NOT NULL DEFAULT 'choice' CHECK (answer_mode IN ('choice','voice'))`
- `n400_question_attempts.transcript TEXT NULL` — text only; no audio stored anywhere.
- `finalize_mock_attempt_voice_batch(p_attempt_id uuid, p_results jsonb)` — `p_results = [{qid, was_correct, transcript}]`; inserts question attempts, reuses `finalize_mock_attempt` for score / passed / streak, sets `answer_mode='voice'`, returns the same shape as `finalize_mock_attempt_batch`. **`REVOKE EXECUTE … FROM PUBLIC, anon, authenticated; GRANT EXECUTE … TO service_role;`** — it trusts caller-supplied `was_correct`.
- Seed flag rows in `n400_feature_flags`: `voice_practice` and `voice_mock`. Launch `rollout_pct` is chosen from actual weekly traffic at launch: if weekly voice-eligible users are few, start at 100% (a small % yields too little data to decide anything) and rely on the kill switch; otherwise ramp 10 → 25 → 50 → 100.

## 8. Errors

| Case | Learner sees | Mock retry consumed? |
|---|---|---|
| `no-speech` (incl. `onend` with no text) | "Mình chưa nghe thấy bạn nói. Hãy thử lại." | No |
| `not-allowed` | Practice → switch to MC + how-to-enable hint. Mock before start → MC; mid-test → hint, progress kept | No |
| `network` / `audio-capture` / `unavailable` | "Không thể nhận diện giọng nói lúc này. Hãy thử lại." (raw error → Sentry) | No |
| 15 s reached | Stops; transcript shown for the learner to act on | — |
| Tab hidden / screen lock / app switch (iOS) | Recognition aborted; stay on the item; Nói lại available | No |
| Voice finalize fails | Same as MC: Sentry + retry; CAPI dedupes on `attemptId` | — |

## 9. Analytics

- One GA4 event via `lib/n400/analytics.ts`: **`n400_oral_answer`** `{ qid, context: 'practice'|'mock', verdict, retried, confirmed_near, error, transcript_length }`. Not sent to the Meta Pixel. No transcript text in analytics.
- Retry, confirmation, no-speech and error rates are all derived from this one event.
- `trackMockTestStart` gains an `answer_mode` param.
- Nothing is written to `n400_growth_events` (that table feeds the staff Leads timeline).
- **Recognition error vs grading error cannot be measured automatically** (no ground truth of what was said). Weekly, sample ~20 stored mock transcripts and label them by hand: misheard / graded wrong / learner wrong.

## 10. Privacy

Privacy Policy (EN/VI) gains a paragraph: voice answers are recognized by the browser's speech service (e.g. Google, Apple); N400Ready stores only the resulting text, never audio.

## 11. Testing

- `grade-oral.test.ts`:
  - all 128 taught answers grade `correct` against their own config (location-based with a fixture state/district);
  - every §3.3 reference case;
  - **cross-question matrix:** no question's taught answer grades `correct` for any other question, excluding questions whose answers are identical (e.g. Q91/92/96 "Civil War");
  - **question echo:** reading each question's own text aloud grades `wrong`;
  - partial enumerations grade `near`, never `correct`;
  - real-word substitutions (`institution`, `republican`, `senator` for `senate`) never grade `correct`;
  - number/filler/qualifier normalization; each alias.
- `oral-answer-config` snapshot: the generated config is committed; changes show up as a reviewed diff.
- `finalizeVoiceMockAttempt`: rejects another user's attempt; direct `rpc('finalize_mock_attempt_voice_batch')` as `authenticated` is denied; type-level check that `VoiceMockAnswer` has no verdict field.
- `use-speech-recognition`: mocked `webkitSpeechRecognition` — state transitions, `onend` with and without text, each error code, abort on `visibilitychange`.
- Manual, required before merge: iPhone Safari (incl. permission denied, tab background, screen lock, app switch), Android Chrome, desktop Chrome, **Facebook in-app browser** (iOS + Android) — confirm correct show/hide; owner records ~10 real answers to sanity-check accuracy.
- Gate: `npm run type-check && npm run test && npm run build`.

## 12. Build order

1. **Device spike (first task):** minimal hook on iPhone Safari, Android Chrome and the Facebook in-app browser. If Facebook in-app has no support, stop and reassess value before building further, since ad traffic lands there.
2. `oral-answer-config` generator + reviewed snapshot, then `grade-oral.ts` with the full test suite.
3. Hook + `MicAnswerPanel`.
4. Practice flow.
5. Migration + `finalizeVoiceMockAttempt` + mock flow.
6. Analytics, Privacy Policy, flags.

## 13. Post-launch measurement

Weekly: voice vs choice correct-rate on the same questions, retry and no-speech rates from `n400_oral_answer`, plus the hand-labeled sample (§9). A large voice/choice gap driven by mishearing → turn the affected flag off.
