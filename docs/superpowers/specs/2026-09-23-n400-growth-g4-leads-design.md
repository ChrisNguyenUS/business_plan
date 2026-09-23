# N400 Growth Engine G4 — Leads (internal_app), v1 read-only

**Ngày:** 2026-09-23
**Trạng thái:** Approved (design), chờ implementation plan
**Nguồn:** `2026-07-19-n400-growth-engine-design.md` §6
**Phạm vi:** `apps/internal_app/` + `packages/n400-growth` + 1 migration. Không đụng hành vi của `apps/website/`.

## 0. Mục tiêu

G1–G3c đã thu event, chấm điểm, đẩy CTA và nhận booking. Nhưng **chưa ai trong staff nhìn thấy lead nào** — dữ liệu chảy vào một cái hộp không có cửa sổ. G4 mở cửa sổ đó.

v1 **read-only**: staff xem được ai đang học, nóng tới đâu, đã làm gì. Không ghi gì cả.

### Quyết định đã chốt

| Quyết định | Chốt |
|---|---|
| Ai xem Leads | Cả `staff` + `admin` (nới RLS) |
| Phạm vi v1 | Read-only: lead list + lead detail timeline. **Không** có Consultation inbox, **không** Convert to Client, **không** sales-ready notify |
| Staff đọc tên/email lead | Nới `profiles` SELECT cho staff qua helper `is_staff_or_admin()` |
| Weak areas | Chỉ ở trang detail, qua RPC mới; không có ở list |
| Chia sẻ code website ↔ internal_app | Tách `packages/n400-growth` (types + event registry) |
| Truy cập dữ liệu | internal_app query thẳng Supabase, phân quyền bằng RLS — không API route cross-app |

### Ngoài phạm vi v1 (giữ cho v2)

- Consultation Requests inbox (đổi status/outcome/note) — spec gốc §6
- Convert to Client (link sang bảng `clients`)
- Email staff khi lead vượt ngưỡng Sales Ready — cần trigger + `pg_net`/Edge Function/cron + cột chống bắn trùng; là **hạ tầng chưa từng dùng trong repo này**, tách hẳn khỏi G4 v1
- Gộp event trùng liên tiếp trong timeline

> Resend notify khi **có consultation request mới** đã ship ở G3b (`apps/website/src/lib/n400/growth/notify.ts`). Chỉ còn thiếu notify theo ngưỡng score.

## 1. Bối cảnh đã xác minh

Những điều sau đã kiểm tra trong code, không phải giả định:

1. **internal_app dùng chung y hệt Supabase project** với website — `NEXT_PUBLIC_SUPABASE_URL` + anon key + cookie auth (`src/lib/supabase/server.ts`). Không cần client cross-app.
2. **Admin read policy đã có sẵn** trên `n400_growth_events`, `n400_lead_profiles`, `n400_profile_prompts`, `n400_consultation_requests`, `n400_cta_decision_log` (`n400_15_growth_tables.sql:101-138`) và `n400_user_profile` (`n400_01_tables.sql:140`).
3. **`n400_leads_view` là `security_invoker = true`** (`n400_17_growth_scoring.sql:136`) → RLS của bảng gốc áp cho người gọi.
4. **Chưa có code nào đọc `n400_leads_view`** — nó chỉ tồn tại trong migration định nghĩa nó. Sửa view an toàn.
5. **Toàn bộ policy growth kiểm tra `role = 'admin'`**, trong khi `profiles_role_check` cho phép `('admin','staff','client')` và middleware chỉ chặn staff khỏi `/jobs`. Staff mở Leads sẽ thấy **rỗng im lặng**, không phải 403.
6. **`profiles` SELECT là own-or-admin** (`006_profiles_identity.sql:144`, dùng `is_admin()`). Tên/email lead nằm ở đây.
7. **Hai RPC rollup hard-wire `auth.uid()`** (`n400_25_growth_read_rollups.sql:22,43,53`) → không dùng được để xem user khác.
8. **`packages/eslint-config` và `packages/tsconfig` hiện không app nào dùng** — không chỗ nào trong `apps/` nhắc `@mannaos/*`. G4 sẽ là workspace dependency thật đầu tiên.
9. **`account_created` bắn trên mọi `profiles` INSERT** (`n400_18_growth_emitters.sql:30-38`) và recompute tạo `n400_lead_profiles` cho mọi user → **staff và admin cũng nằm trong bảng leads**.

## 2. Package dùng chung — `@mannaos/n400-growth`

