'use client';

import { DEFAULT_N400_LANG, N400_LANG_COOKIE, isN400Lang, type N400Lang } from './config';

/** Read the app language cookie in the browser. No/invalid cookie -> 'vi'. */
export function readN400LangCookie(): N400Lang {
  if (typeof document === 'undefined') return DEFAULT_N400_LANG;
  const raw = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${N400_LANG_COOKIE}=`))
    ?.split('=')[1];
  return isN400Lang(raw) ? raw : DEFAULT_N400_LANG;
}
