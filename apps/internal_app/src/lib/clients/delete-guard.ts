/**
 * Why a client cannot be deleted yet, or null when it can.
 *
 * cases (primary or secondary client) and jobs point at clients with no
 * cascade, so the database would refuse anyway; this turns that into a message
 * an admin can act on instead of a raw foreign-key error. Owner decision
 * 2026-10-20: block, never delete cases or jobs along with the client.
 */
export function clientDeleteBlocker(counts: { cases: number; jobs: number }): string | null {
  const parts: string[] = []
  if (counts.cases > 0) parts.push(`${counts.cases} ${counts.cases === 1 ? 'case' : 'cases'}`)
  if (counts.jobs > 0) parts.push(`${counts.jobs} ${counts.jobs === 1 ? 'job' : 'jobs'}`)
  if (parts.length === 0) return null
  const single = counts.cases + counts.jobs === 1
  return `This client still has ${parts.join(' and ')}. Delete ${single ? 'it' : 'them'} first.`
}
