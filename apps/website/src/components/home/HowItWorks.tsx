import { Phone, MessageSquare, UserCheck } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

interface HowItWorksProps {
  dictionary: Dictionary;
}

export default function HowItWorks({ dictionary }: HowItWorksProps) {
  const steps = [
    { icon: Phone, num: "1", title: dictionary.how_step1_title, desc: dictionary.how_step1_desc },
    { icon: MessageSquare, num: "2", title: dictionary.how_step2_title, desc: dictionary.how_step2_desc },
    { icon: UserCheck, num: "3", title: dictionary.how_step3_title, desc: dictionary.how_step3_desc },
  ];

  return (
    <section className="py-20 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl lg:text-4xl font-bold text-charcoal text-center mb-14">
          {dictionary.how_title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-primary/20" />
              )}
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 relative">
                <step.icon className="h-8 w-8 text-primary" />
                <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  {step.num}
                </span>
              </div>
              <h3 className="font-bold text-charcoal text-lg mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
