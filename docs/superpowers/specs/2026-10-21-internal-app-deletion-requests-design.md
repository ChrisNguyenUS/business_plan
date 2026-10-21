# Internal App — Xóa case + yêu cầu xóa có admin duyệt (thiết kế)

- **Ngày:** 2026-10-21
- **App:** `apps/internal_app/` (không đụng `apps/website/`)
- **Nối tiếp:** commit 02826a9a (admin ẩn lead) và ab423afc (admin xóa client), 2026-10-20
- **Trạng thái:** owner duyệt thiết kế 2026-10-21

## 1. Mục tiêu

- Admin xóa được **case**.
- Staff không tự xóa/ẩn được gì, nhưng gửi được **yêu cầu** xóa case, xóa client, ẩn lead, kèm lý do. Admin được báo (trong app + email), bấm **Approve** hoặc **Reject**; staff được báo kết quả qua email.

## 2. Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| "Xóa" lead | Vẫn là **ẩn** (`hidden_leads`, migration 017). Lead là tài khoản N400Ready, không bao giờ xóa |
| Client còn case/job | Vẫn **chặn** (`clientDeleteBlocker`). Approve một yêu cầu bị chặn → yêu cầu giữ `pending`, admin thấy lý do |
| Xóa case | DB cascade sẵn: `case_forms`, `documents`, `status_history` (qua case_forms) bị xóa; `jobs.case_id`, `payments.case_id`, `expenses.case_id` về NULL. Không xóa dây chuyền gì thêm |
| Nơi lưu yêu cầu | Một bảng chung `deletion_requests` cho cả 3 loại |
| Báo admin | Trang `/deletion-requests` + số đếm trên menu + email tới `Chris@mannaos.com` |
| Báo staff | Email khi admin Approve/Reject; staff xem trạng thái yêu cầu của mình ở `/deletion-requests` |
| Email lỗi | Yêu cầu/quyết định vẫn được lưu; email chỉ là báo thêm (log lỗi, không rollback) |
| Admin tự xóa khi đang có yêu cầu chờ | Yêu cầu đó tự chuyển `approved` (người duyệt = admin đó) và staff được email |

## 3. Database — migration `018_deletion_requests.sql`

```sql
CREATE TABLE public.deletion_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   text NOT NULL CHECK (entity_type IN ('case', 'client', 'lead')),
  entity_id     uuid NOT NULL,          -- không FK: đa hình, và dòng phải sống sau khi đối tượng bị xóa
  entity_label  text NOT NULL CHECK (char_length(entity_label) BETWEEN 1 AND 200),
  reason        text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 500),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by  uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at    timestamptz,
  decision_note text CHECK (decision_note IS NULL OR char_length(decision_note) <= 500),
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- Một yêu cầu đang chờ cho mỗi đối tượng (hai staff cùng bấm → một người nhận 23505).
CREATE UNIQUE INDEX deletion_requests_one_pending
  ON public.deletion_requests (entity_type, entity_id) WHERE status = 'pending';
CREATE INDEX deletion_requests_requested_by_idx ON public.deletion_requests (requested_by);
CREATE INDEX deletion_requests_decided_by_idx  ON public.deletion_requests (decided_by);
```

`requested_by`/`decided_by` dùng `ON DELETE SET NULL`, không `RESTRICT`: tránh lỗi "Database error deleting user" đã gặp ở migration 016.

**Quyền** (RLS + column grant, `anon` không có gì, không ai có DELETE — bảng là lịch sử):

| Vai | SELECT | INSERT | UPDATE |
|---|---|---|---|
| admin | mọi dòng | — (admin xóa trực tiếp, UI không cho admin gửi yêu cầu; policy vẫn cho phép, vô hại) | mọi dòng, chỉ cột `status, decided_by, decided_at, decision_note` |
| staff | dòng `requested_by = auth.uid()` | chỉ cột `entity_type, entity_id, entity_label, reason`; `WITH CHECK requested_by = auth.uid() AND status = 'pending'` | không |
| khách / user thường | không | không | không |

Policy dạng `(select public.is_admin())` / `(select public.is_staff_or_admin())`, `TO authenticated`, một policy mỗi hành động (giống 009/017).

## 4. Logic dùng chung — `src/lib/deletion/`

Tách khỏi action để Approve và nút Delete trực tiếp chạy **cùng một** đoạn code:

- `perform.ts` — nhận Supabase client, trả `Result`:
  - `deleteCase(supabase, id)` — delete `cases` có `.select('id')`; 0 dòng → "Case not found or not deletable."
  - `deleteClientRow(supabase, id)` — chuyển phần thân của `deleteClient` hiện tại (đếm case/job → `clientDeleteBlocker`, gỡ `spouse_id`, delete). `actions/clients.ts#deleteClient` gọi lại hàm này rồi `redirect`.
  - `hideLead(supabase, userId)` — insert `hidden_leads` (23505 = đã ẩn = ok).
