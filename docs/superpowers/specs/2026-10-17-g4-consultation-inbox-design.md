# G4 v2 — Consultation inbox (thiết kế)

- **Ngày:** 2026-10-17
- **App:** `apps/internal_app/` (UI + actions). Migration SQL đặt ở `apps/website/supabase/migrations/` theo quy ước bảng `n400_*` (như `n400_29`) — **không** sửa code website.
- **Spec cha:** `2026-07-19-n400-growth-engine-design.md` §1.4, §6; `2026-09-23-n400-growth-g4-leads-design.md` §"Ngoài phạm vi v1"
- **Phụ thuộc:** nhánh `feat/g4-convert-to-client` (chưa merge) — nút Convert to Client khi outcome = won. Nhánh này tách từ đó.
- **Trạng thái:** owner duyệt thiết kế 2026-10-17 (quyền sửa: phương án B — staff + admin)

## 1. Mục tiêu

Staff xử lý yêu cầu tư vấn khách gửi từ N400Ready trong một chỗ: thấy ai đang chờ gọi lại, đổi trạng thái bằng một thao tác, ghi kết quả, và từ kết quả "won" đi thẳng sang Convert to Client.

## 2. Bối cảnh đã xác minh (prod, 2026-10-17)

- Bảng `n400_consultation_requests` có đủ cột: `name, phone, preferred_time, topic, source_cta, status, outcome, outcome_note, note, first_touch, last_touch, created_at, updated_at`. CHECK: `status ∈ {new, contacted, booked, done, no_show, cancelled}`, `outcome ∈ {won, lost, follow_up}`, `topic ∈ {document_prep, n400_review, interview_prep, writing, speaking, other}`. **Không cần thêm cột.**
- `note` = ghi chú chung của staff; `outcome_note` = ghi chú kết quả (spec §1.4).
- Policy: `own insert` (khách), `read` (chủ hoặc staff), `admin update` (chỉ admin). Không có policy DELETE.
- Grant: `anon` và `authenticated` đều có full table privileges (RLS là lớp chặn duy nhất).
- Trigger `trg_n400_consultation_recompute` (AFTER INSERT OR UPDATE, SECURITY DEFINER): đóng dấu `consultation_booked_at` khi status vào `booked|done`, gọi `recompute_n400_lead_score` (booked +100, done +120). **Tái dùng, không sửa.**
- Website chỉ INSERT (booking-actions.ts) và SELECT; **không bao giờ UPDATE** bảng này. Website coi `status ∈ {new, contacted}` là "đang mở": chặn gửi yêu cầu mới và ẩn CTA tư vấn. Staff đổi sang trạng thái khác → khách đặt lại được, CTA hiện lại. Hành vi có sẵn, giữ nguyên.
- Số yêu cầu trên prod: **0**.

## 3. Database — migration `n400_40_consultation_staff_update.sql`

```sql
DROP POLICY IF EXISTS "n400 consultation admin update" ON public.n400_consultation_requests;
CREATE POLICY "n400 consultation staff update" ON public.n400_consultation_requests
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_staff_or_admin()))
  WITH CHECK ((SELECT public.is_staff_or_admin()));

-- Staff work the pipeline; they never rewrite what the customer submitted.
REVOKE UPDATE ON public.n400_consultation_requests FROM anon, authenticated;
GRANT UPDATE (status, outcome, outcome_note, note, updated_at)
  ON public.n400_consultation_requests TO authenticated;
```

- Policy dùng `(SELECT …)` theo mẫu `n400_38_rls_perf`, `TO authenticated` theo bài học RLS (memory).
- Column grant áp cho cả admin — admin cũng chỉ sửa 5 cột này qua app; sửa khác dùng SQL editor (service role).
- Kiểm tên policy hiện tại trước khi DROP (`pg_policies`): tên thật trên prod là `n400 consultation admin update`.

## 4. Luật nghiệp vụ (hàm thuần `src/lib/n400/consultation.ts`)

