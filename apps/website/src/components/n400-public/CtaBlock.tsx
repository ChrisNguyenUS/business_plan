import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import { PUBLIC_COPY, ctaHref } from '@/lib/n400/public/copy';

export function CtaBlock({ locale, title }: { locale: Locale; title?: string }) {
  const c = PUBLIC_COPY[locale];
  return (
    <div className="rounded-2xl bg-charcoal p-8 text-center">
      {title && <h2 className="text-xl font-bold text-white mb-6">{title}</h2>}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href={ctaHref(locale)} className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark">
          {c.ctaPrimary}
        </Link>
        <Link href={ctaHref(locale)} className="rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
          {c.ctaSecondary}
        </Link>
      </div>
    </div>
  );
}
