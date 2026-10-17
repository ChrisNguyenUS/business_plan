import {
  createJobFromTemplateRpc,
  findStepJobId,
  insertNotification,
  listJobs,
  listNotifications,
  toJobTemplateSummary,
  updateStep,
  type Db,
} from '@/lib/jobs/jobs-db'

const CLIENT_ID = '9c3d87fc-eeac-4f05-bafa-cda522c33549'
const STEP_ID = '5f1c2b6e-1d64-4b8e-9d57-3c0f3b6d2a11'

const input = {
  clientId: CLIENT_ID,
  templateKey: 'tx_llc',
  fee: 1500,
  deadline: '2026-12-31',
  notes: null,
}

function rpcDb(result: { data: unknown; error: { code?: string; message: string } | null }) {
  const rpc = jest.fn().mockResolvedValue(result)
  return { db: { rpc } as unknown as Db, rpc }
}

function updateDb(result: { data: unknown; error: { code?: string; message: string } | null }) {
  const single = jest.fn().mockResolvedValue(result)
  const select = jest.fn(() => ({ single }))
  const eq = jest.fn(() => ({ select }))
  const update = jest.fn(() => ({ eq }))
  const from = jest.fn(() => ({ update }))
  return { db: { from } as unknown as Db, from, update, eq, select }
}

describe('createJobFromTemplateRpc', () => {
  it('calls the SQL function with the parsed input and returns the new id', async () => {
    const { db, rpc } = rpcDb({ data: 'new-job-id', error: null })
    const result = await createJobFromTemplateRpc(db, input)
    expect(rpc).toHaveBeenCalledWith('create_job_from_template', {
      p_client_id: CLIENT_ID,
      p_template_key: 'tx_llc',
      p_fee: 1500,
      p_deadline: '2026-12-31',
      p_notes: null,
    })
    expect(result).toEqual({ ok: true, value: { id: 'new-job-id' } })
  })

  it('explains an unknown or inactive template (SQLSTATE P0002) in plain words', async () => {
    const { db } = rpcDb({
      data: null,
      error: { code: 'P0002', message: 'unknown or inactive template nope' },
    })
    expect(await createJobFromTemplateRpc(db, input)).toEqual({
      ok: false,
      error: 'That service template is not available.',
    })
  })

  it('passes any other database error on with its message', async () => {
    const { db } = rpcDb({ data: null, error: { code: '42501', message: 'permission denied' } })
    expect(await createJobFromTemplateRpc(db, input)).toEqual({
      ok: false,
      error: 'Could not create the job: permission denied',
    })
  })
})

describe('updateStep', () => {
  it('updates the step by id, selects it back and returns it', async () => {
    const row = { id: STEP_ID, job_id: 'job-1', status: 'done' }
    const { db, from, update, eq, select } = updateDb({ data: row, error: null })
    const result = await updateStep(db, STEP_ID, { status: 'done' })
    expect(from).toHaveBeenCalledWith('job_steps')
    expect(update).toHaveBeenCalledWith({ status: 'done' })
    expect(eq).toHaveBeenCalledWith('id', STEP_ID)
    expect(select).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true, value: row })
  })

  it('says the step is gone or hidden when no row comes back (PGRST116)', async () => {
    const { db } = updateDb({ data: null, error: { code: 'PGRST116', message: '0 rows' } })
    expect(await updateStep(db, STEP_ID, { status: 'done' })).toEqual({
      ok: false,
      error: 'That step no longer exists, or you do not have access to it.',
    })
  })

  it('passes any other database error on with its message', async () => {
    const { db } = updateDb({ data: null, error: { code: '23514', message: 'check violation' } })
    expect(await updateStep(db, STEP_ID, { status: 'done' })).toEqual({
      ok: false,
      error: 'Could not save the step: check violation',
    })
  })
})

describe('toJobTemplateSummary', () => {
  const base = {
    key: 'tx_llc',
    service_type: 'tax' as const,
    title_en: 'Texas LLC formation',
    title_vi: 'Thành lập LLC tại Texas',
    description_en: null,
    description_vi: null,
  }

  it('reads the embedded step count', () => {
    expect(toJobTemplateSummary({ ...base, steps: [{ count: 9 }] })).toEqual({
      ...base,
      step_count: 9,
    })
  })

  it('treats a missing count as zero steps', () => {
    expect(toJobTemplateSummary({ ...base, steps: null }).step_count).toBe(0)
    expect(toJobTemplateSummary({ ...base, steps: [] }).step_count).toBe(0)
  })
})

