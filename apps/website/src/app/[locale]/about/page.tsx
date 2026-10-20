import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  Clock,
  ExternalLink,
  FileCheck,
  Info,
  MapPin,
  ShieldCheck,
  Stamp,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/seo/alternates";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return { title: d.about_title, description: d.about_mission, alternates: localeAlternates(locale as Locale, "/about") };
}

interface Credential {
  title: string;
  status: string;
  label: string;
  desc: string;
  verify?: string;
}

function credentialIcon(c: Credential) {
  if (c.status === "pending") return Stamp;
  return c.title.includes("EFIN") ? FileCheck : ShieldCheck;
}

function Eyebrow({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p
      className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary ${
        center ? "justify-center" : ""
      }`}
    >
      <span className="h-px w-8 bg-primary/60" aria-hidden="true" />
      {children}
    </p>
  );
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  const credentials = d.about_credential_list as Credential[];
  const areas = d.about_areas.split("·").map((a) => a.trim()).filter(Boolean);

  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center mb-16">
          <div>
            <Eyebrow>{d.about_eyebrow}</Eyebrow>
            <h1 className="mt-4 text-4xl lg:text-5xl font-bold text-charcoal leading-tight">{d.about_title}</h1>
            <p className="mt-3 text-xl font-semibold text-primary">{d.about_tagline}</p>
            <p className="mt-5 max-w-prose text-muted-foreground leading-relaxed">{d.about_mission}</p>

            <h2 className="mt-8 mb-2 text-lg font-bold text-charcoal">{d.about_story_title}</h2>
            <p className="max-w-prose text-muted-foreground leading-relaxed">{d.about_story}</p>

            <div
              role="note"
              className="mt-8 flex gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm leading-relaxed text-amber-900"
            >
              <Info className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              <p>
                <strong className="font-semibold">{d.about_disclosure_title}:</strong> {d.about_disclosure}
              </p>
            </div>
          </div>

          <div className="relative h-80 lg:h-[400px] rounded-2xl overflow-hidden shadow-xl">
            {d.about_photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={d.about_photo} alt={d.about_photo_alt} className="w-full h-full object-cover" />
            ) : (
              <Image
                src="/images/about-consultation.webp"
                alt={d.about_photo_alt}
                fill
                priority
                sizes="(min-width: 1024px) 600px, 100vw"
                className="object-cover"
              />
            )}
          </div>
        </section>

        {/* Service area */}
        <section className="mb-16 rounded-2xl border border-primary/10 bg-teal-light p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-sm">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-primary">{d.about_serving}</p>
          </div>
          <h2 className="mt-4 text-2xl lg:text-3xl font-bold text-charcoal">{d.about_serving_heading}</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground leading-relaxed">{d.about_serving_desc}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {areas.map((area, i) => (
              <li
                key={area}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  i === 0 ? "bg-primary text-white" : "border border-primary/20 bg-white text-charcoal"
                }`}
              >
                {i === 0 && <MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
                {area}
              </li>
            ))}
          </ul>
        </section>

        {/* Credentials */}
        <section className="mb-16">
          <div className="text-center mb-10">
            <Eyebrow center>{d.about_credentials}</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold text-charcoal">{d.about_credentials_heading}</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{d.about_credentials_sub}</p>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">
            {credentials.map((c) => {
              const Icon = credentialIcon(c);
              const pending = c.status === "pending";
              return (
                <li key={c.title} className="flex gap-4 h-full p-6 rounded-2xl bg-white border border-border shadow-sm">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      pending ? "bg-[#F5F7F9] text-muted-foreground" : "bg-teal-light text-primary"
                    }`}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col">
                    <span
                      className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        pending
                          ? "border border-amber-200 bg-amber-50 text-amber-800"
                          : "bg-primary/10 text-teal-dark"
                      }`}
                    >
                      {pending ? (
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {c.label}
                    </span>
                    <h3 className="mt-2 font-bold text-charcoal text-lg leading-snug">{c.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                    {c.verify && (
                      <a
                        href={c.verify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
                      >
                        {d.about_verify}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-primary/20 bg-teal-light overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8 px-6 py-10 sm:px-10">
            <Image
              src="/images/about-cta.webp"
              alt=""
              width={560}
              height={360}
              className="hidden sm:block w-56 lg:w-64 shrink-0 mix-blend-multiply [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_78%)]"
            />
            <div className="flex-1 text-center lg:pr-24">
              <Eyebrow center>{d.about_cta_eyebrow}</Eyebrow>
              <h2 className="mt-3 text-2xl lg:text-3xl font-bold text-charcoal">{d.about_cta_title}</h2>
              <p className="mt-2 text-muted-foreground">{d.about_cta_desc}</p>
              <Link
                href={`/${locale}/contact`}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {d.hero_cta1}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
