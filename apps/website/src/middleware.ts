import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { locales, defaultLocale } from '@/lib/i18n/config';

const SKIP_PREFIXES = ['/_next', '/api', '/images'];
const SKIP_EXACT = ['/favicon.ico', '/robots.txt', '/sitemap.xml', '/llms.txt'];
const ADMIN_RE = /^\/[a-z]{2}\/admin(\/|$)/;
const PORTAL_RE = /^\/[a-z]{2}\/portal(\/|$)/;

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

  // ── Step 2: Auth guard — only /admin and /portal need protection ──
  const isAdminPath = ADMIN_RE.test(pathname);
  const isPortalPath = PORTAL_RE.test(pathname);

  if (!isAdminPath && !isPortalPath) {
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

  supabaseResponse.headers.set('x-user-role', role ?? '');
  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next|api|images|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)'],
};
