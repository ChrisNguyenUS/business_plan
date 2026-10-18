# G4 follow-ups — booked status, internal_app table policies, Sales-Ready digest (thiết kế)

- **Ngày:** 2026-10-18
- **Trạng thái:** owner duyệt thiết kế 2026-10-18 (cả 3 phần; đồng ý thêm 2 env var Vercel; digest hằng sáng về Chris@mannaos.com)
- **Nhánh:** `feat/g4-followups` (tách từ `main` local da1d9a3e — chưa push)
- Ba phần độc lập, mỗi phần một migration riêng, owner duyệt trước khi apply. Thứ tự: A → B → C.

---

## A. Website — `booked` là yêu cầu đang mở; gỡ dấu booked

**App:** `apps/website/` (code) + migration `apps/website/supabase/migrations/n400_42_consultation_booked_at_recompute.sql`.

### Vấn đề (final review G4 v2, 2026-10-17)
1. Website coi chỉ `new|contacted` là "đang mở" ở 3 chỗ: `booking-actions.ts:58` (getBookingContext), `booking-actions.ts:104` (dedupe khi gửi), `cta-state.ts:43` (consultationPending). Khi staff đặt `booked`, khách vẫn mở form và gửi được yêu cầu thứ hai.
2. Trigger `n400_trg_recompute_on_consultation` (n400_17) đóng dấu `n400_lead_profiles.consultation_booked_at` một lần và **không bao giờ xoá**. `cta.ts:145` `consultationRetired = Boolean(consultationBookedAt)` → CTA tư vấn bị ẩn vĩnh viễn, kể cả khi staff bấm nhầm Booked rồi Cancelled.

### Thiết kế
- `booking.ts`: `export const OPEN_CONSULTATION_STATUSES = ['new', 'contacted', 'booked'] as const`. Ba chỗ trên dùng hằng này. Test vitest: hằng chứa đúng 3 giá trị và cả 3 call site import nó (source-reading test theo pattern repo, pin hành vi không pin class).
- Migration n400_42: `CREATE OR REPLACE FUNCTION public.n400_trg_recompute_on_consultation()` giữ nguyên mọi thứ khác (SECURITY DEFINER, `SET search_path = public`, `consultation_requested_at = COALESCE(...)`, gọi `recompute_n400_lead_score`), chỉ đổi:
  ```sql
  consultation_booked_at = CASE
    WHEN EXISTS (SELECT 1 FROM n400_consultation_requests r
                 WHERE r.user_id = NEW.user_id AND r.status IN ('booked','done'))
    THEN COALESCE(consultation_booked_at, now())
    ELSE NULL END
  ```
  Giữ nguyên grant hiện có của hàm (kiểm `proacl` trước/sau; REVOKE EXECUTE FROM PUBLIC, anon, authenticated nếu hàm đang ở trạng thái đó — không nới).
- Điểm lead đã tính từ bảng requests (n400_17 dòng 77–82) → không đổi.
- `done` vẫn giữ dấu (đúng: đã tư vấn xong = converted).

### Kiểm thử
- vitest website: hằng + call sites; suite website xanh; tsc; eslint (CI gate).
- Probe prod rollback: request → booked → `consultation_booked_at` có giá trị; → cancelled → NULL; tạo 2 request, 1 done 1 cancelled → vẫn có giá trị. Zero residue.

---

## B. Internal App — policy + FK cho 7 bảng

**App:** `apps/internal_app/` — migration `apps/internal_app/supabase/migrations/016_finance_audit_notification_policies.sql` (kiểm số trống trước; 014 là file advisor cleanup chưa commit — không đụng).

### Bối cảnh đã xác minh (prod 2026-10-17)
- 7 bảng RLS bật, **0 policy**: `audit_log`, `checklist_templates`, `expenses`, `fee_schedule`, `notifications`, `payments`, `users`. Tất cả **0 dòng**. Migration 013 đã REVOKE quyền anon/TRUNCATE.
- 7 FK trỏ `public.users` (legacy, 0 dòng): `audit_log.user_id`, `checklist_templates.updated_by`, `expenses.logged_by`, `fee_schedule.updated_by`, `notifications.staff_id` (ON DELETE CASCADE), `payments.logged_by`. (`users.id → auth.users` là FK của chính bảng users.)
- Code đang đọc: `notifications` (trang /notifications, `.eq('staff_id', user.id)`), `checklist_templates` (`cases.ts:103`). Chưa code nào ghi.
- Chưa có tài khoản `staff` trên prod (1 admin).

### Thiết kế
- FK: DROP 6 FK trên → ADD lại trỏ `public.profiles(id)`; `notifications.staff_id` giữ ON DELETE CASCADE, còn lại ON DELETE RESTRICT (giữ dấu vết tài chính/audit; xoá profile có giao dịch phải xử lý tay).
- DEFAULT `auth.uid()` cho `audit_log.user_id`, `expenses.logged_by`, `payments.logged_by`, `fee_schedule.updated_by`, `checklist_templates.updated_by`. `checklist_templates.updated_by` và `fee_schedule.updated_by` → nullable (cho seed bằng migration sau này).
- Policy (mọi policy `TO authenticated`, dùng `(SELECT public.is_staff_or_admin())` / `(SELECT public.is_admin())` theo mẫu RLS perf):

| Bảng | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| checklist_templates | staff+admin | admin | admin | admin |
| fee_schedule | staff+admin | admin | admin | admin |
| payments | staff+admin | staff+admin, `logged_by = auth.uid()` | admin | admin |
| expenses | staff+admin | staff+admin, `logged_by = auth.uid()` | admin | admin |
| audit_log | admin | staff+admin, `user_id = auth.uid()` | — (không ai) | — (không ai) |
| notifications | `staff_id = auth.uid()` và staff+admin | — (hệ thống/service role) | `staff_id = auth.uid()`, column grant chỉ `read` | — |
| users (legacy) | — | — | — | — (giữ không policy) |

