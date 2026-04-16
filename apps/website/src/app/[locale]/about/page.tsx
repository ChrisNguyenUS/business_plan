import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, FileCheck, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return { title: d.about_title, description: d.about_mission, alternates: { languages: { en: "/en/about", vi: "/vi/about" } } };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);

  const credentials = [
    { icon: ShieldCheck, title: "IRS EFIN #857993", desc: "IRS Electronic Filing Identification Number — authorized for electronic tax filing on behalf of clients." },
    { icon: FileCheck, title: "Texas Life Insurance License #3142469", desc: "State-licensed for life insurance, annuity, and retirement products in Texas." },
    { icon: ShieldCheck, title: "Texas P&C Insurance License #3118525", desc: "State-licensed for property & casualty insurance in Texas. NPN #21024561." },
    { icon: FileCheck, title: "Texas Notary Public (Pending)", desc: "Application in progress with Texas Secretary of State — enables in-house signature witnessing on USCIS forms." },
  ];

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-charcoal mb-6">{d.about_title}</h1>
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-charcoal mb-3">{d.about_mission_title}</h2>
                <p className="text-muted-foreground leading-relaxed">{d.about_mission}</p>
              </div>
              <div>
                <h2 className="text-xl font-bold text-charcoal mb-3">{d.about_story_title}</h2>
                <p className="text-muted-foreground leading-relaxed">{d.about_story}</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <strong>Non-Attorney Disclosure:</strong> For immigration services, we prepare
                USCIS forms at client direction. We are NOT a law firm and do NOT provide legal
                advice. Complex cases (RFEs, denials, inadmissibility) are referred to licensed
                immigration attorneys.
              </div>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src="/images/about.png"
              alt="Manna One Solution Office"
              width={600}
              height={400}
              className="w-full h-80 lg:h-[400px] object-cover"
            />
          </div>
        </div>

        {/* Serving */}
        <div className="text-center mb-20 p-10 rounded-2xl bg-teal-light">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-charcoal">{d.about_serving}</h2>
          </div>
          <p className="text-muted-foreground text-lg">{d.about_areas}</p>
        </div>

        {/* Credentials */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-charcoal text-center mb-10">{d.about_credentials}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {credentials.map((cred, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white border border-border shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-teal-light flex items-center justify-center mb-4">
                  <cred.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-charcoal text-lg mb-2">{cred.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{cred.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-10 rounded-2xl bg-charcoal">
          <h3 className="text-2xl font-bold text-white mb-4">{d.contact_title}</h3>
          <Link href={`/${locale}/contact`}>
            <Button size="lg" className="bg-primary hover:bg-teal-dark text-white rounded-full px-8 gap-2">
              <Calendar className="h-4 w-4" />
              {d.hero_cta1}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
