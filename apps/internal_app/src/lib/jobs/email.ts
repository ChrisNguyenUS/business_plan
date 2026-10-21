import type { StepStatus } from './progress'
import type { NotificationKind } from './types'
import { escapeHtml } from '@/lib/html'

/** Which email a step status calls for; null for statuses that never email. */
export function emailKindFor(status: StepStatus): NotificationKind | null {
  if (status === 'done') return 'step_done'
  if (status === 'waiting_client') return 'step_waiting_client'
  return null
}

export interface ProgressEmailInput {
  kind: NotificationKind
  clientName: string
  serviceEn: string
  serviceVi: string
  /** "3/8", from formatProgressLabel. */
  progressLabel: string
  stepTitleEn: string
  stepTitleVi: string
  stepDescriptionEn: string | null
  stepDescriptionVi: string | null
  /** The staff-written client note; one language, shown once. */
  note: string | null
}

export interface ProgressEmail {
  subject: string
  html: string
  text: string
}

/** A header value must stay on one line. */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function htmlWithBreaks(value: string): string {
  return value.split(/\r?\n/).map(escapeHtml).join('<br>')
}

const BOX = 'margin:12px 0;padding:10px 14px;border-left:4px solid #3AAFB9;background:#f4fafb'

/**
 * One bilingual email, Vietnamese first. Pure: no I/O, so it is tested without
 * a mail provider. Everything that comes from a person is escaped in the HTML.
 */
export function renderProgressEmail(input: ProgressEmailInput): ProgressEmail {
  const done = input.kind === 'step_done'
  const subject = oneLine(
    done
      ? `[Manna] ${input.serviceEn}: ${input.stepTitleEn} — done / xong (${input.progressLabel})`
      : `[Manna] ${input.serviceEn}: action needed / cần bạn hỗ trợ — ${input.stepTitleEn}`
  )

  const vi = {
    hello: `Xin chào ${input.clientName},`,
    line: done
      ? `Bước "${input.stepTitleVi}" của dịch vụ "${input.serviceVi}" đã hoàn tất.`
      : `Dịch vụ "${input.serviceVi}" đang chờ bạn ở bước "${input.stepTitleVi}".`,
    progress: `Tiến độ: ${input.progressLabel}`,
    todo: 'Việc của bạn',
    detail: input.stepDescriptionVi,
  }
  const en = {
    hello: `Hello ${input.clientName},`,
    line: done
      ? `The step "${input.stepTitleEn}" of your "${input.serviceEn}" service is complete.`
      : `Your "${input.serviceEn}" service is waiting on you at the step "${input.stepTitleEn}".`,
    progress: `Progress: ${input.progressLabel}`,
    todo: 'What we need from you',
    detail: input.stepDescriptionEn,
  }
  const noteLabel = 'Ghi chú từ Manna / Note from Manna'
  const footer = 'Trả lời email này nếu bạn có câu hỏi. / Reply to this email if you have questions.'
  const sign = 'Manna One Solution'

  const htmlSection = (s: typeof vi) =>
    [
      `<p>${escapeHtml(s.hello)}</p>`,
      `<p>${escapeHtml(s.line)} <strong>${escapeHtml(s.progress)}</strong></p>`,
      !done
        ? `<div style="${BOX}"><strong>${escapeHtml(s.todo)}</strong>${
            s.detail ? `<br>${htmlWithBreaks(s.detail)}` : ''
          }</div>`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

  const note = input.note?.trim() ? input.note.trim() : null
  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2933;max-width:560px">',
    htmlSection(vi),
    '<hr style="border:none;border-top:1px solid #e1e8ed;margin:20px 0">',
    htmlSection(en),
    note
      ? `<p style="margin-top:20px"><em>${escapeHtml(noteLabel)}:</em><br>${htmlWithBreaks(note)}</p>`
      : '',
    `<p style="color:#6b7785;font-size:13px;margin-top:24px">${escapeHtml(footer)}<br>${escapeHtml(sign)}</p>`,
    '</div>',
  ]
    .filter(Boolean)
    .join('\n')

  const textSection = (s: typeof vi) =>
    [s.hello, '', `${s.line} ${s.progress}`, ...(!done ? ['', `${s.todo}${s.detail ? `: ${s.detail}` : ''}`] : [])].join('\n')
  const text = [
    textSection(vi),
    '',
    '---',
    '',
    textSection(en),
    ...(note ? ['', `${noteLabel}:`, note] : []),
    '',
    footer,
    sign,
  ].join('\n')

  return { subject, html, text }
}
