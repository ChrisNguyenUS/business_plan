# 🏆 N400 Badge Definitions — Tracking

**Ngày tạo:** 2026-07-06 · **Nguồn:** đề xuất Badge System của owner + đối chiếu hệ badge đang chạy (`apps/website/src/lib/n400/badges/registry.ts`).

**Cách đọc trạng thái:**
- ✅ **Có sẵn** — badge đang chạy, dùng lại slug hiện tại, không build gì.
- 🆕 **Cần build** — badge mới: INSERT vào `n400_badges` + thêm evaluator.
- ⚠️ **Chờ quyết định** — điều kiện chưa định nghĩa sạch hoặc thiếu dữ liệu tracking.
- ❌ **Bỏ** — trùng badge khác.

**Quy ước "Complete câu X":** câu được tính là hoàn thành khi user **trả lời đúng ít nhất 1 lần** trong bất kỳ mode nào của section đó. Riêng What Mean / Yes No, đánh dấu "Đã thuộc" trên flashcard cũng tính. Writing = gõ đúng cả câu (theo grading rules USCIS trong spec).

**Quy ước Legendary ≥95%:** hoàn thành **toàn bộ** bộ câu của section VÀ accuracy tích lũy của section (tổng câu đúng / tổng lượt trả lời) ≥ 95%.

---

## 1. 🎯 Civics Progress (5)

Theme: xanh dương đậm / lá cờ. Đếm số flashcard civics hoàn thành (đúng ≥1 lần hoặc "đã thuộc").

| Trạng thái | Slug | Badge | Icon | Điều kiện |
|---|---|---|---|---|
| 🆕 | `civics-first` | Freedom Begins | 🗽 | Hoàn thành flashcard civics đầu tiên |
| 🆕 | `civics-10` | Study Habit | 📖 | 10 / 128 câu civics |
| 🆕 | `civics-30` | Keep Going | 🚶 | 30 / 128 câu civics |
| 🆕 | `civics-50` | American Spirit | 🎆 | 50 / 128 câu civics |
| 🆕 | `civics-100` | Century Milestone | 💯 | 100 / 128 câu civics |

> Ghi chú: đã có `all-128-answered` (coverage) làm nấc "phủ hết 128 câu" — chuỗi này là các nấc trung gian dẫn tới nó, không trùng.

## 2. 🔥 Daily Streak (6) — DÙNG LẠI TOÀN BỘ

| Trạng thái | Slug | Badge | Điều kiện |
|---|---|---|---|
| ✅ | `streak-3` | 3-Day Streak | Học 3 ngày liên tiếp |
| ✅ | `streak-7` | 7-Day Streak | Học 7 ngày liên tiếp |
| ✅ | `streak-14` | 14-Day Streak | Học 14 ngày liên tiếp |
| ✅ | `streak-30` | 30-Day Streak | Học 30 ngày liên tiếp |
| ✅ | `streak-60` | 60-Day Streak | Học 60 ngày liên tiếp |
| ✅ | `streak-100` | 100-Day Streak | Học 100 ngày liên tiếp |

## 3. 🎯 Practice Achievement (8 đề xuất → 5 build, 2 dùng lại, 1 bỏ, 1 hoãn)

| Trạng thái | Slug | Badge | Điều kiện |
|---|---|---|---|
| ❌ Bỏ | — | Daily Focus | Trùng 100% với `streak-7` |
| 🆕 | `practice-high-score` | High Score | ≥90% trong 1 phiên Luyện tập (bất kỳ section) |
| 🆕 | `practice-excellence-10` | Excellence | ≥90% trong 10 phiên Luyện tập |
| ⚠️ Hoãn | — | Breakthrough | "Cải thiện điểm tuần +20%" — chưa định nghĩa được sạch (mốc so sánh, phiên nào tính); cân nhắc lại sau khi có dữ liệu sử dụng |
| 🆕 | `correct-streak-100` | Perfect Accuracy | 100 câu đúng LIÊN TIẾP (khác `correct-answers-100` có sẵn — cái đó là tích lũy) |
| ⚠️ | `bookmark-review-50` | Long-Term Memory | Ôn lại 50 thẻ đã bookmark — app chưa log sự kiện "xem thẻ"; đề xuất đổi thành *trả lời đúng 50 lượt trên các câu đã bookmark* (trackable từ attempts) |
| ✅ | `mock-pass-first` | Exam Ready | Đạt chuẩn pass 1 bài Thi thử Civics (badge có sẵn) |
| ✅ | `mock-high-score` | Future Citizen | Thi thử Civics ≥90% (badge có sẵn) |

