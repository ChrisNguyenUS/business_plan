const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useOutletContext, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

const TAX_IMG = "https://media.db.com/images/public/69dafd73d99166d00ad6b65b/0d56c73a5_generated_ba8449f9.png";
const INSURANCE_IMG = "https://media.db.com/images/public/69dafd73d99166d00ad6b65b/d2abc084d_generated_b2aa71ce.png";
const IMMIGRATION_IMG = "https://media.db.com/images/public/69dafd73d99166d00ad6b65b/eaa644f85_generated_ecbde11c.png";
const AI_IMG = "https://media.db.com/images/public/69dafd73d99166d00ad6b65b/a1174e074_generated_8b65ed79.png";

export default function Services() {
  const { t } = useOutletContext();

  const services = [
    { 
      key: 'tax', img: TAX_IMG, title: t('services_tax_title'), 
      desc: t('services_tax_desc'), link: '/services/tax',
      pricing: '$50 – $800'
    },
    { 
      key: 'insurance', img: INSURANCE_IMG, title: t('services_insurance_title'), 
      desc: t('services_insurance_desc'), link: '/services/insurance',
      pricing: 'Free Consultation'
    },
    { 
      key: 'immigration', img: IMMIGRATION_IMG, title: t('services_immigration_title'), 
      desc: t('services_immigration_desc'), link: '/services/immigration',
      pricing: 'Case-Based'
    },
    { 
      key: 'ai', img: AI_IMG, title: t('services_ai_title'), 
      desc: t('services_ai_desc'), link: '/services/ai',
      pricing: 'Custom Pricing'
    },
  ];

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl lg:text-5xl font-bold text-charcoal mb-3">{t('services_page_title')}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t('services_page_subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((s) => (
            <div key={s.key} className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group">
              <div className="p-8 flex gap-6">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-teal-light p-2 shrink-0">
                  <img src={s.img} alt={s.title} className="w-full h-full object-cover rounded-lg" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-charcoal mb-2">{s.title}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-3">{s.desc}</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-teal-light text-primary text-xs font-semibold mb-4">
                    {s.pricing}
                  </div>
                  <div className="flex gap-3">
                    <Link to={s.link}>
                      <Button size="sm" variant="outline" className="rounded-full gap-1 text-sm">
                        {t('services_learn_more')}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Link to="/contact">
                      <Button size="sm" className="rounded-full bg-primary hover:bg-teal-dark text-white text-sm">
                        {t('services_cta')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}