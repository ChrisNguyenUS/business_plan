# N400 Growth Engine — Behavior-Driven Design

**Ngày:** 2026-07-19
**Trạng thái:** Approved (design), chờ implementation plan
**Chạy:** song song với Website Phase 4 (ads-readiness)

## 0. Mục tiêu & triết lý

N400 Ready **không phải** subscription product. Nó là máy Customer Acquisition chính của Manna One Solution.

**Funnel khóa cứng:** Education First → Trust → Consultation → Paid Service.

Mọi tương tác phải hữu ích và mang tính giáo dục trước. User không bao giờ cảm thấy bị bán hàng.

**Primary KPIs:** Qualified Leads, Consultation Bookings, Paid Immigration Clients.
**Secondary KPIs:** Activation, Retention, Interview Readiness, Referral, CLV.

### Quyết định đã chốt

| Quyết định | Chốt |
| --- | --- |
| Onboarding | **Giữ nguyên 2-step hiện tại** (commit `fe60f799`). Không xây onboarding 7 màn. Toàn bộ câu hỏi journey (đã nộp N-400? interview? timeline? muốn hỗ trợ?) chuyển sang Progressive Profiling. |
| CRM | Supabase (shared project) là source of truth; internal_app đọc và hiển thị. Không dùng external CRM. |
| Booking | "Cả hai": form in-app là chính, màn confirm kèm link Calendly. |
| Kiến trúc data | Event log append-only + lead score computed server-side (không dùng counters đơn thuần). |
| Roadmap | Growth Engine chạy song song / trước Phase 4. |

### Out of scope đợt này (defer)

- Lifecycle email/push cho **user** (welcome series, re-engagement, post-interview cross-sell). Email duy nhất trong scope là **notify staff**.
- Push notifications (Scenario "inactive 14 ngày") — chưa có push infra. Event vẫn track.
- Referral / share app / app review tracking — giữ chỗ trong event taxonomy, chưa build.
- Onboarding mới.
- External CRM / marketing automation tool.

## 1. Data layer (Supabase shared project)

Migrations mới đặt tại `apps/website/supabase/migrations/` theo pattern `n400_*` hiện có (tiếp `n400_15_growth_*.sql`). internal_app chỉ đọc qua RLS staff.

### 1.1 `n400_growth_events` (append-only)

```sql
id uuid pk, user_id uuid → auth.users,
event_type text,          -- taxonomy §1.5
payload jsonb default '{}',
created_at timestamptz default now()
```

- **Server-ghi** (đáng tin, dùng cho scoring): mở rộng các finalize RPCs sẵn có (`finalize_mock_attempt`, finalize practice/section/streak) để insert event trong cùng transaction. Client không thể tự ghi các event loại này.
- **Client-ghi** (UI telemetry, không cộng điểm trực tiếp trừ nhóm CTA/prompt): `cta_shown`, `cta_dismissed`, `cta_clicked`, `prompt_answered`, `prompt_skipped`, `checklist_viewed`.
- RLS: user insert được event thuộc whitelist client-side cho chính mình; user đọc event của mình; staff (`is_admin()`-style helper, tránh recursion) đọc tất cả. Không ai update/delete.

### 1.2 `n400_lead_profiles` (1 dòng/user)

```sql
user_id uuid pk → auth.users,
journey_stage text,        -- exploring | preparing | filed | waiting_interview | interview_scheduled
n400_filed boolean,
filing_timeline text,      -- 30d | 3m | 6m | exploring
interview_scheduled boolean,
interview_date date,
wants_guidance text,       -- yes | maybe | no
lead_score int default 0,  -- computed, không cho client update
lead_status text,          -- cold | warm | hot | sales_ready (derived, denorm để query)
consultation_requested_at timestamptz,
consultation_booked_at timestamptz,
last_growth_prompt_at timestamptz,  -- enforce cap 1 CTA / 7 ngày
created_at, updated_at
```

RLS: user đọc dòng của mình; các cột trả lời profiling do user ghi qua RPC `answer_profile_prompt`; `lead_score`/`lead_status` chỉ function server ghi. Staff đọc tất cả.

### 1.3 `n400_profile_prompts` (bộ nhớ conversation)

```sql
user_id uuid, question_key text,   -- pk (user_id, question_key)
shown_count int default 0,
last_shown_at timestamptz,
answered_at timestamptz,
skipped_at timestamptz,
snooze_until timestamptz           -- skip → now() + 5..7 ngày
```

Đây là bộ nhớ cho rule "skip thì không hỏi lại ngay; 5–7 ngày sau hoặc sau 3 sessions mới rơi xuống Dashboard".

