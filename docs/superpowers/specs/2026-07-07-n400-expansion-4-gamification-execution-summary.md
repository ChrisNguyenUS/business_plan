# N400 Expansion — Plan 4 Execution Summary (Gamification v2)

**Ngày:** 2026-07-07

## Trạng thái: Badge system + Progress page đều đã xong

## Deviation quan trọng so với plan gốc

Plan 4 gốc (`docs/superpowers/plans/2026-07-07-n400-expansion-4-gamification.md`) đề xuất build một hệ thống badge **hoàn toàn mới, riêng biệt** (`badge-definitions.ts` tự auto-load PNG + parse điều kiện bằng string matching, `badge-evaluator.ts` ghi thẳng từ client vào bảng `n400_badge_awards`).

Khi bắt đầu thực thi, phát hiện ra: **repo đã có sẵn một hệ thống badge production-grade từ Phase 6B** (`src/lib/n400/badges/`) — catalog DB-backed (`n400_badges` + `n400_user_badges`), registry + evaluator-per-nhóm pattern, dispatcher chạy server-side qua service-role client (bảo mật: client không tự cấp badge cho mình được), `verify-badges.ts` kiểm tra tính nhất quán. Plan 4 gốc nếu làm đúng như viết sẽ tạo ra **2 hệ thống badge song song, xung đột nhau** (và badge-evaluator.ts của plan gốc ghi vào bảng `n400_badge_awards` — bảng này không tồn tại, tên đúng là `n400_user_badges`).

User đã xác nhận hướng đi: **xoá sạch 24 badge cũ, thay bằng toàn bộ 56 badge mới**, dùng đúng kiến trúc production-grade sẵn có thay vì xây hệ thống song song của plan gốc.

## Đã làm (Tasks 1–7, tự quản lý qua TaskCreate/TaskUpdate)

1. **Migration `n400_13_badges_v2.sql`** — áp trực tiếp qua Supabase MCP vào project `ffsrlmtqzlidnuitkdvw`:
   - Xoá 24 badge cũ (cascade xoá luôn `n400_user_badges` — mọi badge đã earned bị reset, đây là "full reset" có chủ đích)
   - Thêm cột `is_secret`, mở rộng `group_code` CHECK thành 9 nhóm: streak/civics/writing/yesno/whatmean/combo/practice/other/secret
   - Seed 56 badge mới (folder "New badges" có 57 file nhưng "Perfect Streak (Secret).png" trùng lặp với "Perfect Streak.png" — user tự xoá file thừa, catalog còn 56)
   - Bảng mới `n400_section_mock_results` (user_id, section writing|speaking, passed, score, total) — vì bài Thi thử Viết/Speaking (Plan 3) trước đây hoàn toàn client-side, không có bản ghi nào để badge cross-section (vd "Interview Master") đọc được.
2. **56 PNG** copy + rename từ `New badges/` sang `public/images/n400/badges/<slug>.png`; xoá 24 PNG cũ orphaned.
3. **8 evaluator group mới** (thay thế mock-test.ts/coverage.ts/volume.ts/category.ts cũ): `civics.ts`, `writing.ts`, `yesno.ts`, `whatmean.ts` (3 sau dùng chung helper `section-progress.ts` theo Rule of Three), `combo.ts`, `practice.ts`, `other.ts`, `secret.ts` (dùng chung helper `timeline.ts` cho các badge cần dữ liệu theo thời gian — streak đúng liên tiếp, N câu/ngày, giờ trong ngày). `streak.ts` giữ nguyên. 64 test mới, tất cả pass.
4. **`registry.ts` + `evaluator.ts`** — đăng ký 9 nhóm; `pickSlugs()` đơn giản hoá vì phần lớn badge v2 là cross-section (chạy full registry mỗi `session_complete`/`manual_recompute`, chỉ còn fast-path riêng cho `streak_change`).
5. **Wiring đánh giá badge vào mọi luồng ghi điểm:**
   - `recordSectionAnswer` (whatmean/yesno/writing daily practice) — trước đây **không** chạy badge eval ("deferred to gamification phase" — comment cũ), giờ dùng đúng heuristic như civics (`recordAnswer`).
   - `recordSectionMockResult` (mới) — ghi kết quả Thi thử Viết/Speaking vào `n400_section_mock_results` + chạy eval, wire vào `mock-test/viet` và `mock-test/speaking`.
6. **UI:** `BadgeGallery`/`use-badges` cập nhật 9 group code + `is_secret` (badge bí mật hiện "???" cho tới khi mở khoá); `next-badge.ts` remap sang slug mới; `verify-badges.ts` cập nhật roster 56 badge — **đã chạy live** against DB, tất cả pass (catalog 56 rows, PNG đủ, evaluator registry khớp catalog 1-1).
7. **Verification gate:** `type-check` sạch, 209/209 test pass, `build` thành công.

## Đã làm thêm — Progress page (`/n400app/progress`)

- 4 `StatsCard` (Civics/What Mean/Yes-No/Viết — số câu thuộc, % mastery, số câu đã làm) dùng lại `Card`/`ProgressBar` sẵn có + `BadgeGallery` sẵn có (không đổi component).
- **Đổi tên khác plan gốc:** plan gốc gọi route này "Tiến độ" — nhưng sidebar đã có sẵn mục "Tiến độ học tập" trỏ tới `/statistic` (heatmap + category breakdown). Đặt trùng tên sẽ gây nhầm lẫn UX thật sự, nên route mới đặt tên **"Huy hiệu & Thành tích"**, thêm vào nhóm Secondary nav ngay dưới "Tiến độ học tập".
- Không tạo `layout.tsx` riêng — theo đúng pattern của `/profile` và `/statistic` (dùng layout n400app gốc có sidebar, không phải layout "immersive" ẩn chrome như `/writing`).

## CHƯA làm (nằm trong Plan 4 gốc, KHÔNG nằm trong yêu cầu ban đầu của user)

- Toast "🎉 Huy hiệu mới!" khi unlock — hiện chỉ wire cho civics (`practice/page.tsx` dùng `BadgeUnlockToast` sẵn có). 3 trang whatmean/yesno/writing đã trả về `unlockedBadges` từ `recordSectionAnswer` nhưng chưa hiển thị toast (badge vẫn được ghi nhận, chỉ là user không thấy thông báo ngay — sẽ thấy ở lần vào `/progress` tiếp theo).

## Quyết định kỹ thuật đáng chú ý (đã cân nhắc, không phải thiếu sót)

- **`practice-high-score`/`practice-excellence`/`practice-perfect-round`** chỉ tính trên các phiên có dạng "mock test" thật (civics `n400_quiz_attempts` mode=mock_test hoặc `n400_section_mock_results`) — vì `practice`/`flashcard` mode ghi 1 row/1 câu trả lời (không có khái niệm "phiên" trong schema), không thể tính "≥90% trong 1 buổi luyện tập" theo nghĩa đen.
- **`practice-mock-champion`** ("Pass 10 mock tests") tính tổng cả 3 loại thi thử (Civics + Viết + Speaking), không chỉ Civics như hệ thống cũ.
- **Secret badge giờ giấc** (`secret-early-bird`/`secret-night-owl`) so giờ UTC của `answered_at`, không phải giờ địa phương — schema không lưu timezone user.

## Tham chiếu

- Plan 4 gốc: `docs/superpowers/plans/2026-07-07-n400-expansion-4-gamification.md`
- Migration: `apps/website/supabase/migrations/n400_13_badges_v2.sql`
- Evaluator groups: `apps/website/src/lib/n400/badges/evaluators/`
