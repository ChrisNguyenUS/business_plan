import { Globe, ShieldCheck, Award, Stamp } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

interface WhyMannaProps {
  dictionary: Dictionary;
}

export default function WhyManna({ dictionary }: WhyMannaProps) {
  const badges = [
    { icon: Globe, title: dictionary.why_bilingual, desc: dictionary.why_bilingual_desc },
    { icon: ShieldCheck, title: dictionary.why_efin, desc: dictionary.why_efin_desc },
    { icon: Award, title: dictionary.why_insurance_license, desc: dictionary.why_insurance_license_desc },
    { icon: Stamp, title: dictionary.why_ai, desc: dictionary.why_ai_desc },
  ];

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl lg:text-4xl font-bold text-charcoal text-center mb-14">
          {dictionary.why_title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {badges.map((b, i) => (
            <div
              key={i}
              className="text-center p-6 rounded-2xl bg-teal-light border border-primary/10"
            >
              <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center mx-auto mb-4 shadow-sm">
                <b.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-bold text-charcoal text-sm mb-2">{b.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
