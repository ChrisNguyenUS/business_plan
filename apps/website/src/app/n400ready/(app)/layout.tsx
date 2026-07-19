import type { ReactNode } from 'react';
import { MobileNav, Sidebar } from '@/components/n400/Sidebar';
import { Header } from '@/components/n400/Header';
import { RegisterSW } from '@/components/n400/RegisterSW';
import { Suspense } from 'react';
import { getN400Lang, getN400Dict } from '@/lib/n400/i18n/server';
import { N400LangProvider } from '@/lib/n400/i18n/provider';

/**
 * Authenticated app layout — sidebar, header, mobile-nav.
 * Only pages in the (app) route group get this chrome.
 *
 * Language is no longer chosen here: onboarding step 1
 * (/n400ready/onboarding) owns that, gated by middleware on the absence of an
 * n400_user_profile row.
 */
export default async function N400AppChromeLayout({ children }: { children: ReactNode }) {
  const lang = await getN400Lang();
  const dict = getN400Dict(lang);

  return (
    <N400LangProvider lang={lang} dict={dict}>
      <div className="flex h-dvh overflow-hidden bg-slate-50 font-sans text-gray-900">
        <RegisterSW />
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
