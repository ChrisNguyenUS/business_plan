import { emailKindFor, renderProgressEmail, type ProgressEmailInput } from '@/lib/jobs/email'

const base: ProgressEmailInput = {
  kind: 'step_done',
  clientName: 'An Nguyen',
  serviceEn: 'LLC formation',
  serviceVi: 'Thành lập LLC',
  progressLabel: '3/9',
  stepTitleEn: 'Get your EIN',
  stepTitleVi: 'Xin mã số thuế EIN',
  stepDescriptionEn: 'We apply for your EIN with the IRS.',
  stepDescriptionVi: 'Manna xin EIN từ IRS.',
  note: null,
}

describe('emailKindFor', () => {
  it('emails only for done and waiting_client', () => {
    expect(emailKindFor('done')).toBe('step_done')
    expect(emailKindFor('waiting_client')).toBe('step_waiting_client')
    expect(emailKindFor('todo')).toBeNull()
    expect(emailKindFor('in_progress')).toBeNull()
    expect(emailKindFor('skipped')).toBeNull()
  })
})

describe('renderProgressEmail', () => {
  it('writes a done email with both languages, Vietnamese first, and the progress', () => {
    const { subject, html, text } = renderProgressEmail(base)
    expect(subject).toBe('[Manna] LLC formation: Get your EIN — done / xong (3/9)')
    expect(html.indexOf('Xin chào An Nguyen')).toBeGreaterThan(-1)
    expect(html.indexOf('Xin chào')).toBeLessThan(html.indexOf('Hello An Nguyen'))
    expect(html).toContain('Tiến độ: 3/9')
    expect(html).toContain('Progress: 3/9')
    expect(text.indexOf('Xin chào')).toBeLessThan(text.indexOf('Hello'))
  })

  it('has no "what we need" block when the step is done', () => {
    const { html, text } = renderProgressEmail(base)
    expect(html).not.toContain('Việc của bạn')
    expect(html).not.toContain('What we need from you')
    expect(text).not.toContain('Việc của bạn')
  })

  it('adds the "what we need from you" block, with the step description, when waiting on the client', () => {
    const { subject, html, text } = renderProgressEmail({ ...base, kind: 'step_waiting_client' })
    expect(subject).toBe('[Manna] LLC formation: action needed / cần bạn hỗ trợ — Get your EIN')
    expect(html).toContain('Việc của bạn')
    expect(html).toContain('What we need from you')
    expect(html).toContain('Manna xin EIN từ IRS.')
    expect(html).toContain('We apply for your EIN with the IRS.')
    expect(text).toContain('Việc của bạn: Manna xin EIN từ IRS.')
    expect(text).toContain('What we need from you: We apply for your EIN with the IRS.')
  })

  it('still shows the block when the step has no description', () => {
    const { html } = renderProgressEmail({
      ...base,
      kind: 'step_waiting_client',
      stepDescriptionEn: null,
      stepDescriptionVi: null,
    })
    expect(html).toContain('Việc của bạn')
    expect(html).toContain('What we need from you')
  })

  it('escapes everything a person typed', () => {
    const { html } = renderProgressEmail({
      ...base,
      clientName: '<b>An</b>',
      stepTitleEn: '<script>alert(1)</script>',
      note: 'say "hi" & <i>bye</i>',
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>An</b>')
    expect(html).not.toContain('<i>bye</i>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('say &quot;hi&quot; &amp; &lt;i&gt;bye&lt;/i&gt;')
  })

  it('shows the note once, keeps its line breaks, and leaves it out when blank', () => {
    const withNote = renderProgressEmail({ ...base, note: 'Line one\nLine two' })
    expect(withNote.html).toContain('Line one<br>Line two')
    expect(withNote.html.match(/Line one/g)).toHaveLength(1)
    expect(withNote.text).toContain('Line one\nLine two')

    for (const note of [null, '', '   \n ']) {
      const out = renderProgressEmail({ ...base, note })
      expect(out.html).not.toContain('Ghi chú từ Manna')
      expect(out.text).not.toContain('Ghi chú từ Manna')
    }
  })

  it('keeps the subject on one line even if a title has line breaks', () => {
    const { subject } = renderProgressEmail({ ...base, stepTitleEn: 'Get\r\nyour EIN' })
    expect(subject).not.toMatch(/[\r\n]/)
    expect(subject).toContain('Get your EIN')
  })
})
