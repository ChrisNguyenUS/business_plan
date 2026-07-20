-- Close the G1 RLS gap on n400_growth_events: prompt_answered / prompt_skipped
-- were on the client INSERT whitelist, so any authenticated client could forge
-- them for itself.
--
-- Since G2 both events are emitted ONLY by the SECURITY DEFINER RPCs
-- n400_answer_profile_prompt / n400_skip_profile_prompt (n400_21), alongside
-- prompt_shown from n400_mark_prompt_shown (n400_22) which was already
-- server-only. No client path inserts them — ingestClientEvent has no caller
-- that emits either type — so narrowing the whitelist changes no live
-- behavior.
--
-- Lead score was never at risk: recompute_n400_lead_score (n400_17) reads the
-- n400_lead_profiles COLUMNS for profiling inputs, never the prompt_* events.
-- What this protects is the funnel table G3 builds its shown → answered /
-- skipped conversion analytics on: forged rows there would silently skew
-- per-question, per-variant and per-surface answer rates, and would have to be
-- identified and deleted after the fact.
--
-- Still client-insertable: the cta_* group (G3 owns them; cta_dismissed does
-- feed the dismissed_consultation_cta_3 penalty, but forging it only lowers
-- the forger's own score) plus checklist_viewed / consultation_form_opened.

DROP POLICY IF EXISTS "n400 growth events own insert client types" ON public.n400_growth_events;

CREATE POLICY "n400 growth events own insert client types" ON public.n400_growth_events
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND event_type IN ('cta_shown','cta_dismissed','cta_clicked',
                       'checklist_viewed','consultation_form_opened')
  );
