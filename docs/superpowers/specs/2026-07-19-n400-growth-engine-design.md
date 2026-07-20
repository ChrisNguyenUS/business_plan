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
| Config-driven | Điểm số, ngưỡng, cooldown, copy CTA/prompt, on/off, variant nằm trong DB (marketing chỉnh không cần deploy). Hình dạng điều kiện (logic) vẫn ở code, đọc params từ DB. |
| Service boundary | Toàn bộ logic quyết định nằm trong 1 module server-only `growth-engine/` (ingest → recompute → evaluate CTA → evaluate profiling → trigger notify). Không tách deployed service riêng. RPC chỉ append event; UI chỉ render kết quả. |
| Attribution | Track first_touch (immutable) + last_touch từ ngày đầu: utm_source/medium/campaign, ad_id/fbclid, referrer, landing_page. |
| A/B testing | Mỗi CTA/prompt/checklist có variant; gán deterministic hash(user_id, experiment_key); variant log vào mọi impression event. |
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
event_version int default 1,  -- bump khi đổi shape payload của event_type đó; consumer đọc theo version, không phá compatibility
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
service_interest text[] default '{}',  -- future-ready, hiện để trống; values: n400 | passport | family_petition | tax | insurance | business
lead_score int default 0,  -- computed, không cho client update
lead_status text,          -- cold | warm | hot | sales_ready (derived, denorm để query)
consultation_requested_at timestamptz,
consultation_booked_at timestamptz,
last_growth_prompt_at timestamptz,  -- enforce cap 1 CTA / 7 ngày
first_touch jsonb,   -- immutable sau lần ghi đầu: {utm_source, utm_medium, utm_campaign, ad_id, fbclid, referrer, landing_page, ts}
last_touch jsonb,    -- cùng shape, overwrite mỗi session mới có UTM/referrer
created_at, updated_at
```

RLS: user đọc dòng của mình; các cột trả lời profiling do user ghi qua RPC `answer_profile_prompt`; `lead_score`/`lead_status` chỉ function server ghi. Staff đọc tất cả.

**Hai trục độc lập (không phụ thuộc nhau):** `journey_stage` phản ánh tiến trình N-400 và **chỉ** đến từ câu trả lời profiling; `lead_status` phản ánh mức sẵn sàng mua dịch vụ và **chỉ** derive từ `lead_score`. Không trục nào ghi đè trục kia. Score được phép *tiêu thụ* tín hiệu stage như một input qualification (vd. interview scheduled +60) — đó là quan hệ input→score, không phải coupling giữa 2 nhãn. Staff UI hiển thị cả 2 trục cạnh nhau (ma trận stage × status).

**Attribution capture:** client lưu UTM/fbclid/referrer/landing_page vào cookie first-party ngay lần landing đầu (kể cả trước signup); khi user tạo account hoặc login, server ghi vào `first_touch` (chỉ khi đang NULL) và `last_touch` (luôn overwrite). Consultation request snapshot cả 2 lúc submit để attribution không bị đổi hồi tố.

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
status text default 'new',-- pipeline: new → contacted → booked → done | no_show | cancelled
outcome text,             -- kết quả kinh doanh, set sau khi done: won | lost | follow_up
outcome_note text,        -- staff ghi chú kết quả
note text,                -- staff ghi chú
created_at, updated_at
```

`status` và `outcome` tách riêng có chủ đích: status trả lời "buổi tư vấn diễn ra chưa", outcome trả lời "có thành khách không". Conversion thật = `outcome = won` / tổng request — không đếm bằng `done`. `won` → mở flow Convert to Client (§6); `follow_up` → hiện trong inbox với reminder.

RLS: user insert + đọc request của mình; staff đọc/update tất cả.

### 1.5 Event taxonomy (v1)

**Server-ghi:** `account_created`, `onboarding_completed`, `address_entered`, `practice_completed`, `mock_completed` (payload: section, score, passed), `section_completed`, `streak_day` (payload: practice_day_count), `readiness_snapshot` (payload: percent, criteria met).

**Client-ghi:** `cta_shown`, `cta_dismissed`, `cta_clicked` (payload: cta_id), `prompt_answered`, `prompt_skipped` (payload: question_key), `checklist_viewed`, `consultation_form_opened`.

**Giữ chỗ (chưa emit):** `app_shared`, `review_left`, `friend_invited`, `push_disabled`.

### 1.5b `n400_cta_decision_log` (debug, không phải analytics)

Mỗi lần engine chạy `evaluateCta` ghi 1 dòng:

```sql
id uuid pk, user_id uuid,
evaluated_at timestamptz default now(),
eligible_ctas text[],     -- các CTA thỏa điều kiện tại thời điểm đó
selected_cta text,        -- CTA thắng (null nếu không hiện gì)
reason text               -- vd 'cap_7d_active', 'group_muted', 'priority_S4', 'no_eligible'
```

