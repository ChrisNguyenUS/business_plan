import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Manna One Solution — One Stop, All Solutions",
  description:
    "Bilingual Vietnamese-English services: Tax, Insurance, Immigration, AI. Houston, TX.",
};

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <html lang={params.locale} className={inter.variable}>
      <body className="bg-navy-900 text-text-secondary antialiased">{children}</body>
    </html>
  );
}