- `requests.ts` — thuần, có test:
  - `parseDeletionRequest(input)` — kiểm `entity_type`, uuid, `reason` sau trim 1–500 ký tự.
  - `actionLabel(entityType)` — "Delete case" / "Delete client" / "Hide lead".
- `email.ts` — thuần, có test: `buildRequestEmail(request, requesterName, siteUrl?)` (tới admin) và `buildDecisionEmail(request, siteUrl?)` (tới staff). Escape HTML mọi chuỗi người dùng nhập (`reason`, `entity_label`, `decision_note`). `escapeHtml` hiện bị chép ở `lib/n400/sales-ready.ts` và `lib/jobs/email.ts`; đây là lần thứ 3 → tách ra `src/lib/html.ts` và cho cả 3 nơi import (Rule of Three). Không có `NEXT_PUBLIC_SITE_URL` → email không có link, vẫn gửi.

## 5. Server actions — `src/actions/deletion-requests.ts`

- `requestDeletion(input)` — staff. Kiểm input, đối tượng phải đọc được (case/client qua RLS; lead qua `n400_leads_view role='client'`), lead chưa bị ẩn. Client: báo sớm nếu còn **case** (staff không đọc được `jobs`, nên job chỉ được kiểm lúc Approve). Insert; 23505 → "A request for this is already pending." Rồi email admin.
- `approveDeletionRequest(id)` — admin. **Claim trước**: `update status='approved', decided_by, decided_at where id and status='pending'` (0 dòng → đã có người xử lý). Rồi chạy hàm ở `perform.ts`. Lỗi (vd. client còn case) → trả lại `status='pending', decided_by/decided_at = NULL` và hiện lỗi. Thành công → email staff, revalidate.
- `rejectDeletionRequest(id, note?)` — admin. `update … status='rejected' where status='pending'`, email staff.
- `getDeletionRequests()` — admin: pending trước, rồi 50 dòng gần nhất đã xử lý. Staff: dòng của mình (RLS tự lọc).
- `getPendingRequestFor(entityType, entityId)` — cho dải "Đang chờ duyệt" trên trang đối tượng.
- `getPendingDeletionCount()` — số đếm trên menu (chỉ gọi cho admin).
- Nút xóa/ẩn trực tiếp của admin (case, client, lead): sau khi thành công, đóng yêu cầu `pending` của đối tượng đó (nếu có) thành `approved` và email staff.

Email người gửi: đọc `profiles.email` của `requested_by` (admin đọc được `profiles`: policy `admins_read_all_profiles`, kiểm 2026-10-21).

## 6. Giao diện

- **Case** (`/cases/[id]`): admin có nút **Delete** đỏ (confirm "Permanently delete this case and its forms, documents and status history?") → về `/cases`. Staff có **Request deletion**.
- **Client** (`/clients/[id]`): admin giữ **Delete**; staff có **Request deletion**.
- **Lead** (`/leads/[userId]`): admin giữ **Hide lead / Unhide**; staff có **Request hide** (không hiện khi lead đã ẩn).
- Nút yêu cầu: một client component dùng chung `RequestDeletionButton` (3 trang dùng → đúng Rule of Three) mở ô lý do + Gửi. Khi đã có yêu cầu chờ: dải vàng "Deletion requested by X on <ngày> — waiting for an admin." thay cho nút (cả admin cũng thấy dải này).
- **`/deletion-requests`** (menu, icon `delete_sweep`, admin thấy badge số pending): bảng gồm loại, đối tượng (link nếu còn tồn tại), lý do, người gửi, ngày, trạng thái. Admin có **Approve** / **Reject** (ô ghi chú tùy chọn) ở các dòng pending; lỗi Approve hiện ngay dưới dòng.

## 7. Ngoài phạm vi

- File trong Storage của `documents` (chưa có upload nào; bảng 0 dòng trên prod).
- `audit_log` cho thao tác xóa trực tiếp của admin.
- Trang `/notifications` (đang đọc join `case:cases` không khớp schema thật) — không dùng cho tính năng này.
- Hoàn tác xóa case/client.

## 8. Kiểm thử

- jest: `parseDeletionRequest`, `actionLabel`, hai hàm email (gồm escape HTML, thiếu siteUrl), `clientDeleteBlocker` (đã có).
- Ma trận RLS trên prod trong transaction rollback: admin / staff (giả lập bằng một profile tạm `role='staff'` trong transaction) / user thường / anon — đọc, thêm, sửa, xóa `deletion_requests`; staff không đổi được `status`; staff không thấy yêu cầu của người khác; unique pending. Kiểm còn 0 dòng thử sau đó.
- Xóa case trong rollback: case_forms/documents/status_history biến mất, jobs/payments còn, `case_id` về NULL.
- `tsc --noEmit`, eslint các file có đụng, jest toàn app.
- UI: owner bấm thử bằng tài khoản admin (mình không đăng nhập thay được); staff thử khi có tài khoản staff đầu tiên.
