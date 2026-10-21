import type { SupabaseClient } from '@supabase/supabase-js'

/** One `supabase.from(table)…` chain, as recorded by the fake. */
export interface Op {
  table: string
  action: 'select' | 'insert' | 'update' | 'delete'
  payload?: unknown
  calls: [string, ...unknown[]][]
}

export interface Reply {
  data?: unknown
  error?: { message: string; code?: string } | null
  count?: number | null
}

/**
 * Minimal chainable stand-in: records every call and resolves each chain with
 * whatever `reply(op)` returns for it. Not a test file (no .test suffix).
 */
export function fakeSupabase(reply: (op: Op) => Reply = () => ({})) {
  const ops: Op[] = []
  const client = {
    from(table: string) {
      const op: Op = { table, action: 'select', calls: [] }
      ops.push(op)
      const chain: Record<string, unknown> = {}
      const record = (name: string) => (...args: unknown[]) => {
        op.calls.push([name, ...args])
        return chain
      }
      for (const m of ['select', 'eq', 'or', 'in', 'is', 'not', 'order', 'limit', 'maybeSingle', 'single']) {
        chain[m] = record(m)
      }
      for (const a of ['insert', 'update', 'delete'] as const) {
        chain[a] = (payload?: unknown) => {
          op.action = a
          op.payload = payload
          return chain
        }
      }
      chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve()
          .then(() => {
            const r = reply(op)
            return { data: r.data ?? null, error: r.error ?? null, count: r.count ?? null }
          })
          .then(resolve, reject)
      return chain
    },
  }
  return { client: client as unknown as SupabaseClient, ops }
}

/** True when the op recorded exactly this call, e.g. has(op, 'eq', 'id', 'x'). */
export function has(op: Op | undefined, ...call: unknown[]): boolean {
  return !!op && op.calls.some((c) => JSON.stringify(c) === JSON.stringify(call))
}
