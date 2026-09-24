import type { GrowthEventType } from '@mannaos/n400-growth'

/** One rendered row of the lead timeline. */
export interface TimelineEntry {
  /** Material Symbols icon name. */
  icon: string
  title: string
  /** Secondary line; null renders nothing. */
  detail: string | null
}

/** payload is jsonb — every read has to tolerate a missing or wrong-typed
 *  field rather than throwing inside a server component render. */
function str(payload: Record<string, unknown>, key: string): string | null {
  const v = payload[key]
  return typeof v === 'string' && v.length > 0 ? v : null
}

function num(payload: Record<string, unknown>, key: string): number | null {
  const v = payload[key]
  return typeof v === 'number' ? v : null
}

function joinDot(parts: (string | null)[]): string | null {
  const kept = parts.filter((p): p is string => p !== null && p.length > 0)
  return kept.length > 0 ? kept.join(' · ') : null
}

function attemptDetail(payload: Record<string, unknown>): string | null {
  const score = num(payload, 'score')
  const total = num(payload, 'total')
  if (score === null || total === null) return null
  const passed = payload['passed']
  const verdict = typeof passed === 'boolean' ? (passed ? 'passed' : 'failed') : null
  return joinDot([`${score}/${total}`, verdict])
}

/**
 * Turn one n400_growth_events row into a renderable timeline entry.
 *
 * Every branch here corresponds to an event type in @mannaos/n400-growth.
 * The compiler — not the test — catches an unmapped event type: if a member of
 * GrowthEventType has no case above, TypeScript prevents it from reaching the
 * default clause, causing a compile error on the `never` assignment below.
 * The test documents that every defined type renders something useful.
 */
export function describeEvent(
  type: GrowthEventType,
  payload: Record<string, unknown>,
): TimelineEntry {
  switch (type) {
    case 'account_created':
      return { icon: 'person_add', title: 'Signed up', detail: null }

    case 'onboarding_completed':
      return { icon: 'task_alt', title: 'Completed onboarding', detail: null }

    case 'address_entered':
      return {
        icon: 'home_pin',
        title: 'Entered address',
        detail: joinDot([str(payload, 'city'), str(payload, 'state')])?.replace(' · ', ', ') ?? null,
      }

    // One practice event is one graded question, not one session.
    case 'practice_completed':
      return {
        icon: 'school',
        title: 'Practice question graded',
        detail: attemptDetail(payload),
      }

    case 'mock_completed':
      return {
        icon: 'quiz',
        title: 'Mock test completed',
        detail: attemptDetail(payload),
      }

    case 'prompt_shown':
      return {
        icon: 'help',
        title: `Asked: ${str(payload, 'question_key') ?? 'unknown'}`,
        detail: str(payload, 'surface'),
      }

    case 'prompt_answered':
      return {
        icon: 'check_circle',
        title: `Answered: ${str(payload, 'question_key') ?? 'unknown'}`,
        detail: joinDot([str(payload, 'answer'), str(payload, 'surface')]),
      }

    case 'prompt_skipped':
      return {
        icon: 'cancel',
        title: `Skipped: ${str(payload, 'question_key') ?? 'unknown'}`,
        detail: str(payload, 'surface'),
      }

    case 'cta_shown':
      return {
        icon: 'campaign',
        title: `CTA shown: ${str(payload, 'cta_id') ?? 'unknown'}`,
        detail: str(payload, 'surface'),
      }

    case 'cta_clicked':
      return {
        icon: 'ads_click',
        title: `CTA clicked: ${str(payload, 'cta_id') ?? 'unknown'}`,
        detail: str(payload, 'surface'),
      }

    case 'cta_dismissed':
      return {
        icon: 'do_not_disturb_on',
        title: `CTA dismissed: ${str(payload, 'cta_id') ?? 'unknown'}`,
        detail: str(payload, 'surface'),
      }

    case 'consultation_form_opened':
      return { icon: 'event', title: 'Opened the consultation form', detail: null }

    // Reserved in the taxonomy, not emitted yet. Mapped so they render sensibly
    // if they ever start firing.
    case 'section_completed':
      return { icon: 'done_all', title: 'Section completed', detail: null }
    case 'readiness_snapshot':
      return { icon: 'insights', title: 'Readiness snapshot', detail: null }
    case 'app_shared':
      return { icon: 'share', title: 'Shared the app', detail: null }
    case 'review_left':
      return { icon: 'star', title: 'Left a review', detail: null }
    case 'friend_invited':
      return { icon: 'group_add', title: 'Invited a friend', detail: null }
    case 'push_disabled':
      return { icon: 'notifications_off', title: 'Disabled push', detail: null }

    default: {
      // Compile-time exhaustiveness: if a member of GrowthEventType has no
      // branch above, `type` is not `never` here and this assignment fails to
      // compile. That is the check that actually protects us — see the note on
      // the test below.
      const unhandled: never = type;
      // Runtime fallback: event_type is an ungoverned TEXT column, so a value
      // outside the union can still arrive from the database. Degrade, never throw.
      return { icon: 'circle', title: String(unhandled), detail: null };
    }
  }
}
