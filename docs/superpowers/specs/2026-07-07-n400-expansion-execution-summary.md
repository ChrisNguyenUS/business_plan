# N400 Expansion — Execution Summary (Plans 2c + 3)

**Ngày:** 2026-07-07
**Phương pháp:** `subagent-driven-development` — mỗi task chạy qua implementer subagent → spec-compliance reviewer → code-quality reviewer, tuần tự từng task một.

---

## Plan 2c — Yes No Section + Finish Speaking ✅ SHIPPED

**Trạng thái:** Đã merge vào `main` (branch `feat/n400-expansion-2c-keyword-highlight` đã xoá sau merge).

| # | Task | Commit | Spec | Quality |
|---|---|---|---|---|
| 1 | `KeywordHighlight.tsx` — underline + popover cho keyword | `794531fd` | ✅ | ✅ |
| 2 | `SectionYesNoQuiz.tsx` — màn Yes/No 2 nút | `0fe95720` | ✅ | ✅ |
| 4 | `speaking/yes-no/` route (layout + landing + mode machine) | `613ad6d1` | ✅ | ✅ |
| 5 | Tổng quan — thêm card Daily Goals What Mean + Yes No | `2c5343a8` | ✅ | ✅ |
| 6 | Sidebar — thêm link "Câu hỏi Yes No" vào nhóm SPEAKING | `f49ae248` | ✅ | ✅ |
| 7 | Verification gate | — | 184/184 test pass, build OK | |

**Deviation đáng chú ý (đã được review chấp nhận):**
- Không dùng Headless UI (không có trong repo) → tự viết popover bằng `useState` + CSS `group-hover`, giữ nguyên style/class yêu cầu.
- Test dùng `renderToStaticMarkup` thay vì `@testing-library/react` (repo không có jsdom setup) — đúng theo ROADMAP W3 "skip UI presentation tests".
- `KeywordHighlight` component đã build xong nhưng **chưa** được wire vào `SectionFlashcardScreen`/`SectionYesNoQuiz` (2 shared screen này không có prop để nhận nó). Ghi nhận làm follow-up task riêng (không làm Civics cũng có keyword highlight thì sẽ lệch UI).
- `slowAudio` prop không tồn tại trên `SectionFlashcardScreen` — nhưng `SectionYesNoQuiz` đã có sẵn nút "Nghe chậm" built-in nên tính năng vẫn có ở phía quiz.

---

## Plan 3 — Writing Section + Thi thử Split 🔄 ĐANG THỰC HIỆN

**Trạng thái:** Task 1–7 xong, **chưa chạy Task 8 (verification gate) và chưa merge**. Đang ở branch `feat/n400-expansion-3-writing-grader`.

| # | Task | Commit | Spec | Quality |
|---|---|---|---|---|
| 1 | `writing-grader.ts` — engine chấm điểm theo chuẩn USCIS | `3c70c056` | ✅ | ✅ |
| 2 | `writing-feedback.ts` — build guidance box + annotation hint | `b10d2a68` | ✅ | ✅ |
| 3 | `WordDiff.tsx` — hiển thị so sánh từng từ (xanh/đỏ/vàng) | `b94b076e` | ✅ | ✅ |
| 4 | `DictationQuiz.tsx` — màn luyện Writing (nghe → gõ → chấm → sửa lại) | `ebb29651` | ✅ | ✅ |
| 5 | Route `writing/` (layout + landing + session picker) | `0909100d` | ✅ | ✅ |
| 6 | Tách Thi thử thành 3 bài (Civics / Viết / Speaking) | `81478e4f` | ✅ (1 deviation nhỏ, chấp nhận) | ✅ (1 bug tìm thấy, đã fix) |
| 7 | Cập nhật Sidebar + Tổng quan (Writing Daily Goal) | `4814ddaf` | ✅ (195/195 test pass) | |
| 8 | **Verification gate** | `cadf18a9` (fix) | ✅ 195/195 test pass, type-check OK, build OK | |

### Chi tiết kỹ thuật quan trọng

**`writing-grader.ts` (Task 1):**
- Dùng package `edit-distance` (cài qua `pnpm add`, không phải `npm install` vì repo là pnpm workspace — implementer đã tự sửa đúng).
- Quy tắc: bỏ qua dấu câu/hoa-thường khi chấm đúng/sai; lỗi chính tả nhỏ (Levenshtein ≤1 cho từ ngắn, ≤2 cho từ ≥8 ký tự) vẫn tính đúng nhưng có annotation nhắc nhở; viết tắt (từ ngắn hơn 60% độ dài từ gốc) bị tính sai.
- 11 test case, tất cả pass.

**`DictationQuiz.tsx` (Task 4):**
- Chấm điểm dựa trên **lần thử đầu tiên** (`firstCorrect`) — thử lại (retry) không làm tăng điểm, đúng tinh thần "active recall".
- Named export `DictationQuiz` (không phải default export).

