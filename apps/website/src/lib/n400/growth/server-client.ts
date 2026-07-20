// Server-only Supabase client bound to the caller's session cookies.
// Read-only cookie usage — session refresh happens in middleware.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getAuthedServerClient() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only usage; session refresh happens in middleware.
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
