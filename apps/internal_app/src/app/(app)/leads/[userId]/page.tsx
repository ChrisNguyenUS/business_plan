import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getLead,
  getLeadConversion,
  getLeadHiddenAt,
  getLeadProfiling,
  getLeadTimeline,
  getLeadWeakSection,
} from '@/actions/leads'
import LeadTimeline from '@/components/leads/LeadTimeline'
import LeadSummaryPanel from '@/components/leads/LeadSummaryPanel'
import LeadKpis from '@/components/leads/LeadKpis'
import LeadActivityChart from '@/components/leads/LeadActivityChart'
import LeadProfilingCard from '@/components/leads/LeadProfilingCard'
import HideLeadButton from '@/components/leads/HideLeadButton'
import RequestDeletionButton from '@/components/deletion/RequestDeletionButton'
import PendingRequestBanner from '@/components/deletion/PendingRequestBanner'
import { getPendingRequestFor } from '@/actions/deletion-requests'
import { isCurrentUserAdmin } from '@/lib/auth/is-admin'
import { groupTimeline, summarizeActivity } from '@/lib/n400/activity'
import { answersFromLead, describeProfiling, questionsOf } from '@/lib/n400/profiling-status'

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

  const [timeline, weakSection, profiling, clientId, hiddenAt, isAdmin, pendingRequest] = await Promise.all([
    getLeadTimeline(userId),
    getLeadWeakSection(userId),
    getLeadProfiling(userId),
    getLeadConversion(userId),
    getLeadHiddenAt(userId),
    isCurrentUserAdmin(),
    getPendingRequestFor('lead', userId),
  ])

  const summary = summarizeActivity(timeline.events)
  const days = groupTimeline(timeline.events)
  const profilingRows = describeProfiling(profiling.definitions, profiling.states, answersFromLead(lead))
  const questions = new Map(questionsOf(profiling.definitions).map((d) => [d.question_key, d]))

  return (
    <div className="space-y-6">
      {hiddenAt && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 text-sm text-amber-800">
          <span className="material-symbols-outlined text-[18px]">visibility_off</span>
          <span>
            Hidden from the Leads list and the Sales-Ready email since{' '}
            {new Date(hiddenAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            .
          </span>
        </div>
      )}
      {pendingRequest && (
        <PendingRequestBanner
          entityType="lead"
          requesterName={pendingRequest.requesterName}
          createdAt={pendingRequest.createdAt}
        />
      )}
      <div className="flex items-end justify-between gap-4">
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
        <div className="flex items-start gap-2 shrink-0">
        {isAdmin ? (
          <HideLeadButton userId={lead.user_id} hidden={hiddenAt !== null} />
        ) : (
          !hiddenAt && (
            <RequestDeletionButton
              entityType="lead"
              entityId={lead.user_id}
              alreadyPending={!!pendingRequest}
            />
          )
        )}
        {clientId ? (
          <Link
            href={`/clients/${clientId}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-[#006970] border border-[#3AAFB9]/40 hover:bg-[rgba(58,175,185,0.08)] transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-sm">badge</span>
            View client
          </Link>
        ) : (
          <Link
            href={`/clients/new?fromLead=${lead.user_id}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all shrink-0"
            style={{ backgroundColor: '#3AAFB9' }}
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Convert to Client
          </Link>
        )}
        </div>
      </div>

      <LeadKpis summary={summary} />
      <LeadProfilingCard rows={profilingRows} />
      <LeadActivityChart daily={summary.daily} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <LeadTimeline
            days={days}
            shown={timeline.events.length}
            total={timeline.total}
            questions={questions}
          />
        </div>
        <LeadSummaryPanel lead={lead} weakSection={weakSection} />
      </div>
    </div>
  )
}
