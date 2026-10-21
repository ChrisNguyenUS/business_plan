import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import type { ServiceCategory } from "@/lib/services/categories";

interface ServiceCategoryCardProps {
  category: ServiceCategory;
  exploreLabel: string;
  /** Optional secondary action, e.g. Book Appointment on the Services page. */
  secondary?: { label: string; href: string };
  headingLevel?: "h2" | "h3";
  /** Load the image eagerly (first row above the fold). */
  eager?: boolean;
}

// One card per top-level service category. The primary link is stretched over
// the whole card; the optional secondary link sits above it so both stay clickable.
export default function ServiceCategoryCard({
  category: c,
  exploreLabel,
  secondary,
  headingLevel = "h3",
  eager = false,
}: ServiceCategoryCardProps) {
  const Heading = headingLevel;
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-border shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-[translate,box-shadow,border-color] duration-200 ease-out focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <div className="relative aspect-[16/9] bg-[#FAF6F1]">
        <Image
          src={c.img}
          alt=""
          fill
          loading={eager ? "eager" : "lazy"}
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <Heading className="font-bold text-charcoal text-lg mb-2">{c.title}</Heading>
        <p className="text-muted-foreground text-[15px] leading-relaxed mb-5">{c.desc}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href={c.href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary focus-visible:outline-none after:absolute after:inset-0 after:content-['']"
          >
            {exploreLabel}
            <span className="sr-only">: {c.title}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          {secondary && (
            <Link
              href={secondary.href}
              className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-charcoal hover:border-primary hover:text-primary transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
