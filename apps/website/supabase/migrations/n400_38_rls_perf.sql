-- One auth evaluation per query and one permissive policy per (table, role,
-- action) on every n400_* table (RLS hardening spec §3.3). A pure rewrite: who
-- can read or write what does not change, which the before/after access matrix
-- in plan Task 11 proved on prod before this was applied.
--
-- Rules: auth.uid() becomes (select auth.uid()); the helpers become
-- (select public.is_admin()) / (select public.is_staff_or_admin()); the inline
-- admin EXISTS over profiles becomes (select public.is_admin()), which has the
-- same definition; auth.role() = 'authenticated' becomes TO authenticated
-- USING (true); own-read and admin/staff-read merge into one SELECT; admin
-- FOR ALL splits into INSERT / UPDATE / DELETE. Policies that call a helper are
-- TO authenticated: anon has no EXECUTE on the helpers. The four public lookup
-- tables keep their USING (true) read untouched, and the two n400_37 insert
-- policies stay. Plus covering indexes for four foreign keys.

-- n400_questions: soft-deleted rows stay visible to admins only.
DROP POLICY IF EXISTS "n400 questions admin write" ON public.n400_questions;
DROP POLICY IF EXISTS "n400 questions public read" ON public.n400_questions;
CREATE POLICY "n400 questions anon read" ON public.n400_questions
  FOR SELECT TO anon USING (deleted_at IS NULL);
CREATE POLICY "n400 questions read" ON public.n400_questions
  FOR SELECT TO authenticated USING (deleted_at IS NULL OR (select public.is_admin()));
CREATE POLICY "n400 questions admin insert" ON public.n400_questions
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 questions admin update" ON public.n400_questions
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 questions admin delete" ON public.n400_questions
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_answers: same as n400_questions.
DROP POLICY IF EXISTS "n400 answers admin write" ON public.n400_answers;
DROP POLICY IF EXISTS "n400 answers public read" ON public.n400_answers;
CREATE POLICY "n400 answers anon read" ON public.n400_answers
  FOR SELECT TO anon USING (deleted_at IS NULL);
CREATE POLICY "n400 answers read" ON public.n400_answers
  FOR SELECT TO authenticated USING (deleted_at IS NULL OR (select public.is_admin()));
CREATE POLICY "n400 answers admin insert" ON public.n400_answers
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 answers admin update" ON public.n400_answers
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 answers admin delete" ON public.n400_answers
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_location_answers: the public read stays.
DROP POLICY IF EXISTS "n400 location answers admin write" ON public.n400_location_answers;
CREATE POLICY "n400 location answers admin insert" ON public.n400_location_answers
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 location answers admin update" ON public.n400_location_answers
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 location answers admin delete" ON public.n400_location_answers
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_state_data: the public read stays.
DROP POLICY IF EXISTS "n400 state data admin write" ON public.n400_state_data;
CREATE POLICY "n400 state data admin insert" ON public.n400_state_data
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 state data admin update" ON public.n400_state_data
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 state data admin delete" ON public.n400_state_data
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_representatives: the public read stays.
DROP POLICY IF EXISTS "n400 reps admin write" ON public.n400_representatives;
CREATE POLICY "n400 reps admin insert" ON public.n400_representatives
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 reps admin update" ON public.n400_representatives
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 reps admin delete" ON public.n400_representatives
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_badges: the public read stays.
DROP POLICY IF EXISTS "n400_badges_admin_write" ON public.n400_badges;
CREATE POLICY "n400 badges admin insert" ON public.n400_badges
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 badges admin update" ON public.n400_badges
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 badges admin delete" ON public.n400_badges
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_feature_flags: signed-in read, admin write.
DROP POLICY IF EXISTS "n400 feature flags admin" ON public.n400_feature_flags;
DROP POLICY IF EXISTS "n400 feature flags read" ON public.n400_feature_flags;
CREATE POLICY "n400 feature flags read" ON public.n400_feature_flags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "n400 feature flags admin insert" ON public.n400_feature_flags
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 feature flags admin update" ON public.n400_feature_flags
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 feature flags admin delete" ON public.n400_feature_flags
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_growth_rules: signed-in read, admin write.
DROP POLICY IF EXISTS "n400 growth rules admin" ON public.n400_growth_rules;
DROP POLICY IF EXISTS "n400 growth rules read" ON public.n400_growth_rules;
CREATE POLICY "n400 growth rules read" ON public.n400_growth_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "n400 growth rules admin insert" ON public.n400_growth_rules
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 growth rules admin update" ON public.n400_growth_rules
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 growth rules admin delete" ON public.n400_growth_rules
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_cta_definitions: signed-in read, admin write.
DROP POLICY IF EXISTS "n400 cta defs admin" ON public.n400_cta_definitions;
DROP POLICY IF EXISTS "n400 cta defs read" ON public.n400_cta_definitions;
CREATE POLICY "n400 cta defs read" ON public.n400_cta_definitions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "n400 cta defs admin insert" ON public.n400_cta_definitions
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 cta defs admin update" ON public.n400_cta_definitions
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 cta defs admin delete" ON public.n400_cta_definitions
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_prompt_definitions: signed-in read, admin write.
DROP POLICY IF EXISTS "n400 prompt defs admin" ON public.n400_prompt_definitions;
DROP POLICY IF EXISTS "n400 prompt defs read" ON public.n400_prompt_definitions;
CREATE POLICY "n400 prompt defs read" ON public.n400_prompt_definitions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "n400 prompt defs admin insert" ON public.n400_prompt_definitions
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 prompt defs admin update" ON public.n400_prompt_definitions
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "n400 prompt defs admin delete" ON public.n400_prompt_definitions
  FOR DELETE TO authenticated USING ((select public.is_admin()));