## 4. ✍️ Writing (6) — Theme: tím / bút & sổ

| Trạng thái | Slug | Badge | Icon | Điều kiện |
|---|---|---|---|---|
| 🆕 | `writing-first` | First Sentence | ✏️ | Hoàn thành câu Writing đầu tiên |
| 🆕 | `writing-10` | Young Writer | 🖊️ | 10 / 45 câu |
| 🆕 | `writing-20` | Sentence Builder | 📄 | 20 / 45 câu |
| 🆕 | `writing-35` | Skilled Writer | 📜 | 35 / 45 câu |
| 🆕 | `writing-45` | Writing Master | 🪶 | Đủ 45 / 45 câu |
| 🆕 | `writing-perfect` | Perfect Writer (Legendary) | 🏅 | Đủ 45 câu + accuracy ≥95% |

## 5. 🎤 Speaking — Yes / No (6) — Theme: cam / hội thoại

| Trạng thái | Slug | Badge | Icon | Điều kiện |
|---|---|---|---|---|
| 🆕 | `yesno-first` | First Answer | 🎤 | Hoàn thành câu Yes/No đầu tiên |
| 🆕 | `yesno-10` | Quick Responder | 💬 | 10 / 37 câu |
| 🆕 | `yesno-20` | Confident Speaker | 🗣️ | 20 / 37 câu |
| 🆕 | `yesno-30` | Rapid Response | ⚡ | 30 / 37 câu |
| 🆕 | `yesno-37` | Yes / No Master | 🏆 | Đủ 37 / 37 câu |
| 🆕 | `yesno-perfect` | Perfect Response (Legendary) | ⭐ | Đủ 37 câu + accuracy ≥95% |

## 6. 💬 Speaking — What Does It Mean? (6) — Theme: xanh / từ điển

| Trạng thái | Slug | Badge | Icon | Điều kiện |
|---|---|---|---|---|
| 🆕 | `whatmean-first` | Meaning Explorer | 💡 | Hoàn thành câu What Mean đầu tiên |
| 🆕 | `whatmean-15` | Word Learner | 📘 | 15 / 62 câu |
| 🆕 | `whatmean-30` | Vocabulary Builder | 🧠 | 30 / 62 câu |
| 🆕 | `whatmean-45` | Meaning Expert | 📖 | 45 / 62 câu |
| 🆕 | `whatmean-62` | Meaning Master | 🎓 | Đủ 62 / 62 câu |
| 🆕 | `whatmean-perfect` | Vocabulary Genius (Legendary) | 👑 | Đủ 62 câu + accuracy ≥95% |

## 7. 🏅 Communication Combo (5)

Điều kiện gộp tiến độ nhiều section — evaluator đọc các bucket tiến độ đã namespace (`wm-`, `yn-`, writing).

| Trạng thái | Slug | Badge | Icon | Điều kiện |
|---|---|---|---|---|
| 🆕 | `combo-starter` | Communication Starter | 🟢 | Writing 10 + Yes/No 10 + What Mean 15 |
| 🆕 | `combo-explorer` | Communication Explorer | 🌐 | Writing 20 + Yes/No 20 + What Mean 30 |
| 🆕 | `interview-ready` | Interview Ready | 🛂 | Đủ 45 Writing + 37 Yes/No + 62 What Mean |
| 🆕 | `language-champion` | Language Champion | 🥇 | Đủ 3 section trên + accuracy mỗi section ≥90% |
| 🆕 | `interview-master` | Interview Master (Legendary) | 🦅 | Pass CẢ 3 bài thi thử: Civics ≥90% + Viết (≥1/3 đúng) + Speaking ≥8/10 |

## 8. 🌟 Secret Badges (7) — ẩn, chỉ hiện khi unlock

