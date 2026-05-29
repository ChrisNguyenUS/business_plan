// Phase 8 Task 3 — Content version endpoint.
//
// Returns a short hash that changes whenever any n400 content table is
// edited via the admin panel. The Service Worker (Task 4) polls this
// endpoint to decide whether to invalidate its cached
// /api/n400/questions response. Public-read (no auth needed) — the
// hash leaks no PII.

import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getN400ContentVersion } from '@/lib/n400/cached-content';

export async function GET(): Promise<NextResponse> {
  const raw = await getN400ContentVersion();
  // Truncated 8-char prefix is enough collision-resistance for cache
  // busting (32 bits → 1 in 4B chance of accidental match between two
  // arbitrary admin saves) and keeps the response tiny.
  const versionHash = createHash('sha256').update(raw).digest('hex').slice(0, 8);
  return NextResponse.json(
    { version_hash: versionHash },
    { headers: { 'Cache-Control': 'public, max-age=60, must-revalidate' } },
  );
}
