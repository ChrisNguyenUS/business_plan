import type { Result } from './types'

export interface OutgoingEmail {
  to: string
  subject: string
  html: string
  text: string
}

/** What notify.ts needs from a mail provider; tests pass a stand-in. */
export type SendEmail = (email: OutgoingEmail) => Promise<Result<{ id: string | null }>>

export const DEFAULT_FROM = 'MannaOS <notifications@mannaos.com>'
export const DEFAULT_REPLY_TO = 'Chris@mannaos.com'

/**
 * Sends through Resend, same env names as the website app. Never throws:
 * a missing key or a provider error comes back as { ok: false }.
 */
export const sendWithResend: SendEmail = async (email) => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'Email is not configured (RESEND_API_KEY is missing).' }
  }
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
      to: [email.to],
      replyTo: process.env.RESEND_REPLY_TO || DEFAULT_REPLY_TO,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, value: { id: data?.id ?? null } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error while sending.' }
  }
}
