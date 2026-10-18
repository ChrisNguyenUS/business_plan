/** @jest-environment node */
import { GET } from '@/app/api/cron/sales-ready/route'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn(() => null) }))

const call = (auth?: string) =>
  GET(new Request('http://localhost/api/cron/sales-ready', auth ? { headers: { authorization: auth } } : {}))

describe('GET /api/cron/sales-ready', () => {
  const saved = { ...process.env }
  beforeEach(() => jest.clearAllMocks())
  afterEach(() => {
    process.env = { ...saved }
  })

  it('500s without CRON_SECRET configured, before doing any work', async () => {
    delete process.env.CRON_SECRET
    expect((await call('Bearer anything')).status).toBe(500)
  })

  it('401s without or with a wrong bearer token', async () => {
    process.env.CRON_SECRET = 's3cret'
    expect((await call()).status).toBe(401)
    expect((await call('Bearer nope')).status).toBe(401)
  })

  it('500s when the service-role key is missing, even with the right secret', async () => {
    process.env.CRON_SECRET = 's3cret'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.com'
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect((await call('Bearer s3cret')).status).toBe(500)
  })

  it('500s when NEXT_PUBLIC_SITE_URL is missing (email links would be relative)', async () => {
    process.env.CRON_SECRET = 's3cret'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy'
    delete process.env.NEXT_PUBLIC_SITE_URL
    const res = await call('Bearer s3cret')
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'not configured' })
    expect(createAdminClient).not.toHaveBeenCalled()
  })
})
