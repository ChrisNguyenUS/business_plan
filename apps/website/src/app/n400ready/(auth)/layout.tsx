import type { ReactNode } from 'react';
import { getN400Dict, getN400Lang } from '@/lib/n400/i18n/server';
import { N400LangProvider } from '@/lib/n400/i18n/provider';

/**
 * N400 auth layout — completely standalone (no sidebar, header, or mobile-nav).
 * Login / signup pages render full-viewport with their own backgrounds.
 */
export default async function N400AuthLayout({ children }: { children: ReactNode }) {
  const lang = await getN400Lang();
  return (
    <N400LangProvider lang={lang} dict={getN400Dict(lang)}>
      {children}
    </N400LangProvider>
  );
}
