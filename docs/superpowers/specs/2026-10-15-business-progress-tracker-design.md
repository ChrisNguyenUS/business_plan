# Business Progress Tracker — theo dõi tiến độ dịch vụ business cho khách

**Ngày:** 2026-10-15
**Trạng thái:** Design approved (3 phần, trong chat), chờ chủ sở hữu duyệt file này rồi mới viết plan cho lát 1
**Nguồn:** yêu cầu của owner 2026-10-15 ("theo dõi progress cho khách làm business: đăng ký LLC, website, mở nhà bank"); PRD `2026-04-09-mos-internal-staff-app-prd.md` Story 10 (non-immigration job tracker)
**Phạm vi:** `apps/internal_app/` (lát 0–3), `apps/website/` portal (lát 3), migrations series `apps/internal_app/supabase/migrations/` từ `010` trở đi. Không đụng N400Ready.

## 0. Mục tiêu

Hôm nay một dịch vụ business của khách (đăng ký LLC, làm website, mở tài khoản ngân hàng) chỉ là một dòng trong `jobs` với ba trạng thái `open` / `in_progress` / `complete`. Không ai nhìn được khách đang ở bước nào, bước nào đang chờ ai, và khách không có cách nào tự xem. Tính năng này cho mỗi dịch vụ một danh sách bước theo mẫu, một thanh tiến độ, và một đường thông báo tới khách.

### Quyết định đã chốt (owner, 2026-10-15)

| Quyết định | Chốt |
|---|---|
| Ai xem tiến độ | Nhân viên + khách xem trên portal + email tự động |
| Kênh thông báo | Chỉ **email** (Resend). SMS / Zalo / Messenger tách thành dự án con sau |
| Đơn vị theo dõi | **Mỗi dịch vụ là một mục (`job`) riêng**, mỗi mục có danh sách bước riêng |
| Mẫu các bước | Seed sẵn **3 mẫu** bằng migration (LLC, website, mở bank); thêm mẫu = owner nhờ, mình làm migration. Màn hình soạn mẫu để v2 |
| Hướng kiến trúc | **Mở rộng `jobs`** bằng bước theo mẫu (không tạo bảng `engagements` riêng) |
| Thứ tự giao | Lát 0 (deploy) song song lát 1 (nhân viên) → lát 2 (email) → lát 3 (portal + mời khách) |
| Ai dùng Jobs ở v1 | **Chỉ admin** (giữ quy tắc phân quyền 2026-04-16); mở cho staff sau |
| `service_type` của 3 mẫu | Cả ba dùng `tax` (= danh mục "Tax & Business" của website) |
| Khách đọc dữ liệu | **Chỉ qua RPC**, không đọc bảng trực tiếp |
| Nối khách ↔ tài khoản đăng nhập | **Lời mời dùng một lần**, không tự khớp theo email |
| Internal app | Hiện **chưa deploy** (chỉ chạy máy local) → có lát 0 để deploy |

### Ngoài phạm vi

- SMS, Zalo, Messenger (dự án con riêng).
- Màn hình soạn/sửa mẫu bước (v2).
- Upload tài liệu / chữ ký điện tử trong bước.
- Hạn riêng và ước tính thời gian cho từng bước.
- Audit log đầy đủ (v1 chỉ có `updated_by`, `updated_at`).
- Thanh toán / phí theo bước (`jobs.fee` giữ nguyên là một số cho cả job).
- Mở Jobs cho `staff` (xem §4.5).
- Dọn các hạng mục khác của internal app (ESLint 82 lỗi, `types/index.ts` cũ, poller USCIS…). Chỉ sửa những gì nằm trong bảng/luồng `jobs` mà tính năng này chạm vào.

## 1. Bối cảnh đã xác minh (2026-10-15)

Những điều sau đã kiểm tra trong code và trên DB prod, không phải giả định:

1. **`jobs` hiện có** (`001_schema.sql`, `005_bootstrap_missing_tables.sql`): `id`, `created_at`, `created_by` (NOT NULL, FK → `users`), `client_id` (FK → `clients`), `service_type` (CHECK `immigration|tax|insurance|ai`), `description`, `fee numeric(10,2)`, `deadline`, `status` (CHECK `open|in_progress|complete`), `notes`. **Không có** `updated_at`, `case_id`.
2. **`public.users` rỗng (0 dòng)** và là bảng legacy; mọi tài khoản thật nằm ở `profiles`. FK `jobs.created_by → users(id)` nên mọi insert vào `jobs` đều lỗi FK.
3. **RLS của `jobs`:** chỉ có policy `Client can read own jobs` (SELECT). Không có policy cho staff/admin, nên admin cũng không đọc/ghi được (probe 2026-10-15: `INSERT` bị chặn 42501).
4. **`createCrossSellJob`** (`apps/internal_app/src/actions/crossSell.ts`) ghi cột `jobs.case_id` không tồn tại trên prod.
5. **Trang Jobs** (`apps/internal_app/src/app/(app)/jobs/page.tsx`) chỉ đọc; nút "New Job" trỏ tới `/jobs/new` không tồn tại.
6. **Quy tắc phân quyền 2026-04-16** (`plans/2026-04-16-user-roles-access-control.md`): staff không thấy Jobs. Middleware có `STAFF_BLOCKED = ['/jobs']` (`src/middleware.ts`), menu lọc bỏ `/jobs` cho staff (`src/app/(app)/layout.tsx`). Prod hiện có 1 admin, 0 staff.
7. **Portal website** (`apps/website/src/app/[locale]/portal/page.tsx`) đọc `jobs` với cột `updated_at` (không tồn tại → query lỗi) sau khi tìm `clients.user_id = auth.uid()`. **Không có đoạn code nào** trong cả hai app gán `clients.user_id`; trên prod 0 khách được nối. Tab My Services hiện không thể hiện ra gì cho ai.
8. **Email:** Resend chỉ có ở website (`src/app/api/contact/route.ts`, `src/lib/n400/growth/notify.ts`, biến `RESEND_API_KEY`, `RESEND_FROM_EMAIL`). internal_app chỉ có `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, và không có gói `resend`.
9. **Chưa deploy:** `app.mannaonesolution.com` (URL trong PRD) không phân giải DNS; thư mục `apps/internal_app/.vercel` trống; project Vercel link ở gốc repo là `website` (`rootDirectory: apps/website`). Owner xác nhận 2026-10-15: internal app chỉ chạy máy local.
10. **Hàm touch `updated_at`:** chỉ có `update_profiles_updated_at` (gắn vào `profiles`). Chưa có hàm dùng chung.
11. **Khuôn UI có sẵn:** form là client component gọi server action rồi `router.push` (`ClientForm`). Bộ chọn khách `ClientLookup` nằm *trong* `cases/new/page.tsx` (dùng 2 lần); form New Job là lần dùng thứ 3 → tách ra `components/clients/` theo luật rule-of-three.
12. **Quy ước migration** (từ `009_staff_rls_lockdown.sql`, `n400_38`): mỗi (bảng, hành động) một policy, mọi policy `TO authenticated`, bọc `(select …)` để tính auth một lần/query, hàm SECURITY DEFINER thì `REVOKE … FROM PUBLIC, anon` (cộng `authenticated` nếu chỉ trigger gọi). Công cụ `execute_sql` chặn từ khóa `DROP` nên migration có `DROP POLICY` phải áp qua `apply_migration`.
13. **Policy hiện có của 5 bảng CRM** (009) đã dùng `is_staff_or_admin()` / `is_admin()`; hai helper này là SECURITY DEFINER có `search_path = public`, `authenticated` được EXECUTE, `anon` thì không.
14. **ESLint của internal_app còn 82 lỗi.** File mới của tính năng này phải sạch lint.
15. **Next.js 16:** `apps/internal_app/AGENTS.md` bắt buộc đọc hướng dẫn trong `node_modules/next/dist/docs/` trước khi viết code; plan phải có bước đó.

## 2. Kiến trúc tổng thể

```
nhân viên (admin) ── internal_app ── Supabase (jobs, job_steps, templates) ── Resend ──► email khách
                                              │
khách ── portal website ── RPC portal_my_services() ─┘   (lát 3; khách không đọc bảng trực tiếp)
```

Bốn lát giao độc lập, mỗi lát có plan riêng và một dòng riêng trong ROADMAP:

| Lát | Nội dung | Phụ thuộc |
|---|---|---|
| 0 | Deploy internal app (Vercel project + domain + env) | Owner làm phần Vercel/DNS |
| 1 | Nhân viên theo dõi: mẫu, bước, thanh tiến độ, các màn hình `/jobs` | — |
| 2 | Email tự động cho khách khi bước hoàn tất / chờ khách | Lát 1; lát 0 để gửi thật từ prod |
| 3 | Lời mời vào portal + tab My Services có dòng thời gian | Lát 1 (và nên sau lát 2 để email có nút "Xem tiến độ") |

Spec này chi tiết hóa lát 1 (§3–§4, §8–§9) và phác thảo lát 0, 2, 3 (§5–§7). Mỗi lát sau lát 1 sẽ được xem lại và bổ sung chi tiết trước khi viết plan của nó.

## 3. Mô hình dữ liệu (lát 1): migration `010_job_templates_and_steps.sql`

Áp bằng `apply_migration` (tên prod `job_templates_and_steps`). Nằm ở series internal_app vì `jobs` là bảng dùng chung nền tảng.

### 3.1 Bảng mới

```sql
CREATE TABLE public.job_templates (
  key            text PRIMARY KEY,                 -- vd 'tx_llc'
  service_type   text NOT NULL CHECK (service_type IN ('immigration','tax','insurance','ai')),
  title_en       text NOT NULL,
  title_vi       text NOT NULL,
  description_en text,
  description_vi text,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.job_template_steps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key   text NOT NULL REFERENCES public.job_templates(key) ON DELETE CASCADE,
  position       int  NOT NULL CHECK (position > 0),
  title_en       text NOT NULL,
  title_vi       text NOT NULL,
  description_en text,                             -- khách đọc
  description_vi text,
  owner          text NOT NULL DEFAULT 'manna' CHECK (owner IN ('manna','client','third_party')),
  client_visible boolean NOT NULL DEFAULT true,
  UNIQUE (template_key, position)
);