- `CONSULTATION_STATUSES`, `CONSULTATION_OUTCOMES`, `CONSULTATION_TOPICS` + nhãn tiếng Anh.
- `validateConsultationUpdate({ status, outcome })`:
  - status phải thuộc danh sách; outcome là null hoặc thuộc danh sách.
  - **outcome chỉ được khác null khi status = `done`.** Đổi status khỏi `done` → outcome phải được xoá (action tự set null, không báo lỗi).
- `inboxTab(row)`: `follow_up` nếu outcome = follow_up; `open` nếu status ∈ {new, contacted, booked} và outcome null; còn lại `closed`.
- `daysSince(iso, now)` cho nhãn "updated N days ago".

## 5. Trang `/consultations`

- Sidebar: mục **Consultations** (icon `support_agent`) ngay dưới Leads, hiện cho staff + admin.
- Header: "Consultations" + số yêu cầu `new` ("3 waiting for a call").
- Tab qua query `?tab=open|follow_up|closed` (mặc định open), mỗi tab có số đếm.
  - Open: mới nhất trước. Follow-up: `updated_at` cũ nhất trước + "updated N days ago". Closed: `updated_at` mới nhất trước.
- Mỗi dòng (card): tên (link `/leads/<user_id>`), phone (`tel:`), topic, preferred time, ngày gửi; form nhỏ: select Status, select Outcome (disabled khi status ≠ done), textarea Note, textarea Outcome note (khi có outcome), nút Save.
- Outcome = won → nút **Convert to Client** (`/clients/new?fromLead=<user_id>`) hoặc **View client** nếu lead đã convert (`clients.source_lead_id`).
- Giới hạn 100 dòng mỗi tab (volume hiện 0); vượt thì ghi rõ "showing 100 most recent".

## 6. Server actions (`src/actions/consultations.ts`)

- `getConsultations(tab)` → rows + đếm 3 tab + số `new` + map `user_id → client id` cho các lead đã convert.
- `updateConsultation(id, formData)`: đọc status/outcome/note/outcome_note, chạy `validateConsultationUpdate`, outcome về null khi status ≠ done, set `updated_at = now`, `.update().eq('id', id)`; `revalidatePath('/consultations')`, `revalidatePath('/leads/<user_id>')`. Lỗi validate → trả `{ ok: false, error }` (không throw — Next ẩn message ở production); thành công `{ ok: true }`.
- Update không chạm `name/phone/topic/...` — DB cũng chặn bằng column grant.

## 7. Trang lead

Card **Consultation** trong `LeadSummaryPanel` thêm dòng link "Open in inbox →" (`/consultations`) khi `consultation_requested_at` có giá trị.

## 8. Kiểm thử

- **Jest:** `validateConsultationUpdate` (status lạ, outcome khi status ≠ done, outcome hợp lệ khi done), `inboxTab` (3 nhánh), `daysSince`.
- **Probe prod (transaction rollback, zero residue):** sau khi apply migration; tạo 1 request bằng claims của lead test, rồi:
  1. claims admin: `update status='booked'` → 1 dòng; `n400_lead_profiles.consultation_booked_at` có giá trị.
  2. claims admin: `update phone=...` → lỗi `42501` (permission denied for column).
  3. claims lead: `update status='done'` trên request của chính mình → 0 dòng.
  4. role anon: update → lỗi/0 dòng.
- **Owner smoke test:** đặt lịch thử từ N400Ready bằng Test User → thấy trong Open → contacted → booked → done + won → Convert to Client mở form điền sẵn. Xoá request + client test sau đó.
- `tsc`, Jest xanh; ESLint không thêm lỗi mới.

## 9. Ngoài phạm vi

- Email Sales-Ready theo ngưỡng điểm.
- Ngày nhắc follow-up cụ thể (cần cột mới).
- Ghi event timeline cho các lần đổi status.
- Xoá yêu cầu (không có policy DELETE — giữ nguyên).
