// Covers render through next/image, which throws for a host missing from
// images.remotePatterns in next.config.ts, and the CSP img-src would block
// one anyway. Allowed: a path on this site, or a public file in the project's
// Supabase Storage (the host next.config.ts lists; a test keeps them in step).
const STORAGE_HOST = "ffsrlmtqzlidnuitkdvw.supabase.co";
const STORAGE_PUBLIC_PATH = "/storage/v1/object/public/";

export function isAllowedCoverUrl(url: string): boolean {
  const value = url.trim();
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === STORAGE_HOST &&
      parsed.pathname.startsWith(STORAGE_PUBLIC_PATH)
    );
  } catch {
    return false;
  }
}
