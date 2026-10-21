import { approveRequest, closePendingFor, rejectRequest, submitRequest, type FlowDeps } from '@/lib/deletion/flow'
import type { SendEmail } from '@/lib/jobs/mailer'
import { fakeSupabase, has, type Op, type Reply } from './fake-supabase'

const ID = '11111111-1111-4111-8111-111111111111'
const REQ = '22222222-2222-4222-8222-222222222222'
const ADMIN = '33333333-3333-4333-8333-333333333333'
const STAFF = '44444444-4444-4444-8444-444444444444'

const row = (over: Record<string, unknown> = {}) => ({
  id: REQ, entity_type: 'case', entity_id: ID, entity_label: 'MOS-11111111 (John Doe)', reason: 'dup',
  status: 'approved', requested_by: STAFF, decided_by: ADMIN, decided_at: 'now', decision_note: null,
  created_at: 'then', ...over,
})

function setup(reply: (op: Op) => Reply, sendOk = true) {
  const { client, ops } = fakeSupabase(reply)
  const send = jest.fn<ReturnType<SendEmail>, Parameters<SendEmail>>(async () =>
    sendOk ? { ok: true, value: { id: 'm1' } } : { ok: false, error: 'Email is not configured' },
  )
  const deps: FlowDeps = { supabase: client, send, siteUrl: 'https://app.example.com' }
  return { deps, ops, send }
}

const profiles: Reply = { data: { full_name: 'Lan Tran', email: 'lan@x.com' } }

describe('submitRequest', () => {
  it('saves a case request with its label and emails the admin inbox', async () => {
    const { deps, ops, send } = setup((op) => {
      if (op.table === 'cases') return { data: { id: ID, primary_client: { first_name: 'John', last_name: 'Doe' } } }
      if (op.table === 'deletion_requests') return { data: row({ status: 'pending' }) }
      return profiles
    })
    expect(await submitRequest(deps, { entityType: 'case', entityId: ID, reason: 'dup' })).toEqual({
      ok: true,
      value: { emailError: null },
    })
    const insert = ops.find((o) => o.action === 'insert')!
    expect(insert.payload).toEqual({
      entity_type: 'case', entity_id: ID, entity_label: 'MOS-11111111 (John Doe)', reason: 'dup',
    })
    expect(send.mock.calls[0][0].to).toBe('Chris@mannaos.com')
    expect(send.mock.calls[0][0].text).toContain('Lan Tran asked to delete case')
  })

  it('still succeeds when the email fails (request is saved)', async () => {
    const { deps } = setup((op) => {
      if (op.table === 'clients') return { data: { first_name: 'John', last_name: 'Doe' } }
      if (op.table === 'cases') return { count: 0 }
      if (op.table === 'deletion_requests') return { data: row({ entity_type: 'client', status: 'pending' }) }
      return profiles
    }, false)
    expect(await submitRequest(deps, { entityType: 'client', entityId: ID, reason: 'dup' })).toEqual({
      ok: true,
      value: { emailError: 'Email is not configured' },
    })
  })

  it('refuses a client that still has cases, before inserting', async () => {
    const { deps, ops } = setup((op) => {
      if (op.table === 'clients') return { data: { first_name: 'John', last_name: 'Doe' } }
      if (op.table === 'cases') return { count: 2 }
      return {}
    })
    expect(await submitRequest(deps, { entityType: 'client', entityId: ID, reason: 'dup' })).toEqual({
      ok: false,
      error: 'This client still has 2 cases. Delete them first.',
    })
    expect(ops.some((o) => o.action === 'insert')).toBe(false)
  })

  it('refuses a lead that is already hidden', async () => {
    const { deps } = setup((op) => {
      if (op.table === 'n400_leads_view') return { data: { full_name: 'Mai', email: 'mai@x.com' } }
      if (op.table === 'hidden_leads') return { data: { user_id: ID } }
      return {}
    })
    expect(await submitRequest(deps, { entityType: 'lead', entityId: ID, reason: 'spam' })).toEqual({
      ok: false,
      error: 'This lead is already hidden.',
    })
  })

  it('explains a duplicate pending request (23505)', async () => {
    const { deps } = setup((op) => {
      if (op.table === 'cases') return { data: { id: ID, primary_client: null } }
      if (op.table === 'deletion_requests') return { error: { message: 'dup', code: '23505' } }
      return {}
    })
    expect(await submitRequest(deps, { entityType: 'case', entityId: ID, reason: 'dup' })).toEqual({
      ok: false,
      error: 'A request for this is already pending.',
    })
  })

  it('refuses an item that no longer exists', async () => {
    const { deps } = setup(() => ({ data: null }))
    expect(await submitRequest(deps, { entityType: 'case', entityId: ID, reason: 'dup' })).toEqual({
      ok: false,
      error: 'That item no longer exists.',
    })
  })
})

