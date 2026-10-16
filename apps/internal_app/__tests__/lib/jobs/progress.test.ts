import {
  STEP_OWNERS,
  STEP_OWNER_LABELS,
  STEP_STATUSES,
  STEP_STATUS_LABELS,
  deriveJobStatus,
  deriveProgress,
  formatProgressLabel,
  type StepStatus,
} from '@/lib/jobs/progress'

const steps = (...statuses: StepStatus[]) => statuses.map((status) => ({ status }))
const repeat = (status: StepStatus, count: number) =>
  Array.from({ length: count }, () => ({ status }))

describe('deriveJobStatus', () => {
  it('has no opinion about a job without steps, so a hand-set status stays', () => {
    expect(deriveJobStatus([])).toBeNull()
  })

  it('is open while every step is still todo', () => {
    expect(deriveJobStatus(steps('todo', 'todo', 'todo'))).toBe('open')
  })

  it.each<StepStatus>(['in_progress', 'waiting_client', 'done'])(
    'is in_progress as soon as one step is %s',
    (started) => {
      expect(deriveJobStatus(steps('todo', started, 'todo'))).toBe('in_progress')
    }
  )

  it('is complete when every step is done or skipped', () => {
    expect(deriveJobStatus(steps('done', 'skipped', 'done'))).toBe('complete')
  })

  it('is complete when every step is skipped', () => {
    expect(deriveJobStatus(steps('skipped', 'skipped'))).toBe('complete')
  })

  it('reopens: a finished job goes back to in_progress when one step returns to todo', () => {
    expect(deriveJobStatus(steps('done', 'done', 'done'))).toBe('complete')
    expect(deriveJobStatus(steps('done', 'done', 'todo'))).toBe('in_progress')
  })

  it('reopens all the way to open once nothing has been started again', () => {
    expect(deriveJobStatus(steps('done', 'todo', 'todo'))).toBe('in_progress')
    expect(deriveJobStatus(steps('todo', 'todo', 'todo'))).toBe('open')
  })

  it('a skipped step alone does not start the job', () => {
    expect(deriveJobStatus(steps('skipped', 'todo'))).toBe('open')
  })
})

describe('deriveProgress', () => {
  it('is 0 of 0 for a job without steps', () => {
    expect(deriveProgress([])).toEqual({ done: 0, total: 0, percent: 0 })
  })

  it('counts done steps over the steps that are not skipped', () => {
    const eight = steps('done', 'done', 'done', 'todo', 'todo', 'todo', 'todo', 'todo')
    expect(deriveProgress(eight)).toEqual({ done: 3, total: 8, percent: 37 })
  })

  it('leaves skipped steps out of the total', () => {
    expect(deriveProgress(steps('done', 'skipped', 'todo'))).toEqual({
      done: 1,
      total: 2,
      percent: 50,
    })
  })

  it('is 100 percent when every step is skipped, because nothing is left to do', () => {
    expect(deriveProgress(steps('skipped', 'skipped'))).toEqual({ done: 0, total: 0, percent: 100 })
  })

  it('never rounds up to 100 while a step is left', () => {
    const almost = [...repeat('done', 199), ...repeat('todo', 1)]
    expect(deriveProgress(almost).percent).toBe(99)
  })

  it('is exact where floating point division is not (29 of 100 is 29, not 28)', () => {
    const pairs: Array<[done: number, total: number, percent: number]> = [
      [29, 50, 58],
      [29, 100, 29],
      [57, 100, 57],
      [58, 100, 58],
      [87, 150, 58],
      [58, 200, 29],
      [114, 200, 57],
      [116, 200, 58],
    ]
    for (const [done, total, percent] of pairs) {
      const list = [...repeat('done', done), ...repeat('todo', total - done)]
      expect(deriveProgress(list).percent).toBe(percent)
    }
  })

  it('is 100 when every counted step is done', () => {
    expect(deriveProgress(steps('done', 'done'))).toEqual({ done: 2, total: 2, percent: 100 })
  })
})

describe('formatProgressLabel', () => {
  it('shows a dash for a job without steps instead of 0/0', () => {
    expect(formatProgressLabel(deriveProgress([]), 0)).toBe('—')
  })

  it('says so when every step was skipped', () => {
    const skipped = steps('skipped', 'skipped')
    expect(formatProgressLabel(deriveProgress(skipped), skipped.length)).toBe('All skipped')
  })

  it('shows done over total', () => {
    const three = steps('done', 'in_progress', 'todo')
    expect(formatProgressLabel(deriveProgress(three), three.length)).toBe('1/3')
  })
})

describe('labels', () => {
  it.each(STEP_STATUSES)('has English and Vietnamese text for status %s', (status) => {
    expect(STEP_STATUS_LABELS[status].en).not.toBe('')
    expect(STEP_STATUS_LABELS[status].vi).not.toBe('')
  })

  it.each(STEP_OWNERS)('has English and Vietnamese text for owner %s', (owner) => {
    expect(STEP_OWNER_LABELS[owner].en).not.toBe('')
    expect(STEP_OWNER_LABELS[owner].vi).not.toBe('')
  })
})
