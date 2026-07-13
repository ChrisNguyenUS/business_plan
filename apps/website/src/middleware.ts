import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { locales, defaultLocale } from '@/lib/i18n/config';

const SKIP_PREFIXES = ['/_next', '/api', '/images', '/n400-audio'];
const SKIP_EXACT = ['/favicon.ico', '/robots.txt', '/sitemap.xml', '/llms.txt'];
const ADMIN_RE = /^\/[a-z]{2}\/admin(\/|$)/;
const PORTAL_RE = /^\/[a-z]{2}\/portal(\/|$)/;
const N400_RE = /^\/[a-z]{2}\/n400app(\/|$)/;
// Auth pages inside /n400app that must be accessible without a session.
const N400_PUBLIC_RE = /^\/[a-z]{2}\/n400app\/login(\/|$)/;
// Routes that signed-in users can hit before completing /setup. /setup itself
// would loop without this exemption; /help is informational and can render
// without a profile row.
const N400_NO_PROFILE_GATE_RE = /^\/[a-z]{2}\/n400app\/(setup|help|login)(\/|$)/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    SKIP_PREFIXES.some((p) => pathname.startsWith(p)) ||
    SKIP_EXACT.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // ── Step 1: i18n — redirect to locale-prefixed path if missing ──
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    const acceptLanguage = request.headers.get('accept-language') || '';
    const preferredLocale = acceptLanguage.toLowerCase().includes('vi') ? 'vi' : defaultLocale;
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    const locale =
      cookieLocale && locales.includes(cookieLocale as (typeof locales)[number])
        ? cookieLocale
        : preferredLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // TEMP-PREVIEW-BYPASS: remove before commit
  if (process.env.NODE_ENV === 'development' && N400_RE.test(pathname)) {
    return NextResponse.next();
  }

  // ── Step 2: Auth guard — /admin, /portal, /n400app need protection ──
  const isAdminPath = ADMIN_RE.test(pathname);
  const isPortalPath = PORTAL_RE.test(pathname);
  const isN400Path = N400_RE.test(pathname);
  const isN400Public = N400_PUBLIC_RE.test(pathname);

  // N400 public pages (e.g. /n400app/login) skip auth entirely.
  if (isN400Public) {
    return NextResponse.next();
  }

  if (!isAdminPath && !isPortalPath && !isN400Path) {
    return NextResponse.next();
  }

  const locale = pathname.split('/')[1];

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isN400Path) {
      return NextResponse.redirect(new URL(`/${locale}/n400app/login`, request.url));
    }
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role as string | undefined;

  // Admin paths: only allow 'admin' role
  if (isAdminPath && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // Portal paths: allow 'client' role; admins may also access portal
  if (isPortalPath && role !== 'client' && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // N400 paths: any signed-in user (client or admin). Anonymous already redirected above.
  if (isN400Path && role !== 'client' && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${locale}/n400app/login`, request.url));
  }

  // N400 profile gate: redirect to /setup when no n400_user_profile row exists,
  // unless the user is already on /setup or /help (those render without a profile).
  if (isN400Path && !N400_NO_PROFILE_GATE_RE.test(pathname)) {
    const { data: n400Profile } = await supabase
      .from('n400_user_profile')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!n400Profile) {
      return NextResponse.redirect(new URL(`/${locale}/n400app/setup`, request.url));
    }
  }

  supabaseResponse.headers.set('x-user-role', role ?? '');
  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next|api|images|n400-audio|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)'],
};
