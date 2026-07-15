# N400app — Redesign màn Tiến Độ (Progress)

**Date:** 2026-07-15
**Status:** Approved design, pending implementation plan
**Scope:** `apps/website` — khu Tiến độ (`/n400app/progress`, `/n400app/statistic`) + engine `readiness.ts` mới. Không thay đổi database schema.

## 1. Vấn đề

Khu Tiến độ hiện tại (2 tab `Thống kê` / `Thành tích`) track thông tin cũ và chia sai chỗ cắt:

- Tab Thống kê gần như 100% Civics: coverage /128, mock trend chỉ Civics, category accuracy chỉ Civics. Mock Viết/Speaking (đã lưu trong `n400_section_mock_results`) không hiển thị ở đâu.
- Heatmap "Hoạt động học tập" chỉ đếm `state.attempts` (Civics) — học What Mean / Yes-No / Viết không hiện lên lịch.
- Empty state gate trên `totalAnswered === 0` (Civics) — user chỉ học Viết vẫn bị báo "Chưa có dữ liệu".
- `BadgeGallery` render ở CẢ trang Tài khoản lẫn tab Thành tích — lặp feature 100%.
- Cặp tab "Thống kê / Thành tích" chia theo loại số liệu (góc nhìn dev), không theo nhu cầu user; data lặp giữa 2 tab (coverage vs StatsCard).

## 2. Mục đích màn hình

Khu Tiến độ trả lời đúng 3 câu hỏi, mỗi câu trả lời kèm hành động tiếp theo:

1. **"Khi nào mình sẵn sàng phỏng vấn?"** → hero readiness
2. **"Mình yếu ở đâu?"** → kỹ năng yếu + danh mục yếu + câu sai chưa ôn
3. **"Mình có tiến bộ không?"** → trend thi thử + streak + heatmap hoạt động

## 3. IA & Routes

- Giữ 2 tab, đổi theo **độ sâu thông tin**: **Tổng quan** (mặc định, trả lời trong 5 giây, 1 màn mobile không cuộn) và **Chi tiết** (đào sâu, được phép cuộn).
- Mỗi số liệu chỉ sống ở đúng MỘT tab. Không lặp.
- Routes giữ nguyên 2 URL hiện có: `/progress` = Tổng quan (canonical), `/statistic` = Chi tiết. Chỉ đổi nội dung + label trong `ProgressTabs`.
- `Sidebar.tsx`: entry "Tiến độ" đổi href `statistic` → `progress`.
- `hero-recommendation.ts:204`: secondary CTA "Xem tiến độ" đổi href `/statistic` → `/progress`.
- **Badges rời hẳn khu Tiến độ**: xoá `BadgeGallery` khỏi `progress/page.tsx`; badges sống duy nhất ở Tài khoản. Tiến độ chỉ còn chip `🏅 x/56` link sang Tài khoản.

## 4. Tab Tổng quan (`/progress`)

Mục tiêu: vừa đúng 1 màn mobile, không cuộn (theo no-scroll rule của các hub).

```
┌─────────────────────────────┐
│ [Tổng quan] [Chi tiết]      │
│ ╭───╮ Sẵn sàng phỏng vấn    │
│ │72%│ Đạt 3/5 điều kiện     │
│ ╰───╯ Việc tiếp theo:       │
│  📝 Đậu mock Civics 2 lần   │
│  [ Thi thử ngay → ]         │
├─────────────────────────────┤
│ KỸ NĂNG (1 card, 4 hàng)    │
│ 📚 Civics    ▓▓▓▓░ 102/128  │
│ 📖 What Mean ▓▓░░░  30/62 ⚠️│
│ 🎤 Yes/No    ▓▓▓░░  25/37   │
│ ✍️ Viết      ▓▓▓▓░  40/45   │
├─────────────────────────────┤
│ 🔥 5 ngày · 🏅 23/56 · 📝 ✓ │
└─────────────────────────────┘
```

- **Hero readiness**: vòng % + "Đạt x/5 điều kiện" + MỘT điều kiện thiếu ưu tiên nhất làm CTA. Không liệt kê cả 5 (xem tab Chi tiết).
- **Card Kỹ năng**: MỘT card duy nhất, 4 hàng (Civics · What Mean · Yes/No · Viết), thay 4 StatsCard rời hiện tại. Mỗi hàng: icon + tên + mini progress bar + `thuộc x/y`. Hàng yếu nhất gắn ⚠️ — điều kiện: accuracy thấp nhất VÀ đủ evidence theo ngưỡng có sẵn `NEEDS_PRACTICE_MIN_ATTEMPTS`/`NEEDS_PRACTICE_MAX_ACCURACY` (study-modules.ts). Tap hàng → hub kỹ năng tương ứng.
- **Hàng chip**: 🔥 streak hiện tại · 🏅 badges đạt/tổng (link Tài khoản) · 📝 mock gần nhất đạt/trượt (link tab Chi tiết).
- Empty state (chưa có bất kỳ attempt nào ở CẢ 4 kỹ năng): hero hiện 0% + CTA "Bắt đầu học Civics" — không chặn cả trang.

## 5. Engine `readiness.ts` (pure module mới, `src/lib/n400/`)

5 điều kiện, mỗi điều kiện đóng 20% vào vòng %, có điểm phần (partial credit = `min(progress/threshold, 1) × 20`) để ring tăng mượt:

