import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { locales, defaultLocale } from '@/lib/i18n/config';
import { N400_LANG_COOKIE, N400_LANG_COOKIE_MAX_AGE, isN400Lang } from '@/lib/n400/i18n/config';

const SKIP_PREFIXES = ['/_next', '/api', '/images', '/n400-audio'];
const SKIP_EXACT = ['/favicon.ico', '/robots.txt', '/sitemap.xml', '/llms.txt'];
const ADMIN_RE = /^\/[a-z]{2}\/admin(\/|$)/;
const PORTAL_RE = /^\/[a-z]{2}\/portal(\/|$)/;
// N400 app lives at /n400ready — no locale segment (language is cookie-based).
const N400_RE = /^\/n400ready(\/|$)/;
// Auth pages inside /n400ready that must be accessible without a session.
const N400_PUBLIC_RE = /^\/n400ready\/login(\/|$)/;
// Routes that signed-in users can hit before completing /setup. /setup itself
// would loop without this exemption; /help is informational and can render
// without a profile row.
const N400_NO_PROFILE_GATE_RE = /^\/n400ready\/(setup|help|login)(\/|$)/;
// Old bookmarked URLs from the /{locale}/n400app era.
const N400_LEGACY_RE = /^\/(?:en|vi)\/n400app(\/.*)?$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    SKIP_PREFIXES.some((p) => pathname.startsWith(p)) ||
    SKIP_EXACT.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // ── N400 URL canonicalization ──
  // Legacy /{en|vi}/n400app/* bookmarks → /n400ready/* (permanent).
  const legacyMatch = pathname.match(N400_LEGACY_RE);
  if (legacyMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/n400ready${legacyMatch[1] ?? ''}`;
    return NextResponse.redirect(url, 308);
  }
  // /N400Ready (any casing) → /n400ready, preserving the rest of the path.
  const firstSegment = pathname.split('/')[1];
  if (firstSegment && firstSegment !== 'n400ready' && firstSegment.toLowerCase() === 'n400ready') {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(firstSegment, 'n400ready');
    return NextResponse.redirect(url, 308);
  }

  // ── Step 1: i18n — redirect to locale-prefixed path if missing ──
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale && !N400_RE.test(pathname)) {
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
      return NextResponse.redirect(new URL('/n400ready/login', request.url));
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
    return NextResponse.redirect(new URL('/n400ready/login', request.url));
  }

  // N400 profile gate: redirect to /setup when no n400_user_profile row exists,
  // unless the user is already on /setup or /help (those render without a profile).
  if (isN400Path && !N400_NO_PROFILE_GATE_RE.test(pathname)) {
    const { data: n400Profile } = await supabase
      .from('n400_user_profile')
      .select('user_id, ui_language')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!n400Profile) {
      return NextResponse.redirect(new URL('/n400ready/setup', request.url));
    }
    // DB is the source of truth once chosen — heal the cookie (new device,
    // cleared cookies). Takes effect from the next request; the action that
    // changes language sets the cookie directly so in-app switches are instant.
    const dbLang = n400Profile.ui_language;
    if (isN400Lang(dbLang) && request.cookies.get(N400_LANG_COOKIE)?.value !== dbLang) {
      supabaseResponse.cookies.set(N400_LANG_COOKIE, dbLang, {
        path: '/',
        maxAge: N400_LANG_COOKIE_MAX_AGE,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
  }

  supabaseResponse.headers.set('x-user-role', role ?? '');
  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next|api|images|n400-audio|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)'],
};