### 1.4 `n400_consultation_requests`

```sql
id uuid pk, user_id uuid,
name text, phone text,
preferred_time text,      -- khung giờ user chọn
topic text,               -- n400_review | interview_prep | writing | speaking | other
source_cta text,          -- CTA nào dẫn tới booking (attribution)
status text default 'new',-- new → contacted → booked → done | no_show | cancelled
note text,                -- staff ghi chú
created_at, updated_at
```

RLS: user insert + đọc request của mình; staff đọc/update tất cả.

### 1.5 Event taxonomy (v1)

**Server-ghi:** `account_created`, `onboarding_completed`, `address_entered`, `practice_completed`, `mock_completed` (payload: section, score, passed), `section_completed`, `streak_day` (payload: practice_day_count), `readiness_snapshot` (payload: percent, criteria met).

**Client-ghi:** `cta_shown`, `cta_dismissed`, `cta_clicked` (payload: cta_id), `prompt_answered`, `prompt_skipped` (payload: question_key), `checklist_viewed`, `consultation_form_opened`.

**Giữ chỗ (chưa emit):** `app_shared`, `review_left`, `friend_invited`, `push_disabled`.

### 1.6 Lead score compute

- Function `recompute_n400_lead_score(user_id)` — SECURITY DEFINER, gọi cuối mỗi RPC ghi event server-side và trong `answer_profile_prompt` / khi tạo consultation request.
- Điểm **base** tính từ events + profile answers (bảng §2).
- Điểm **trừ inactivity** (-30 sau 14 ngày, -60 sau 30 ngày) phụ thuộc `now()` nên **tính lúc đọc**: view `n400_leads_view` join last activity, trả `effective_score` + `lead_status`. Không cần cron.

## 2. Lead Scoring (0–300)

### Positive (base, từ events/answers)

| Event | Điểm | Nguồn |
| --- | --- | --- |
| Account created | +10 | trigger signup sẵn có |
| Completed onboarding (2-step) | +20 | `onboarding_completed` |
| Entered address | +20 | `address_entered` (Geoapify flow sẵn có) |
| First practice completed | +10 | `practice_completed` đầu tiên |
| First mock completed | +20 | `mock_completed` đầu tiên |
| 5 practice sessions | +20 | đếm `practice_completed` |
| Practiced 5 ngày khác nhau | +25 | streak data / distinct days |
| 5 mock tests | +30 | đếm `mock_completed` |
| Avg mock score > 90% | +30 | aggregate `n400_quiz_attempts` |
| Interview scheduled (trả lời profiling) | +60 | `n400_lead_profiles` |
| Plans to file trong 30 ngày | +40 | `filing_timeline = '30d'` |
| Requested consultation | +60 | `consultation_requests` insert |
| Booked consultation | +100 | status → `booked` |
| Completed consultation | +120 | status → `done` |
| ~~Shared app +20 / Review +15 / Invite +30~~ | defer | chưa có tracking |

### Negative

| Event | Điểm | Cách tính |
| --- | --- | --- |
| Inactive 14 ngày | -30 | lúc đọc (view) |
| Inactive 30 ngày | -60 | lúc đọc (view, thay thế -30) |
| Dismiss consultation CTA 3 lần | -20 | đếm `cta_dismissed` nhóm consultation |
| Deleted account | dòng biến mất (FK cascade) | — |

### Ngưỡng

Cold 0–50 · Warm 51–120 · Hot 121–200 · **Sales Ready 201–300**. Clamp [0, 300].

**Readiness > 80** trong spec gốc map vào **`readiness.ts` (7 criteria)** sẵn có — không tạo score engine mới. "100% readiness" = `ready === true` (tôn trọng invariant percent-99 hiện có).

## 3. Progressive Profiling — Conversation Model 3 tầng

Nguyên tắc: app **trò chuyện** với user, không phỏng vấn. 1 câu active tại 1 thời điểm. Mọi câu skip được. Mỗi câu phải có lợi ích rõ cho user (personalization thấy được ngay).

### 3.1 Hàng đợi câu hỏi (question_key, thứ tự ưu tiên)

1. `filed` — "Bạn đã nộp N-400 chưa?" (Yes / Not yet)
2. `filing_timeline` — "Bạn định bao giờ nộp?" (30 ngày / 3 tháng / 6 tháng / mới tìm hiểu) — **chỉ hỏi nếu ① = Not yet**
3. `interview_notice` — "Bạn đã nhận được lịch phỏng vấn chưa?" (Yes / No) — **chỉ hỏi nếu ① = Yes**
4. `interview_date` — "Phỏng vấn của bạn ngày nào?" (date picker, skip được) — **chỉ hỏi nếu ③ = Yes**
5. `wants_guidance` — "Bạn có muốn được hướng dẫn MIỄN PHÍ khi có thắc mắc không?" (Yes / Maybe / No)