Thuần types + constants. **Zero runtime dependency**, không import Supabase, không import React.

### 2.1 Nội dung

**`src/events.ts`** — chuyển nguyên từ `apps/website/src/lib/n400/growth/events.ts`:
`CLIENT_EVENT_TYPES`, `SERVER_EVENT_TYPES`, `ClientEventType`, `ServerEventType`, `GrowthEventType`, `EVENT_VERSION`, `isClientEventType`.

**`src/event-payloads.ts`** — *mới*, đọc ngược từ emitters/RPC:

| event | payload | nguồn |
|---|---|---|
| `account_created`, `onboarding_completed` | `{}` | `n400_18:33,44` |
| `address_entered` | `{ state, city }` | `n400_18:49,53` |
| `practice_completed`, `mock_completed` | `{ attempt_id, score, total, passed }` | `n400_18:71-72` |
| `prompt_shown`, `prompt_skipped` | `{ question_key, variant, surface }` | `n400_21:112,139` |
| `prompt_answered` | `{ question_key, answer, variant, surface }` | `n400_21:81-82` |
| `cta_shown`, `cta_dismissed`, `cta_clicked` | `{ cta_id, variant, surface, group }` | `n400_24:72,98,126` |

Event `SERVER_EVENT_TYPES` đánh dấu *reserved, not emitted in G1* (`section_completed`, `readiness_snapshot`, `app_shared`, `review_left`, `friend_invited`, `push_disabled`) khai payload `{}` và timeline render nhãn generic.

**`src/lead.ts`** — union mirror CHECK constraint của DB (`n400_15_growth_tables.sql:28-36,64-67`):
`JourneyStage`, `FilingTimeline`, `WantsGuidance`, `LeadStatus`, `ConsultationStatus`, `ConsultationOutcome`, `ConsultationTopic`.

> ⚠️ `ConsultationTopic` mirror `booking.ts:3` (**6** giá trị, gồm `document_prep`) chứ không mirror DB — vì DB đang **sai**, xem §9.

### 2.2 Không chuyển sang package

`profiling.ts`, `cta.ts`, `booking.ts`, `learning-signals.ts`, `growth-state*.ts` — hành vi riêng của website. internal_app không bao giờ chạy evaluator.

### 2.3 Wiring

- `package.json`: `{ "name": "@mannaos/n400-growth", "private": true, "main": "src/index.ts", "types": "src/index.ts" }` — ship TS source, không build step.
- Thêm `"@mannaos/n400-growth": "workspace:*"` vào dependencies của **cả hai** app.
- Thêm `transpilePackages: ['@mannaos/n400-growth']` vào `next.config` của **cả hai** app.
- `apps/website/src/lib/n400/growth/events.ts` → re-export từ package. Giữ nguyên ~10 import call-site hiện có, để diff G4 không lẫn vào code đã ship.

## 3. Migration — `n400_29_growth_staff_read.sql`

Đặt ở `apps/website/supabase/migrations/` (6/7 policy là bảng growth định nghĩa ở đó; để chung một file cho atomic, dù policy `profiles` gốc nằm ở `apps/internal_app/supabase/migrations/006`).

### 3.1 Helper

```sql
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','staff')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.is_staff_or_admin() TO authenticated;
```

Mirror chính xác `is_admin()` (`006_profiles_identity.sql:123-129`) + grant posture của `008_identity_hardening.sql:21-22`.

### 3.2 Nới SELECT

Thay read policy `role = 'admin'` bằng `is_staff_or_admin()` trên: `n400_growth_events`, `n400_lead_profiles`, `n400_profile_prompts`, `n400_consultation_requests`, `n400_cta_decision_log`, `n400_user_profile`.

Thêm policy đọc `profiles` cho staff (giữ nguyên `admins_read_all_profiles` và `users_read_own_profile`).

### 3.3 Không đụng

- **Mọi policy UPDATE giữ ở mức admin** — v1 read-only, không nới quyền ghi.
- **`is_admin()` giữ nguyên** — nó còn gác `protect_profile_role` và admin update.
- **Không** mở bảng quiz attempts/answers cho staff (xem §5).

### 3.4 Mở rộng `n400_leads_view`

`CREATE OR REPLACE VIEW` thêm `LEFT JOIN public.profiles p ON p.id = lp.user_id`, **thêm cột ở cuối**: `full_name`, `email`, `role`.

