import { createAdminClient } from '@/lib/supabase/admin'
import { sendWithResend } from '@/lib/jobs/mailer'
import {
  buildSalesReadyEmail,
  planSalesReadyDigest,
  type SalesReadyLead,
} from '@/lib/n400/sales-ready'

export const dynamic = 'force-dynamic'

const RECIPIENT = 'Chris@mannaos.com'

/**
 * Daily Sales-Ready digest, called by Vercel Cron (vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; anything else is refused before any
 * database or email work. Excluded from the auth middleware matcher.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/sales-ready] CRON_SECRET is not set')
    return Response.json({ error: 'not configured' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    console.error('[cron/sales-ready] SUPABASE_SERVICE_ROLE_KEY or URL missing')
    return Response.json({ error: 'not configured' }, { status: 500 })
  }

  const [ready, notified] = await Promise.all([
    supabase
      .from('n400_leads_view')
      .select('user_id, full_name, email, effective_score, last_activity_date')
      .eq('role', 'client')
      .eq('effective_status', 'sales_ready'),
    supabase
      .from('n400_lead_profiles')
      .select('user_id')
      .not('sales_ready_notified_at', 'is', null),
  ])
  if (ready.error || notified.error) {
    console.error('[cron/sales-ready] read failed', ready.error?.message, notified.error?.message)
    return Response.json({ error: 'read failed' }, { status: 500 })
  }

  const plan = planSalesReadyDigest(
    (ready.data ?? []) as SalesReadyLead[],
    new Set((notified.data ?? []).map((r) => r.user_id as string)),
  )

  let emailed = false
  if (plan.toNotify.length > 0) {
    const mail = buildSalesReadyEmail(plan.toNotify, process.env.NEXT_PUBLIC_SITE_URL ?? '')
    const sent = await sendWithResend({ to: RECIPIENT, ...mail })
    if (sent.ok) {
      emailed = true
      const { error } = await supabase
        .from('n400_lead_profiles')
        .update({ sales_ready_notified_at: new Date().toISOString() })
        .in('user_id', plan.toNotify.map((l) => l.user_id))
      if (error) console.error('[cron/sales-ready] stamp failed', error.message)
    } else {
      // Not stamped on purpose: tomorrow's run retries.
      console.error('[cron/sales-ready] email failed', sent.error)
    }
  }

  if (plan.toReset.length > 0) {
    const { error } = await supabase
      .from('n400_lead_profiles')
      .update({ sales_ready_notified_at: null })
      .in('user_id', plan.toReset)
    if (error) console.error('[cron/sales-ready] reset failed', error.message)
  }

  return Response.json({
    notified: emailed ? plan.toNotify.length : 0,
    reset: plan.toReset.length,
    emailed,
  })
}
