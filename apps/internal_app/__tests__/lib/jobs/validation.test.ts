import {
  MAX_NOTE_LENGTH,
  isUuid,
  parseDeadline,
  parseFee,
  parseNewJobInput,
  parseStepPatch,
} from '@/lib/jobs/validation'

const CLIENT_ID = '9c3d87fc-eeac-4f05-bafa-cda522c33549'

function form(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

describe('isUuid', () => {
  it('accepts a uuid in either case', () => {
    expect(isUuid(CLIENT_ID)).toBe(true)
    expect(isUuid(CLIENT_ID.toUpperCase())).toBe(true)
  })

  it.each(['not-a-uuid', '', ' ', `${CLIENT_ID} `, '9c3d87fc-eeac-4f05-bafa', 'DROP TABLE jobs'])(
    'rejects %p',
    (value) => {
      expect(isUuid(value)).toBe(false)
    }
  )

  it.each([undefined, null, 42, {}])('rejects the non-string %p', (value) => {
    expect(isUuid(value)).toBe(false)
  })
})

describe('parseFee', () => {
  it.each([
    ['', 0],
    ['   ', 0],
    ['0', 0],
    ['1500', 1500],
    [' 250 ', 250],
    ['1,500', 1500],
    ['$1,500.50', 1500.5],
    ['$ 250', 250],
    ['1500.5', 1500.5],
    ['1,234,567.89', 1234567.89],
    ['99999999.99', 99999999.99],
  ])('reads %p as %p', (raw, expected) => {
    expect(parseFee(raw)).toEqual({ ok: true, value: expected })
  })

  it.each([
    ['1.500', 'three decimals, probably a Vietnamese thousands dot'],
    ['-5', 'negative'],
    ['abc', 'not a number'],
    ['1e3', 'exponent'],
    ['12,34,56', 'broken thousands groups'],
    [',500', 'leading comma'],
    ['1,5', 'short group'],
    ['15 00', 'inner space'],
  ])('refuses %p (%s)', (raw) => {
    const result = parseFee(raw)
    expect(result.ok).toBe(false)
  })

  it('refuses an amount that would overflow numeric(10,2)', () => {
    expect(parseFee('100000000')).toEqual({ ok: false, error: 'Fee is too large.' })
  })
})

describe('parseDeadline', () => {
  it('treats blank as no deadline', () => {
    expect(parseDeadline('')).toEqual({ ok: true, value: null })
    expect(parseDeadline('  ')).toEqual({ ok: true, value: null })
  })

  it('accepts a real date, including a leap day', () => {
    expect(parseDeadline('2026-12-31')).toEqual({ ok: true, value: '2026-12-31' })
    expect(parseDeadline('2028-02-29')).toEqual({ ok: true, value: '2028-02-29' })
  })

  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10', '12/31/2026', '2026-1-5', 'tomorrow'])(
    'refuses %p',
    (raw) => {
      expect(parseDeadline(raw).ok).toBe(false)
    }
  )
})

describe('parseNewJobInput', () => {
  const valid = {
    client_id: CLIENT_ID,
    template_key: 'tx_llc',
    fee: '$1,500',
    deadline: '2026-12-31',
    notes: '  Needs it before January  ',
  }

  it('reads a complete form', () => {
    expect(parseNewJobInput(form(valid))).toEqual({
      ok: true,
      value: {
        clientId: CLIENT_ID,
        templateKey: 'tx_llc',
        fee: 1500,
        deadline: '2026-12-31',
        notes: 'Needs it before January',
      },
    })
  })

  it('defaults a blank fee, deadline and notes', () => {
    const result = parseNewJobInput(form({ client_id: CLIENT_ID, template_key: 'tx_llc' }))
    expect(result).toEqual({
      ok: true,
      value: { clientId: CLIENT_ID, templateKey: 'tx_llc', fee: 0, deadline: null, notes: null },
    })
  })

  it('asks for a client when the id is missing or malformed', () => {
    expect(parseNewJobInput(form({ ...valid, client_id: '' }))).toEqual({
      ok: false,
      error: 'Choose a client.',
    })
    expect(parseNewJobInput(form({ ...valid, client_id: 'garbage' }))).toEqual({
      ok: false,
      error: 'Choose a client.',
    })
  })

  it('asks for a template when the key is missing or not a plain key', () => {
    expect(parseNewJobInput(form({ ...valid, template_key: '' }))).toEqual({
      ok: false,
      error: 'Choose a service template.',
    })
    expect(parseNewJobInput(form({ ...valid, template_key: "x'; select 1; --" })).ok).toBe(false)
  })

  it('passes a bad fee, deadline or note on as the error', () => {
    expect(parseNewJobInput(form({ ...valid, fee: '1.500' })).ok).toBe(false)
    expect(parseNewJobInput(form({ ...valid, deadline: '2026-02-30' })).ok).toBe(false)
    expect(parseNewJobInput(form({ ...valid, notes: 'x'.repeat(MAX_NOTE_LENGTH + 1) })).ok).toBe(false)
  })
})

describe('parseStepPatch', () => {
  it('accepts a known status', () => {
    expect(parseStepPatch({ status: 'done' })).toEqual({ ok: true, value: { status: 'done' } })
  })

  it('refuses an unknown or non-string status', () => {
    expect(parseStepPatch({ status: 'finished' })).toEqual({ ok: false, error: 'Unknown step status.' })
    expect(parseStepPatch({ status: 3 })).toEqual({ ok: false, error: 'Unknown step status.' })
  })

  it('trims notes and turns blank ones into null so a note can be cleared', () => {
    expect(parseStepPatch({ client_note: '  Please sign  ', internal_note: '   ' })).toEqual({
      ok: true,
      value: { client_note: 'Please sign', internal_note: null },
    })
  })

  it('refuses a note that is not text or is too long', () => {
    expect(parseStepPatch({ client_note: 12 }).ok).toBe(false)
    expect(parseStepPatch({ internal_note: 'x'.repeat(MAX_NOTE_LENGTH + 1) }).ok).toBe(false)
  })

  it('refuses an empty patch', () => {
    expect(parseStepPatch({})).toEqual({ ok: false, error: 'Nothing to update.' })
  })
})
