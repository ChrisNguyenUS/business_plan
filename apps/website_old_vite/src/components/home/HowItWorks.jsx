import { PhoneCall, Users, CheckCircle } from 'lucide-react';

export default function HowItWorks({ t }) {
  const steps = [
    { num: "01", icon: PhoneCall, title: t('how_step1_title'), desc: t('how_step1_desc') },
    { num: "02", icon: Users, title: t('how_step2_title'), desc: t('how_step2_desc') },
    { num: "03", icon: CheckCircle, title: t('how_step3_title'), desc: t('how_step3_desc') },
  ];

  return (
    <section className="py-20 lg:py-28 bg-teal-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl lg:text-4xl font-bold text-charcoal mb-3">{t('how_title')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <div key={i} className="relative text-center">
              <div className="text-6xl font-extrabold text-primary/10 mb-2">{step.num}</div>
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-charcoal text-xl mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 right-0 translate-x-1/2 w-16 border-t-2 border-dashed border-primary/20" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}