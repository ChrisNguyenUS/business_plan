import { Link } from 'react-router-dom';
import { Phone, MapPin, Facebook } from 'lucide-react';

export default function Footer({ t }) {
  return (
    <footer className="bg-charcoal text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <span className="font-bold text-white text-lg tracking-tight">MANNA</span>
                <span className="text-silver text-xs block -mt-1 tracking-widest">ONE SOLUTION</span>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{t('footer_tagline')}</p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-silver mb-4">{t('footer_services')}</h4>
            <ul className="space-y-2.5">
              <li><Link to="/services/tax" className="text-white/70 hover:text-primary text-sm transition-colors">{t('services_tax_title')}</Link></li>
              <li><Link to="/services/insurance" className="text-white/70 hover:text-primary text-sm transition-colors">{t('services_insurance_title')}</Link></li>
              <li><Link to="/services/immigration" className="text-white/70 hover:text-primary text-sm transition-colors">{t('services_immigration_title')}</Link></li>
              <li><Link to="/services/ai" className="text-white/70 hover:text-primary text-sm transition-colors">{t('services_ai_title')}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-silver mb-4">{t('footer_company')}</h4>
            <ul className="space-y-2.5">
              <li><Link to="/about" className="text-white/70 hover:text-primary text-sm transition-colors">{t('nav_about')}</Link></li>
              <li><Link to="/blog" className="text-white/70 hover:text-primary text-sm transition-colors">{t('nav_blog')}</Link></li>
              <li><Link to="/contact" className="text-white/70 hover:text-primary text-sm transition-colors">{t('nav_contact')}</Link></li>
              <li><Link to="/privacy-policy" className="text-white/70 hover:text-primary text-sm transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="text-white/70 hover:text-primary text-sm transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Contact / NAP */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-silver mb-4">{t('footer_contact')}</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <span className="text-white/70 text-sm block">Bellaire Blvd</span>
                  <span className="text-white/70 text-sm block">Houston, TX 77036</span>
                </div>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a href="tel:3468524454" className="text-white/70 hover:text-primary text-sm transition-colors">346-852-4454</a>
              </li>
              <li className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-primary" />
                <a href="https://facebook.com/mannaonesolution" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-primary text-sm transition-colors">Facebook</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-white/40 text-sm">{t('footer_rights')}</p>
            <p className="text-white/30 text-xs">Non-attorney document preparer. Not a law firm. Texas residents only for immigration services.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}