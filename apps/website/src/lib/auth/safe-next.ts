/** A post-auth destination is honored only if it is a path on this site. */
export function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/')) return null;
  // The URL parser strips tab/newline and treats "\" as "/", so "/\t/evil.com"
  // would become "//evil.com" after this check: refuse them outright.
  if (/[\u0000-\u001F\u007F\\]/.test(raw)) return null;
  if (raw.startsWith('//')) return null;
  return raw;
}
