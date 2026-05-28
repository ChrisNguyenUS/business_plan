// Phase 7 Task 4 — Representatives admin page.
// 441 reps across all 50 states + DC. Grouped by state for usability;
// each row is a one-input form posting updateRep(state, district).

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { updateRep } from './actions';

export const revalidate = 0;

interface RepRow {
  state_code: string;
  district_number: number;
  rep_name: string;
  rep_audio_url: string | null;
}

async function getReps(): Promise<RepRow[]> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  // 441 rows fits comfortably in a single SELECT (well under the 1000-row
  // PostgREST default). If this table ever grows past that we'll paginate.
  const { data } = await supabase
    .from('n400_representatives')
    .select('state_code,district_number,rep_name,rep_audio_url')
    .order('state_code')
    .order('district_number');
  return ((data ?? []) as RepRow[]);
}

export default async function RepsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const reps = await getReps();
  const missingAudio = reps.filter((r) => !r.rep_audio_url).length;

  // Group by state for scannability.
  const byState = new Map<string, RepRow[]>();
  for (const r of reps) {
    const list = byState.get(r.state_code);
    if (list) list.push(r);
    else byState.set(r.state_code, [r]);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link
          href={`/${locale}/admin/n400`}
          className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <h1 className="text-2xl font-bold text-charcoal">Congressional Representatives</h1>
        <span className="text-sm text-muted-foreground">
          {reps.length} reps • {missingAudio} missing audio
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Powers Q29 (your U.S. Representative). District 0 = at-large (single statewide rep).
        Audio is uploaded by the seed pipeline; re-recording per rep happens via the seed script
        for v1.
      </p>

      <div className="space-y-6">
        {[...byState.entries()].map(([state, list]) => (
          <div key={state} className="bg-white border border-border rounded-xl p-4">
            <h2 className="font-semibold text-charcoal mb-3">
              {state}{' '}
              <span className="text-xs text-muted-foreground font-normal">
                ({list.length} {list.length === 1 ? 'district' : 'districts'})
              </span>
            </h2>
            <div className="space-y-2">
              {list.map((r) => {
                const update = updateRep.bind(null, r.state_code, r.district_number);
                return (
                  <form
                    key={`${r.state_code}-${r.district_number}`}
                    action={update}
                    className="flex items-center gap-3 flex-wrap"
                  >
                    <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">
                      {r.state_code}-{String(r.district_number).padStart(2, '0')}
                    </span>
                    <input
                      name="rep_name"
                      defaultValue={r.rep_name}
                      className="flex-1 min-w-[12rem] border border-border rounded p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="submit"
                      className="text-xs bg-primary text-white px-3 py-1.5 rounded hover:bg-teal-dark"
                    >
                      Save
                    </button>
                    {r.rep_audio_url ? (
                      <span className="text-xs text-green-700">🔊</span>
                    ) : (
                      <span className="text-xs text-red-600">no audio</span>
                    )}
                  </form>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
