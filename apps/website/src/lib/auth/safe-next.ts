/** A post-auth destination is honored only if it is a path on this site. */
export function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  return raw;
}
