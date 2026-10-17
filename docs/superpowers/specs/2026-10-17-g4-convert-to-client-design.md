# G4 v2 — Convert to Client (thiết kế)

- **Ngày:** 2026-10-17
- **App:** `apps/internal_app/` (không đụng `apps/website/`)
- **Spec cha:** `2026-09-23-n400-growth-g4-leads-design.md` §"Ngoài phạm vi v1"
- **Trạng thái:** owner duyệt thiết kế 2026-10-17 (phương án A)

## 1. Mục tiêu

Staff đang xem một lead N400Ready có thể chuyển lead đó thành **client** (bảng `clients`) bằng một nút, không gõ lại thông tin đã có. Sau khi convert, hệ thống **nhớ** lead nào đã thành client nào: không tạo trùng, danh sách Leads thấy ngay ai đã là client, hai trang lead ↔ client trỏ qua lại.

## 2. Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Có lưu liên kết lead → client không | **Có** — cột mới `clients.source_lead_id` (phương án A) |
| Có gán `clients.user_id` không | **Không bao giờ.** Policy `clients read` cho `user_id = auth.uid()` đọc cả dòng (kể cả `ssn`). Quyền portal chỉ cấp qua invite token (Business progress tracker slice 3, owner chốt 2026-10-15). `source_lead_id` chỉ là nhãn nguồn, không cấp quyền gì |
| Chống trùng | Unique index một phần trên `source_lead_id` — chặn ở DB, kể cả hai staff bấm cùng lúc |
| Form | Tái dùng `ClientForm` (đã nhận `defaultValues`), không viết form mới |
| Ngày sinh | `clients.date_of_birth` NOT NULL, N400Ready không biết → staff nhập lúc convert |
| Badge "Client" trên list | Query phụ `clients … in(source_lead_id, ids)` trong `getLeads`, **không sửa** `n400_leads_view` |

## 3. Database — migration `015_clients_source_lead.sql`

Đặt trong `apps/internal_app/supabase/migrations/` (thư mục chuẩn cho bảng dùng chung). Số 015 vì `014_advisor_cleanup.sql` đang tồn tại chưa commit; kiểm lại trước khi apply.

```sql
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS source_lead_id uuid
  REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_source_lead_id_key
  ON public.clients (source_lead_id)
  WHERE source_lead_id IS NOT NULL;
```

- `ON DELETE SET NULL`: xóa account lead thì client vẫn còn, chỉ mất nhãn nguồn.
- Unique index cũng phục vụ luôn FK lookup (không cần index thường thêm).
- **Không** thêm/sửa policy. Policy hiện có: `clients staff insert` / `clients staff update` (`is_staff_or_admin()`), `clients read` (staff hoặc `user_id = auth.uid()`). Vì convert không chạm `user_id`, lead không đọc được client.

## 4. Luồng

1. Trang `/leads/[userId]`: header có nút **Convert to Client**; nếu đã có client → **View client →** (link `/clients/<id>`).
2. Convert → `/clients/new?fromLead=<userId>` (server component):
   - Lead đã có client → `redirect('/clients/<id>')`.
   - Lead không tồn tại / RLS ẩn → `notFound()`.
   - Còn lại → render `ClientForm` với `defaultValues` từ prefill + hidden input `source_lead_id`, kèm banner "Converting N400Ready lead **<tên>** — enter date of birth to finish".
3. Submit → `createClient_` đọc thêm `source_lead_id` (uuid hoặc null). Lỗi `23505` trên `clients_source_lead_id_key` → ném lỗi thông điệp rõ "This lead was already converted" (form đang hiện lỗi từ `err.message`). Thành công → `/clients/<id>` như cũ; `revalidatePath('/leads')` để badge cập nhật.

### Prefill (hàm thuần `src/lib/n400/lead-prefill.ts`)

| Field form | Nguồn | Ghi chú |
|---|---|---|
| `first_name`, `middle_name`, `last_name` | `profiles.first_name/middle_name/last_name` | Thiếu thì tách `profiles.full_name`: từ đầu = first, từ cuối = last (hai từ trở lên); một từ → first |
| `email` | `profiles.email` | |
| `phone` | `n400_consultation_requests.phone` mới nhất của lead | null nếu chưa đặt lịch |
| `address.city`, `address.state` | payload `address_entered` mới nhất | street/zip để trống |

Mọi field null/rỗng → để trống, không đoán.

## 5. Hiển thị

- **List `/leads`:** cạnh tên có badge nhỏ **Client** (icon + chữ, không chỉ màu) cho lead đã convert.
- **Trang lead:** nút ở header như §4.1.
- **Trang client `/clients/[id]`:** khi `source_lead_id` có giá trị → dòng "Source: N400Ready lead" + link `/leads/<source_lead_id>`.

## 6. Code — tách lớp

| Lớp | File |
|---|---|
| Thuần (test được) | `src/lib/n400/lead-prefill.ts` — `buildLeadPrefill(profile, phone, addressPayload)` |
| Data access | `src/actions/leads.ts` — `getLeadConversion(userId)`, `getLeadPrefill(userId)`, `getLeads` thêm `convertedClientId` mỗi dòng |
| Data access | `src/actions/clients.ts` — `createClient_` đọc `source_lead_id`, dịch lỗi 23505 |
| UI | `clients/new/page.tsx`, `leads/[userId]/page.tsx`, `leads/page.tsx`, `clients/[id]/page.tsx` |

Mọi query bảng `n400_*` / `clients` theo lead đều `.eq(...)` tường minh — policy staff-read không phải bộ lọc phạm vi (bài học G2).

## 7. Kiểm thử

- **Jest:** `lead-prefill` — có first/last tách sẵn; chỉ có full_name 1/2/3 từ; thiếu phone/address; payload address sai kiểu.
- **Probe prod (transaction rollback, không để lại dữ liệu):** áp migration trước, rồi với claims của admin: insert client có `source_lead_id` = lead test → OK; insert lần hai cùng `source_lead_id` → 23505; với claims của chính lead đó: `select` client theo id → 0 dòng.
- **Owner smoke test:** convert `Test User` (test_user_flashcard_verif@example.com), kiểm badge + link hai chiều + bấm Convert lần nữa ra View client; xóa client test sau đó.
- `tsc`, ESLint, toàn bộ Jest xanh.

## 8. Ngoài phạm vi (vẫn v2 sau)

- Consultation Requests inbox (status/outcome/note) và đánh dấu outcome `won` khi convert.
- Email Sales-Ready theo ngưỡng điểm.
- Portal cho client (invite token) — thuộc Business progress tracker slice 3.
- Gỡ liên kết / gộp client trùng có sẵn (staff tự xử lý tay nếu cần).
