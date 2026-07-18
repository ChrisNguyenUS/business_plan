import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import '../globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import MetaPixel from '@/components/analytics/MetaPixel';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { getN400Lang } from '@/lib/n400/i18n/server';
import { N400UserStateProvider } from '@/lib/n400/user-state';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mannaos.com'),
  title: {
    default: 'N400 Ready',
    template: '%s | N400 Ready',
  },
  description:
    'Luyện thi quốc tịch Mỹ N-400 — Civics, Speaking, Writing. Manna One Solution.',
};

/**
 * Root layout for the /n400ready segment. The app lives OUTSIDE the
 * [locale] tree, so it carries its own <html>/<body> shell, auth provider,
 * and analytics (mirroring [locale]/layout.tsx). lang follows the
 * n400_lang cookie.
 */
export default async function N400ReadyRootLayout({ children }: { children: ReactNode }) {
  const lang = await getN400Lang();
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <GoogleAnalytics />
        <MetaPixel />
      </head>
      <body className="min-h-full flex flex-col font-[var(--font-inter)]">
        <AuthProvider>
          <N400UserStateProvider>
            {children}
          </N400UserStateProvider>
        </AuthProvider>
        {/* Vercel Analytics — auto-detects production deploys; no-op on
            preview/dev unless VERCEL_ANALYTICS_DEBUG is set. */}
        <Analytics />
        {/* Speed Insights captures real-user CWV (LCP, CLS, INP). */}
        <SpeedInsights />
      </body>
    </html>
  );
}