-- n400_bookmarks: own rows; admins read all.
DROP POLICY IF EXISTS "n400 bookmarks own" ON public.n400_bookmarks;
DROP POLICY IF EXISTS "n400 bookmarks admin read" ON public.n400_bookmarks;
CREATE POLICY "n400 bookmarks read" ON public.n400_bookmarks
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_admin()));
CREATE POLICY "n400 bookmarks own insert" ON public.n400_bookmarks
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 bookmarks own update" ON public.n400_bookmarks
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 bookmarks own delete" ON public.n400_bookmarks
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- n400_section_attempts: own rows; admins read all.
DROP POLICY IF EXISTS "n400 section attempts own" ON public.n400_section_attempts;
DROP POLICY IF EXISTS "n400 section attempts admin read" ON public.n400_section_attempts;
CREATE POLICY "n400 section attempts read" ON public.n400_section_attempts
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_admin()));
CREATE POLICY "n400 section attempts own insert" ON public.n400_section_attempts
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 section attempts own update" ON public.n400_section_attempts
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 section attempts own delete" ON public.n400_section_attempts
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- n400_section_mock_results: own rows; admins read all.
DROP POLICY IF EXISTS "n400 section mock results own" ON public.n400_section_mock_results;
DROP POLICY IF EXISTS "n400 section mock results admin read" ON public.n400_section_mock_results;
CREATE POLICY "n400 section mock results read" ON public.n400_section_mock_results
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_admin()));
CREATE POLICY "n400 section mock results own insert" ON public.n400_section_mock_results
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 section mock results own update" ON public.n400_section_mock_results
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 section mock results own delete" ON public.n400_section_mock_results
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- n400_user_profile: own row; staff and admins read all.
DROP POLICY IF EXISTS "n400 user profile own write" ON public.n400_user_profile;
DROP POLICY IF EXISTS "n400 user profile own read" ON public.n400_user_profile;
DROP POLICY IF EXISTS "n400 user profile staff read" ON public.n400_user_profile;
CREATE POLICY "n400 user profile read" ON public.n400_user_profile
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_staff_or_admin()));
CREATE POLICY "n400 user profile own insert" ON public.n400_user_profile
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 user profile own update" ON public.n400_user_profile
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 user profile own delete" ON public.n400_user_profile
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- n400_user_badges: read-only for owners and admins (awards are server-side).
DROP POLICY IF EXISTS "n400_user_badges_read_own" ON public.n400_user_badges;
DROP POLICY IF EXISTS "n400_user_badges_admin_read" ON public.n400_user_badges;
CREATE POLICY "n400 user badges read" ON public.n400_user_badges
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_admin()));

