// Pure middleware decisions for anonymous N400 Ready traffic (spec §6).
// Only the app root goes to the public landing page; every other app path
// still needs a session and goes to the login form.
import { isN400Lang, type N400Lang } from '../i18n/config';

const ROOT_RE = /^\/n400ready\/?$/;
const LOGIN_RE = /^\/n400ready\/login\/?$/;

export function anonN400Destination(pathname: string, cookieLang: string | undefined, acceptLanguage: string): string {
  if (!ROOT_RE.test(pathname)) return '/n400ready/login';
  const lang: N400Lang = isN400Lang(cookieLang) ? cookieLang : acceptLanguage.toLowerCase().includes('vi') ? 'vi' : 'en';
  return `/${lang}/n400ready`;
}

/** `/n400ready/login?lang=en` from a public page: store the language, drop the param. */
export function loginLangSwitch(pathname: string, search: URLSearchParams): { lang: N400Lang; search: string } | null {
  if (!LOGIN_RE.test(pathname)) return null;
  const lang = search.get('lang');
  if (!isN400Lang(lang)) return null;
  const rest = new URLSearchParams(search);
  rest.delete('lang');
  const q = rest.toString();
  return { lang, search: q ? `?${q}` : '' };
}
