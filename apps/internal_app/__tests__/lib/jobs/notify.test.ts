import type { Db } from '@/lib/jobs/jobs-db'
import type { SendEmail } from '@/lib/jobs/mailer'
import { sendStepEmail } from '@/lib/jobs/notify'
import type { JobDetail, JobStepRow } from '@/lib/jobs/types'

const STEP_ID = '5f1c2b6e-1d64-4b8e-9d57-3c0f3b6d2a11'
const JOB_ID = 'job-1'
const USER_ID = 'user-1'

function step(over: Partial<JobStepRow> = {}): JobStepRow {
  return {
    id: STEP_ID,
    job_id: JOB_ID,
    position: 6,
    title_en: 'Get your EIN',
    title_vi: 'Xin mã số thuế EIN',
    description_en: 'We apply for your EIN.',
    description_vi: 'Manna xin EIN.',
    owner: 'manna',
    client_visible: true,
    status: 'done',
    client_note: 'All good.',
    internal_note: 'secret',
    started_at: null,
    completed_at: null,
    updated_at: '2026-10-16T00:00:00Z',
    ...over,
  }
}

function job(over: Partial<JobDetail> = {}, steps: JobStepRow[] = [step()]): JobDetail {
  return {
    id: JOB_ID,
    service_type: 'business',
    description: 'LLC formation',
    status: 'in_progress',
    fee: 1500,
    deadline: null,
    notes: null,
    template_key: 'tx_llc',
    created_at: '2026-10-16T00:00:00Z',
    updated_at: '2026-10-16T00:00:00Z',
    client: { id: 'c1', first_name: 'An', last_name: 'Nguyen', email: 'an@example.com' },
    template: { title_vi: 'Thành lập LLC' },
    steps,
    ...over,
  }
}

function fakeDb(opts: { stepJobId?: string | null; job?: JobDetail | null; insertError?: string }) {
  const inserts: Array<Record<string, unknown>> = []
  const chain = (result: unknown) => {
    const q: Record<string, jest.Mock> = {}
    q.select = jest.fn(() => q)
    q.eq = jest.fn(() => q)
    q.order = jest.fn(() => q)
    q.maybeSingle = jest.fn().mockResolvedValue(result)
    return q
  }
  const from = jest.fn((table: string) => {
    if (table === 'job_steps') {
      const id = opts.stepJobId === undefined ? JOB_ID : opts.stepJobId
      return chain({ data: id ? { job_id: id } : null, error: null })
    }
    if (table === 'jobs') {
      const j = opts.job === undefined ? job() : opts.job
      return chain({ data: j, error: null })
    }
    return {
      insert: jest.fn(async (row: Record<string, unknown>) => {
        inserts.push(row)
        return { error: opts.insertError ? { message: opts.insertError } : null }
      }),
    }
  })
  return { db: { from } as unknown as Db, inserts }
}

const okSend = (): jest.MockedFunction<SendEmail> =>
  jest.fn().mockResolvedValue({ ok: true, value: { id: 'msg_1' } })

