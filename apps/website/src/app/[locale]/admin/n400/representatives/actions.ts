'use server';

// Phase 7 Task 4 — Representatives admin actions.
// Same admin-guard pattern. PK is (state_code, district_number);
// the only mutable field operationally is rep_name (audio URL is set
// by the seed script + edit-question audio uploader if we ever expose
// per-rep audio re-upload from this admin).

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

async function getAdminSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') redirect('/login');
  return supabase;
}

export async function updateRep(
  stateCode: string,
  districtNumber: number,
  formData: FormData,
): Promise<void> {
  const supabase = await getAdminSupabase();
  const { error } = await supabase
    .from('n400_representatives')
    .update({ rep_name: String(formData.get('rep_name') ?? '').trim() })
    .eq('state_code', stateCode)
    .eq('district_number', districtNumber);
  if (error) throw new Error(error.message);
  updateTag('n400-content');
}