Trigger điều kiện mở câu (theo spec gốc): ① sau practice session đầu tiên; ② sau mock đầu tiên; ③ sau khi học 3 ngày khác nhau; ⑤ sau 5 study sessions. Câu ④ hỏi ngay sau khi ③ trả lời Yes.

### 3.2 Level 2 — Session Completion Card (điểm hỏi chính)

Card nhỏ đặt **ngay dưới phần kết quả** Practice/Mock — không popup, không modal, không full-screen:

```
🎉 Great job! You answered 18/20 correctly.
────────────────────
One quick question
Have you already submitted your N-400?
○ Yes   ○ Not yet          [Skip]
```

Đây là lúc user vừa nhận value → response rate cao nhất. Trả lời → ghi `n400_lead_profiles` + event `prompt_answered` → cảm ơn 1 dòng + Dashboard đổi (Level 3).

### 3.3 Level 1 — Soft Card trên Dashboard (passive fallback)

Nếu Skip ở Level 2: card biến mất, ghi `snooze_until = now() + 6 ngày` (hoặc sau 3 sessions khác, cái nào đến trước). Hết snooze → câu đó xuất hiện thành soft card trên Home:

```
🎯 Help us personalize your journey
Have you already filed your N-400?   [Yes] [Not yet]
```

User bận thì bỏ qua. Không bao giờ ép, không đếm ngược, không badge đỏ.

### 3.4 Level 3 — CTA Integration (Dashboard phản ứng ngay)

Mỗi câu trả lời **đổi Dashboard lập tức** — đây là phần thưởng của việc trả lời:

| Trả lời | Dashboard đổi thành |
| --- | --- |
| `filed = Not yet` | Card "Recommended for you: ✓ N-400 Filing Checklist — 3 min". Cuối checklist: "Still have questions? Book a FREE consultation." |
| `filed = Yes` | Nhấn mạnh lộ trình luyện thi, mở câu ③ |
| `interview_scheduled = Yes` (+ date) | Chế độ "🔥 Interview in progress — Priority today: Mock Interview / Speaking / Writing"; nếu < 30 ngày → Scenario S4 đủ điều kiện |
| `wants_guidance = Yes` | Unlock kênh "hỏi đáp miễn phí" → CTA consultation mềm |

Cắm vào `hero-recommendation.ts` ladder sẵn có: thêm tầng intent từ `journey_stage` **trên** các tầng behavior hiện tại. Tôn trọng CTA verb system hiện hành.

## 4. CTA Engine

### 4.1 Rules cứng (đè lên mọi scenario)

1. Tối đa **1 growth CTA / 7 ngày** (`last_growth_prompt_at`).
2. Chỉ hiện ở **Dashboard + màn kết quả**. Không bao giờ giữa session học/thi.
3. Contextual — trigger bởi behavior, không random, không lịch cố định.
4. Dismiss 1 lần → CTA đó snooze; **dismiss 3 lần → mute cả nhóm 30 ngày** (+ event trừ điểm nếu là nhóm consultation).
5. Đã convert (booked consultation) → tắt vĩnh viễn nhóm consultation, chỉ còn nhóm education.
6. Escalation ladder, không nhảy cóc: Free Resource → Free Checklist → Free Consultation → Mock Interview → Immigration Service.
7. Ưu tiên khi nhiều scenario cùng thỏa: scenario gắn với interview date gần nhất thắng; còn lại theo thứ tự S9 > S4 > S1 > S5/S6 > S2 > S3 > S7.

### 4.2 Scenarios (map vào data thật)

| ID | Điều kiện (nguồn data) | Hiển thị |
| --- | --- | --- |
| S1 | ≥3 mock, avg > 90% (`n400_quiz_attempts`) | "🎉 You're almost interview-ready. Book a FREE Mock Interview with Manna." |
| S2 | Practiced ≥20 ngày khác nhau (streak data) | "Amazing consistency! Let's review your N-400 journey together — FREE consultation." |
| S3 | `journey_stage = preparing` và 60 ngày không đổi | "Need help preparing your N-400 application? We'll review it for FREE." |
| S4 | `interview_date` trong 30 ngày | "Your interview is coming soon. Book a FREE readiness review." |
| S5 | Writing yếu nhất sau ≥10 Writing sessions (weak categories, quiz-engine) | "Need help improving your Writing? FREE coaching session." |
| S6 | Speaking yếu nhất sau ≥10 Speaking sessions | "Practice with one of our interview specialists. Book a FREE session." |
| S7 | Hoàn thành hết Civics categories | "Congratulations! Ready for a realistic interview simulation? Start Mock Interview" *(education CTA — trỏ vào Phỏng vấn đầy đủ trong app, không phải booking)* |
| ~~S8~~ | Inactive 14 ngày — **defer** (cần push infra) | — |
| S9 | `readiness.ts` `ready === true` | "You're ready! Before your real interview, let us review everything together — FREE. Book Final Review" |

