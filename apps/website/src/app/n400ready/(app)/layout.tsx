import type { ReactNode } from 'react';
import { MobileNav, Sidebar } from '@/components/n400/Sidebar';
import { Header } from '@/components/n400/Header';
import { RegisterSW } from '@/components/n400/RegisterSW';
import { Suspense } from 'react';

/**
 * Authenticated app layout — sidebar, header, mobile-nav.
 * Only pages in the (app) route group get this chrome.
 */
export default function N400AppChromeLayout({ children }: { children: ReactNode }) {
  return (
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
  );
}