| Trạng thái | Slug | Badge | Điều kiện | Ghi chú tracking |
|---|---|---|---|---|
| 🆕 | `secret-early-bird` | 🌅 Early Bird | Học trước 8AM trong 7 ngày (không cần liên tiếp) | Attempts có timestamp — làm được |
| 🆕 | `secret-night-owl` | 🌙 Night Owl | Học sau 10PM trong 7 ngày | Như trên |
| 🆕 | `secret-never-give-up` | 💪 Never Give Up | Tiếp tục học sau 20 câu sai (tích lũy trong 1 ngày) | Đếm từ attempts |
| ⚠️ | `secret-speed-learner` | ⚡ Speed Learner | Gốc: "20 flashcard < 10 phút" — chưa log sự kiện flashcard; đề xuất đổi: *trả lời đúng 20 câu Luyện tập trong 10 phút* | Cần chốt điều kiện thay thế |
| 🆕 | `secret-perfect-50` | 🎯 Perfect Streak | 50 câu đúng liên tiếp (nấc dưới của `correct-streak-100`) | |
| 🆕 | `secret-marathon` | 🚀 Marathon | 100 câu trong 1 ngày | Đếm attempts theo ngày |
| 🆕 | `secret-comeback` | 🔥 Comeback | Quay lại học sau ≥30 ngày nghỉ | Khác `mock-comeback` có sẵn (đậu lại mock sau khi rớt) — tên slug tách riêng để không lẫn |

## 9. 👑 Ultimate Legendary (1)

| Trạng thái | Slug | Badge | Điều kiện |
|---|---|---|---|
| 🆕 | `american-dream` | 🇺🇸 American Dream (Đại bàng vàng + cờ Mỹ + nguyệt quế) | TẤT CẢ: đủ 128 civics + đủ 45 Writing + đủ 37 Yes/No + đủ 62 What Mean + pass cả 3 bài thi thử (Civics ≥90%, Viết ≥1/3, Speaking ≥8/10) + streak ≥30 ngày |

---

## Tổng kết

| Nhóm | Đề xuất | ✅ Dùng lại | 🆕 Build mới | ⚠️ Chờ chốt | ❌ Bỏ |
|---|---:|---:|---:|---:|---:|
| Civics Progress | 5 | 0 | 5 | 0 | 0 |
| Daily Streak | 6 | 6 | 0 | 0 | 0 |
| Practice Achievement | 8 | 2 | 3 | 2 | 1 |
| Writing | 6 | 0 | 6 | 0 | 0 |
| Speaking Yes/No | 6 | 0 | 6 | 0 | 0 |
| Speaking What Mean | 6 | 0 | 6 | 0 | 0 |
| Communication Combo | 5 | 0 | 5 | 0 | 0 |
| Secret | 7 | 0 | 6 | 1 | 0 |
| Ultimate | 1 | 0 | 1 | 0 | 0 |
| **Tổng** | **50** | **8** | **38** | **3** | **1** |

Ngoài ra hệ hiện tại còn các badge không nằm trong đề xuất này và **giữ nguyên**: `onboarding-first-session`, `mock-pass-five`, `mock-perfect`, `mock-comeback`, `correct-answers-100`, `flashcards-mastery`, `all-128-answered`, `sessions-50`, `sessions-100`, `practice-sessions-10`, `practice-sessions-30`, và 5 badge category (`category-democracy/government/rights/history/symbols`).

## Ghi chú triển khai

- Thêm 1 badge = ① INSERT row vào `n400_badges` (Supabase) + ② thêm evaluator vào registry (`badges/evaluators/`) — `verify-badges.ts` sẽ fail build nếu thiếu 1 trong 2 vế.
- Các evaluator nhóm 4–7 phụ thuộc **bucket tiến độ per-section** (id namespace `wm-`, `yn-`, writing) trong spec expansion 2026-07-06 — build sau khi các section mới có state.
- Icon: emoji trong bảng là placeholder; icon chính thức theo bộ `docs/N400_app_UI/Badges Icons`.
- 3 mục ⚠️ cần owner chốt: **Breakthrough** (bỏ hẳn hay đổi điều kiện), **Long-Term Memory** (đổi thành 50 lượt đúng trên câu bookmark?), **Speed Learner** (đổi thành 20 câu đúng trong 10 phút?).