describe('listJobs filters', () => {
  function listDb(result: { data: unknown; error: { message: string } | null }) {
    const query: Record<string, jest.Mock> & { then?: unknown } = {}
    query.select = jest.fn(() => query)
    query.order = jest.fn(() => query)
    query.limit = jest.fn(() => query)
    query.eq = jest.fn(() => query)
    query.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
    const from = jest.fn(() => query)
    return { db: { from } as unknown as Db, query }
  }

  it('adds no eq call when no filter is set', async () => {
    const { db, query } = listDb({ data: [], error: null })
    await listJobs(db)
    expect(query.eq).not.toHaveBeenCalled()
    expect(query.limit).toHaveBeenCalledWith(50)
  })

  it('filters by status only when set', async () => {
    const { db, query } = listDb({ data: [], error: null })
    await listJobs(db, { filters: { status: 'open' } })
    expect(query.eq).toHaveBeenCalledTimes(1)
    expect(query.eq).toHaveBeenCalledWith('status', 'open')
  })

  it('filters by service_type only when set', async () => {
    const { db, query } = listDb({ data: [], error: null })
    await listJobs(db, { filters: { service: 'business' } })
    expect(query.eq).toHaveBeenCalledTimes(1)
    expect(query.eq).toHaveBeenCalledWith('service_type', 'business')
  })

  it('applies both filters together', async () => {
    const { db, query } = listDb({ data: [], error: null })
    await listJobs(db, { filters: { status: 'complete', service: 'tax' } })
    expect(query.eq).toHaveBeenCalledWith('status', 'complete')
    expect(query.eq).toHaveBeenCalledWith('service_type', 'tax')
    expect(query.eq).toHaveBeenCalledTimes(2)
  })

  it('still throws on a database error', async () => {
    const { db } = listDb({ data: null, error: { message: 'boom' } })
    await expect(listJobs(db, { filters: { status: 'open' } })).rejects.toEqual({
      message: 'boom',
    })
  })
})

describe('findStepJobId', () => {
  function stepDb(result: { data: unknown; error: { message: string } | null }) {
    const maybeSingle = jest.fn().mockResolvedValue(result)
    const eq = jest.fn(() => ({ maybeSingle }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))
    return { db: { from } as unknown as Db, from, select, eq }
  }

  it('returns the job id of the step', async () => {
    const { db, from, select, eq } = stepDb({ data: { job_id: 'job-9' }, error: null })
    expect(await findStepJobId(db, STEP_ID)).toBe('job-9')
    expect(from).toHaveBeenCalledWith('job_steps')
    expect(select).toHaveBeenCalledWith('job_id')
    expect(eq).toHaveBeenCalledWith('id', STEP_ID)
  })

  it('returns null when no row comes back', async () => {
    const { db } = stepDb({ data: null, error: null })
    expect(await findStepJobId(db, STEP_ID)).toBeNull()
  })

  it('throws on a database error', async () => {
    const { db } = stepDb({ data: null, error: { message: 'boom' } })
    await expect(findStepJobId(db, STEP_ID)).rejects.toEqual({ message: 'boom' })
  })
})

describe('insertNotification', () => {
  const row = {
    jobId: 'job-1',
    stepId: STEP_ID,
    kind: 'step_done' as const,
    toEmail: 'an@example.com',
    status: 'failed' as const,
    error: 'x'.repeat(800),
    createdBy: 'user-1',
  }

  function insertDb(error: { message: string } | null) {
    const insert = jest.fn().mockResolvedValue({ error })
    const from = jest.fn(() => ({ insert }))
    return { db: { from } as unknown as Db, from, insert }
  }

  it('maps the fields to the columns and cuts a long error to 500 characters', async () => {
    const { db, from, insert } = insertDb(null)
    expect(await insertNotification(db, row)).toEqual({ ok: true, value: null })
    expect(from).toHaveBeenCalledWith('job_notifications')
    expect(insert).toHaveBeenCalledWith({
      job_id: 'job-1',
      step_id: STEP_ID,
      kind: 'step_done',
      to_email: 'an@example.com',
      status: 'failed',
      error: 'x'.repeat(500),
      created_by: 'user-1',
    })
  })

  it('stores a missing error as null', async () => {
    const { db, insert } = insertDb(null)
    await insertNotification(db, { ...row, status: 'sent', error: null })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ error: null, status: 'sent' }))
  })

  it('returns the database message instead of throwing', async () => {
    const { db } = insertDb({ message: 'permission denied' })
    expect(await insertNotification(db, row)).toEqual({ ok: false, error: 'permission denied' })
  })
})

describe('listNotifications', () => {
  function listDb(result: { data: unknown; error: { message: string } | null }) {
    const limit = jest.fn().mockResolvedValue(result)
    const order = jest.fn(() => ({ limit }))
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))
    return { db: { from } as unknown as Db, from, eq, order, limit }
  }

  it("lists one job's log, newest first, capped at 20", async () => {
    const rows = [{ id: 'n1' }]
    const { db, from, eq, order, limit } = listDb({ data: rows, error: null })
    expect(await listNotifications(db, 'job-1')).toEqual(rows)
    expect(from).toHaveBeenCalledWith('job_notifications')
    expect(eq).toHaveBeenCalledWith('job_id', 'job-1')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limit).toHaveBeenCalledWith(20)
  })

  it('returns an empty list for no rows, and throws on a database error', async () => {
    expect(await listNotifications(listDb({ data: null, error: null }).db, 'job-1')).toEqual([])
    const { db } = listDb({ data: null, error: { message: 'boom' } })
    await expect(listNotifications(db, 'job-1')).rejects.toEqual({ message: 'boom' })
  })
})
