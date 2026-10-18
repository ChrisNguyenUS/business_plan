/** @jest-environment node */
import { GET } from '@/app/api/cron/sales-ready/route'
import * as admin from '@/lib/supabase/admin'
import * as mailer from '@/lib/jobs/mailer'

// Wrapped, not replaced: by default these run the REAL implementations (so the
// missing-key test hits the real env check); tests override per case and
// beforeEach restores the real behaviour.
jest.mock('@/lib/supabase/admin', () => {
  const actual = jest.requireActual('@/lib/supabase/admin')
  return { createAdminClient: jest.fn(actual.createAdminClient), __actual: actual }
})
jest.mock('@/lib/jobs/mailer', () => {
  const actual = jest.requireActual('@/lib/jobs/mailer')
  return { ...actual, sendWithResend: jest.fn(actual.sendWithResend), __actual: actual }
})

const createAdminClient = admin.createAdminClient as jest.MockedFunction<typeof admin.createAdminClient>
const sendWithResend = mailer.sendWithResend as jest.MockedFunction<typeof mailer.sendWithResend>
const realOf = (m: unknown) => (m as { __actual: Record<string, never> }).__actual

const call = (auth?: string) =>
  GET(new Request('http://localhost/api/cron/sales-ready', auth ? { headers: { authorization: auth } } : {}))

interface Op {
  table: string
  action: 'select' | 'update'
  payload?: unknown
  filters: [string, ...unknown[]][]
}

/** Minimal chainable fake: records every call, resolves with a canned result. */
function fakeClient(results: {
  ready?: { data: unknown[] | null; error: { message: string } | null }
  claim?: { data: unknown[] | null; error: { message: string } | null }
  unclaim?: { error: { message: string } | null }
  reset?: { data: unknown[] | null; error: { message: string } | null }
}) {
  const ops: Op[] = []
  const client = {
    from(table: string) {
      const op: Op = { table, action: 'select', filters: [] }
      ops.push(op)
      const chain: Record<string, unknown> = {}
      const record = (name: string) => (...args: unknown[]) => {
        op.filters.push([name, ...args])
        return chain
      }
      for (const f of ['eq', 'in', 'is', 'not']) chain[f] = record(f)
      chain.select = (...args: unknown[]) => {
        op.filters.push(['select', ...args])
        return chain
      }
      chain.update = (payload: unknown) => {
        op.action = 'update'
        op.payload = payload
        return chain
      }
      chain.then = (resolve: (v: unknown) => unknown) => {
        const isNull = (op.payload as { sales_ready_notified_at?: unknown } | undefined)
          ?.sales_ready_notified_at === null
        let r: unknown
        if (table === 'n400_leads_view') r = results.ready ?? { data: [], error: null }
        else if (op.action === 'update' && !isNull) r = results.claim ?? { data: [], error: null }
        else if (op.filters.some(([n, c]) => n === 'in' && c === 'user_id'))
          r = results.unclaim ?? { error: null }
        else r = results.reset ?? { data: [], error: null }
        return Promise.resolve(r).then(resolve)
      }
      return chain
    },
  }
  return { client: client as never, ops }
}

const L = (id: string) => ({
  user_id: id, full_name: `Lead ${id}`, email: `${id}@x.com`, effective_score: 210, last_activity_date: '2026-10-17',
})

