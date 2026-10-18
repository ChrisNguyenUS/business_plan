import { buildSalesReadyEmail, planSalesReadyDigest, type SalesReadyLead } from '@/lib/n400/sales-ready'

const lead = (user_id: string, extra: Partial<SalesReadyLead> = {}): SalesReadyLead => ({
  user_id, full_name: `Lead ${user_id}`, email: `${user_id}@x.com`,
  effective_score: 210, last_activity_date: '2026-10-17', ...extra,
})

describe('planSalesReadyDigest', () => {
  it('announces only leads not announced before', () => {
    const plan = planSalesReadyDigest([lead('a'), lead('b')], new Set(['b']))
    expect(plan.toNotify.map((l) => l.user_id)).toEqual(['a'])
  })

  it('clears the stamp of leads that fell below the threshold so a re-cross re-notifies', () => {
    const plan = planSalesReadyDigest([lead('a')], new Set(['a', 'gone']))
    expect(plan.toNotify).toEqual([])
    expect(plan.toReset).toEqual(['gone'])
  })

  it('does nothing when nobody is sales-ready and nobody was announced', () => {
    expect(planSalesReadyDigest([], new Set())).toEqual({ toNotify: [], toReset: [] })
  })
})

describe('buildSalesReadyEmail', () => {
  it('links each lead to its internal page and escapes user text', () => {
    const mail = buildSalesReadyEmail(
      [lead('u1', { full_name: '<b>Eve</b> & co' })],
      'https://app.example.com/',
    )
    expect(mail.subject).toBe('N400Ready — 1 new Sales-Ready lead')
    expect(mail.html).toContain('https://app.example.com/leads/u1')
    expect(mail.html).toContain('&lt;b&gt;Eve&lt;/b&gt; &amp; co')
    expect(mail.html).not.toContain('<b>Eve</b>')
    expect(mail.text).toContain('https://app.example.com/leads/u1')
  })

  it('pluralises the subject', () => {
    expect(buildSalesReadyEmail([lead('a'), lead('b')], 'https://x').subject).toBe(
      'N400Ready — 2 new Sales-Ready leads',
    )
  })
})
