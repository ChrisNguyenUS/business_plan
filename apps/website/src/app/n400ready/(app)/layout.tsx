import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { MobileNav, Sidebar } from '@/components/n400/Sidebar';
import { Header } from '@/components/n400/Header';
import { RegisterSW } from '@/components/n400/RegisterSW';
import { LanguageSelectModal } from '@/components/n400/LanguageSelectModal';
import { Suspense } from 'react';
import { getN400Lang, getN400Dict } from '@/lib/n400/i18n/server';
import { N400LangProvider } from '@/lib/n400/i18n/provider';

/**
 * Authenticated app layout — sidebar, header, mobile-nav.
 * Only pages in the (app) route group get this chrome.
 * Also decides whether the first-login language modal must show
 * (ui_language IS NULL — user has never chosen).
 */
export default async function N400AppChromeLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let needsLanguageChoice = false;
  if (user) {
    const { data } = await supabase
      .from('n400_user_profile')
      .select('ui_language')
      .eq('user_id', user.id)
      .maybeSingle();
    needsLanguageChoice = data !== null && data.ui_language === null;
  }

  const lang = await getN400Lang();
  const dict = getN400Dict(lang);

  return (
    <N400LangProvider lang={lang} dict={dict}>
      <div className="flex h-dvh overflow-hidden bg-slate-50 font-sans text-gray-900">
        <RegisterSW />
        {needsLanguageChoice && <LanguageSelectModal />}
        <Sidebar />
        <div className="flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden lg:ml-64">
          <Suspense fallback={<div className="h-16 lg:h-20" />}>
            <Header />
          </Suspense>
          <main className="page-transition relative z-0 flex-1 overflow-y-auto px-4 pb-28 pt-4 sm:px-6 lg:p-8">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </N400LangProvider>
  );
}
