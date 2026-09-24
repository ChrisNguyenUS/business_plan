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