Lý do: PostgREST không embed được view → `profiles`. Query hai bước (lấy id `role='client'` trước rồi `.in(...)`) vỡ pagination và đụng giới hạn độ dài URL khi số client lớn. Join trong view cho phép lọc role, search tên và sort score trong **một** query.

View vẫn `security_invoker = true` → RLS `profiles` mới nới ở §3.2 áp dụng đúng. An toàn vì chưa có consumer (§1.4), và `CREATE OR REPLACE VIEW` cho phép thêm cột ở cuối.

## 4. internal_app — routes & files

```
apps/internal_app/src/
  app/(app)/leads/page.tsx             list
  app/(app)/leads/[userId]/page.tsx    detail
  actions/leads.ts                     getLeads / getLead / getLeadTimeline / getLeadWeakSection
  lib/n400/timeline.ts                 PURE: event → { icon, title, detail }
  components/leads/LeadStatusBadge.tsx
  components/leads/LeadTimeline.tsx
  components/leads/LeadSummaryPanel.tsx
```

Nav: thêm `{ href: '/leads', label: 'Leads', icon: 'trending_up' }` vào `NAV_ITEMS` trong `app/(app)/layout.tsx`. **Không** thêm vào `STAFF_BLOCKED` của middleware (khác `/jobs`).

### 4.1 List

Server component, `export const dynamic = 'force-dynamic'` — score đổi liên tục, không cache.

Một query trên `n400_leads_view`:
- `.eq('role', 'client')` — **bắt buộc**, nếu không staff/admin hiện ra như lead cold (§1.9)
- `.order('effective_score', { ascending: false })`
- filter status qua query param (`?status=hot`), search tên/email qua `?q=` theo đúng khuôn `clients/page.tsx`
- `.range()` 50/trang

Cột: Lead (avatar + tên + email) · Score (số + badge Cold/Warm/Hot/Sales Ready) · Stage · Streak · Last active · Interview date.

UI theo đúng khuôn `app/(app)/clients/page.tsx`: card trắng `rounded-xl` + `boxShadow: 0 12px 32px -4px rgba(0,105,112,0.04)`, `thead` nền `#f7f9ff/60`, row hover `#f7f9ff/60`, avatar tròn `#3AAFB9`, icon `material-symbols-outlined`.

### 4.2 Detail

Hai cột: trái timeline, phải summary panel.

**Summary panel:** stage, lead_status + effective_score, streak, last active, interview_date, `wants_guidance`, `service_interest`, `filing_timeline`, first/last touch (từ JSONB), `consultation_requested_at` / `consultation_booked_at`, + card weak section (§5).

**Timeline:** **mới nhất trước, cap 100 event**, hiện tổng số event.

> Ngược thứ tự Signup→Outcome của spec gốc §6, có chủ ý: user chăm học có thể có hàng trăm `practice_completed`; đọc xuôi mà cap thì staff chỉ thấy tháng đầu tiên — vô dụng đúng lúc đang gọi điện. Phần "câu chuyện" đã nằm ở summary panel. Gộp event trùng liên tiếp ("12 × Practice, TB 78%, 3–14/8") là hướng đúng cho v2.

`lib/n400/timeline.ts` là **chỗ duy nhất** biết cách đọc payload: nhận `GrowthEventType` + payload đã typed từ package, trả `{ icon, title, detail }`. Pure ⇒ test bằng jest không cần DB.

## 5. Weak section — RPC mới

`n400_weak_section_for(p_user_id uuid)`, SECURITY DEFINER, **tự guard**:

```sql
IF NOT public.is_staff_or_admin() THEN RAISE EXCEPTION 'unauthorized'; END IF;
```

Trả `{ section, graded_total, correct_pct }` cho section yếu nhất.

**Quy tắc (phải khớp `learning-signals.ts:177-196`):** tỉ lệ đúng thấp nhất trong các section **có graded attempt**; mode `flashcard` không tính. Section: `whatmean | yesno | writing` (`lib/n400/section-progress.ts:8`).

Definer + guard là cách lộ đúng một con số tổng hợp mà **không** mở cả bảng bài làm cho staff — đó là lý do §3.3 không nới RLS cho quiz tables.

### ⚠️ Nợ kỹ thuật có ý thức

"Section yếu nhất" sẽ tồn tại **hai bản**: TS ở `learning-signals.ts` (user tự xem) và SQL mới này (staff xem người khác). G3a tránh được chuyện tương tự bằng cách server dùng lại chính code client, nhưng ở đây không dùng lại được vì hai RPC rollup hard-wire `auth.uid()` (§1.7).

