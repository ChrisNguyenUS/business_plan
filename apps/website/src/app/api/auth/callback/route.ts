import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType, SupabaseClient, User } from '@supabase/supabase-js';
import { ATTRIB_COOKIE, parseAttributionCookie } from '@/lib/n400/growth/attribution';

// Auth callback: exchanges the provider/PKCE code for a session cookie,
// then bootstraps the avatar on first login. Email links (password recovery)
// may instead carry ?token_hash=&type= — verified server-side, so they work
// even when opened in a different browser/device than the one that asked. The profile row itself is
// created by the handle_new_user_v2 DB trigger — not here.

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// Provider avatars are small; anything bigger is not a profile picture.
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

async function bootstrapAvatar(supabase: SupabaseClient, user: User) {
  const providerAvatarUrl =
    user.user_metadata?.avatar_url || user.user_metadata?.picture;
  if (!providerAvatarUrl || typeof providerAvatarUrl !== 'string') return;

  // First login only — never overwrite an existing avatar. The profile
  // is application-owned after initialization.
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_path')
    .eq('id', user.id)
    .single();
  if (!profile || profile.avatar_path) return;

  const res = await fetch(providerAvatarUrl);
  if (!res.ok) return;

  const contentType = res.headers.get('content-type')?.split(';')[0].trim() ?? '';
  const ext = CONTENT_TYPE_TO_EXT[contentType];
  if (!ext) return;

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_AVATAR_BYTES) return;

  const avatarPath = `${user.id}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(avatarPath, buffer, { contentType, upsert: true });
  if (uploadError) return;

  await supabase
    .from('profiles')
    .update({ avatar_path: avatarPath })
    .eq('id', user.id);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const otpType = searchParams.get('type') as EmailOtpType | null;
  // Post-login destination; middleware runs the n400_user_profile setup
  // gate on top of this.
  const next = searchParams.get('next') ?? '/n400ready';
  // Only allow same-origin relative redirects.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/n400ready';
  // Failures go back to the sign-in page of the app the flow started from.
  const loginPath = safeNext.startsWith('/n400ready') ? '/n400ready/login' : '/login';

  if (!code && !(tokenHash && otpType)) {
    return NextResponse.redirect(`${origin}${loginPath}?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } =
    tokenHash && otpType
      ? await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash })
      : await supabase.auth.exchangeCodeForSession(code!);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}${loginPath}?error=auth_callback_failed`);
  }

  // Avatar bootstrap must NEVER block authentication — any failure here
  // just leaves avatar_path NULL and the UI renders initials instead.
  try {
    await bootstrapAvatar(supabase, data.user);
  } catch {
    // Swallow intentionally; auth already succeeded.
  }

  // Growth attribution: copy the first-party touch cookie into the lead
  // profile. First touch is written once (RPC keeps existing non-null value);
  // last touch always updates. Must never block authentication.
  try {
    const attrib = parseAttributionCookie(request.cookies.get(ATTRIB_COOKIE)?.value);
    if (attrib) {
      await supabase.rpc('n400_set_attribution', {
        p_first: attrib.first,
        p_last: attrib.last,
      });
    }
  } catch {
    // Swallow intentionally; auth already succeeded.
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