CREATE TABLE public.job_steps (                    -- bản chụp từ mẫu cho từng job
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  position       int  NOT NULL CHECK (position > 0),
  title_en       text NOT NULL,
  title_vi       text NOT NULL,
  description_en text,
  description_vi text,
  owner          text NOT NULL CHECK (owner IN ('manna','client','third_party')),
  client_visible boolean NOT NULL,
  status         text NOT NULL DEFAULT 'todo'
                 CHECK (status IN ('todo','in_progress','waiting_client','done','skipped')),
  client_note    text,                             -- khách thấy; đi vào email (lát 2)
  internal_note  text,                             -- chỉ nhân viên
  started_at     timestamptz,
  completed_at   timestamptz,
  updated_by     uuid REFERENCES public.profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, position)
);
CREATE INDEX job_steps_updated_by_idx ON public.job_steps (updated_by);
```

`UNIQUE (job_id, position)` đã phủ khóa ngoại `job_id`; `job_template_steps` có `UNIQUE (template_key, position)` phủ `template_key`.

### 3.2 Sửa `jobs`

```sql
ALTER TABLE public.jobs
  ADD COLUMN updated_at   timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN template_key text REFERENCES public.job_templates(key),
  ADD COLUMN case_id      uuid REFERENCES public.cases(id) ON DELETE SET NULL;

ALTER TABLE public.jobs DROP CONSTRAINT jobs_created_by_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);   -- bảng 0 dòng nên không cần NOT VALID