Giảm thiểu: comment trỏ chéo hai chiều giữa hai file + quy tắc ghi rõ ở trên. **Không có cách pin drift bằng test ở v1** — chấp nhận có ý thức. Nếu v2 cần thêm signal cho staff, cân nhắc đổi hai RPC rollup sang nhận `p_user_id` (mặc định `auth.uid()`) rồi cho cả hai phía dùng chung.

## 6. Lỗi & test

- `actions/leads.ts` **throw** khi Supabase lỗi, giống `getClients` (`actions/clients.ts:22`). Không nuốt lỗi thành list rỗng — rỗng-do-RLS và rỗng-do-chưa-có-lead nhìn y hệt nhau, đúng cái bẫy §1.5.
- Empty state tách bạch "chưa có lead" vs "không khớp filter", theo khuôn `clients/page.tsx`.
- Lead không tồn tại (hoặc bị RLS lọc) → `notFound()`.
- **Jest** `__tests__/lib/n400/timeline.test.ts`: lặp trên chính `GrowthEventType` từ package, khẳng định mọi type đều ra label. Website thêm event type mà quên map → **test đỏ ngay**. Đây là lợi ích cụ thể của việc tách package.
- Không test UI presentation (đúng tinh thần W3 trong ROADMAP).

## 7. Thứ tự triển khai

1. `packages/n400-growth` + wiring cả hai app + re-export ở website → `pnpm build` cả hai app còn xanh
2. `n400_29_growth_staff_read.sql` (helper + policy + view) → verify bằng tài khoản staff thật
3. `n400_weak_section_for` RPC
4. `actions/leads.ts` + `lib/n400/timeline.ts` + jest test
5. List page + nav
6. Detail page (timeline + summary panel + weak section card)

Mỗi bước một commit atomic.

## 8. Định nghĩa hoàn thành

- [ ] Staff (không phải admin) đăng nhập internal_app, mở `/leads`, thấy danh sách có **tên và email**
- [ ] Danh sách **không** chứa tài khoản staff/admin
- [ ] Sort theo score desc; filter status và search hoạt động
- [ ] Mở một lead thấy timeline + summary panel + weak section
- [ ] `pnpm build` + `pnpm lint` + jest (internal_app) + vitest (website) đều xanh
- [ ] Không có thay đổi hành vi nào ở `apps/website/` ngoài việc `events.ts` thành re-export

## 9. Phát hiện ngoài phạm vi — G3c hỏng trên production ✅ ĐÃ FIX

Tìm thấy trong lúc self-review spec này. **Đã sửa riêng ngày 2026-09-23** bằng migration `n400_28_consultation_topic_document_prep.sql` (applied lên remote, verify bằng `pg_get_constraintdef` + probe insert rolled-back). Giữ lại phần mô tả dưới đây làm hồ sơ.

`apps/website/src/lib/n400/growth/booking.ts:3` khai:

```ts
export const CONSULTATION_TOPICS = ['document_prep', 'n400_review', 'interview_prep', 'writing', 'speaking', 'other'] as const;
```

và `topicForCta` (`booking.ts:12`) map mọi CTA prefix `s10_` → `'document_prep'`.

Nhưng CHECK constraint trên DB **thật** (verify 2026-09-23 qua `pg_get_constraintdef`) vẫn là:

```sql
CHECK (topic = ANY (ARRAY['n400_review','interview_prep','writing','speaking','other']))
```

`n400_27_growth_document_prep_cta.sql` chỉ seed CTA row `s10_document_prep`, **không** `ALTER` constraint. Grep toàn repo: không migration nào nới nó.

**Hậu quả:** user `journey_stage='preparing'` bấm CTA document-prep → submit form → INSERT bị chặn (SQLSTATE 23514) → `booking-actions.ts:130` trả `insert_failed` → user thấy lỗi chung. Không đặt được lịch. Toàn bộ mục đích của G3c chết ở bước cuối.

**Mức độ:** tiềm ẩn, chưa gây thiệt hại. Đo lúc 2026-09-23: `n400_consultation_requests` có **0** row, `s10_document_prep` có **0** impression và **0** click, `journey_stage='preparing'` có **0** lead. Nó sẽ hỏng ở đúng user preparing đầu tiên.

**Fix đã áp:** `n400_28_consultation_topic_document_prep.sql` — drop + recreate constraint với 6 giá trị khớp `booking.ts:3` (superset của bộ cũ nên không row nào fail revalidation). Commit riêng, không nằm trong G4.
