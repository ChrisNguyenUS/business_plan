// Where a lead stands on each progressive-profiling question ("Have you filed
// your N-400?" …). Pure: the page loads n400_prompt_definitions,
// n400_profile_prompts and the lead row, this decides what each one means.

export interface PromptOption {
  value: string
  label_en: string
}

/** One row of n400_prompt_definitions (the columns this needs). */
export interface PromptDefinitionRow {
  question_key: string
  variant: string
  text_en: string
  options: PromptOption[]
  trigger: Record<string, unknown>
  depends_on: { question_key: string; answer: string } | null
  sort_order: number
}

/** One row of n400_profile_prompts — this lead's history with a question. */
export interface PromptStateRow {
  question_key: string
  shown_count: number
  last_shown_at: string | null
  answered_at: string | null
  skipped_at: string | null
}

export interface LeadAnswerColumns {
  n400_filed: boolean | null
  filing_timeline: string | null
  interview_scheduled: boolean | null
  interview_date: string | null
  wants_guidance: string | null
}

/**
 * question_key → answer value, read from the n400_lead_profiles columns the
 * answer RPC writes. Same mapping as the website's answersFromLeadProfile
 * (apps/website/src/lib/n400/growth/profiling.ts) — keep the two in step.
 */
export function answersFromLead(lead: LeadAnswerColumns): Record<string, string> {
  const a: Record<string, string> = {}
  if (lead.n400_filed !== null) a.filed = lead.n400_filed ? 'yes' : 'not_yet'
  if (lead.filing_timeline) a.filing_timeline = lead.filing_timeline
  if (lead.interview_scheduled !== null) a.interview_notice = lead.interview_scheduled ? 'yes' : 'no'
  if (lead.interview_date) a.interview_date = lead.interview_date
  if (lead.wants_guidance) a.wants_guidance = lead.wants_guidance
  return a
}

export type ProfilingStatus =
  | 'answered'
  | 'skipped'
  /** Shown at least once, never answered or skipped. */
  | 'ignored'
  | 'not_asked'
  /** Waits on a gate question that has no answer yet. */
  | 'locked'
  /** The gate question was answered the other way; this will never be asked. */
  | 'not_applicable'

export interface ProfilingRow {
  key: string
  question: string
  status: ProfilingStatus
  /** Human label of the answer, when answered. */
  answer: string | null
  shownCount: number
  /** When the status happened: answered/skipped/last shown. */
  at: string | null
  /** Why it hasn't been asked, for locked/not_asked. */
  note: string | null
}

function labelFor(def: PromptDefinitionRow | undefined, value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  return def?.options.find((o) => o.value === value)?.label_en ?? value
}

function triggerNote(trigger: Record<string, unknown>): string {
  const days = trigger['distinct_practice_days']
  if (typeof days === 'number') return `Asked after ${days} practice days`
  if (typeof trigger['immediately_after'] === 'string') return 'Asked right after the question above'
  const after = trigger['after_event']
  const count = typeof trigger['min_count'] === 'number' ? trigger['min_count'] : 1
  if (after === 'practice_completed') {
    return count === 1 ? 'Asked after the first practice question' : `Asked after ${count} practice questions`
  }
  if (after === 'mock_completed') {
    return count === 1 ? 'Asked after the first mock test' : `Asked after ${count} mock tests`
  }
  return 'Not asked yet'
}

/** One definition per question_key — variants differ only in wording. */
export function questionsOf(defs: PromptDefinitionRow[]): PromptDefinitionRow[] {
  const byKey = new Map<string, PromptDefinitionRow>()
  for (const d of [...defs].sort((x, y) => x.variant.localeCompare(y.variant))) {
    if (!byKey.has(d.question_key)) byKey.set(d.question_key, d)
  }
  return [...byKey.values()].sort((x, y) => x.sort_order - y.sort_order)
}

export function describeProfiling(
  defs: PromptDefinitionRow[],
  states: PromptStateRow[],
  answers: Record<string, string>,
): ProfilingRow[] {
  const questions = questionsOf(defs)
  const defByKey = new Map(questions.map((d) => [d.question_key, d]))
  const stateByKey = new Map(states.map((s) => [s.question_key, s]))
  // Gates come before their follow-ups in sort_order, so a branch ruled out
  // higher up is known by the time its children are reached.
  const ruledOut = new Set<string>()

  return questions.map((def) => {
    const st = stateByKey.get(def.question_key)
    const base = {
      key: def.question_key,
      question: def.text_en,
      answer: null,
      shownCount: st?.shown_count ?? 0,
      at: null,
      note: null,
    }

    // The lead row is the source of truth for answers; the state row only
    // tells us when.
    const value = answers[def.question_key]
    if (value !== undefined) {
      return {
        ...base,
        status: 'answered' as const,
        answer: labelFor(def, value),
        at: st?.answered_at ?? null,
      }
    }

    if (def.depends_on) {
      const gate = answers[def.depends_on.question_key]
      if (ruledOut.has(def.depends_on.question_key) || (gate !== undefined && gate !== def.depends_on.answer)) {
        ruledOut.add(def.question_key)
        return { ...base, status: 'not_applicable' as const }
      }
      if (gate === undefined) {
        const need = labelFor(defByKey.get(def.depends_on.question_key), def.depends_on.answer)
        return { ...base, status: 'locked' as const, note: `Only if "${need}" above` }
      }
    }

    if (st?.skipped_at) return { ...base, status: 'skipped' as const, at: st.skipped_at }
    if (st && st.shown_count > 0) {
      return { ...base, status: 'ignored' as const, at: st.last_shown_at }
    }
    return { ...base, status: 'not_asked' as const, note: triggerNote(def.trigger) }
  })
}
