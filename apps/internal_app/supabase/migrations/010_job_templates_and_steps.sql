-- 010_job_templates_and_steps.sql
--
-- Business progress tracker, slice 1 (spec 2026-10-15-business-progress-tracker-design.md).
-- A job (a client's service such as a Texas LLC, a website or a bank account)
-- gets an ordered list of steps copied from a template, a status that follows
-- those steps, and an admin-only access model.
--
-- It also repairs `jobs`, which nobody could use on prod:
--   created_by pointed at the empty legacy `users` table, so every insert failed
--   the foreign key; there was no updated_at (the portal queries it) and no
--   case_id (createCrossSellJob writes it); and the only policy let a client
--   read their own rows, with no staff or admin policy at all.
--
-- Access is admin only for now, matching the 2026-04-16 rule that staff do not
-- see Jobs. To open Jobs to staff later, change is_admin() to
-- is_staff_or_admin() in the policies below and lift the middleware and menu
-- rules; no schema change is needed.
--
-- Clients get no direct access. A row holds fee, notes and internal_note next
-- to columns a client may see, and RLS filters rows, not columns. The portal
-- will read through a function that returns only safe columns (slice 3).
--
-- Shape follows 009 and n400_38: one policy per (table, action), every policy
-- TO authenticated, auth checks wrapped in (select ...) so they run once per
-- query.

-- 1. Shared updated_at trigger function.
CREATE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 2. Templates.
CREATE TABLE public.job_templates (
  key            text PRIMARY KEY,
  service_type   text NOT NULL CHECK (service_type IN ('immigration','tax','insurance','ai')),
  title_en       text NOT NULL,
  title_vi       text NOT NULL,
  description_en text,
  description_vi text,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER job_templates_set_updated_at_trg
  BEFORE UPDATE ON public.job_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.job_template_steps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key   text NOT NULL REFERENCES public.job_templates(key) ON DELETE CASCADE,
  position       int  NOT NULL CHECK (position > 0),
  title_en       text NOT NULL,
  title_vi       text NOT NULL,
  description_en text,
  description_vi text,
  owner          text NOT NULL DEFAULT 'manna' CHECK (owner IN ('manna','client','third_party')),
  client_visible boolean NOT NULL DEFAULT true,
  UNIQUE (template_key, position)
);

-- 3. Repair jobs.
ALTER TABLE public.jobs
  ADD COLUMN updated_at   timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN template_key text REFERENCES public.job_templates(key),
  ADD COLUMN case_id      uuid REFERENCES public.cases(id) ON DELETE SET NULL;

ALTER TABLE public.jobs DROP CONSTRAINT jobs_created_by_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

CREATE INDEX jobs_created_by_idx   ON public.jobs (created_by);
CREATE INDEX jobs_template_key_idx ON public.jobs (template_key);
CREATE INDEX jobs_case_id_idx      ON public.jobs (case_id);

CREATE TRIGGER jobs_set_updated_at_trg
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Steps copied from a template into a job.
CREATE TABLE public.job_steps (
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
  client_note    text,
  internal_note  text,
  started_at     timestamptz,
  completed_at   timestamptz,
  updated_by     uuid REFERENCES public.profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, position)
);
CREATE INDEX job_steps_updated_by_idx ON public.job_steps (updated_by);

-- started_at / completed_at / updated_by follow the status. Reopening a step
-- (done -> anything else) clears completed_at.
CREATE FUNCTION public.job_steps_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'todo' AND NEW.started_at IS NULL THEN
    NEW.started_at := now();
  END IF;
  IF NEW.status = 'done' THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL THEN
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.job_steps_before_write() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER job_steps_before_write_trg
  BEFORE INSERT OR UPDATE ON public.job_steps
  FOR EACH ROW EXECUTE FUNCTION public.job_steps_before_write();
CREATE TRIGGER job_steps_set_updated_at_trg
  BEFORE UPDATE ON public.job_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- jobs.status follows the steps. Keep in step with deriveJobStatus() in
-- apps/internal_app/src/lib/jobs/progress.ts. A job with no steps (hand-made,
-- or every step removed) keeps its status; only updated_at moves.
-- SECURITY DEFINER so the update works whoever edits the step.
CREATE FUNCTION public.job_steps_sync_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job             uuid;
  v_total           int;
  v_done_or_skipped int;
  v_started         int;
  v_status          text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_job := OLD.job_id;
  ELSE
    v_job := NEW.job_id;
  END IF;

  -- Take the job row lock before counting, so a concurrent writer of another
  -- step of this job waits here and then counts with our change visible.
  -- NO KEY UPDATE, not UPDATE: a step insert already holds KEY SHARE on the job
  -- (foreign key check), and two inserts escalating to UPDATE would deadlock.
  -- A job that is already deleted matches no row and locks nothing.
  PERFORM 1 FROM public.jobs WHERE id = v_job FOR NO KEY UPDATE;

  SELECT count(*),
         count(*) FILTER (WHERE status IN ('done', 'skipped')),
         count(*) FILTER (WHERE status IN ('in_progress', 'waiting_client', 'done'))
    INTO v_total, v_done_or_skipped, v_started
    FROM public.job_steps
   WHERE job_id = v_job;

  IF v_total = 0 THEN
    UPDATE public.jobs SET updated_at = now() WHERE id = v_job;
  ELSE
    v_status := CASE
      WHEN v_done_or_skipped = v_total THEN 'complete'
      WHEN v_started > 0 THEN 'in_progress'
      ELSE 'open'
    END;
    UPDATE public.jobs SET status = v_status, updated_at = now() WHERE id = v_job;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.job_steps_sync_job() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER job_steps_sync_job_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.job_steps
  FOR EACH ROW EXECUTE FUNCTION public.job_steps_sync_job();

