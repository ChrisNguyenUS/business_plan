"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, Search, LogIn, LogOut, Shield, LayoutDashboard } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { getAlternateLocaleHref } from "@/lib/i18n/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

interface NavbarProps {
  dictionary: Dictionary;
  locale: Locale;
}

export default function Navbar({ dictionary, locale }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const { user, profile, signOut } = useAuth();

  const alternateHref = getAlternateLocaleHref(pathname, locale);
  const altLabel = locale === "en" ? "VI" : "EN";
  const isAdmin = profile?.role === "admin";

  const navLinks = [
    { label: dictionary.nav_home, href: `/${locale}` },
    { label: dictionary.nav_services, href: `/${locale}/services`, hasDropdown: true },
    { label: dictionary.nav_about, href: `/${locale}/about` },
    { label: "Blog", href: `/${locale}/blog` },
    { label: dictionary.nav_contact, href: `/${locale}/contact` },
  ];

  const serviceLinks = [
    { label: dictionary.services_tax_title, href: `/${locale}/services/tax` },
    { label: dictionary.services_insurance_title, href: `/${locale}/services/insurance` },
    { label: dictionary.services_immigration_title, href: `/${locale}/services/immigration` },
    { label: dictionary.services_ai_title, href: `/${locale}/services/ai` },
  ];

  const isActive = (href: string) => {
    if (href === `/${locale}`) return pathname === `/${locale}`;
    return pathname.startsWith(href);
  };

  return (
    <>
      <style>{`
        .nav-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 0;
          font-size: 0.9375rem;
          font-weight: 500;
          color: #1a1a1a;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 2px;
          background-color: hsl(174, 54%, 36%);
          border-radius: 1px;
          transition: width 0.3s ease-in-out;
        }
        .nav-link:hover {
          color: hsl(174, 54%, 36%);
        }
        .nav-link:hover::after {
          width: 100%;
        }
        .nav-link.active {
          color: hsl(174, 54%, 36%);
          font-weight: 600;
        }
        .nav-link.active::after {
          width: 100%;
        }
        .services-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          left: 50%;
          transform: translateX(-50%);
          min-width: 220px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          border: 1px solid rgba(0,0,0,0.06);
          padding: 8px;
          opacity: 0;
          visibility: hidden;
          transform: translateX(-50%) translateY(-4px);
          transition: all 0.2s ease;
          z-index: 100;
        }
        .services-parent:hover .services-dropdown {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }
        .dropdown-link {
          display: block;
          padding: 10px 14px;
          font-size: 0.875rem;
          color: #333;
          border-radius: 8px;
          transition: background 0.15s ease, color 0.15s ease;
          text-decoration: none;
        }
        .dropdown-link:hover {
          background: hsl(170, 30%, 96%);
          color: hsl(174, 54%, 36%);
        }
        .lang-toggle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: hsl(174, 54%, 36%);
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s ease;
          flex-shrink: 0;
          letter-spacing: 0.03em;
        }
        .lang-toggle:hover {
          background: hsl(174, 54%, 28%);
        }
        .search-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #555;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .search-btn:hover {
          background: hsl(170, 30%, 96%);
          color: hsl(174, 54%, 36%);
        }
        .btn-client-login {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 18px;
          height: 38px;
          border-radius: 999px;
          border: 1.5px solid #d0d5dd;
          background: white;
          color: #333;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
          white-space: nowrap;
        }
        .btn-client-login:hover {
          border-color: hsl(174, 54%, 36%);
          color: hsl(174, 54%, 36%);
          background: hsl(170, 30%, 96%);
        }
        .btn-book-now {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 22px;
          height: 38px;
          border-radius: 999px;
          border: none;
          background: hsl(174, 54%, 36%);
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s ease, box-shadow 0.2s ease;
          white-space: nowrap;
        }
        .btn-book-now:hover {
          background: hsl(174, 54%, 28%);
          box-shadow: 0 4px 12px hsla(174, 54%, 36%, 0.35);
        }
        /* Mobile nav-link style */
        .mobile-nav-link {
          display: block;
          padding: 12px 16px;
          font-size: 0.9375rem;
          font-weight: 500;
          color: #1a1a1a;
          border-radius: 10px;
          text-decoration: none;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .mobile-nav-link:hover,
        .mobile-nav-link.active {
          background: hsl(170, 30%, 96%);
          color: hsl(174, 54%, 36%);
        }
      `}</style>

      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', gap: '32px' }}>

            {/* Logo */}
            <Link href={`/${locale}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
              <Image
                src="/images/logo-transparent.png"
                alt="Manna One Solution"
                width={36}
                height={36}
                style={{ borderRadius: '8px' }}
              />
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1a1a1a' }}>
                Manna<span style={{ color: 'hsl(174, 54%, 36%)' }}>OS</span>
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex" style={{ alignItems: 'center', gap: '28px' }}>
              {navLinks.map((link) => (
                <div key={link.href} className="services-parent" style={{ position: 'relative' }}>
                  {link.hasDropdown ? (
                    <>
                      <Link
                        href={link.href}
                        className={`nav-link ${isActive(link.href) ? 'active' : ''}`}
                      >
                        {link.label}
                        <ChevronDown style={{ width: '14px', height: '14px', opacity: 0.6, flexShrink: 0 }} />
                      </Link>
                      <div className="services-dropdown">
                        {serviceLinks.map((sl) => (
                          <Link key={sl.href} href={sl.href} className="dropdown-link">
                            {sl.label}
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : (
                    <Link
                      href={link.href}
                      className={`nav-link ${isActive(link.href) ? 'active' : ''}`}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Right Side */}
            <div className="hidden lg:flex" style={{ alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              {/* Language Toggle */}
              <Link href={alternateHref} className="lang-toggle">
                {altLabel}
              </Link>

              {/* Search */}
              <button className="search-btn" aria-label="Search">
                <Search style={{ width: '17px', height: '17px' }} />
              </button>

              {user ? (
                <>
                  {/* My Portal */}
                  <Link href={`/${locale}/portal`} className="btn-client-login">
                    <LayoutDashboard style={{ width: '15px', height: '15px' }} />
                    {locale === "vi" ? "Cổng KH" : "My Portal"}
                  </Link>

                  {/* Admin - only for admins */}
                  {isAdmin && (
                    <Link href={`/${locale}/admin`} className="btn-client-login" style={{ borderColor: 'hsl(174, 54%, 36%)', color: 'hsl(174, 54%, 36%)' }}>
                      <Shield style={{ width: '15px', height: '15px' }} />
                      Admin
                    </Link>
                  )}

                  {/* Sign Out */}
                  <button onClick={() => signOut()} className="btn-client-login" style={{ border: 'none', background: 'transparent', color: '#999', padding: '0 12px' }}>
                    <LogOut style={{ width: '15px', height: '15px' }} />
                  </button>
                </>
              ) : (
                <>
                  {/* Client Login */}
                  <Link href={`/${locale}/login`} className="btn-client-login">
                    <LogIn style={{ width: '15px', height: '15px' }} />
                    Client Login
                  </Link>
                </>
              )}

              {/* Book Now */}
              <Link href={`/${locale}/contact`} className="btn-book-now">
                Book Now
              </Link>
            </div>

            {/* Mobile Hamburger */}
            <button
              className="lg:hidden"
              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#333' }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X style={{ width: '22px', height: '22px' }} /> : <Menu style={{ width: '22px', height: '22px' }} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', background: 'white' }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '12px 24px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {navLinks.map((link) => (
                  <div key={link.href}>
                    {link.hasDropdown ? (
                      <>
                        <button
                          onClick={() => setServicesOpen(!servicesOpen)}
                          className="mobile-nav-link"
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                        >
                          {link.label}
                          <ChevronDown style={{ width: '16px', height: '16px', transition: 'transform 0.2s', transform: servicesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        </button>
                        {servicesOpen && (
                          <div style={{ paddingLeft: '16px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {serviceLinks.map((sl) => (
                              <Link
                                key={sl.href}
                                href={sl.href}
                                className="mobile-nav-link"
                                onClick={() => setMobileOpen(false)}
                              >
                                {sl.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        href={link.href}
                        className={`mobile-nav-link ${isActive(link.href) ? 'active' : ''}`}
                        onClick={() => setMobileOpen(false)}
                      >
                        {link.label}
                      </Link>
                    )}
                  </div>
                ))}

                {/* Mobile Bottom Buttons */}
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link href={alternateHref} className="lang-toggle">{altLabel}</Link>
                    {user ? (
                      <>
                        <Link href={`/${locale}/portal`} className="btn-client-login" onClick={() => setMobileOpen(false)} style={{ flex: 1, justifyContent: 'center' }}>
                          <LayoutDashboard style={{ width: '15px', height: '15px' }} />
                          My Portal
                        </Link>
                        <button onClick={() => { signOut(); setMobileOpen(false); }} className="btn-client-login" style={{ justifyContent: 'center' }}>
                          <LogOut style={{ width: '15px', height: '15px' }} />
                        </button>
                      </>
                    ) : (
                      <Link href={`/${locale}/login`} className="btn-client-login" onClick={() => setMobileOpen(false)} style={{ flex: 1, justifyContent: 'center' }}>
                        <LogIn style={{ width: '15px', height: '15px' }} />
                        Client Login
                      </Link>
                    )}
                  </div>
                  {isAdmin && user && (
                    <Link href={`/${locale}/admin`} className="btn-client-login" onClick={() => setMobileOpen(false)} style={{ justifyContent: 'center', borderColor: 'hsl(174, 54%, 36%)', color: 'hsl(174, 54%, 36%)' }}>
                      <Shield style={{ width: '15px', height: '15px' }} />
                      Admin Panel
                    </Link>
                  )}
                  <Link href={`/${locale}/contact`} className="btn-book-now" onClick={() => setMobileOpen(false)} style={{ justifyContent: 'center' }}>
                    Book Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
