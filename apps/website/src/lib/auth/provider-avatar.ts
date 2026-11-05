// Downloads an OAuth provider's profile picture for the auth callback.
//
// The URL comes from user_metadata (avatar_url / picture), and a user can
// rewrite user_metadata with supabase.auth.updateUser({ data }). So it is
// untrusted input to a server-side fetch (SSRF): only https URLs on the
// Google and Facebook image hosts are requested, redirects are followed by
// hand and re-checked, the whole download has a time limit, and the body is
// capped before and after it is read.

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 5000;

// Google: lh3.googleusercontent.com and siblings. Facebook: platform-lookaside,
// which may redirect to an fbcdn.net CDN host.
const ALLOWED_HOSTS = new Set(["platform-lookaside.fbsbx.com"]);
const ALLOWED_HOST_SUFFIXES = [".googleusercontent.com", ".fbcdn.net"];

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export interface ProviderAvatar {
  bytes: ArrayBuffer;
  contentType: string;
  ext: string;
}

export function isAllowedAvatarUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_HOSTS.has(host) || ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/** Returns the image, or null for anything not worth storing as an avatar. */
export async function fetchProviderAvatar(
  raw: unknown,
  fetchImpl: typeof fetch = fetch
): Promise<ProviderAvatar | null> {
  if (typeof raw !== "string") return null;
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = raw;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedAvatarUrl(url)) return null;
    const res = await fetchImpl(url, { redirect: "manual", signal });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      url = new URL(location, url).toString();
      continue;
    }
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    const ext = CONTENT_TYPE_TO_EXT[contentType];
    if (!ext) return null;
    if (Number(res.headers.get("content-length")) > MAX_AVATAR_BYTES) return null;

    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_AVATAR_BYTES) return null;
    return { bytes, contentType, ext };
  }
  return null;
}
