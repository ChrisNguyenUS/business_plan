/** @jest-environment node */
import { GET } from '@/app/api/cron/sales-ready/route'

const call = (auth?: string) =>
  GET(new Request('http://localhost/api/cron/sales-ready', auth ? { headers: { authorization: auth } } : {}))

describe('GET /api/cron/sales-ready', () => {
  const saved = { ...process.env }
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
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect((await call('Bearer s3cret')).status).toBe(500)
  })
})
