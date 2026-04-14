import { parseUscisStatus, fetchUscisStatus } from '@/lib/uscis/status'

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

describe('fetchUscisStatus', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('throws an error if the response is not OK', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 })
    
    // We expect the promise to reject with USCIS returned 500
    await expect(fetchUscisStatus('IOE123456789')).rejects.toThrow('USCIS returned 500')
  })

  it('calls fetch with URL encoded params and returns parsed status', async () => {
    const fakeHtml = `
      <div class="rows text-center">
        <h4>Request for Evidence Was Sent</h4>
        <p>We mailed a request for additional evidence.</p>
      </div>
    `
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: jest.fn().mockResolvedValue(fakeHtml),
    })

    const result = await fetchUscisStatus('IOE0987654321')
    
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://egov.uscis.gov/casestatus/mycasestatus.do',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    )
    
    expect(result.status).toBe('Request for Evidence Was Sent')
    expect(result.description).toContain('We mailed a request for additional evidence.')
  })
})
