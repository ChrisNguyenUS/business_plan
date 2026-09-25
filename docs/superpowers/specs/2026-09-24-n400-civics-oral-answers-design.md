# N400 Civics — Oral Answers (speech-to-text) Design

**Date:** 2026-09-24 (rev 3.6 — warm up the iOS session before 🔊; rev 3.5 — iPhone persistent recognition session (D15), after on-device diagnosis; rev 3.4 — Slice 3 design: service-role finalize, mixed items, typed mock input; rev 3.3 — Gate 0 device-spike findings, see docs/superpowers/spikes/2026-09-24-n400-voice-spike-results.md; rev 3.2 — Gate 1 owner decisions after final code review; rev 3.1 — after two PO reviews + grading prototype on real data)
**App:** `apps/website/` (N400Ready, `/n400ready`)
**Status:** Approved in brainstorming; rev 3 approved for planning

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
| D10 | **Grading rules are spec-governed.** Any change to grading rules, generated config or aliases must update this spec and land as a visible diff. Implementers do not "improve" grading on their own. |
| D11 | Delivery is gated: **Spike → Grading → Practice → Mock → Production rollout.** Each gate needs owner sign-off before the next slice starts. |
| D12 | (rev 3.3, Gate 0) **In-app browsers** (Facebook, Messenger, Instagram, Zalo, …) never get the mic: the Facebook iOS WebView allows only the first recognition per session and Refresh doesn't recover it. There, voice mode shows *"Mở bằng Safari hoặc Chrome để dùng micro"* plus a **text box** (the learner types, or dictates with the keyboard's 🎤), graded by the same engine. Recorded as `answer_mode='typed'`. |
| D13 | (rev 3.3, Gate 0) The site's `Permissions-Policy` must allow `microphone=(self)` (it was `microphone=()`, which made every Chromium browser reject recognition instantly). Owner confirms the header change before it lands. Camera/geolocation stay blocked. |
| D14 | (rev 3.3, Gate 0) Android Chrome was not device-tested (owner accepted the risk). The mic on Android additionally requires flag `voice_android`, so Android can be switched off on its own. |
| D15 | (rev 3.5, owner 2026-09-24) **iOS uses ONE persistent recognition session.** On iOS Safari (iOS 27), every **new** `SpeechRecognition` session after the first one in a browser process is deaf: `audiostart` fires, `speechstart` never does, the mic icon stays on, no error. Reload doesn't fix it; a pasted new tab works once. A static page with no app code shows the same, and Mac Safari is fine, so this is a WebKit bug. Four ways of starting sessions all failed. **One `continuous = true` session kept open** was proven on the device: it heard every phrase, lived ~4 min through 76 s and 126 s silences, and survived app and tab switches as long as the page didn't abort it. So on iOS (iPhone, iPod, iPadOS) the app opens one continuous session on the first mic tap and keeps it for the whole app (practice ↔ mock, choice ↔ voice toggle, app/tab switches). Each answer is a **capture window** over the session's results. Results outside a window are discarded in memory: never shown, stored, graded or sent by the app. The session shuts down after **5 min** without a capture window, and when the app layout unmounts. Trade-off accepted by the owner: Safari's mic indicator stays on while the session is open, and Apple's recognizer hears the room during that time (Privacy Policy line in Slice 4). Other browsers keep the per-answer session (§4.1). |

## 3. Grading

### 3.1 Answer config — generated file + hand-written aliases

