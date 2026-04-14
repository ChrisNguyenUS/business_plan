import { parseUscisStatus } from '@/lib/uscis/status'

describe('parseUscisStatus', () => {
  it('returns status and description from USCIS HTML response', () => {
    const html = `
      <div class="rows text-center">
        <h4>Case Was Approved</h4>
        <p>On April 5, 2026, we approved your Form N-400.</p>
      </div>
    `
    const result = parseUscisStatus(html)
    expect(result.status).toBe('Case Was Approved')
    expect(result.description).toContain('we approved your Form N-400')
  })

  it('returns unknown status if HTML is unrecognized', () => {
    const result = parseUscisStatus('<html><body>Error</body></html>')
    expect(result.status).toBe('Unknown')
    expect(result.description).toBe('')
  })
})
