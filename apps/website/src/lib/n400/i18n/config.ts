// Central language registry for the N400 app. Adding a language later
// (e.g. 'es') = add here + extend the DB CHECK + add its dictionary file.
export const N400_LANGUAGES = ['vi', 'en'] as const;
export type N400Lang = (typeof N400_LANGUAGES)[number];
export const DEFAULT_N400_LANG: N400Lang = 'vi';
export const N400_LANG_COOKIE = 'n400_lang';
export const N400_LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function isN400Lang(value: unknown): value is N400Lang {
  return typeof value === 'string' && (N400_LANGUAGES as readonly string[]).includes(value);
}
