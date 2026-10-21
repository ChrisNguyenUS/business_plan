import { escapeHtml } from '@/lib/html'
import type { OutgoingEmail } from '@/lib/jobs/mailer'
import { actionLabel, type DeletionRequestRow } from './requests'

/** Where new deletion requests are announced (same inbox as Sales-Ready). */
export const ADMIN_INBOX = 'Chris@mannaos.com'

export type DeletionEmail = Omit<OutgoingEmail, 'to'>

const INBOX_PATH = '/deletion-requests'

/** A header value must stay on one line. */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function inboxUrl(siteUrl: string | undefined): string | null {
  return siteUrl ? siteUrl.replace(/\/+$/, '') + INBOX_PATH : null
}

function footer(url: string | null): { text: string; html: string } {
  return url
    ? { text: `Open: ${url}`, html: `<p><a href="${escapeHtml(url)}">Open Deletion requests</a></p>` }
    : {
        text: 'Open the Deletion requests page of the internal app.',
        html: '<p>Open the Deletion requests page of the internal app.</p>',
      }
}

export function buildRequestEmail(
  req: Pick<DeletionRequestRow, 'entity_type' | 'entity_label' | 'reason'>,
  requesterName: string,
  siteUrl?: string,
): DeletionEmail {
  const action = actionLabel(req.entity_type)
  const end = footer(inboxUrl(siteUrl))
  return {
    subject: oneLine(`Deletion request: ${action} — ${req.entity_label}`),
    text: [
      `${requesterName} asked to ${action.toLowerCase()}: ${req.entity_label}`,
      `Reason: ${req.reason}`,
      end.text,
    ].join('\n\n'),
    html: [
      `<p>${escapeHtml(requesterName)} asked to <strong>${escapeHtml(action.toLowerCase())}</strong>: ${escapeHtml(req.entity_label)}</p>`,
      `<p><em>Reason:</em> ${escapeHtml(req.reason)}</p>`,
      end.html,
    ].join(''),
  }
}

export function buildDecisionEmail(
  req: Pick<DeletionRequestRow, 'entity_type' | 'entity_label' | 'status' | 'decision_note'>,
  siteUrl?: string,
): DeletionEmail {
  const action = actionLabel(req.entity_type)
  const verb = req.status === 'approved' ? 'approved' : 'rejected'
  const end = footer(inboxUrl(siteUrl))
  const line = `An admin ${verb} your request to ${action.toLowerCase()}: ${req.entity_label}.`
  return {
    subject: oneLine(`${verb === 'approved' ? 'Approved' : 'Rejected'}: ${action} — ${req.entity_label}`),
    text: [line, req.decision_note ? `Note: ${req.decision_note}` : null, end.text]
      .filter(Boolean)
      .join('\n\n'),
    html: [
      `<p>${escapeHtml(line)}</p>`,
      req.decision_note ? `<p><em>Note:</em> ${escapeHtml(req.decision_note)}</p>` : '',
      end.html,
    ].join(''),
  }
}
