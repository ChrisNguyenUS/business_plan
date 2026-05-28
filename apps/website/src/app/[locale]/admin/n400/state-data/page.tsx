// Phase 7 Task 4 — State data admin page.
// Renders all 50 states with one inline form per row. Each form posts
// updateStateData(stateCode, formData) → updates governor / senators /
// capital. Senator/capital fields are nullable on the table; empty
// string normalizes to null in the action.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { updateStateData } from './actions';

export const revalidate = 0;

interface StateRow {
  state_code: string;
  state_name_en: string;
  state_name_vi: string;
  governor_name: string;
  capital_city: string | null;
  senator_1: string | null;
  senator_2: string | null;
}

async function getStates(): Promise<StateRow[]> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data } = await supabase
    .from('n400_state_data')
    .select('state_code,state_name_en,state_name_vi,governor_name,capital_city,senator_1,senator_2')
    .order('state_code');
  return ((data ?? []) as StateRow[]);
}

export default async function StateDataPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const states = await getStates();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/admin/n400`}
          className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <h1 className="text-2xl font-bold text-charcoal">State Data</h1>
        <span className="text-sm text-muted-foreground">{states.length} states</span>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Powers Q23 (senators), Q61 (governor), and Q62 (capital) per state. Empty senator / capital
        fields are stored as NULL — leave blank to skip.
      </p>

      <div className="space-y-3">
        {states.map((s) => {
          const update = updateStateData.bind(null, s.state_code);
          return (
            <form
              key={s.state_code}
              action={update}
              className="bg-white border border-border rounded-xl p-4"
            >
              <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                <h2 className="font-semibold text-charcoal">
                  {s.state_name_en}{' '}
                  <span className="text-xs text-muted-foreground font-mono">({s.state_code})</span>
                </h2>
                <span className="text-xs text-muted-foreground">{s.state_name_vi}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Governor</label>
                  <input
                    name="governor_name"
                    defaultValue={s.governor_name}
                    className="w-full border border-border rounded p-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Capital</label>
                  <input
                    name="capital_city"
                    defaultValue={s.capital_city ?? ''}
                    className="w-full border border-border rounded p-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Senator 1</label>
                  <input
                    name="senator_1"
                    defaultValue={s.senator_1 ?? ''}
                    className="w-full border border-border rounded p-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Senator 2</label>
                  <input
                    name="senator_2"
                    defaultValue={s.senator_2 ?? ''}
                    className="w-full border border-border rounded p-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="mt-3">
                <button
                  type="submit"
                  className="text-xs bg-primary text-white px-3 py-1.5 rounded hover:bg-teal-dark"
                >
                  Save
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