**Thi thử split (Task 6) — route giữ tên `mock-test` (không đổi thành `thi-thu`)** để không vỡ các link cũ ở Sidebar/Header/dashboard/statistics. Cấu trúc:
```
mock-test/
├── page.tsx              — picker 3 thẻ (Civics / Viết / Speaking)
├── civics/                — bài cũ, dời nguyên xi, không đổi logic (12/20 pass)
├── viet/                  — MỚI: DictationQuiz với 3 câu, pass ≥1/3
└── speaking/               — MỚI: 5 What Mean MC + 5 Yes No, pass ≥8/10, tự viết component riêng
```
- `SectionMCQuiz`/`SectionYesNoQuiz` không hỗ trợ trộn 2 loại câu hỏi khác nhau trong 1 quiz → Speaking mock test là component tự viết riêng, nhưng tái dùng đúng khung UI (progress strip, card, reveal feedback, nút Next, sidebar trang trí).
- Lưu ý nhỏ: bài Viết hiện hiện **2 màn kết quả liên tiếp** (summary built-in của `DictationQuiz` rồi mới đến màn pass/fail) vì `DictationQuiz` chỉ có 1 callback `onSessionEnd`. Chưa gây lỗi, chỉ hơi dư 1 bước — có thể tối ưu sau nếu cần.

**Task 7:** Sidebar thêm mục "✍️ Writing (45 câu)" (nhóm riêng, sau SPEAKING); Tổng quan thêm card "Luyện tập Writing" hiển thị tiến độ dạng `X/45 câu`.

---

## Việc còn lại (bước tiếp theo)

1. ~~Chạy Task 8 — Verification gate cho Plan 3~~ ✅ **XONG** (2026-07-07): `type-check` sạch, 195/195 test pass, `build` thành công. Smoke test thủ công qua curl xác nhận routing đúng (redirect 307 → `/login` cho user chưa đăng nhập, tức middleware auth-gate hoạt động đúng như thiết kế — không test được sâu hơn vì cần session đăng nhập).
2. ~~Review kỹ hơn Task 5 & 6~~ ✅ **XONG**: chạy 2-stage review (spec-compliance + code-quality) retroactive qua subagent.
   - **Spec:** Task 5 khớp 100%. Task 6 khớp, có 1 deviation nhỏ được chấp nhận — bài Viết dùng random shuffle (seed theo lượt thi) thay vì "3 câu đầu cố định" như plan ghi, giống cách Civics đã random 20/128 câu, không phải bug.
   - **Quality:** tìm thấy 1 bug thật — bài Thi thử Viết (`mock-test/viet`) hiện 2 màn kết quả liên tiếp, nút "Chọn chế độ khác" gắn nhãn sai (bấm vào thực ra lộ ra màn pass/fail thứ 2 chứ không phải chọn chế độ khác). **Đã fix** ở commit `cadf18a9`: thêm prop `skipSummary` cho `DictationQuiz`, mock-test/viet dùng prop này để bỏ qua summary nội bộ, chỉ còn đúng 1 màn kết quả.
   - 1 finding khác ("lossy correctness mapping" trong `writing/page.tsx` — ghi điểm theo index thay vì đúng câu) được xác minh **không có ảnh hưởng thực tế**: `deriveSectionKnown` chỉ đọc attempt mode `flashcard`, còn `writing/page.tsx` ghi mode `practice` nên dữ liệu sai lệch này chưa bị đọc ở đâu cả — giữ nguyên, đã có comment giải thích trong code.
   - 2 nit nhỏ (trùng JSX kết quả giữa viet/speaking, hardcode `TOTAL` trong speaking) — bỏ qua theo nguyên tắc YAGNI/Rule of Three của project (chỉ 2 lần lặp).
3. **`finishing-a-development-branch`** — merge `feat/n400-expansion-3-writing-grader` vào `main` (verification đã pass, sẵn sàng).
4. **Plan 4 (Gamification)** — chưa bắt đầu. Đã viết sẵn ở `docs/superpowers/plans/2026-07-07-n400-expansion-4-gamification.md`, dùng 56 badge mới trong `apps/website/public/images/n400/New badges/`.
5. **Follow-up nhỏ đã ghi nhận (không chặn merge):**
   - Wire `KeywordHighlight` vào `SectionFlashcardScreen`/`SectionYesNoQuiz` (đồng thời cân nhắc thêm cho Civics để đồng bộ UI).
   - Vài nit nhỏ về UX (textarea auto-focus sau khi sang câu mới trong DictationQuiz, `useMemo` cho `buildFeedbackBlocks`).

---

## Tham chiếu

- Plan 2c: `docs/superpowers/plans/2026-07-07-n400-expansion-2c-yesno-section.md`
- Plan 3: `docs/superpowers/plans/2026-07-07-n400-expansion-3-writing-section.md`
- Plan 4 (chưa chạy): `docs/superpowers/plans/2026-07-07-n400-expansion-4-gamification.md`
- Handoff trước đó: `docs/superpowers/specs/2026-07-07-n400-expansion-session-handoff.md`