```ts
type OralAnswerType = 'single' | 'phrase' | 'enumeration';

interface OralAnswerConfig {
  type: OralAnswerType;
  alternatives: string[][];   // any-of; each inner array = parts, ALL required
  minKeywords?: number;       // phrase only: keywords required per part (explicit)
  mustInclude?: string[];     // keywords required regardless of minKeywords (negation, numbers)
  mustExclude?: string[];     // any of these in the transcript blocks `correct` (→ at best `near`)
}

// Q2:  { type: 'single',      alternatives: [['constitution']] }
// Q42: { type: 'single',      alternatives: [['president']], mustExclude: ['vice'] }
// Q102:{ type: 'phrase',      alternatives: [['after world war 1']], minKeywords: 3, mustInclude: ['1'] }
// Q16: { type: 'enumeration', alternatives: [['congress', 'president', 'courts']] }
// Q37: { type: 'single',      alternatives: [['keep powerful']] }   // generator override; "president" is in the question
// Q60: { type: 'phrase',      alternatives: [['powers not given federal government belong states']], minKeywords: 5, mustInclude: ['not'] }
```

Two files, merged at runtime by `getOralAnswerConfig(qid, location?)`:

- **`lib/n400/oral/oral-answer-config.generated.ts` — generated only.** `scripts/n400/build-oral-config.ts` (run with `npx tsx`) derives it for all 128 questions from `answersEn` + question text. Never hand-edited; re-running the script must reproduce it byte-for-byte. Committed and reviewed as one diff. The generator never produces aliases. Where the generator's `type` / `minKeywords` choice is wrong, fix the generator (per-question overrides live inside the script, each with a comment), not the output.
- **`lib/n400/oral/oral-aliases.ts` — hand-written.** Extra `alternatives` per question, each entry with a one-line reason and its own test. Aliases stay narrow: the taught answer's wording, not free paraphrase. An alias is **exact accepted** (`correct`); anything that merely resembles it is left to the engine's `near` rule and is never added as an alias to "fix" a near verdict.

  ```ts
  // Q4 — "self-government" is commonly explained as "people govern themselves"; `people` dropped by question-echo.
  4: [['govern themselves']],
  ```
- Keywords are content words only: articles, auxiliaries, fillers and optional qualifiers (`u s, united states, america, american, your`) are dropped at generation time.
- **Generator defaults:** not an enumeration and ≤ 3 keywords → `single` (all required); ≥ 4 keywords → `phrase` with `minKeywords = ⌈2n/3⌉`. Enumeration = the question asks for a count (`name|what are [the] two|three|four|five`) **and** the answer splits (on `,` / `and`) into exactly that many parts. Person-name questions (30, 38, 39, 57, 78, 83, 99, 105) → surname only. In a `phrase`, every number and negation keyword goes to `mustInclude` (rev 3.1: "after world war two" otherwise passed Q102 "After World War I" at 3 of 4 keywords). **Unit after a number (rev 3.2):** a `year`/`years` keyword directly after a number keyword is dropped, so the bare number is the answer (Q22 "six", Q25 "two"; Q36 already worked this way through question-echo).
- **Initial overrides (in the generator):** Q37 `keep powerful`; Q120 `new york` (taught answer "near New York city"); Q42–46 `mustExclude: ['vice']` (rev 3.1: "The Vice President" otherwise passed "The President").
- **Gate 1 overrides (rev 3.2, owner 2026-09-24):** Q35 `more people` (echo had left only `people`, so any answer containing "people" passed); Q2 and Q82 `mustExclude: ['father']` ("Father of the Constitution" passed "supreme law"); Q18 `mustExclude: ['president', 'courts']` and Q42–46 `mustExclude: ['vice', 'congress', 'courts']` (listing all three branches passed single-branch questions); Q102 `mustInclude: ['after', '1']` ("before world war one" passed).
- **Question-echo rule:** a keyword that appears in the question text is dropped from the answer's keywords, unless that would leave the part empty. (Rev 2: 14 answers overlap their question.) **Known echo exceptions: Q6 ("Rights of Americans" → `rights`) and Q76 ("War for American Independence" → `war independence`)** — every keyword is in the question, so reading the question aloud passes. Accepted limitation, pinned by test.
- **Negation:** negation words (`not, no, never, without, cannot, n't`) are never dropped by the normalizer or the generator. When the taught answer contains one, the generator puts it in `mustInclude`, so it is required even when `minKeywords` would otherwise be met without it (today only Q60 "Powers **not** given to the federal government belong to the states"). Everywhere else grading is negation-blind: a `not` in the transcript neither satisfies nor blocks anything. Known, accepted limitation.
- Location-based questions (Q23/29/61/62) build their config at runtime from the learner's answers via `correctAnswersFor()` in `quiz-engine.ts`, as `single` (person names → surname keyword; capitals → city name).

