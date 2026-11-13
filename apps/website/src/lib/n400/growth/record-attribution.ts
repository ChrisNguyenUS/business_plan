// Email sign-up and sign-in happen in the browser and never reach
// /api/auth/callback (email confirmation is off in Supabase), so the
// first-party touch cookie is copied into the lead profile from here, with
// the same RPC the callback uses for OAuth. Attribution must never block
// signing in: the call never throws and waits at most `timeoutMs`.
import { ATTRIB_COOKIE, parseAttributionCookie, type TouchData } from './attribution';

type AttributionRpc = {
  rpc: (
    fn: 'n400_set_attribution',
    args: { p_first: TouchData; p_last: TouchData },
  ) => PromiseLike<unknown>;
};

/** Reads one cookie from a `document.cookie` string, decoded. */
export function readCookie(cookieString: string, name: string): string | undefined {
  for (const part of cookieString.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1 || part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function recordAttribution(
  supabase: AttributionRpc,
  cookieString: string,
  timeoutMs = 1500,
): Promise<void> {
  const attrib = parseAttributionCookie(readCookie(cookieString, ATTRIB_COOKIE));
  if (!attrib) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      supabase.rpc('n400_set_attribution', { p_first: attrib.first, p_last: attrib.last }),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, timeoutMs);
      }),
    ]);
  } catch {
    // Swallow intentionally: the user is already signed in.
  } finally {
    clearTimeout(timer);
  }
}
