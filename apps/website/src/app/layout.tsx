import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[var(--font-inter)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