- `audit_log` append-only: thêm `REVOKE UPDATE, DELETE ON audit_log FROM authenticated`.
- `notifications`: `REVOKE UPDATE ... FROM authenticated; GRANT UPDATE (read) ... TO authenticated`.
- Không thêm UI. Ghi ROADMAP: các tính năng Finance/Audit/Checklist editor giờ có nền DB.

### Kiểm thử
- Probe prod rollback, ma trận vai: anon / client (Test User) / staff (giả lập: tạm `update profiles set role='staff'` cho Test User **trong transaction** rồi rollback) / admin. Mỗi bảng: select/insert/update/delete kỳ vọng theo bảng trên; insert payments với `logged_by` người khác → bị chặn; audit_log update/delete → bị chặn kể cả admin; notifications update cột khác `read` → 42501. FK: insert với `logged_by` = id profiles hợp lệ → ok. Zero residue.
- Advisors (security) sau apply: không phát sinh cảnh báo mới cho 7 bảng.

---

## C. Sales-Ready digest email

**App:** `apps/internal_app/` + migration `apps/website/supabase/migrations/n400_43_sales_ready_notified.sql` (bảng `n400_*`).

### Thiết kế
- Ngưỡng = view `n400_leads_view.effective_status = 'sales_ready'` (effective_score > 200, đã tính decay). Không định nghĩa lại ngưỡng.
- Migration n400_43: `ALTER TABLE n400_lead_profiles ADD COLUMN sales_ready_notified_at timestamptz` (nullable). View không đổi (cron đọc cột này trực tiếp từ bảng).
- Route `apps/internal_app/src/app/api/cron/sales-ready/route.ts` (GET):
  - Chặn: `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron tự gửi header này khi có env `CRON_SECRET`); sai/thiếu → 401. Thiếu `SUPABASE_SERVICE_ROLE_KEY` hoặc `CRON_SECRET` → 500 với log, không gửi gì.
  - Supabase client service role trong `src/lib/supabase/admin.ts` (import `server-only`), chỉ route này dùng.
  - Đọc `n400_leads_view` `.eq('role','client')` lấy `user_id, full_name, email, effective_score, effective_status, last_activity_date`, và `n400_lead_profiles.sales_ready_notified_at` của các lead đó.
  - Pure `planSalesReadyDigest(rows)` (`src/lib/n400/sales-ready.ts`, có test): `toNotify` = sales_ready và chưa notified; `toReset` = không còn sales_ready nhưng notified_at có giá trị (để lần vượt ngưỡng sau báo lại).
  - Có `toNotify` → gửi **1** email qua `sendWithResend` (mailer có sẵn) tới `Chris@mannaos.com`: tiêu đề "N400Ready — N new Sales-Ready lead(s)", mỗi lead: tên, email, điểm, ngày hoạt động gần nhất, link `${NEXT_PUBLIC_SITE_URL}/leads/<user_id>`. HTML escape mọi giá trị. Gửi thành công → set `sales_ready_notified_at = now()` cho `toNotify`; gửi lỗi → không đánh dấu (lần chạy sau thử lại). Luôn clear `toReset`.
  - Trả JSON `{ notified, reset, emailed }`.
- `apps/internal_app/vercel.json`: `{ "crons": [{ "path": "/api/cron/sales-ready", "schedule": "0 13 * * *" }] }` (13:00 UTC = 8:00 sáng CDT / 7:00 CST; Vercel Hobby cho phép cron 1 lần/ngày). Giả định root directory của Vercel project `internal-app` là `apps/internal_app` (không kiểm được từ máy này — `.vercel` ở gốc repo link project `website`); owner xác nhận khi thêm env var, nếu khác thì dời file.
- `src/middleware.ts` matcher hiện bắt mọi path (trừ static) và redirect người chưa đăng nhập về `/login` — **phải** loại trừ `api/cron` khỏi matcher (`/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`). Route tự kiểm `CRON_SECRET`, nên bỏ qua middleware không mở lỗ.
- **Owner:** thêm `SUPABASE_SERVICE_ROLE_KEY` và `CRON_SECRET` (chuỗi ngẫu nhiên ≥ 32 ký tự) vào Vercel project `internal-app` (Production). Không commit giá trị.

### Kiểm thử
- Jest: `planSalesReadyDigest` (notify mới; đã notified thì bỏ; tụt ngưỡng thì reset; role khác client bỏ) và `buildSalesReadyEmail` (escape HTML, link đúng, số nhiều/số ít tiêu đề).
- Jest route: gọi `GET` handler với `Request` không header / sai secret → 401 (không chạm Supabase). Nếu môi trường jest không dựng được `Request` của Next, kiểm bằng `curl` trên dev server.
- Probe prod: cột `sales_ready_notified_at` tồn tại, nullable.
- Smoke (sau khi owner thêm env var): `curl -H "Authorization: Bearer $CRON_SECRET"` vào route trên dev server với service key thật trong `.env.local` (không commit) → `{"notified":0,"reset":0,"emailed":false}` vì hiện không lead nào > 200. Đường gửi email đã được test bằng pure function + mailer có sẵn (slice 2).

---

## Ngoài phạm vi
- UI cho Finance/Audit/Checklist editor/Fee schedule; poller USCIS tạo notifications.
- Xoá bảng `users` legacy.
- Sales-Ready realtime (pg_net/pg_cron), nhiều người nhận, cấu hình ngưỡng từ UI.
