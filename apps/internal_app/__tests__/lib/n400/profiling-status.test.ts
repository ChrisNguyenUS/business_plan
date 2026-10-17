import {
  answersFromLead,
  describeProfiling,
  type PromptDefinitionRow,
  type PromptStateRow,
} from '@/lib/n400/profiling-status'

// Mirrors the five rows seeded in n400_prompt_definitions (n400_16).
const DEFS: PromptDefinitionRow[] = [
  {
    question_key: 'filed',
    variant: 'a',
    text_en: 'Have you already submitted your N-400?',
    options: [
      { value: 'yes', label_en: 'Yes' },
      { value: 'not_yet', label_en: 'Not yet' },
    ],
    trigger: { min_count: 1, after_event: 'practice_completed' },
    depends_on: null,
    sort_order: 1,
  },
  {
    question_key: 'filing_timeline',
    variant: 'a',
    text_en: 'When do you plan to submit your application?',
    options: [
      { value: '30d', label_en: 'Within 30 days' },
      { value: 'exploring', label_en: 'Just exploring' },
    ],
    trigger: { min_count: 1, after_event: 'mock_completed' },
    depends_on: { question_key: 'filed', answer: 'not_yet' },
    sort_order: 2,
  },
  {
    question_key: 'interview_notice',
    variant: 'a',
    text_en: 'Have you received your interview notice?',
    options: [
      { value: 'yes', label_en: 'Yes' },
      { value: 'no', label_en: 'No' },
    ],
    trigger: { distinct_practice_days: 3 },
    depends_on: { question_key: 'filed', answer: 'yes' },
    sort_order: 3,
  },
  {
    question_key: 'interview_date',
    variant: 'a',
    text_en: 'When is your interview?',
    options: [{ value: '__date__', label_en: 'Pick a date' }],
    trigger: { immediately_after: 'interview_notice' },
    depends_on: { question_key: 'interview_notice', answer: 'yes' },
    sort_order: 4,
  },
  {
    question_key: 'wants_guidance',
    variant: 'a',
    text_en: 'Would you like FREE guidance if you have questions?',
    options: [
      { value: 'yes', label_en: 'Yes' },
      { value: 'maybe', label_en: 'Maybe' },
    ],
    trigger: { distinct_practice_days: 5 },
    depends_on: null,
    sort_order: 5,
  },
]

const NO_ANSWERS = answersFromLead({
  n400_filed: null,
  filing_timeline: null,
  interview_scheduled: null,
  interview_date: null,
  wants_guidance: null,
})

const state = (question_key: string, s: Partial<PromptStateRow>): PromptStateRow => ({
  question_key,
  shown_count: 0,
  last_shown_at: null,
  answered_at: null,
  skipped_at: null,
  ...s,
})

const byKey = (rows: ReturnType<typeof describeProfiling>) =>
  Object.fromEntries(rows.map((r) => [r.key, r]))

describe('describeProfiling', () => {
  it('flags a question that was shown but ignored — the Vu Tran case', () => {
    const rows = byKey(
      describeProfiling(DEFS, [state('filed', { shown_count: 1, last_shown_at: '2026-10-15T05:11:12Z' })], NO_ANSWERS),
    )
    expect(rows.filed).toMatchObject({
      status: 'ignored',
      question: 'Have you already submitted your N-400?',
      shownCount: 1,
      at: '2026-10-15T05:11:12Z',
    })
    // Follow-ups wait on the unanswered gate question.
    expect(rows.filing_timeline).toMatchObject({ status: 'locked', note: 'Only if "Not yet" above' })
    expect(rows.interview_notice).toMatchObject({ status: 'locked', note: 'Only if "Yes" above' })
    expect(rows.wants_guidance).toMatchObject({
      status: 'not_asked',
      note: 'Asked after 5 practice days',
    })
  })

  it('keeps definition order and one row per question even with several variants', () => {
    const withVariant = [...DEFS, { ...DEFS[0], variant: 'b', text_en: 'Filed yet?' }]
    const rows = describeProfiling(withVariant, [], NO_ANSWERS)
    expect(rows.map((r) => r.key)).toEqual([
      'filed',
      'filing_timeline',
      'interview_notice',
      'interview_date',
      'wants_guidance',
    ])
    expect(rows[0].question).toBe('Have you already submitted your N-400?')
  })

  it('shows the human label of an answer and marks the other branch not applicable', () => {
    const answers = answersFromLead({
      n400_filed: false,
      filing_timeline: '30d',
      interview_scheduled: null,
      interview_date: null,
      wants_guidance: null,
    })
    const rows = byKey(
      describeProfiling(
        DEFS,
        [
          state('filed', { shown_count: 2, answered_at: '2026-07-24T16:34:55Z' }),
          state('filing_timeline', { shown_count: 1, answered_at: '2026-07-30T10:00:00Z' }),
        ],
        answers,
      ),
    )
    expect(rows.filed).toMatchObject({ status: 'answered', answer: 'Not yet', at: '2026-07-24T16:34:55Z' })
    expect(rows.filing_timeline).toMatchObject({ status: 'answered', answer: 'Within 30 days' })
    expect(rows.interview_notice).toMatchObject({ status: 'not_applicable' })
    expect(rows.interview_date).toMatchObject({ status: 'not_applicable' })
  })

  it('formats an interview date answer as a date', () => {
    const answers = answersFromLead({
      n400_filed: true,
      filing_timeline: null,
      interview_scheduled: true,
      interview_date: '2026-11-03',
      wants_guidance: null,
    })
    const rows = byKey(describeProfiling(DEFS, [], answers))
    expect(rows.interview_notice).toMatchObject({ status: 'answered', answer: 'Yes' })
    expect(rows.interview_date).toMatchObject({ status: 'answered', answer: 'Nov 3, 2026' })
  })

  it('reports a skip', () => {
    const rows = byKey(
      describeProfiling(
        DEFS,
        [state('wants_guidance', { shown_count: 1, skipped_at: '2026-10-01T00:00:00Z' })],
        NO_ANSWERS,
      ),
    )
    expect(rows.wants_guidance).toMatchObject({ status: 'skipped', at: '2026-10-01T00:00:00Z' })
  })

  it('describes each trigger in words', () => {
    const rows = byKey(describeProfiling(DEFS, [], NO_ANSWERS))
    expect(rows.filed.note).toBe('Asked after the first practice question')
  })
})
