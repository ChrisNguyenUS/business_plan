import 'server-only';
import { cookies } from 'next/headers';
import { DEFAULT_N400_LANG, N400_LANG_COOKIE, isN400Lang, type N400Lang } from './config';
import { vi, type N400Dict } from './vi';
import { en } from './en';

const DICTS: Record<N400Lang, N400Dict> = { vi, en };

/** Read the app language from the request cookie. No cookie -> 'vi'. */
export async function getN400Lang(): Promise<N400Lang> {
  const store = await cookies();
  const raw = store.get(N400_LANG_COOKIE)?.value;
  return isN400Lang(raw) ? raw : DEFAULT_N400_LANG;
}

export function getN400Dict(lang: N400Lang): N400Dict {
  return DICTS[lang];
}
