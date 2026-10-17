import { getClientBrief, getJobTemplates } from '@/actions/jobs'
import NewJobForm from '@/components/jobs/NewJobForm'

export const dynamic = 'force-dynamic'

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>
}) {
  const { client_id } = await searchParams
  const templates = await getJobTemplates()

  // ?client_id= pre-selects a client (the "New Job" link on a client's page).
  // getClientBrief ignores anything that is not a real uuid, so a mangled link
  // just shows an empty picker.
  const client = client_id ? await getClientBrief(client_id) : null
  const initialClient = client
    ? { id: client.id, name: `${client.first_name} ${client.last_name}` }
    : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">New Job</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Pick a client and a service. The steps are copied from the template.
        </p>
      </div>
      <NewJobForm templates={templates} initialClient={initialClient} />
    </div>
  )
}
