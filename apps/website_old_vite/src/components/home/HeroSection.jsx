const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar } from 'lucide-react';

const HERO_IMAGE = "https://media.db.com/images/public/69dafd73d99166d00ad6b65b/665222538_generated_b997a543.png";

export default function HeroSection({ t }) {
  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={HERO_IMAGE} alt="Manna One Solution" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/75 to-charcoal/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-xs font-semibold tracking-wide uppercase">Manna One Solution</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4">
            {t('hero_headline')}
          </h1>
          
          <p className="text-lg text-white/70 font-medium mb-3">
            {t('hero_sub')}
          </p>

          <p className="text-base text-white/60 leading-relaxed mb-8 max-w-lg">
            {t('hero_desc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/contact">
              <Button size="lg" className="bg-primary hover:bg-teal-dark text-white rounded-full px-8 gap-2 text-base shadow-lg shadow-primary/25">
                <Calendar className="h-4 w-4" />
                {t('hero_cta1')}
              </Button>
            </Link>
            <Link to="/services">
              <Button size="lg" variant="outline" className="rounded-full px-8 gap-2 text-base border-white/20 text-white hover:bg-white/10 hover:text-white">
                {t('hero_cta2')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}