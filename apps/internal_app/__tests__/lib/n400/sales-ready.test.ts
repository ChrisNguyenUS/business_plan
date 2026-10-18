import { buildSalesReadyEmail, selectClaimedLeads, type SalesReadyLead } from '@/lib/n400/sales-ready'

const lead = (user_id: string, extra: Partial<SalesReadyLead> = {}): SalesReadyLead => ({
  user_id, full_name: `Lead ${user_id}`, email: `${user_id}@x.com`,
  effective_score: 210, last_activity_date: '2026-10-17', ...extra,
})

describe('selectClaimedLeads', () => {
  it('keeps only the leads this run claimed, in ready order', () => {
    const out = selectClaimedLeads([lead('a'), lead('b'), lead('c')], ['c', 'a'])
    expect(out.map((l) => l.user_id)).toEqual(['a', 'c'])
  })

  it('returns nothing when a concurrent run claimed everything', () => {
    expect(selectClaimedLeads([lead('a')], [])).toEqual([])
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

  it('escapes the score too', () => {
    const mail = buildSalesReadyEmail(
      [lead('a', { effective_score: '<i>9</i>' as unknown as number })],
      'https://x',
    )
    expect(mail.html).toContain('score &lt;i&gt;9&lt;/i&gt;')
    expect(mail.html).not.toContain('<i>9</i>')
  })

  it('falls back to Unnamed and an em dash for missing name, email and date', () => {
    const mail = buildSalesReadyEmail(
      [lead('a', { full_name: null, email: null, last_activity_date: null })],
      'https://x',
    )
    expect(mail.html).toContain('>Unnamed</a>')
    expect(mail.html).toContain('· — · score')
    expect(mail.html).toContain('last active —')
    expect(mail.text).toContain('- Unnamed (—)')
  })
})
