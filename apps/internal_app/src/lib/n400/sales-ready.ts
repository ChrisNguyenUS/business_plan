// Daily Sales-Ready digest (spec 2026-10-18-g4-followups §C). Pure: the cron
// route loads rows and sends mail; this decides who and what.

export interface SalesReadyLead {
  user_id: string
  full_name: string | null
  email: string | null
  effective_score: number
  last_activity_date: string | null
}

/** The leads this run actually claimed (a concurrent run may have taken the rest). */
export function selectClaimedLeads(
  salesReady: SalesReadyLead[],
  claimedIds: readonly string[],
): SalesReadyLead[] {
  const claimed = new Set(claimedIds)
  return salesReady.filter((l) => claimed.has(l.user_id))
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildSalesReadyEmail(
  leads: SalesReadyLead[],
  siteUrl: string,
): { subject: string; html: string; text: string } {
  const base = siteUrl.replace(/\/+$/, '')
  const n = leads.length
  const subject = `N400Ready — ${n} new Sales-Ready ${n === 1 ? 'lead' : 'leads'}`
  const rows = leads.map((l) => {
    const url = `${base}/leads/${l.user_id}`
    return {
      html: `<li><a href="${escapeHtml(url)}">${escapeHtml(l.full_name || 'Unnamed')}</a> · ${escapeHtml(
        l.email ?? '—',
      )} · score ${escapeHtml(l.effective_score)} · last active ${escapeHtml(l.last_activity_date ?? '—')}</li>`,
      text: `- ${l.full_name || 'Unnamed'} (${l.email ?? '—'}) · score ${l.effective_score} · ${url}`,
    }
  })
  return {
    subject,
    html: [
      `<h2>${escapeHtml(subject)}</h2>`,
      '<p>These N400Ready leads crossed the Sales-Ready threshold since the last digest.</p>',
      `<ul>${rows.map((r) => r.html).join('')}</ul>`,
    ].join('\n'),
    text: [subject, '', ...rows.map((r) => r.text)].join('\n'),
  }
}