describe('GET /api/cron/sales-ready', () => {
  const saved = { ...process.env }
  beforeEach(() => {
    createAdminClient.mockReset().mockImplementation(realOf(admin).createAdminClient)
    sendWithResend.mockReset().mockImplementation(realOf(mailer).sendWithResend)
    process.env.CRON_SECRET = 's3cret'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.com'
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    process.env = { ...saved }
    jest.restoreAllMocks()
  })

  it('500s without CRON_SECRET configured, before doing any work', async () => {
    delete process.env.CRON_SECRET
    expect((await call('Bearer anything')).status).toBe(500)
  })

  it('401s without, with a wrong, or with a different-length bearer token (no throw)', async () => {
    expect((await call()).status).toBe(401)
    expect((await call('Bearer nope')).status).toBe(401)
    expect((await call('Bearer s3cret-but-longer')).status).toBe(401)
    expect((await call('Bearer s3crex')).status).toBe(401)
  })

  it('500s when the service-role key is missing (real createAdminClient env check)', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect((await call('Bearer s3cret')).status).toBe(500)
  })

  it('500s when NEXT_PUBLIC_SITE_URL is missing, before creating the client', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
        const res = await call('Bearer s3cret')
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'not configured' })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  describe('with a database', () => {
    it('reads only client-role, sales_ready rows', async () => {
      const { client, ops } = fakeClient({})
      createAdminClient.mockReturnValue(client)
      const send = sendWithResend.mockResolvedValue({ ok: true, value: { id: null } })
      expect((await call('Bearer s3cret')).status).toBe(200)
      const read = ops.find((o) => o.table === 'n400_leads_view')!
      expect(read.filters).toEqual(
        expect.arrayContaining([['eq', 'role', 'client'], ['eq', 'effective_status', 'sales_ready']]),
      )
      expect(send).not.toHaveBeenCalled()
    })

    it('claims, emails, and reports the claimed count', async () => {
      const { client, ops } = fakeClient({
        ready: { data: [L('a'), L('b')], error: null },
        claim: { data: [{ user_id: 'a' }], error: null },
      })
      createAdminClient.mockReturnValue(client)
      const send = sendWithResend.mockResolvedValue({ ok: true, value: { id: 'x' } })
      const res = await call('Bearer s3cret')
      expect(res.status).toBe(200)
      expect(await res.json()).toMatchObject({ notified: 1, emailed: true })
      expect(send).toHaveBeenCalledTimes(1)
      const body = send.mock.calls[0][0]
      expect(body.to).toBe('Chris@mannaos.com')
      expect(body.html).toContain('Lead a')
      expect(body.html).not.toContain('Lead b')
      const claim = ops.find((o) => o.action === 'update')!
      expect(claim.filters).toEqual(
        expect.arrayContaining([['in', 'user_id', ['a', 'b']], ['is', 'sales_ready_notified_at', null]]),
      )
    })

    it('un-claims and 500s when the email fails', async () => {
      const { client, ops } = fakeClient({
        ready: { data: [L('a')], error: null },
        claim: { data: [{ user_id: 'a' }], error: null },
      })
      createAdminClient.mockReturnValue(client)
      sendWithResend.mockResolvedValue({ ok: false, error: 'boom' })
      const res = await call('Bearer s3cret')
      expect(res.status).toBe(500)
      expect(await res.json()).toMatchObject({ error: 'email failed' })
      const unclaim = ops.filter((o) => o.action === 'update' && (o.payload as { sales_ready_notified_at: unknown }).sales_ready_notified_at === null)
      expect(unclaim[0].filters).toEqual(expect.arrayContaining([['in', 'user_id', ['a']]]))
    })

    it('sends no email when a concurrent run already claimed everyone', async () => {
      const { client } = fakeClient({
        ready: { data: [L('a')], error: null },
        claim: { data: [], error: null },
      })
      createAdminClient.mockReturnValue(client)
      const send = sendWithResend.mockResolvedValue({ ok: true, value: { id: null } })
      const res = await call('Bearer s3cret')
      expect(res.status).toBe(200)
      expect(await res.json()).toMatchObject({ notified: 0, emailed: false })
      expect(send).not.toHaveBeenCalled()
    })

    it('500s without emailing when the claim fails', async () => {
      const { client } = fakeClient({
        ready: { data: [L('a')], error: null },
        claim: { data: null, error: { message: 'db down' } },
      })
      createAdminClient.mockReturnValue(client)
      const send = sendWithResend.mockResolvedValue({ ok: true, value: { id: null } })
      const res = await call('Bearer s3cret')
      expect(res.status).toBe(500)
      expect(await res.json()).toHaveProperty('error')
      expect(send).not.toHaveBeenCalled()
    })

    it('resets stamps of leads no longer sales-ready, excluding current ready ids, and 500s on error', async () => {
      const ok = fakeClient({
        ready: { data: [L('a')], error: null },
        claim: { data: [], error: null },
        reset: { data: [{ user_id: 'gone' }], error: null },
      })
      createAdminClient.mockReturnValue(ok.client)
      const res = await call('Bearer s3cret')
      expect(await res.json()).toMatchObject({ reset: 1 })
      const reset = ok.ops.filter((o) => o.action === 'update').pop()!
      expect(reset.filters).toEqual(
        expect.arrayContaining([
          ['not', 'sales_ready_notified_at', 'is', null],
          ['not', 'user_id', 'in', '(a)'],
        ]),
      )

      const bad = fakeClient({ reset: { data: null, error: { message: 'nope' } } })
      createAdminClient.mockReturnValue(bad.client)
      const res2 = await call('Bearer s3cret')
      expect(res2.status).toBe(500)
      expect(await res2.json()).toHaveProperty('error')
    })
  })
})
