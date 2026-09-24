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
| 1 | iPhone Safari | Intro shows "Cách trả lời"; choose "Trả lời bằng giọng"; 20 items by voice; "App nghe được" on each; one Nói lại per item | |
| 2 | iPhone Safari | Mid-test app switch: stay on item, can speak again | |
| 3 | iPhone Safari | Deny mic mid-test → notice + remaining items typed; test finishes | |
| 4 | Desktop Chrome (Incognito) | Full voice mock; result rows show transcript + correct answer | |
| 5 | Facebook in-app iOS | Voice option → typed items; attempt answer_mode='typed' | |
| 6 | Any | Score counts: readiness/progress show the voice attempt; badge/streak update | |
| 7 | Any | DB: question rows carry transcript; attempt answer_mode='voice' | |
| 8 | Any (DC address, if available) | Q23/Q62 appear as multiple choice inside the voice mock | |

## Decision (owner)

- Gate 3 pass? <yes/no>