describe('sendStepEmail', () => {
  it('renders from what the database holds, sends to the client, and logs a sent row', async () => {
    const { db, inserts } = fakeDb({})
    const send = okSend()
    const result = await sendStepEmail(db, send, STEP_ID, USER_ID)

    expect(result).toEqual({ ok: true, value: { to: 'an@example.com' } })
    expect(send).toHaveBeenCalledTimes(1)
    const sent = send.mock.calls[0][0]
    expect(sent.to).toBe('an@example.com')
    expect(sent.subject).toBe('[Manna] LLC formation: Get your EIN — done / xong (1/1)')
    expect(sent.html).toContain('Thành lập LLC')
    expect(sent.html).toContain('All good.')
    expect(sent.html).not.toContain('secret')
    expect(inserts).toEqual([
      {
        job_id: JOB_ID,
        step_id: STEP_ID,
        kind: 'step_done',
        to_email: 'an@example.com',
        status: 'sent',
        error: null,
        created_by: USER_ID,
      },
    ])
  })

  it('uses the waiting_client kind and falls back to the job title when there is no template', async () => {
    const { db, inserts } = fakeDb({
      job: job({ template: null }, [step({ status: 'waiting_client' })]),
    })
    const send = okSend()
    await sendStepEmail(db, send, STEP_ID, null)
    expect(inserts[0]).toMatchObject({ kind: 'step_waiting_client', created_by: null })
    expect(send.mock.calls[0][0].html).toContain('Việc của bạn')
    expect(send.mock.calls[0][0].subject).toContain('action needed')
  })

  it('logs a failed row and returns the reason when the provider fails', async () => {
    const { db, inserts } = fakeDb({})
    const send: SendEmail = jest.fn().mockResolvedValue({ ok: false, error: 'domain not verified' })
    const result = await sendStepEmail(db, send, STEP_ID, USER_ID)
    expect(result).toEqual({
      ok: false,
      error: 'The email could not be sent: domain not verified',
    })
    expect(inserts[0]).toMatchObject({ status: 'failed', error: 'domain not verified' })
  })

  it('still reports success when only the log insert fails', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const { db } = fakeDb({ insertError: 'permission denied' })
    const result = await sendStepEmail(db, okSend(), STEP_ID, USER_ID)
    expect(result).toEqual({ ok: true, value: { to: 'an@example.com' } })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it.each([
    ['the step is hidden or gone', { stepJobId: null }],
    ['the job is hidden or gone', { job: null }],
    ['the job no longer lists the step', { job: job({}, []) }],
  ])('refuses when %s, and sends nothing', async (_name, opts) => {
    const { db, inserts } = fakeDb(opts)
    const send = okSend()
    const result = await sendStepEmail(db, send, STEP_ID, USER_ID)
    expect(result).toEqual({
      ok: false,
      error: 'That step no longer exists, or you do not have access to it.',
    })
    expect(send).not.toHaveBeenCalled()
    expect(inserts).toEqual([])
  })

  it.each([
    ['not visible to the client', job({}, [step({ client_visible: false })]), 'This step is not visible to the client.'],
    ['still to do', job({}, [step({ status: 'todo' })]), 'Only a step that is done or waiting on the client can be emailed.'],
    ['in progress', job({}, [step({ status: 'in_progress' })]), 'Only a step that is done or waiting on the client can be emailed.'],
    ['for a client with no email', job({ client: { id: 'c1', first_name: 'An', last_name: 'Nguyen', email: null } }), 'This client has no email address on file.'],
    ['for a client with a blank email', job({ client: { id: 'c1', first_name: 'An', last_name: 'Nguyen', email: '  ' } }), 'This client has no email address on file.'],
    ['for a client with a malformed email', job({ client: { id: 'c1', first_name: 'An', last_name: 'Nguyen', email: 'not-an-email' } }), 'The client email address looks invalid.'],
    ['for a job with no client', job({ client: null }), 'This client has no email address on file.'],
  ])('refuses a step %s, and sends and logs nothing', async (_name, j, error) => {
    const { db, inserts } = fakeDb({ job: j })
    const send = okSend()
    expect(await sendStepEmail(db, send, STEP_ID, USER_ID)).toEqual({ ok: false, error })
    expect(send).not.toHaveBeenCalled()
    expect(inserts).toEqual([])
  })

  it('counts progress over all the job steps, not just the emailed one', async () => {
    const steps = [
      step({ id: 'a', position: 1, status: 'done' }),
      step({ id: STEP_ID, position: 2, status: 'done' }),
      step({ id: 'c', position: 3, status: 'todo' }),
    ]
    const { db } = fakeDb({ job: job({}, steps) })
    const send = okSend()
    await sendStepEmail(db, send, STEP_ID, USER_ID)
    expect(send.mock.calls[0][0].subject).toContain('(2/3)')
  })
})