### 3.2 Engine — `lib/n400/oral/grade-oral.ts`

```ts
type OralVerdict = 'correct' | 'near' | 'wrong';
interface OralGrade { verdict: OralVerdict; matched: string[]; missing: string[] }
function gradeOralAnswer(transcript: string, config: OralAnswerConfig): OralGrade
```

Pure, deterministic, runs identically on client (practice) and server (mock).

1. **Normalize transcript:** lowercase; `n't` → ` not`, `cannot` → `can not`; strip `'s`; `world war i|one|1` → `world war 1` and `ii|two|2` → `world war 2`; strip punctuation (hyphens → spaces); `4th` → `4`; number and ordinal words → digits (`four hundred thirty five` → `435`, `fourteenth` → `14`); drop single-letter tokens (`D.C.` → `washington`); drop fillers/qualifiers (`day` is a filler, so "New Year, Thanksgiving, Christmas" passes Q126) with the same list the generator uses. Negation words are never dropped (§3.1).
2. **Word match = exact after stemming** (`courts ≡ court`, `writes ≡ write`, `laws ≡ law`). Nothing else counts as a match for `correct`.
3. **Near-match** = edit distance within the writing grader's thresholds. A near-match word counts **only toward `near`**, never toward `correct`.
4. **One-to-one within a part:** inside one part, each transcript word satisfies at most one keyword. Across parts a word may be reused ("north **and** south carolina" satisfies both Carolinas; "freedom of speech and religion" satisfies both freedoms).
5. Extra words and word order in the transcript are ignored.
6. **Per part:** `single` → all keywords; `phrase` → ≥ `minKeywords`; `enumeration` → every part, each part needing all its keywords when it has ≤ 3, else ⌈2k/3⌉. `mustInclude` keywords must match exactly; any `mustExclude` word in the transcript blocks `correct`.
7. **Verdict** (best across alternatives): `correct` if every part is satisfied with exact matches; `near` if all parts are satisfied only thanks to near-matches, or — for `single`/`phrase` — ≥ half of the keywords are matched counting near-matches, or — for `enumeration` (rev 3.2) — ≥ half of the **parts** are satisfied counting near-matches; else `wrong`. (Rev 3.2: counting keywords across an enumeration made one item `near` or `wrong` depending on word counts — Q10 "liberty" near, Q19 "senate" wrong, Q48 "secretary" with no department near.)

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
| 60 | Powers not given to the federal government belong to the states | powers not given to the federal government belong to the states | correct |
| 60 | Powers not given to the federal government belong to the states | powers given to the federal government belong to the states | **not correct** (missing `not`) |
| 76 | War for American Independence | (reads the question aloud) | correct — known echo exception |
| 102 | After World War I | after world war two | near |
| 42 | The President | the vice president | near |
| 81 | New York, New Jersey, North Carolina, South Carolina, Virginia | new york new jersey virginia north and south carolina | correct |
| 102 | After World War I | before world war one | near (rev 3.2: `after` required) |
| 22 | Six (6) years | six | correct (rev 3.2: unit optional) |
| 18 | Congress | congress, the president and the courts | near (rev 3.2: other branches excluded) |
| 19 | Senate and House of Representatives | senate | near (1 of 2 items) |
| 48 | Secretary of Education and Secretary of Energy | secretary | wrong (rev 3.2: no item fully named) |

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
  supported: boolean;             // API present AND not failed this session; false on server
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
- **Runtime support, not just feature detection.** `supported` starts as "API exists". If a `start()` fails with `service-not-allowed` / `not-allowed` before any audio (typical of in-app browsers that expose the API but block it), the hook maps it to `unavailable`, sets `supported=false` for the rest of the session (sessionStorage, try/catch) and the caller falls back to MC. `not-allowed` after a real permission prompt stays `not-allowed` (§8).
- `start()` only from a click/tap handler; one recognition instance at a time; `abort()` on unmount and on `visibilitychange` → hidden.
- `onend` **never grades.** With text → `transcript`. Without text → `error: 'no-speech'`. This is the same path whether the learner paused or iOS cut the session short — the app cannot tell those apart, so the learner decides from the visible transcript.
- `processing` covers the gap between the learner going quiet and the final result, so the button never says "Listening…" while nothing is being heard.
- Technical error details go to Sentry; the UI only shows friendly copy (§8).
- **Final result may arrive after `speechend`** (seen on Chrome): `processing` lasts until `onend`; the hook never treats `speechend` as "done".
- **Runtime-unavailable heuristic:** `service-not-allowed` always → `unavailable`. `not-allowed` arriving **< 500 ms after `start()` with no `audiostart`** → `unavailable` (no human answered a prompt that fast); otherwise `not-allowed`.
- **Stall detector (rev 3.3, Gate 0):** iOS WebKit can go "mic-dead": `audiostart` fires but `speechstart` never does, even while the learner talks. If no `speechstart` and no result arrive within **7 s** of `audiostart`, the hook aborts and reports `no-speech`. A **second consecutive** stall reports `stalled`. **Rev 3.5:** `stalled` switches the item (practice) or the rest of the test (mock) to the typed box with keyboard dictation. There is no reload advice: on iOS a reload doesn't restore the mic.
- **Persistent mode (rev 3.5, D15, iOS only):** `continuous = true`, `interimResults = true`, one session per app layout.
  - A mic tap opens a **capture window**. If no session is running, the tap also starts one. The window starts after every earlier result, except an unfinished one that began ≤ **1 s** before the tap (the learner's first words). Speech from earlier windows or from before the tap never enters an answer: `mustExclude` questions (Q2, Q18, Q42–46, Q82) would be hurt by extra words.
  - The window's transcript is its results joined. It closes when the learner taps Stop, **1.2 s** after all of its results are final, or at the **15 s** cap.
  - Stall: if no text arrives within **7 s** (counted from `audiostart` for a brand-new session), the window closes as `no-speech`. A session that has **never produced any text** is treated as deaf: its second silent window (by stall, Stop or cap) shuts it down and reports `stalled`. A session that has heard speech is never killed by silence. Only closed capture windows restart the 5-minute idle clock; question changes don't.
  - **Warm-up before 🔊 (rev 3.6, owner device test):** if 🔊 plays (`<audio>`) before any session exists, a session opened afterwards is deaf. So on iOS, when voice is available, every 🔊 in practice or in a voice mock first opens the session with no window (idle rules apply). This only happens once a voice answer has worked in this browser (localStorage `n400.oral.used`), so a learner who only does multiple choice never gets a mic permission prompt from 🔊. Audio still plays through `<audio>`: the owner rejected Web Audio for sound quality.
  - Tab hidden: nothing happens (WebKit keeps the session). Leaving a screen: close its window only. Idle **5 min** with no window: shut the session down. If the session ends by itself mid-window, the window closes with what it has; outside a window it ends silently, and the learner's screen is untouched.
- While listening, the mic button is a **Stop** button; a second tap never starts a second instance.

### 4.2 Panel — `components/n400/oral/MicAnswerPanel.tsx`

Mic button (with a subtle progress ring, no numeric countdown), live transcript, and the action row. Props select the variant:
- `practice`: `transcript` → [Chấm] [Nói lại]; after grading `near` → *"Có phải bạn nói X?"* [Đúng vậy] [Không].
- `mock`: `transcript` → *"App nghe được: …"* [Đúng vậy] [Nói lại]; retry count owned by the caller.

After "Đúng vậy" the transcript is **locked** — no editing, no re-speaking — and the only action is Next.

Renders inside the existing Civics card chrome (memory rule: Speaking/Writing/Civics screens reuse Civics UI).

- `typed` (rev 3.3, D12): a text input + [Chấm], same grading and feedback as `practice`; shown instead of the mic in in-app browsers.

### 4.3 First-use hint

Shown once (localStorage, try/catch), the first time the learner enters voice mode: ***"Nói đáp án bạn đã học. Không cần nói thành câu đầy đủ, chỉ cần có các từ chính."*** It must not suggest free paraphrase is accepted, because it isn't (D2).

## 5. Practice flow — `app/n400ready/(app)/practice/page.tsx`

- Toggle **[Trắc nghiệm | 🎤 Tự nói]** in the session header; choice persisted in `localStorage` (try/catch). Hidden when flag `voice_practice` is off, or when neither the mic nor the typed fallback applies (unsupported non-in-app browser). In in-app browsers the toggle stays and "Tự nói" uses the typed variant (D12).
- Voice body: question audio plays (existing audio), no options, `MicAnswerPanel variant="practice"`. Unlimited Nói lại before grading.
- Recording (`recordAnswer` in `user-state.tsx` gains an optional 4th param `answerMode: 'choice' | 'voice' = 'choice'`, written to `n400_quiz_attempts.answer_mode`):
  - `correct` / `wrong` → `recordAnswer(qid, wasCorrect, 'practice', 'voice')`.
  - `near` + "Đúng vậy" → shown correct, **no** `recordAnswer`.
  - `near` + "Không" → `recordAnswer(qid, false, 'practice', 'voice')`.
- Feedback after grading reuses the MC feedback (correct answer + 🔊), plus one line *"Bạn nói: <transcript>"* (typed: *"Bạn trả lời: …"*).
- No autoplay of question audio in voice mode: on iOS, playing audio and then opening the mic in quick succession is a known source of audio-session trouble. The existing 🔊 button stays.

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
- **Rev 3.4 additions (Slice 3 design):**
  - **Mixed items.** A question with no oral config for the learner's location (`getOralAnswerConfig` → null, e.g. Q62 for DC/territories) is answered by multiple choice inside the voice mock. The server accepts a `selected` option **only** for such questions, and checks it against the attempt's `slide_manifest`. Every other item must carry a transcript.
  - **Typed input in the mock.** It is used in in-app browsers (D12), and mid-test once the mic becomes unusable (`not-allowed`, `unavailable`, `stalled`). The remaining items then use a text box + [Xác nhận], because reloading would lose the mock's progress (no resume). Typed items have no retry limit and no "App nghe được" echo.
  - **Attempt `answer_mode`:** `'voice'` if any item was answered by mic, otherwise `'typed'`.
  - **Location:** the server grades with `n400_user_profile.state_code ?? 'TX'` and `district_number`, the same fallback the client uses for `settings.stateCode`.
  - **Transcript** is trimmed and capped at **500 characters** server-side.
  - **Answer shape:** `type VoiceMockAnswer = { qid; transcript; retried; input: 'mic' | 'typed' } | { qid; selected: 'A' | 'B' | 'C' | 'D' }`. There is still no verdict field.

**Invariant:** the client never sends a verdict. `was_correct` is computed only inside `finalizeVoiceMockAttempt`. Enforced by the `VoiceMockAnswer` type and a test; any future refactor that moves grading to the client violates this spec.

**Integrity note:** the transcript is produced client-side, so the server cannot prove it was spoken. Forging a passing transcript requires knowing the answers — the same bar as the MC mock, whose answer data also ships in the client bundle.

## 7. Data — migration `supabase/migrations/n400_32_voice_answers.sql`

- `n400_quiz_attempts.answer_mode TEXT NOT NULL DEFAULT 'choice' CHECK (answer_mode IN ('choice','voice','typed'))` (rev 3.3: `typed` for the in-app fallback, D12). Slice 2 ships this as `n400_32_voice_answers.sql`. Slice 3 adds `transcript` and the RPC in `n400_33_voice_mock.sql`.
- `n400_question_attempts.transcript TEXT NULL` — text only; no audio stored anywhere.
- `finalize_mock_attempt_voice_batch(p_attempt_id uuid, p_user_id uuid, p_answer_mode text, p_results jsonb)` (rev 3.4 signature) — `p_results = [{qid, was_correct, transcript}]`.
  - Rejects if the attempt's owner ≠ `p_user_id` or the attempt isn't a mock. The service-role client has no `auth.uid()`, so the owner check is explicit.
  - Rejects qids not in the manifest; inserts question attempts; sets `answer_mode` (`voice`|`typed`).
  - Scores through the shared core, and returns the same shape as `finalize_mock_attempt_batch`.
- **Rev 3.4:** `finalize_mock_attempt` checks `auth.uid()`, which is NULL for the service role. Its body therefore moves unchanged into an internal `n400_finalize_mock_core(p_attempt_id)` (no grants). `finalize_mock_attempt` becomes "owner check + core", with behavior identical for existing MC callers. Shipped as `n400_33_voice_mock.sql` together with the `transcript` column and the `voice_mock` flag seed. **`REVOKE EXECUTE … FROM PUBLIC, anon, authenticated; GRANT EXECUTE … TO service_role;`** — it trusts caller-supplied `was_correct`.
- Seed flag rows in `n400_feature_flags`: `voice_practice` + `voice_android` (Slice 2) and `voice_mock` (Slice 3), all seeded `enabled = FALSE`. Launch `rollout_pct` is chosen from actual weekly traffic at launch: if weekly voice-eligible users are few, start at 100% (a small % yields too little data to decide anything) and rely on the kill switch; otherwise ramp 10 → 25 → 50 → 100.

## 8. Errors

| Case | Learner sees | Mock retry consumed? |
|---|---|---|
| `no-speech` (incl. `onend` with no text) | "Mình chưa nghe thấy bạn nói. Hãy thử lại." | No |
| `not-allowed` | Practice → switch to MC + how-to-enable hint. Mock before start → MC; mid-test → hint, progress kept | No |
| `network` / `audio-capture` / `unavailable` | "Không thể nhận diện giọng nói lúc này. Hãy thử lại." (raw error → Sentry) | No |
| `stalled` (2nd consecutive mic-dead, rev 3.3/3.5) | Switch to the typed box: "Micro không dùng được lúc này. Các câu còn lại bạn trả lời bằng cách gõ (hoặc bấm 🎤 trên bàn phím)." No reload advice (rev 3.5) | No |
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

- **Rev 3.5 (D15):** on iOS the recognition session stays open between answers, so Apple's recognizer processes audio while voice mode is in use. The app discards everything outside a capture window in memory. The Privacy Policy (Slice 4) must say so.

Privacy Policy (EN/VI) gains a paragraph: voice answers are recognized by the browser's speech service (e.g. Google, Apple); N400Ready stores only the resulting text, never audio.

## 11. Testing

- `grade-oral.test.ts`:
  - all 128 taught answers grade `correct` against their own config (location-based with a fixture state/district);
  - every §3.3 reference case;
  - **cross-question matrix:** the set of (answer of Q_a → graded `correct` for Q_b) pairs, excluding identical answers, must equal a pinned, owner-reviewed allowlist. Most pairs are harmless supersets ("After the Civil War" contains "Civil War"); any new pair fails the test and needs review;
  - **question echo:** reading each question's own text aloud never grades `correct`, except the pinned exceptions Q6, Q76;
  - partial enumerations never grade `correct`; they grade `near` when at least half the items are named, else `wrong` (rev 3.2);
  - real-word substitutions (`institution`, `republican`, `senator` for `senate`) never grade `correct`;
  - Q60 without `not` never grades `correct`; a `not` added to any other answer changes nothing;
  - each alias in `oral-aliases.ts` grades `correct`; no alias duplicates a generated alternative;
  - number/filler/qualifier normalization; each alias.
- Generator determinism: re-running `scripts/n400-build-oral-config.mjs` reproduces `oral-answer-config.generated.ts` exactly (test fails on drift).
- `finalizeVoiceMockAttempt`: rejects another user's attempt; direct `rpc('finalize_mock_attempt_voice_batch')` as `authenticated` is denied; type-level check that `VoiceMockAnswer` has no verdict field.
- `use-speech-recognition`: the logic lives in a framework-free controller (`speech-controller.ts`) tested in node with a fake recognizer and fake timers (the repo's vitest has no DOM). Cover state transitions, `onend` with and without text, a final result after `speechend`, each error code, the unavailable heuristic, the stall detector (single and consecutive), the 15 s stop, abort, and no double start.
- `persistent-speech-controller` (rev 3.5): one session across windows (no second `start()` on the recognizer), results outside windows ignored, the window starts at the first non-final result, settle close after 1.2 s, Stop, the 15 s cap, a stall keeps the session, a second stall shuts it down with `stalled`, the session ending mid-window vs outside a window, the 5 min idle shutdown, reset keeps the session, shutdown releases it, and the instant-deny heuristic.
- Manual, required before merge: iPhone Safari (incl. permission denied, tab background, screen lock, app switch), Android Chrome, desktop Chrome, **Facebook in-app browser** (iOS + Android) — confirm correct show/hide; owner records ~10 real answers to sanity-check accuracy.
- Gate: `npm run type-check && npm run test && npm run build`.

## 12. Build order and gates

**Slice 0 — Device spike (throwaway, not merged).** A standalone test page using a minimal hook. Script per environment: answer 5 questions in a row, twice — first run starts from a fresh permission prompt, second run includes switching to another app and back mid-session.

| Environment | API present | Permission granted | Transcript returned | 2nd+ answer works without reload | Survives background | GO? |
|---|---|---|---|---|---|---|
| iPhone Safari | | | | | | |
| Android Chrome | | | | | | |
| Desktop Chrome | | | | | | |
| Facebook in-app iOS | | | | | | |
| Facebook in-app Android | | | | | | |

- **GO for an environment:** all 10 answers produce a transcript, no stuck state, no reload needed.
- Record the **share of N400Ready traffic from the Facebook in-app browser** (GA4) next to the matrix.
- **Slice 0 passes** when iPhone Safari, Android Chrome and desktop Chrome are GO. The Facebook rows decide the in-app strategy, chosen by the owner from:
  - (a) ship for Safari/Chrome; in-app browsers show "Mở trong trình duyệt để trả lời bằng giọng";
  - (b) keyboard-dictation fallback for in-app browsers;
  - (c) revisit server-side STT.
- If iPhone Safari or Android Chrome is NO-GO, stop and reassess the feature.

**Slice 1 — Grading:** generator + generated config (reviewed diff) + aliases + `grade-oral.ts` + full §11 grading suite. Gate: owner reviews the generated config diff and the suite passes.

**Slice 2 — Practice:** `Permissions-Policy` change (D13) + hook + `MicAnswerPanel` (mic + typed) + practice flow + first-use hint + `voice_practice`/`voice_android` flags + migration column `answer_mode`. Gate: manual device pass on iPhone Safari + desktop Chrome (GO environments) and the Facebook in-app typed fallback.

**Slice 3 — Mock:** migration `n400_33` (transcript, core refactor, voice RPC, `voice_mock` flag) + `finalizeVoiceMockAttempt` + mock flow (mic, typed, mixed MC items) + result rows. Gate: security checks (RPC denied to `authenticated`; another user's attempt rejected; MC mock unchanged) + manual device pass.

**Slice 4 — Rollout:** analytics event, Privacy Policy, flag rollout per §7.

## 13. Post-launch measurement

Weekly: voice vs choice correct-rate on the same questions, retry and no-speech rates from `n400_oral_answer`, plus the hand-labeled sample (§9). A large voice/choice gap driven by mishearing → turn the affected flag off.
