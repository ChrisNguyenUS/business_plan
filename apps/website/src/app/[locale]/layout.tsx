import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isValidLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FloatingButtons from "@/components/layout/FloatingButtons";
import { ConditionalChrome } from "@/components/layout/ConditionalChrome";
import { AuthProvider } from "@/components/providers/AuthProvider";

export const revalidate = 30;

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "vi" }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <>
      <html lang={locale} suppressHydrationWarning>
        <body>
          <AuthProvider>
            <ConditionalChrome
              navbar={<Navbar dictionary={dictionary} locale={locale as Locale} />}
              footer={<Footer dictionary={dictionary} locale={locale as Locale} />}
              floating={<FloatingButtons />}
            >
              {children}
            </ConditionalChrome>
          </AuthProvider>
        </body>
      </html>
    </>
  );
}
