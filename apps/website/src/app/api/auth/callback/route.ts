import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

// OAuth callback: exchanges the provider code for a session cookie,
// then bootstraps the avatar on first login. The profile row itself is
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
  // Post-login destination; middleware runs the n400_user_profile setup
  // gate on top of this.
  const next = searchParams.get('next') ?? '/n400ready';
  // Only allow same-origin relative redirects.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/n400ready';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // Avatar bootstrap must NEVER block authentication — any failure here
  // just leaves avatar_path NULL and the UI renders initials instead.
  try {
    await bootstrapAvatar(supabase, data.user);
  } catch {
    // Swallow intentionally; auth already succeeded.
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
