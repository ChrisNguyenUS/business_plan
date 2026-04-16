const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const TAX_IMG = "https://media.db.com/images/public/69dafd73d99166d00ad6b65b/0d56c73a5_generated_ba8449f9.png";
const INSURANCE_IMG = "https://media.db.com/images/public/69dafd73d99166d00ad6b65b/d2abc084d_generated_b2aa71ce.png";
const IMMIGRATION_IMG = "https://media.db.com/images/public/69dafd73d99166d00ad6b65b/eaa644f85_generated_ecbde11c.png";
const AI_IMG = "https://media.db.com/images/public/69dafd73d99166d00ad6b65b/a1174e074_generated_8b65ed79.png";

export default function ServicesOverview({ t }) {
  const services = [
    { key: 'tax', img: TAX_IMG, title: t('services_tax_title'), desc: t('services_tax_desc'), link: '/services/tax' },
    { key: 'insurance', img: INSURANCE_IMG, title: t('services_insurance_title'), desc: t('services_insurance_desc'), link: '/services/insurance' },
    { key: 'immigration', img: IMMIGRATION_IMG, title: t('services_immigration_title'), desc: t('services_immigration_desc'), link: '/services/immigration' },
    { key: 'ai', img: AI_IMG, title: t('services_ai_title'), desc: t('services_ai_desc'), link: '/services/ai' },
  ];

  return (
    <section className="py-20 lg:py-28 bg-teal-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl lg:text-4xl font-bold text-charcoal mb-3">{t('services_title')}</h2>
          <p className="text-muted-foreground text-lg">{t('services_subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s) => (
            <Link
              key={s.key}
              to={s.link}
              className="group bg-white rounded-2xl p-6 border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden mb-5 bg-teal-light p-1">
                <img src={s.img} alt={s.title} className="w-full h-full object-cover rounded-lg" />
              </div>
              <h3 className="font-bold text-charcoal text-lg mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{s.desc}</p>
              <div className="flex items-center gap-1 text-primary text-sm font-semibold group-hover:gap-2 transition-all">
                {t('services_learn_more')}
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}