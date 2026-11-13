import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isValidLocale } from "@/lib/i18n/config";
import { siteJsonLd } from "@/lib/seo/json-ld";
import { SITE_URL } from "@/lib/seo/site";
import { notFound } from "next/navigation";
import "../globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import MetaPixel from "@/components/analytics/MetaPixel";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FloatingButtons from "@/components/layout/FloatingButtons";
import { ConditionalChrome } from "@/components/layout/ConditionalChrome";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { listPostSlugPairs } from "@/lib/blog/queries";
import { postSlugAlternates } from "@/lib/blog/post-locale";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Manna One Solution — One Stop, All Solutions",
    template: "%s | Manna One Solution",
  },
  description:
    "Bilingual professional services for the Vietnamese community in Houston. Immigration, tax & business, AI automation, and insurance & finance.",
  openGraph: {
    type: "website",
    siteName: "Manna One Solution",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "Manna One Solution" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/og-image.png"],
  },
};

// Safety net only. Admin saves (Content, Blog) refresh pages on demand via
// revalidatePath, so this can stay long. 30s here regenerated every visited page
// twice a minute and blew through Vercel's ISR write quota (255k/30 days).
export const revalidate = 86400;

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
  // Lets the language toggle on a blog post link straight to the post's other-language slug.
  const postSlugs = postSlugAlternates(await listPostSlugPairs().catch(() => []));

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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <AuthProvider>
          <ConditionalChrome
            navbar={<Navbar dictionary={dictionary} locale={locale as Locale} postSlugs={postSlugs} />}
            footer={<Footer dictionary={dictionary} locale={locale as Locale} />}
            floating={
              <FloatingButtons
                labels={{
                  menu: dictionary.contact_menu,
                  close: dictionary.contact_menu_close,
                  zalo: dictionary.contact_zalo,
                  messenger: dictionary.contact_messenger,
                  call: dictionary.contact_phone_label,
                }}
              />
            }
          >
            {children}
          </ConditionalChrome>
        </AuthProvider>
        {/* Vercel Analytics — auto-detects production deploys; no-op on
            preview/dev unless VERCEL_ANALYTICS_DEBUG is set. */}
        <Analytics />
        {/* Speed Insights captures real-user CWV (LCP, CLS, INP) for
            CWV-alert dashboards. Same env gating as Analytics. */}
        <SpeedInsights />
      </body>
    </html>
  );
}
