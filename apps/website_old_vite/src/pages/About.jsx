const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileCheck, MapPin, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";

const ABOUT_IMG = "https://media.db.com/images/public/69dafd73d99166d00ad6b65b/c0a13c9eb_generated_2bccc46f.png";

export default function About() {
  const { t } = useOutletContext();

  const credentials = [
    { icon: ShieldCheck, title: 'IRS EFIN #857993', desc: 'IRS Electronic Filing Identification Number — authorized for electronic tax filing on behalf of clients.' },
    { icon: FileCheck, title: 'Texas Life Insurance License #3142469', desc: 'State-licensed for life insurance, annuity, and retirement products in Texas.' },
    { icon: ShieldCheck, title: 'Texas P&C Insurance License #3118525', desc: 'State-licensed for property & casualty insurance in Texas. NPN #21024561.' },
    { icon: FileCheck, title: 'Texas Notary Public (Pending)', desc: 'Application in progress with Texas Secretary of State — enables in-house signature witnessing on USCIS forms.' },
  ];

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-charcoal mb-6">{t('about_title')}</h1>
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-charcoal mb-3">{t('about_mission_title')}</h2>
                <p className="text-muted-foreground leading-relaxed">{t('about_mission')}</p>
              </div>
              <div>
                <h2 className="text-xl font-bold text-charcoal mb-3">{t('about_story_title')}</h2>
                <p className="text-muted-foreground leading-relaxed">Launched in 2026 to serve Houston's Vietnamese-American community, Manna One Solution was founded on a simple belief: everyone deserves transparent, affordable professional services in their own language. As a non-attorney document preparer, we help clients navigate USCIS forms, taxes, insurance, and business needs — clearly, honestly, and bilingually.</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <strong>Non-Attorney Disclosure:</strong> For immigration services, we prepare USCIS forms at client direction. We are NOT a law firm and do NOT provide legal advice. Complex cases (RFEs, denials, inadmissibility) are referred to licensed immigration attorneys.
              </div>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <img src={ABOUT_IMG} alt="Manna One Solution Office" className="w-full h-80 lg:h-[400px] object-cover" />
          </div>
        </div>

        {/* Serving */}
        <div className="text-center mb-20 p-10 rounded-2xl bg-teal-light">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-charcoal">{t('about_serving')}</h2>
          </div>
          <p className="text-muted-foreground text-lg">{t('about_areas')}</p>
        </div>

        {/* Credentials */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-charcoal text-center mb-10">{t('about_credentials')}</h2>
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
          <h3 className="text-2xl font-bold text-white mb-4">{t('contact_title')}</h3>
          <Link to="/contact">
            <Button size="lg" className="bg-primary hover:bg-teal-dark text-white rounded-full px-8 gap-2">
              <Calendar className="h-4 w-4" />
              {t('hero_cta1')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}