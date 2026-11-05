/** @jest-environment node */
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server'
import nextConfig from '../next.config'

// The internal app shows client PII (A-numbers, immigration cases), so every
// response carries basic browser hardening. Framing stays same-origin only:
// the case PDF page shows /api/pdf/... in an iframe of its own.
async function headersFor(path: string) {
  const res = await unstable_getResponseFromNextConfig({ url: `https://app.example.com${path}`, nextConfig })
  return res.headers
}

describe('security headers from next.config', () => {
  it.each(['/dashboard', '/login', '/api/pdf/abc?caseId=1'])('are set on %s', async (path) => {
    const h = await headersFor(path)
    expect(h.get('x-frame-options')).toBe('SAMEORIGIN')
    expect(h.get('content-security-policy')).toContain("frame-ancestors 'self'")
    expect(h.get('x-content-type-options')).toBe('nosniff')
    expect(h.get('referrer-policy')).toBe('same-origin')
    expect(h.get('strict-transport-security')).toMatch(/max-age=\d+/)
    expect(h.get('permissions-policy')).toContain('camera=()')
  })
})
