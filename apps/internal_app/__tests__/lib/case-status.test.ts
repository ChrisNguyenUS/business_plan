/** @jest-environment node */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CASE_STATUSES, CASE_STATUS_COLORS, CASE_STATUS_LABELS } from '@/types'

// The 2026-04-14 UI redesign gave the dropdown statuses the database rejects
// (cases_status_check), so most status changes silently failed. Pin the app's
// list to the CHECK constraint that created the column.
function statusesAllowedByDb(): string[] {
  const sql = readFileSync(join(__dirname, '../../supabase/migrations/001_schema.sql'), 'utf8')
  const check = sql.match(/status\s+TEXT NOT NULL DEFAULT 'documents_pending' CHECK \(status IN \(([^)]*)\)/)
  if (!check) throw new Error('cases.status CHECK not found in 001_schema.sql')
  return [...check[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
}

describe('case statuses', () => {
  it('offers exactly the statuses the database accepts, in its order', () => {
    expect([...CASE_STATUSES]).toEqual(statusesAllowedByDb())
  })

  it('has a label and a colour for every status', () => {
    for (const s of CASE_STATUSES) {
      expect(CASE_STATUS_LABELS[s]).toBeTruthy()
      expect(CASE_STATUS_COLORS[s]).toBeTruthy()
    }
  })
})