-- n400_quiz_attempts: "n400 attempts own practice insert" (n400_37) stays.
DROP POLICY IF EXISTS "n400 attempts own select" ON public.n400_quiz_attempts;
DROP POLICY IF EXISTS "n400 attempts admin read" ON public.n400_quiz_attempts;
CREATE POLICY "n400 attempts read" ON public.n400_quiz_attempts
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_admin()));

-- n400_question_attempts: "n400 question attempts own practice insert" (n400_37) stays.
DROP POLICY IF EXISTS "n400 question attempts own select" ON public.n400_question_attempts;
DROP POLICY IF EXISTS "n400 question attempts admin read" ON public.n400_question_attempts;
CREATE POLICY "n400 question attempts read" ON public.n400_question_attempts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.n400_quiz_attempts a
                 WHERE a.id = n400_question_attempts.attempt_id
                   AND a.user_id = (select auth.uid()))
         OR (select public.is_admin()));

-- n400_growth_events: own rows; staff and admins read all.
DROP POLICY IF EXISTS "n400 growth events own insert client types" ON public.n400_growth_events;
DROP POLICY IF EXISTS "n400 growth events own read" ON public.n400_growth_events;
DROP POLICY IF EXISTS "n400 growth events staff read" ON public.n400_growth_events;
CREATE POLICY "n400 growth events read" ON public.n400_growth_events
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_staff_or_admin()));
CREATE POLICY "n400 growth events own insert client types" ON public.n400_growth_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid())
              AND event_type = ANY (ARRAY['checklist_viewed', 'consultation_form_opened']));

-- n400_lead_profiles: own row; staff and admins read all.
DROP POLICY IF EXISTS "n400 lead profiles own read" ON public.n400_lead_profiles;
DROP POLICY IF EXISTS "n400 lead profiles staff read" ON public.n400_lead_profiles;
CREATE POLICY "n400 lead profiles read" ON public.n400_lead_profiles
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_staff_or_admin()));

-- n400_profile_prompts: own row; staff and admins read all.
DROP POLICY IF EXISTS "n400 profile prompts own read" ON public.n400_profile_prompts;
DROP POLICY IF EXISTS "n400 profile prompts staff read" ON public.n400_profile_prompts;
CREATE POLICY "n400 profile prompts read" ON public.n400_profile_prompts
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_staff_or_admin()));

-- n400_consultation_requests: own insert/read; staff and admins read; admins update.
DROP POLICY IF EXISTS "n400 consultation own insert" ON public.n400_consultation_requests;
DROP POLICY IF EXISTS "n400 consultation own read" ON public.n400_consultation_requests;
DROP POLICY IF EXISTS "n400 consultation staff read" ON public.n400_consultation_requests;
DROP POLICY IF EXISTS "n400 consultation admin update" ON public.n400_consultation_requests;
CREATE POLICY "n400 consultation read" ON public.n400_consultation_requests
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.is_staff_or_admin()));
CREATE POLICY "n400 consultation own insert" ON public.n400_consultation_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "n400 consultation admin update" ON public.n400_consultation_requests
  FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));

-- n400_cta_decision_log: staff and admins read.
DROP POLICY IF EXISTS "n400 cta decision log staff read" ON public.n400_cta_decision_log;
CREATE POLICY "n400 cta decision log staff read" ON public.n400_cta_decision_log
  FOR SELECT TO authenticated USING ((select public.is_staff_or_admin()));

-- Covering indexes for foreign keys (small tables: no CONCURRENTLY).
CREATE INDEX IF NOT EXISTS n400_bookmarks_question_id_idx ON public.n400_bookmarks (question_id);
CREATE INDEX IF NOT EXISTS n400_consultation_requests_user_id_idx ON public.n400_consultation_requests (user_id);
CREATE INDEX IF NOT EXISTS n400_user_badges_slug_idx ON public.n400_user_badges (slug);
CREATE INDEX IF NOT EXISTS n400_user_badges_trigger_attempt_id_idx ON public.n400_user_badges (trigger_attempt_id);
