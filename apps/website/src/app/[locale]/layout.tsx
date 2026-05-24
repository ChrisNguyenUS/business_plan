import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isValidLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
import "../globals.css";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import MetaPixel from "@/components/analytics/MetaPixel";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FloatingButtons from "@/components/layout/FloatingButtons";
import { ConditionalChrome } from "@/components/layout/ConditionalChrome";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  name: "Manna One Solution",
  url: "https://mannaos.com",
  logo: "https://mannaos.com/images/logo.png",
  telephone: "+13468524454",
  email: "Chris@mannaos.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Bellaire Blvd",
    addressLocality: "Houston",
    addressRegion: "TX",
    postalCode: "77036",
    addressCountry: "US",
  },
  sameAs: ["https://facebook.com/mannaonesolution"],
  areaServed: { "@type": "State", name: "Texas" },
};

export const metadata: Metadata = {
  metadataBase: new URL("https://mannaos.com"),
  title: {
    default: "Manna One Solution — One Stop, All Solutions",
    template: "%s | Manna One Solution",
  },
  description:
    "Bilingual professional services for the Vietnamese community in Houston. Tax, insurance, immigration, and AI automation.",
  openGraph: {
    type: "website",
    siteName: "Manna One Solution",
  },
};

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
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <GoogleAnalytics />
        <MetaPixel />
      </head>
      <body className="min-h-full flex flex-col font-[var(--font-inter)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
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
  );
}
