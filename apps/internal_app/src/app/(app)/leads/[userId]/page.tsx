import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLead, getLeadTimeline, getLeadWeakSection } from '@/actions/leads'
import LeadTimeline from '@/components/leads/LeadTimeline'
import LeadSummaryPanel from '@/components/leads/LeadSummaryPanel'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  const lead = await getLead(userId)
  // Missing row and RLS-filtered row are the same thing from here.
  if (!lead) notFound()

  const [timeline, weakSection] = await Promise.all([
    getLeadTimeline(userId),
    getLeadWeakSection(userId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Leads
        </Link>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight mt-1">
          {lead.full_name || 'Unnamed lead'}
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">{lead.email ?? '—'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <LeadTimeline events={timeline.events} total={timeline.total} />
        </div>
        <LeadSummaryPanel lead={lead} weakSection={weakSection} />
      </div>
    </div>
  )
}
