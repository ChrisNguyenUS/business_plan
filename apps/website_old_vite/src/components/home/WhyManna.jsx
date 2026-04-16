import { Globe, ShieldCheck, FileCheck, Cpu } from 'lucide-react';

export default function WhyManna({ t }) {
  const points = [
    { icon: Globe, title: t('why_bilingual'), desc: t('why_bilingual_desc') },
    { icon: ShieldCheck, title: t('why_efin'), desc: t('why_efin_desc') },
    { icon: FileCheck, title: t('why_insurance_license'), desc: t('why_insurance_license_desc') },
    { icon: Cpu, title: t('why_ai'), desc: t('why_ai_desc') },
  ];

  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl lg:text-4xl font-bold text-charcoal mb-3">{t('why_title')}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {points.map((p, i) => (
            <div key={i} className="text-center group">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-teal-light flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <p.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-bold text-charcoal text-lg mb-2">{p.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}