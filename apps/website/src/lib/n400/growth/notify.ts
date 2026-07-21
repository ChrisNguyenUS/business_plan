// Staff notifications (spec §1.7 notify.ts). Server-only, best-effort:
// a failed email must never fail the consultation insert that triggered it.
//
// Mirrors src/app/api/contact/route.ts's Resend pattern exactly (env vars,
// dynamic import, try/catch + console.error shape). That file's escapeHtml
// helper isn't exported, so it's redefined here rather than imported —
// same shape (accepts `unknown`, escapes `'` too) to stay a faithful mirror.

export interface ConsultationNotifyInput {
  name: string;
  phone: string;
  preferredTime: string;
  topic: string;
  sourceCta: string | null;
  userEmail: string | null;
}

export async function notifyConsultationRequest(input: ConsultationNotifyInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'MannaOS <notifications@mannaos.com>',
      to: ['Chris@mannaos.com'],
      subject: `N400Ready consultation request — ${input.name}`,
      html: [
        '<h2>New consultation request (N400Ready)</h2>',
        `<p><strong>Name:</strong> ${escapeHtml(input.name)}</p>`,
        `<p><strong>Phone:</strong> ${escapeHtml(input.phone)}</p>`,
        `<p><strong>Email:</strong> ${escapeHtml(input.userEmail ?? '—')}</p>`,
        `<p><strong>Preferred time:</strong> ${escapeHtml(input.preferredTime)}</p>`,
        `<p><strong>Topic:</strong> ${escapeHtml(input.topic)}</p>`,
        `<p><strong>Source CTA:</strong> ${escapeHtml(input.sourceCta ?? 'none')}</p>`,
      ].join('\n'),
    });
  } catch (err) {
    console.error('Consultation notify error:', err);
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
