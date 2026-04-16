import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

interface FooterProps {
  dictionary: Dictionary;
  locale: Locale;
}

export default function Footer({ dictionary, locale }: FooterProps) {
  return (
    <footer className="bg-charcoal text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold mb-2">
              Manna<span className="text-primary">OS</span>
            </h3>
            <p className="text-white/60 text-sm">{dictionary.footer_tagline}</p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-3">{dictionary.footer_services}</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <Link href={`/${locale}/services/tax`} className="hover:text-primary transition-colors">
                  {dictionary.services_tax_title}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/services/insurance`} className="hover:text-primary transition-colors">
                  {dictionary.services_insurance_title}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/services/immigration`} className="hover:text-primary transition-colors">
                  {dictionary.services_immigration_title}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/services/ai`} className="hover:text-primary transition-colors">
                  {dictionary.services_ai_title}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-3">{dictionary.footer_company}</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <Link href={`/${locale}/about`} className="hover:text-primary transition-colors">
                  {dictionary.nav_about}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/blog`} className="hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="hover:text-primary transition-colors">
                  {dictionary.nav_contact}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/privacy-policy`} className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/terms-of-service`} className="hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-3">{dictionary.footer_contact}</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a href="tel:3468524454" className="hover:text-primary transition-colors">
                  346-852-4454
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:Chris@mannaos.com" className="hover:text-primary transition-colors">
                  Chris@mannaos.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{dictionary.footer_houston}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-white/10 text-center text-xs text-white/40">
          {dictionary.footer_rights}
        </div>
      </div>
    </footer>
  );
}