CREATE INDEX jobs_created_by_idx   ON public.jobs (created_by);
CREATE INDEX jobs_template_key_idx ON public.jobs (template_key);
CREATE INDEX jobs_case_id_idx      ON public.jobs (case_id);
```

Sửa cùng lúc ba lỗi đã ghi trong ROADMAP: FK `created_by` trỏ `users`, thiếu `updated_at` (query của portal), thiếu `case_id` (`createCrossSellJob` ghi cột này). Các bảng finance còn FK trỏ `users` nhưng **không** thuộc tính năng này (giữ nguyên, ghi trong ROADMAP).

### 3.3 Trigger và hàm

- **`public.set_updated_at()`** (mới, dùng chung): `NEW.updated_at = now()`. Gắn BEFORE UPDATE vào `jobs`, `job_steps`, `job_templates`. Không thay hàm của `profiles`.
- **`job_steps_before_write()`** BEFORE INSERT OR UPDATE trên `job_steps`:
  - `status <> 'todo'` và `started_at IS NULL` → `started_at = now()`.
  - `status = 'done'` và `completed_at IS NULL` → `completed_at = now()`; `status <> 'done'` → `completed_at = NULL`.
  - Khi UPDATE và `auth.uid()` có giá trị → `updated_by = auth.uid()`.
- **`job_steps_sync_job()`** AFTER INSERT OR UPDATE OR DELETE trên `job_steps`, SECURITY DEFINER, `SET search_path = public`: tính lại `jobs.status` và `jobs.updated_at` cho `job_id` liên quan.
  - Cả hai hàm trigger: `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated` (trigger không bị kiểm EXECUTE lúc chạy).

**Quy tắc suy ra `jobs.status`** (chỉ áp cho job có bước):

| Điều kiện (theo thứ tự) | `jobs.status` |
|---|---|
| Mọi bước đều `done` hoặc `skipped` | `complete` |
| Có bước `in_progress`, `waiting_client` hoặc `done` | `in_progress` |
| Còn lại | `open` |

Job không có bước (ví dụ job cross-sell cũ), hoặc job vừa bị xóa hết bước, giữ trạng thái đặt tay như hiện nay: trigger không đổi `status`, chỉ chạm `updated_at`.

### 3.4 Tạo job từ mẫu

```sql
CREATE FUNCTION public.create_job_from_template(
  p_client_id    uuid,
  p_template_key text,
  p_fee          numeric DEFAULT 0,
  p_deadline     date    DEFAULT NULL,
  p_notes        text    DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  t     public.job_templates;
  v_job uuid;
BEGIN
  SELECT * INTO t FROM public.job_templates WHERE key = p_template_key AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown or inactive template %', p_template_key USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.jobs (created_by, client_id, service_type, description, fee, deadline, notes, template_key)
  VALUES (auth.uid(), p_client_id, t.service_type, t.title_en, coalesce(p_fee, 0), p_deadline, p_notes, t.key)
  RETURNING id INTO v_job;

  INSERT INTO public.job_steps (job_id, position, title_en, title_vi, description_en, description_vi, owner, client_visible)
  SELECT v_job, s.position, s.title_en, s.title_vi, s.description_en, s.description_vi, s.owner, s.client_visible
  FROM public.job_template_steps s
  WHERE s.template_key = t.key
  ORDER BY s.position;

  RETURN v_job;
END;
$$;
```

Cả hàm chạy trong một transaction: mẫu không có hoặc `active = false` thì lỗi `P0002` và không tạo gì; còn lại tạo job rồi chụp toàn bộ bước của mẫu theo `position` (tiêu đề, mô tả, `owner`, `client_visible`), trả `jobs.id`.

SECURITY INVOKER: quyền do RLS (admin-only) quyết định, không có đặc quyền ngầm. `REVOKE EXECUTE … FROM PUBLIC, anon; GRANT EXECUTE … TO authenticated`.

Vì job chụp bước tại thời điểm tạo, sửa mẫu sau đó **không** đổi job đang chạy.

### 3.5 RLS (admin-only ở v1)

Áp cho `job_templates`, `job_template_steps`, `job_steps` và `jobs`, theo khuôn 009/n400_38: bốn policy mỗi bảng, `TO authenticated`, điều kiện `(select public.is_admin())`:

| Bảng | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `job_templates`, `job_template_steps` | admin | admin | admin | admin |
| `jobs`, `job_steps` | admin | admin | admin | admin |

Tên policy kiểu `"jobs admin read"`, `"jobs admin insert"`, `"jobs admin update"`, `"jobs admin delete"`. Bỏ policy cũ `Client can read own jobs` (hiện không phục vụ ai; xem §1.3, §1.7). Kèm `REVOKE ALL ON TABLE … FROM anon, PUBLIC` cho 4 bảng.

**Vì sao khách không đọc bảng trực tiếp:** `internal_note`, `jobs.fee`, `jobs.notes` nằm cùng dòng với các cột khách được phép thấy; RLS chỉ lọc theo dòng, và staff với khách dùng chung role `authenticated` nên không dùng được quyền cột. Lát 3 thêm RPC trả đúng cột an toàn.

**Mở cho staff sau:** đổi `is_admin()` → `is_staff_or_admin()` ở các policy trên bằng một migration nhỏ, gỡ `STAFF_BLOCKED` trong middleware và bộ lọc menu. Không đổi schema.

### 3.6 Seed

3 mẫu và các bước của chúng, song ngữ (`tx_llc`, `business_bank_account`, `business_website`), nằm ở cuối migration. Nội dung nháp ở §8, chờ owner sửa.

### 3.7 Kiểm chứng migration

Cùng kỹ thuật 009 (khối `DO` có `RAISE EXCEPTION` cuối để rollback), chạy trước và sau khi áp:

- **Ma trận quyền**: vai `anon`, `client`, `client+linked`, `staff` (mô phỏng bằng cách tạm đổi `profiles.role` trong transaction), `admin`, trên 4 bảng × 4 hành động. Kỳ vọng: chỉ `admin` làm được; vai khác `42501` hoặc 0 dòng.
- **Chức năng**: admin gọi `create_job_from_template` mỗi mẫu → số `job_steps` đúng bằng số bước của mẫu; đổi từng trạng thái bước và kiểm `jobs.status` theo bảng §3.3; `completed_at` đặt/xóa đúng; mẫu không tồn tại/`active = false` → `P0002`.
- Sau khi áp: lặp lại trên bảng thật, kiểm không còn dấu vết probe, chạy `get_advisors` security + performance.
- `DROP POLICY "Client can read own jobs"` phải đi qua `apply_migration`; bản chạy thử dùng `ALTER POLICY … USING (false)` thay thế (xem ghi chú công cụ trong memory).

## 4. Logic, server actions và UI (lát 1)

### 4.1 Logic thuần: `apps/internal_app/src/lib/jobs/progress.ts`

Không import Supabase hay React.

```ts
export const STEP_STATUSES = ['todo','in_progress','waiting_client','done','skipped'] as const
export type StepStatus = (typeof STEP_STATUSES)[number]
export const STEP_OWNERS = ['manna','client','third_party'] as const
export type StepOwner = (typeof STEP_OWNERS)[number]
export type JobStatus = 'open' | 'in_progress' | 'complete'

export function deriveJobStatus(steps: ReadonlyArray<{ status: StepStatus }>): JobStatus | null
export function deriveProgress(steps: ReadonlyArray<{ status: StepStatus }>):
  { done: number; total: number; percent: number }
export const STEP_STATUS_LABELS: Record<StepStatus, { en: string; vi: string }>
export const STEP_OWNER_LABELS: Record<StepOwner, { en: string; vi: string }>
```

Quy tắc:
- `deriveJobStatus` trả `null` khi không có bước (không suy ra gì); còn lại đúng bảng §3.3. **Phải khớp trigger SQL**; test đối chiếu từng dòng bảng.
- `deriveProgress`: `total` = số bước không `skipped`; `done` = số bước `done`. `percent`: không có bước nào → 0; có bước nhưng tất cả `skipped` (`total = 0`) → 100, khớp job `complete` vì không còn gì phải làm; còn lại `Math.floor(done / total * 100)`. Dùng `floor` để 199/200 không bao giờ hiện 100% khi chưa xong, nên 100% chỉ xuất hiện khi job thật sự `complete`.
- `Record<StepStatus, …>` / `Record<StepOwner, …>` để TypeScript bắt thiếu nhãn khi thêm giá trị.

Test (`__tests__/lib/jobs/progress.test.ts`, jest): không bước (`deriveJobStatus` = `null`, percent 0); toàn `todo`; có bước đã bắt đầu; toàn `done`; có `skipped` (không tính vào `total`); toàn `skipped` (`complete`, percent 100); 199/200 → 99; nhãn đủ cho mọi giá trị.

### 4.2 Server actions: `apps/internal_app/src/actions/jobs.ts`

`'use server'`, theo phong cách các action hiện có (`createClient()` từ `@/lib/supabase/server`, `throw` khi lỗi, `revalidatePath`).

| Hàm | Việc |
|---|---|
| `getJobs()` | `jobs` kèm tên khách và trạng thái các bước (để tính tiến độ ở trang bằng `deriveProgress`), mới cập nhật trước, giới hạn 50 |
| `getJob(id)` | một job kèm khách và `job_steps` theo `position` |
| `getJobTemplates()` | mẫu `active` kèm số bước |
| `createJobFromTemplate(formData)` | kiểm `client_id` (uuid), `template_key`, `fee` (số ≥ 0, rỗng = 0), `deadline` (ngày hoặc rỗng); gọi RPC `create_job_from_template`; `revalidatePath('/jobs')`; trả id job |
| `updateJobStep(stepId, patch)` | `patch` gồm `status?`, `client_note?`, `internal_note?`; kiểm `status ∈ STEP_STATUSES`; cập nhật; `revalidatePath` trang job và `/jobs`; trả bước đã cập nhật |

Phân quyền thực sự do RLS (admin-only). Người không phải admin gọi các action này sẽ nhận lỗi RLS; middleware và menu vẫn chặn từ giao diện.

### 4.3 UI

Tách theo `src/components/jobs/`; trang nằm trong `src/app/(app)/jobs/`.

- **`/jobs`** (sửa): thêm cột "Service" (tiêu đề mẫu) và "Progress" (`JobProgressBar` + "3/8"); mỗi dòng bấm vào `/jobs/[id]`. Giữ bảng và kiểu hiện có.
- **`/jobs/new`** (mới): `NewJobForm` (client component): `ClientLookup` chọn khách, thẻ chọn mẫu (tiêu đề + số bước), phí và hạn tùy chọn, ghi chú. Gọi `createJobFromTemplate` rồi `router.push('/jobs/' + id)`. Chấp nhận `?client_id=` để điền sẵn khách.
- **`/jobs/[id]`** (mới): đầu trang có khách, tiêu đề dịch vụ, chip trạng thái, thanh tiến độ. Bên dưới là `JobStepList`: mỗi bước có số thứ tự, tiêu đề EN (VI nhỏ bên dưới), nhãn owner, dropdown trạng thái, ô "Client note", ô "Internal note", nút **Save** riêng và thông báo đã lưu. Nút Save tường minh để lát 2 không gửi email khi đang gõ dở.
- **`/clients/[id]`** (sửa): thêm mục "Business services" liệt kê job của khách (tiêu đề, tiến độ, link) và nút "New job" trỏ `/jobs/new?client_id=…`.
- **`ClientLookup`**: tách khỏi `cases/new/page.tsx` sang `src/components/clients/ClientLookup.tsx`, giữ nguyên hành vi; `cases/new` import lại.
- Ngôn ngữ giao diện nhân viên: tiếng Anh như phần còn lại của internal app; tiêu đề bước hiện cả VI để kiểm nội dung khách sẽ thấy.

### 4.4 Cross-sell

`createCrossSellJob` sau khi có `jobs.case_id` và FK `profiles` sẽ ghi được. Nó vẫn bị RLS chặn với staff (admin-only), khớp quy tắc "staff không thấy Jobs". Không sửa gì thêm ở đó trong lát 1.

### 4.5 Phân quyền ở v1

`/jobs` giữ nguyên chỉ admin: không đổi `middleware.ts` và bộ lọc menu. Các policy ở §3.5 khớp với quy tắc đó, nên giao diện và DB nhất quán.

## 5. Lát 0: deploy internal app

Mục tiêu: nhân viên (admin) dùng được internal app ngoài máy local.

**Owner làm:**
- Tạo Vercel project cho `apps/internal_app` (Root Directory `apps/internal_app`, bật "Include source files outside of the Root Directory" vì app dùng `@mannaos/n400-growth` qua workspace; kiểm lại khi lập plan).
- Gắn domain. PRD ghi `app.mannaonesolution.com` nhưng không phân giải; **mình đề xuất `app.mannaos.com`** (mannaos.com là domain đang chạy). Owner chốt.
- Dán biến môi trường (xem dưới).

**Mình làm:**
- Biến môi trường cho Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (và `RESEND_*` ở lát 2).
- Header `X-Robots-Tag: noindex` và `robots.txt` chặn toàn bộ trong `next.config.ts`.
- Chạy `pnpm turbo build --filter=internal_app` ở máy local trước khi đẩy.
- Thêm URL internal app vào danh sách redirect/Site URL của Supabase Auth (project dùng chung với website; chỉ thêm, không bớt).
- Checklist smoke test: đăng nhập admin, tài khoản `client` bị chuyển về `/login?error=client_redirect`, tạo job từ mẫu, đổi bước.

**Rủi ro:** root `vercel.json` hiện mô tả build internal_app từ gốc repo và không dùng bởi project `website` (Root Directory `apps/website`); cần quyết một cách duy nhất khi lập plan để không có hai cấu hình chồng nhau.

## 6. Lát 2: email cho khách (phác thảo)

- **Khi nào gửi:** chỉ khi admin chọn "Save & email" ở bước chuyển sang `done` hoặc `waiting_client`, bước `client_visible`, và khách có `clients.email`. UI hiện "Sẽ gửi tới a@b.com" trước khi gửi; khách không có email thì báo rõ không gửi được. Không gửi tự động ngầm.
- **Nội dung:** một email **song ngữ** (VI trước, EN sau; `clients` chưa có cột ngôn ngữ): tên dịch vụ, tiến độ "3/8", tiêu đề bước và `client_note`. Bước `waiting_client` có khối "Việc của bạn / What we need from you".
- **Render:** hàm thuần `renderProgressEmail(input) → { subject, html, text }` trong `src/lib/jobs/email.ts`, có test (escape HTML, đủ hai ngôn ngữ, khối "Việc của bạn" chỉ khi `waiting_client`).
- **Gửi:** server action sau khi lưu bước thành công, gọi Resend (thêm gói `resend` vào internal_app; `RESEND_API_KEY`, `RESEND_FROM_EMAIL` mặc định `MannaOS <notifications@mannaos.com>` như website). **Best-effort:** gửi lỗi không làm hỏng việc lưu bước. `reply_to` cấu hình bằng `RESEND_REPLY_TO` (đề xuất `Chris@mannaos.com`).
- **Log:** migration `011_job_notifications.sql`: `job_notifications(id, job_id, step_id, kind, to_email, status sent|failed, error, created_by, created_at)`, admin-only RLS; trang job hiện lịch sử gửi.
- Email không chứa PII ngoài tên khách và nội dung `client_note` do nhân viên viết.

## 7. Lát 3: lời mời và portal (phác thảo)

- **Mời:** nút "Invite to portal" trên `/clients/[id]` tạo một lời mời (token ngẫu nhiên, lưu **hash** sha256, hạn 7 ngày, dùng một lần) trong `client_portal_invites`, gửi email có link `…/portal/claim?token=…`.
- **Nhận lời mời:** trang `/[locale]/portal/claim` (bắt buộc đã đăng nhập; chưa thì chuyển tới đăng nhập rồi quay lại) gọi RPC `claim_portal_invite(p_token)` (SECURITY DEFINER): kiểm hash, hạn, chưa dùng, `clients.user_id IS NULL`; gán `clients.user_id = auth.uid()`; đánh dấu đã dùng. **Không tự khớp theo email.** Lý do: nối sai nghĩa là người sai đọc được dòng `clients` của người khác qua policy `clients read` (gồm `ssn`, `a_number`).
- **Đọc dữ liệu:** RPC `portal_my_services(p_locale text)` (SECURITY DEFINER, `REVOKE … FROM PUBLIC, anon`, `GRANT … TO authenticated`) trả jsonb chỉ gồm: job (tiêu đề theo ngôn ngữ, `service_type`, trạng thái, tiến độ, `updated_at`) và các bước `client_visible` (tiêu đề, mô tả, `owner`, `status`, `client_note`, `completed_at`). Không bao giờ trả `fee`, `notes`, `internal_note`.
- **Portal UI:** thay query trực tiếp vào `jobs` bằng RPC; thẻ job có thanh tiến độ và dòng thời gian; bước `waiting_client` nổi bật "Việc của bạn"; đổi nhãn "Tax Services" thành "Tax & Business".
- Email của lát 2 từ đây có thêm nút "Xem tiến độ".

## 8. Mẫu bước nháp (owner duyệt và sửa)

Đây là **bản nháp** để owner sửa theo quy trình thật của Manna; seed trong migration `010` sẽ lấy đúng bản đã duyệt. Nhãn owner: M = Manna, C = khách, T = bên thứ ba. Mọi bước `client_visible = true`.

### 8.1 `tx_llc` — Texas LLC formation / Thành lập LLC tại Texas (`service_type = tax`)

| # | Title EN | Tiêu đề VI | Owner | Mô tả cho khách (EN / VI) |
|---|---|---|---|---|
| 1 | Provide your company details | Cung cấp thông tin công ty | C | Name options, owners and ownership shares, business address, contact email. / Vài tên công ty dự kiến, danh sách chủ sở hữu và tỷ lệ sở hữu, địa chỉ kinh doanh, email liên hệ. |
| 2 | Check name availability | Kiểm tra tên công ty | M | We check the name is available with the Texas Secretary of State. / Manna kiểm tra tên còn dùng được tại Texas Secretary of State. |
| 3 | Set up registered agent | Chọn registered agent | M | Every Texas LLC needs a registered agent with a Texas address. / Mỗi LLC tại Texas cần một registered agent có địa chỉ ở Texas. |
| 4 | File Certificate of Formation | Nộp Certificate of Formation | M | We file Form 205 with the Texas Secretary of State. / Manna nộp Form 205 lên Texas Secretary of State. |
| 5 | Texas Secretary of State review | Texas Secretary of State xét duyệt | T | The state reviews the filing; standard processing is typically 1–3 business days. / Tiểu bang xét duyệt hồ sơ; xử lý thông thường khoảng 1–3 ngày làm việc. |
| 6 | Get your EIN | Xin mã số thuế EIN | M | We apply for your Employer Identification Number with the IRS. / Manna xin EIN (mã số thuế doanh nghiệp) từ IRS. |
| 7 | Prepare Operating Agreement | Soạn Operating Agreement | M | We draft the agreement between the owners. / Manna soạn thỏa thuận giữa các chủ sở hữu. |
| 8 | Review and sign Operating Agreement | Đọc và ký Operating Agreement | C | Please read and sign. / Bạn đọc và ký giúp. |
| 9 | Hand over your documents | Bàn giao hồ sơ | M | You receive the Certificate of Filing, EIN letter and Operating Agreement. / Bạn nhận Certificate of Filing, thư EIN và Operating Agreement. |

### 8.2 `business_bank_account` — Business bank account / Mở tài khoản ngân hàng cho doanh nghiệp (`tax`)

| # | Title EN | Tiêu đề VI | Owner | Mô tả cho khách (EN / VI) |
|---|---|---|---|---|
| 1 | Choose a bank and account type | Chọn ngân hàng và loại tài khoản | M | We recommend options that fit your business. / Manna gợi ý lựa chọn phù hợp với doanh nghiệp của bạn. |
| 2 | Prepare your documents | Chuẩn bị giấy tờ | C | Certificate of Filing, EIN letter, Operating Agreement and your ID. / Certificate of Filing, thư EIN, Operating Agreement và giấy tờ tùy thân của bạn. |
| 3 | Submit the application or book the appointment | Nộp hồ sơ hoặc đặt lịch hẹn tại ngân hàng | C | Apply online or visit the branch. / Nộp trực tuyến hoặc đến chi nhánh. |
| 4 | Bank review | Ngân hàng xét duyệt | T | The bank verifies your business and your identity. / Ngân hàng xác minh doanh nghiệp và danh tính của bạn. |
| 5 | Activate your account | Kích hoạt tài khoản | C | Make the opening deposit; set up online banking and your debit card. / Nạp tiền mở tài khoản, cài đặt online banking và nhận thẻ debit. |
| 6 | Confirm everything works | Xác nhận hoàn tất | M | We check you can receive and send payments. / Manna kiểm tra bạn nhận và chuyển tiền được. |

### 8.3 `business_website` — Business website / Làm website cho doanh nghiệp (`tax`)

| # | Title EN | Tiêu đề VI | Owner | Mô tả cho khách (EN / VI) |
|---|---|---|---|---|
| 1 | Kickoff: goals and content | Khởi động: mục tiêu và nội dung | C | Your goals, logo, brand colors, text and photos. / Mục tiêu, logo, màu thương hiệu, nội dung chữ và hình ảnh của bạn. |
| 2 | Domain and hosting | Tên miền và hosting | M | We register or connect your domain and set up hosting. / Manna đăng ký hoặc kết nối tên miền và cài hosting. |
| 3 | First design draft | Bản thiết kế đầu tiên | M | We send the first design for your review. / Manna gửi bản thiết kế đầu tiên cho bạn xem. |
| 4 | Your review and feedback | Bạn xem và góp ý | C | Tell us what to change. / Cho Manna biết cần chỉnh gì. |
| 5 | Build and revisions | Hoàn thiện và chỉnh sửa | M | We build the pages and apply your feedback. / Manna dựng các trang và chỉnh theo góp ý. |
| 6 | Go live | Đưa website lên mạng | M | Connect the domain, enable HTTPS and set up business email. / Trỏ tên miền, bật HTTPS và cài email doanh nghiệp. |
| 7 | Handover and walkthrough | Bàn giao và hướng dẫn sử dụng | M | We show you how to manage the site. / Manna hướng dẫn bạn quản lý website. |

**Chưa có trong bản nháp (owner cho biết có cần không):** đăng ký thuế bang Texas (franchise tax, sales tax permit), báo cáo beneficial ownership, giấy phép kinh doanh cấp thành phố/hạt, DBA. Mỗi mục như vậy là thêm một bước vào mẫu hoặc một mẫu mới.

## 9. Kiểm chứng và tiêu chí hoàn thành

**Lát 1 hoàn thành khi:**
1. Migration `010` đã áp lên prod qua `apply_migration`, ma trận quyền và kiểm chức năng (§3.7) đều khớp kỳ vọng trước và sau khi áp, không còn dấu vết probe; advisor không có cảnh báo mới cho các bảng này.
2. `pnpm --filter internal_app test` xanh, gồm test mới cho `progress.ts`; `type-check` sạch; ESLint không có lỗi mới (các file mới sạch hoàn toàn).
3. Chạy thử trên máy local: tạo job từ cả 3 mẫu, đổi trạng thái các bước, đối chiếu `jobs.status`, `completed_at` và số bước trong DB; trang `/jobs`, `/jobs/new`, `/jobs/[id]`, `/clients/[id]` hiển thị đúng.
4. ROADMAP có mục "Business Progress Tracker" với checkbox từng lát, lát 1 được tick; memory được cập nhật.
5. Mỗi thay đổi một commit nguyên tử (migration; logic + test; actions; từng nhóm UI).

Theo CLAUDE.md, tính năng này chỉ có unit test (phạm vi Phase 2). Test tích hợp và E2E thuộc các phase sau của Track 1.

## 10. Rủi ro và câu hỏi mở

| Mục | Ghi chú |
|---|---|
| Nội dung 3 mẫu | Bản nháp ở §8, cả tiếng Việt lẫn quy trình. Owner duyệt trước khi seed |
| Domain internal app | Đề xuất `app.mannaos.com`; owner chốt ở lát 0 |
| Resend | Email dựa vào tên miền `notifications@mannaos.com` đã xác minh trên website; chưa kiểm được từ máy này. Cần xác nhận trước lát 2 |
| `reply_to` của email khách | Đề xuất `Chris@mannaos.com`; owner xác nhận |
| Ngôn ngữ email | Song ngữ trong một email vì `clients` chưa có cột ngôn ngữ; nếu muốn mỗi khách một ngôn ngữ thì thêm cột ở lát 2 |
| Chất lượng `clients.email` | Email sai = gửi nhầm người; vì vậy có dòng "Sẽ gửi tới …" trước khi gửi và `client_note` do nhân viên viết |
| Mở cho staff | Cần migration nhỏ (§3.5) và gỡ chặn UI; chưa làm |
| `types/index.ts` cũ | `UserRole` thiếu `client`, `CaseStatus` lệch DB. Code mới tự định nghĩa kiểu trong `lib/jobs`, không dựa vào file cũ; sửa file cũ là việc riêng |
| Phụ thuộc owner | Lát 0 cần owner tạo project Vercel và DNS |
| Policy cross-sell | Staff vẫn không dùng được cross-sell cho tới khi mở Jobs cho staff |