| # | Điều kiện | Nguồn signal (tái dùng, KHÔNG tính lại) |
|---|---|---|
| 1 | Thuộc ≥80% Civics (103/128) | `stats.mastered` (user-state) · ngưỡng dùng chung `FIRST_MOCK_MIN_PERCENT = 80` |
| 2 | Đậu 2 bài mock Civics gần nhất liên tiếp | `state.mockResults` |
| 3 | Thuộc ≥80% What Mean (50/62) | `deriveSectionKnown` |
| 4 | Thuộc ≥80% Yes/No (30/37) | `deriveSectionKnown` |
| 5 | Đậu mock Viết (ít nhất 1 lần) | `state.sectionMockResults` (load mới, xem §7) |

- **"Việc tiếp theo"** = điều kiện chưa đạt ĐẦU TIÊN theo thứ tự trên (nền tảng trước, thi thử sau). CTA dùng deep link có sẵn: `/flashcards?filter=unknown`, `/mock-test`, `/speaking/what-mean`, `/speaking/yes-no`, `/writing`. Không tạo flow mới.
- API: `deriveReadiness(signals): { percent: number; met: ReadinessCriterion[]; unmet: ReadinessCriterion[]; next: ReadinessCriterion | null }`. Pure function, kèm `readiness.test.ts` theo pattern test của các module lib khác.
- Partial credit của điều kiện 2: 0 mock đậu = 0%, 1 mock đậu gần nhất = 50%. Điều kiện 5: nhị phân (0 hoặc 100%).

### Hài hoà 3 engine (không chồng vai)

| Bề mặt | Engine | Tầm nhìn |
|---|---|---|
| Dashboard hero | `hero-recommendation.ts` (ladder 7 bậc) | Khoảnh khắc — "làm gì NGAY BÂY GIỜ" |
| Study tip | `buildStudyTip` (study-modules.ts) | Phiên học — "học gì trước trong module" |
| Tiến độ | `readiness.ts` (mới) | Hành trình — "còn thiếu điều kiện gì tới đích" |

Ràng buộc: chung signal helpers (`deriveSectionKnown`, `stats.mastered`, `moduleAccuracy`…), chung ngưỡng (`FIRST_MOCK_MIN_PERCENT`), chung deep links. Hero Tiến độ KHÔNG gợi ý kiểu "hôm nay làm gì" (việc của Dashboard). Việc thêm bậc "readiness complete 🎉" vào Dashboard hero: ngoài scope, để sau.

## 6. Tab Chi tiết (`/statistic`)

Thứ tự dọc, được phép cuộn:

1. **Checklist sẵn sàng đầy đủ** — 5 điều kiện ✓/✗ từ `deriveReadiness` (bản mở rộng của hero).
2. **Thi thử** — chart trend mock Civics (tái dùng chart hiện có) + 2 hàng kết quả gần nhất của mock Viết và mock Speaking (đạt/trượt + ngày). Empty → CTA `/mock-test`.
3. **Yếu ở đâu** — độ chính xác theo danh mục Civics (tái dùng) + mỗi kỹ năng có "N câu sai chưa ôn" với CTA `?start=wrongs` (dùng `lastWrongQuestionIds`/`lastWrongSectionItemIds` có sẵn).
4. **Hoạt động** — heatmap 5 tuần, sửa `buildHeatGrid` để đếm CẢ `state.attempts` + `state.sectionAttempts`.

**Xoá bỏ (không lặp):** hàng 5 KPI card (accuracy/coverage/correct đã nằm trong card kỹ năng + checklist), "Tiến độ theo danh mục" (trùng vai với category accuracy), `BadgeGallery`.

## 7. Data fixes (không đổi schema)

- **Load `n400_section_mock_results` vào `N400State`** (field mới `sectionMockResults: SectionMockResult[]`): bảng đã tồn tại (migration `n400_13_badges_v2.sql`), hiện chỉ ghi cho badges mà không đọc. Thêm 1 SELECT trong loader của `user-state.tsx` (limit gần nhất ~50, order `completed_at`). KHÔNG tạo bảng/cột mới, không migration.
- Empty state xét `attempts.length + sectionAttempts.length === 0`.
- `buildHeatGrid` nhận thêm section attempts (chỉ cần mảng `{ at: string }` — signature hiện tại đã generic đủ).

## 8. Ràng buộc kiến trúc (lean)

- **DB:** zero migration. Chỉ đọc bảng có sẵn.
- **Logic:** toàn bộ derivation mới nằm trong MỘT pure module `readiness.ts` + test. Không context/provider mới, không dependency mới, không chart lib.
- **UI:** tái dùng `Card`, `ProgressBar`, `ProgressTabs`, chart mock hiện có. Component mới tối đa 2 file trong `components/n400/progress/`: `ReadinessHero.tsx`, `SkillsCard.tsx`. `StatsCard.tsx` xoá sau khi thay thế.
- **Xoá > Thêm:** bỏ BadgeGallery khỏi progress, bỏ 5 KPI cards, bỏ khối "Tiến độ theo danh mục", bỏ StatsCard ×4.

## 9. Testing

- `readiness.test.ts`: percent 0/partial/100, thứ tự `next`, điều kiện 2 (liên tiếp vs không liên tiếp), điều kiện 5 nhị phân.
- Cập nhật test hiện có nếu chạm: `hub-progress`, heatmap helper (nếu tách ra pure function thì thêm test).
- Manual: mobile viewport — tab Tổng quan không cuộn ở 390×844.
