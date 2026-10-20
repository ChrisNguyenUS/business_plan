import * as LucideIcons from "lucide-react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

interface WhyMannaProps {
  dictionary: Dictionary;
}

interface BadgeItem {
  id?: string;
  icon?: string;
  title: string;
  desc: string;
}

type LucideIconMap = Record<string, LucideIcons.LucideIcon>;

// Badges from the admin editor have no icon; give the known three a fitting one by position.
const FALLBACK_ICONS = ["MessagesSquare", "FileCheck", "ShieldCheck"];

export default function WhyManna({ dictionary }: WhyMannaProps) {
  // Only verified credentials. The notary badge returns once the commission number is issued.
  const defaultBadges: BadgeItem[] = [
    { icon: "MessagesSquare", title: dictionary.why_bilingual, desc: dictionary.why_bilingual_desc },
    { icon: "FileCheck", title: dictionary.why_efin, desc: dictionary.why_efin_desc },
    { icon: "ShieldCheck", title: dictionary.why_insurance_license, desc: dictionary.why_insurance_license_desc },
  ];

  const badges = Array.isArray(dictionary.trust_badges) && dictionary.trust_badges.length > 0
    ? dictionary.trust_badges
    : defaultBadges;

  return (
    <section className="py-16 lg:py-20 bg-teal-light/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl lg:text-4xl font-bold text-charcoal text-center mb-10 lg:mb-12">
          {dictionary.why_title}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {badges.map((b: BadgeItem, i) => {
            const iconKey = b.icon ?? FALLBACK_ICONS[i] ?? "CheckCircle";
            const IconComponent = (LucideIcons as unknown as LucideIconMap)[iconKey] || LucideIcons.CheckCircle;
            return (
              <div key={b.id || i} className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-primary/10 shadow-sm">
                <div className="w-14 h-14 shrink-0 rounded-xl bg-teal-light flex items-center justify-center">
                  <IconComponent className="h-7 w-7 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-charcoal text-base mb-1">{b.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
