import { Link } from 'react-router-dom';
import { Phone, Facebook, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function ContactStrip({ t }) {
  return (
    <section className="py-20 lg:py-24 bg-charcoal relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">{t('contact_title')}</h2>
        <p className="text-white/60 text-lg mb-8 max-w-lg mx-auto">{t('contact_desc')}</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="tel:3468524454">
            <Button size="lg" className="bg-primary hover:bg-teal-dark text-white rounded-full px-8 gap-2 text-base">
              <Phone className="h-4 w-4" />
              {t('contact_phone')}
            </Button>
          </a>
          <a href="https://facebook.com/mannaonesolution" target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="outline" className="rounded-full px-8 gap-2 text-base border-white/20 text-white hover:bg-white/10 hover:text-white">
              <Facebook className="h-4 w-4" />
              Facebook
            </Button>
          </a>
          <Link to="/contact">
            <Button size="lg" variant="outline" className="rounded-full px-8 gap-2 text-base border-white/20 text-white hover:bg-white/10 hover:text-white">
              {t('contact_form_title')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}