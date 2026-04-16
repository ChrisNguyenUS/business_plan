import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

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
        {children}
      </body>
    </html>
  );
}
