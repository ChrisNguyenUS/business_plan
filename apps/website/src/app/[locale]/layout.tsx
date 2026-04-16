import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isValidLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FloatingButtons from "@/components/layout/FloatingButtons";
import { AuthProvider } from "@/components/providers/AuthProvider";

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
            <div className="min-h-screen flex flex-col">
              <Navbar dictionary={dictionary} locale={locale as Locale} />
              <main className="flex-1 pt-16 lg:pt-20">{children}</main>
              <Footer dictionary={dictionary} locale={locale as Locale} />
              <FloatingButtons />
            </div>
          </AuthProvider>
        </body>
      </html>
    </>
  );
}
