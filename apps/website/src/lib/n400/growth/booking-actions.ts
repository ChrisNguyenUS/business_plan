'use server';

// Booking flow writes/reads (spec §5). The insert is the source of truth:
// n400_17's trigger stamps consultation_requested_at and recomputes the score,
// so this file emits NO growth event and touches NO lead-profile column.
// Resend + CAPI run after the insert, best-effort — they can fail without
// costing the user their request.

import { getAuthedServerClient } from './server-client';
import { isFeatureOn, loadFeatureFlags } from './flags';
import {
  topicForCta, validateBookingInput,
  type ConsultationTopic,
} from './booking';
import { notifyConsultationRequest } from './notify';
import { sendCapiLead } from '@/lib/analytics/meta-capi';
import { getDisplayName } from '@/lib/profile-utils';

export interface BookingContext {
  enabled: boolean;
  alreadyRequested: boolean;
  prefillName: string;
  sourceCta: string | null;
  prefillTopic: ConsultationTopic;
}

const DISABLED: BookingContext = {
  enabled: false, alreadyRequested: false, prefillName: '', sourceCta: null, prefillTopic: 'n400_review',
};

async function latestClickedCta(
  supabase: Awaited<ReturnType<typeof getAuthedServerClient>>['supabase'],
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('n400_growth_events')
    .select('payload')
    .eq('user_id', userId)
    .eq('event_type', 'cta_clicked')
    .order('created_at', { ascending: false })
    .limit(1);
  return ((data?.[0]?.payload as { cta_id?: string } | null)?.cta_id) ?? null;
}

export async function getBookingContext(): Promise<BookingContext> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return DISABLED;
  const flags = await loadFeatureFlags(supabase, ['growth_engine', 'booking_form']);
  if (!isFeatureOn(flags.get('growth_engine'), user.id) || !isFeatureOn(flags.get('booking_form'), user.id)) {
    return DISABLED;
  }

  const [openRes, profileRes, sourceCta] = await Promise.all([
    supabase
      .from('n400_consultation_requests')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['new', 'contacted'])
      .limit(1),
    supabase
      .from('profiles')
      .select('first_name, middle_name, last_name, preferred_name, name_suffix, full_name')
      .eq('id', user.id)
      .maybeSingle(),
    // Re-read at submit time too (see below) — the source CTA can legitimately
    // change between form load and submit, so this isn't a duplicate call to collapse.
    latestClickedCta(supabase, user.id),
  ]);

  const display = profileRes.data ? getDisplayName(profileRes.data) : '';
  return {
    enabled: true,
    alreadyRequested: (openRes.data ?? []).length > 0,
    prefillName: display === 'User' ? '' : display,
    sourceCta,
    prefillTopic: topicForCta(sourceCta),
  };
}

export async function submitConsultationRequest(raw: {
  name?: unknown; phone?: unknown; preferredTime?: unknown; topic?: unknown;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getAuthedServerClient();
  if (!user) return { ok: false, error: 'unauthorized' };
  const flags = await loadFeatureFlags(supabase, ['growth_engine', 'booking_form']);
  if (!isFeatureOn(flags.get('growth_engine'), user.id) || !isFeatureOn(flags.get('booking_form'), user.id)) {
    return { ok: false, error: 'disabled' };
  }

  const v = validateBookingInput(raw);
  if (!v.ok) return { ok: false, error: `invalid_${v.error}` };

  // Server-side dedupe: one open request per user. Idempotent success —
  // a double-submit or a second tab should land on the confirm screen, not an error.
  // NOTE: this is a check-then-insert race, not atomic — a true concurrent double-submit
  // (two requests landing within the same round-trip) could still create two rows. Accepted
  // tradeoff for a lead-capture form (worst case: a duplicate lead record + duplicate staff
  // email), not worth a DB constraint for this volume/stakes. Revisit with a partial unique
  // index on (user_id) WHERE status IN ('new','contacted') if this ever becomes a real problem.
  const open = await supabase
    .from('n400_consultation_requests')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['new', 'contacted'])
    .limit(1);
  if ((open.data ?? []).length > 0) return { ok: true };

  const [touchRes, sourceCta] = await Promise.all([
    supabase.from('n400_lead_profiles').select('first_touch, last_touch').eq('user_id', user.id).maybeSingle(),
    // Deliberate second read (getBookingContext already reads this once at form-load
    // time): the user may have clicked a different CTA since then, so the attribution
    // stamped on the insert must reflect the freshest click, not the load-time value.
    latestClickedCta(supabase, user.id),
  ]);

  const { data: inserted, error } = await supabase
    .from('n400_consultation_requests')
    .insert({
      user_id: user.id,
      name: v.value.name,
      phone: v.value.phone,
      preferred_time: v.value.preferredTime,
      topic: v.value.topic,
      source_cta: sourceCta,
      first_touch: touchRes.data?.first_touch ?? null,
      last_touch: touchRes.data?.last_touch ?? null,
    })
    .select('id')
    .single();
  if (error || !inserted) {
    console.error('Consultation insert error:', error);
    return { ok: false, error: 'insert_failed' };
  }

  // Best-effort side effects — both helpers catch internally and never throw.
  await Promise.all([
    notifyConsultationRequest({
      name: v.value.name, phone: v.value.phone,
      preferredTime: v.value.preferredTime, topic: v.value.topic,
      sourceCta, userEmail: user.email ?? null,
    }),
    sendCapiLead({
      eventId: `n400-consultation-${inserted.id}`,
      eventSourceUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mannaos.com'}/n400ready/consultation`,
      user: { emails: user.email ? [user.email] : [], phones: [v.value.phone] },
      customData: { source: 'n400ready', topic: v.value.topic, source_cta: sourceCta ?? 'none' },
    }),
  ]);

  return { ok: true };
}
