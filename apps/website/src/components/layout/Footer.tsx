import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { serviceCategories } from "@/lib/services/categories";

interface FooterProps {
  dictionary: Dictionary;
  locale: Locale;
}

export default function Footer({ dictionary, locale }: FooterProps) {
  return (
    <footer className="bg-charcoal text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold mb-2">
              Manna One <span className="text-primary">Solution</span>
            </h3>
            <p className="text-white/70 text-sm">{dictionary.footer_tagline}</p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4">{dictionary.footer_services}</h4>
            <ul className="space-y-2.5 text-sm text-white/75">
              {serviceCategories(dictionary, locale).map((c) => (
                <li key={c.key}>
                  <Link href={c.href} className="rounded-sm transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {c.navLabel}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={`/${locale}/n400ready`} className="rounded-sm transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  N400 Ready
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">{dictionary.footer_company}</h4>
            <ul className="space-y-2.5 text-sm text-white/75">
              <li>
                <Link href={`/${locale}/about`} className="rounded-sm transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {dictionary.nav_about}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/blog`} className="rounded-sm transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  Blog
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="rounded-sm transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {dictionary.nav_contact}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/privacy-policy`} className="rounded-sm transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/terms-of-service`} className="rounded-sm transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">{dictionary.footer_contact}</h4>
            <ul className="space-y-2.5 text-sm text-white/75">
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <a href="tel:3468524454" className="rounded-sm transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  346-852-4454
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <a href="mailto:Chris@mannaos.com" className="break-all rounded-sm transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  Chris@mannaos.com
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{dictionary.footer_houston}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-white/10 text-center text-xs text-white/55">
          {dictionary.footer_rights}
        </div>
      </div>
    </footer>
  );
}