Mỗi lần hiện/tắt ghi `cta_shown` / `cta_dismissed` / `cta_clicked` với `cta_id` — nuôi cả scoring lẫn analytics.

### 4.3 Content asset mới

**N-400 Filing Checklist** — trang in-app song ngữ EN/VI, đọc ~3 phút, checklist các bước + giấy tờ chuẩn bị hồ sơ N-400. Kết bằng: "Still have questions? Book a FREE consultation." Cần owner review nội dung trước khi ship (non-attorney disclosure áp dụng như website).

## 5. Booking flow ("Cả hai")

1. User bấm CTA consultation (bất kỳ scenario) → **form in-app** (không rời app): tên (prefill từ profile), phone, khung giờ thuận tiện, chủ đề (prefill từ `source_cta`).
2. Submit → insert `n400_consultation_requests` (status `new`) + ghi event + recompute score (+60) + **email notify staff qua Resend**.
3. Màn confirm: "Chúng tôi sẽ liên hệ trong 1 ngày làm việc" + **link Calendly** cho ai muốn tự chọn slot ngay.
4. Meta CAPI: fire event `Lead` server-side (khớp yêu cầu Phase 4 ads-readiness).
5. Staff cập nhật status trong internal_app: new → contacted → booked → done (booked +100, done +120 điểm).

## 6. internal_app — trang Leads

Trang mới trong internal_app (staff-only):

- **Lead list** từ `n400_leads_view`: tên, email, effective score, lead_status (Cold/Warm/Hot/Sales Ready), journey_stage, weak areas, last active, ngày interview (nếu có). Sort mặc định: score giảm dần. Filter theo status.
- **Lead detail**: timeline events chính + lịch sử CTA + câu trả lời profiling.
- **Consultation Requests inbox**: pipeline status, staff note, một click đổi status.
- **Convert to Client**: nút link lead → bảng `clients` sẵn có (client↔user link đã có từ migration `004_client_user_link.sql`).
- **Email notify staff** (Resend): khi lead vượt ngưỡng Sales Ready (chỉ bắn 1 lần/lead) và khi có consultation request mới.

## 7. Analytics

Toàn bộ KPI tính từ `n400_growth_events` + các bảng lead — **không thêm tool ngoài**:

- Section thống kê trong internal_app: funnel Activation → First Practice → First Mock → Readiness distribution → CTA CTR → Consultation requests → Booked → Done; Lead score distribution; profiling answer rate (answered / shown per question).
- Meta CAPI: `Lead` (consultation request) mới; `n400_mock_test_pass`, `n400_setup_complete` đã có sẵn.
- Referral rate, CLV — defer cùng với referral tracking.

## 8. Phasing & rollout

Chạy song song Website Phase 4. Mỗi phase 1 branch, ship độc lập:

- **G1 — Nền data**: migrations (4 bảng + view + functions), mở rộng finalize RPCs để emit events, backfill điểm cơ bản cho user hiện có (account/onboarding/address/practice/mock từ data lịch sử), RLS. Không có UI. *Ship xong là data tích lũy ngay.*
- **G2 — Conversation model**: hàng đợi câu hỏi + Level 2 card (màn kết quả) + Level 1 soft card (Home) + Level 3 Dashboard reaction (hero-recommendation tầng intent) + RPC `answer_profile_prompt`.
- **G3 — CTA engine + booking**: rules engine client-side đọc events/profile, 8 scenarios, N-400 Filing Checklist page, form booking + confirm + Calendly link + Resend notify + CAPI `Lead`.
- **G4 — internal_app Leads + analytics**: trang Leads, consultation inbox, convert-to-client, staff email notify, section thống kê funnel.

### Design principles checklist (mọi screen phải trả lời "yes" ≥1 câu)

Giúp pass interview? · Tăng personalization? · Tăng trust? · Cải thiện learning? · Qualify lead tự nhiên? · Tạo đúng thời điểm cho consultation? — Không thì redesign hoặc bỏ.
