import { buildDecisionEmail, buildRequestEmail } from '@/lib/deletion/email'

describe('buildRequestEmail', () => {
  const req = { entity_type: 'client' as const, entity_label: 'John Doe', reason: 'Duplicate of Jon Doe' }

  it('says who asked for what, why, and links the inbox', () => {
    const mail = buildRequestEmail(req, 'Lan Tran', 'https://app.example.com/')
    expect(mail.subject).toBe('Deletion request: Delete client — John Doe')
    expect(mail.text).toContain('Lan Tran asked to delete client: John Doe')
    expect(mail.text).toContain('Reason: Duplicate of Jon Doe')
    expect(mail.text).toContain('https://app.example.com/deletion-requests')
    expect(mail.html).toContain('href="https://app.example.com/deletion-requests"')
  })

  it('works without a site URL', () => {
    const mail = buildRequestEmail(req, 'Lan Tran')
    expect(mail.text).toContain('Deletion requests page of the internal app')
    expect(mail.html).not.toContain('href=')
  })

  it('escapes HTML and keeps the subject on one line', () => {
    const mail = buildRequestEmail(
      { entity_type: 'case', entity_label: 'A\nB <i>', reason: '<script>alert(1)</script>' },
      'Eve "x"',
    )
    expect(mail.subject).toBe('Deletion request: Delete case — A B <i>')
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
    expect(mail.html).toContain('Eve &quot;x&quot;')
  })
})

describe('buildDecisionEmail', () => {
  it('reports an approval', () => {
    const mail = buildDecisionEmail(
      { entity_type: 'lead', entity_label: 'Mai', status: 'approved', decision_note: null },
      'https://app.example.com',
    )
    expect(mail.subject).toBe('Approved: Hide lead — Mai')
    expect(mail.text).toContain('An admin approved your request to hide lead: Mai.')
    expect(mail.text).not.toContain('Note:')
  })

  it('reports a rejection with the escaped note', () => {
    const mail = buildDecisionEmail({
      entity_type: 'case',
      entity_label: 'MOS-1A2B',
      status: 'rejected',
      decision_note: 'Still <active>',
    })
    expect(mail.subject).toBe('Rejected: Delete case — MOS-1A2B')
    expect(mail.text).toContain('Note: Still <active>')
    expect(mail.html).toContain('Still &lt;active&gt;')
  })
})
