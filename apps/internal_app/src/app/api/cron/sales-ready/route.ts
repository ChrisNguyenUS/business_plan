import { timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWithResend } from '@/lib/jobs/mailer'
import {
  buildSalesReadyEmail,
  selectClaimedLeads,
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
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  // timingSafeEqual throws on unequal lengths, so compare lengths first.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    console.error('[cron/sales-ready] NEXT_PUBLIC_SITE_URL missing')
    return Response.json({ error: 'not configured' }, { status: 500 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    console.error('[cron/sales-ready] SUPABASE_SERVICE_ROLE_KEY or URL missing')
    return Response.json({ error: 'not configured' }, { status: 500 })
  }

  const ready = await supabase
    .from('n400_leads_view')
    .select('user_id, full_name, email, effective_score, last_activity_date')
    .eq('role', 'client')
    .eq('effective_status', 'sales_ready')
  if (ready.error) {
    console.error('[cron/sales-ready] read failed', ready.error.message)
    return Response.json({ error: 'read failed' }, { status: 500 })
  }
  const readyLeads = (ready.data ?? []) as SalesReadyLead[]
  const readyIds = readyLeads.map((l) => l.user_id)

  // Claim, then send: stamping first (only rows still unstamped) means an
  // overlapping run gets none of the same rows back, so it cannot double-send.
  let claimedIds: string[] = []
  if (readyIds.length > 0) {
    const claim = await supabase
      .from('n400_lead_profiles')
      .update({ sales_ready_notified_at: new Date().toISOString() })
      .in('user_id', readyIds)
      .is('sales_ready_notified_at', null)
      .select('user_id')
    if (claim.error) {
      console.error('[cron/sales-ready] claim failed', claim.error.message)
      return Response.json({ error: 'claim failed' }, { status: 500 })
    }
    claimedIds = (claim.data ?? []).map((r) => r.user_id as string)
  }

  const toEmail = selectClaimedLeads(readyLeads, claimedIds)
  let emailed = false
  if (toEmail.length > 0) {
    const mail = buildSalesReadyEmail(toEmail, siteUrl)
    const sent = await sendWithResend({ to: RECIPIENT, ...mail })
    if (!sent.ok) {
      console.error('[cron/sales-ready] email failed', sent.error)
      // Un-claim so tomorrow's run retries.
      const { error } = await supabase
        .from('n400_lead_profiles')
        .update({ sales_ready_notified_at: null })
        .in('user_id', claimedIds)
      if (error) console.error('[cron/sales-ready] un-claim failed', error.message)
      return Response.json({ error: 'email failed', claimed: claimedIds.length }, { status: 500 })
    }
    emailed = true
  }

  // Leads announced before but no longer sales-ready: clear the stamp so a
  // later re-cross notifies again. No read of stamped ids (avoids row caps).
  let resetQuery = supabase
    .from('n400_lead_profiles')
    .update({ sales_ready_notified_at: null })
    .not('sales_ready_notified_at', 'is', null)
  if (readyIds.length > 0) {
    resetQuery = resetQuery.not('user_id', 'in', `(${readyIds.join(',')})`)
  }
  const reset = await resetQuery.select('user_id')
  if (reset.error) {
    console.error('[cron/sales-ready] reset failed', reset.error.message)
    return Response.json({ error: 'reset failed', notified: toEmail.length }, { status: 500 })
  }

  return Response.json({
    notified: toEmail.length,
    reset: (reset.data ?? []).length,
    emailed,
  })
}
