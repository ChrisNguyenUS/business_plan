import { getClients } from '@/actions/clients'
import Link from 'next/link'
import { getInitials } from '@/lib/utils'
import type { ServiceTag } from '@/types'

export const dynamic = 'force-dynamic'

const SERVICE_COLORS: Record<ServiceTag, string> = {
  immigration: 'bg-[rgba(58,175,185,0.1)] text-[#006970]',
  tax: 'bg-amber-50 text-amber-700',
  insurance: 'bg-blue-50 text-blue-700',
  ai: 'bg-purple-50 text-purple-700',
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const clients = await getClients(params.q)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Clients</h2>
          <p className="text-sm text-slate-400 mt-0.5">{clients.length} total clients</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/clients/bulk-import"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 border border-[#bcc9ca]/40 hover:bg-[#f1f4f9] transition-colors"
          >
            <span className="material-symbols-outlined text-lg">upload</span>
            Bulk Import
          </Link>
          <Link
            href="/clients/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            New Client
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <form method="GET" className="relative max-w-lg">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">
          search
        </span>
        <input
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Search by name, A-Number, phone, or email..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-[#bcc9ca]/30 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 shadow-sm placeholder:text-slate-400 transition-all"
          style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
        />
        {params.q && (
          <Link
            href="/clients"
            className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg hover:text-slate-600"
          >
            close
          </Link>
        )}
      </form>

      {/* Client List */}
      {clients.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center" style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}>
          <span className="material-symbols-outlined text-5xl text-slate-200">group</span>
          <p className="mt-4 text-slate-500 font-medium">
            {params.q ? `No clients matching "${params.q}"` : 'No clients yet'}
          </p>
          {!params.q && (
            <Link
              href="/clients/new"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
              style={{ color: '#3AAFB9' }}
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add your first client
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
                {['Client', 'Contact', 'A-Number', 'Services', ''].map((h) => (
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
              {clients.map((client: any) => {
                const initials = getInitials(client.first_name, client.last_name)
                const services: ServiceTag[] = client.services_used ?? []

                return (
                  <tr
                    key={client.id}
                    className="hover:bg-[#f7f9ff]/60 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: '#3AAFB9' }}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {client.last_name}, {client.first_name}{' '}
                            {client.middle_name ?? ''}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Added{' '}
                            {new Date(client.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{client.phone ?? '—'}</p>
                      <p className="text-[11px] text-slate-400">{client.email ?? ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 font-mono">
                        {client.a_number ? `A# ${client.a_number}` : '—'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {services.length === 0 ? (
                          <span className="text-slate-400 text-xs">None</span>
                        ) : (
                          services.map((s) => (
                            <span
                              key={s}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${SERVICE_COLORS[s] ?? 'bg-slate-100 text-slate-600'}`}
                            >
                              {s}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/clients/${client.id}`}
                          className="flex items-center gap-1 text-xs font-semibold text-[#006970] hover:underline"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          View
                        </Link>
                        <Link
                          href={`/cases/new?clientId=${client.id}`}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                          New Case
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
