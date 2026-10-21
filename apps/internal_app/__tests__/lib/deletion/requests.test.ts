import {
  actionLabel,
  entityHref,
  parseDecisionNote,
  parseDeletionRequest,
} from '@/lib/deletion/requests'

const ID = '11111111-1111-4111-8111-111111111111'

describe('parseDeletionRequest', () => {
  it('accepts a known type, a uuid and a trimmed reason', () => {
    expect(parseDeletionRequest({ entityType: 'case', entityId: ID, reason: '  duplicate  ' })).toEqual({
      ok: true,
      value: { entityType: 'case', entityId: ID, reason: 'duplicate' },
    })
  })

  it('rejects an unknown type, a bad id, an empty or a too-long reason', () => {
    expect(parseDeletionRequest({ entityType: 'job', entityId: ID, reason: 'x' })).toEqual({
      ok: false,
      error: 'Unknown item type.',
    })
    expect(parseDeletionRequest({ entityType: 'client', entityId: 'nope', reason: 'x' })).toEqual({
      ok: false,
      error: 'Unknown item.',
    })
    expect(parseDeletionRequest({ entityType: 'lead', entityId: ID, reason: '   ' })).toEqual({
      ok: false,
      error: 'Say why this should be deleted.',
    })
    expect(parseDeletionRequest({ entityType: 'lead', entityId: ID, reason: 'a'.repeat(501) })).toEqual({
      ok: false,
      error: 'Keep the reason under 500 characters.',
    })
  })
})

describe('parseDecisionNote', () => {
  it('treats blank or missing as no note, trims, and caps length', () => {
    expect(parseDecisionNote(undefined)).toEqual({ ok: true, value: null })
    expect(parseDecisionNote('   ')).toEqual({ ok: true, value: null })
    expect(parseDecisionNote(' keep it ')).toEqual({ ok: true, value: 'keep it' })
    expect(parseDecisionNote('a'.repeat(501))).toEqual({
      ok: false,
      error: 'Keep the note under 500 characters.',
    })
  })
})

describe('labels', () => {
  it('names the action and links each type', () => {
    expect(actionLabel('case')).toBe('Delete case')
    expect(actionLabel('client')).toBe('Delete client')
    expect(actionLabel('lead')).toBe('Hide lead')
    expect(entityHref('case', ID)).toBe(`/cases/${ID}`)
    expect(entityHref('client', ID)).toBe(`/clients/${ID}`)
    expect(entityHref('lead', ID)).toBe(`/leads/${ID}`)
  })
})
