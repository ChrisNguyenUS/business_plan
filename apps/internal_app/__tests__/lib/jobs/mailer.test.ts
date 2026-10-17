import { DEFAULT_FROM, DEFAULT_REPLY_TO, sendWithResend } from '@/lib/jobs/mailer'

const send = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send } })),
}))

const email = { to: 'an@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' }
const ENV_KEYS = ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_REPLY_TO'] as const
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  send.mockReset()
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('sendWithResend', () => {
  it('does nothing and says why when there is no API key', async () => {
    const result = await sendWithResend(email)
    expect(result).toEqual({
      ok: false,
      error: 'Email is not configured (RESEND_API_KEY is missing).',
    })
    expect(send).not.toHaveBeenCalled()
  })

  it('sends with the default sender and reply-to and returns the provider id', async () => {
    process.env.RESEND_API_KEY = 're_test'
    send.mockResolvedValue({ data: { id: 'msg_1' }, error: null })
    const result = await sendWithResend(email)
    expect(send).toHaveBeenCalledWith({
      from: DEFAULT_FROM,
      to: ['an@example.com'],
      replyTo: DEFAULT_REPLY_TO,
      subject: 'Hi',
      html: '<p>Hi</p>',
      text: 'Hi',
    })
    expect(result).toEqual({ ok: true, value: { id: 'msg_1' } })
  })

  it('takes sender and reply-to from the environment', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.RESEND_FROM_EMAIL = 'Manna <hello@example.com>'
    process.env.RESEND_REPLY_TO = 'desk@example.com'
    send.mockResolvedValue({ data: { id: 'msg_2' }, error: null })
    await sendWithResend(email)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'Manna <hello@example.com>', replyTo: 'desk@example.com' })
    )
  })

  it('turns a provider error into a result, not an exception', async () => {
    process.env.RESEND_API_KEY = 're_test'
    send.mockResolvedValue({ data: null, error: { message: 'domain not verified' } })
    expect(await sendWithResend(email)).toEqual({ ok: false, error: 'domain not verified' })
  })

  it('turns a thrown error into a result, not an exception', async () => {
    process.env.RESEND_API_KEY = 're_test'
    send.mockRejectedValue(new Error('network down'))
    expect(await sendWithResend(email)).toEqual({ ok: false, error: 'network down' })
  })
})
