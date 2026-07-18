'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  N400_LANG_COOKIE,
  N400_LANG_COOKIE_MAX_AGE,
  isN400Lang,
} from './config';

/**
 * Persist the app language: always the cookie; also the DB row when a
 * user is signed in (popup/profile). Logged-out (login-page toggle) the
 * cookie alone is enough.
 */
export async function setN400Language(lang: string): Promise<{ ok: boolean }> {
  if (!isN400Lang(lang)) return { ok: false };

  const store = await cookies();
  store.set(N400_LANG_COOKIE, lang, {
    path: '/',
    maxAge: N400_LANG_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll() {
          /* auth cookie refresh not needed in this short-lived action */
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase
      .from('n400_user_profile')
      .update({ ui_language: lang })
      .eq('user_id', user.id);
    if (error) return { ok: false };
  }

  return { ok: true };
}
