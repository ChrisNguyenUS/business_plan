import { deleteCaseRow, deleteClientRow, hideLeadRow, performDeletion } from '@/lib/deletion/perform'
import { fakeSupabase, has } from './fake-supabase'

const ID = '11111111-1111-4111-8111-111111111111'

describe('deleteCaseRow', () => {
  it('fails readably when nothing was deleted (missing, or RLS refused)', async () => {
    const { client } = fakeSupabase(() => ({ data: [] }))
    expect(await deleteCaseRow(client, ID)).toEqual({ ok: false, error: 'Case not found or not deletable.' })
  })

  it('returns the case list and both client pages to revalidate', async () => {
    const { client } = fakeSupabase(() => ({ data: [{ primary_client_id: 'p1', secondary_client_id: 's1' }] }))
    expect(await deleteCaseRow(client, ID)).toEqual({
      ok: true,
      value: ['/cases', `/cases/${ID}`, '/clients/p1', '/clients/s1'],
    })
  })
})

describe('deleteClientRow', () => {
  it('refuses while cases remain and never deletes', async () => {
    const { client, ops } = fakeSupabase((op) => (op.table === 'cases' ? { count: 1 } : { count: 0 }))
    expect(await deleteClientRow(client, ID)).toEqual({
      ok: false,
      error: 'This client still has 1 case. Delete it first.',
    })
    expect(ops.some((o) => o.action === 'delete' || o.action === 'update')).toBe(false)
  })

  it('unlinks spouses, deletes, and adds lead pages when converted from a lead', async () => {
    const { client, ops } = fakeSupabase((op) =>
      op.action === 'delete' ? { data: [{ source_lead_id: 'L1' }] } : { count: 0, data: [] },
    )
    expect(await deleteClientRow(client, ID)).toEqual({
      ok: true,
      value: ['/clients', `/clients/${ID}`, '/leads', '/leads/L1'],
    })
    const unlink = ops.find((o) => o.action === 'update')
    expect(unlink?.payload).toEqual({ spouse_id: null })
    expect(has(unlink, 'eq', 'spouse_id', ID)).toBe(true)
  })
})

describe('hideLeadRow / performDeletion', () => {
  it('treats an already-hidden lead (23505) as done', async () => {
    const { client } = fakeSupabase(() => ({ error: { message: 'dup', code: '23505' } }))
    expect(await hideLeadRow(client, ID)).toEqual({ ok: true, value: ['/leads', `/leads/${ID}`] })
  })

  it('routes a lead to hidden_leads, never to a delete', async () => {
    const { client, ops } = fakeSupabase()
    await performDeletion(client, 'lead', ID)
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ table: 'hidden_leads', action: 'insert', payload: { user_id: ID } })
  })
})