Trả lời câu "tại sao user này không thấy CTA?" trong 1 query. Đây là **debug data**: volume cao (1 dòng/lần load Dashboard), retention 30 ngày (scheduled cleanup hoặc xóa lúc ghi theo xác suất) — analytics dài hạn đã có `cta_shown/clicked` events lo. RLS: chỉ staff đọc.

### 1.6 Config tables (marketing chỉnh không cần deploy)

Ranh giới: DB chứa **tham số, ngưỡng, copy, on/off, variant**. *Hình dạng điều kiện* (cách so sánh, nguồn data) là code trong growth-engine đọc params. Thêm loại điều kiện mới = deploy; chỉnh số/copy/bật-tắt = update DB.

```sql
n400_growth_rules          -- scoring rules
  rule_key text pk,        -- vd 'first_mock_completed', 'inactive_14d'
  points int,              -- +/- điểm
  params jsonb,            -- ngưỡng: {min_count: 5, min_avg: 90, days: 14...}
  enabled boolean default true,
  updated_at

n400_cta_definitions       -- CTA scenarios (S1..S9 = rows)
  cta_id text, variant text default 'a',   -- pk (cta_id, variant)
  group_key text,          -- consultation | education (mute/convert theo group)
  title_en, title_vi, body_en, body_vi, cta_label_en, cta_label_vi text,
  action text,             -- book_consultation | open_checklist | start_mock...
  conditions jsonb,        -- params cho evaluator: {min_mocks: 3, min_avg: 90}
  priority int,            -- thứ tự khi nhiều scenario cùng thỏa
  cooldown_days int default 7,
  enabled boolean default true,
  updated_at

n400_prompt_definitions    -- câu hỏi profiling
  question_key text, variant text default 'a',  -- pk
  text_en, text_vi text, options jsonb,
  trigger jsonb,           -- {after: 'first_practice'} | {distinct_days: 3}...
  depends_on jsonb,        -- {question_key: 'filed', answer: 'not_yet'}
  snooze_days int default 6, snooze_sessions int default 3,
  sort_order int, enabled boolean default true,
  updated_at

n400_feature_flags         -- kill switch + rollout, có từ G1
  flag_key text pk,        -- growth_engine | cta_engine | profiling | filing_checklist | booking_form
  enabled boolean default false,
  rollout_pct int default 100,  -- 0–100; user thuộc rollout nếu hash(user_id, flag_key) % 100 < rollout_pct
  note text, updated_at
```

Engine check flags ở đầu `getGrowthState` và `processEvent`: flag tắt → feature đó im lặng hoàn toàn (events học tập vẫn ghi bình thường — chỉ tắt phần growth UI/CTA). Rollout theo % cho phép bật dần theo user, deterministic nên user không bị bật/tắt chập chờn.

RLS: mọi user đọc (client cần render copy); chỉ staff ghi. Editing surface: giai đoạn đầu chỉnh qua Supabase dashboard; editor UI trong internal_app thuộc G4.

**A/B testing:** variant gán deterministic `hash(user_id, cta_id) % số variant` — ổn định cho từng user, không cần bảng assignment. Mọi `cta_shown/clicked/dismissed` và `prompt_answered/skipped` đều mang `variant` trong payload.

### 1.7 Growth Engine — service module (một nơi chịu trách nhiệm)

Toàn bộ logic quyết định nằm trong **một module server-only** `apps/website/lib/growth-engine/` (không import được từ client). Không tách deployed service riêng — thêm hạ tầng + latency không cần thiết với stack Vercel + Supabase hiện tại; nếu sau này cần cron/queue thì nâng cấp thành Supabase Edge Function, interface giữ nguyên.

Trách nhiệm (5 nhiệm vụ, 1 pipeline):

```
growth-engine/
  ingest.ts      -- ingestEvent(): validate + append n400_growth_events
  scoring.ts     -- recomputeScore(): đọc events + growth_rules → lead_score
  cta.ts         -- evaluateCta(): đọc events/profile + cta_definitions → CTA nào hiện (hoặc null); ghi n400_cta_decision_log mỗi lần chạy
  profiling.ts   -- evaluatePrompt(): đọc prompts state + definitions → câu hỏi active (hoặc null)
  notify.ts      -- staff notifications (Resend): Sales Ready, consultation request
  index.ts       -- processEvent() = ingest → recompute → notify nếu vượt ngưỡng
```

Phân công với DB:
- **Finalize RPCs chỉ append event** (dumb ingest, giữ atomicity trong transaction) — không chứa logic scoring/CTA.
- `recompute_n400_lead_score(user_id)` là SQL function do engine gọi (giữ score write server-authoritative), đọc điểm từ `n400_growth_rules` — không hardcode điểm trong SQL.
- Điểm **trừ inactivity** (-30 sau 14 ngày, -60 sau 30 ngày) phụ thuộc `now()` nên **tính lúc đọc**: view `n400_leads_view` join last activity, trả `effective_score` + `lead_status`. Không cần cron.
- Dashboard/result screen gọi 1 endpoint duy nhất (`getGrowthState`): trả về {CTA active, prompt active, dashboard intent} — UI chỉ render, không quyết định.

