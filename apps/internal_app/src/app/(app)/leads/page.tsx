import Link from 'next/link'
import { getLeads } from '@/actions/leads'
import { LEADS_PAGE_SIZE } from '@/lib/n400/leads-shape'
import LeadStatusBadge from '@/components/leads/LeadStatusBadge'

export const dynamic = 'force-dynamic'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'sales_ready', label: 'Sales Ready' },
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
]

function initialsOf(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split('@')[0] || '?'
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page ?? '1') || 1
  const { leads, total } = await getLeads({
    q: params.q,
    status: params.status,
    page,
  })

  const totalPages = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE))
  const hasFilters = Boolean(params.q || params.status)

  const linkFor = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams()
    const merged = { q: params.q, status: params.status, ...overrides }
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value)
    }
    const qs = next.toString()
    return qs ? `/leads?${qs}` : '/leads'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Leads</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {total} N400Ready {total === 1 ? 'lead' : 'leads'}, highest score first
        </p>
      </div>

      {/* Search */}
      <form method="GET" className="relative max-w-lg">
        {params.status && <input type="hidden" name="status" value={params.status} />}
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">
          search
        </span>
        <input
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Search by name or email..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-[#bcc9ca]/30 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 shadow-sm placeholder:text-slate-400 transition-all"
          style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
        />
        {params.q && (
          <Link
            href={linkFor({ q: undefined, page: undefined })}
            className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg hover:text-slate-600"
          >
            close
          </Link>
        )}
      </form>

      {/* Status filter */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = (params.status ?? '') === filter.value
          return (
            <Link
              key={filter.label}
              href={linkFor({ status: filter.value || undefined, page: undefined })}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                active
                  ? 'text-white'
                  : 'text-slate-600 bg-white border border-[#bcc9ca]/40 hover:bg-[#f1f4f9]'
              }`}
              style={active ? { backgroundColor: '#006970' } : undefined}
            >
              {filter.label}
            </Link>
          )
        })}
      </div>

      {/* List */}
      {leads.length === 0 ? (
        <div
          className="bg-white rounded-xl p-16 text-center"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <span className="material-symbols-outlined text-5xl text-slate-200">trending_up</span>
          <p className="mt-4 text-slate-500 font-medium">
            {hasFilters ? 'No leads match these filters' : 'No leads yet'}
          </p>
          {hasFilters && (
            <Link
              href="/leads"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
              style={{ color: '#3AAFB9' }}
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div
          className="bg-white rounded-xl overflow-hidden"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <table className="w-full text-left">
            <thead className="bg-[#f7f9ff]/60 border-b border-[#ebeef3]">
              <tr>
                {['Lead', 'Score', 'Stage', 'Streak', 'Last active', 'Interview'].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f4f9]">
              {leads.map((lead) => (
                <tr key={lead.user_id} className="hover:bg-[#f7f9ff]/60 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/leads/${lead.user_id}`} className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: '#3AAFB9' }}
                      >
                        {initialsOf(lead.full_name, lead.email)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {lead.full_name || 'Unnamed'}
                        </p>
                        <p className="text-[11px] text-slate-400">{lead.email ?? '—'}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {lead.effective_score}
                      </span>
                      <LeadStatusBadge status={lead.effective_status} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                    {lead.journey_stage?.replace(/_/g, ' ') ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {lead.current_streak ?? 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(lead.last_activity_date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(lead.interview_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={linkFor({ page: String(page - 1) })}
                className="px-4 py-2 rounded-lg bg-white border border-[#bcc9ca]/40 font-semibold hover:bg-[#f1f4f9]"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={linkFor({ page: String(page + 1) })}
                className="px-4 py-2 rounded-lg bg-white border border-[#bcc9ca]/40 font-semibold hover:bg-[#f1f4f9]"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
