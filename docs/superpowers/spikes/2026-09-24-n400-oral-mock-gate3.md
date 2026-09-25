# N400 Oral Mock — Gate 3 device + security pass

**Spec:** docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md §12 (Slice 3, rev 3.4)
**Prereqs:** migration n400_33 applied; this slice deployed; `voice_mock` enabled for the tester.

## Security (automated / SQL)

| Check | Result |
|---|---|
| `finalize_mock_attempt_voice_batch` not executable by anon/authenticated; executable by service_role | ✅ 2026-09-24 (auth=f, anon=f, service_role=t) |
| `n400_finalize_mock_core` not executable by authenticated | ✅ |
| Another user's attempt rejected (RPC + `runVoiceFinalize` tests) | ✅ RPC `rejected: unauthorized`; unit tests pass |
| MC mock finalize unchanged (Task 1 step 4 `mc=1`) | ✅ |
| Page never grades (wiring test) | ✅ |

## Devices

| # | Environment | Check | Result |
|---|---|---|---|
| 1 | iPhone Safari | Intro shows "Cách trả lời"; choose "Trả lời bằng giọng"; 20 items by voice; "App nghe được" on each; one Nói lại per item | ✅ 2026-09-25 — first try: the choice never showed (hub `?start=1` skipped the intro) → fixed in rev 3.14 (968d57e2). Then a full 20-item voice mock was completed (device not recorded) |
| 2 | iPhone Safari | Mid-test app switch: stay on item, can speak again | Owner: "không thấy bug" (not itemized) |
| 3 | iPhone Safari | Deny mic mid-test → notice + remaining items typed; test finishes | Owner: "không thấy bug" (not itemized) |
| 4 | Desktop Chrome (Incognito) | Full voice mock; result rows show transcript + correct answer | Owner: "không thấy bug" (not itemized) |
| 5 | Facebook in-app iOS | Voice option → typed items; attempt answer_mode='typed' | Not run (no `typed` attempt in the DB) |
| 6 | Any | Score counts: readiness/progress show the voice attempt; badge/streak update | Owner: "không thấy bug" (not itemized); the attempt is stored as a completed mock (score 5, passed=false) |
| 7 | Any | DB: question rows carry transcript; attempt answer_mode='voice' | ✅ attempt 3de511c6: `answer_mode='voice'`, 20 question rows, 20/20 with transcript |
| 8 | Any (DC address, if available) | Q23/Q62 appear as multiple choice inside the voice mock | Not run |

## Grading audit (2026-09-25)

- Re-grading the 20 stored transcripts with `gradeOralAnswer` reproduces every stored verdict (5 correct; `near` counts as wrong in mock, D8).
- No recognizer miss in 20: for Q123 the owner really said "The star sprinkle" (owner, 2026-09-25).
- **Finding:** "I don't know", "I don't remember", "not sure" grade `near` on Q69/Q70, because the token `not` is one edit from the stem `vot` ("vote"). The mock is unaffected (near = wrong). Practice would ask "Có phải bạn nói: Vote…?" after an "I don't know". → Slice 4, Task 1.

## Decision (owner)

- Gate 3 pass: **yes** — owner 2026-09-25: "ok tốt không thấy bug, làm bước tiếp".