## 2. Lead Scoring (0–300)

Bảng dưới là **giá trị seed** cho `n400_growth_rules` — sau khi ship, marketing chỉnh điểm/ngưỡng trực tiếp trong DB, engine recompute theo rules hiện hành (event log cho phép tính lại toàn bộ khi công thức đổi).

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

### 3.1 Hàng đợi câu hỏi (seed rows cho `n400_prompt_definitions`, thứ tự ưu tiên)

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
7. Ưu tiên khi nhiều scenario cùng thỏa: theo cột `priority` trong `n400_cta_definitions` (seed: S9 > S4 > S1 > S5/S6 > S2 > S3 > S7).

Cap 7 ngày, cooldown, mute-ngưỡng đều là params trong DB (`cooldown_days`, `conditions`) — rules cứng ở đây là **giá trị seed + bất biến về hành vi** (không random, không giữa session, value first), không phải magic numbers trong code.

### 4.2 Scenarios (seed rows cho `n400_cta_definitions`, map vào data thật)

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
- **Lead detail = Timeline dọc** (sales nhìn 30 giây là hiểu khách): render từ `n400_growth_events` theo thời gian — Signup → Address → Practice → Mock (kèm điểm) → Prompt answered (kèm câu trả lời) → CTA shown/clicked → Consultation request → Outcome. Kèm panel tóm tắt: stage, status, score, weak areas, attribution (first/last touch).
- **Consultation Requests inbox**: pipeline status + outcome (won/lost/follow_up), staff note, một click đổi status; follow_up có reminder; won mở Convert to Client.
- **Convert to Client**: nút link lead → bảng `clients` sẵn có (client↔user link đã có từ migration `004_client_user_link.sql`).
- **Email notify staff** (Resend): khi lead vượt ngưỡng Sales Ready (chỉ bắn 1 lần/lead) và khi có consultation request mới.

## 7. Analytics

Toàn bộ KPI tính từ `n400_growth_events` + các bảng lead — **không thêm tool ngoài**:

- **Funnel per-CTA** (view `n400_cta_funnel`): impression → click → consultation request → booked → done, group by `cta_id × variant`. Conversion attribution = `source_cta` trên consultation request (last CTA click trước khi submit). Đây là bảng trả lời "CTA nào thực sự tạo consultation" và "variant nào thắng".
- Section thống kê trong internal_app: funnel Activation → First Practice → First Mock → Readiness distribution → CTA CTR → Consultation requests → Booked → Done; Lead score distribution; profiling answer rate (answered / shown per question, per variant); breakdown theo `first_touch.utm_campaign` khi chạy ads.
- Meta CAPI: `Lead` (consultation request) mới; `n400_mock_test_pass`, `n400_setup_complete` đã có sẵn.
- Referral rate, CLV — defer cùng với referral tracking.

## 8. Phasing & rollout

Chạy song song Website Phase 4. Mỗi phase 1 branch, ship độc lập:

- **G1 — Nền data + engine core**: migrations (9 bảng: 5 data + 4 config, gồm `feature_flags` seed enabled=false → ship an toàn, bật dần), attribution capture (cookie → first/last touch), growth-engine module (ingest + scoring), mở rộng finalize RPCs để emit events (kèm `event_version`), backfill điểm cơ bản cho user hiện có (account/onboarding/address/practice/mock từ data lịch sử), RLS. Không có UI. *Ship xong là data + attribution tích lũy ngay.*
- **G2 — Conversation model**: `evaluatePrompt` trong engine + Level 2 card (màn kết quả) + Level 1 soft card (Home) + Level 3 Dashboard reaction (hero-recommendation tầng intent) + RPC `answer_profile_prompt`. Copy/trigger đọc từ `n400_prompt_definitions`.
- **G3 — CTA engine + booking**: `evaluateCta` trong engine (đọc `n400_cta_definitions`, A/B variant assignment), endpoint `getGrowthState`, 8 scenarios seed, N-400 Filing Checklist page, form booking + confirm + Calendly link + Resend notify + CAPI `Lead`.
- **G4 — internal_app Leads + analytics + rules editor**: trang Leads (ma trận stage × status), consultation inbox, convert-to-client, staff email notify, section thống kê funnel (gồm `n400_cta_funnel` per variant + UTM breakdown), editor UI cho `growth_rules`/`cta_definitions`/`prompt_definitions` để marketing chỉnh không cần Supabase dashboard.

### Design principles checklist (mọi screen phải trả lời "yes" ≥1 câu)

Giúp pass interview? · Tăng personalization? · Tăng trust? · Cải thiện learning? · Qualify lead tự nhiên? · Tạo đúng thời điểm cho consultation? — Không thì redesign hoặc bỏ.
