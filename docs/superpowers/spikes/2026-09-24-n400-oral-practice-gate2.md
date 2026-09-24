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
| 10 | Facebook in-app iOS | Type answers on two questions in a row: the 2nd input starts empty | |
| 11 | Desktop Chrome | Mic set to "Block" in site settings: what does the learner see? (today: voice silently disappears, since an instant deny is classified `unavailable`) | |
| 12 | iPhone Safari | First use: wait >15 s on the permission prompts. What happens? | |
| 13 | Any (address in CA) | Q23: say "Schiff" slightly off → the prompt offers **Adam Schiff**, not Alex Padilla | |
| 14 | Desktop Chrome | Tap the mic and stay silent >7 s twice: shows "Micro đang không phản hồi" even though the mic is fine. Acceptable? | |

Android: not tested (owner accepted risk, D14); `voice_android` stays OFF.

## Decision (owner)

- Gate 2 pass? <yes/no>