-- 5. Create a job and copy the template's steps in one transaction.
-- SECURITY INVOKER: RLS decides who may call it, there is no hidden privilege.
CREATE FUNCTION public.create_job_from_template(
  p_client_id    uuid,
  p_template_key text,
  p_fee          numeric DEFAULT 0,
  p_deadline     date    DEFAULT NULL,
  p_notes        text    DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
REVOKE EXECUTE ON FUNCTION public.create_job_from_template(uuid, text, numeric, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_job_from_template(uuid, text, numeric, date, text) TO authenticated;

-- 6. Row level security: admin only.
ALTER TABLE public.job_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_steps          ENABLE ROW LEVEL SECURITY;

-- The old policy let a client read their own jobs, fee and notes included.
DROP POLICY IF EXISTS "Client can read own jobs" ON public.jobs;
CREATE POLICY "jobs admin read" ON public.jobs
  FOR SELECT TO authenticated USING ((select public.is_admin()));
CREATE POLICY "jobs admin insert" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "jobs admin update" ON public.jobs
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "jobs admin delete" ON public.jobs
  FOR DELETE TO authenticated USING ((select public.is_admin()));

CREATE POLICY "job_steps admin read" ON public.job_steps
  FOR SELECT TO authenticated USING ((select public.is_admin()));
CREATE POLICY "job_steps admin insert" ON public.job_steps
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "job_steps admin update" ON public.job_steps
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "job_steps admin delete" ON public.job_steps
  FOR DELETE TO authenticated USING ((select public.is_admin()));

CREATE POLICY "job_templates admin read" ON public.job_templates
  FOR SELECT TO authenticated USING ((select public.is_admin()));
CREATE POLICY "job_templates admin insert" ON public.job_templates
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "job_templates admin update" ON public.job_templates
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "job_templates admin delete" ON public.job_templates
  FOR DELETE TO authenticated USING ((select public.is_admin()));

CREATE POLICY "job_template_steps admin read" ON public.job_template_steps
  FOR SELECT TO authenticated USING ((select public.is_admin()));
CREATE POLICY "job_template_steps admin insert" ON public.job_template_steps
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "job_template_steps admin update" ON public.job_template_steps
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "job_template_steps admin delete" ON public.job_template_steps
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- Defence in depth, as in 009: nothing anonymous touches these tables.
REVOKE ALL ON TABLE public.jobs, public.job_steps, public.job_templates,
  public.job_template_steps FROM anon, PUBLIC;

-- 7. Seed: three templates, bilingual. Wording is the owner-approved draft
-- from the spec (section 8); the template descriptions are new copy.
INSERT INTO public.job_templates (key, service_type, title_en, title_vi, description_en, description_vi) VALUES
  ('tx_llc', 'tax', 'Texas LLC formation', 'Thành lập LLC tại Texas',
   'We form your Texas LLC with the Secretary of State and prepare the paperwork you need to start operating.',
   'Manna thành lập LLC của bạn tại Texas với Secretary of State và chuẩn bị các giấy tờ cần có để bắt đầu hoạt động.'),
  ('business_bank_account', 'tax', 'Business bank account', 'Mở tài khoản ngân hàng cho doanh nghiệp',
   'We help you choose a bank and open a business checking account.',
   'Manna giúp bạn chọn ngân hàng và mở tài khoản thanh toán cho doanh nghiệp.'),
  ('business_website', 'tax', 'Business website', 'Làm website cho doanh nghiệp',
   'We design, build and launch a website for your business.',
   'Manna thiết kế, xây dựng và đưa website của doanh nghiệp bạn lên mạng.');

INSERT INTO public.job_template_steps (template_key, position, title_en, title_vi, description_en, description_vi, owner) VALUES
  ('tx_llc', 1, 'Provide your company details', 'Cung cấp thông tin công ty',
   'Name options, owners and ownership shares, business address, contact email.',
   'Vài tên công ty dự kiến, danh sách chủ sở hữu và tỷ lệ sở hữu, địa chỉ kinh doanh, email liên hệ.', 'client'),
  ('tx_llc', 2, 'Check name availability', 'Kiểm tra tên công ty',
   'We check the name is available with the Texas Secretary of State.',
   'Manna kiểm tra tên còn dùng được tại Texas Secretary of State.', 'manna'),
  ('tx_llc', 3, 'Set up registered agent', 'Chọn registered agent',
   'Every Texas LLC needs a registered agent with a Texas address.',
   'Mỗi LLC tại Texas cần một registered agent có địa chỉ ở Texas.', 'manna'),
  ('tx_llc', 4, 'File Certificate of Formation', 'Nộp Certificate of Formation',
   'We file Form 205 with the Texas Secretary of State.',
   'Manna nộp Form 205 lên Texas Secretary of State.', 'manna'),
  ('tx_llc', 5, 'Texas Secretary of State review', 'Texas Secretary of State xét duyệt',
   'The state reviews the filing; standard processing is typically 1–3 business days.',
   'Tiểu bang xét duyệt hồ sơ; xử lý thông thường khoảng 1–3 ngày làm việc.', 'third_party'),
  ('tx_llc', 6, 'Get your EIN', 'Xin mã số thuế EIN',
   'We apply for your Employer Identification Number with the IRS.',
   'Manna xin EIN (mã số thuế doanh nghiệp) từ IRS.', 'manna'),
  ('tx_llc', 7, 'Prepare Operating Agreement', 'Soạn Operating Agreement',
   'We draft the agreement between the owners.',
   'Manna soạn thỏa thuận giữa các chủ sở hữu.', 'manna'),
  ('tx_llc', 8, 'Review and sign Operating Agreement', 'Đọc và ký Operating Agreement',
   'Please read and sign.',
   'Bạn đọc và ký giúp.', 'client'),
  ('tx_llc', 9, 'Hand over your documents', 'Bàn giao hồ sơ',
   'You receive the Certificate of Filing, EIN letter and Operating Agreement.',
   'Bạn nhận Certificate of Filing, thư EIN và Operating Agreement.', 'manna'),

  ('business_bank_account', 1, 'Choose a bank and account type', 'Chọn ngân hàng và loại tài khoản',
   'We recommend options that fit your business.',
   'Manna gợi ý lựa chọn phù hợp với doanh nghiệp của bạn.', 'manna'),
  ('business_bank_account', 2, 'Prepare your documents', 'Chuẩn bị giấy tờ',
   'Certificate of Filing, EIN letter, Operating Agreement and your ID.',
   'Certificate of Filing, thư EIN, Operating Agreement và giấy tờ tùy thân của bạn.', 'client'),
  ('business_bank_account', 3, 'Submit the application or book the appointment', 'Nộp hồ sơ hoặc đặt lịch hẹn tại ngân hàng',
   'Apply online or visit the branch.',
   'Nộp trực tuyến hoặc đến chi nhánh.', 'client'),
  ('business_bank_account', 4, 'Bank review', 'Ngân hàng xét duyệt',
   'The bank verifies your business and your identity.',
   'Ngân hàng xác minh doanh nghiệp và danh tính của bạn.', 'third_party'),
  ('business_bank_account', 5, 'Activate your account', 'Kích hoạt tài khoản',
   'Make the opening deposit; set up online banking and your debit card.',
   'Nạp tiền mở tài khoản, cài đặt online banking và nhận thẻ debit.', 'client'),
  ('business_bank_account', 6, 'Confirm everything works', 'Xác nhận hoàn tất',
   'We check you can receive and send payments.',
   'Manna kiểm tra bạn nhận và chuyển tiền được.', 'manna'),

  ('business_website', 1, 'Kickoff: goals and content', 'Khởi động: mục tiêu và nội dung',
   'Your goals, logo, brand colors, text and photos.',
   'Mục tiêu, logo, màu thương hiệu, nội dung chữ và hình ảnh của bạn.', 'client'),
  ('business_website', 2, 'Domain and hosting', 'Tên miền và hosting',
   'We register or connect your domain and set up hosting.',
   'Manna đăng ký hoặc kết nối tên miền và cài hosting.', 'manna'),
  ('business_website', 3, 'First design draft', 'Bản thiết kế đầu tiên',
   'We send the first design for your review.',
   'Manna gửi bản thiết kế đầu tiên cho bạn xem.', 'manna'),
  ('business_website', 4, 'Your review and feedback', 'Bạn xem và góp ý',
   'Tell us what to change.',
   'Cho Manna biết cần chỉnh gì.', 'client'),
  ('business_website', 5, 'Build and revisions', 'Hoàn thiện và chỉnh sửa',
   'We build the pages and apply your feedback.',
   'Manna dựng các trang và chỉnh theo góp ý.', 'manna'),
  ('business_website', 6, 'Go live', 'Đưa website lên mạng',
   'Connect the domain, enable HTTPS and set up business email.',
   'Trỏ tên miền, bật HTTPS và cài email doanh nghiệp.', 'manna'),
  ('business_website', 7, 'Handover and walkthrough', 'Bàn giao và hướng dẫn sử dụng',
   'We show you how to manage the site.',
   'Manna hướng dẫn bạn quản lý website.', 'manna');