describe('approveRequest', () => {
  it('reports a request someone already handled and deletes nothing', async () => {
    const { deps, ops } = setup(() => ({ data: [] }))
    expect(await approveRequest(deps, REQ, ADMIN)).toEqual({
      ok: false,
      error: 'This request was already handled.',
    })
    expect(ops.some((o) => o.action === 'delete')).toBe(false)
    const claim = ops[0]
    expect(has(claim, 'eq', 'status', 'pending')).toBe(true)
  })

  it('puts the request back to pending when the deletion is refused', async () => {
    const { deps, ops, send } = setup((op) => {
      if (op.table === 'deletion_requests' && op.action === 'update') {
        return { data: [row({ entity_type: 'client' })] }
      }
      if (op.table === 'cases') return { count: 1 }
      return { count: 0 }
    })
    expect(await approveRequest(deps, REQ, ADMIN)).toEqual({
      ok: false,
      error: 'This client still has 1 case. Delete it first.',
    })
    const updates = ops.filter((o) => o.table === 'deletion_requests' && o.action === 'update')
    expect(updates[1].payload).toEqual({ status: 'pending', decided_by: null, decided_at: null })
    expect(send).not.toHaveBeenCalled()
  })

  it('says so when the refused request could not be put back to pending', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    let updates = 0
    const { deps } = setup((op) => {
      if (op.table === 'deletion_requests' && op.action === 'update') {
        updates += 1
        return updates === 1 ? { data: [row({ entity_type: 'client' })] } : { error: { message: 'down' } }
      }
      if (op.table === 'cases') return { count: 1 }
      return { count: 0 }
    })
    expect(await approveRequest(deps, REQ, ADMIN)).toEqual({
      ok: false,
      error:
        'This client still has 1 case. Delete it first. The request could not be reset to pending and now shows as approved although nothing was deleted; ask for it to be filed again.',
    })
  })

  it('deletes, emails the requester and returns the paths', async () => {
    const { deps, send } = setup((op) => {
      if (op.table === 'deletion_requests') return { data: [row()] }
      if (op.table === 'cases') return { data: [{ primary_client_id: 'p1', secondary_client_id: null }] }
      return profiles
    })
    expect(await approveRequest(deps, REQ, ADMIN)).toEqual({
      ok: true,
      value: { paths: ['/cases', `/cases/${ID}`, '/clients/p1', '/deletion-requests'], emailError: null },
    })
    expect(send.mock.calls[0][0].to).toBe('lan@x.com')
    expect(send.mock.calls[0][0].subject).toContain('Approved: Delete case')
  })
})

describe('rejectRequest', () => {
  it('stores the note and emails the requester', async () => {
    const { deps, ops, send } = setup((op) =>
      op.table === 'deletion_requests' ? { data: [row({ status: 'rejected', decision_note: 'active' })] } : profiles,
    )
    expect(await rejectRequest(deps, REQ, ADMIN, 'active')).toEqual({ ok: true, value: { emailError: null } })
    expect(ops[0].payload).toMatchObject({ status: 'rejected', decided_by: ADMIN, decision_note: 'active' })
    expect(send.mock.calls[0][0].text).toContain('Note: active')
  })

  it('reports a request someone already handled', async () => {
    const { deps } = setup(() => ({ data: [] }))
    expect(await rejectRequest(deps, REQ, ADMIN, null)).toEqual({
      ok: false,
      error: 'This request was already handled.',
    })
  })
})

describe('closePendingFor', () => {
  it('marks the pending request approved and emails its requester', async () => {
    const { deps, ops, send } = setup((op) => (op.table === 'deletion_requests' ? { data: [row()] } : profiles))
    await closePendingFor(deps, 'case', ID, ADMIN)
    const close = ops[0]
    expect(close.payload).toMatchObject({ status: 'approved', decided_by: ADMIN })
    expect(has(close, 'eq', 'entity_id', ID)).toBe(true)
    expect(has(close, 'eq', 'status', 'pending')).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('never throws on a database error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const { deps } = setup(() => ({ error: { message: 'down' } }))
    await expect(closePendingFor(deps, 'case', ID, ADMIN)).resolves.toBeUndefined()
  })
})
