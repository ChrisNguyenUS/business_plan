import { clientDeleteBlocker } from '@/lib/clients/delete-guard'

describe('clientDeleteBlocker', () => {
  it('allows a client with no cases and no jobs', () => {
    expect(clientDeleteBlocker({ cases: 0, jobs: 0 })).toBeNull()
  })

  it('names what is in the way, with correct plurals', () => {
    expect(clientDeleteBlocker({ cases: 1, jobs: 0 })).toBe(
      'This client still has 1 case. Delete it first.',
    )
    expect(clientDeleteBlocker({ cases: 0, jobs: 2 })).toBe(
      'This client still has 2 jobs. Delete them first.',
    )
    expect(clientDeleteBlocker({ cases: 2, jobs: 1 })).toBe(
      'This client still has 2 cases and 1 job. Delete them first.',
    )
  })
})
