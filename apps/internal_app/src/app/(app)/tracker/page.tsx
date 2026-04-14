import { createClient } from '@/lib/supabase/server'
import { setReceiptNumber, checkCaseStatus } from '@/actions/tracker'
import Link from 'next/link'

export default async function TrackerPage() {
  const supabase = await createClient()
  
  // Get all case forms that have a case attached
  const { data: forms } = await supabase
    .from('case_forms')
    .select(`
      id, form_type, receipt_number, current_uscis_status, last_checked_at,
      cases (
        id, primary_client_id, secondary_client_id,
        primary_client:clients!cases_primary_client_id_fkey(first_name, last_name)
      )
    `)
    .not('cases', 'is', null)
    .order('last_checked_at', { ascending: true, nullsFirst: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">USCIS Case Tracker</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-gray-400 bg-gray-900 border-b border-gray-800">
            <tr>
              <th className="p-3 font-medium rounded-tl-lg">Client</th>
              <th className="p-3 font-medium">Form</th>
              <th className="p-3 font-medium">Receipt Number</th>
              <th className="p-3 font-medium">USCIS Status</th>
              <th className="p-3 font-medium rounded-tr-lg">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {forms?.map((f: any) => (
              <tr key={f.id} className="hover:bg-gray-900/50 transition-colors">
                <td className="p-3">
                  <Link href={`/cases/${f.cases.id}`} className="font-medium text-blue-400 hover:text-blue-300">
                    {(f.cases.primary_client as any)?.last_name}, {(f.cases.primary_client as any)?.first_name}
                  </Link>
                </td>
                <td className="p-3 font-mono">{f.form_type.toUpperCase()}</td>
                <td className="p-3">
                  <form action={async (formData) => {
                    'use server'
                    await setReceiptNumber(f.id, formData.get('receipt') as string)
                  }} className="flex max-w-[200px]">
                    <input name="receipt" defaultValue={f.receipt_number ?? ''} placeholder="IOE..."
                      className="w-full px-2 py-1 text-sm rounded-l bg-gray-800 text-white border border-gray-700" />
                    <button type="submit" className="px-2 py-1 bg-gray-700 rounded-r text-xs hover:bg-gray-600">Save</button>
                  </form>
                </td>
                <td className="p-3">
                  <p className="font-medium">{f.current_uscis_status ?? 'Unknown'}</p>
                  <p className="text-xs text-gray-500">
                    {f.last_checked_at ? new Date(f.last_checked_at).toLocaleDateString() : 'Never checked'}
                  </p>
                </td>
                <td className="p-3">
                  <form action={async () => {
                    'use server'
                    await checkCaseStatus(f.id)
                  }}>
                    <button type="submit" disabled={!f.receipt_number}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs text-white">
                      Check Now
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(!forms || forms.length === 0) && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  No cases found. Create a case first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
