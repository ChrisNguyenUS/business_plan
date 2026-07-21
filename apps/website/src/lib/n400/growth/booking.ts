// Pure booking logic (spec §5). No IO here — the server action calls these.

export const CONSULTATION_TOPICS = ['n400_review', 'interview_prep', 'writing', 'speaking', 'other'] as const;
export type ConsultationTopic = (typeof CONSULTATION_TOPICS)[number];

export const PREFERRED_TIMES = ['weekday_day', 'weekday_evening', 'weekend'] as const;
export type PreferredTime = (typeof PREFERRED_TIMES)[number];

/** Prefill the form topic from the CTA that brought the user here (spec §5.1). */
export function topicForCta(sourceCta: string | null): ConsultationTopic {
  if (!sourceCta) return 'n400_review';
  if (sourceCta.startsWith('s5_')) return 'writing';
  if (sourceCta.startsWith('s6_')) return 'speaking';
  if (sourceCta.startsWith('s3_')) return 'n400_review';
  return 'interview_prep'; // s1 / s4 / s9 — readiness & mock scenarios
}

export interface BookingInput {
  name: string;
  phone: string;
  preferredTime: PreferredTime;
  topic: ConsultationTopic;
}

export type BookingValidation =
  | { ok: true; value: BookingInput }
  | { ok: false; error: 'name' | 'phone' | 'preferred_time' | 'topic' };

export function validateBookingInput(raw: {
  name?: unknown; phone?: unknown; preferredTime?: unknown; topic?: unknown;
}): BookingValidation {
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name || name.length > 120) return { ok: false, error: 'name' };

  const phone = typeof raw.phone === 'string' ? raw.phone.trim() : '';
  // Lenient by design: US or VN formats, 7–20 chars, at least 7 digits.
  if (!/^[+()\d\s.\-]{7,20}$/.test(phone) || (phone.match(/\d/g) ?? []).length < 7) {
    return { ok: false, error: 'phone' };
  }

  if (!(PREFERRED_TIMES as readonly string[]).includes(raw.preferredTime as string)) {
    return { ok: false, error: 'preferred_time' };
  }
  if (!(CONSULTATION_TOPICS as readonly string[]).includes(raw.topic as string)) {
    return { ok: false, error: 'topic' };
  }
  return {
    ok: true,
    value: { name, phone, preferredTime: raw.preferredTime as PreferredTime, topic: raw.topic as ConsultationTopic },
  };
}
