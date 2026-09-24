# N400 Civics — Oral Answers (speech-to-text) Design

**Date:** 2026-09-24
**App:** `apps/website/` (N400Ready, `/n400ready`)
**Status:** Approved in brainstorming; awaiting written-spec review

## 1. Goal

Let learners answer Civics questions **by speaking**, the way the real USCIS interview works, in both Civics practice and the Civics mock test. Today every Civics answer is a multiple-choice tap.

**Success criteria**
- A learner on iPhone Safari / Android Chrome / desktop Chrome can practice and take the Civics mock test by voice.
- Grading follows meaning (keywords), not exact wording — "the constitution" passes for "The U.S. Constitution".
- Voice mock results count toward readiness, badges, streak, lead scoring and the `n400_mock_test_pass` CAPI event from day one, with a flag to switch voice mock off.
- Browsers without speech support never show a broken mic.

**Out of scope (v1):** voice in Phỏng vấn đầy đủ, Speaking (What Mean / Yes-No) by voice, a Reading test, storing audio, LLM grading, extending answer data to the full USCIS alternative-answer list.

## 2. Decisions (from brainstorming)

| # | Decision |
|---|---|
| D1 | Feature: Civics oral answers (not Reading, not Speaking mock). |
| D2 | Grade against the **answer the app teaches** (`answersEn`, 127/128 questions have exactly one), with fuzzy keyword matching + a small curated alias list. No LLM. |
| D3 | Both practice and mock. Practice has a **[Trắc nghiệm \| 🎤 Tự nói]** toggle. |
| D4 | Mishearing: practice asks *"Có phải bạn nói <đáp án>?"* on a near miss; mock echoes *"App nghe được: <transcript>"* on **every** item with one retry — never reveals the answer mid-test. |
| D5 | Voice mock counts immediately; kill switch = flag `voice_mock`. |
| D6 | Engine: browser **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`), `lang='en-US'`. Free; unsupported browsers fall back to multiple choice. |
| D7 | Practice near-miss confirmed with "Đúng vậy" shows as correct in-session but is **not recorded** (preserves the "thuộc = graded only" invariant). |

## 3. Grading — `lib/n400/oral/grade-oral.ts`

Pure function, runs identically on client (practice) and server (mock).

```ts
type OralVerdict = 'correct' | 'near' | 'wrong';
interface OralGrade { verdict: OralVerdict; matched: string[]; missing: string[] }
function gradeOralAnswer(transcript: string, accepted: string[]): OralGrade
```

`accepted` = the question's taught answers (for location-based questions, the learner's personal answers from `correctAnswersFor()` in `quiz-engine.ts`) plus any aliases from `oral-aliases.ts`. The best verdict across all accepted answers wins.

**Rules**
1. **Normalize** transcript and answer: lowercase, strip punctuation, hyphens → spaces, number words ↔ digits (`twenty seven` ≡ `27`), and `Twenty-seven (27)`-style parentheticals yield both forms.
2. **Drop non-content words:** articles, auxiliaries, fillers (`the, a, an, is, are, it, um, uh, i think, the answer is, …`) and optional qualifiers (`u s, us, united states, america, american, your`).
3. **Keyword match** per remaining answer word, tolerant of: edit distance (same thresholds as `writing-grader.ts`), plural/verb suffixes (`writes ≡ write`, `laws ≡ law`). Extra words and word order in the transcript are ignored.
4. **Enumerations:** an answer split by `,` / `and` into parts (`Congress, president, and the courts`) requires **every part**.
5. **Per part threshold:** ≤ 2 keywords → all required; ≥ 3 keywords → ≥ ⌈2/3⌉ required.
6. **People names:** surname alone suffices (`Trump`, `Cruz`, `Vance`).
7. **Verdict:** `correct` if every part meets its threshold; `near` if ≥ half of all keywords matched (or, for a single-keyword answer, edit distance within 2× tolerance); otherwise `wrong`.

**Aliases — `lib/n400/oral/oral-aliases.ts`:** `Record<questionId, string[]>` of equivalent phrasings for ~20–30 questions where the taught answer is commonly said differently (e.g. Q4 `people govern themselves`). Each alias gets a test.

**Reference cases** (must hold in tests)

| Q | Taught answer | Said | Verdict |
|---|---|---|---|
| 2 | The U.S. Constitution | the constitution | correct |
| 7 | Twenty-seven (27) | 27 amendments | correct |
| 20 | Writes laws | they write the law | correct |
| 37 | To keep the president from becoming too powerful | so the president is not too powerful | correct |
| 38 | Donald Trump | trump | correct |
| 16 | Congress, president, and the courts | congress and the president | near |
| 4 | Self-government | people rule themselves (no alias) | wrong |

## 4. Speech capture

**`lib/n400/oral/use-speech-recognition.ts`** — the only file that touches Web Speech.

```ts
function useSpeechRecognition(): {
  supported: boolean;
  listening: boolean;
  transcript: string;           // final (interim shown while listening)
  error: 'no-speech' | 'not-allowed' | 'network' | 'audio-capture' | null;
  start(): void;
  stop(): void;
}
```
- `continuous=false`, `interimResults=true`, auto-stop on silence, hard stop at 15 s.
- `supported` = feature detection at mount; SSR-safe (false on server).

**`components/n400/oral/MicAnswerPanel.tsx`** — mic button, live transcript, and the confirm row. Props select the variant: `practice` (near-miss → *"Có phải bạn nói X?"* [Đúng vậy] [Không]) or `mock` (always *"App nghe được: …"* [Đúng vậy] [Nói lại], retry count owned by the caller). Renders inside the existing Civics card chrome (memory rule: Speaking/Writing/Civics screens reuse Civics UI).

## 5. Practice flow — `app/n400ready/(app)/practice/page.tsx`

- Toggle **[Trắc nghiệm | 🎤 Tự nói]** in the session header; choice persisted in `localStorage` (try/catch). Hidden when `!supported`.
- Voice body: question audio plays (existing audio), no options, `MicAnswerPanel`. Unlimited "Nói lại" before grading.
- Recording:
  - `correct` / `wrong` → `recordAnswer(qid, wasCorrect, 'practice', 'voice')` exactly as MC does. `recordAnswer` in `user-state.tsx` gains an optional 4th param `answerMode: 'choice' | 'voice' = 'choice'`, written to `n400_quiz_attempts.answer_mode`.
  - `near` + "Đúng vậy" → shown correct, **no** `recordAnswer`.
  - `near` + "Không" → `recordAnswer(qid, false, 'practice')`.
- Feedback screen after grading reuses the MC feedback (correct answer + 🔊).

## 6. Mock flow — `app/n400ready/(app)/mock-test/civics/`

- Intro gains a mode choice **Trắc nghiệm / 🎤 Trả lời bằng giọng**. Voice option shown only when `supported && flag voice_mock`; when unsupported: disabled with *"Mở bằng Safari hoặc Chrome để thi bằng giọng"* + copy-link.
- `startMockAttempt` unchanged (same seed, same 20 questions).
- Per item: question audio → speak → *"App nghe được: …"* → [Đúng vậy] or [Nói lại] (max 1 retry; `no-speech`/`network` errors don't consume the retry). No verdict shown mid-test.
- On finish: new server action **`finalizeVoiceMockAttempt(attemptId, answers: { qid, transcript, retried }[])`**:
  1. Verify the attempt belongs to the caller and is unfinished.
  2. Load `state_code` / `district_number` from `n400_user_profile`; build `accepted` per question via `correctAnswersFor()` + aliases.
  3. Grade with `gradeOralAnswer`; `was_correct = verdict === 'correct'` (`near` is wrong in mock).
  4. Call RPC `finalize_mock_attempt_voice_batch` with the **service-role** client (`createServerSupabaseClient()` in `lib/supabase.ts`).
  5. Badges + CAPI via the existing `evaluateMockUnlocks` path.
- Result screen: each row shows the transcript next to the correct answer.

**Integrity note:** the transcript is produced client-side, so the server cannot prove it was spoken. Forging a passing transcript requires knowing the answers — the same bar as the MC mock, whose answer data also ships in the client bundle.

## 7. Data — migration `supabase/migrations/n400_32_voice_answers.sql`

- `n400_quiz_attempts.answer_mode TEXT NOT NULL DEFAULT 'choice' CHECK (answer_mode IN ('choice','voice'))`
- `n400_question_attempts.transcript TEXT NULL` — text only; no audio stored anywhere.
- `finalize_mock_attempt_voice_batch(p_attempt_id uuid, p_results jsonb)` — `p_results = [{qid, was_correct, transcript}]`; inserts question attempts, then reuses `finalize_mock_attempt` for score / passed / streak; sets `answer_mode='voice'`; returns the same shape as `finalize_mock_attempt_batch`. **`REVOKE EXECUTE … FROM PUBLIC, anon, authenticated; GRANT EXECUTE … TO service_role;`** — it trusts caller-supplied `was_correct`.
- Seed flag row `n400_feature_flags ('voice_mock', enabled=true, rollout_pct=100)`.

## 8. Errors

| Case | Behavior |
|---|---|
| `no-speech` | "Mình chưa nghe thấy bạn nói" + Nói lại; not a mock retry |
| `not-allowed` | Practice → switch to MC + how-to-enable hint. Mock before start → MC; mid-test → hint, keep progress |
| `network` / `audio-capture` | Error + retry; not a mock retry |
| > 15 s | Auto-stop, grade what was heard |
| Tab backgrounded (iOS) | Stop, stay on item, allow re-speak |
| Voice finalize fails | Same as MC: Sentry + retry; CAPI dedupes on `attemptId` |

## 9. Privacy

Privacy Policy (EN/VI) gains a paragraph: voice answers are recognized by the browser's speech service (e.g. Google, Apple); N400Ready stores only the resulting text, never audio.

## 10. Testing

- `grade-oral.test.ts`: all 128 taught answers grade `correct` against themselves (location-based ones with a fixture state/district); every §3 reference case; number/filler/qualifier normalization; each alias; a set of must-be-`wrong` cases to guard against over-leniency.
- `finalizeVoiceMockAttempt`: rejects another user's attempt; direct `rpc('finalize_mock_attempt_voice_batch')` as `authenticated` is denied.
- `use-speech-recognition`: mocked `webkitSpeechRecognition` — state transitions and each error code.
- Manual, required before merge: iPhone Safari, Android Chrome, desktop Chrome, **Facebook in-app browser** (iOS + Android) — confirm correct show/hide; owner records ~10 real answers to sanity-check accuracy.
- Gate: `npm run type-check && npm run test && npm run build`.

## 11. Post-launch measurement

Weekly: correct-rate of `answer_mode='voice'` vs `'choice'` on the same questions, and retry usage in voice mocks. A large gap means recognition is failing → turn `voice_mock` off.
